import { describe, it, expect } from 'vitest'
import { zutatNaehrwert, rezeptNaehrwertGesamt, rezeptProPortion, formatNaehrwert } from './naehrwerte'

const ZUTATEN = {
  reis:   { id: 'reis',   per: 100, naehrwert: { kcal: 350, protein: 7, carbs: 78, fat: 1 } },
  tomate: { id: 'tomate', per: 100, naehrwert: { kcal: 20,  protein: 1, carbs: 4,  fat: 0 } },
  hack:   { id: 'hack',   per: 100, naehrwert: { kcal: 200, protein: 18, carbs: 0, fat: 14 } },
}
const zById = (id) => ZUTATEN[id]

describe('zutatNaehrwert — skaliert auf Menge', () => {
  it('200 g Reis = 2x per-100-Wert', () => {
    expect(zutatNaehrwert(ZUTATEN.reis, 200)).toEqual({ kcal: 700, protein: 14, carbs: 156, fat: 2 })
  })
})

describe('rezeptNaehrwertGesamt — Zutaten + Komponenten rekursiv', () => {
  const basis = { id: 'sosse', basisPortionen: 1, ergibtMenge: 1000, ergibtEinheit: 'ml',
                  zutaten: [{ zutatId: 'tomate', menge: 1000 }], komponenten: [] }
  const rById = (id) => (id === 'sosse' ? basis : null)

  it('summiert rohe Zutaten', () => {
    const r = { basisPortionen: 1, zutaten: [{ zutatId: 'reis', menge: 100 }], komponenten: [] }
    expect(rezeptNaehrwertGesamt(r, zById, rById)).toEqual({ kcal: 350, protein: 7, carbs: 78, fat: 1 })
  })

  it('loest Komponente anteilig auf (500 ml von 1000-ml-Basis = halber Naehrwert)', () => {
    const r = { basisPortionen: 1, zutaten: [], komponenten: [{ rezeptId: 'sosse', menge: 500 }] }
    // Basis-Gesamt: 1000 g Tomate = 10x per-100 = {200,10,40,0}; davon 500/1000 = Haelfte
    expect(rezeptNaehrwertGesamt(r, zById, rById)).toEqual({ kcal: 100, protein: 5, carbs: 20, fat: 0 })
  })

  it('Zyklus bricht ab statt Endlosschleife', () => {
    const a = { id: 'a', basisPortionen: 1, ergibtMenge: 100, zutaten: [], komponenten: [{ rezeptId: 'a', menge: 50 }] }
    const rec = (id) => (id === 'a' ? a : null)
    expect(() => rezeptNaehrwertGesamt(a, zById, rec)).not.toThrow()
  })
})

describe('rezeptProPortion + format', () => {
  it('teilt durch basisPortionen', () => {
    const r = { basisPortionen: 2, zutaten: [{ zutatId: 'hack', menge: 200 }], komponenten: [] }
    expect(rezeptProPortion(r, zById, () => null)).toEqual({ kcal: 200, protein: 18, carbs: 0, fat: 14 })
  })
  it('formatiert als "kcal - NP NF NKH"', () => {
    expect(formatNaehrwert({ kcal: 480.4, protein: 35, carbs: 38, fat: 22 })).toBe('480 · 35P 22F 38KH')
  })
})
