import { describe, it, expect } from 'vitest'
import { getFixedEntries, isDayComplete } from './fokusLogic'

describe('getFixedEntries', () => {
  it('liefert belegte Slots chronologisch nach Slot-Zeit', () => {
    const slots = {
      '14':  { text: 'Zahnarzt', done: false },
      '9.5': { text: 'Doku',     done: false },
    }
    const out = getFixedEntries(slots).map(e => e.slotKey)
    expect(out).toEqual(['9.5', '14'])
  })

  it('ignoriert leere Slot-Werte', () => {
    const slots = { '9': null, '10': { text: 'X', done: false } }
    expect(getFixedEntries(slots).map(e => e.slotKey)).toEqual(['10'])
  })
})

describe('isDayComplete', () => {
  it('true wenn alle festen + alle freien erledigt und mindestens eins existiert', () => {
    const fixed = [{ slotKey: '9', slot: { done: true } }]
    const free  = [{ id: 'a', done: true }]
    expect(isDayComplete(fixed, free)).toBe(true)
  })

  it('false wenn noch etwas offen ist', () => {
    const fixed = [{ slotKey: '9', slot: { done: false } }]
    expect(isDayComplete(fixed, [])).toBe(false)
  })

  it('false wenn gar nichts da ist (kein falscher Jubel bei leerem Tag)', () => {
    expect(isDayComplete([], [])).toBe(false)
  })
})
