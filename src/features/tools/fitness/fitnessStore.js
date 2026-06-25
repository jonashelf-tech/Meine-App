import { sv, lv, SK } from '../../../storage'
import { DEFAULT_INCREMENTS, WARMUP_SCHEME, ZIEL_RIR } from './fitnessModel'
import { EXERCISE_SEED } from './exerciseSeed'

const DEFAULT_SETTINGS = {
  restTimerEnabled: true,
  restTimerSec: 120,
  increments: { ...DEFAULT_INCREMENTS },
  warmupScheme: WARMUP_SCHEME.map(s => ({ ...s })),
  feedbackMode: 'rir',
  zielRir: [...ZIEL_RIR],
  rhythm: null, // null = kein fester Rhythmus; sonst { on, off } für den Heute-Hinweis
  schedule: { mode: 'flex' }, // { mode:'flex' } | { mode:'fixed', days:[1..7] } (ISO-Wochentag, Mo=1..So=7)
}
const DEFAULT_META = { activePlanId: null, planCursor: {}, seeded: false, exerciseMetaVersion: 0 }

// Hochzählen, wenn der Seed neue Übungs-Metadaten (pattern/Ratings) bekommt,
// die per Migration in vorhandene Seed-Übungen gemerged werden sollen.
const EXERCISE_META_VERSION = 1

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

export function saveSettings(patch) {
  const f = loadFitness()
  const settings = { ...f.settings, ...patch }
  saveFitness({ ...f, settings })
  return settings
}

const SEED_BY_ID = new Map(EXERCISE_SEED.map(e => [e.id, e]))

// Additive, idempotente Migration: mergt pattern + Ratings aus dem Seed in
// vorhandene Seed-Übungen (custom=false). Eigene Übungen kriegen nur fehlende
// Felder mit Defaults — Edits bleiben unangetastet.
function migrateExerciseMeta(f) {
  if ((f.meta.exerciseMetaVersion ?? 0) >= EXERCISE_META_VERSION) return f
  const exercises = f.exercises.map(ex => {
    const seed = ex.custom === false ? SEED_BY_ID.get(ex.id) : null
    if (seed) {
      return { ...ex, pattern: seed.pattern, stabilitaet: seed.stabilitaet, dehnung: seed.dehnung, last: seed.last }
    }
    return {
      ...ex,
      stabilitaet: ex.stabilitaet ?? 3,
      dehnung: ex.dehnung ?? 3,
      last: ex.last ?? 3,
      pattern: ex.pattern ?? null,
    }
  })
  return { ...f, exercises, meta: { ...f.meta, exerciseMetaVersion: EXERCISE_META_VERSION } }
}

export function ensureSeeded() {
  let f = loadFitness()
  let changed = false

  // Fehlende Seed-Übungen (neue IDs) ergänzen — auch für bereits geseedete Nutzer.
  const existingIds = new Set(f.exercises.map(e => e.id))
  const toAdd = EXERCISE_SEED.filter(e => !existingIds.has(e.id))
  if (toAdd.length || !f.meta.seeded) {
    f = { ...f, exercises: [...f.exercises, ...toAdd], meta: { ...f.meta, seeded: true } }
    changed = true
  }

  const migrated = migrateExerciseMeta(f)
  if (migrated !== f) { f = migrated; changed = true }

  if (changed) saveFitness(f)
  return f
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
