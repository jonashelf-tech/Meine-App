import { describe, it, expect } from 'vitest'
import { bestMetric, computeImprovement, computeDelta, barFraction } from './sessionStore'

describe('bestMetric — Metrik-Richtung', () => {
  it('kleiner=besser (z.B. Reaktionszeit) → Minimum ist der Bestwert', () => {
    expect(bestMetric([420, 380, 450], false)).toBe(380)
  })
  it('größer=besser (z.B. Trefferrate) → Maximum ist der Bestwert', () => {
    expect(bestMetric([60, 85, 70], true)).toBe(85)
  })
})

describe('computeImprovement — positiv heißt immer besser', () => {
  it('kleiner=besser: von 500 auf 400 → +100 Verbesserung', () => {
    expect(computeImprovement(500, 400, false)).toBe(100)
  })
  it('größer=besser: von 4 auf 7 → +3 Verbesserung', () => {
    expect(computeImprovement(4, 7, true)).toBe(3)
  })
  it('größer=besser, schlechter geworden: von 7 auf 4 → -3', () => {
    expect(computeImprovement(7, 4, true)).toBe(-3)
  })
})

describe('barFraction — Balkenhöhe relativ zum Bestwert (1.0 = bester)', () => {
  it('kleiner=besser: Bestwert selbst → 1.0', () => {
    expect(barFraction(380, 380, false)).toBe(1)
  })
  it('kleiner=besser: doppelt so langsam wie Bestwert → 0.5', () => {
    expect(barFraction(760, 380, false)).toBe(0.5)
  })
  it('größer=besser: Bestwert selbst → 1.0', () => {
    expect(barFraction(90, 90, true)).toBe(1)
  })
  it('größer=besser: halb so viele Treffer wie Bestwert → 0.5', () => {
    expect(barFraction(45, 90, true)).toBe(0.5)
  })
  it('Bestwert 0 → kein Crash, liefert 0', () => {
    expect(barFraction(0, 0, false)).toBe(0)
  })
})

describe('computeDelta — Differenz zur letzten Session, positiv=besser', () => {
  it('kleiner=besser: vorher 450, jetzt 400 → +50 (schneller)', () => {
    expect(computeDelta(450, 400, false)).toBe(50)
  })
  it('größer=besser: vorher 5, jetzt 8 → +3 (mehr Treffer)', () => {
    expect(computeDelta(5, 8, true)).toBe(3)
  })
})
