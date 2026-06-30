import { describe, it, expect } from 'vitest'
import { buildKochanleitung } from './kochanleitung'

const SOSSE = { id: 'sosse', name: 'Tomatensosse', basisPortionen: 8, ergibtMenge: 1000, langlaeufer: true,
                zutaten: [{ zutatId: 'tomate', menge: 1000 }], komponenten: [], anleitung: 'koecheln' }
const ZB = {
  tomate: { id: 'tomate', name: 'Dosentomaten', einheit: 'g' },
  hack:   { id: 'hack',   name: 'Hack', einheit: 'g' },
}
const zById = (id) => ZB[id]
const rById = (id) => (id === 'sosse' ? SOSSE : null)

describe('buildKochanleitung', () => {
  const bolo  = { id: 'bolo',  name: 'Bolognese', basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }], komponenten: [{ rezeptId: 'sosse', menge: 500 }], anleitung: 'Hack braten', aufbewahrung: { tk: true, behaelter: ['Box'] } }
  const chili = { id: 'chili', name: 'Chili',     basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }], komponenten: [{ rezeptId: 'sosse', menge: 500 }], anleitung: 'Hack braten', aufbewahrung: { tk: true, behaelter: ['Glas'] } }
  const korbGerichte = [{ rezept: bolo, portionen: 4 }, { rezept: chili, portionen: 4 }]

  it('geteilte Basis erscheint genau 1x mit summierter Menge', () => {
    const plan = buildKochanleitung(korbGerichte, zById, rById)
    const sosseSteps = plan.basen.filter(b => b.id === 'sosse')
    expect(sosseSteps).toHaveLength(1)
    expect(sosseSteps[0].menge).toBe(1000)   // 500 + 500
  })
  it('Mise-en-Place buendelt gleiche Roh-Zutat ueber Gerichte', () => {
    const plan = buildKochanleitung(korbGerichte, zById, rById)
    const hack = plan.miseEnPlace.find(m => m.name === 'Hack')
    expect(hack.menge).toBe(800)   // 400 + 400
  })
  it('Verpackung listet pro Gericht die Behaelter', () => {
    const plan = buildKochanleitung(korbGerichte, zById, rById)
    expect(plan.verpackung.map(v => v.name)).toEqual(['Bolognese', 'Chili'])
    expect(plan.verpackung[0].behaelter).toEqual(['Box'])
  })
  it('Verpackung trägt Frisch/TK-Blöcke + Blockgröße (Einblocken)', () => {
    const plan = buildKochanleitung([{ rezept: bolo, frisch: 2, bloecke: 4 }], zById, rById)
    const v = plan.verpackung[0]
    expect(v.bloecke).toBe(4)
    expect(v.frisch).toBe(2)
    expect(v.blockGramm).toBe(250)   // Default, da bolo kein blockGramm hat
  })

  it('Frisch/TK-Split: Beilage zählt in der Mise nur für frische Portionen', () => {
    const ZB2 = {
      nudeln: { id: 'nudeln', name: 'Nudeln', einheit: 'g', bausteinTyp: 'kh' },
      hack:   { id: 'hack',   name: 'Hack',   einheit: 'g', bausteinTyp: 'protein' },
    }
    const zb = (id) => ZB2[id]
    const gericht = { id: 'g', name: 'Nudeln Bolo', basisPortionen: 4,
      zutaten: [{ zutatId: 'hack', menge: 400 }, { zutatId: 'nudeln', menge: 500 }],
      komponenten: [], anleitung: '', aufbewahrung: { tk: true, behaelter: ['Box'] } }
    // 2 frisch + 4 TK = total 6
    const plan = buildKochanleitung([{ rezept: gericht, frisch: 2, bloecke: 4 }], zb, () => null)
    const nudeln = plan.miseEnPlace.find(m => m.name === 'Nudeln')
    const hack   = plan.miseEnPlace.find(m => m.name === 'Hack')
    expect(nudeln.menge).toBe(250)   // 500 * (2/4) — nur frische, wie im Einkauf
    expect(hack.menge).toBe(600)     // 400 * (6/4) — friert ein, alle 6
  })

  it('mehrstufige Kette: tiefere Basis erscheint und wird zuerst gekocht', () => {
    // Lasagne → Bolognese (Zwischen-Basis) → Tomatensosse
    const boloBasis = { id: 'bolobasis', name: 'Bolognese', basisPortionen: 5, ergibtMenge: 1000, langlaeufer: true,
                        zutaten: [{ zutatId: 'hack', menge: 500 }], komponenten: [{ rezeptId: 'sosse', menge: 500 }], anleitung: '' }
    const lasagne = { id: 'las', name: 'Lasagne', basisPortionen: 6, zutaten: [],
                      komponenten: [{ rezeptId: 'bolobasis', menge: 1000 }], anleitung: '', aufbewahrung: { tk: true, behaelter: ['Box'] } }
    const rById2 = (id) => (id === 'sosse' ? SOSSE : id === 'bolobasis' ? boloBasis : id === 'las' ? lasagne : null)
    const plan = buildKochanleitung([{ rezept: lasagne, portionen: 6 }], zById, rById2)
    const ids = plan.basen.map(b => b.id)
    expect(ids).toContain('bolobasis')
    expect(ids).toContain('sosse')                                  // tiefere Basis auch dabei
    expect(ids.indexOf('sosse')).toBeLessThan(ids.indexOf('bolobasis'))  // zuerst kochen
  })
})
