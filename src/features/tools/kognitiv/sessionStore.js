import { sv, lv, SK } from '../../../storage'

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
    date:      startedAt.slice(0, 10),
    startedAt,
    duration,
    score,
    mainMetric,
    taps,
  }
}

export function isDoneToday(moduleId) {
  const today = new Date().toISOString().slice(0, 10)
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
  return last.mainMetric - currentMetric   // positive = got faster/better
}

export function getModuleStats(moduleId) {
  const sessions = getModuleSessions(moduleId)
  if (sessions.length === 0) return null
  const metrics = sessions.map(s => s.mainMetric)
  const first  = metrics[0]
  const best   = Math.min(...metrics)
  const latest = metrics[metrics.length - 1]
  return {
    sessions: sessions.length,
    best,
    latest,
    improvement: first - latest,   // positive = got faster/better
    last7: sessions.slice(-7),
  }
}

export function getWeeklyCount() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return loadSessions().filter(s => s.date >= weekAgo).length
}
