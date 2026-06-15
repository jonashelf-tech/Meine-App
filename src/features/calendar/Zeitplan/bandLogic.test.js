import { describe, it, expect } from 'vitest'
import { computeBands } from './bandLogic'

describe('computeBands', () => {
  it('leeres oberes/unteres Band wenn nur Kernfenster belegt', () => {
    const r = computeBands({ slots: {}, visStart: 8, visEnd: 18 })
    expect(r.topBand).toEqual({ from: 0, to: 8 })
    expect(r.bottomBand).toEqual({ from: 19, to: 24 })
    expect(r.hours).toEqual([8,9,10,11,12,13,14,15,16,17,18])
  })
  it('belegte Stunde über dem Fenster wird sichtbar, Band schrumpft', () => {
    const r = computeBands({ slots: { '6': { text: 'x' } }, visStart: 8, visEnd: 18 })
    expect(r.hours).toContain(6)
    expect(r.topBand).toEqual({ from: 0, to: 6 })
  })
  it('kein Band wenn Fenster bis Tagesrand', () => {
    const r = computeBands({ slots: {}, visStart: 0, visEnd: 23 })
    expect(r.topBand).toBeNull()
    expect(r.bottomBand).toBeNull()
  })
})
