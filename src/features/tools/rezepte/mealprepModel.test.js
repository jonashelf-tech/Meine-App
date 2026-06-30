import { describe, it, expect } from 'vitest'
import {
  SLOTS, EINKAUF_KATEGORIEN,
  createZutat, createRezept, createKorb, istBasis,
  istFrisch,
} from './mealprepModel'

describe('Konstanten', () => {
  it('SLOTS sind die 4 Konfigurator-Kategorien', () => {
    expect(SLOTS).toEqual(['protein', 'kh', 'gemuese', 'sauce'])
  })
  it('Gewürze ist eine Einkaufskategorie (für Ausschluss)', () => {
    expect(EINKAUF_KATEGORIEN).toContain('Gewürze')
  })
})

describe('createZutat', () => {
  it('setzt Defaults + eigene ID', () => {
    const z = createZutat({ name: 'Reis', bausteinTyp: 'kh' })
    expect(z.id).toBeTruthy()
    expect(z.name).toBe('Reis')
    expect(z.per).toBe(100)
    expect(z.bausteinTyp).toBe('kh')
    expect(z.naehrwert).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })
  it('zwei Aufrufe → verschiedene IDs', () => {
    expect(createZutat().id).not.toBe(createZutat().id)
  })
})

describe('createRezept', () => {
  it('Defaults: leere Listen, nicht konfigurierbar, keine Basis', () => {
    const r = createRezept({ name: 'Chili' })
    expect(r.zutaten).toEqual([])
    expect(r.komponenten).toEqual([])
    expect(r.konfigurierbar).toBe(false)
    expect(r.aufbewahrung).toEqual({ tk: false, behaelter: [] })
    expect(istBasis(r)).toBe(false)
  })
  it('istBasis true wenn ergibtMenge gesetzt', () => {
    expect(istBasis(createRezept({ name: 'Tomatensoße', ergibtMenge: 2000, ergibtEinheit: 'ml' }))).toBe(true)
  })
})

describe('createKorb', () => {
  it('Defaults: leer, nicht gespeichert', () => {
    const k = createKorb()
    expect(k.eintraege).toEqual([])
    expect(k.gespeichert).toBe(false)
  })
})

describe('istFrisch — Frisch-vs-Einfrieren-Heuristik', () => {
  const zById = (id) => ({
    nudeln: { id: 'nudeln', bausteinTyp: 'kh' },
    hack:   { id: 'hack',   bausteinTyp: 'protein' },
  }[id])

  it('explizites frisch-Flag schlägt alles', () => {
    expect(istFrisch({ zutatId: 'hack', frisch: true }, zById)).toBe(true)
    expect(istFrisch({ zutatId: 'nudeln', frisch: false }, zById)).toBe(false)
  })
  it('ohne Flag: Zutat mit bausteinTyp "kh" ist Beilage → frisch', () => {
    expect(istFrisch({ zutatId: 'nudeln' }, zById)).toBe(true)
  })
  it('ohne Flag: andere Zutaten frieren ein', () => {
    expect(istFrisch({ zutatId: 'hack' }, zById)).toBe(false)
  })
  it('Komponente (Basis-Referenz) friert per Default ein', () => {
    expect(istFrisch({ rezeptId: 'sosse' }, zById)).toBe(false)
  })
})
