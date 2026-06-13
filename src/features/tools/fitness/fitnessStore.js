import { sv, lv, SK } from '../../../storage'
import { DEFAULT_INCREMENTS, WARMUP_SCHEME, ZIEL_RIR } from './fitnessModel'

const DEFAULT_SETTINGS = {
  restTimerEnabled: true,
  increments: { ...DEFAULT_INCREMENTS },
  warmupScheme: WARMUP_SCHEME.map(s => ({ ...s })),
  feedbackMode: 'chips',
  zielRir: [...ZIEL_RIR],
}
const DEFAULT_META = { activePlanId: null, planCursor: {} }

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
