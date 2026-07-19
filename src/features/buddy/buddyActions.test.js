// Guard-Tests für Buddy-Action-Validierung: jede Server-Action wird client-
// seitig streng validiert/normalisiert, bevor sie als Bestätigen-Karte
// erscheint — die KI-Antwort ist Fremd-Input, nie direkt ausführbar.
import { describe, it, expect } from 'vitest'
import { validateAction, timeToSlotKey, scheduleTargetFree } from './buddyActions'

describe('validateAction — Grundsätzliches', () => {
  it('verwirft Müll und unbekannte Typen', () => {
    expect(validateAction(null)).toBe(null)
    expect(validateAction('focus')).toBe(null)
    expect(validateAction({ type: 'rm_rf' })).toBe(null)
    expect(validateAction({})).toBe(null)
  })
})

describe('subtasks', () => {
  it('trimmt, wirft Leere raus, kappt bei 20 Stück und 200 Zeichen', () => {
    const items = ['  Umschlag suchen  ', '', 'x'.repeat(300), ...Array.from({ length: 25 }, (_, i) => `S${i}`)]
    const a = validateAction({ type: 'subtasks', todoId: 'abc', items })
    expect(a.todoId).toBe('abc')
    expect(a.items.length).toBe(20)
    expect(a.items[0]).toBe('Umschlag suchen')
    expect(a.items[1].length).toBe(200)
  })

  it('ohne brauchbare items → null', () => {
    expect(validateAction({ type: 'subtasks', items: [] })).toBe(null)
    expect(validateAction({ type: 'subtasks', items: [' ', 3] })).toBe(null)
  })
})

describe('create_todo', () => {
  it('normalisiert Felder und streicht ungültige optionale Angaben', () => {
    const a = validateAction({
      type: 'create_todo', text: '  Anruf vorbereiten ', priority: 9,
      duration: -5, date: 'quatsch', time: '14:30',
    })
    expect(a).toEqual({ type: 'create_todo', text: 'Anruf vorbereiten', time: '14:30' })
  })

  it('übernimmt gültige optionale Felder', () => {
    const a = validateAction({ type: 'create_todo', text: 'X', priority: 1, duration: 45, date: '2026-07-20' })
    expect(a).toEqual({ type: 'create_todo', text: 'X', priority: 1, duration: 45, date: '2026-07-20' })
  })

  it('ohne Text → null', () => {
    expect(validateAction({ type: 'create_todo', text: '  ' })).toBe(null)
  })
})

describe('focus', () => {
  it('klemmt Minuten auf 5–120 und rundet', () => {
    expect(validateAction({ type: 'focus', minutes: 25.6 }).minutes).toBe(26)
    expect(validateAction({ type: 'focus', minutes: 2 }).minutes).toBe(5)
    expect(validateAction({ type: 'focus', minutes: 999, todoId: 't1' })).toEqual({ type: 'focus', minutes: 120, todoId: 't1' })
    expect(validateAction({ type: 'focus', minutes: 'zehn' })).toBe(null)
  })
})

describe('schedule', () => {
  it('braucht todoId, Datum und eine Zeit auf dem Halbstunden-Raster', () => {
    expect(validateAction({ type: 'schedule', todoId: 't1', date: '2026-07-20', time: '14:30' }))
      .toEqual({ type: 'schedule', todoId: 't1', date: '2026-07-20', time: '14:30', slotKey: '14.5' })
    expect(validateAction({ type: 'schedule', todoId: 't1', date: '2026-07-20', time: '9:15' }).time).toBe('09:00')
    expect(validateAction({ type: 'schedule', date: '2026-07-20', time: '14:30' })).toBe(null)
    expect(validateAction({ type: 'schedule', todoId: 't1', date: '20.07.', time: '14:30' })).toBe(null)
    expect(validateAction({ type: 'schedule', todoId: 't1', date: '2026-07-20', time: '25:00' })).toBe(null)
  })
})

describe('remember', () => {
  it('trimmt und kappt, leer → null', () => {
    expect(validateAction({ type: 'remember', text: '  Telefonate fallen mir schwer ' }))
      .toEqual({ type: 'remember', text: 'Telefonate fallen mir schwer' })
    expect(validateAction({ type: 'remember', text: '' })).toBe(null)
  })
})

describe('timeToSlotKey', () => {
  it('mappt auf das Slot-Key-Format des days-Stores', () => {
    expect(timeToSlotKey('08:00')).toBe('8')
    expect(timeToSlotKey('08:30')).toBe('8.5')
    expect(timeToSlotKey('8:45')).toBe('8.5')
    expect(timeToSlotKey('kaputt')).toBe(null)
  })
})

describe('scheduleTargetFree', () => {
  const days = { '2026-07-20': { '14': { text: 'belegt', duration: 60 } } }

  it('frei, wenn Ziel-Slots leer sind — auch am unbekannten Tag', () => {
    expect(scheduleTargetFree(days, '2026-07-20', '9', 30)).toBe(true)
    expect(scheduleTargetFree(days, '2026-07-21', '14', 90)).toBe(true)
  })

  it('blockiert, wenn der Slot oder ein überspannter Folge-Slot belegt ist', () => {
    expect(scheduleTargetFree(days, '2026-07-20', '14', 30)).toBe(false)
    expect(scheduleTargetFree(days, '2026-07-20', '13.5', 60)).toBe(false)
  })
})
