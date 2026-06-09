// src/features/tools/wachstum/growthData.js
// Datenlayer für das Wachstum-Tool (Gewohnheiten + Journal).
// Cross-Tool-Lesen (TabHeute-Widget, Kalender-DayPanel) läuft über dieses Modul,
// nie roh über localStorage.
import { sv, lv, SK } from '../../../storage'
import { dateKey } from '../../../utils'

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const EMPTY = { habits: [], checks: {}, journal: {} }

// ─── Laden / Speichern ────────────────────────────────────
export function loadGrowth() {
  const d = lv(SK.wachstum, EMPTY)
  return {
    habits:  Array.isArray(d?.habits) ? d.habits : [],
    checks:  d?.checks  && typeof d.checks  === 'object' ? d.checks  : {},
    journal: d?.journal && typeof d.journal === 'object' ? d.journal : {},
  }
}

export function saveGrowth(next) {
  sv(SK.wachstum, next)
}

export function createHabit({ text, identity = '' }) {
  return {
    id:        genId(),
    text:      text.trim(),
    identity:  identity.trim(),
    createdAt: new Date().toISOString(),
    archived:  false,
  }
}

export function activeHabits(data) {
  return data.habits.filter(h => !h.archived)
}

// ─── Gewohnheits-Checks ───────────────────────────────────
export function isChecked(data, dateStr, habitId) {
  return (data.checks[dateStr] ?? []).includes(habitId)
}

export function toggleCheck(data, dateStr, habitId) {
  const day  = data.checks[dateStr] ?? []
  const next = day.includes(habitId) ? day.filter(id => id !== habitId) : [...day, habitId]
  const checks = { ...data.checks }
  if (next.length) checks[dateStr] = next
  else delete checks[dateStr]
  return { ...data, checks }
}

// Letzte N Tage als [{ date, done }] — heute zuletzt (für Heatmap)
export function heatmap(data, habitId, days = 30) {
  const out  = []
  const base = new Date(); base.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i)
    const ds = dateKey(d)
    out.push({ date: ds, done: (data.checks[ds] ?? []).includes(habitId) })
  }
  return out
}

// Konsistenz-Rate (0..1) über die letzten N Tage, frühestens ab Anlage.
// Bewusst KEIN Streak — ein verpasster Tag setzt nichts auf 0 zurück.
export function consistency(data, habit, days = 30) {
  const created = (habit.createdAt ?? '').slice(0, 10)
  const base = new Date(); base.setHours(0, 0, 0, 0)
  let total = 0, done = 0
  for (let i = 0; i < days; i++) {
    const d  = new Date(base); d.setDate(d.getDate() - i)
    const ds = dateKey(d)
    if (created && ds < created) break
    total++
    if ((data.checks[ds] ?? []).includes(habit.id)) done++
  }
  return total ? done / total : 0
}

// ─── Journal ──────────────────────────────────────────────
export function getJournal(data, dateStr) {
  return data.journal[dateStr] ?? ''
}

export function setJournal(data, dateStr, text) {
  const journal = { ...data.journal }
  if (text.trim()) journal[dateStr] = text
  else delete journal[dateStr]
  return { ...data, journal }
}

// ─── Tages-Zusammenfassung (Kalender-DayPanel) ────────────
export function getDaySummary(dateStr) {
  const data       = loadGrowth()
  const checkedIds = data.checks[dateStr] ?? []
  return {
    journal: data.journal[dateStr] ?? '',
    habits:  data.habits.filter(h => checkedIds.includes(h.id)),
  }
}
