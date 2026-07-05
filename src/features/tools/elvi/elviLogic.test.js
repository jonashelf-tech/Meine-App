import { describe, it, expect } from 'vitest'
import {
  dayDose, doseBucketKey, percentileRank, cognitiveDayForm,
  buildDoseBuckets, toleranceCost, benefitScore, netScore,
  confidenceLevel, doseRecommendation,
} from './elviLogic'

// Mini-Config: nur die Richtung zählt für die Logik.
const CFG = {
  up:   { higherIsBetter: true },   // größer = besser (z.B. Trefferrate)
  down: { higherIsBetter: false },  // kleiner = besser (z.B. Reaktionszeit)
}

const day = (date, mg, ratings = {}) => ({ date, doses: [{ time: '08:00', mg }], ratings })
const sess = (date, moduleId, mainMetric) => ({ date, moduleId, mainMetric })

describe('dayDose', () => {
  it('summiert die mg der Dosen', () => {
    expect(dayDose({ doses: [{ mg: 30 }, { mg: 20 }] })).toBe(50)
  })
  it('behandelt fehlende/leere Dosen als 0', () => {
    expect(dayDose(null)).toBe(0)
    expect(dayDose({ doses: [] })).toBe(0)
  })
  it('rechnet mit Kommazahlen', () => {
    expect(dayDose({ doses: [{ mg: 7.5 }, { mg: 5 }] })).toBe(12.5)
  })
})

describe('doseBucketKey', () => {
  it('rundet auf 0,5 mg gegen Float-Artefakte', () => {
    expect(doseBucketKey(7.5)).toBe(7.5)
    expect(doseBucketKey(7.4999999)).toBe(7.5)
    expect(doseBucketKey(50.0000001)).toBe(50)
  })
})

describe('percentileRank', () => {
  it('höher-ist-besser: Bestwert → hoher Rang, schlechtester → niedrig', () => {
    expect(percentileRank(30, [10, 20, 30], true)).toBe(83)
    expect(percentileRank(10, [10, 20, 30], true)).toBe(17)
  })
  it('kleiner-ist-besser dreht die Richtung um', () => {
    expect(percentileRank(10, [10, 20, 30], false)).toBe(83) // 10ms = beste Reaktion
    expect(percentileRank(30, [10, 20, 30], false)).toBe(17)
  })
  it('braucht ≥2 Vergleichswerte, sonst null', () => {
    expect(percentileRank(10, [10], true)).toBeNull()
    expect(percentileRank(10, [], true)).toBeNull()
  })
})

describe('cognitiveDayForm', () => {
  const sessions = [
    // Modul up: an d3 der Bestwert
    sess('d1', 'up', 10), sess('d2', 'up', 20), sess('d3', 'up', 30),
    // Modul down: an d3 die beste (kleinste) Reaktionszeit
    sess('d1', 'down', 500), sess('d2', 'down', 400), sess('d3', 'down', 300),
  ]
  it('mittelt die Perzentil-Ränge der Sessions eines Tages', () => {
    // d3: up-Rang 83 (30 ist Bestwert), down-Rang 83 (300 ist beste) → 83
    expect(cognitiveDayForm('d3', sessions, CFG)).toBe(83)
  })
  it('null wenn an dem Tag keine Sessions liefen', () => {
    expect(cognitiveDayForm('dX', sessions, CFG)).toBeNull()
  })
  it('null wenn das Modul zu wenig Historie für einen Rang hat', () => {
    const single = [sess('d1', 'up', 10)]
    expect(cognitiveDayForm('d1', single, CFG)).toBeNull()
  })
})

describe('buildDoseBuckets', () => {
  it('gruppiert Tage nach Dosis-Stufe und lässt fehlende Signale null', () => {
    const days = [
      day('d1', 30, { fokus: 5 }),           // keine crash/reiz
      day('d2', 30, { fokus: 7, crash: 2 }),
      day('d3', 50, { fokus: 8, crash: 3, reiz: 2 }),
    ]
    const buckets = buildDoseBuckets(days, [], CFG)
    expect(buckets.map(b => b.dose)).toEqual([30, 50])
    const b30 = buckets[0]
    expect(b30.days).toBe(2)
    expect(b30.fokus).toBe(6)      // (5+7)/2
    expect(b30.crash).toBe(2)      // nur d2 hatte crash
    expect(b30.reiz).toBeNull()    // nie erfasst
    expect(b30.cog).toBeNull()     // keine Sessions
  })
  it('ignoriert Tage ohne Dosis', () => {
    expect(buildDoseBuckets([day('d1', 0)], [], CFG)).toEqual([])
  })
})

describe('score-Bausteine mit Teildaten', () => {
  it('benefitScore nutzt nur vorhandene Signale', () => {
    expect(benefitScore({ cog: 80, fokus: 6 })).toBe(70)   // (80 + 60)/2
    expect(benefitScore({ cog: 80, fokus: null })).toBe(80) // nur objektiv
    expect(benefitScore({ cog: null, fokus: 6 })).toBe(60)  // nur subjektiv
    expect(benefitScore({ cog: null, fokus: null })).toBeNull()
  })
  it('toleranceCost mittelt vorhandene Nebenwirkungen', () => {
    expect(toleranceCost({ crash: 4, reiz: 6 })).toBe(50)
    expect(toleranceCost({ crash: 4, reiz: null })).toBe(40)
    expect(toleranceCost({ crash: null, reiz: null })).toBeNull()
  })
  it('netScore ohne Nutzen → nur Verträglichkeit bestraft', () => {
    expect(netScore({ cog: null, fokus: null, crash: 8, reiz: 8 })).toBe(50 - 0.7 * 80)
  })
  it('netScore ganz ohne Signal → null', () => {
    expect(netScore({ cog: null, fokus: null, crash: null, reiz: null })).toBeNull()
  })
})

