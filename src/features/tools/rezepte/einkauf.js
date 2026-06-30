import { EINKAUF_KATEGORIEN, istFrisch, portionenSplit } from './mealprepModel'

// Akkumuliert Roh-Zutaten (zutatId → menge) rekursiv über Komponenten.
// skala: Portionsfaktor. seen: Zyklenschutz. Uniform — kein Frisch/TK-Split.
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

// Wie sammleZutaten, aber je Top-Level-Komponente entschieden:
// Frisch-Teile zählen nur für frische Portionen (frischP),
// Einfrier-Teile für alle (totalP). Die Rekursion in eine Basis bleibt uniform.
export function sammleZutatenGesplittet(rezept, frischP, totalP, zutatById, rezeptById, acc) {
  const bp = rezept.basisPortionen || 1
  for (const line of rezept.zutaten ?? []) {
    const count = istFrisch(line, zutatById) ? frischP : totalP
    acc[line.zutatId] = (acc[line.zutatId] ?? 0) + line.menge * (count / bp)
  }
  for (const line of rezept.komponenten ?? []) {
    const basis = rezeptById(line.rezeptId)
    if (!basis || !basis.ergibtMenge) continue
    const count = istFrisch(line, zutatById) ? frischP : totalP
    const basisSkala = (line.menge * (count / bp)) / basis.ergibtMenge
    sammleZutaten(basis, basisSkala, rezeptById, acc, new Set([basis.id]))
  }
}

// korbGerichte: [{ rezept, frisch, bloecke }] (oder Alt-Format { rezept, portionen }).
// Returns: [{ kategorie, items:[{zutatId,name,menge,einheit}] }] — ohne Gewürze, sortiert nach EINKAUF_KATEGORIEN.
export function buildEinkauf(korbGerichte, zutatById, rezeptById) {
  const acc = {}
  for (const g of korbGerichte) {
    const { frisch, total } = portionenSplit(g)
    sammleZutatenGesplittet(g.rezept, frisch, total, zutatById, rezeptById, acc)
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
