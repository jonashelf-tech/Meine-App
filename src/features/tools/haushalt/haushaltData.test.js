import { describe, it, expect } from 'vitest'
import { taskUrgency, taskSegments, roomStatus, taskDueLabel } from './haushaltData'

const task = (over = {}) => ({
  id: 't1', text: 'Test', duration: 10, freq: 'weekly', customDays: null,
  lowEnergy: false, lastDone: null, subItems: [], ...over,
})

const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 86_400_000)
  return d.toISOString().slice(0, 10)
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
