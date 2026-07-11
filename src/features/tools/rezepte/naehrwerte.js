const ZERO = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
const add = (a, b) => { a.kcal += b.kcal; a.protein += b.protein; a.carbs += b.carbs; a.fat += b.fat; return a }
const scale = (n, f) => ({ kcal: n.kcal * f, protein: n.protein * f, carbs: n.carbs * f, fat: n.fat * f })

export function zutatNaehrwert(zutat, menge) {
  return scale(zutat.naehrwert ?? ZERO(), menge / (zutat.per || 100))
}

// Gesamt-Naehrwert eines Rezepts (nicht pro Portion). Rekursiv ueber Komponenten, Zyklenschutz.
export function rezeptNaehrwertGesamt(rezept, zutatById, rezeptById, seen = new Set()) {
  if (!rezept || seen.has(rezept.id)) return ZERO()
  // Ancestor-Pfad pro Zweig klonen statt ein global geteiltes Besuchsset zu
  // mutieren: sonst zählt eine Basis, die in zwei Geschwister-Komponenten steckt
  // (Diamant, z.B. zwei Bowls mit derselben Sosse), nur einmal statt doppelt und
  // der Gesamt-Nährwert wird zu niedrig. Klonen schützt weiter vor echten Zyklen
  // (gleiches Muster wie sammleZutaten in einkauf.js).
  const childSeen = rezept.id != null ? new Set(seen).add(rezept.id) : seen
  const sum = ZERO()
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    const z = zutatById(zutatId)
    if (z) add(sum, zutatNaehrwert(z, menge))
  }
  for (const { rezeptId, menge } of rezept.komponenten ?? []) {
    const basis = rezeptById(rezeptId)
    if (!basis || !basis.ergibtMenge) continue
    const gesamt = rezeptNaehrwertGesamt(basis, zutatById, rezeptById, childSeen)
    add(sum, scale(gesamt, menge / basis.ergibtMenge))
  }
  return sum
}

export function rezeptProPortion(rezept, zutatById, rezeptById) {
  const g = rezeptNaehrwertGesamt(rezept, zutatById, rezeptById)
  const p = rezept.basisPortionen || 1
  return scale(g, 1 / p)
}

export const formatNaehrwert = (n) =>
  `${Math.round(n.kcal)} · ${Math.round(n.protein)}P ${Math.round(n.fat)}F ${Math.round(n.carbs)}KH`
