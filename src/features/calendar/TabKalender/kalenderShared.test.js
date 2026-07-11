import { describe, it, expect } from 'vitest'
import { getToolDots, blocksOverlap } from './kalenderShared'
import { dateKey, getDurationKeys } from '../../../utils'

describe('getToolDots — fitness', () => {
  const todos = [], days = {}, toolColors = {}, active = ['fitness']
  it('Dot bei Gewichtseintrag', () => {
    const dots = getToolDots('2026-06-13', todos, active, [{ date: '2026-06-13', kg: 80 }], days, toolColors, null, [])
    expect(dots.some(d => d.id === 'fitness')).toBe(true)
  })
  it('Dot bei Session ohne Gewichtseintrag', () => {
    const dots = getToolDots('2026-06-13', todos, active, [], days, toolColors, null, [{ date: '2026-06-13' }])
    expect(dots.some(d => d.id === 'fitness')).toBe(true)
  })
  it('kein Dot wenn weder noch', () => {
    const dots = getToolDots('2026-06-13', todos, active, [], days, toolColors, null, [])
    expect(dots.some(d => d.id === 'fitness')).toBe(false)
  })
})

describe('getToolDots — haushalt-Punkt am lokalen Erstelltag', () => {
  it('setzt den Punkt am LOKALEN Tag, auch wenn createdAt (UTC) auf den Vortag fällt', () => {
    // In UTC+X fällt lokal 00:30 in der ISO-Form auf den Vortag; der Punkt muss
    // trotzdem am lokalen Tag erscheinen (Regression gegen createdAt.startsWith(dk)).
    const created = new Date(2026, 5, 13, 0, 30)
    const dk = dateKey(created)
    const todos = [{ toolId: 'haushalt', createdAt: created.toISOString() }]
    const dots = getToolDots(dk, todos, ['haushalt'], [], {}, {}, null, [])
    expect(dots.some(d => d.id === 'haushalt')).toBe(true)
  })
})

describe('blocksOverlap — Dauer-Klemmung', () => {
  it('erkennt echte Überlappung und lässt benachbarte Blöcke frei', () => {
    expect(blocksOverlap(14, 60, 14.5, 30)).toBe(true)   // 14:00–15:00 vs 14:30–15:00
    expect(blocksOverlap(14, 30, 14.5, 30)).toBe(false)  // 14:00–14:30 vs 14:30–15:00
  })
  it('negative Dauer invertiert die Prüfung nicht (auf ≥1 min geklemmt)', () => {
    // Ungeklemmt ergäbe end1 = 14 + (-60/60) = 13 → Kollision am selben Start unerkannt.
    expect(blocksOverlap(14, -60, 14, 30)).toBe(true)
  })
})

describe('getDurationKeys — Mindest-Slot', () => {
  it('30-min-Block belegt genau seinen Start-Slot', () => {
    expect(getDurationKeys('14', 30)).toEqual(['14'])
    expect(getDurationKeys('14', 60)).toEqual(['14', '14.5'])
  })
  it('0/negative Dauer belegt trotzdem den Start-Slot statt []', () => {
    expect(getDurationKeys('14', 0)).toEqual(['14'])
    expect(getDurationKeys('14', -60)).toEqual(['14'])
  })
})
