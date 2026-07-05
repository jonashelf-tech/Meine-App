// Reine, testbare Logik für Elvi: Dosis-Auswertung + Empfehlung.
// Liest KEIN Storage — alle Daten kommen als Argumente rein (savedDays, sessions,
// moduleConfig). So bleibt die Bewertungslogik ohne Mocks testbar und entkoppelt.
//
// Datenquellen (über das Datum verknüpft):
//  - savedDays:   Elvi-Tage  { date, doses:[{time,mg}], ratings:{fokus,crash,reiz,…}, notes }
//  - sessions:    Kognitiv    { date, moduleId, mainMetric }   (via sessionStore.loadSessions)
//  - moduleConfig: { [moduleId]: { higherIsBetter } }          (via kognitiv/moduleConfig)

// Ratings, die in die Empfehlung einfließen (0–10-Skala aus TabElvi).
export const FOKUS = 'fokus'
export const CRASH = 'crash'
export const REIZ  = 'reiz'

// Schwellen (0–10-Skala): ab hier gilt eine Nebenwirkung als deutlich / der Fokus als schwach.
export const CRASH_HIGH = 6
export const REIZ_HIGH  = 6
export const FOKUS_LOW  = 4

// Gewicht der Verträglichkeit gegen den Nutzen im Netto-Score.
const TOL_WEIGHT = 0.7

// ─── Basis ────────────────────────────────────────────────────────────────────

// Tagesdosis eines Elvi-Tags = Summe der erfassten mg.
export function dayDose(day) {
  if (!day?.doses?.length) return 0
  return day.doses.reduce((sum, d) => sum + (Number(d.mg) || 0), 0)
}

// Dosis-Stufe (Bucket-Schlüssel): auf 0,5 mg gerundet gegen Float-Artefakte.
export function doseBucketKey(dose) {
  return Math.round(dose * 2) / 2
}

const mean = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
const ratingMean = (days, key) =>
  mean(days.map(d => d.ratings?.[key]).filter(v => typeof v === 'number'))

// ─── Kognitive Tagesform ──────────────────────────────────────────────────────

// Empirischer Perzentil-Rang eines Werts in seiner Verteilung, richtungsbewusst.
// 0–100 (100 = bisher bester, 0 = schlechtester). < 2 Vergleichswerte → null.
export function percentileRank(value, all, higherIsBetter) {
  const vals = all.filter(v => typeof v === 'number' && !Number.isNaN(v))
  if (vals.length < 2) return null
  let worse = 0, equal = 0
  for (const v of vals) {
    if (v === value) { equal++; continue }
    const vIsWorse = higherIsBetter ? v < value : v > value
    if (vIsWorse) worse++
  }
  return Math.round(((worse + 0.5 * equal) / vals.length) * 100)
}

// Kognitive Form eines Tages: Mittel der Perzentil-Ränge der Sessions dieses Tages,
// jede gegen die gesamte Historie ihres Moduls. Keine bewertbare Session → null.
export function cognitiveDayForm(date, sessions, moduleConfig) {
  const dayS = sessions.filter(s => s.date === date)
  if (!dayS.length) return null
  const ranks = []
  for (const s of dayS) {
    const hib = moduleConfig[s.moduleId]?.higherIsBetter ?? false
    const all = sessions.filter(x => x.moduleId === s.moduleId).map(x => x.mainMetric)
    const r = percentileRank(s.mainMetric, all, hib)
    if (r != null) ranks.push(r)
  }
  return ranks.length ? Math.round(mean(ranks)) : null
}

// ─── Dosis-Stufen (Buckets) ───────────────────────────────────────────────────

