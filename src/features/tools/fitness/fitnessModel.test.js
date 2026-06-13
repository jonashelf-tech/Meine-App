import { describe, it, expect } from 'vitest'
import {
  MUSCLES, MUSCLE_LABELS, EQUIPMENT, VOLUME_REF, DEFAULT_INCREMENTS,
  genId, createExercise, createPlan, createPlanDay, createSession, createSet,
} from './fitnessModel'

describe('Konstanten', () => {
  it('hat 15 Muskelgruppen mit Labels', () => {
    expect(MUSCLES).toHaveLength(15)
    MUSCLES.forEach(m => expect(MUSCLE_LABELS[m]).toBeTruthy())
  })
  it('VOLUME_REF-Einträge haben mev<mav[1]<=mrv', () => {
    Object.values(VOLUME_REF).forEach(v => {
      expect(v.mev).toBeLessThan(v.mav[1])
      expect(v.mav[1]).toBeLessThanOrEqual(v.mrv)
    })
  })
  it('jedes Equipment hat ein Inkrement', () => {
    EQUIPMENT.forEach(e => expect(DEFAULT_INCREMENTS[e]).toBeDefined())
  })
})

describe('Factories', () => {
  it('genId liefert eindeutige Strings', () => {
    expect(genId()).not.toBe(genId())
  })
  it('createExercise hat Defaults + erlaubt Overrides', () => {
    const ex = createExercise({ name: 'Test', allocation: { brust: 100 } })
    expect(ex.id).toBeTruthy()
    expect(ex.name).toBe('Test')
    expect(ex.allocation).toEqual({ brust: 100 })
    expect(ex.kategorie).toBe('isolation')
    expect(ex.custom).toBe(true)
    expect(ex.restSec).toBeNull()
  })
  it('createSet hat satzTyp normal als Default', () => {
    const set = createSet({ gewicht: 50, wdh: 8 })
    expect(set.satzTyp).toBe('normal')
    expect(set.id).toBeTruthy()
  })
  it('createSession ist eine freie Session per Default', () => {
    const s = createSession({})
    expect(s.planId).toBeNull()
    expect(s.exercises).toEqual([])
    expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
