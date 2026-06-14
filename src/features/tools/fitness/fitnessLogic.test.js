import { describe, it, expect } from 'vitest'
import {
  e1rm, roundToIncrement, restSecForExercise, warmupSets, bestWorkingE1rm, detectPRs,
} from './fitnessLogic'

describe('e1rm (Epley)', () => {
  it('1 Wdh = Gewicht', () => expect(e1rm(100, 1)).toBe(100))
  it('10 Wdh', () => expect(e1rm(100, 10)).toBe(133.3))
  it('ungültig → 0', () => {
    expect(e1rm(0, 5)).toBe(0)
    expect(e1rm(100, 0)).toBe(0)
    expect(e1rm(null, 5)).toBe(0)
  })
})

describe('roundToIncrement', () => {
  it('rundet auf Inkrement', () => {
    expect(roundToIncrement(43, 2.5)).toBe(42.5)
    expect(roundToIncrement(44, 2.5)).toBe(45)
  })
  it('Inkrement 0 → unverändert', () => expect(roundToIncrement(50, 0)).toBe(50))
})

describe('restSecForExercise', () => {
  it('restSec-Override gewinnt', () => expect(restSecForExercise({ restSec: 90, defaultRepRange: [8, 12] })).toBe(90))
  it('schwer (5er) → 240', () => expect(restSecForExercise({ restSec: null, defaultRepRange: [5, 8] })).toBe(240))
  it('mittel (8er) → 180', () => expect(restSecForExercise({ restSec: null, defaultRepRange: [8, 12] })).toBe(180))
  it('leicht (12er) → 120', () => expect(restSecForExercise({ restSec: null, defaultRepRange: [12, 20] })).toBe(120))
})

describe('warmupSets', () => {
  it('drei Sätze vom Arbeitsgewicht, Typ warmup', () => {
    const w = warmupSets(100)
    expect(w).toEqual([
      { gewicht: 50, wdh: 10, satzTyp: 'warmup' },
      { gewicht: 75, wdh: 4, satzTyp: 'warmup' },
      { gewicht: 90, wdh: 2, satzTyp: 'warmup' },
    ])
  })
  it('Gewicht <= 0 → leer', () => expect(warmupSets(0)).toEqual([]))
})

describe('bestWorkingE1rm', () => {
  it('bester Arbeitssatz, Warmup ausgeschlossen', () => {
    const ex = { saetze: [
      { gewicht: 50, wdh: 10, satzTyp: 'warmup' },
      { gewicht: 100, wdh: 5, satzTyp: 'normal' },
      { gewicht: 90, wdh: 8, satzTyp: 'normal' },
    ] }
    // e1rm(100,5)=116.7 > e1rm(90,8)=114.0
    expect(bestWorkingE1rm(ex)).toBe(e1rm(100, 5))
  })
  it('keine Arbeitssätze → null', () => {
    expect(bestWorkingE1rm({ saetze: [{ gewicht: 50, wdh: 10, satzTyp: 'warmup' }] })).toBeNull()
    expect(bestWorkingE1rm({ saetze: [] })).toBeNull()
  })
})

describe('detectPRs', () => {
  const cur = { exerciseId: 'x', saetze: [
    { gewicht: 100, wdh: 5, satzTyp: 'normal' },
    { gewicht: 100, wdh: 6, satzTyp: 'normal' },
  ] }
  it('keine Vorgeschichte → keine PRs', () => {
    expect(detectPRs(cur, [])).toEqual([])
  })
  it('Gewichts-PR', () => {
    const prior = [{ exerciseId: 'x', saetze: [{ gewicht: 95, wdh: 5, satzTyp: 'normal' }] }]
    const prs = detectPRs(cur, prior)
    expect(prs.some(p => p.type === 'weight' && p.value === 100)).toBe(true)
  })
  it('Wdh-PR bei gleichem Gewicht', () => {
    const prior = [{ exerciseId: 'x', saetze: [{ gewicht: 100, wdh: 4, satzTyp: 'normal' }] }]
    const prs = detectPRs(cur, prior)
    expect(prs.some(p => p.type === 'reps' && p.gewicht === 100 && p.value === 6)).toBe(true)
  })
  it('e1RM-PR', () => {
    const prior = [{ exerciseId: 'x', saetze: [{ gewicht: 90, wdh: 5, satzTyp: 'normal' }] }]
    const prs = detectPRs(cur, prior)
    expect(prs.some(p => p.type === 'e1rm')).toBe(true)
  })
  it('Warmup zählt nicht', () => {
    const curWarmup = { exerciseId: 'x', saetze: [{ gewicht: 200, wdh: 1, satzTyp: 'warmup' }] }
    const prior = [{ exerciseId: 'x', saetze: [{ gewicht: 100, wdh: 5, satzTyp: 'normal' }] }]
    expect(detectPRs(curWarmup, prior)).toEqual([])
  })
})
