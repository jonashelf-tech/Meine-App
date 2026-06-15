import { describe, it, expect, beforeEach } from 'vitest'
import { EXERCISE_SEED } from './exerciseSeed'
import { MUSCLES, EQUIPMENT, EXERCISE_PATTERNS } from './fitnessModel'
import { ensureSeeded, loadFitness } from './fitnessStore'

describe('EXERCISE_SEED', () => {
  it('jede Allokation summiert auf 100', () => {
    EXERCISE_SEED.forEach(ex => {
      const sum = Object.values(ex.allocation).reduce((a, v) => a + v, 0)
      expect(sum, ex.name).toBe(100)
    })
  })
  it('nur gültige Muskel-Keys, Equipment, Kategorie; custom=false; stabile IDs', () => {
    const ids = new Set()
    EXERCISE_SEED.forEach(ex => {
      expect(ex.id, ex.name).toBeTruthy()
      expect(ids.has(ex.id)).toBe(false); ids.add(ex.id)
      expect(ex.custom).toBe(false)
      expect(['grund', 'isolation']).toContain(ex.kategorie)
      expect(EQUIPMENT).toContain(ex.equipment)
      expect(ex.defaultRepRange).toHaveLength(2)
      Object.keys(ex.allocation).forEach(m => expect(MUSCLES).toContain(m))
    })
  })
  it('deckt alle 15 Muskelgruppen ab', () => {
    const covered = new Set(EXERCISE_SEED.flatMap(ex => Object.keys(ex.allocation)))
    MUSCLES.forEach(m => expect(covered.has(m), m).toBe(true))
  })
  it('jede Übung hat gültiges Bewegungsmuster + Ratings 1–5', () => {
    EXERCISE_SEED.forEach(ex => {
      expect(EXERCISE_PATTERNS, ex.name).toContain(ex.pattern)
      ;['stabilitaet', 'dehnung', 'last'].forEach(axis => {
        expect(Number.isInteger(ex[axis]), `${ex.name}.${axis}`).toBe(true)
        expect(ex[axis], `${ex.name}.${axis}`).toBeGreaterThanOrEqual(1)
        expect(ex[axis], `${ex.name}.${axis}`).toBeLessThanOrEqual(5)
      })
    })
  })
})

describe('ensureSeeded', () => {
  beforeEach(() => localStorage.clear())
  it('seedet bei leerem Speicher und setzt meta.seeded', () => {
    const f = ensureSeeded()
    expect(f.exercises.length).toBe(EXERCISE_SEED.length)
    expect(f.meta.seeded).toBe(true)
    expect(loadFitness().exercises.length).toBe(EXERCISE_SEED.length)
  })
  it('ist idempotent — zweiter Aufruf dupliziert nicht', () => {
    ensureSeeded()
    const after = ensureSeeded()
    expect(after.exercises.length).toBe(EXERCISE_SEED.length)
  })
})
