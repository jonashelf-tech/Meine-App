import { describe, it, expect } from 'vitest'
import {
  bestMetric, computeImprovement, computeDelta, barFraction,
  formScore, moduleForm, domainForm, isPersonalBest, einheitenInRange, einheitStreak,
} from './sessionStore'

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

describe('formScore — 0..100 gegen Bestform', () => {
  it('höher=besser, am Bestwert → 100', () => expect(formScore(90, 90, true)).toBe(100))
  it('höher=besser, halb so gut → 50', () => expect(formScore(45, 90, true)).toBe(50))
  it('kleiner=besser, am Bestwert → 100', () => expect(formScore(380, 380, false)).toBe(100))
  it('kleiner=besser, doppelt so langsam → 50', () => expect(formScore(760, 380, false)).toBe(50))
  it('0 → 0 ohne Crash', () => expect(formScore(0, 0, true)).toBe(0))
})

describe('moduleForm — rollender Schnitt vs Bestwert', () => {
  it('leere Historie → null', () => expect(moduleForm([], true)).toBeNull())
  it('höher=besser: Bestwert 90, letzte drei alle 90 → 100', () => {
    expect(moduleForm([50, 90, 90, 90], true)).toBe(100)
  })
})

describe('domainForm — je Profil-Domäne 0..100 oder null', () => {
  it('einzige alertness-Session = Bestform → Aufmerksamkeit 100, Flexibilität null', () => {
    const sessions = [{ moduleId: 'alertness', date: '2026-06-29', mainMetric: 400 }]
    const f = domainForm(sessions)
    expect(f.aufmerksamkeit).toBe(100)
    expect(f.flexibilitaet).toBeNull()
  })
})

describe('isPersonalBest', () => {
  it('erste Session ist immer PB', () => expect(isPersonalBest([], 400, false)).toBe(true))
  it('kleiner=besser: schneller als bisher → PB', () => expect(isPersonalBest([450, 420], 400, false)).toBe(true))
  it('kleiner=besser: langsamer → kein PB', () => expect(isPersonalBest([450, 420], 430, false)).toBe(false))
  it('größer=besser: mehr Treffer → PB', () => expect(isPersonalBest([60, 70], 80, true)).toBe(true))
})

describe('einheitenInRange & einheitStreak', () => {
  const s = (date, complete) => ({ moduleId: 'x', date, mainMetric: 1, einheitComplete: complete })
  it('zählt nur abgeschlossene Einheiten im Zeitraum', () => {
    const sessions = [s('2026-06-20', true), s('2026-06-28', true), s('2026-06-29', false)]
    expect(einheitenInRange(sessions, '2026-06-23')).toBe(1)
  })
  it('Streak: heute + gestern abgeschlossen → 2', () => {
    expect(einheitStreak([s('2026-06-28', true), s('2026-06-29', true)], '2026-06-29')).toBe(2)
  })
  it('Streak: heute fehlt, gestern ja → verankert gestern → 1', () => {
    expect(einheitStreak([s('2026-06-28', true)], '2026-06-29')).toBe(1)
  })
  it('Streak: Lücke vor heute/gestern → 0', () => {
    expect(einheitStreak([s('2026-06-25', true)], '2026-06-29')).toBe(0)
  })
})
