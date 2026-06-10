import { describe, it, expect } from 'vitest'
import { sv, lv, SK } from '../../../storage'
import { loadAll, saveZutaten, saveRezepte, findUsages } from './mealprepStore'
import { SCHEMA_VERSION } from './mealprepModel'

describe('loadAll — Erststart & Schema-Schutz', () => {
  it('liefert Seed bei komplett leerem Storage und setzt Schema-Marker', () => {
    const { zutaten, rezepte, version } = loadAll()
    expect(version).toBe(SCHEMA_VERSION)
    expect(zutaten.length).toBeGreaterThan(0)   // Seed-Katalog
    expect(rezepte.length).toBeGreaterThan(0)    // Seed-Rezepte
    expect(lv(`${SK.recipes}__v`, 0)).toBe(SCHEMA_VERSION)  // Marker persistiert
  })

  it('verwirft Altdaten ohne Schema-Marker und seedet neu', () => {
    sv(SK.recipes, [{ id: 1, name: 'Alt', cookingTime: 30, tkSuitable: true }])
    const { rezepte } = loadAll()
    expect(rezepte.some(r => r.name === 'Alt')).toBe(false)
    expect(rezepte.every(r => 'kategorien' in r)).toBe(true)  // neues Schema
  })

  it('behält Daten mit aktuellem Schema-Marker', () => {
    sv(`${SK.recipes}__v`, SCHEMA_VERSION)
    saveRezepte([{ id: 'x', name: 'Mein Chili', kategorien: ['Onepot'] }])
    saveZutaten([{ id: 'z', name: 'Reis' }])
    const { rezepte, zutaten } = loadAll()
    expect(rezepte).toEqual([{ id: 'x', name: 'Mein Chili', kategorien: ['Onepot'] }])
    expect(zutaten).toEqual([{ id: 'z', name: 'Reis' }])
  })
})

describe('findUsages — Referenz-Integrität', () => {
  const rezepte = [
    { id: 'tomate', name: 'Tomatensoße', komponenten: [], zutaten: [{ zutatId: 'z1', menge: 500 }] },
    { id: 'bolo',   name: 'Bolognese',   komponenten: [{ rezeptId: 'tomate', menge: 600 }], zutaten: [] },
    { id: 'chili',  name: 'Chili',       komponenten: [{ rezeptId: 'tomate', menge: 400 }], zutaten: [] },
  ]
  const koerbe = [{ id: 'k1', name: 'Woche', eintraege: [{ ref: 'tomate', portionen: 4 }] }]

  it('findet Rezepte + Körbe, die eine Basis nutzen', () => {
    const u = findUsages('tomate', rezepte, koerbe)
    expect(u.rezepte.map(r => r.name).sort()).toEqual(['Bolognese', 'Chili'])
    expect(u.koerbe.map(k => k.name)).toEqual(['Woche'])
  })

  it('findet Rezepte, die eine Zutat nutzen', () => {
    const u = findUsages('z1', rezepte, koerbe)
    expect(u.rezepte.map(r => r.name)).toEqual(['Tomatensoße'])
  })

  it('leere Nutzung wenn nirgends referenziert', () => {
    const u = findUsages('unbenutzt', rezepte, koerbe)
    expect(u.rezepte).toEqual([])
    expect(u.koerbe).toEqual([])
  })

  it('koerbe ist optional (Default [])', () => {
    const u = findUsages('z1', rezepte)
    expect(u.rezepte.map(r => r.name)).toEqual(['Tomatensoße'])
    expect(u.koerbe).toEqual([])
  })
})
