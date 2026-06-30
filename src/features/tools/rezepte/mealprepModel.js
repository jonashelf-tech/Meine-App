export const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const SCHEMA_VERSION = 9   // ... 8 = Namen ohne „(Basis)", 9 = Eier in Stück (g→Stk-Migration)

export const SLOTS = ['protein', 'kh', 'gemuese', 'sauce']
export const SLOT_LABELS = { protein: 'Protein', kh: 'Kohlenhydrate', gemuese: 'Gemüse', sauce: 'Sauce' }
export const BEHAELTER = ['Box', 'Blockform', 'Glas', 'Eiswürfel', 'frisch']
export const EINKAUF_KATEGORIEN = [
  'Fleisch & Fisch', 'Milchprodukte', 'Brot & Getreide',
  'Konserven & Trockenwaren', 'Gemüse & Obst', 'Gewürze', 'Sonstiges',
]

export const createZutat = (o = {}) => ({
  id: o.id ?? genId(),
  name: o.name ?? '',
  einheit: o.einheit ?? 'g',
  einkaufKategorie: o.einkaufKategorie ?? 'Sonstiges',
  per: o.per ?? 100,
  naehrwert: o.naehrwert ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  bausteinTyp: o.bausteinTyp ?? null,
  gProPortion: o.gProPortion ?? null,
  garNotiz: o.garNotiz ?? null,
})

export const createRezept = (o = {}) => ({
  id: o.id ?? genId(),
  name: o.name ?? '',
  kategorien: o.kategorien ?? [],
  basisPortionen: o.basisPortionen ?? 4,
  aufbewahrung: o.aufbewahrung ?? { tk: false, behaelter: [] },
  langlaeufer: o.langlaeufer ?? false,
  konfigurierbar: o.konfigurierbar ?? false,
  zutaten: o.zutaten ?? [],
  komponenten: o.komponenten ?? [],
  anleitung: o.anleitung ?? '',
  ergibtMenge: o.ergibtMenge ?? null,
  ergibtEinheit: o.ergibtEinheit ?? null,
  bausteinTyp: o.bausteinTyp ?? null,
  kochdauer: o.kochdauer ?? null,   // Minuten — für Tagesplaner-Übertrag
})

export const createKorb = (o = {}) => ({
  id: o.id ?? genId(),
  name: o.name ?? '',
  eintraege: o.eintraege ?? [],
  gespeichert: o.gespeichert ?? false,
  einkaufChecked: o.einkaufChecked ?? {},  // zutatId → true (überlebt Reload beim Einkaufen)
  kochChecked: o.kochChecked ?? {},        // "mise:<zutatId>" / "<cardKey>:<zeile>" → true
})

export const istBasis = (r) => r?.ergibtMenge != null

// Frisch = wird nur für frische Portionen gekocht, nie eingefroren.
// Reihenfolge: explizites Flag > Beilage-Heuristik (Zutat bausteinTyp 'kh') > einfrieren.
export function istFrisch(komponente, zutatById) {
  if (komponente?.frisch != null) return komponente.frisch
  if (komponente?.zutatId) return zutatById?.(komponente.zutatId)?.bausteinTyp === 'kh'
  return false
}
