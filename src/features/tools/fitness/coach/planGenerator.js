import { VOLUME_REF, AMBITION_LEVELS, SESSION_SET_BUDGET, MAX_EXERCISES_PER_SESSION, REP_PREF, ZIEL_RIR, DEFAULT_INCREMENTS, createPlan, createPlanDay } from '../fitnessModel'
import { e1rmSeries, roundToIncrement, muscleContribution } from '../fitnessLogic'

const OBER  = ['brust','ruecken','schulterVorne','schulterSeitlich','schulterHinten','bizeps','trizeps']
const UNTER = ['quadrizeps','hamstrings','gluteus','waden','bauch']
const PUSH  = ['brust','schulterVorne','schulterSeitlich','trizeps']
const PULL  = ['ruecken','schulterHinten','bizeps','trapez']
const BEINE = ['quadrizeps','hamstrings','gluteus','waden']
const GANZ  = ['brust','ruecken','schulterSeitlich','quadrizeps','hamstrings','gluteus','bizeps','trizeps','bauch']
const ARME  = ['bizeps','trizeps','schulterSeitlich','schulterHinten']
// 4er-Split
const BRUST_TAG    = ['brust','trizeps']
const RUECKEN_TAG  = ['ruecken','bizeps','trapez']
const SCHULTER_ARME = ['schulterVorne','schulterSeitlich','schulterHinten','bizeps','trizeps']
const BEINE_BAUCH  = ['quadrizeps','hamstrings','gluteus','waden','bauch']
// Arnold
const BRUST_RUECKEN  = ['brust','ruecken','schulterHinten']
const SCHULTER_ARME_A = ['schulterVorne','schulterSeitlich','bizeps','trizeps']
// Push/Pull mit verteilten Beinen (Push = Quad-dominant, Pull = Hüft-/Posterior)
const PUSH_BEINE = ['brust','schulterVorne','schulterSeitlich','trizeps','quadrizeps','waden','bauch']
const PULL_BEINE = ['ruecken','schulterHinten','bizeps','trapez','hamstrings','gluteus']

const day = (name, muscles) => ({ name, muscles })

// Übungsauswahl & Satz-Verteilung (in REALEN Sätzen, inkl. indirektem Volumen)
const MIN_ADD = 2           // Muskel braucht ≥ so viele reale Restsätze für (noch) eine Übung
const SPLIT_MIN = 3         // zweite Übung nur, wenn danach noch ≥ so viel real fehlt
const PRIO_RANK = { high: 0, normal: 1, low: 2 }

// Split-Katalog: pro Größe mehrere Varianten, genau eine `recommended`.
export const SPLIT_CATALOG = {
  2: [
    { id: 'ganz2', name: 'Ganzkörper A/B', recommended: true,
      days: [day('Ganzkörper A', GANZ), day('Ganzkörper B', GANZ)] },
    { id: 'ul2', name: 'Oberkörper / Unterkörper', recommended: false,
      days: [day('Oberkörper', OBER), day('Unterkörper', UNTER)] },
    { id: 'pushPullBeine2', name: 'Push / Pull (mit Beinen)', recommended: false,
      days: [day('Push + Beine', PUSH_BEINE), day('Pull + Beine', PULL_BEINE)] },
  ],
  3: [
    { id: 'ulg3', name: 'Ober / Unter / Ganzkörper', recommended: true,
      days: [day('Oberkörper', OBER), day('Unterkörper', UNTER), day('Ganzkörper', GANZ)] },
    { id: 'ppl3', name: 'Push / Pull / Beine', recommended: false,
      days: [day('Push', PUSH), day('Pull', PULL), day('Beine', BEINE)] },
    { id: 'ganz3', name: 'Ganzkörper ×3', recommended: false,
      days: [day('Ganzkörper A', GANZ), day('Ganzkörper B', GANZ), day('Ganzkörper C', GANZ)] },
  ],
  4: [
    { id: 'ul4', name: 'Oberkörper / Unterkörper ×2', recommended: true,
      days: [day('Oberkörper A', OBER), day('Unterkörper A', UNTER), day('Oberkörper B', OBER), day('Unterkörper B', UNTER)] },
    { id: 'pfpf4', name: 'Push / Fullbody / Pull / Fullbody', recommended: false,
      days: [day('Push', PUSH), day('Ganzkörper A', GANZ), day('Pull', PULL), day('Ganzkörper B', GANZ)] },
    { id: 'split4', name: '4er-Split', recommended: false,
      days: [day('Brust', BRUST_TAG), day('Rücken', RUECKEN_TAG), day('Schulter & Arme', SCHULTER_ARME), day('Beine', BEINE_BAUCH)] },
  ],
  5: [
    { id: 'ulppl5', name: 'Ober / Unter / Push / Pull / Beine', recommended: true,
      days: [day('Oberkörper', OBER), day('Unterkörper', UNTER), day('Push', PUSH), day('Pull', PULL), day('Beine', BEINE)] },
    { id: 'ula5', name: 'Ober / Unter ×2 + Arme & Schultern', recommended: false,
      days: [day('Oberkörper A', OBER), day('Unterkörper A', UNTER), day('Oberkörper B', OBER), day('Unterkörper B', UNTER), day('Arme & Schultern', ARME)] },
  ],
  6: [
    { id: 'ppl6', name: 'Push / Pull / Beine ×2', recommended: true,
      days: [day('Push A', PUSH), day('Pull A', PULL), day('Beine A', BEINE), day('Push B', PUSH), day('Pull B', PULL), day('Beine B', BEINE)] },
    { id: 'arnold6', name: 'Arnold-Split', recommended: false,
      days: [day('Brust & Rücken A', BRUST_RUECKEN), day('Schulter & Arme A', SCHULTER_ARME_A), day('Beine A', BEINE_BAUCH),
             day('Brust & Rücken B', BRUST_RUECKEN), day('Schulter & Arme B', SCHULTER_ARME_A), day('Beine B', BEINE_BAUCH)] },
  ],
}

