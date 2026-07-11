import { describe, it, expect, beforeEach } from 'vitest'
import { saveFitness, loadFitness, ensureSeeded } from './fitnessStore'
import { EXERCISE_SEED } from './exerciseSeed'

// Alt-Zustand: geseedet, aber Übungen ohne pattern/Ratings, Version 0.
function seedOldState() {
  saveFitness({
    exercises: [
      { id: 'seed-bankdruecken-lh', name: 'Bankdrücken (Langhantel)',
        allocation: { brust: 65, schulterVorne: 15, trizeps: 20 },
        kategorie: 'grund', equipment: 'langhantel', defaultRepRange: [5, 10],
        notiz: '', restSec: null, painRegions: [], custom: false },
      { id: 'custom-1', name: 'Meine Übung',
        allocation: { brust: 100 }, kategorie: 'isolation', equipment: 'kabel',
        defaultRepRange: [8, 12], notiz: 'meins', restSec: null, painRegions: [], custom: true },
    ],
    plans: [], settings: {},
    meta: { activePlanId: null, planCursor: {}, seeded: true, exerciseMetaVersion: 0 },
  })
}

describe('Übungs-Metadaten-Migration', () => {
  beforeEach(() => localStorage.clear())

  it('mergt pattern + Ratings in vorhandene Seed-Übungen', () => {
    seedOldState()
    const f = ensureSeeded()
    const bank = f.exercises.find(e => e.id === 'seed-bankdruecken-lh')
    expect(bank.pattern).toBe('flachDruck')
    expect(bank.stabilitaet).toBe(4)
    expect(bank.dehnung).toBe(3)
    expect(bank.last).toBe(5)
    expect(f.meta.exerciseMetaVersion).toBe(2)
  })

  it('lässt eigene Übungen samt Edits unangetastet, füllt nur Defaults', () => {
    seedOldState()
    const f = ensureSeeded()
    const mine = f.exercises.find(e => e.id === 'custom-1')
    expect(mine.notiz).toBe('meins')
    expect(mine.name).toBe('Meine Übung')
    expect(mine.stabilitaet).toBe(3)
    expect(mine.dehnung).toBe(3)
    expect(mine.last).toBe(3)
    expect(mine.pattern).toBe(null)
  })

  it('ergänzt neu hinzugekommene Seed-Übungen auch für Bestandsnutzer', () => {
    seedOldState()
    const f = ensureSeeded()
    expect(f.exercises.length).toBe(EXERCISE_SEED.length + 1) // + custom-1
    expect(f.exercises.some(e => e.id === 'seed-hack-squat')).toBe(true)
  })

  it('ist idempotent — überschreibt nachträgliche Rating-Edits nicht', () => {
    seedOldState()
    ensureSeeded()
    // Nutzer justiert ein Seed-Rating nach
    const f1 = loadFitness()
    saveFitness({ ...f1, exercises: f1.exercises.map(e => e.id === 'seed-bankdruecken-lh' ? { ...e, stabilitaet: 2 } : e) })
    const f2 = ensureSeeded()
    expect(f2.exercises.find(e => e.id === 'seed-bankdruecken-lh').stabilitaet).toBe(2)
  })
})
