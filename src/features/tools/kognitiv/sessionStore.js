import { sv, lv, SK } from '../../../storage'
import { dateKey, todayKey } from '../../../utils'
import { getTodayCheckin } from './checkinStore'
import { MODULE_ORDER, MODULE_CONFIG } from './moduleConfig'

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

export function createSession({ moduleId, variant, startedAt, duration, score, mainMetric, taps }) {
  return {
    id:        genId(),
    moduleId,
    variant,
    date:      dateKey(new Date(startedAt)),
    startedAt,
    duration,
    score,
    mainMetric,
    taps,
    checkinId: getTodayCheckin()?.id ?? null,
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
