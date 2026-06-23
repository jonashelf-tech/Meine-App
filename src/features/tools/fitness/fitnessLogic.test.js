import { describe, it, expect } from 'vitest'
import {
  e1rm, roundToIncrement, restSecForExercise, warmupSets, bestWorkingE1rm, detectPRs,
  allocationOverlap, similarExercises, realSetsPerMuscle, plannedRealSetsPerMuscle, volumeZone, weekStartIso, e1rmSeries,
  nextRecommendation, adjustRemaining, weeklyVolumeAdjust, recoveryNeeded, reviewExercise,
  isoWeekday, scheduleStatus, weeklyFrequency, weeklyStreak, sessionsThisWeek, avgDurationMin,
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
  it('restSec-Override gewinnt', () => expect(restSecForExercise({ restSec: 90 })).toBe(90))
  it('ohne Override → Default 120', () => expect(restSecForExercise({ restSec: null })).toBe(120))
  it('übergebener Default greift', () => expect(restSecForExercise({ restSec: null }, 150)).toBe(150))
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

describe('allocationOverlap', () => {
  it('Summe der Minima', () => {
    expect(allocationOverlap({ brust: 70, trizeps: 30 }, { brust: 65, trizeps: 20, schulterVorne: 15 })).toBe(85)
  })
  it('keine Überlappung → 0', () => {
    expect(allocationOverlap({ brust: 100 }, { waden: 100 })).toBe(0)
  })
})

describe('weekStartIso', () => {
  it('liefert den Montag der Woche', () => {
    expect(weekStartIso('2026-06-14')).toBe('2026-06-08') // So 14.6. → Mo 8.6.
    expect(weekStartIso('2026-06-08')).toBe('2026-06-08') // Mo bleibt Mo
  })
})

describe('volumeZone', () => {
  it('Zonen für brust (mev8, mav[12,20], mrv22)', () => {
    expect(volumeZone('brust', 5)).toBe('low')
    expect(volumeZone('brust', 10)).toBe('optimal')
    expect(volumeZone('brust', 21)).toBe('high')
    expect(volumeZone('brust', 23)).toBe('over')
  })
  it('Muskel ohne Referenz → untracked', () => {
    expect(volumeZone('unterarme', 10)).toBe('untracked')
  })
})

describe('realSetsPerMuscle', () => {
  const exercises = [
    { id: 'bp', allocation: { brust: 70, trizeps: 30 } },
    { id: 'sh', allocation: { schulterSeitlich: 100 } },
  ]
  const sessions = [
    { date: '2026-06-09', exercises: [ // in der Woche von Mo 8.6.
      { exerciseId: 'bp', saetze: [
        { gewicht: 50, wdh: 10, satzTyp: 'normal' },
        { gewicht: 50, wdh: 10, satzTyp: 'normal' },
        { gewicht: 50, wdh: 10, satzTyp: 'normal' },
        { gewicht: 20, wdh: 10, satzTyp: 'warmup' }, // zählt nicht
      ] },
      { exerciseId: 'sh', saetze: [ { gewicht: 10, wdh: 15, satzTyp: 'normal' } ] },
    ] },
    { date: '2026-06-01', exercises: [ // andere Woche → ignoriert
      { exerciseId: 'bp', saetze: [ { gewicht: 50, wdh: 10, satzTyp: 'normal' } ] },
    ] },
  ]
  it('Hauptmuskel voll, Nebenmuskel anteilig, nur in der Zielwoche', () => {
    const res = realSetsPerMuscle(sessions, exercises, '2026-06-08')
    expect(res.brust).toBeCloseTo(3, 5)     // 3 Sätze × voll (Hauptmuskel)
    expect(res.trizeps).toBeCloseTo(0.9, 5) // 3 × 0.3 (Nebenmuskel)
    expect(res.schulterSeitlich).toBeCloseTo(1, 5)
  })
})

describe('plannedRealSetsPerMuscle', () => {
  const exercises = [{ id: 'bp', allocation: { brust: 70, trizeps: 30 } }]
  const plan = { days: [
    { exercises: [{ exerciseId: 'bp', zielSaetze: 3 }] },
    { exercises: [{ exerciseId: 'bp', zielSaetze: 3 }] },
  ] }
  it('Hauptmuskel voll × Zyklus-Faktor (Default: N=2 → ~2,33×/Woche)', () => {
    const res = plannedRealSetsPerMuscle(plan, exercises) // 6 (3+3, voll) × (7·2/3 ÷ 2)
    expect(res.brust).toBeCloseTo(14, 1)
    expect(res.trizeps).toBeCloseTo(4.2, 1)
  })
  it('mit Rhythmus: Sessions/Woche aus on/off', () => {
    const res = plannedRealSetsPerMuscle(plan, exercises, { on: 1, off: 1 }) // 3,5/Woche → ×1,75
    expect(res.brust).toBeCloseTo(10.5, 1)
  })
  it('freqOverride gewinnt vor rhythm-basierter Berechnung', () => {
    const res = plannedRealSetsPerMuscle(plan, exercises, { on: 1, off: 1 }, 4) // freqOverride=4 statt 3,5
    expect(res.brust).toBeCloseTo(12, 1) // 6 (3+3 voll) × (4/2)
  })
})

describe('e1rmSeries', () => {
  const sessions = [
    { date: '2026-06-01', exercises: [{ exerciseId: 'a', saetze: [{ gewicht: 100, wdh: 5, satzTyp: 'normal' }] }] },
    { date: '2026-06-08', exercises: [{ exerciseId: 'b', saetze: [{ gewicht: 50, wdh: 5, satzTyp: 'normal' }] }] },
    { date: '2026-06-15', exercises: [{ exerciseId: 'a', saetze: [{ gewicht: 105, wdh: 5, satzTyp: 'normal' }, { gewicht: 60, wdh: 10, satzTyp: 'warmup' }] }] },
  ]
  it('liefert chronologische e1RM-Punkte nur für die Übung, ohne Warmup', () => {
    const series = e1rmSeries(sessions, 'a')
    expect(series.map(p => p.date)).toEqual(['2026-06-01', '2026-06-15'])
    expect(series[0].e1rm).toBeGreaterThan(0)
    expect(series[1].e1rm).toBeGreaterThan(series[0].e1rm) // 105×5 > 100×5
  })
  it('leer wenn keine Historie', () => expect(e1rmSeries(sessions, 'x')).toEqual([]))
})

describe('nextRecommendation', () => {
  it('alle Sätze am oberen Ende → Gewicht hoch, Wdh ans untere Ende', () => {
    const last = [{ gewicht: 100, wdh: 10, rir: 1 }, { gewicht: 100, wdh: 10, rir: 2 }]
    expect(nextRecommendation(last, [8, 10], [1, 2], 2.5)).toEqual({ gewicht: 102.5, wdh: 8 })
  })
  it('nicht alle am oberen Ende → Gewicht halten, +1 Wdh', () => {
    const last = [{ gewicht: 100, wdh: 8 }, { gewicht: 100, wdh: 8 }]
    expect(nextRecommendation(last, [8, 10], [1, 2], 2.5)).toEqual({ gewicht: 100, wdh: 9 })
  })
  it('keine Historie → null', () => expect(nextRecommendation([], [8, 10], [1, 2], 2.5)).toBeNull())
})

describe('adjustRemaining', () => {
  const rec = { gewicht: 100, wdh: 8 }
  it('Underperformance (zu wenig Wdh) → ~-7,5% auf Inkrement', () => {
    expect(adjustRemaining(rec, { wdh: 5 }, [8, 10], 2.5).gewicht).toBe(92.5) // 100*0.925=92.5
  })
  it('nicht geschafft → runter', () => {
    expect(adjustRemaining(rec, { wdh: 8, feedback: 'nichtGeschafft' }, [8, 10], 2.5).gewicht).toBeLessThan(100)
  })
  it('leicht → +1 Inkrement', () => {
    expect(adjustRemaining(rec, { wdh: 8, feedback: 'leicht' }, [8, 10], 2.5).gewicht).toBe(102.5)
  })
  it('passt → unverändert', () => {
    expect(adjustRemaining(rec, { wdh: 8, feedback: 'passt' }, [8, 10], 2.5)).toEqual(rec)
  })
})

describe('similarExercises', () => {
  const target = { id: 't', name: 'Bankdrücken', allocation: { brust: 65, schulterVorne: 15, trizeps: 20 } }
  const all = [
    target,
    { id: 'a', name: 'Brustpresse', allocation: { brust: 70, schulterVorne: 15, trizeps: 15 } },
    { id: 'b', name: 'Seitheben', allocation: { schulterSeitlich: 100 } },
    { id: 'c', name: 'Kabel-Fly', allocation: { brust: 100 } },
  ]
  it('rankt nach Überlappung, ohne sich selbst, ohne 0-Überlappung', () => {
    const res = similarExercises(target, all, 5)
    expect(res.map(e => e.id)).not.toContain('t')
    expect(res.map(e => e.id)).not.toContain('b') // Seitheben: 0 Überlappung
    expect(res[0].id).toBe('a') // Brustpresse am ähnlichsten
  })
})

describe('weeklyVolumeAdjust', () => {
  it('gut (Trend hoch, passt) → +2, Deckel MRV', () => {
    expect(weeklyVolumeAdjust('brust', 12, 'up', { passt: 3, hart: 0 })).toBe(14)
    expect(weeklyVolumeAdjust('brust', 21, 'up', { passt: 3 })).toBe(22) // mrv brust=22
  })
  it('schlecht (Trend runter ODER überwiegend hart) → -2', () => {
    expect(weeklyVolumeAdjust('brust', 12, 'down', {})).toBe(10)
    expect(weeklyVolumeAdjust('brust', 12, 'flat', { hart: 3, passt: 1 })).toBe(10)
  })
  it('normal → halten', () => {
    expect(weeklyVolumeAdjust('brust', 12, 'flat', { passt: 2, hart: 1 })).toBe(12)
  })
})

describe('reviewExercise', () => {
  const sessions = [
    { date: '2026-06-01', exercises: [{ exerciseId: 'a', saetze: [{ gewicht: 100, wdh: 5, satzTyp: 'normal' }] }] },
    { date: '2026-06-08', exercises: [{ exerciseId: 'a', saetze: [{ gewicht: 105, wdh: 5, satzTyp: 'normal', feedback: 'passt' }, { gewicht: 105, wdh: 5, satzTyp: 'normal', feedback: 'hart' }] }] },
  ]
  it('Trend hoch + Feedback der jüngsten Session', () => {
    const r = reviewExercise(sessions, 'a')
    expect(r.trend).toBe('up')
    expect(r.feedbackDist.passt).toBe(1)
    expect(r.feedbackDist.hart).toBe(1)
  })
  it('keine Historie → flat, leere Verteilung', () => {
    const r = reviewExercise(sessions, 'x')
    expect(r.trend).toBe('flat')
    expect(r.feedbackDist).toEqual({ leicht: 0, passt: 0, hart: 0, nichtGeschafft: 0 })
  })
})

describe('isoWeekday', () => {
  it('Mo=1..So=7', () => {
    expect(isoWeekday('2026-06-08')).toBe(1) // Mo
    expect(isoWeekday('2026-06-09')).toBe(2) // Di
    expect(isoWeekday('2026-06-14')).toBe(7) // So
  })
})

describe('scheduleStatus', () => {
  const sessions = [{ date: '2026-06-08' }]
  it('flex → kein Hinweis (null)', () => {
    expect(scheduleStatus({ mode: 'flex' }, sessions, '2026-06-09')).toBeNull()
  })
  it('kein schedule → null', () => {
    expect(scheduleStatus(null, sessions, '2026-06-09')).toBeNull()
  })
  it('fixed, heute bereits getraint → done', () => {
    expect(scheduleStatus({ mode: 'fixed', days: [1] }, sessions, '2026-06-08')).toEqual({ kind: 'done' })
  })
  it('fixed, heute Trainingstag laut Plan, noch offen → train', () => {
    expect(scheduleStatus({ mode: 'fixed', days: [2] }, sessions, '2026-06-09')).toEqual({ kind: 'train' })
  })
  it('fixed, heute kein Trainingstag → rest', () => {
    expect(scheduleStatus({ mode: 'fixed', days: [1, 3] }, sessions, '2026-06-09')).toEqual({ kind: 'rest' })
  })
})

describe('weeklyFrequency', () => {
  it('fixed → Anzahl der Tage', () => {
    expect(weeklyFrequency({ schedule: { mode: 'fixed', days: [1, 3, 5] } }, 3)).toBe(3)
  })
  it('fixed ohne Tage → mind. 1', () => {
    expect(weeklyFrequency({ schedule: { mode: 'fixed', days: [] } }, 3)).toBe(1)
  })
  it('rhythm vorhanden → sessionsPerWeek(rhythm)', () => {
    expect(weeklyFrequency({ schedule: { mode: 'flex' }, rhythm: { on: 1, off: 1 } }, 3)).toBe(3.5)
  })
  it('flex ohne rhythm → Default-Zyklus aus rotationLength', () => {
    expect(weeklyFrequency({ schedule: { mode: 'flex' } }, 2)).toBeCloseTo(7 * 2 / 3, 5)
  })
})

describe('weeklyStreak', () => {
  it('leer → 0', () => expect(weeklyStreak([], '2026-06-15')).toBe(0))
  it('nur diese Woche trainiert → 1', () => {
    expect(weeklyStreak([{ date: '2026-06-15' }], '2026-06-16')).toBe(1)
  })
  it('diese + Vorwoche → 2', () => {
    const sessions = [{ date: '2026-06-08' }, { date: '2026-06-15' }]
    expect(weeklyStreak(sessions, '2026-06-16')).toBe(2)
  })
  it('Lücke stoppt den Streak', () => {
    const sessions = [{ date: '2026-06-01' }, { date: '2026-06-15' }] // Woche 1.6. fehlt dazwischen (8.6. Lücke)
    expect(weeklyStreak(sessions, '2026-06-16')).toBe(1)
  })
  it('Grace: aktuelle Woche noch kein Training → ab Vorwoche zählen', () => {
    const sessions = [{ date: '2026-06-08' }, { date: '2026-06-15' }]
    expect(weeklyStreak(sessions, '2026-06-20')).toBe(2) // Woche v. 15.6. läuft noch
  })
})

describe('sessionsThisWeek', () => {
  it('zählt distinkte Trainingstage der aktuellen Woche', () => {
    const sessions = [
      { date: '2026-06-08' }, { date: '2026-06-09' }, { date: '2026-06-09' }, // doppelt am selben Tag
      { date: '2026-06-01' }, // andere Woche
    ]
    expect(sessionsThisWeek(sessions, '2026-06-10')).toBe(2)
  })
  it('leer → 0', () => expect(sessionsThisWeek([], '2026-06-10')).toBe(0))
})

describe('avgDurationMin', () => {
  it('leer → 0', () => expect(avgDurationMin([])).toBe(0))
  it('Mittel der letzten n Sessions mit durationSec>0', () => {
    const sessions = [
      { durationSec: 0 }, // ignoriert
      { durationSec: 3000 }, // 50 min
      { durationSec: 3600 }, // 60 min
    ]
    expect(avgDurationMin(sessions, 5)).toBe(55)
  })
  it('nutzt nur die letzten n', () => {
    const sessions = [{ durationSec: 600 }, { durationSec: 6000 }, { durationSec: 6000 }] // 10, 100, 100 min
    expect(avgDurationMin(sessions, 2)).toBe(100) // nur die letzten 2
  })
})

describe('recoveryNeeded', () => {
  const ex = [{ id: 'a', allocation: { brust: 100 } }]
  const mk = (date, w) => ({ date, exercises: [{ exerciseId: 'a', saetze: [{ gewicht: w, wdh: 5, satzTyp: 'normal' }] }] })
  it('zwei Rückgänge in Folge → true', () => {
    expect(recoveryNeeded('brust', [mk('2026-06-01', 100), mk('2026-06-08', 95), mk('2026-06-15', 90)], ex)).toBe(true)
  })
  it('steigend → false', () => {
    expect(recoveryNeeded('brust', [mk('2026-06-01', 90), mk('2026-06-08', 95), mk('2026-06-15', 100)], ex)).toBe(false)
  })
  it('zu wenig Daten → false', () => {
    expect(recoveryNeeded('brust', [mk('2026-06-01', 100)], ex)).toBe(false)
  })
})
