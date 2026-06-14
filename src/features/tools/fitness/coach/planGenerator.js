import { VOLUME_REF, AMBITION_RANGES, REP_PREF, ZIEL_RIR, DEFAULT_INCREMENTS, createPlan, createPlanDay } from '../fitnessModel'
import { e1rmSeries, roundToIncrement } from '../fitnessLogic'

const OBER  = ['brust','ruecken','schulterVorne','schulterSeitlich','schulterHinten','bizeps','trizeps']
const UNTER = ['quadrizeps','hamstrings','gluteus','waden','bauch']
const PUSH  = ['brust','schulterVorne','schulterSeitlich','trizeps']
const PULL  = ['ruecken','schulterHinten','bizeps','trapez']
const BEINE = ['quadrizeps','hamstrings','gluteus','waden']
const GANZ  = ['brust','ruecken','schulterSeitlich','quadrizeps','hamstrings','gluteus','bizeps','trizeps','bauch']

// Schmerz-Region → Muskeln, die stark belastet werden (Heuristik, da Seed keine painRegions trägt)
const PAIN_MUSCLES = {
  schulter: ['schulterVorne','schulterSeitlich','schulterHinten'],
  knie: ['quadrizeps'],
  untererRuecken: ['untererRuecken'],
  ellbogen: ['trizeps','bizeps'],
  handgelenk: [],
}

export function splitTemplates(trainingDays) {
  const d = Math.max(2, Math.min(6, trainingDays || 3))
  if (d === 2) return [{ name: 'Ganzkörper A', muscles: GANZ }, { name: 'Ganzkörper B', muscles: GANZ }]
  if (d === 3) return [{ name: 'Ganzkörper A', muscles: GANZ }, { name: 'Ganzkörper B', muscles: GANZ }, { name: 'Ganzkörper C', muscles: GANZ }]
  if (d === 4) return [{ name: 'Oberkörper A', muscles: OBER }, { name: 'Unterkörper A', muscles: UNTER }, { name: 'Oberkörper B', muscles: OBER }, { name: 'Unterkörper B', muscles: UNTER }]
  if (d === 5) return [{ name: 'Oberkörper A', muscles: OBER }, { name: 'Unterkörper A', muscles: UNTER }, { name: 'Oberkörper B', muscles: OBER }, { name: 'Unterkörper B', muscles: UNTER }, { name: 'Arme & Schultern', muscles: ['bizeps','trizeps','schulterSeitlich','schulterHinten'] }]
  return [{ name: 'Push A', muscles: PUSH }, { name: 'Pull A', muscles: PULL }, { name: 'Beine A', muscles: BEINE }, { name: 'Push B', muscles: PUSH }, { name: 'Pull B', muscles: PULL }, { name: 'Beine B', muscles: BEINE }]
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

export function painExcluded(exercise, pains = []) {
  return pains.some(p => (PAIN_MUSCLES[p] || []).some(m => (exercise.allocation?.[m] || 0) >= 40))
}

const primaryMuscle = (alloc) => Object.entries(alloc || {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

// Startgewicht aus Historie (e1RM invertiert auf Ziel-Wdh), sonst null (Kalibrierung).
export function suggestStartWeight(exercise, zielWdh, sessions) {
  const series = e1rmSeries(sessions, exercise.id)
  if (!series.length) return null
  const e = series[series.length - 1].e1rm
  const reps = zielWdh[0]
  const w = e / (1 + reps / 30)
  return roundToIncrement(w, DEFAULT_INCREMENTS[exercise.equipment] || 2.5)
}

export function generateCoachPlan(coach, exercises, sessions = []) {
  const templates = splitTemplates(coach.trainingDays)
  const targets = targetSetsPerMuscle(coach)
  const freq = {}
  templates.forEach(t => t.muscles.forEach(m => { freq[m] = (freq[m] || 0) + 1 }))

  const days = templates.map(t => {
    const used = new Set()
    const exForDay = []
    t.muscles.forEach(m => {
      if (!targets[m]) return // nur Muskeln mit Volumen-Ziel bekommen eigene Übung
      const per = Math.max(1, Math.round(targets[m] / (freq[m] || 1)))
      let cands = exercises.filter(e => !used.has(e.id) && primaryMuscle(e.allocation) === m && !painExcluded(e, coach.pains))
      if (!cands.length) cands = exercises.filter(e => !used.has(e.id) && (e.allocation?.[m] || 0) > 0 && !painExcluded(e, coach.pains))
      if (!cands.length) return
      cands.sort((a, b) => (a.kategorie === b.kategorie ? 0 : a.kategorie === 'grund' ? -1 : 1) || (b.allocation[m] || 0) - (a.allocation[m] || 0))
      const ex = cands[0]
      used.add(ex.id)
      const zielWdh = repRangeFor(ex.kategorie, coach.repPref)
      const minS = ex.kategorie === 'grund' ? 3 : 2
      const maxS = ex.kategorie === 'grund' ? 5 : 4
      const zielSaetze = Math.max(minS, Math.min(per, maxS))
      exForDay.push({ exerciseId: ex.id, zielSaetze, zielWdh, zielGewicht: suggestStartWeight(ex, zielWdh, sessions), zielRir: [...ZIEL_RIR] })
    })
    return createPlanDay({ name: t.name, exercises: exForDay })
  })

  return createPlan({ name: 'Coach-Plan', modus: 'coach', coach, days })
}
