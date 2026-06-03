import { EINKAUF_KATEGORIEN } from './mealprepModel'

// Accumulates raw ingredient amounts (zutatId → menge) recursively via Komponenten.
// skala: portions multiplier. seen: cycle protection.
export function sammleZutaten(rezept, skala, rezeptById, acc, seen = new Set()) {
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    acc[zutatId] = (acc[zutatId] ?? 0) + menge * skala
  }
  for (const { rezeptId, menge } of rezept.komponenten ?? []) {
    const basis = rezeptById(rezeptId)
    if (!basis || !basis.ergibtMenge || seen.has(basis.id)) continue
    const basisSkala = (menge * skala) / basis.ergibtMenge
    sammleZutaten(basis, basisSkala, rezeptById, acc, new Set([...seen, basis.id]))
  }
}

// korbGerichte: [{ rezept, portionen }]
// Returns: [{ kategorie, items:[{zutatId,name,menge,einheit}] }] — without Gewürze, sorted by EINKAUF_KATEGORIEN order
export function buildEinkauf(korbGerichte, zutatById, rezeptById) {
  const acc = {}
  for (const { rezept, portionen } of korbGerichte) {
    sammleZutaten(rezept, portionen / (rezept.basisPortionen || 1), rezeptById, acc)
  }
  const byKat = {}
  for (const [zutatId, menge] of Object.entries(acc)) {
    const z = zutatById(zutatId)
    if (!z) continue
    if (z.einkaufKategorie === 'Gewürze') continue
    const kat = z.einkaufKategorie || 'Sonstiges'
    ;(byKat[kat] ??= []).push({ zutatId, name: z.name, menge: Math.round(menge), einheit: z.einheit })
  }
  return EINKAUF_KATEGORIEN
    .filter(k => byKat[k] && k !== 'Gewürze')
    .map(kategorie => ({ kategorie, items: byKat[kategorie] }))
}
