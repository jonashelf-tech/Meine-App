// Testet die Buddy-Logik des Workers (server/src/buddy.js) mit der App-Test-Infra —
// gleiches Muster wie serverRetention.test.js: reine Funktionen, kein fetch/D1.
// Datenschutz- und Protokoll-nah genug für echte Guards: Persona-Bannliste,
// DATEN-Fence (Injection), Request-Kappung, Action-Normalisierung.
import { describe, it, expect } from 'vitest'
import {
  validateBuddyRequest, buildSystemPrompt, buildMessages,
  pickModel, normalizeResponse, limitScope, dayKey, monthKey,
  BUDDY_TOOLS, KINDS,
} from '../../server/src/buddy.js'

const okBody = (over = {}) => ({
  kind: 'frage',
  message: 'Wie fange ich an?',
  context: { screen: 'tagesplaner' },
  profile: { userName: 'Jonas', buddyName: 'Nuki', ton: 'herzlich' },
  history: [],
  ...over,
})

describe('validateBuddyRequest', () => {
  it('akzeptiert einen gültigen Request und normalisiert ihn', () => {
    const { ok, error } = validateBuddyRequest(okBody())
    expect(error).toBeUndefined()
    expect(ok.kind).toBe('frage')
    expect(ok.message).toBe('Wie fange ich an?')
    expect(ok.profile.buddyName).toBe('Nuki')
  })

  it('lehnt unbekannte kinds ab', () => {
    expect(validateBuddyRequest(okBody({ kind: 'hack' })).error).toBeTruthy()
    expect(validateBuddyRequest(okBody({ kind: null })).error).toBeTruthy()
  })

  it('Quick-Kinds brauchen keine message, "frage" schon', () => {
    expect(validateBuddyRequest(okBody({ kind: 'start', message: undefined })).error).toBeUndefined()
    expect(validateBuddyRequest(okBody({ kind: 'frage', message: '' })).error).toBeTruthy()
  })

  it('kappt zu lange Nachrichten und zu großen Kontext', () => {
    expect(validateBuddyRequest(okBody({ message: 'x'.repeat(2001) })).error).toBeTruthy()
    const fett = { blob: 'x'.repeat(33000) }
    expect(validateBuddyRequest(okBody({ context: fett })).error).toBeTruthy()
  })

  it('kappt History auf 8 Einträge und filtert fremde Rollen', () => {
    const history = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `m${i}` }))
    history.push({ role: 'system', text: 'evil' })
    const { ok } = validateBuddyRequest(okBody({ history }))
    expect(ok.history.length).toBe(8)
    expect(ok.history.every(h => h.role === 'user' || h.role === 'assistant')).toBe(true)
  })

  it('normalisiert das Profil (Defaults, Ton-Whitelist)', () => {
    const { ok } = validateBuddyRequest(okBody({ profile: { ton: 'böse' } }))
    expect(ok.profile.buddyName).toBe('Buddy')
    expect(ok.profile.ton).toBe('herzlich')
  })
})

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt({ userName: 'Jonas', buddyName: 'Nuki', ton: 'herzlich' })

  it('enthält Identität (Name, Eichhörnchen, Nutzername)', () => {
    expect(prompt).toContain('Nuki')
    expect(prompt).toContain('Jonas')
    expect(prompt.toLowerCase()).toContain('eichhörnchen')
  })

  it('enthält die Schuld-Bannliste', () => {
    expect(prompt).toContain('schon wieder')
    expect(prompt).toContain('eigentlich müsstest')
  })

  it('verbietet erfundene externe Fakten (Telefonnummern)', () => {
    expect(prompt.toLowerCase()).toContain('telefonnummer')
  })

  it('deklariert den DATEN-Block als Daten, nicht als Anweisungen', () => {
    expect(prompt).toContain('DATEN')
    expect(prompt.toLowerCase()).toContain('keine anweisungen')
  })

  it('behandelt den Merkzettel als verbindliche Fakten UND Regeln', () => {
    expect(prompt).toContain('merkzettel')
    expect(prompt).toContain('Regeln')
    expect(prompt).toContain('verbindlich')
  })

  it('unterscheidet die Ton-Lagen', () => {
    const nuechtern = buildSystemPrompt({ userName: 'Jonas', buddyName: 'Nuki', ton: 'nuechtern' })
    expect(nuechtern).not.toBe(prompt)
  })
})

