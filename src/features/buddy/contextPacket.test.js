// Guard-Tests für das Buddy-Kontextpaket — DER datenschutzkritische Baustein:
// Was hier durchrutscht, verlässt das Gerät Richtung KI-API. Deshalb neben den
// Verhaltens-Tests ein Schema-Lock (nur erlaubte Top-Level-Keys) und ein
// statischer Quell-Guard (keine Storage-Imports, keine verbotenen Quellen).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildContextPacket, ALLOWED_PACKET_KEYS } from './contextPacket'

const NOW = new Date('2026-07-19T14:32:00')  // lokal — dateKey ist lokal
const DK  = '2026-07-19'

const baseTodo = (over = {}) => ({
  id: 't1', text: 'Steuer machen', priority: 1, color: null, duration: 30,
  projectId: null, date: null, time: null, done: false, doneAt: null,
  subItems: [], notes: null, createdAt: '2026-07-01T10:00:00.000Z', cal: null,
  ...over,
})

const baseInput = (over = {}) => ({
  screen: 'tagesplaner',
  todos: [baseTodo()],
  days: {},
  projects: [],
  calList: {},
  buddySettings: { calScopes: { privat: true, cals: {} } },
  klaerenThreshold: 7,
  dailyState: {},
  now: NOW,
  ...over,
})

describe('Schema-Lock', () => {
  it('liefert ausschließlich erlaubte Top-Level-Keys', () => {
    const packet = buildContextPacket(baseInput({ focusTodoId: 't1' }))
    Object.keys(packet).forEach(k => expect(ALLOWED_PACKET_KEYS).toContain(k))
    expect(packet.heute).toBe(DK)
    expect(packet.uhrzeit).toBe('14:32')
  })
})

describe('Scope-Filter (calScopes)', () => {
  const calTodo = (cal, id) => baseTodo({ id, cal, text: `GEHEIM_${id}` })

  it('privat aus → cal:null-Todos fehlen komplett', () => {
    const packet = buildContextPacket(baseInput({
      buddySettings: { calScopes: { privat: false, cals: {} } },
    }))
    expect(JSON.stringify(packet)).not.toContain('Steuer machen')
    expect(packet.pool.offen).toBe(0)
  })

  it('geteilter Kalender (>1 Mitglied) ist default AUS, eigener (1 Mitglied) default AN', () => {
    const packet = buildContextPacket(baseInput({
      todos: [calTodo('calShared', 'a'), calTodo('calOwn', 'b')],
      calList: {
        calShared: { name: 'Familie', members: [{ name: 'du' }, { name: 'Paula' }] },
        calOwn:    { name: 'Jonas',   members: [{ name: 'du' }] },
      },
    }))
    const json = JSON.stringify(packet)
    expect(json).not.toContain('GEHEIM_a')
    expect(json).toContain('GEHEIM_b')
  })

  it('explizite Freigabe gewinnt über den Default — in beide Richtungen', () => {
    const packet = buildContextPacket(baseInput({
      todos: [calTodo('calShared', 'a'), calTodo('calOwn', 'b')],
      calList: {
        calShared: { name: 'Familie', members: [1, 2] },
        calOwn:    { name: 'Jonas',   members: [1] },
      },
      buddySettings: { calScopes: { privat: true, cals: { calShared: true, calOwn: false } } },
    }))
    const json = JSON.stringify(packet)
    expect(json).toContain('GEHEIM_a')
    expect(json).not.toContain('GEHEIM_b')
  })

  it('erledigte Todos tauchen nicht auf', () => {
    const packet = buildContextPacket(baseInput({ todos: [baseTodo({ done: true })] }))
    expect(packet.pool.offen).toBe(0)
  })
})

describe('Fokus-Todo', () => {
  it('liefert Details inkl. Projektname und kappt Texte/Schritte', () => {
    const langerText = 'x'.repeat(300)
    const packet = buildContextPacket(baseInput({
      focusTodoId: 't1',
      todos: [baseTodo({
        projectId: 'p1',
        text: langerText,
        subItems: Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, text: `Schritt ${i}`, done: i < 2 })),
        paused: true, pauseReason: 'wartet auf Anruf',
      })],
      projects: [{ id: 'p1', name: 'Bürokram', color: '#fff' }],
    }))
    expect(packet.fokusTodo.projekt).toBe('Bürokram')
    expect(packet.fokusTodo.text.length).toBeLessThanOrEqual(120)
    expect(packet.fokusTodo.schritte.length).toBe(12)
    expect(packet.fokusTodo.schritte[0]).toEqual({ text: 'Schritt 0', done: true })
    expect(packet.fokusTodo.pausiert).toBe(true)
    expect(packet.fokusTodo.alterTage).toBe(18)
  })

  it('fehlt ohne focusTodoId und wenn das Todo dem Scope-Filter unterliegt', () => {
    expect(buildContextPacket(baseInput()).fokusTodo).toBeUndefined()
    const packet = buildContextPacket(baseInput({
      focusTodoId: 't1',
      buddySettings: { calScopes: { privat: false, cals: {} } },
    }))
    expect(packet.fokusTodo).toBeUndefined()
  })
})

