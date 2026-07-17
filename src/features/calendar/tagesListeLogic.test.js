import { describe, it, expect } from 'vitest'
import { rankOf, insertRank } from './tagesListeLogic'

describe('rankOf', () => {
  it('Slot: Rang ist die Dezimalstunde des Slot-Keys', () => {
    expect(rankOf({ kind: 'slot', slotKey: '9.5' })).toBe(9.5)
  })

  it('Blocker: Rang ist die Startstunde', () => {
    expect(rankOf({ kind: 'band', blocker: { startHour: 9, endHour: 17 } })).toBe(9)
  })

  it('Todo: Rang ist dayRank', () => {
    expect(rankOf({ kind: 'todo', todo: { dayRank: 12 } })).toBe(12)
  })

  it('Todo ohne dayRank landet am Tagesende (24), nicht bei 0', () => {
    expect(rankOf({ kind: 'todo', todo: { dayRank: null } })).toBe(24)
  })
})

describe('insertRank', () => {
  it('zwischen zwei Nachbarn: die Mitte', () => {
    expect(insertRank(10, 14)).toBe(12)
  })

  it('ganz oben (kein Vorgänger): vor den ersten', () => {
    expect(insertRank(null, 9)).toBe(8.5)
  })

  it('ganz unten (kein Nachfolger): hinter den letzten', () => {
    expect(insertRank(17, null)).toBe(17.5)
  })

  it('leere Liste: Tagesmitte', () => {
    expect(insertRank(null, null)).toBe(12)
  })

  it('darf über 24 hinaus — der Rang sortiert nur, er ist keine Uhrzeit', () => {
    expect(insertRank(24, null)).toBe(24.5)
  })
})
