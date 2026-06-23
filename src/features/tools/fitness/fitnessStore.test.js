import { describe, it, expect, beforeEach } from 'vitest'
import { loadFitness, saveFitness, loadSessions, saveSessions, addSession } from './fitnessStore'

beforeEach(() => localStorage.clear())

describe('fitnessStore', () => {
  it('loadFitness liefert Default-Shape bei leerem Speicher', () => {
    const f = loadFitness()
    expect(f.exercises).toEqual([])
    expect(f.plans).toEqual([])
    expect(f.settings.restTimerEnabled).toBe(true)
    expect(f.settings.restTimerSec).toBe(120)
    expect(f.meta.activePlanId).toBeNull()
  })
  it('save→load Round-Trip', () => {
    saveFitness({ exercises: [{ id: 'x' }], plans: [], settings: { restTimerEnabled: false }, meta: {} })
    expect(loadFitness().exercises).toEqual([{ id: 'x' }])
    expect(loadFitness().settings.restTimerEnabled).toBe(false)
  })
  it('addSession hängt an und persistiert', () => {
    addSession({ id: 's1', date: '2026-06-13' })
    expect(loadSessions()).toHaveLength(1)
    addSession({ id: 's2', date: '2026-06-14' })
    expect(loadSessions().map(s => s.id)).toEqual(['s1', 's2'])
  })
  it('loadFitness merged fehlende settings-Keys mit Defaults', () => {
    saveFitness({ exercises: [], plans: [], settings: { feedbackMode: 'rir' }, meta: {} })
    const f = loadFitness()
    expect(f.settings.feedbackMode).toBe('rir')
    expect(f.settings.restTimerEnabled).toBe(true) // Default ergänzt
    expect(f.settings.restTimerSec).toBe(120) // Default ergänzt
  })
  it('saveSessions überschreibt die Liste', () => {
    addSession({ id: 's1', date: '2026-06-13' })
    saveSessions([{ id: 'x', date: '2026-06-15' }])
    expect(loadSessions().map(s => s.id)).toEqual(['x'])
  })
})