const clampSize = (n) => Math.max(2, Math.min(6, n || 3))

export function splitVariants(trainingDays) {
  return SPLIT_CATALOG[clampSize(trainingDays)]
}

export function recommendedSplit(trainingDays) {
  const variants = splitVariants(trainingDays)
  return variants.find(v => v.recommended) ?? variants[0]
}

// Tage des gewählten Splits (Default: empfohlene Variante).
export function splitTemplates(trainingDays, splitId) {
  const variants = splitVariants(trainingDays)
  const variant = (splitId && variants.find(v => v.id === splitId)) || recommendedSplit(trainingDays)
  return variant.days
}

// Band-Stufen je Muskel relativ zu seiner eigenen Referenz: [MEV, Optimal-Mitte, oberes Optimal, MRV].
const muscleLevels = (ref) => [ref.mev, Math.round((ref.mav[0] + ref.mav[1]) / 2), ref.mav[1], ref.mrv]

// Ziel-Wochensätze (reale Sätze) pro Muskel: Ambition wählt die Band-Stufe, Priorität verschiebt
// um eine Stufe (hoch = höher, niedrig = MEV). So skaliert das Ziel pro Muskel statt fix zu clampen.
export function targetSetsPerMuscle(coach) {
  const out = {}
  const base = AMBITION_LEVELS[coach.ambition] ?? AMBITION_LEVELS.normal
  for (const [m, ref] of Object.entries(VOLUME_REF)) {
    const prio = coach.priorities?.[m] ?? 'normal'
    if (prio === 'off') continue
    if (prio === 'low') { out[m] = ref.mev; continue }
    const idx = Math.max(0, Math.min(3, base + (prio === 'high' ? 1 : 0)))
    out[m] = muscleLevels(ref)[idx]
  }
  return out
}

// Grundübungen schwereres Hälfte der Präferenz, Isolation leichtere Hälfte.
export function repRangeFor(kategorie, repPref) {
  const [lo, hi] = REP_PREF[repPref] ?? REP_PREF.standard
  const mid = Math.round((lo + hi) / 2)
  return kategorie === 'grund' ? [lo, mid] : [mid, hi]
}

// Schmerz-Region → Muskeln, die stark belastet werden (Heuristik, da Seed keine painRegions trägt)
const PAIN_MUSCLES = {
  schulter: ['schulterVorne','schulterSeitlich','schulterHinten'],
  knie: ['quadrizeps'],
  untererRuecken: ['untererRuecken'],
  ellbogen: ['trizeps','bizeps'],
  handgelenk: [],
}

export function painExcluded(exercise, pains = []) {
  return pains.some(p => (PAIN_MUSCLES[p] || []).some(m => (exercise.allocation?.[m] || 0) >= 40))
}

