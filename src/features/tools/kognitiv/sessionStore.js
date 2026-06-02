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

export function seedDemoSessions() {
  if (loadSessions().length > 0) return
  const day = (offset) => {
    const d = new Date(); d.setDate(d.getDate() - offset)
    return d.toISOString().slice(0, 10)
  }
  const tap = (time, correct = true, target) => ({ time, correct, target })
  // Zahlensuche: Tap pro Zahl (mit index) + optionale Fehl-Taps für die Balken-Auswertung
  const zsTaps = (avgTime, total, errAt = []) => {
    const out = []
    for (let i = 0; i < total; i++) {
      if (errAt.includes(i)) out.push({ index: i, target: i + 1, got: i + 3, correct: false, time: 0.5 })
      const t = +(avgTime + Math.sin(i * 1.7) * avgTime * 0.4).toFixed(2)
      out.push({ index: i, target: i + 1, got: i + 1, correct: true, time: Math.max(0.4, t) })
    }
    return out
  }
  const demos = [
    // alertness – 3 sessions
    { moduleId: 'alertness', variant: 'Ohne Ton', date: day(6), startedAt: `${day(6)}T09:12:00.000Z`, duration: 148, score: { correct: 18, errors: 1, misses: 1 }, mainMetric: 378, taps: [tap(0.41), tap(0.35), tap(0.38), tap(0.44), tap(0.36), tap(0.42), tap(0.33), tap(0.40), tap(0.38), tap(0.46), tap(null, false), tap(0.37), tap(0.35), tap(0.41), tap(0.39), tap(0.43), tap(0.36), tap(0.38)] },
    { moduleId: 'alertness', variant: 'Ohne Ton', date: day(3), startedAt: `${day(3)}T10:05:00.000Z`, duration: 143, score: { correct: 19, errors: 1, misses: 0 }, mainMetric: 354, taps: [tap(0.38), tap(0.33), tap(0.35), tap(0.42), tap(0.31), tap(0.39), tap(0.36), tap(0.34), tap(0.37), tap(0.40), tap(0.33), tap(0.35), tap(0.38), tap(0.32), tap(null, false), tap(0.36), tap(0.34), tap(0.37), tap(0.35)] },
    { moduleId: 'alertness', variant: 'Ohne Ton', date: day(1), startedAt: `${day(1)}T08:47:00.000Z`, duration: 141, score: { correct: 19, errors: 0, misses: 1 }, mainMetric: 338, taps: [tap(0.35), tap(0.31), tap(0.34), tap(0.38), tap(0.30), tap(0.36), tap(0.33), tap(0.32), tap(0.35), tap(0.37), tap(0.29), tap(0.33), tap(0.36), tap(0.31), tap(0.34), tap(0.32), tap(0.35), tap(0.30), tap(0.33)] },
    // zahlensuche – 2 sessions
    { moduleId: 'zahlensuche', variant: 'Normal', date: day(5), startedAt: `${day(5)}T11:00:00.000Z`, duration: 93, score: { correct: 25, errors: 2, total: 25 }, mainMetric: 93, taps: zsTaps(3.7, 25, [7, 18]) },
    { moduleId: 'zahlensuche', variant: 'Normal', date: day(1), startedAt: `${day(1)}T11:20:00.000Z`, duration: 81, score: { correct: 25, errors: 1, total: 25 }, mainMetric: 81, taps: zsTaps(3.24, 25, [11]) },
    // gedaechtnis – 2 sessions
    { moduleId: 'gedaechtnis', variant: 'Normal', date: day(4), startedAt: `${day(4)}T09:30:00.000Z`, duration: 210, score: { correctRounds: 6, mistakes: 3 }, mainMetric: 6, taps: [] },
    { moduleId: 'gedaechtnis', variant: 'Normal', date: day(1), startedAt: `${day(1)}T09:45:00.000Z`, duration: 224, score: { correctRounds: 8, mistakes: 2 }, mainMetric: 8, taps: [] },
    // gonogo – 3 sessions
    { moduleId: 'gonogo', variant: 'Normal', date: day(5), startedAt: `${day(5)}T14:10:00.000Z`, duration: 182, score: { correct: 34, falseAlarms: 4, misses: 2 }, mainMetric: 312, taps: [tap(0.32), tap(0.29), tap(0.34), tap(null, false), tap(0.31), tap(0.28), tap(0.33), tap(0.30), tap(null, false), tap(0.27), tap(0.31), tap(0.30)] },
    { moduleId: 'gonogo', variant: 'Normal', date: day(2), startedAt: `${day(2)}T14:25:00.000Z`, duration: 178, score: { correct: 36, falseAlarms: 2, misses: 2 }, mainMetric: 291, taps: [tap(0.30), tap(0.27), tap(0.31), tap(0.28), tap(0.26), tap(null, false), tap(0.29), tap(0.28), tap(0.30), tap(0.27), tap(0.31), tap(0.28)] },
    { moduleId: 'gonogo', variant: 'Normal', date: day(1), startedAt: `${day(1)}T13:58:00.000Z`, duration: 174, score: { correct: 37, falseAlarms: 2, misses: 1 }, mainMetric: 278, taps: [tap(0.28), tap(0.26), tap(0.29), tap(0.27), tap(0.25), tap(0.28), tap(0.26), tap(null, false), tap(0.27), tap(0.25), tap(0.28), tap(0.26), tap(0.27)] },
    // nback – 2 sessions
    { moduleId: 'nback', variant: 'Normal', date: day(4), startedAt: `${day(4)}T16:00:00.000Z`, duration: 195, score: { hits: 26, errors: 5, misses: 3 }, mainMetric: 74, taps: [] },
    { moduleId: 'nback', variant: 'Normal', date: day(1), startedAt: `${day(1)}T16:15:00.000Z`, duration: 192, score: { hits: 29, errors: 3, misses: 2 }, mainMetric: 83, taps: [] },
    // taskswitching – 2 sessions
    { moduleId: 'taskswitching', variant: 'Normal', date: day(3), startedAt: `${day(3)}T15:30:00.000Z`, duration: 225, score: { correct: 28, errors: 6 }, mainMetric: 162, taps: [] },
    { moduleId: 'taskswitching', variant: 'Normal', date: day(1), startedAt: `${day(1)}T15:45:00.000Z`, duration: 218, score: { correct: 31, errors: 4 }, mainMetric: 138, taps: [] },
    // geteilt – 2 sessions
    { moduleId: 'geteilt', variant: 'Normal', date: day(2), startedAt: `${day(2)}T17:00:00.000Z`, duration: 175, score: { hits: 44, errors: 7 }, mainMetric: 76, taps: [] },
    { moduleId: 'geteilt', variant: 'Normal', date: day(1), startedAt: `${day(1)}T17:10:00.000Z`, duration: 171, score: { hits: 48, errors: 5 }, mainMetric: 83, taps: [] },
  ]
  const withIds = demos.map(d => ({ ...d, id: crypto.randomUUID?.() ?? `demo-${Math.random().toString(36).slice(2)}`, checkinId: null }))
  sv(SK.kognitiv, withIds)
}

export function getScheduledToday() {
  const schedule   = lv(SK.kognitivSchedule, {})
  const today      = new Date().toISOString().slice(0, 10)
  const dayOfWeek  = new Date().getDay()
  const doneTodayIds = loadSessions()
    .filter(s => s.date === today)
    .map(s => s.moduleId)

  return MODULE_ORDER.filter(id => {
    const cfg = schedule[id]
    if (!cfg || cfg.mode !== 'scheduled') return false
    if (!(cfg.days ?? []).includes(dayOfWeek)) return false
    if (doneTodayIds.includes(id)) return false
    return true
  }).map(id => ({ moduleId: id, time: schedule[id].time ?? null }))
}
