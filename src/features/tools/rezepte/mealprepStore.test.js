import { describe, it, expect } from 'vitest'
import { sv, lv, SK } from '../../../storage'
import { loadAll, saveZutaten, saveRezepte } from './mealprepStore'
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
