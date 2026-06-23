import { WARMUP_SCHEME, VOLUME_REF, AUTOREG_DOWN_PCT } from './fitnessModel'

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

// restSec-Override gewinnt; sonst der konfigurierbare Default (Sek.).
export function restSecForExercise(exercise, defaultSec = 120) {
  return exercise?.restSec ?? defaultSec
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

// Zeitreihe des besten Arbeits-e1RM je Session für eine Übung (chronologisch).
export function e1rmSeries(sessions, exerciseId) {
  return sessions
    .map(sess => {
      const ex = sess.exercises?.find(e => e.exerciseId === exerciseId)
      const best = ex ? bestWorkingE1rm(ex) : null
      return best != null ? { date: sess.date, e1rm: best } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
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

export function weekStartIso(iso) {
  const d = new Date(iso + 'T12:00:00')
  const day = d.getDay()                 // 0=So
  const diff = day === 0 ? -6 : 1 - day  // auf Montag
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function volumeZone(muscle, sets) {
  const ref = VOLUME_REF[muscle]
  if (!ref) return 'untracked'
  if (sets < ref.mev) return 'low'
  if (sets < ref.mav[1]) return 'optimal'
  if (sets < ref.mrv) return 'high'
  return 'over'
}

// Empfehlung Session-zu-Session (Double Progression).
// lastSets = Arbeitssätze der letzten Session dieser Übung [{gewicht,wdh,rir?,feedback?}].
export function nextRecommendation(lastSets, repRange, zielRir, increment) {
  if (!lastSets || !lastSets.length) return null // Kalibrierung
  const topWeight = Math.max(...lastSets.map(s => s.gewicht))
  const atTop = lastSets.filter(s => s.gewicht === topWeight)
  const allHitTop = atTop.every(s =>
    s.wdh >= repRange[1] && (s.rir == null || s.rir <= zielRir[1]) && s.feedback !== 'nichtGeschafft')
  if (allHitTop) return { gewicht: roundToIncrement(topWeight + increment, increment), wdh: repRange[0] }
  const bestReps = Math.max(...atTop.map(s => s.wdh))
  return { gewicht: topWeight, wdh: Math.min(repRange[1], bestReps + 1) }
}

// Live-Autoregulation für die Restsätze nach einem Satz-Ergebnis.
export function adjustRemaining(aktuelleEmpfehlung, satzErgebnis, zielWdh, increment) {
  const under = (satzErgebnis.wdh != null && satzErgebnis.wdh < zielWdh[0]) || satzErgebnis.feedback === 'nichtGeschafft'
  if (under) return { gewicht: roundToIncrement(aktuelleEmpfehlung.gewicht * (1 - AUTOREG_DOWN_PCT), increment), wdh: aktuelleEmpfehlung.wdh }
  if (satzErgebnis.feedback === 'leicht') return { gewicht: roundToIncrement(aktuelleEmpfehlung.gewicht + increment, increment), wdh: aktuelleEmpfehlung.wdh }
  return aktuelleEmpfehlung
}

// Wochen-Volumen-Anpassung pro Muskel. Gibt die neue Zielsatzzahl zurück.
// e1rmTrend: 'up' | 'flat' | 'down'. feedbackDist: {leicht,passt,hart,nichtGeschafft} (Zähler).
export function weeklyVolumeAdjust(muscle, currentSets, e1rmTrend, feedbackDist = {}) {
  const ref = VOLUME_REF[muscle]
  const mrv = ref ? ref.mrv : Infinity
  const hard = (feedbackDist.hart || 0) + (feedbackDist.nichtGeschafft || 0)
  const good = feedbackDist.passt || 0
  // schlecht: Trend runter ODER überwiegend hart/nicht geschafft → -2
  if (e1rmTrend === 'down' || hard > good) return Math.max(0, currentSets - 2)
  // gut: Trend hoch und überwiegend "passt" → +1..2 (Deckel MRV)
  if (e1rmTrend === 'up' && good >= hard) return Math.min(mrv, currentSets + 2)
  // sonst halten
  return currentSets
}

// Review einer Übung: e1RM-Trend (letzte 2 Punkte) + Feedback-Verteilung der jüngsten Session.
export function reviewExercise(sessions, exerciseId) {
  const series = e1rmSeries(sessions, exerciseId)
  let trend = 'flat'
  if (series.length >= 2) {
    const a = series[series.length - 2].e1rm
    const b = series[series.length - 1].e1rm
    trend = b > a ? 'up' : b < a ? 'down' : 'flat'
  }
  const feedbackDist = { leicht: 0, passt: 0, hart: 0, nichtGeschafft: 0 }
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ex = sessions[i].exercises?.find(e => e.exerciseId === exerciseId)
    if (ex) {
      ex.saetze.forEach(st => { if (st.feedback && feedbackDist[st.feedback] != null) feedbackDist[st.feedback]++ })
      break
    }
  }
  return { trend, feedbackDist }
}

// Recovery nötig? bestes e1RM eines Muskels sinkt über >=2 aufeinanderfolgende Sessions.
// Betrachtet Sessions (chronologisch), die diesen Muskel als Primärmuskel einer Übung trainieren.
export function recoveryNeeded(muscle, sessions, exercises) {
  const byId = new Map(exercises.map(e => [e.id, e]))
  const primary = (alloc) => Object.entries(alloc || {}).sort((a, b) => b[1] - a[1])[0]?.[0]
  // pro Session bestes e1RM über Übungen, deren Primärmuskel == muscle
  const points = sessions
    .map(sess => {
      let best = null
      sess.exercises?.forEach(ex => {
        const exo = byId.get(ex.exerciseId)
        if (!exo || primary(exo.allocation) !== muscle) return
        const e = bestWorkingE1rm(ex)
        if (e != null) best = best == null ? e : Math.max(best, e)
      })
      return best != null ? { date: sess.date, e: best } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (points.length < 3) return false
  const n = points.length
  // letzte 3 Punkte: zweimal in Folge gesunken?
  return points[n - 1].e < points[n - 2].e && points[n - 2].e < points[n - 3].e
}

// ─── Zyklus-Rhythmus: Heute-Hinweis (weicher Vorschlag) ──────
const DAY_MS = 86400000
const daysBetween = (aIso, bIso) =>
  Math.round((new Date(aIso + 'T12:00:00') - new Date(bIso + 'T12:00:00')) / DAY_MS)
const prevIso = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) }

// rhythm: null | { on, off }. Liefert null (kein Hinweis) oder { kind: 'done'|'rest'|'train' }.
// Anker ist das letzte echte Training → verschobene Trainings rechnen sich neu.
export function trainingDayStatus(rhythm, sessions, today) {
  if (!rhythm || !rhythm.on || !rhythm.off) return null
  const dates = new Set((sessions || []).map(s => s.date))
  if (dates.has(today)) return { kind: 'done' }
  const past = [...dates].filter(d => d < today).sort()
  if (!past.length) return { kind: 'train' }
  const lastDate = past[past.length - 1]
  const restDaysSoFar = daysBetween(today, lastDate) - 1
  let streak = 0
  for (let cursor = lastDate; dates.has(cursor); cursor = prevIso(cursor)) streak++
  if (streak >= rhythm.on && restDaysSoFar < rhythm.off) return { kind: 'rest' }
  return { kind: 'train' }
}

// Reales Volumen einer Übung auf Muskeln verteilen: Hauptmuskel zählt voll (1 Satz),
// Nebenmuskeln anteilig oben drauf. Akkumuliert in acc.
export function muscleContribution(exercise, sets, acc = {}) {
  const alloc = exercise?.allocation || {}
  const prim = Object.entries(alloc).sort((a, b) => b[1] - a[1])[0]?.[0]
  for (const [m, pct] of Object.entries(alloc)) {
    acc[m] = (acc[m] || 0) + sets * (m === prim ? 1 : pct / 100)
  }
  return acc
}

// Trainings/Woche aus dem Rhythmus, sonst Default-Zyklus (alle N Rotationstage + 1 Pause).
export function sessionsPerWeek(rhythm, rotationLength) {
  if (rhythm && rhythm.on && rhythm.off) return 7 * rhythm.on / (rhythm.on + rhythm.off)
  const n = Math.max(1, rotationLength || 1)
  return 7 * n / (n + 1)
}

// Geplantes reales Volumen pro Muskel/Woche: Volumen pro Rotation × wie oft die Rotation
// pro Woche durchlaufen wird (Sessions/Woche ÷ Rotationslänge).
// freqOverride: optionale explizite Sessions/Woche (z. B. aus weeklyFrequency), ersetzt sessionsPerWeek(rhythm).
export function plannedRealSetsPerMuscle(plan, exercises, rhythm, freqOverride = null) {
  const byId = new Map(exercises.map(e => [e.id, e]))
  const n = plan?.days?.length || 1
  const perWeekFactor = (freqOverride ?? sessionsPerWeek(rhythm, n)) / n
  const acc = {}
  plan?.days?.forEach(day => {
    day.exercises?.forEach(entry => {
      const exObj = byId.get(entry.exerciseId)
      if (exObj) muscleContribution(exObj, entry.zielSaetze || 0, acc)
    })
  })
  Object.keys(acc).forEach(m => { acc[m] = round1(acc[m] * perWeekFactor) })
  return acc
}

// Reale Sätze pro Muskel in der Woche ab weekStart (7 Tage). Warmup zählt 0.
export function realSetsPerMuscle(sessions, exercises, weekStart) {
  const byId = new Map(exercises.map(e => [e.id, e]))
  const end = new Date(weekStart + 'T12:00:00'); end.setDate(end.getDate() + 7)
  const endIso = end.toISOString().slice(0, 10)
  const acc = {}
  sessions.forEach(sess => {
    if (sess.date < weekStart || sess.date >= endIso) return
    sess.exercises?.forEach(ex => {
      const exObj = byId.get(ex.exerciseId)
      if (!exObj) return
      const working = (ex.saetze ?? []).filter(s => WORKING.includes(s.satzTyp)).length
      if (working) muscleContribution(exObj, working, acc)
    })
  })
  Object.keys(acc).forEach(m => { acc[m] = round1(acc[m]) })
  return acc
}

// ─── Scheduling (feste Wochentage, ersetzt den Rhythmus-Schritt im Onboarding) ──

// ISO-Wochentag: Mo=1..So=7 (JS getDay() ist 0=So..6=Sa).
export function isoWeekday(iso) {
  const d = new Date(iso + 'T12:00:00')
  return ((d.getDay() + 6) % 7) + 1
}

// schedule: null | { mode:'flex' } | { mode:'fixed', days:[1..7] }.
// Liefert null (kein Hinweis) oder { kind:'done'|'rest'|'train' } — nie blockierend.
export function scheduleStatus(schedule, sessions, today) {
  if (!schedule || schedule.mode !== 'fixed') return null
  const dates = new Set((sessions || []).map(s => s.date))
  if (dates.has(today)) return { kind: 'done' }
  return (schedule.days || []).includes(isoWeekday(today)) ? { kind: 'train' } : { kind: 'rest' }
}

// Trainings/Woche fürs Volumen: fixed → Anzahl Wochentage; sonst Rhythmus/Default-Zyklus.
export function weeklyFrequency(settings, rotationLength) {
  if (settings?.schedule?.mode === 'fixed') return Math.max(1, (settings.schedule.days || []).length)
  if (settings?.rhythm?.on && settings?.rhythm?.off) return sessionsPerWeek(settings.rhythm, rotationLength)
  return sessionsPerWeek(null, rotationLength)
}

// Aufeinanderfolgende Wochen mit ≥1 Training, bis zur aktuellen Woche.
// Grace: hat die aktuelle Woche noch kein Training, wird ab der Vorwoche gezählt.
export function weeklyStreak(sessions, today) {
  if (!sessions || !sessions.length) return 0
  const weeks = new Set(sessions.map(s => weekStartIso(s.date)))
  let cursor = weekStartIso(today)
  if (!weeks.has(cursor)) {
    const d = new Date(cursor + 'T12:00:00'); d.setDate(d.getDate() - 7)
    cursor = d.toISOString().slice(0, 10)
  }
  let streak = 0
  while (weeks.has(cursor)) {
    streak++
    const d = new Date(cursor + 'T12:00:00'); d.setDate(d.getDate() - 7)
    cursor = d.toISOString().slice(0, 10)
  }
  return streak
}

// Distinkte Trainingstage in der aktuellen Woche (ab weekStartIso(today)).
export function sessionsThisWeek(sessions, today) {
  const weekStart = weekStartIso(today)
  const end = new Date(weekStart + 'T12:00:00'); end.setDate(end.getDate() + 7)
  const endIso = end.toISOString().slice(0, 10)
  const dates = new Set(
    (sessions || []).filter(s => s.date >= weekStart && s.date < endIso).map(s => s.date)
  )
  return dates.size
}

// Ø Dauer (Minuten) der letzten n Sessions mit durationSec>0. Leer → 0.
export function avgDurationMin(sessions, n = 5) {
  const durations = (sessions || []).filter(s => s.durationSec > 0).slice(-n).map(s => s.durationSec)
  if (!durations.length) return 0
  const avgSec = durations.reduce((sum, s) => sum + s, 0) / durations.length
  return Math.round(avgSec / 60)
}

// Geschätzte Session-Dauer (Minuten, auf 5 gerundet): Arbeitssätze · 2,5 min + 10 min Aufwärmen.
export const estSessionMin = (workingSets) => Math.round((workingSets * 2.5 + 10) / 5) * 5
