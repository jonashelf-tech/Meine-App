// Guard-Tests für die Buddy-Impuls-Engine (Briefkasten-Prinzip, Stufe 2):
// Neben den Verhaltens-Tests ein Ton-Guard (nie Schuld, immer ein Angebot)
// und ein statischer Quell-Guard (keine Storage-/State-Imports) — analog zu
// contextPacket.test.js.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dateKey } from '../../utils'
import {
  computeImpuls, dismissImpuls, consumeImpuls, impulsTeaser,
  EMPTY_IMPULS, BACKOFF_DAYS,
} from './buddyImpuls'

const TAG_MS = 86400000

// 14:00 lokal — bewusst AUSSERHALB des Morgen-Fensters [6,12), damit Tests zu
// anderen Triggern nicht versehentlich auch "morgen" mit auslösen.
const NOW = new Date('2026-07-21T14:00:00')
const TODAY = dateKey(NOW)

// 09:00 lokal — INNERHALB des Morgen-Fensters, für die morgen-spezifischen Tests.
const NOW_MORGEN = new Date('2026-07-21T09:00:00')

const isoDaysAgo = (base, n) => new Date(base.getTime() - n * TAG_MS).toISOString()
const keyDaysAgo = (base, n) => dateKey(new Date(base.getTime() - n * TAG_MS))

const baseTodo = (over = {}) => ({
  id: 't1',
  text: 'Steuererklärung',
  priority: 3,
  done: false,
  date: null,
  time: null,
  paused: false,
  cal: null,
  createdAt: isoDaysAgo(NOW, 1),
  ...over,
})

const baseArgs = (over = {}) => ({
  todos: [],
  days: {},
  calScopes: { privat: true, cals: {} },
  calList: {},
  klaerenThreshold: 30,
  focusActive: false,
  now: NOW,
  ...over,
})

