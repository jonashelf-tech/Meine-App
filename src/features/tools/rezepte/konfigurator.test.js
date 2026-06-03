import { describe, it, expect } from 'vitest'
import { verteilePortionen, rezeptAusKonfig, konfigAusRezept } from './konfigurator'

describe('verteilePortionen — gleichmaessig mit Rest', () => {
  it('10 auf 3 → [4,3,3]', () => expect(verteilePortionen(3, 10)).toEqual([4, 3, 3]))
  it('8 auf 2 → [4,4]',  () => expect(verteilePortionen(2, 8)).toEqual([4, 4]))
  it('0 aktive → []',    () => expect(verteilePortionen(0, 10)).toEqual([]))
})

describe('rezeptAusKonfig — Slots → Rezept', () => {
  it('rohe Bausteine → zutaten, Basen → komponenten, menge = gProPortion×anteil', () => {
    const slots = {
      protein: [{ id: 'z_hack', istRezept: false, gProPortion: 150, anteilPortionen: 4 }],
      kh:      [{ id: 'z_reis', istRezept: false, gProPortion: 80,  anteilPortionen: 4 }],
      sauce:   [{ id: 'r_tomatensauce', istRezept: true, gProPortion: 100, anteilPortionen: 4 }],
      gemuese: [],
    }
    const r = rezeptAusKonfig(slots, 4, 'Test-Bowl', ['Bowls'])
    expect(r.konfigurierbar).toBe(true)
    expect(r.basisPortionen).toBe(4)
    expect(r.kategorien).toEqual(['Bowls'])
    expect(r.zutaten).toContainEqual({ zutatId: 'z_hack', menge: 600 })
    expect(r.zutaten).toContainEqual({ zutatId: 'z_reis', menge: 320 })
    expect(r.komponenten).toContainEqual({ rezeptId: 'r_tomatensauce', menge: 400 })
  })
})

describe('konfigAusRezept — Rezept → Slots (Rekonstruktion)', () => {
  it('gProPortion = menge / basisPortionen, Slot aus bausteinTyp', () => {
    const rezept = {
      basisPortionen: 4,
      zutaten: [{ zutatId: 'z_reis', menge: 320 }],
      komponenten: [{ rezeptId: 'r_tomatensauce', menge: 400 }]
    }
    const zById = (id) => ({ id, bausteinTyp: 'kh' })
    const rById = (id) => ({ id, bausteinTyp: 'sauce' })
    const slots = konfigAusRezept(rezept, zById, rById)
    expect(slots.kh[0]).toMatchObject({ id: 'z_reis', gProPortion: 80, anteilPortionen: 4, istRezept: false })
    expect(slots.sauce[0]).toMatchObject({ id: 'r_tomatensauce', gProPortion: 100, anteilPortionen: 4, istRezept: true })
  })
})
