import { describe, it, expect, beforeEach } from 'vitest'
import {
  XP_WEIGHTS, computeRawXP, todayRawXP,
  reachedMilestones, nextMilestone, stageNum, currentStage, reachedDekos,
  displayXP, unseenMilestones, markMilestonesSeen,
} from './gartenData'
import { sv, SK } from '../../../storage'

const T = (done, doneAt) => ({ done, doneAt })
const EMPTY_GROWTH = { habits: [], checks: {}, journal: {} }

beforeEach(() => localStorage.clear())

describe('computeRawXP — Gewichte', () => {
  it('gewichtet alle vier Quellen korrekt', () => {
    const todos    = [T(true, '2026-06-10T08:00'), T(true, '2026-06-09T08:00'), T(false, null)]
    const tracking = { tagesplanerDates: ['2026-06-08', '2026-06-09', '2026-06-10'] }
    const growth   = { habits: [], checks: { '2026-06-10': ['a', 'b'], '2026-06-09': ['a'] }, journal: { '2026-06-10': 'x' } }
    // 2·10 + 3·25 + 3·5 + 1·15 = 125
    expect(computeRawXP(todos, tracking, growth)).toBe(125)
  })
  it('funktioniert ohne Wachstum-Daten (leere Defaults)', () => {
    expect(computeRawXP([T(true, 'x')], { tagesplanerDates: [] }, EMPTY_GROWTH)).toBe(XP_WEIGHTS.todo)
  })
})

describe('todayRawXP — zählt nur heutige Beiträge', () => {
  const today = '2026-06-10'
  it('Todos nur mit doneAt von heute', () => {
    const todos = [T(true, '2026-06-10T09:00:00'), T(true, '2026-06-09T09:00:00')]
    expect(todayRawXP(todos, { tagesplanerDates: [] }, EMPTY_GROWTH, today)).toBe(XP_WEIGHTS.todo)
  })
  it('Planer-Tag + Checks + Journal von heute', () => {
    const growth = { habits: [], checks: { [today]: ['a', 'b'] }, journal: { [today]: 'gut' } }
    expect(todayRawXP([], { tagesplanerDates: [today] }, growth, today))
      .toBe(XP_WEIGHTS.planerTag + 2 * XP_WEIGHTS.habitCheck + XP_WEIGHTS.journalTag)
  })
})

describe('Meilensteine', () => {
  it('Schwelle genau erreicht zählt als erreicht', () => {
    expect(reachedMilestones(80).map(m => m.id)).toContain('keimling')
    expect(reachedMilestones(79).map(m => m.id)).not.toContain('keimling')
  })
  it('stageNum: 0 XP = Stufe 1, Endausbau = 8', () => {
    expect(stageNum(0)).toBe(1)
    expect(stageNum(6000)).toBe(8)
  })
  it('nextMilestone nach dem letzten = null', () => {
    expect(nextMilestone(6000)).toBeNull()
    expect(nextMilestone(0)?.id).toBe('keimling')
  })
  it('reachedDekos liefert nur Deko-IDs', () => {
    expect(reachedDekos(1000)).toEqual(['steine', 'gluehwuermchen', 'teich'])
  })
  it('currentStage(0) ist Samen', () => {
    expect(currentStage(0).id).toBe('samen')
  })
})

describe('displayXP — Monotonie-Ratchet', () => {
  it('steigt mit den Daten und fällt nie zurück', () => {
    sv(SK.erfolgeTracking, { tagesplanerDates: ['2026-06-10'] })
    expect(displayXP([T(true, 'x'), T(true, 'y')])).toBe(45) // 25 + 2·10
    // Erledigte Todos gelöscht → Rohwert sinkt, Anzeige nicht
    expect(displayXP([])).toBe(45)
  })
})

describe('Neu-Hinweis', () => {
  it('zählt ungesehene Meilensteine und lässt sich quittieren', () => {
    expect(unseenMilestones(200)).toBe(3) // samen, keimling, steine
    markMilestonesSeen(200)
    expect(unseenMilestones(200)).toBe(0)
  })
})
