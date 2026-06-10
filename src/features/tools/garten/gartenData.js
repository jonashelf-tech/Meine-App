// src/features/tools/garten/gartenData.js
// Datenlayer des Garten-Begleiters. XP ist ABGELEITET aus vorhandenen App-Daten
// (kein Event-Tracking) und durch einen Ratchet (xpFloor) monoton — nie Rückschritt.
import { sv, lv, SK } from '../../../storage'
import { todayKey } from '../../../utils'
import { loadGrowth } from '../wachstum/growthData'

export const XP_WEIGHTS = { todo: 10, planerTag: 25, habitCheck: 5, journalTag: 15 }

export const MILESTONES = [
  { xp: 0,    type: 'stage', id: 'samen',          name: 'Samen' },
  { xp: 80,   type: 'stage', id: 'keimling',       name: 'Keimling' },
  { xp: 150,  type: 'deko',  id: 'steine',         name: 'Steine' },
  { xp: 250,  type: 'stage', id: 'spross',         name: 'Spross' },
  { xp: 450,  type: 'deko',  id: 'gluehwuermchen', name: 'Glühwürmchen' },
  { xp: 600,  type: 'stage', id: 'jungePflanze',   name: 'Junge Pflanze' },
  { xp: 900,  type: 'deko',  id: 'teich',          name: 'Teich' },
  { xp: 1200, type: 'stage', id: 'ersteBluete',    name: 'Erste Blüte' },
  { xp: 1700, type: 'deko',  id: 'schmetterling',  name: 'Schmetterling' },
  { xp: 2200, type: 'stage', id: 'beet',           name: 'Beet' },
  { xp: 3000, type: 'deko',  id: 'steinpfad',      name: 'Steinpfad' },
  { xp: 3800, type: 'stage', id: 'garten',         name: 'Garten' },
  { xp: 4800, type: 'deko',  id: 'sternschnuppe',  name: 'Sternschnuppe' },
  { xp: 6000, type: 'stage', id: 'lichtgarten',    name: 'Lichtgarten' },
]

const EMPTY = { xpFloor: 0, seenMilestones: 0 }
const loadState   = () => ({ ...EMPTY, ...lv(SK.garten, EMPTY) })
const trackingNow = () => lv(SK.erfolgeTracking, { tagesplanerDates: [] })

// ─── XP (pur, testbar) ────────────────────────────────────
export function computeRawXP(todos, tracking, growth) {
  const habitChecks = Object.values(growth.checks ?? {}).reduce((n, a) => n + a.length, 0)
  return XP_WEIGHTS.todo       * todos.filter(t => t.done).length
       + XP_WEIGHTS.planerTag  * (tracking.tagesplanerDates ?? []).length
       + XP_WEIGHTS.habitCheck * habitChecks
       + XP_WEIGHTS.journalTag * Object.keys(growth.journal ?? {}).length
}

export function todayRawXP(todos, tracking, growth, today) {
  return XP_WEIGHTS.todo       * todos.filter(t => t.done && (t.doneAt ?? '').startsWith(today)).length
       + XP_WEIGHTS.planerTag  * ((tracking.tagesplanerDates ?? []).includes(today) ? 1 : 0)
       + XP_WEIGHTS.habitCheck * (growth.checks?.[today] ?? []).length
       + XP_WEIGHTS.journalTag * (growth.journal?.[today] ? 1 : 0)
}

// ─── XP (storage-gebunden) ────────────────────────────────
export function displayXP(todos) {
  const raw   = computeRawXP(todos, trackingNow(), loadGrowth())
  const state = loadState()
  if (raw > state.xpFloor) {
    sv(SK.garten, { ...state, xpFloor: raw })
    return raw
  }
  return state.xpFloor
}

export function todayXP(todos) {
  return todayRawXP(todos, trackingNow(), loadGrowth(), todayKey())
}

export function xpBreakdown(todos) {
  const tracking    = trackingNow()
  const growth      = loadGrowth()
  const todosDone   = todos.filter(t => t.done).length
  const planerTage  = (tracking.tagesplanerDates ?? []).length
  const habitChecks = Object.values(growth.checks ?? {}).reduce((n, a) => n + a.length, 0)
  const journalTage = Object.keys(growth.journal ?? {}).length
  return [
    { id: 'todos',   label: 'Erledigte Todos',    count: todosDone,   each: XP_WEIGHTS.todo,       xp: todosDone   * XP_WEIGHTS.todo },
    { id: 'planer',  label: 'Tagesplaner-Tage',   count: planerTage,  each: XP_WEIGHTS.planerTag,  xp: planerTage  * XP_WEIGHTS.planerTag },
    { id: 'checks',  label: 'Gewohnheits-Checks', count: habitChecks, each: XP_WEIGHTS.habitCheck, xp: habitChecks * XP_WEIGHTS.habitCheck },
    { id: 'journal', label: 'Journal-Tage',       count: journalTage, each: XP_WEIGHTS.journalTag, xp: journalTage * XP_WEIGHTS.journalTag },
  ]
}

// ─── Meilensteine (pur) ───────────────────────────────────
export const reachedMilestones = (xp) => MILESTONES.filter(m => xp >= m.xp)
export const nextMilestone     = (xp) => MILESTONES.find(m => xp < m.xp) ?? null
export const stageNum          = (xp) => MILESTONES.filter(m => m.type === 'stage' && xp >= m.xp).length
export const currentStage      = (xp) => MILESTONES.filter(m => m.type === 'stage' && xp >= m.xp).at(-1)
export const reachedDekos      = (xp) => MILESTONES.filter(m => m.type === 'deko' && xp >= m.xp).map(m => m.id)

// ─── Neu-Hinweis (dezent, kein Zwang) ─────────────────────
export function unseenMilestones(xp) {
  return Math.max(0, reachedMilestones(xp).length - loadState().seenMilestones)
}
export function markMilestonesSeen(xp) {
  const state = loadState()
  const n = reachedMilestones(xp).length
  if (n !== state.seenMilestones) sv(SK.garten, { ...state, seenMilestones: n })
}

// ─── Tag/Nacht nach Uhrzeit — Inaktivität bleibt unsichtbar ──
export const isNight = (h = new Date().getHours()) => h >= 21 || h < 6
