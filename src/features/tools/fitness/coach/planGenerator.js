import { VOLUME_REF, AMBITION_RANGES, REP_PREF, ZIEL_RIR, DEFAULT_INCREMENTS, createPlan, createPlanDay } from '../fitnessModel'
import { e1rmSeries, roundToIncrement } from '../fitnessLogic'

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

const day = (name, muscles) => ({ name, muscles })

// Übungsauswahl & Satz-Verteilung
const SPLIT_THRESHOLD = 6   // ab so vielen Sätzen/Muskel/Tag → zweite, komplementäre Übung
const MAX_EX_PER_MUSCLE = 2

// Split-Katalog: pro Größe mehrere Varianten, genau eine `recommended`.
export const SPLIT_CATALOG = {
  2: [
    { id: 'ganz2', name: 'Ganzkörper A/B', recommended: true,
      days: [day('Ganzkörper A', GANZ), day('Ganzkörper B', GANZ)] },
    { id: 'ul2', name: 'Oberkörper / Unterkörper', recommended: false,
      days: [day('Oberkörper', OBER), day('Unterkörper', UNTER)] },
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

// Ziel-Wochensätze pro Muskel: Ambition, moduliert durch Priorität, geclamped MEV..MAV-hi, Deckel MRV.
export function targetSetsPerMuscle(coach) {
  const out = {}
  const [alo, ahi] = AMBITION_RANGES[coach.ambition] ?? AMBITION_RANGES.normal
  for (const [m, ref] of Object.entries(VOLUME_REF)) {
    const prio = coach.priorities?.[m] ?? 'normal'
    let t = prio === 'high' ? ahi : prio === 'low' ? alo : Math.round((alo + ahi) / 2)
    t = Math.max(ref.mev, Math.min(t, ref.mav[1]))
    if (prio === 'low') t = ref.mev
    t = Math.min(t, ref.mrv)
    out[m] = t
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
  if (!cands.length) cands = exercises.filter(e => allowed(e) && (e.allocation?.[m] || 0) > 0)
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

  const days = templates.map(t => {
    const used = new Set()
    const usedPatterns = new Set()
    const exForDay = []
    t.muscles.forEach(m => {
      if (!targets[m]) return // nur Muskeln mit Volumen-Ziel bekommen eigene Übung
      const per = Math.max(1, Math.round(targets[m] / (freq[m] || 1)))
      const slots = per >= SPLIT_THRESHOLD ? MAX_EX_PER_MUSCLE : 1
      let remaining = per
      for (let i = 0; i < slots; i++) {
        const ex = pickExercise(m, exercises, used, usedPatterns, coach.pains, i === 0)
        if (!ex) break
        used.add(ex.id)
        if (ex.pattern) usedPatterns.add(ex.pattern)
        const zielWdh = repRangeFor(ex.kategorie, coach.repPref)
        const minS = ex.kategorie === 'grund' ? 3 : 2
        const maxS = ex.kategorie === 'grund' ? 5 : 4
        const want = slots === 1 ? per : (i === 0 ? Math.ceil(per * 0.6) : remaining)
        const zielSaetze = Math.max(minS, Math.min(want, maxS))
        remaining -= zielSaetze
        exForDay.push({ exerciseId: ex.id, zielSaetze, zielWdh, zielGewicht: suggestStartWeight(ex, zielWdh, sessions), zielRir: [...ZIEL_RIR] })
      }
    })
    return createPlanDay({ name: t.name, exercises: exForDay })
  })

  return createPlan({ name: 'Coach-Plan', modus: 'coach', coach, days })
}
