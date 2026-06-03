// Accumulates direct (non-recursive) raw ingredient amounts for Mise-en-Place
function directRoh(rezept, skala, acc) {
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    acc[zutatId] = (acc[zutatId] ?? 0) + menge * skala
  }
}

export function buildKochanleitung(korbGerichte, zutatById, rezeptById) {
  const basenBedarf = {}      // basisId → summierte menge
  const miseAcc = {}          // zutatId → total menge (direct roh from all gerichte + basen)

  for (const { rezept, portionen } of korbGerichte) {
    const skala = portionen / (rezept.basisPortionen || 1)
    directRoh(rezept, skala, miseAcc)
    for (const { rezeptId, menge } of rezept.komponenten ?? []) {
      const basis = rezeptById(rezeptId)
      if (!basis) continue
      basenBedarf[rezeptId] = (basenBedarf[rezeptId] ?? 0) + menge * skala
    }
  }

  // Include Basis raw ingredients in Mise-en-Place (scaled to combined need)
  const basen = Object.entries(basenBedarf).map(([id, menge]) => {
    const basis = rezeptById(id)
    if (!basis) return null
    const bSkala = basis.ergibtMenge ? menge / basis.ergibtMenge : 0
    directRoh(basis, bSkala, miseAcc)
    return {
      id,
      name: basis.name,
      menge: Math.round(menge),
      einheit: basis.ergibtEinheit,
      langlaeufer: !!basis.langlaeufer,
      anleitung: basis.anleitung,
    }
  }).filter(Boolean).sort((a, b) => (b.langlaeufer ? 1 : 0) - (a.langlaeufer ? 1 : 0))

  const miseEnPlace = Object.entries(miseAcc)
    .map(([zutatId, menge]) => {
      const z = zutatById(zutatId)
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
