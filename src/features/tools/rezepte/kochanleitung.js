import { portionenSplit, istFrisch } from './mealprepModel'

// Accumulates direct (non-recursive) raw ingredient amounts for Mise-en-Place
function directRoh(rezept, skala, acc) {
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    acc[zutatId] = (acc[zutatId] ?? 0) + menge * skala
  }
}

// Sammelt Basen-Bedarf rekursiv über beliebig viele Ketten-Ebenen (uniform — kein Split).
// Eine Basis kann selbst Komponenten (tiefere Basen) haben → mehrstufige Ketten.
function sammleBasen(rezept, skala, rById, basenBedarf, miseAcc, seen) {
  directRoh(rezept, skala, miseAcc)
  for (const { rezeptId, menge } of rezept.komponenten ?? []) {
    const basis = rById(rezeptId)
    if (!basis) continue
    const mengeAbs = menge * skala
    basenBedarf[rezeptId] = (basenBedarf[rezeptId] ?? 0) + mengeAbs
    if (basis.ergibtMenge && !seen.has(rezeptId)) {
      sammleBasen(basis, mengeAbs / basis.ergibtMenge, rById, basenBedarf, miseAcc, new Set([...seen, rezeptId]))
    }
  }
}

// Kochreihenfolge: tiefste Basis zuerst (Tomatensoße vor Bolognese vor Lasagne).
function basisTiefe(id, rById, seen = new Set()) {
  const b = rById(id)
  if (!b || seen.has(id)) return 0
  const kinder = (b.komponenten ?? []).map(k => k.rezeptId).filter(rid => rById(rid)?.ergibtMenge)
  if (kinder.length === 0) return 0
  return 1 + Math.max(...kinder.map(rid => basisTiefe(rid, rById, new Set([...seen, id]))))
}

export function buildKochanleitung(korbGerichte, zById, rById) {
  const basenBedarf = {}      // basisId → summierte menge (über alle Ebenen)
  const miseAcc = {}          // zutatId → total roh menge (alle Ebenen)

  // Oberste Ebene splittet frisch/TK: Frisch-Teile (Beilage) nur für frische Portionen,
  // Einfrier-Teile für alle. Die Rekursion in eine Basis bleibt uniform (Basis friert ein).
  for (const g of korbGerichte) {
    const { frisch, total } = portionenSplit(g)
    const rezept = g.rezept
    const bp = rezept.basisPortionen || 1
    for (const line of rezept.zutaten ?? []) {
      const count = istFrisch(line, zById) ? frisch : total
      miseAcc[line.zutatId] = (miseAcc[line.zutatId] ?? 0) + line.menge * (count / bp)
    }
    for (const line of rezept.komponenten ?? []) {
      const basis = rById(line.rezeptId)
      if (!basis) continue
      const count = istFrisch(line, zById) ? frisch : total
      const mengeAbs = line.menge * (count / bp)
      basenBedarf[line.rezeptId] = (basenBedarf[line.rezeptId] ?? 0) + mengeAbs
      if (basis.ergibtMenge) {
        sammleBasen(basis, mengeAbs / basis.ergibtMenge, rById, basenBedarf, miseAcc, new Set([line.rezeptId]))
      }
    }
  }

  const basen = Object.entries(basenBedarf).map(([id, menge]) => {
    const basis = rById(id)
    if (!basis) return null
    return {
      id,
      name: basis.name,
      menge: Math.round(menge),
      einheit: basis.ergibtEinheit,
      langlaeufer: !!basis.langlaeufer,
      tiefe: basisTiefe(id, rById),
      anleitung: basis.anleitung,
    }
  }).filter(Boolean)
    // tiefste Basen zuerst kochen; bei Gleichstand Langläufer vorziehen
    .sort((a, b) => (a.tiefe - b.tiefe) || ((b.langlaeufer ? 1 : 0) - (a.langlaeufer ? 1 : 0)))

  const miseEnPlace = Object.entries(miseAcc)
    .map(([zutatId, menge]) => {
      const z = zById(zutatId)
      return { zutatId, name: z?.name ?? zutatId, menge: Math.round(menge), einheit: z?.einheit }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const gerichte = korbGerichte.map((g) => ({
    id: g.rezept.id,
    name: g.rezept.name,
    portionen: portionenSplit(g).total,
    anleitung: g.rezept.anleitung,
  }))
  const verpackung = korbGerichte.map((g) => {
    const { frisch, bloecke } = portionenSplit(g)
    return {
      name: g.rezept.name,
      tk: g.rezept.aufbewahrung?.tk ?? false,
      behaelter: g.rezept.aufbewahrung?.behaelter ?? [],
      frisch,
      bloecke,
      blockGramm: g.rezept.blockGramm ?? 250,
    }
  })

  return { miseEnPlace, basen, gerichte, verpackung }
}

// Wie oft muss jede Ketten-Basis gekocht werden? Gesamtbedarf / Ausbeute pro
// Kochgang (ergibtMenge). Für den „Tomatensoße 3× kochen"-Hinweis im
// Portionen-Schritt. Reihenfolge = Kochreihenfolge (tiefste Basis zuerst).
export function basenBatches(korbGerichte, zById, rById) {
  return buildKochanleitung(korbGerichte, zById, rById).basen
    .map(b => {
      const ausbeute = rById(b.id)?.ergibtMenge
      if (!ausbeute) return null
      return { id: b.id, name: b.name, batches: Math.max(1, Math.ceil(b.menge / ausbeute)) }
    })
    .filter(Boolean)
}