describe('Statischer Quell-Guard', () => {
  const src = readFileSync(fileURLToPath(new URL('./buddyImpuls.js', import.meta.url)), 'utf8')

  it('importiert keinen Storage und keinen Client-State direkt', () => {
    expect(src).not.toMatch(/from ['"].*storage/)
    expect(src).not.toMatch(/\blocalStorage\b/)
    expect(src).not.toMatch(/\buseAppStore\b/)
  })
})

describe('Ton-Guard (Bannliste)', () => {
  const BANNED = ['schon wieder', 'nur noch', 'eigentlich müsstest', 'schade', 'WAHNSINN']

  const todos = [
    baseTodo({ id: 'v1', postponeCount: 5 }),
    baseTodo({ id: 'p1', priority: 1, createdAt: isoDaysAgo(NOW, 40) }),
  ]

  const teasers = [
    impulsTeaser({ trigger: 'rueckkehr', day: TODAY }, todos, NOW),
    impulsTeaser({ trigger: 'verschoben', todoId: 'v1', day: TODAY }, todos, NOW),
    impulsTeaser({ trigger: 'prio1', todoId: 'p1', day: TODAY }, todos, NOW),
    impulsTeaser({ trigger: 'morgen', day: TODAY }, todos, NOW),
    impulsTeaser({ trigger: 'poolstau', day: TODAY }, todos, NOW),
  ]

  it('erzeugt für alle 5 Trigger tatsächlich einen Text', () => {
    teasers.forEach(t => expect(typeof t).toBe('string'))
  })

  it('enthält keine Schuld-/Druck-Phrasen und endet immer als Angebot ("?")', () => {
    teasers.forEach(text => {
      BANNED.forEach(phrase => expect(text.toLowerCase()).not.toContain(phrase.toLowerCase()))
      expect(text.endsWith('?')).toBe(true)
    })
  })
})

describe('Trigger: rueckkehr', () => {
  it('greift ab 7 Tagen Lücke', () => {
    const prev = { ...EMPTY_IMPULS, lastActiveDay: keyDaysAgo(NOW, 7) }
    expect(computeImpuls(prev, baseArgs()).active).toEqual({ trigger: 'rueckkehr', day: TODAY })
  })

  it('greift NICHT bei 6 Tagen Lücke', () => {
    const prev = { ...EMPTY_IMPULS, lastActiveDay: keyDaysAgo(NOW, 6) }
    expect(computeImpuls(prev, baseArgs()).active).toBe(null)
  })

  it('ohne lastActiveDay (Erststart) löst nichts aus, lastActiveDay wird trotzdem gesetzt', () => {
    const next = computeImpuls(EMPTY_IMPULS, baseArgs())
    expect(next.active).toBe(null)
    expect(next.lastActiveDay).toBe(TODAY)
  })
})

describe('Trigger: verschoben', () => {
  it('greift ab postponeCount 3', () => {
    const todos = [baseTodo({ postponeCount: 3 })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos })).active).toEqual({ trigger: 'verschoben', todoId: 't1', day: TODAY })
  })

  it('greift NICHT bei postponeCount 2', () => {
    const todos = [baseTodo({ postponeCount: 2 })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos })).active).toBe(null)
  })

  it('wählt bei mehreren Kandidaten den höchsten postponeCount, bei Gleichstand das älteste', () => {
    const todos = [
      baseTodo({ id: 'a', postponeCount: 3, createdAt: isoDaysAgo(NOW, 5) }),
      baseTodo({ id: 'b', postponeCount: 5, createdAt: isoDaysAgo(NOW, 1) }),
      baseTodo({ id: 'c', postponeCount: 5, createdAt: isoDaysAgo(NOW, 10) }),
    ]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos })).active.todoId).toBe('c')
  })

  it('ein heute gebumptes Todo triggert nicht — aber gestern gebumpt triggert normal', () => {
    const heute = [baseTodo({ postponeCount: 5, postponedAt: NOW.toISOString() })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: heute })).active).toBe(null)

    const gestern = [baseTodo({ postponeCount: 5, postponedAt: isoDaysAgo(NOW, 1) })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: gestern })).active).toEqual({ trigger: 'verschoben', todoId: 't1', day: TODAY })
  })

  it('bewusst in die Zukunft geplant bleibt in Ruhe — auf heute/Vergangenheit geplant triggert weiter', () => {
    const future = keyDaysAgo(NOW, -3)
    const todosFuture = [baseTodo({ postponeCount: 5, date: future })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: todosFuture })).active).toBe(null)

    const todosHeute = [baseTodo({ postponeCount: 5, date: TODAY })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: todosHeute })).active.trigger).toBe('verschoben')
  })

  it('pausiert oder erledigt triggert nicht', () => {
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: [baseTodo({ postponeCount: 5, paused: true })] })).active).toBe(null)
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: [baseTodo({ postponeCount: 5, done: true })] })).active).toBe(null)
  })
})

describe('Trigger: prio1', () => {
  it('greift ab klaerenThreshold Tagen Alter, nicht einen Tag davor', () => {
    const reif = [baseTodo({ priority: 1, createdAt: isoDaysAgo(NOW, 30) })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: reif, klaerenThreshold: 30 })).active)
      .toEqual({ trigger: 'prio1', todoId: 't1', day: TODAY })

    const knappDrunter = [baseTodo({ priority: 1, createdAt: isoDaysAgo(NOW, 29) })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: knappDrunter, klaerenThreshold: 30 })).active).toBe(null)
  })

  it('nur priority 1 zählt, und nur Pool-Todos (kein date/time)', () => {
    const prio2 = [baseTodo({ priority: 2, createdAt: isoDaysAgo(NOW, 60) })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: prio2, klaerenThreshold: 30 })).active).toBe(null)

    const terminiert = [baseTodo({ priority: 1, createdAt: isoDaysAgo(NOW, 60), date: TODAY, time: '10:00' })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: terminiert, klaerenThreshold: 30 })).active).toBe(null)
  })

  it('wählt bei mehreren Kandidaten das älteste', () => {
    const todos = [
      baseTodo({ id: 'a', priority: 1, createdAt: isoDaysAgo(NOW, 31) }),
      baseTodo({ id: 'b', priority: 1, createdAt: isoDaysAgo(NOW, 50) }),
    ]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos, klaerenThreshold: 30 })).active.todoId).toBe('b')
  })
})

