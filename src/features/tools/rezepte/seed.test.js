import { describe, it, expect } from 'vitest'
import { seedZutaten, seedRezepte } from './seed'
import { rezeptNaehrwertGesamt } from './naehrwerte'

describe('Seed-Integritaet', () => {
  const zutaten = seedZutaten()
  const rezepte = seedRezepte()
  const zById = (id) => zutaten.find(z => z.id === id)
  const rById = (id) => rezepte.find(r => r.id === id)

  it('jeder Slot hat mindestens 3 Bausteine', () => {
    for (const slot of ['protein', 'kh', 'gemuese', 'sauce']) {
      expect(zutaten.filter(z => z.bausteinTyp === slot).length).toBeGreaterThanOrEqual(3)
    }
  })
  it('alle Komponenten-Referenzen zeigen auf existierende Rezepte', () => {
    for (const r of rezepte) {
      for (const k of r.komponenten ?? []) expect(rById(k.rezeptId)).toBeTruthy()
    }
  })
  it('alle Zutaten-Referenzen zeigen auf existierende Zutaten', () => {
    for (const r of rezepte) {
      for (const z of r.zutaten ?? []) expect(zById(z.zutatId)).toBeTruthy()
    }
  })
  it('mindestens 1 Basis + 1 konfigurierbares Rezept', () => {
    expect(rezepte.some(r => r.ergibtMenge != null)).toBe(true)
    expect(rezepte.some(r => r.konfigurierbar)).toBe(true)
  })
  it('Naehrwert-Berechnung wirft bei keinem Seed-Rezept', () => {
    for (const r of rezepte) expect(() => rezeptNaehrwertGesamt(r, zById, rById)).not.toThrow()
  })
})
