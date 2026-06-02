import { sv, lv, SK } from '../../../storage'
import { getTodayCheckin } from './checkinStore'
import { MODULE_ORDER } from './moduleConfig'

const PRACTICE_KEY = 'adhs_kognitiv_practice'

function currentISOWeek() {
  const d = new Date()
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return `${d.getUTCFullYear()}-W${Math.ceil(((d - yearStart) / 86400000 + 1) / 7)}`
}

export function isPracticeAvailable(moduleId) {
  const data = lv(PRACTICE_KEY) ?? {}
  return data[moduleId] !== currentISOWeek()
}

export function markPracticeUsed(moduleId) {
  const data = lv(PRACTICE_KEY) ?? {}
  sv(PRACTICE_KEY, { ...data, [moduleId]: currentISOWeek() })
}

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
    checkinId: getTodayCheckin()?.id ?? null,
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
  const lastSession = sessions[sessions.length - 1]
  return {
    sessions: sessions.length,
    best,
    latest,
    improvement: first - latest,
    last7: sessions.slice(-7),
    latestScore: lastSession.score ?? null,
    latestDuration: lastSession.duration ?? null,
  }
}

export function getWeeklyCount() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return loadSessions().filter(s => s.date >= weekAgo).length
}

export function getScheduledToday() {
  const schedule     = lv(SK.kognitivSchedule, {})
  const today        = new Date().toISOString().slice(0, 10)
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