describe('Trigger: morgen', () => {
  it('greift 06–12 Uhr bei leerem Tag', () => {
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ now: NOW_MORGEN })).active)
      .toEqual({ trigger: 'morgen', day: dateKey(NOW_MORGEN) })
  })

  it('greift NICHT ab 12 Uhr und NICHT vor 6 Uhr', () => {
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ now: new Date('2026-07-21T12:00:00') })).active).toBe(null)
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ now: new Date('2026-07-21T05:59:00') })).active).toBe(null)
  })

  it('greift NICHT, wenn heute schon ein Slot existiert', () => {
    const days = { [dateKey(NOW_MORGEN)]: { '9': { text: 'Zahnarzt', duration: 30 } } }
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ now: NOW_MORGEN, days })).active).toBe(null)
  })
})

describe('Trigger: poolstau', () => {
  const poolTodos = (n) => Array.from({ length: n }, (_, i) => baseTodo({ id: `p${i}`, text: `Aufgabe ${i}` }))

  it('greift bei mehr als 5 offenen Pool-Todos, nicht bei genau 5', () => {
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: poolTodos(6) })).active).toEqual({ trigger: 'poolstau', day: TODAY })
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: poolTodos(5) })).active).toBe(null)
  })
})

describe('Prioritätsreihenfolge (rueckkehr > verschoben > prio1 > morgen > poolstau)', () => {
  const now = NOW_MORGEN   // im Morgen-Fenster, damit "morgen" mit im Rennen ist

  const verschobenTodo = baseTodo({ id: 'v1', postponeCount: 5 })
  const prio1Todo = baseTodo({ id: 'p1', priority: 1, createdAt: isoDaysAgo(now, 40) })
  const poolFiller = Array.from({ length: 6 }, (_, i) => baseTodo({ id: `f${i}`, text: `Füller ${i}` }))
  const allTodos = [verschobenTodo, prio1Todo, ...poolFiller]

  const args = (over = {}) => baseArgs({ todos: allTodos, now, days: {}, klaerenThreshold: 30, ...over })

  it('rueckkehr schlägt alles andere', () => {
    const prev = { ...EMPTY_IMPULS, lastActiveDay: keyDaysAgo(now, 7) }
    expect(computeImpuls(prev, args()).active.trigger).toBe('rueckkehr')
  })

  it('ohne rueckkehr gewinnt verschoben', () => {
    expect(computeImpuls(EMPTY_IMPULS, args()).active.trigger).toBe('verschoben')
  })

  it('ohne rueckkehr/verschoben gewinnt prio1', () => {
    const todos = allTodos.filter(t => t.id !== 'v1')
    expect(computeImpuls(EMPTY_IMPULS, args({ todos })).active.trigger).toBe('prio1')
  })

  it('ohne rueckkehr/verschoben/prio1 gewinnt morgen', () => {
    const todos = allTodos.filter(t => t.id !== 'v1' && t.id !== 'p1')
    expect(computeImpuls(EMPTY_IMPULS, args({ todos })).active.trigger).toBe('morgen')
  })

  it('nur poolstau übrig (außerhalb des Morgen-Fensters) → poolstau', () => {
    expect(computeImpuls(EMPTY_IMPULS, args({ todos: poolFiller, now: NOW })).active.trigger).toBe('poolstau')
  })
})

describe('Ruhe-Garantien', () => {
  it('lastThoughtDay === today verhindert einen neuen Gedanken', () => {
    const prev = { ...EMPTY_IMPULS, lastThoughtDay: TODAY }
    const todos = [baseTodo({ postponeCount: 5 })]
    expect(computeImpuls(prev, baseArgs({ todos })).active).toBe(null)
  })

  it('focusActive verhindert die Neuerzeugung', () => {
    const todos = [baseTodo({ postponeCount: 5 })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos, focusActive: true })).active).toBe(null)
  })

  it('focusActive lässt einen bereits aktiven Gedanken unangetastet', () => {
    const todos = [baseTodo({ id: 't1', postponeCount: 5 })]
    const prev = { ...EMPTY_IMPULS, active: { trigger: 'verschoben', todoId: 't1', day: TODAY }, lastThoughtDay: TODAY }
    expect(computeImpuls(prev, baseArgs({ todos, focusActive: true })).active).toEqual({ trigger: 'verschoben', todoId: 't1', day: TODAY })
  })

  it('Verfall bei Tageswechsel: alter active mit day !== today verschwindet still', () => {
    const gestern = keyDaysAgo(NOW, 1)
    const prev = { ...EMPTY_IMPULS, active: { trigger: 'rueckkehr', day: gestern }, lastActiveDay: gestern, lastThoughtDay: gestern }
    expect(computeImpuls(prev, baseArgs()).active).toBe(null)
  })
})

