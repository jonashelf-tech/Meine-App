import { describe, it, expect } from 'vitest'
import { trainingDayStatus } from './fitnessLogic'

const s = (...dates) => dates.map(date => ({ date }))

describe('trainingDayStatus (2-on-1-off)', () => {
  const r = { on: 2, off: 1 }

  it('kein Rhythmus → kein Hinweis', () => {
    expect(trainingDayStatus(null, s('2026-06-10'), '2026-06-12')).toBe(null)
  })
  it('heute bereits trainiert → done', () => {
    expect(trainingDayStatus(r, s('2026-06-12'), '2026-06-12')).toEqual({ kind: 'done' })
  })
  it('ohne Historie → train', () => {
    expect(trainingDayStatus(r, [], '2026-06-12')).toEqual({ kind: 'train' })
  })
  it('nach 2 Trainingstagen am Stück → rest', () => {
    expect(trainingDayStatus(r, s('2026-06-10', '2026-06-11'), '2026-06-12')).toEqual({ kind: 'rest' })
  })
  it('Pause aufgebraucht → wieder train', () => {
    // Mo+Di trainiert, Mi Pause, Do (heute)
    expect(trainingDayStatus(r, s('2026-06-08', '2026-06-09'), '2026-06-11')).toEqual({ kind: 'train' })
  })
  it('erst 1 Trainingstag → weiter train (on noch nicht erreicht)', () => {
    expect(trainingDayStatus(r, s('2026-06-11'), '2026-06-12')).toEqual({ kind: 'train' })
  })
  it('verschoben: langes Loch → train (selbst-korrigierend)', () => {
    expect(trainingDayStatus(r, s('2026-06-01', '2026-06-02'), '2026-06-12')).toEqual({ kind: 'train' })
  })
})
