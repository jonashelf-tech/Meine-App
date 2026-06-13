import { describe, it, expect } from 'vitest'
import { getToolDots } from './kalenderShared'

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