// Aggregiert die Tage je Dosis-Stufe. Jedes Signal ist optional (null wenn nie erfasst).
export function buildDoseBuckets(savedDays, sessions, moduleConfig) {
  const groups = new Map()
  for (const day of savedDays) {
    const dose = dayDose(day)
    if (dose <= 0) continue
    const key = doseBucketKey(dose)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(day)
  }
  const buckets = []
  for (const [dose, days] of groups) {
    const cogForms = days
      .map(d => cognitiveDayForm(d.date, sessions, moduleConfig))
      .filter(v => v != null)
    buckets.push({
      dose,
      days:    days.length,
      cog:     cogForms.length ? Math.round(mean(cogForms)) : null,  // 0–100 | null  (objektiv)
      cogDays: cogForms.length,
      fokus:   ratingMean(days, FOKUS), // 0–10  | null  (subjektiv)
      crash:   ratingMean(days, CRASH), // 0–10  | null
      reiz:    ratingMean(days, REIZ),  // 0–10  | null
    })
  }
  return buckets.sort((a, b) => a.dose - b.dose)
}

// Verträglichkeits-Last 0–100 (höher = mehr Nebenwirkung). Crash+Reiz fehlen beide → null.
export function toleranceCost(bucket) {
  const parts = [bucket.crash, bucket.reiz].filter(v => v != null)
  return parts.length ? mean(parts) * 10 : null
}

// Nutzen 0–100 aus objektiver Form + subjektivem Fokus (vorhandene gemittelt). Beide fehlen → null.
export function benefitScore(bucket) {
  const parts = []
  if (bucket.cog   != null) parts.push(bucket.cog)
  if (bucket.fokus != null) parts.push(bucket.fokus * 10)
  return parts.length ? mean(parts) : null
}

// Netto-Score einer Dosis-Stufe. Ohne jedes Signal → null.
// Fehlt der Nutzen, zählt nur die Verträglichkeit (weniger Nebenwirkung gewinnt).
export function netScore(bucket) {
  const b = benefitScore(bucket)
  const c = toleranceCost(bucket)
  if (b == null && c == null) return null
  return (b ?? 50) - TOL_WEIGHT * (c ?? 0)
}

// ─── Confidence ───────────────────────────────────────────────────────────────

// Wie belastbar ist die Tendenz? Nach Anzahl bewertbarer Dosis-Stufen, Tagen, Objektivdaten.
export function confidenceLevel(buckets, hasCognitive) {
  const stufen = buckets.filter(b => netScore(b) != null).length
  const tage   = buckets.reduce((n, b) => n + b.days, 0)
  if (stufen >= 2 && hasCognitive && tage >= 6) return 'high'
  if (stufen >= 2 || (hasCognitive && tage >= 5)) return 'medium'
  return 'low'
}

// ─── Empfehlung ───────────────────────────────────────────────────────────────

const round1 = n => Math.round(n * 10) / 10