describe('dismissImpuls', () => {
  it('setzt für verschoben/prio1 einen Backoff auf trigger:todoId (BACKOFF_DAYS)', () => {
    const state = { ...EMPTY_IMPULS, active: { trigger: 'verschoben', todoId: 't1', day: TODAY } }
    const next = dismissImpuls(state, NOW)
    expect(next.active).toBe(null)
    expect(next.backoff['verschoben:t1']).toBe(NOW.getTime() + BACKOFF_DAYS.verschoben * TAG_MS)
  })

  it('setzt für poolstau einen Backoff (BACKOFF_DAYS.poolstau)', () => {
    const state = { ...EMPTY_IMPULS, active: { trigger: 'poolstau', day: TODAY } }
    const next = dismissImpuls(state, NOW)
    expect(next.backoff.poolstau).toBe(NOW.getTime() + BACKOFF_DAYS.poolstau * TAG_MS)
  })

  it('rueckkehr setzt keinen Backoff-Eintrag', () => {
    const state = { ...EMPTY_IMPULS, active: { trigger: 'rueckkehr', day: TODAY } }
    expect(dismissImpuls(state, NOW).backoff).toEqual({})
  })

  it('morgen: Backoff blockt bis Mitternacht (lokal), danach wieder frei', () => {
    const state = { ...EMPTY_IMPULS, active: { trigger: 'morgen', day: dateKey(NOW_MORGEN) } }
    const nachDismiss = dismissImpuls(state, NOW_MORGEN)
    expect(nachDismiss.backoff.morgen).toBe(new Date(2026, 6, 22, 0, 0, 0, 0).getTime())

    // noch am selben Tag, weiterhin im Fenster → geblockt
    const spaeterHeute = new Date('2026-07-21T11:00:00')
    expect(computeImpuls(nachDismiss, baseArgs({ now: spaeterHeute })).active).toBe(null)

    // Folgetag im Morgen-Fenster → Backoff abgelaufen, greift wieder
    const folgetagMorgen = new Date('2026-07-22T09:00:00')
    expect(computeImpuls(nachDismiss, baseArgs({ now: folgetagMorgen })).active)
      .toEqual({ trigger: 'morgen', day: dateKey(folgetagMorgen) })
  })

  it('verworfener Trigger kommt innerhalb des Backoffs nicht wieder — ein anderer Trigger darf am Folgetag', () => {
    const todos = [baseTodo({ id: 't1', postponeCount: 5 })]
    let state = computeImpuls(EMPTY_IMPULS, baseArgs({ todos }))
    expect(state.active.trigger).toBe('verschoben')

    state = dismissImpuls(state, NOW)
    expect(state.backoff['verschoben:t1']).toBeDefined()

    // Folgetag: lastThoughtDay blockt nicht mehr, aber der Backoff für t1 läuft noch
    const folgetag = new Date(NOW.getTime() + TAG_MS)
    const nurDasselbeTodo = computeImpuls(state, baseArgs({ todos, now: folgetag }))
    expect(nurDasselbeTodo.active).toBe(null)

    // am selben Folgetag ist Pool-Stau erfüllt → ein ANDERER Trigger darf durch
    const plusPool = [...todos, ...Array.from({ length: 6 }, (_, i) => baseTodo({ id: `f${i}` }))]
    const andererTrigger = computeImpuls(state, baseArgs({ todos: plusPool, now: folgetag }))
    expect(andererTrigger.active.trigger).toBe('poolstau')
  })
})