describe('Tages-Skelett', () => {
  it('zählt Slots, findet den nächsten offenen und freie Fenster', () => {
    const packet = buildContextPacket(baseInput({
      days: { [DK]: {
        '9':    { text: 'Meeting', duration: 60, done: true },
        '15':   { text: 'Zahnarzt', duration: 30, done: false },
        '15.5': { text: 'Weg zurück', duration: 30, done: false },
      } },
    }))
    expect(packet.tag.slots).toBe(3)
    expect(packet.tag.erledigt).toBe(1)
    expect(packet.tag.naechster).toEqual({ zeit: '15:00', text: 'Zahnarzt' })
    // ab 14:32: frei bis 15:00 ist < 60min; 16:00–22:00 ist das große Fenster
    expect(packet.tag.freieFenster[0]).toBe('16:00–22:00')
  })

  it('leerer Tag → emptyDay-artiges Skelett mit einem großen Fenster', () => {
    const packet = buildContextPacket(baseInput())
    expect(packet.tag.slots).toBe(0)
    expect(packet.tag.naechster).toBe(null)
    expect(packet.tag.freieFenster).toEqual(['14:32–22:00'])
  })
})

describe('Pool + Signale + Energie', () => {
  it('top ist prio-, dann alters-sortiert und auf 5 gekappt', () => {
    const todos = Array.from({ length: 8 }, (_, i) => baseTodo({
      id: `t${i}`, text: `Aufgabe ${i}`,
      priority: i < 4 ? 3 : 1,
      createdAt: `2026-07-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
    }))
    const packet = buildContextPacket(baseInput({ todos }))
    expect(packet.pool.top.length).toBe(5)
    expect(packet.pool.top[0].prio).toBe(1)
    expect(packet.pool.offen).toBe(8)
    expect(packet.pool.aeltesteTage).toBe(18)
    expect(packet.pool.klaerenReif).toBe(8)
  })

  it('pausierte Todos bleiben aus den Top-Vorschlägen raus, zählen aber als offen', () => {
    const packet = buildContextPacket(baseInput({
      todos: [baseTodo({ paused: true, pauseReason: 'wartet' }), baseTodo({ id: 't2', text: 'Frei' })],
    }))
    expect(packet.pool.offen).toBe(2)
    expect(packet.pool.top.map(t => t.text)).toEqual(['Frei'])
  })

  it('Termine/Tages-Todos zählen nicht in den Pool', () => {
    const packet = buildContextPacket(baseInput({
      todos: [baseTodo({ date: DK, time: '15:00' }), baseTodo({ id: 't2', date: DK })],
    }))
    expect(packet.pool.offen).toBe(0)
  })

  it('legt bestätigte Merk-Notizen als merkzettel bei (20×100 gekappt), leer → weggelassen', () => {
    const buddyMemory = Array.from({ length: 25 }, (_, i) => ({ id: `m${i}`, text: 'N'.repeat(150), createdAt: '' }))
    const p = buildContextPacket(baseInput({ buddyMemory }))
    expect(p.merkzettel.length).toBe(20)
    expect(p.merkzettel[0].length).toBe(100)
    expect(buildContextPacket(baseInput()).merkzettel).toBeUndefined()
  })

  it('mappt Energie grob (1–5 → niedrig/ok/gut), fehlend → weggelassen', () => {
    expect(buildContextPacket(baseInput({ dailyState: { [DK]: { energy: 2 } } })).energie).toBe('niedrig')
    expect(buildContextPacket(baseInput({ dailyState: { [DK]: { energy: 3 } } })).energie).toBe('ok')
    expect(buildContextPacket(baseInput({ dailyState: { [DK]: { energy: 5 } } })).energie).toBe('gut')
    expect(buildContextPacket(baseInput()).energie).toBeUndefined()
  })
})

describe('Verschoben-Signal (postponeCount, S2-T1)', () => {
  it('top-Eintrag zeigt verschoben nur bei postponeCount > 0', () => {
    const packet = buildContextPacket(baseInput({
      todos: [baseTodo({ postponeCount: 3 }), baseTodo({ id: 't2', text: 'Ohne', postponeCount: 0 })],
    }))
    expect(packet.pool.top.find(t => t.id === 't1').verschoben).toBe(3)
    expect(packet.pool.top.find(t => t.id === 't2').verschoben).toBeUndefined()
  })

  it('fokusTodo zeigt verschoben nur bei postponeCount > 0', () => {
    const mitCount = buildContextPacket(baseInput({ focusTodoId: 't1', todos: [baseTodo({ postponeCount: 2 })] }))
    expect(mitCount.fokusTodo.verschoben).toBe(2)
    const ohneCount = buildContextPacket(baseInput({ focusTodoId: 't1' }))
    expect(ohneCount.fokusTodo.verschoben).toBeUndefined()
  })
})

describe('topMax-Option (S2-T1: Buddy-Frage "Pool aufräumen" braucht mehr als 5)', () => {
  const manyTodos = (n) => Array.from({ length: n }, (_, i) => baseTodo({ id: `t${i}`, text: `Aufgabe ${i}` }))

  it('Default bleibt 5', () => {
    expect(buildContextPacket(baseInput({ todos: manyTodos(8) })).pool.top.length).toBe(5)
  })

  it('topMax: 10 liefert bis zu 10 Einträge', () => {
    expect(buildContextPacket(baseInput({ todos: manyTodos(15), topMax: 10 })).pool.top.length).toBe(10)
  })

  it('Clamp greift bei topMax > 12', () => {
    expect(buildContextPacket(baseInput({ todos: manyTodos(20), topMax: 999 })).pool.top.length).toBe(12)
  })
})

describe('Security-Pass: Tages-Skelett leakt keine gesperrten Texte (Fable 2026-07-20)', () => {
  const slotTag = (text, todoId) => ({ [DK]: { '15': { text, duration: 30, done: false, ...(todoId ? { todoId } : {}) } } })

  it('maskiert den nächsten Slot, wenn sein Todo in einem gesperrten Kalender liegt', () => {
    const p = buildContextPacket(baseInput({
      todos: [baseTodo({ id: 'geheim', text: 'GEHEIMER TERMIN', cal: 'calShared', date: DK, time: '15:00' })],
      calList: { calShared: { name: 'Familie', members: [1, 2] } },
      days: slotTag('GEHEIMER TERMIN', 'geheim'),
    }))
    expect(JSON.stringify(p)).not.toContain('GEHEIM')
    expect(p.tag.naechster).toEqual({ zeit: '15:00', text: '(privat)' })
  })

  it('maskiert Text-Slots ohne todoId, wenn Privat gesperrt ist', () => {
    const p = buildContextPacket(baseInput({
      buddySettings: { calScopes: { privat: false, cals: {} } },
      days: slotTag('PRIVATER TEXT'),
    }))
    expect(JSON.stringify(p)).not.toContain('PRIVATER')
    expect(p.tag.naechster.text).toBe('(privat)')
  })

  it('zeigt den Text, wenn der Kalender explizit freigegeben ist', () => {
    const p = buildContextPacket(baseInput({
      todos: [baseTodo({ id: 'ok', text: 'Familienessen', cal: 'calShared', date: DK, time: '15:00' })],
      calList: { calShared: { name: 'Familie', members: [1, 2] } },
      buddySettings: { calScopes: { privat: true, cals: { calShared: true } } },
      days: slotTag('Familienessen', 'ok'),
    }))
    expect(p.tag.naechster.text).toBe('Familienessen')
  })
})

describe('Notizen-Tool (Jonas 2026-07-20: Buddy darf mitlesen, abschaltbar)', () => {
  const notes = [
    { id: 'n1', text: 'Alte Notiz', pinned: false, updatedAt: '2026-06-01T10:00:00Z' },
    { id: 'n2', text: 'Angepinnt: WLAN-Passwort Oma', pinned: true, updatedAt: '2026-05-01T10:00:00Z' },
    { id: 'n3', text: 'N'.repeat(500), pinned: false, updatedAt: '2026-07-19T10:00:00Z' },
  ]

  it('legt Notizen bei — angepinnte zuerst, dann neueste, je 300 Zeichen gekappt', () => {
    const p = buildContextPacket(baseInput({ notes }))
    expect(p.notizen[0]).toContain('Angepinnt')
    expect(p.notizen[1].length).toBe(300)
    expect(p.notizen[2]).toBe('Alte Notiz')
  })

  it('kappt bei 12 Notizen', () => {
    const viele = Array.from({ length: 20 }, (_, i) => ({ id: `x${i}`, text: `Notiz ${i}`, pinned: false, updatedAt: `2026-07-${String(i + 1).padStart(2, '0')}` }))
    expect(buildContextPacket(baseInput({ notes: viele })).notizen.length).toBe(12)
  })

  it('notizenLesen=false oder keine Notizen → Feld fehlt', () => {
    expect(buildContextPacket(baseInput({
      notes,
      buddySettings: { calScopes: { privat: true, cals: {} }, notizenLesen: false },
    })).notizen).toBeUndefined()
    expect(buildContextPacket(baseInput()).notizen).toBeUndefined()
  })
})

describe('Statischer Quell-Guard', () => {
  const src = readFileSync(fileURLToPath(new URL('./contextPacket.js', import.meta.url)), 'utf8')

  it('importiert keinen Storage und keine verbotenen Datenquellen', () => {
    expect(src).not.toMatch(/from ['"].*storage/)
    expect(src).not.toMatch(/\blocalStorage\b/)
    // Verbotene Quellen (Konzept §9.4) dürfen nicht mal namentlich auftauchen.
    // 'notes' ist seit 2026-07-20 bewusst NICHT mehr verboten (Jonas: Buddy darf Notizen lesen).
    ;['elvi', 'growth', 'wachstum', 'weight', 'kognitiv', 'cloudCreds', 'calCreds'].forEach(word =>
      expect(src.toLowerCase()).not.toContain(word.toLowerCase())
    )
  })
})
