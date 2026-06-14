import { sv, lv, SK } from '../../../storage'
import { DEFAULT_INCREMENTS, WARMUP_SCHEME, ZIEL_RIR } from './fitnessModel'
import { EXERCISE_SEED } from './exerciseSeed'

const DEFAULT_SETTINGS = {
  restTimerEnabled: true,
  increments: { ...DEFAULT_INCREMENTS },
  warmupScheme: WARMUP_SCHEME.map(s => ({ ...s })),
  feedbackMode: 'chips',
  zielRir: [...ZIEL_RIR],
}
const DEFAULT_META = { activePlanId: null, planCursor: {}, seeded: false }

const DEFAULT_FITNESS = { exercises: [], plans: [], settings: DEFAULT_SETTINGS, meta: DEFAULT_META }

export function loadFitness() {
  const raw = lv(SK.fitness, null)
  if (!raw) return { ...DEFAULT_FITNESS, settings: { ...DEFAULT_SETTINGS }, meta: { ...DEFAULT_META } }
  return {
    exercises: Array.isArray(raw.exercises) ? raw.exercises : [],
    plans: Array.isArray(raw.plans) ? raw.plans : [],
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    meta: { ...DEFAULT_META, ...(raw.meta ?? {}) },
  }
}

export function saveFitness(next) { sv(SK.fitness, next) }

export function ensureSeeded() {
  const f = loadFitness()
  if (f.meta.seeded) return f
  const existingIds = new Set(f.exercises.map(e => e.id))
  const toAdd = EXERCISE_SEED.filter(e => !existingIds.has(e.id))
  const next = { ...f, exercises: [...f.exercises, ...toAdd], meta: { ...f.meta, seeded: true } }
  saveFitness(next)
  return next
}

export function loadSessions() {
  const raw = lv(SK.fitnessSessions, [])
  return Array.isArray(raw) ? raw : []
}

export function saveSessions(list) { sv(SK.fitnessSessions, list) }

export function addSession(session) {
  saveSessions([...loadSessions(), session])
}

export function saveExercise(exercise) {
  const f = loadFitness()
  const idx = f.exercises.findIndex(e => e.id === exercise.id)
  const exercises = idx >= 0 ? f.exercises.map((e, i) => i === idx ? exercise : e) : [...f.exercises, exercise]
  saveFitness({ ...f, exercises })
  return exercises
}

export function deleteExercise(id) {
  const f = loadFitness()
  const exercises = f.exercises.filter(e => e.id !== id)
  saveFitness({ ...f, exercises })
  return exercises
}

export function savePlan(plan) {
  const f = loadFitness()
  const idx = f.plans.findIndex(p => p.id === plan.id)
  const plans = idx >= 0 ? f.plans.map((p, i) => i === idx ? plan : p) : [...f.plans, plan]
  saveFitness({ ...f, plans })
  return plans
}

export function deletePlan(id) {
  const f = loadFitness()
  const plans = f.plans.filter(p => p.id !== id)
  const meta = f.meta.activePlanId === id ? { ...f.meta, activePlanId: null } : f.meta
  saveFitness({ ...f, plans, meta })
  return { plans, meta }
}

export function setActivePlan(id) {
  const f = loadFitness()
  const meta = { ...f.meta, activePlanId: id }
  saveFitness({ ...f, meta })
  return meta
}

export function setSessionPain(sessionId, exerciseIds) {
  const list = loadSessions().map(s => s.id === sessionId
    ? { ...s, pain: Object.fromEntries(exerciseIds.map(id => [id, true])) } : s)
  saveSessions(list)
}

// Jüngste Session mit dieser Übung entscheidet, ob zuletzt Schmerz gemeldet wurde.
export function lastSessionPain(exerciseId) {
  const list = loadSessions()
  for (let i = list.length - 1; i >= 0; i--) {
    const had = list[i].pain && list[i].pain[exerciseId]
    if (list[i].exercises?.some(e => e.exerciseId === exerciseId)) return !!had
  }
  return false
}

// Selektoren
export const getExerciseById = (fitness, id) => fitness.exercises.find(e => e.id === id) ?? null
export const getActivePlan   = (fitness) => fitness.plans.find(p => p.id === fitness.meta.activePlanId) ?? null

const WORKING_TYPES = ['normal', 'dropset', 'failure']

// Letzte Arbeitssätze einer Übung aus der Historie (chronologisch gespeichert).
export function lastSetsFor(exerciseId) {
  const sessions = loadSessions()
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ex = sessions[i].exercises?.find(e => e.exerciseId === exerciseId)
    const working = (ex?.saetze ?? []).filter(s => WORKING_TYPES.includes(s.satzTyp))
    if (working.length) return working
  }
  return []
}

// planCursor auf den nächsten Tag schieben (mod Tageszahl).
export function advancePlanCursor(planId, daysLength) {
  const f = loadFitness()
  if (!planId || !daysLength) return f.meta
  const cur = f.meta.planCursor[planId] ?? 0
  const meta = { ...f.meta, planCursor: { ...f.meta.planCursor, [planId]: (cur + 1) % daysLength } }
  saveFitness({ ...f, meta })
  return meta
}

// Aktueller Plan-Tag laut Cursor.
export function currentDay(fitness) {
  const plan = getActivePlan(fitness)
  if (!plan || !plan.days.length) return { plan: null, day: null, dayIndex: 0 }
  const dayIndex = (fitness.meta.planCursor[plan.id] ?? 0) % plan.days.length
  return { plan, day: plan.days[dayIndex], dayIndex }
}