describe('Revalidierung eines bestehenden Gedankens', () => {
  it('verschoben: Todo erledigt oder gelöscht → Gedanke verschwindet still', () => {
    const prev = { ...EMPTY_IMPULS, active: { trigger: 'verschoben', todoId: 't1', day: TODAY }, lastThoughtDay: TODAY }
    expect(computeImpuls(prev, baseArgs({ todos: [baseTodo({ id: 't1', postponeCount: 5, done: true })] })).active).toBe(null)
    expect(computeImpuls(prev, baseArgs({ todos: [] })).active).toBe(null)
  })

  it('verschoben: Todo landet in gesperrtem Kalender → Gedanke verschwindet still', () => {
    const prev = { ...EMPTY_IMPULS, active: { trigger: 'verschoben', todoId: 't1', day: TODAY }, lastThoughtDay: TODAY }
    const todos = [baseTodo({ id: 't1', postponeCount: 5, cal: 'geteilt' })]
    const calList = { geteilt: { name: 'Familie', members: [1, 2] } }
    expect(computeImpuls(prev, baseArgs({ todos, calList, calScopes: { privat: true, cals: {} } })).active).toBe(null)
  })

  it('prio1: Todo bekommt ein Datum → Gedanke verschwindet still (wurde geplant)', () => {
    const prev = { ...EMPTY_IMPULS, active: { trigger: 'prio1', todoId: 't1', day: TODAY }, lastThoughtDay: TODAY }
    const todos = [baseTodo({ id: 't1', priority: 1, date: TODAY })]
    expect(computeImpuls(prev, baseArgs({ todos })).active).toBe(null)
  })

  it('morgen: nach 12 Uhr verschwindet der Gedanke still', () => {
    const prev = { ...EMPTY_IMPULS, active: { trigger: 'morgen', day: TODAY }, lastThoughtDay: TODAY }
    expect(computeImpuls(prev, baseArgs({ now: new Date('2026-07-21T12:00:00') })).active).toBe(null)
  })

  it('poolstau: Pool leert sich unter die Schwelle → Gedanke verschwindet still', () => {
    const prev = { ...EMPTY_IMPULS, active: { trigger: 'poolstau', day: TODAY }, lastThoughtDay: TODAY }
    expect(computeImpuls(prev, baseArgs({ todos: [baseTodo({ id: 'only-one' })] })).active).toBe(null)
  })

  it('ein noch gültiger Gedanke überlebt den Aufruf unverändert', () => {
    const prev = { ...EMPTY_IMPULS, active: { trigger: 'verschoben', todoId: 't1', day: TODAY }, lastThoughtDay: TODAY }
    const todos = [baseTodo({ id: 't1', postponeCount: 5 })]
    expect(computeImpuls(prev, baseArgs({ todos })).active).toEqual({ trigger: 'verschoben', todoId: 't1', day: TODAY })
  })
})

describe('Scope: geteilter, nicht freigegebener Kalender', () => {
  const calList = { geteilt: { name: 'Familie', members: [{ n: 1 }, { n: 2 }] } }
  const calScopes = { privat: true, cals: {} }   // kein expliziter Scope für 'geteilt' → Default (>1 Mitglied = AUS)

  it('triggert weder verschoben noch prio1 noch zählt es im Pool', () => {
    const verschobenTodo = [baseTodo({ id: 't1', postponeCount: 5, cal: 'geteilt' })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: verschobenTodo, calList, calScopes })).active).toBe(null)

    const prio1Todo = [baseTodo({ id: 't1', priority: 1, createdAt: isoDaysAgo(NOW, 40), cal: 'geteilt' })]
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: prio1Todo, calList, calScopes, klaerenThreshold: 30 })).active).toBe(null)

    const sechsGesperrte = Array.from({ length: 6 }, (_, i) => baseTodo({ id: `t${i}`, cal: 'geteilt' }))
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: sechsGesperrte, calList, calScopes })).active).toBe(null)
  })
})

describe('Purity/Determinismus', () => {
  it('gleiche Eingaben → deep-equal Ausgaben, Eingaben bleiben unverändert', () => {
    const todos = [baseTodo({ id: 't1', postponeCount: 5 }), baseTodo({ id: 't2', priority: 1, createdAt: isoDaysAgo(NOW, 40) })]
    const todosSnapshot = JSON.parse(JSON.stringify(todos))
    const prev = { ...EMPTY_IMPULS, lastActiveDay: keyDaysAgo(NOW, 2) }
    const prevSnapshot = JSON.parse(JSON.stringify(prev))
    const args = baseArgs({ todos })

    const a = computeImpuls(prev, args)
    const b = computeImpuls(prev, args)

    expect(a).toEqual(b)
    expect(todos).toEqual(todosSnapshot)
    expect(prev).toEqual(prevSnapshot)
  })

  it('dismissImpuls und consumeImpuls lassen den Input-State unangetastet', () => {
    const state = { active: { trigger: 'poolstau', day: TODAY }, backoff: {}, lastActiveDay: TODAY, lastThoughtDay: TODAY }
    const snapshot = JSON.parse(JSON.stringify(state))
    dismissImpuls(state, NOW)
    consumeImpuls(state)
    expect(state).toEqual(snapshot)
  })
})

