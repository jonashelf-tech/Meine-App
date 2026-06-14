import { describe, it, expect, beforeEach } from 'vitest'
import { saveFitness, loadFitness, addSession, lastSetsFor, advancePlanCursor } from './fitnessStore'

beforeEach(() => localStorage.clear())

describe('lastSetsFor', () => {
  it('liefert die Arbeitssätze der jüngsten Session mit dieser Übung', () => {
    addSession({ id: 's1', date: '2026-06-01', exercises: [{ exerciseId: 'a', saetze: [{ gewicht: 50, wdh: 10, satzTyp: 'normal' }] }] })
    addSession({ id: 's2', date: '2026-06-08', exercises: [{ exerciseId: 'a', saetze: [{ gewicht: 55, wdh: 8, satzTyp: 'normal' }, { gewicht: 30, wdh: 12, satzTyp: 'warmup' }] }] })
    const sets = lastSetsFor('a')
    expect(sets).toHaveLength(1)
    expect(sets[0].gewicht).toBe(55)
  })
  it('leer wenn keine Historie', () => expect(lastSetsFor('x')).toEqual([]))
})

describe('advancePlanCursor', () => {
  it('schiebt den Cursor zyklisch', () => {
    saveFitness({ exercises: [], plans: [{ id: 'p', days: [{}, {}, {}] }], settings: {}, meta: { activePlanId: 'p', planCursor: {}, seeded: true } })
    advancePlanCursor('p', 3)
    expect(loadFitness().meta.planCursor.p).toBe(1)
    advancePlanCursor('p', 3); advancePlanCursor('p', 3)
    expect(loadFitness().meta.planCursor.p).toBe(0)
  })
})
