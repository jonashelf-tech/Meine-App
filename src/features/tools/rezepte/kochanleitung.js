// Accumulates direct (non-recursive) raw ingredient amounts for Mise-en-Place
function directRoh(rezept, skala, acc) {
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    acc[zutatId] = (acc[zutatId] ?? 0) + menge * skala
  }
}

// Sammelt Basen-Bedarf rekursiv über beliebig viele Ketten-Ebenen.
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

  for (const { rezept, portionen } of korbGerichte) {
    const skala = portionen / (rezept.basisPortionen || 1)
    sammleBasen(rezept, skala, rById, basenBedarf, miseAcc, new Set())
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

  const gerichte = korbGerichte.map(({ rezept, portionen }) => ({
    id: rezept.id,
    name: rezept.name,
    portionen,
    anleitung: rezept.anleitung,
  }))
  const verpackung = korbGerichte.map(({ rezept }) => ({
    name: rezept.name,
    tk: rezept.aufbewahrung?.tk ?? false,
    behaelter: rezept.aufbewahrung?.behaelter ?? [],
  }))

  return { miseEnPlace, basen, gerichte, verpackung }
}