const primaryMuscle = (alloc) => Object.entries(alloc || {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
const quality = (e) => (e.dehnung ?? 3) + (e.stabilitaet ?? 3)

// Wenige Sätze pro Übung, Volumen lieber auf mehrere Übungen verteilen: Anker max 3, Komplement max 2.
// Hauptmuskel zählt voll (1 Satz/Satz), Nebenmuskel anteilig.
const setsFor = (ex, remainingReal, m, slot) => {
  const prim = primaryMuscle(ex.allocation)
  const perSet = m === prim ? 1 : (ex.allocation?.[m] || 0) / 100
  const min = 2
  const max = slot === 0 ? 3 : 2
  if (perSet <= 0) return min
  return Math.max(min, Math.min(Math.round(remainingReal / perSet), max))
}
// Reales Volumen gutschreiben: Hauptmuskel voll, Nebenmuskeln anteilig.
const creditVolume = (realByMuscle, ex, sets) => { muscleContribution(ex, sets, realByMuscle) }

// Startgewicht aus Historie (e1RM invertiert auf Ziel-Wdh), sonst null (Kalibrierung).
export function suggestStartWeight(exercise, zielWdh, sessions) {
  const series = e1rmSeries(sessions, exercise.id)
  if (!series.length) return null
  const e = series[series.length - 1].e1rm
  const reps = zielWdh[0]
  const w = e / (1 + reps / 30)
  return roundToIncrement(w, DEFAULT_INCREMENTS[exercise.equipment] || 2.5)
}

// Eine Übung für Muskel m wählen — meidet bereits genutzte IDs & Bewegungsmuster.
// anchor=true: schwere Grundübung als Basis; sonst beste Stretch-Ergänzung.
function pickExercise(m, exercises, used, usedPatterns, pains, anchor) {
  const allowed = e => !used.has(e.id) && !painExcluded(e, pains) && (!e.pattern || !usedPatterns.has(e.pattern))
  let cands = exercises.filter(e => allowed(e) && primaryMuscle(e.allocation) === m)
  // Fallback (Muskel nur Sekundär) nur für die Anker-Übung — Komplement-Slots brauchen einen Primär-Treffer,
  // sonst landen schwere Compounds als Lückenfüller für Nebenmuskeln (z. B. 5× Schulterpresse für Seitdelts).
  if (!cands.length && anchor) cands = exercises.filter(e => allowed(e) && (e.allocation?.[m] || 0) > 0)
  if (!cands.length) return null
  cands.sort((a, b) => {
    if (anchor) {
      const ga = a.kategorie === 'grund' ? 0 : 1
      const gb = b.kategorie === 'grund' ? 0 : 1
      if (ga !== gb) return ga - gb                       // Grundübung als Anker
      if ((b.last ?? 3) !== (a.last ?? 3)) return (b.last ?? 3) - (a.last ?? 3)
    } else {
      if ((b.dehnung ?? 3) !== (a.dehnung ?? 3)) return (b.dehnung ?? 3) - (a.dehnung ?? 3) // Stretch zuerst
      if ((b.stabilitaet ?? 3) !== (a.stabilitaet ?? 3)) return (b.stabilitaet ?? 3) - (a.stabilitaet ?? 3)
    }
    if (quality(b) !== quality(a)) return quality(b) - quality(a)
    return (b.allocation[m] || 0) - (a.allocation[m] || 0)
  })
  return cands[0]
}

export function generateCoachPlan(coach, exercises, sessions = []) {
  const templates = splitTemplates(coach.trainingDays, coach.splitId)
  const targets = targetSetsPerMuscle(coach)
  const freq = {}
  templates.forEach(t => t.muscles.forEach(m => { freq[m] = (freq[m] || 0) + 1 }))
  const prioRank = m => PRIO_RANK[coach.priorities?.[m] ?? 'normal']
  const setBudget = SESSION_SET_BUDGET[coach.ambition] ?? SESSION_SET_BUDGET.normal

  const days = templates.map(t => {
    const used = new Set()
    const usedPatterns = new Set()
    const realByMuscle = {} // reale Sätze inkl. indirektem Volumen (Compounds decken Sekundärmuskeln mit ab)
    const exForDay = []
    let daySets = 0
    const muscles = t.muscles.filter(m => targets[m]).sort((a, b) => prioRank(a) - prioRank(b))
    const capReached = () => exForDay.length >= MAX_EXERCISES_PER_SESSION || daySets >= setBudget

    const addExercise = (m, slot) => {
      const remaining = targets[m] / (freq[m] || 1) - (realByMuscle[m] || 0) // reale Restsätze für m heute
      if (remaining < (slot === 0 ? MIN_ADD : SPLIT_MIN)) return // schon (genug) durch andere Übungen gedeckt
      const ex = pickExercise(m, exercises, used, usedPatterns, coach.pains, slot === 0)
      if (!ex) return
      used.add(ex.id)
      if (ex.pattern) usedPatterns.add(ex.pattern)
      const zielSaetze = setsFor(ex, remaining, m, slot)
      creditVolume(realByMuscle, ex, zielSaetze)
      daySets += zielSaetze
      const zielWdh = repRangeFor(ex.kategorie, coach.repPref)
      exForDay.push({
        exerciseId: ex.id, zielSaetze, zielWdh,
        zielGewicht: suggestStartWeight(ex, zielWdh, sessions), zielRir: [...ZIEL_RIR],
        _prio: prioRank(m), _grund: ex.kategorie === 'grund' ? 0 : 1,
      })
    }

    // Breite zuerst: eine Anker-Übung je Muskel (Hoch-Prio zuerst), bis das Session-Budget greift.
    for (const m of muscles) { if (capReached()) break; addExercise(m, 0) }
    // Dann Tiefe: Zweitübungen, solange Budget reicht.
    for (const m of muscles) { if (capReached()) break; addExercise(m, 1) }

    // Reihenfolge im Training: Hoch-Prio zuerst, Grundübung vor Isolation.
    exForDay.sort((a, b) => a._prio - b._prio || a._grund - b._grund)
    exForDay.forEach(e => { delete e._prio; delete e._grund })
    return createPlanDay({ name: t.name, exercises: exForDay })
  })

  return createPlan({ name: 'Coach-Plan', modus: 'coach', coach, days })
}
