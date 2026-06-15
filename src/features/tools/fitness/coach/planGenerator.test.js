import { describe, it, expect } from 'vitest'
import { generateCoachPlan, splitTemplates, targetSetsPerMuscle, repRangeFor, painExcluded, SPLIT_CATALOG, recommendedSplit } from './planGenerator'
import { EXERCISE_SEED } from '../exerciseSeed'

const coach = { trainingDays: 4, ambition: 'normal', repPref: 'standard', pains: [], priorities: {} }

describe('splitTemplates', () => {
  it('liefert die richtige Tageszahl pro Split', () => {
    expect(splitTemplates(2)).toHaveLength(2)
    expect(splitTemplates(4)).toHaveLength(4)
    expect(splitTemplates(6)).toHaveLength(6)
  })
  it('nutzt die gewählte Variante, sonst die empfohlene', () => {
    expect(splitTemplates(3, 'ppl3').map(d => d.name)).toEqual(['Push', 'Pull', 'Beine'])
    expect(splitTemplates(3).map(d => d.name)).toEqual(recommendedSplit(3).days.map(d => d.name))
    expect(splitTemplates(3, 'gibtsnicht').map(d => d.name)).toEqual(recommendedSplit(3).days.map(d => d.name))
  })
})

describe('SPLIT_CATALOG', () => {
  it('jede Größe hat genau eine empfohlene Variante + eindeutige ids', () => {
    Object.entries(SPLIT_CATALOG).forEach(([size, variants]) => {
      expect(variants.filter(v => v.recommended).length, `Größe ${size}`).toBe(1)
      const ids = new Set()
      variants.forEach(v => {
        expect(v.days.length, v.id).toBe(Number(size))
        expect(ids.has(v.id), v.id).toBe(false); ids.add(v.id)
      })
    })
  })
})
describe('targetSetsPerMuscle', () => {
  it('Ambition wählt Band-Stufe pro Muskel, Priorität verschiebt, niedrig=MEV', () => {
    const t = targetSetsPerMuscle({ ambition: 'normal', priorities: { brust: 'high', trizeps: 'low' } })
    expect(t.brust).toBe(20)   // normal(Stufe1)+high(+1)=Stufe2 = oberes Optimal (brust mav-hi=20)
    expect(t.trizeps).toBe(6)  // niedrig → MEV (trizeps mev=6)
  })
  it('normal = Optimal-Mitte, vollgas+high gedeckelt auf MRV', () => {
    expect(targetSetsPerMuscle({ ambition: 'normal', priorities: {} }).brust).toBe(16) // round((12+20)/2)
    expect(targetSetsPerMuscle({ ambition: 'vollgas', priorities: { brust: 'high' } }).brust).toBe(22) // MRV
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
  it('kein doppeltes Bewegungsmuster pro Tag (löst Bankdrücken+enges-Bankdrücken)', () => {
    const exById = Object.fromEntries(EXERCISE_SEED.map(e => [e.id, e]))
    ;[2, 3, 4, 5, 6].forEach(d => {
      const p = generateCoachPlan({ ...coach, trainingDays: d }, EXERCISE_SEED, [])
      p.days.forEach(day => {
        const patterns = day.exercises.map(e => exById[e.exerciseId].pattern).filter(Boolean)
        expect(new Set(patterns).size, `${d}er ${day.name}`).toBe(patterns.length)
      })
    })
  })
})
