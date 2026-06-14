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

// Selektoren
export const getExerciseById = (fitness, id) => fitness.exercises.find(e => e.id === id) ?? null
export const getActivePlan   = (fitness) => fitness.plans.find(p => p.id === fitness.meta.activePlanId) ?? null
