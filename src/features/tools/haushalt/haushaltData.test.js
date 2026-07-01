import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { taskUrgency, taskSegments, roomStatus, taskDueLabel } from './haushaltData'

// Fester Zeitpunkt (lokale Mittagszeit) — sonst kippen die Datums-Labels über
// Mitternacht: daysAgo() müsste sonst mit der Wall-Clock rechnen, und die
// UTC/Lokal-Grenze (toISOString ist UTC, daysSince rechnet lokal) erzeugt einen
// Off-by-one. Fixe Uhr + lokales daysAgo => deterministisch in jeder Zeitzone.
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0)) })
afterEach(() => { vi.useRealTimers() })

const task = (over = {}) => ({
  id: 't1', text: 'Test', duration: 10, freq: 'weekly', customDays: null,
  lowEnergy: false, lastDone: null, subItems: [], ...over,
})

// Lokales Datum n Tage zurück — konsistent mit daysSince() (das lokale
// Mitternacht parst). setDate() rechnet über DST/Monatsgrenzen korrekt.
const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

describe('taskUrgency — nie erledigt ist fällig, aber nicht überfällig', () => {
  it('lastDone null → genau 1.0 (fällig)', () => {
    expect(taskUrgency(task())).toBe(1.0)
  })

  it('wirklich verschleppt → über 1.0', () => {
    expect(taskUrgency(task({ lastDone: daysAgo(14) }))).toBeGreaterThan(1.0)
  })
})

describe('taskSegments — neutraler "neu"-Zustand', () => {
  it('nie erledigt → neu, violett, kein overdue', () => {
    const seg = taskSegments(task())
    expect(seg.neu).toBe(true)
    expect(seg.overdue).toBe(false)
    expect(seg.color).toBe('var(--primary)')
    expect(seg.filled).toBe(seg.total)
  })

  it('überfällig → rose + overdue', () => {
    const seg = taskSegments(task({ lastDone: daysAgo(10) }))
    expect(seg.neu).toBe(false)
    expect(seg.overdue).toBe(true)
    expect(seg.color).toBe('var(--rose)')
  })

  it('frisch erledigt → emerald', () => {
    const seg = taskSegments(task({ lastDone: daysAgo(1) }))
    expect(seg.color).toBe('var(--emerald)')
    expect(seg.overdue).toBe(false)
  })
})

describe('taskDueLabel — nutzt freqToDays, kein zweites Frequenz-Mapping', () => {
  it('nie erledigt → "neu"', () => {
    expect(taskDueLabel(task())).toBe('neu')
  })

  it('heute erledigt → "heute erledigt"', () => {
    expect(taskDueLabel(task({ lastDone: daysAgo(0) }))).toBe('heute erledigt')
  })

  it('gestern erledigt → "gestern erledigt"', () => {
    expect(taskDueLabel(task({ lastDone: daysAgo(1) }))).toBe('gestern erledigt')
  })

  it('innerhalb des Intervalls → "in N Tagen"', () => {
    // weekly = 7 Tage, vor 3 Tagen erledigt → noch 4 Tage
    expect(taskDueLabel(task({ lastDone: daysAgo(3) }))).toBe('in 4 Tagen')
  })

  it('genau morgen fällig → "morgen fällig"', () => {
    expect(taskDueLabel(task({ lastDone: daysAgo(6) }))).toBe('morgen fällig')
  })

  it('überfällig → singular/plural korrekt', () => {
    expect(taskDueLabel(task({ lastDone: daysAgo(8) }))).toBe('1 Tag überfällig')
    expect(taskDueLabel(task({ lastDone: daysAgo(10) }))).toBe('3 Tage überfällig')
  })

  it('custom-Frequenz nutzt customDays', () => {
    const t = task({ freq: 'custom', customDays: 14, lastDone: daysAgo(10) })
    expect(taskDueLabel(t)).toBe('in 4 Tagen')
  })
})

describe('roomStatus — nie erledigte Tasks mahnen nicht rot', () => {
  it('nur nie-erledigte Tasks → "neu" statt "now"', () => {
    expect(roomStatus({ tasks: [task(), task({ id: 't2' })] })).toBe('neu')
  })

  it('eine wirklich überfällige Task → "now"', () => {
    expect(roomStatus({ tasks: [task(), task({ id: 't2', lastDone: daysAgo(10) })] })).toBe('now')
  })

  it('alles frisch → "ok"', () => {
    expect(roomStatus({ tasks: [task({ lastDone: daysAgo(1) })] })).toBe('ok')
  })

  it('leerer Raum → "ok"', () => {
    expect(roomStatus({ tasks: [] })).toBe('ok')
  })
})
