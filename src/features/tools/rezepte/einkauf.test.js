import { describe, it, expect } from 'vitest'
import { sammleZutaten, buildEinkauf } from './einkauf'

const ZUTATEN = {
  hack:   { id: 'hack',   name: 'Hack',         einheit: 'g', einkaufKategorie: 'Fleisch & Fisch' },
  tomate: { id: 'tomate', name: 'Dosentomaten', einheit: 'g', einkaufKategorie: 'Konserven & Trockenwaren' },
  salz:   { id: 'salz',   name: 'Salz',         einheit: 'g', einkaufKategorie: 'Gewürze' },
}
const zById = (id) => ZUTATEN[id]
const SOSSE = { id: 'sosse', basisPortionen: 8, ergibtMenge: 1000, zutaten: [{ zutatId: 'tomate', menge: 1000 }, { zutatId: 'salz', menge: 10 }], komponenten: [] }
const rById = (id) => (id === 'sosse' ? SOSSE : null)

describe('sammleZutaten — rekursive Basen-Aufloesung', () => {
  it('Ableitung mit Komponente loest Basis in Roh-Zutaten auf', () => {
    const bolo = { id: 'bolo', basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }], komponenten: [{ rezeptId: 'sosse', menge: 500 }] }
    const acc = {}
    sammleZutaten(bolo, 1, rById, acc)
    expect(acc.hack).toBe(400)
    // 500 ml von 1000-ml-Basis = halbe Basis-Zutaten: 500 g Tomate, 5 g Salz
    expect(acc.tomate).toBe(500)
    expect(acc.salz).toBe(5)
  })
  it('skaliert mit Portionsfaktor', () => {
    const r = { id: 'r', basisPortionen: 2, zutaten: [{ zutatId: 'hack', menge: 200 }], komponenten: [] }
    const acc = {}
    sammleZutaten(r, 2, rById, acc)
    expect(acc.hack).toBe(400)
  })
})

describe('buildEinkauf — konsolidieren, Gewuerze raus, gruppieren', () => {
  it('summiert gleiche Zutat, gruppiert, klaemmert Gewuerze aus', () => {
    const korbGerichte = [
      { rezept: { basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }], komponenten: [] }, portionen: 4 },
      { rezept: { basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }, { zutatId: 'salz', menge: 8 }], komponenten: [] }, portionen: 8 },
    ]
    const liste = buildEinkauf(korbGerichte, zById, rById)
    const fleisch = liste.find(g => g.kategorie === 'Fleisch & Fisch')
    expect(fleisch.items[0]).toMatchObject({ name: 'Hack', menge: 1200, einheit: 'g' })
    expect(liste.some(g => g.kategorie === 'Gewürze')).toBe(false)
  })
})
