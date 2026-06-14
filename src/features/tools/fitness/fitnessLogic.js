import { REST_DEFAULTS, WARMUP_SCHEME } from './fitnessModel'

const WORKING = ['normal', 'dropset', 'failure']
const round1 = (n) => Math.round(n * 10) / 10

// Epley. Nur gültige Eingaben (gewicht>0, wdh>=1), sonst 0.
export function e1rm(gewicht, wdh) {
  if (!gewicht || gewicht <= 0 || !wdh || wdh < 1) return 0
  if (wdh === 1) return gewicht
  return round1(gewicht * (1 + wdh / 30))
}

export function roundToIncrement(gewicht, increment) {
  if (!increment || increment <= 0) return gewicht
  return Math.round(gewicht / increment) * increment
}

// restSec-Override gewinnt; sonst aus defaultRepRange[0] (schwereres Ende) via REST_DEFAULTS.
export function restSecForExercise(exercise) {
  if (exercise?.restSec != null) return exercise.restSec
  const reps = exercise?.defaultRepRange?.[0] ?? 10
  const bucket = REST_DEFAULTS.find(b => reps <= b.maxReps) ?? REST_DEFAULTS[REST_DEFAULTS.length - 1]
  return bucket.sec
}

// Warmup-Sätze vom Arbeitsgewicht; Gewicht auf 0,5 kg gerundet.
export function warmupSets(arbeitsGewicht, scheme = WARMUP_SCHEME) {
  if (!arbeitsGewicht || arbeitsGewicht <= 0) return []
  return scheme.map(({ pct, reps }) => ({
    gewicht: Math.round(arbeitsGewicht * pct * 2) / 2,
    wdh: reps,
    satzTyp: 'warmup',
  }))
}

const workingSets = (ex) =>
  (ex?.saetze ?? []).filter(s => WORKING.includes(s.satzTyp) && s.gewicht > 0 && s.wdh > 0)

export function bestWorkingE1rm(ex) {
  const ws = workingSets(ex)
  if (!ws.length) return null
  return Math.max(...ws.map(s => e1rm(s.gewicht, s.wdh)))
}

// PRs vs. Vorgeschichte. Ohne Vorgeschichte (keine früheren Arbeitssätze) → [].
export function detectPRs(currentExercise, priorExercises = []) {
  const cur = workingSets(currentExercise)
  if (!cur.length) return []
  const prior = priorExercises.flatMap(workingSets)
  if (!prior.length) return []

  const prs = []
  const maxWNow = Math.max(...cur.map(s => s.gewicht))
  const maxWBefore = Math.max(...prior.map(s => s.gewicht))
  if (maxWNow > maxWBefore) prs.push({ type: 'weight', value: maxWNow })

  const bestENow = Math.max(...cur.map(s => e1rm(s.gewicht, s.wdh)))
  const bestEBefore = Math.max(...prior.map(s => e1rm(s.gewicht, s.wdh)))
  if (bestENow > bestEBefore + 0.05) prs.push({ type: 'e1rm', value: round1(bestENow) })

  const weights = [...new Set(cur.map(s => s.gewicht))]
  weights.forEach(w => {
    const repsNow = Math.max(...cur.filter(s => s.gewicht === w).map(s => s.wdh))
    const priorAtW = prior.filter(s => s.gewicht === w)
    if (priorAtW.length) {
      const repsBefore = Math.max(...priorAtW.map(s => s.wdh))
      if (repsNow > repsBefore) prs.push({ type: 'reps', value: repsNow, gewicht: w })
    }
  })
  return prs
}

// Überlappung zweier Allokationen: Summe der Minima je Muskel (0..100).
export function allocationOverlap(a, b) {
  const muscles = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])
  let sum = 0
  muscles.forEach(m => { sum += Math.min(a?.[m] || 0, b?.[m] || 0) })
  return sum
}

// Ähnlichste Übungen nach Allokations-Überlappung (ohne die Übung selbst, nur > 0).
export function similarExercises(target, all, n = 5) {
  return all
    .filter(e => e.id !== target.id)
    .map(e => ({ exercise: e, score: allocationOverlap(target.allocation, e.allocation) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'de'))
    .slice(0, n)
    .map(x => x.exercise)
}
