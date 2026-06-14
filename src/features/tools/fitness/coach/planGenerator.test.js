import { describe, it, expect } from 'vitest'
import { generateCoachPlan, splitTemplates, targetSetsPerMuscle, repRangeFor, painExcluded } from './planGenerator'
import { EXERCISE_SEED } from '../exerciseSeed'

const coach = { trainingDays: 4, ambition: 'normal', repPref: 'standard', pains: [], priorities: {} }

describe('splitTemplates', () => {
  it('liefert die richtige Tageszahl pro Split', () => {
    expect(splitTemplates(2)).toHaveLength(2)
    expect(splitTemplates(4)).toHaveLength(4)
    expect(splitTemplates(6)).toHaveLength(6)
  })
})
describe('targetSetsPerMuscle', () => {
  it('hoch=oberes Ende, niedrig=MEV, clamp MEV..MAV', () => {
    const t = targetSetsPerMuscle({ ambition: 'normal', priorities: { brust: 'high', trizeps: 'low' } })
    expect(t.brust).toBe(16)   // ambition normal hi=16, brust mav-hi=20 → 16
    expect(t.trizeps).toBe(6)  // low → mev (trizeps mev=6)
  })
})
describe('repRangeFor', () => {
  it('grund schwerer, isolation leichter', () => {
    expect(repRangeFor('grund', 'standard')).toEqual([8, 10])
    expect(repRangeFor('isolation', 'standard')).toEqual([10, 12])
  })
})
describe('painExcluded', () => {
  it('schließt schulterlastige Übung bei Schulterschmerz aus', () => {
    expect(painExcluded({ allocation: { schulterSeitlich: 100 } }, ['schulter'])).toBe(true)
    expect(painExcluded({ allocation: { brust: 70, trizeps: 30 } }, ['schulter'])).toBe(false)
  })
})
describe('generateCoachPlan', () => {
  const plan = generateCoachPlan(coach, EXERCISE_SEED, [])
  it('hat modus coach + coach-config + richtige Tageszahl', () => {
    expect(plan.modus).toBe('coach')
    expect(plan.coach).toBe(coach)
    expect(plan.days).toHaveLength(4)
  })
  it('jeder Tag hat Übungen mit gültigen Zielwerten', () => {
    plan.days.forEach(day => {
      expect(day.exercises.length).toBeGreaterThan(0)
      day.exercises.forEach(e => {
        expect(e.exerciseId).toBeTruthy()
        expect(e.zielSaetze).toBeGreaterThanOrEqual(2)
        expect(e.zielSaetze).toBeLessThanOrEqual(5)
        expect(e.zielWdh).toHaveLength(2)
      })
    })
  })
  it('meidet schmerzbelastete Übungen', () => {
    const p2 = generateCoachPlan({ ...coach, pains: ['schulter'] }, EXERCISE_SEED, [])
    const ids = p2.days.flatMap(d => d.exercises.map(e => e.exerciseId))
    const exById = Object.fromEntries(EXERCISE_SEED.map(e => [e.id, e]))
    ids.forEach(id => expect(painExcluded(exById[id], ['schulter'])).toBe(false))
  })
})