describe('Legacy-Todos ohne postponeCount/postponedAt/paused/cal', () => {
  it('crasht nicht', () => {
    const legacy = { id: 'alt', text: 'Uraltes Todo', priority: 3, done: false, date: null, time: null, createdAt: isoDaysAgo(NOW, 100) }
    expect(() => computeImpuls(EMPTY_IMPULS, baseArgs({ todos: [legacy] }))).not.toThrow()

    const legacyMinimal = { id: 'alt2', text: 'X', priority: 1, done: false, createdAt: isoDaysAgo(NOW, 100) }
    expect(() => computeImpuls(EMPTY_IMPULS, baseArgs({ todos: [legacyMinimal], klaerenThreshold: 30 }))).not.toThrow()
  })

  it('ein Legacy-Todo ohne postponeCount wird nicht als verschoben-Kandidat gewertet', () => {
    const legacy = { id: 'alt', text: 'Uraltes Todo', priority: 3, done: false, date: null, time: null, createdAt: isoDaysAgo(NOW, 100) }
    expect(computeImpuls(EMPTY_IMPULS, baseArgs({ todos: [legacy] })).active).toBe(null)
  })
})

describe('Backoff-Pruning', () => {
  it('abgelaufene Backoff-Einträge verschwinden aus dem State, aktive bleiben', () => {
    const prev = {
      ...EMPTY_IMPULS,
      backoff: {
        'verschoben:alt': NOW.getTime() - 1000,
        'prio1:noch-aktiv': NOW.getTime() + 1000,
      },
    }
    expect(computeImpuls(prev, baseArgs()).backoff).toEqual({ 'prio1:noch-aktiv': NOW.getTime() + 1000 })
  })

  it('ein Eintrag, der GENAU jetzt abläuft (untilTs === now), gilt als abgelaufen', () => {
    const prev = { ...EMPTY_IMPULS, backoff: { poolstau: NOW.getTime() } }
    expect(computeImpuls(prev, baseArgs()).backoff).toEqual({})
  })
})

describe('consumeImpuls', () => {
  it('räumt nur active auf, Rest bleibt', () => {
    const state = { active: { trigger: 'morgen', day: TODAY }, backoff: { x: 1 }, lastActiveDay: TODAY, lastThoughtDay: TODAY }
    expect(consumeImpuls(state)).toEqual({ active: null, backoff: { x: 1 }, lastActiveDay: TODAY, lastThoughtDay: TODAY })
  })
})

describe('impulsTeaser', () => {
  it('liefert null ohne aktiven Gedanken oder wenn das referenzierte Todo fehlt', () => {
    expect(impulsTeaser(null, [], NOW)).toBe(null)
    expect(impulsTeaser({ trigger: 'verschoben', todoId: 'weg', day: TODAY }, [], NOW)).toBe(null)
    expect(impulsTeaser({ trigger: 'prio1', todoId: 'weg', day: TODAY }, [], NOW)).toBe(null)
  })

  it('kappt lange Todo-Texte auf ~60 Zeichen', () => {
    const langerText = 'X'.repeat(200)
    const todos = [baseTodo({ id: 't1', text: langerText, postponeCount: 5 })]
    const text = impulsTeaser({ trigger: 'verschoben', todoId: 't1', day: TODAY }, todos, NOW)
    expect(text).toContain('X'.repeat(60))
    expect(text).not.toContain('X'.repeat(61))
  })

  it('prio1-Text nennt das Alter in Tagen seit createdAt', () => {
    const todos = [baseTodo({ id: 't1', priority: 1, createdAt: isoDaysAgo(NOW, 45) })]
    const text = impulsTeaser({ trigger: 'prio1', todoId: 't1', day: TODAY }, todos, NOW)
    expect(text).toContain('45 Tagen')
  })
})
