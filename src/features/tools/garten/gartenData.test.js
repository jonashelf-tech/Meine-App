import { describe, it, expect, beforeEach } from 'vitest'
import {
  XP_WEIGHTS, computeRawXP, todayRawXP,
  reachedMilestones, nextMilestone, stageNum, currentStage, reachedDekos,
  displayXP, unseenMilestones, markMilestonesSeen,
} from './gartenData'
import { sv, SK } from '../../../storage'

const T = (done, doneAt) => ({ done, doneAt })
const Q = (habitChecks, journalDates) => ({ habitChecks, journalDates })

beforeEach(() => localStorage.clear())

describe('computeRawXP — Gewichte', () => {
  it('gewichtet alle vier Quellen korrekt', () => {
    const todos    = [T(true, '2026-06-10T08:00'), T(true, '2026-06-09T08:00'), T(false, null)]
    const tracking = { tagesplanerDates: ['2026-06-08', '2026-06-09', '2026-06-10'] }
    // 2·10 + 3·25 + 3·5 + 1·15 = 125
    expect(computeRawXP(todos, tracking, Q(3, ['2026-06-10']))).toBe(125)
  })
  it('funktioniert ohne Growth-Daten (leere Defaults)', () => {
    expect(computeRawXP([T(true, 'x')], { tagesplanerDates: [] }, Q(0, []))).toBe(XP_WEIGHTS.todo)
  })
})

describe('todayRawXP — zählt nur heutige Beiträge', () => {
  const today = '2026-06-10'
  it('Todos nur mit doneAt von heute', () => {
    const todos = [T(true, '2026-06-10T09:00:00'), T(true, '2026-06-09T09:00:00')]
    expect(todayRawXP(todos, { tagesplanerDates: [] }, Q(0, []), today)).toBe(XP_WEIGHTS.todo)
  })
  it('Planer-Tag + Journal von heute', () => {
    expect(todayRawXP([], { tagesplanerDates: [today] }, Q(0, [today]), today))
      .toBe(XP_WEIGHTS.planerTag + XP_WEIGHTS.journalTag)
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