// Kern: baut aus allen vorhandenen Signalen eine Dosis-Tendenz.
// currentDose = aktuell im Tool eingestellte Tagesdosis (Bezugspunkt); null → jüngster Tag.
export function doseRecommendation(savedDays, sessions, moduleConfig, currentDose = null) {
  const buckets = buildDoseBuckets(savedDays, sessions, moduleConfig)
  const hasCognitive = buckets.some(b => b.cogDays > 0)

  if (!buckets.length) {
    return {
      status: 'no-data', direction: 0, confidence: 'none',
      buckets, hasCognitive: false, currentDose: null, recommendedDose: null,
      message: 'Erfasse ein paar Tage mit Dosis und Bewertung — dann werte ich hier deine Tendenz aus.',
    }
  }

  const latestDay = savedDays.reduce((a, b) => (!a || b.date > a.date ? b : a), null)
  const refDose = currentDose != null
    ? doseBucketKey(currentDose)
    : doseBucketKey(dayDose(latestDay))

  // Bezugs-Bucket = exakte Stufe, sonst die nächstgelegene (für den Verträglichkeits-Check).
  const refBucket =
    buckets.find(b => b.dose === refDose) ??
    [...buckets].sort((a, b) => Math.abs(a.dose - refDose) - Math.abs(b.dose - refDose))[0]

  const confidence = confidenceLevel(buckets, hasCognitive)

  // Sicherheit zuerst: Nebenwirkungen bei der aktuellen Dosis deutlich erhöht → reduzieren.
  const refTooHigh =
    (refBucket?.crash != null && refBucket.crash >= CRASH_HIGH) ||
    (refBucket?.reiz  != null && refBucket.reiz  >= REIZ_HIGH)

  // Nur eine Dosis-Stufe erfasst → kein echter Vergleich, nur Verträglichkeits-Heuristik.
  if (buckets.length === 1) {
    const b = buckets[0]
    let direction = 0
    let message = 'Deine aktuelle Dosis wirkt stimmig — Bewertung und Verträglichkeit passen.'
    if (refTooHigh) {
      direction = -1
      message = 'Crash bzw. Reizempfindlichkeit sind im Schnitt erhöht — eine kleinere Dosis könnte verträglicher sein.'
    } else if (b.fokus != null && b.fokus < FOKUS_LOW) {
      direction = 1
      message = 'Der Fokus ist im Schnitt schwach bei guter Verträglichkeit — eine etwas höhere Dosis könnte helfen.'
    }
    return {
      status: 'single-dose', direction, confidence,
      buckets, hasCognitive, currentDose: refDose, recommendedDose: null, message,
      hint: 'Für einen echten Dosis-Vergleich: bewerte auch Tage mit einer anderen Dosis — idealerweise mit Kognitiv-Übungen.',
    }
  }

  // Mehrere Stufen → beste nach Netto-Score.
  const scored = buckets.map(b => ({ ...b, net: netScore(b) })).filter(b => b.net != null)
  if (!scored.length) {
    return {
      status: 'no-signal', direction: 0, confidence: 'low',
      buckets, hasCognitive, currentDose: refDose, recommendedDose: null,
      message: 'Es gibt mehrere Dosis-Stufen, aber noch keine Bewertungen dazu — trag Fokus/Crash/Reiz ein, dann vergleiche ich.',
    }
  }

  const best = scored.reduce((a, b) => (b.net > a.net ? b : a))
  let recommendedDose = best.dose
  let message = buildCompareMessage(best, refDose)

  // Sicherheits-Override: aktuelle Dosis unverträglich, Empfehlung aber nicht niedriger → runter.
  if (refTooHigh && recommendedDose >= refDose) {
    const lower = scored.filter(b => b.dose < refDose).sort((a, b) => b.dose - a.dose)[0]
    if (lower) {
      recommendedDose = lower.dose
      message = 'Bei deiner aktuellen Dosis sind Crash/Reizempfindlichkeit deutlich erhöht — die kleinere Stufe war spürbar verträglicher.'
    }
  }

  const direction = Math.sign(recommendedDose - refDose)
  return {
    status: 'compare', direction, confidence,
    buckets, hasCognitive, currentDose: refDose,
    recommendedDose: direction === 0 ? null : round1(recommendedDose),
    bestDose: round1(best.dose),
    message,
  }
}

function buildCompareMessage(best, refDose) {
  const parts = []
  if (best.cog != null)   parts.push(`kognitive Form ${best.cog}`)
  if (best.fokus != null) parts.push(`Fokus ${round1(best.fokus)}/10`)
  const cost = toleranceCost(best)
  const tol = cost == null ? '' : cost <= 30 ? ' bei guter Verträglichkeit'
            : cost >= 55 ? ' — die Verträglichkeit ist hier aber angespannt' : ''
  const basis = parts.length ? ` (${parts.join(', ')})` : ''
  if (best.dose === refDose) {
    return `Deine aktuelle Dosis (~${round1(best.dose)} mg) schneidet am besten ab${basis}${tol}.`
  }
  const richtung = best.dose > refDose ? 'höher' : 'niedriger'
  return `~${round1(best.dose)} mg (etwas ${richtung}) schnitt am besten ab${basis}${tol}.`
}