describe('buildMessages', () => {
  it('legt den Kontext als DATEN-Block in die erste User-Message', () => {
    const msgs = buildMessages({ kind: 'frage', message: 'Hilf mir', context: { marker: 'KONTEXT_42' }, history: [] })
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toContain('KONTEXT_42')
    expect(msgs[0].content).toContain('DATEN')
  })

  it('hängt History dazwischen und die aktuelle Frage ans Ende', () => {
    const msgs = buildMessages({
      kind: 'frage', message: 'Und jetzt?', context: {},
      history: [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }],
    })
    expect(msgs.at(-1)).toEqual({ role: 'user', content: 'Und jetzt?' })
    expect(msgs.some(m => m.role === 'assistant' && m.content === 'b')).toBe(true)
  })

  it('Quick-Kinds erzeugen ohne message einen festen Auftrag', () => {
    const msgs = buildMessages({ kind: 'start', message: null, context: {}, history: [] })
    expect(msgs.at(-1).role).toBe('user')
    expect(msgs.at(-1).content.length).toBeGreaterThan(10)
  })
})

describe('pickModel', () => {
  it('routet zerlegen/tagesplan aufs smarte Modell, Rest aufs schnelle', () => {
    expect(pickModel('zerlegen', {})).toBe('claude-sonnet-5')
    expect(pickModel('tagesplan', {})).toBe('claude-sonnet-5')
    expect(pickModel('frage', {})).toBe('claude-haiku-4-5')
    expect(pickModel('start', { BUDDY_MODEL_FAST: 'x' })).toBe('x')
    expect(pickModel('zerlegen', { BUDDY_MODEL_SMART: 'y' })).toBe('y')
  })
})

describe('normalizeResponse', () => {
  it('sammelt Text-Blöcke und mappt tool_use auf Actions', () => {
    const api = {
      content: [
        { type: 'text', text: 'Fangen wir klein an. ' },
        { type: 'tool_use', name: 'subtasks', input: { todoId: 'abc', items: ['Umschlag suchen'] } },
        { type: 'text', text: 'Schaffst du.' },
      ],
    }
    const { text, actions } = normalizeResponse(api)
    expect(text).toBe('Fangen wir klein an. Schaffst du.')
    expect(actions).toEqual([{ type: 'subtasks', todoId: 'abc', items: ['Umschlag suchen'] }])
  })

  it('verwirft unbekannte Tools und kaputte Shapes', () => {
    expect(normalizeResponse({ content: [{ type: 'tool_use', name: 'rm_rf', input: {} }] }).actions).toEqual([])
    expect(normalizeResponse(null)).toEqual({ text: '', actions: [] })
    expect(normalizeResponse({ content: 'quatsch' })).toEqual({ text: '', actions: [] })
  })
})

describe('Tools & Limits', () => {
  it('definiert genau die 5 Action-Tools', () => {
    expect(BUDDY_TOOLS.map(t => t.name).sort())
      .toEqual(['create_todo', 'focus', 'remember', 'schedule', 'subtasks'])
    expect(BUDDY_TOOLS.every(t => t.input_schema?.type === 'object')).toBe(true)
    expect(KINDS).toContain('frage')
  })

  it('limitScope meldet daily vor monthly, sonst null', () => {
    expect(limitScope({ dailyCount: 50, monthlyCount: 0, dailyLimit: 50, monthlyCap: 3000 })).toBe('daily')
    expect(limitScope({ dailyCount: 0, monthlyCount: 3000, dailyLimit: 50, monthlyCap: 3000 })).toBe('monthly')
    expect(limitScope({ dailyCount: 49, monthlyCount: 2999, dailyLimit: 50, monthlyCap: 3000 })).toBe(null)
  })

  it('dayKey/monthKey liefern stabile UTC-Schlüssel', () => {
    const t = Date.UTC(2026, 6, 19, 23, 59)
    expect(dayKey(t)).toBe('2026-07-19')
    expect(monthKey(t)).toBe('m:2026-07')
  })
})