describe('doseRecommendation — Datenlagen', () => {
  it('keine Daten → no-data', () => {
    const rec = doseRecommendation([], [], CFG)
    expect(rec.status).toBe('no-data')
    expect(rec.direction).toBe(0)
  })

  it('nur eine Dosis-Stufe, gute Werte → halten', () => {
    const days = [day('d1', 50, { fokus: 7, crash: 2, reiz: 2 })]
    const rec = doseRecommendation(days, [], CFG)
    expect(rec.status).toBe('single-dose')
    expect(rec.direction).toBe(0)
    expect(rec.confidence).toBe('low')
  })

  it('eine Dosis-Stufe, hoher Crash → reduzieren (Sicherheit)', () => {
    const days = [
      day('d1', 70, { fokus: 6, crash: 8, reiz: 5 }),
      day('d2', 70, { fokus: 6, crash: 7, reiz: 6 }),
    ]
    const rec = doseRecommendation(days, [], CFG)
    expect(rec.status).toBe('single-dose')
    expect(rec.direction).toBe(-1)
  })

  it('eine Dosis-Stufe, schwacher Fokus + gut verträglich → erhöhen', () => {
    const days = [day('d1', 20, { fokus: 2, crash: 1, reiz: 1 })]
    const rec = doseRecommendation(days, [], CFG)
    expect(rec.direction).toBe(1)
  })

  it('mehrere Stufen: höhere Dosis mit besserer Form/Fokus → erhöhen', () => {
    const days = [
      day('d1', 30, { fokus: 4, crash: 2, reiz: 2 }),
      day('d2', 30, { fokus: 4, crash: 2, reiz: 2 }),
      day('d3', 50, { fokus: 8, crash: 2, reiz: 2 }),
      day('d4', 50, { fokus: 8, crash: 2, reiz: 2 }),
    ]
    const rec = doseRecommendation(days, [], CFG, 30)
    expect(rec.status).toBe('compare')
    expect(rec.recommendedDose).toBe(50)
    expect(rec.direction).toBe(1)
  })

  it('mehrere Stufen: höhere Dosis nur minimal besser, aber unverträglich → niedrigere gewinnt', () => {
    const days = [
      day('d1', 50, { fokus: 7, crash: 2, reiz: 2 }),
      day('d2', 50, { fokus: 7, crash: 2, reiz: 2 }),
      day('d3', 70, { fokus: 8, crash: 9, reiz: 9 }), // etwas mehr Fokus, aber heftige Nebenwirkung
      day('d4', 70, { fokus: 8, crash: 9, reiz: 9 }),
    ]
    const rec = doseRecommendation(days, [], CFG, 70)
    expect(rec.recommendedDose).toBe(50)
    expect(rec.direction).toBe(-1)
  })

  it('Sicherheits-Override: aktuelle Dosis unverträglich, Empfehlung nicht niedriger → runter', () => {
    const days = [
      day('d1', 50, { fokus: 5, crash: 3, reiz: 3 }),
      day('d2', 70, { fokus: 9, crash: 8, reiz: 8 }), // beste "Wirkung" aber Crash hoch
      day('d3', 70, { fokus: 9, crash: 8, reiz: 8 }),
    ]
    // aktuell 70 → trotz bester Roh-Wirkung soll Sicherheit auf 50 ziehen
    const rec = doseRecommendation(days, [], CFG, 70)
    expect(rec.recommendedDose).toBeLessThan(70)
    expect(rec.direction).toBe(-1)
  })

  it('funktioniert rein objektiv (nur Kognitiv, keine Ratings)', () => {
    const days = [
      { date: 'd1', doses: [{ mg: 30 }], ratings: {} },
      { date: 'd2', doses: [{ mg: 50 }], ratings: {} },
    ]
    const sessions = [
      // Modul up: bei 50mg (d2) klar bessere Leistung
      sess('d0', 'up', 10), sess('d1', 'up', 12), sess('d2', 'up', 40),
    ]
    const rec = doseRecommendation(days, sessions, CFG, 30)
    expect(rec.status).toBe('compare')
    expect(rec.hasCognitive).toBe(true)
    expect(rec.recommendedDose).toBe(50)
  })

  it('Confidence steigt mit Stufen + Kognitiv-Daten + Tagen', () => {
    const many = []
    for (let i = 0; i < 4; i++) many.push(day(`a${i}`, 30, { fokus: 5, crash: 2, reiz: 2 }))
    for (let i = 0; i < 4; i++) many.push(day(`b${i}`, 50, { fokus: 7, crash: 2, reiz: 2 }))
    const sessions = []
    // genug Kognitiv-Historie, damit Ränge existieren
    for (let i = 0; i < 4; i++) sessions.push(sess(`a${i}`, 'up', 10 + i))
    for (let i = 0; i < 4; i++) sessions.push(sess(`b${i}`, 'up', 30 + i))
    const buckets = buildDoseBuckets(many, sessions, CFG)
    expect(confidenceLevel(buckets, true)).toBe('high')
  })
})
