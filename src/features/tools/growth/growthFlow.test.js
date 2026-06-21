import { describe, it, expect } from 'vitest'
import { growthViewMode, flowSteps } from './growthFlow'
import { emptyDay } from './growthStore'

const T = '2026-06-21'

describe('growthViewMode', () => {
  it('frischer heutiger Tag (kein Eintrag, kein Flag) → flow', () => {
    const data = { days: { [T]: { ...emptyDay(), tageskarteId: 'MK01', karten: [{ kartenId: 'MK01', antwort: '', erledigt: false }] } } }
    expect(growthViewMode(data, T, T)).toBe('flow')
  })

  it('heutiger Tag mit Eintrag → overview', () => {
    const data = { days: { [T]: { ...emptyDay(), freitext: 'x' } } }
    expect(growthViewMode(data, T, T)).toBe('overview')
  })

  it('heutiger Tag mit flowAbgeschlossen → overview', () => {
    const data = { days: { [T]: { ...emptyDay(), flowAbgeschlossen: true } } }
    expect(growthViewMode(data, T, T)).toBe('overview')
  })

  it('vergangener Tag → overview', () => {
    const data = { days: {} }
    expect(growthViewMode(data, '2026-06-19', T)).toBe('overview')
  })
})

describe('flowSteps', () => {
  it('mit Tageskarte → ankommen, karte, freitext', () => {
    const data = { days: { [T]: { ...emptyDay(), tageskarteId: 'MK01' } } }
    expect(flowSteps(data, T)).toEqual(['ankommen', 'karte', 'freitext'])
  })

  it('ohne Tageskarte (Pool leer) → ankommen, freitext', () => {
    const data = { days: { [T]: { ...emptyDay() } } }
    expect(flowSteps(data, T)).toEqual(['ankommen', 'freitext'])
  })
})
