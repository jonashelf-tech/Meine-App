import { sv, lv, SK } from '../../../storage'
import { dateKey, todayKey } from '../../../utils'
import { getTodayCheckin } from './checkinStore'
import { MODULE_ORDER, MODULE_CONFIG, PROFILE_DOMAINS } from './moduleConfig'

// ─── Metrik-Richtung (pure, testbar) ──────────────────────────
// higherIsBetter=true  → größer ist besser (Trefferrate, Sequenzlänge)
// higherIsBetter=false → kleiner ist besser (Reaktionszeit, Zeit, Switch Cost)

export function bestMetric(metrics, higherIsBetter) {
  return higherIsBetter ? Math.max(...metrics) : Math.min(...metrics)
}

// Positiv = Verbesserung (egal in welche Richtung die Metrik zeigt)
export function computeImprovement(first, latest, higherIsBetter) {
  return higherIsBetter ? latest - first : first - latest
}

// Differenz aktuelle vs. vorherige Session; positiv = besser
export function computeDelta(previousMetric, currentMetric, higherIsBetter) {
  return higherIsBetter ? currentMetric - previousMetric : previousMetric - currentMetric
}

// Balkenhöhe relativ zum Bestwert: 1.0 = bester, <1 = schlechter (richtungsbewusst)
export function barFraction(metric, best, higherIsBetter) {
  if (!best || !metric) return 0
  return higherIsBetter ? metric / best : best / metric
}

const isHigherBetter = (moduleId) => MODULE_CONFIG[moduleId]?.higherIsBetter ?? false

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export function loadSessions() {
  return lv(SK.kognitiv, [])
}

export function saveSession(session) {
  const sessions = loadSessions()
  sv(SK.kognitiv, [...sessions, session])
}

export function createSession({
  moduleId, startedAt, duration, score, mainMetric, taps,
  sessionGroupId = null, einheitComplete = false, einheitSize = null,
}) {
  return {
    id:        genId(),
    moduleId,
    date:      dateKey(new Date(startedAt)),
    startedAt,
    duration,
    score,
    mainMetric,
    taps,
    checkinId: getTodayCheckin()?.id ?? null,
    sessionGroupId,   // verknüpft Läufe einer Einheit (null = freier Einzellauf)
    einheitComplete,  // true nur auf dem letzten Lauf einer vollständig gespielten Einheit
    einheitSize,      // Anzahl Module der Einheit (auf dem Abschluss-Lauf)
  }
}

export function isDoneToday(moduleId) {
  const today = todayKey()
  return loadSessions().some(s => s.moduleId === moduleId && s.date === today)
}

export function getLastSession(moduleId) {
  const all = loadSessions().filter(s => s.moduleId === moduleId)
  return all.length > 0 ? all[all.length - 1] : null
}

export function getModuleSessions(moduleId) {
  return loadSessions().filter(s => s.moduleId === moduleId)
}

export function getDelta(moduleId, currentMetric) {
  const last = getLastSession(moduleId)
  if (!last) return null
  return computeDelta(last.mainMetric, currentMetric, isHigherBetter(moduleId))  // positiv = besser
}

export function getModuleStats(moduleId) {
  const sessions = getModuleSessions(moduleId)
  if (sessions.length === 0) return null
  const hib     = isHigherBetter(moduleId)
  const metrics = sessions.map(s => s.mainMetric)
  const first  = metrics[0]
  const best   = bestMetric(metrics, hib)
  const latest = metrics[metrics.length - 1]
  const lastSession = sessions[sessions.length - 1]
  return {
    sessions: sessions.length,
    best,
    latest,
    higherIsBetter: hib,
    improvement: computeImprovement(first, latest, hib),
    last7: sessions.slice(-7),
    latestScore: lastSession.score ?? null,
    latestDuration: lastSession.duration ?? null,
  }
}

export function getWeeklyCount() {
  const weekAgo = dateKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  return loadSessions().filter(s => s.date >= weekAgo).length
}

export function getScheduledToday() {
  const schedule     = lv(SK.kognitivSchedule, {})
  const today        = todayKey()
  const dayOfWeek    = new Date().getDay()
  const doneTodayIds = loadSessions()
    .filter(s => s.date === today)
    .map(s => s.moduleId)

  return MODULE_ORDER.filter(id => {
    const cfg = schedule[id]
    if (!cfg || cfg.mode === 'free' || !cfg.mode) return false
    if (doneTodayIds.includes(id)) return false
    if (cfg.mode === 'scheduled') {
      if (!(cfg.days ?? []).includes(dayOfWeek)) return false
    }
    return true
  }).map(id => ({ moduleId: id, time: schedule[id].mode === 'scheduled' ? (schedule[id].time ?? null) : null }))
}

// ─── Einheit (Bundle) — abgeleitet aus Sessions via einheitComplete-Flag ──────
export function einheitenInRange(sessions, fromDateKey) {
  return sessions.filter(s => s.einheitComplete && s.date >= fromDateKey).length
}

// Fortlaufende Tage mit ≥1 abgeschlossener Einheit (verankert an heute, sonst gestern).
export function einheitStreak(sessions, today) {
  const days = new Set(sessions.filter(s => s.einheitComplete).map(s => s.date))
  if (days.size === 0) return 0
  const DAY = 24 * 60 * 60 * 1000
  const anchor = new Date(`${today}T00:00:00`)
  let cursor
  if (days.has(today)) cursor = anchor
  else {
    const yesterday = new Date(anchor.getTime() - DAY)
    if (days.has(dateKey(yesterday))) cursor = yesterday
    else return 0
  }
  let streak = 0
  while (days.has(dateKey(cursor))) {
    streak++
    cursor = new Date(cursor.getTime() - DAY)
  }
  return streak
}

// ─── Form (0–100, gegen eigene Bestform) ─────────────────────────────────────
export function formScore(recent, best, higherIsBetter) {
  if (!recent || !best) return 0
  const raw = higherIsBetter ? recent / best : best / recent
  return Math.max(0, Math.min(100, Math.round(raw * 100)))
}

// Rollender Schnitt der letzten ≤3 Werte gegen den Bestwert. Leere Historie → null.
export function moduleForm(metrics, higherIsBetter) {
  if (!metrics || metrics.length === 0) return null
  const best = bestMetric(metrics, higherIsBetter)
  const recentArr = metrics.slice(-3)
  const recent = recentArr.reduce((a, b) => a + b, 0) / recentArr.length
  return formScore(recent, best, higherIsBetter)
}

// Form je Profil-Domäne (Mittel der Modul-Formen mit Historie). Ohne Daten → null.
export function domainForm(sessions) {
  const out = {}
  for (const [domId, dom] of Object.entries(PROFILE_DOMAINS)) {
    const forms = dom.modules
      .map(mid => moduleForm(
        sessions.filter(s => s.moduleId === mid).map(s => s.mainMetric),
        MODULE_CONFIG[mid]?.higherIsBetter ?? false,
      ))
      .filter(v => v != null)
    out[domId] = forms.length ? Math.round(forms.reduce((a, b) => a + b, 0) / forms.length) : null
  }
  return out
}

// Persönliche Bestleistung? (strikt besser als alle bisherigen Werte)
export function isPersonalBest(prevMetrics, value, higherIsBetter) {
  if (value == null) return false
  if (!prevMetrics || prevMetrics.length === 0) return true
  const prevBest = bestMetric(prevMetrics, higherIsBetter)
  return higherIsBetter ? value > prevBest : value < prevBest
}
