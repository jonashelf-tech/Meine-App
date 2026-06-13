import { getToolColor } from '../../../utils'

// Gemeinsame Konstanten + pure Helfer für Woche/Monat/DayPanel.
export const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export const SLOT_H = 28

export function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function slotToTop(slotKey, start) {
  return (parseFloat(slotKey) - start) * 2 * SLOT_H
}

export function slotToHeight(duration) {
  return Math.max(10, Math.round(((duration ?? 30) / 30) * SLOT_H))
}

// Überlappen sich zwei Zeitblöcke (Start in Dezimalstunden, Dauer in Minuten)?
export function blocksOverlap(start1, dur1, start2, dur2) {
  const end1 = start1 + (dur1 || 30) / 60
  const end2 = start2 + (dur2 || 30) / 60
  return start1 < end2 && start2 < end1
}

// Kollidiert ein Block (startKey + duration) mit einem belegten Slot des Tages?
// ignoreKey = der gerade gezogene Slot (zählt nicht als Kollision mit sich selbst).
export function rangeBlocked(dayObj, startKey, duration, ignoreKey) {
  const s0 = parseFloat(startKey)
  for (const [k, sl] of Object.entries(dayObj || {})) {
    if (!sl || k === ignoreKey) continue
    if (blocksOverlap(s0, duration, parseFloat(k), sl.duration)) return true
  }
  return false
}

export function getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions, growthDoneDates) {
  const dots = []

  if (activeTools.includes('gewicht')) {
    if (weightEntries.some(e => e.date === dk))
      dots.push({ id: 'gewicht', color: getToolColor('gewicht', toolColors) })
  }

  if (activeTools.includes('haushalt')) {
    if (todos.some(t => t.toolId === 'haushalt' && t.createdAt?.startsWith(dk)))
      dots.push({ id: 'haushalt', color: getToolColor('haushalt', toolColors) })
  }

  if (activeTools.includes('reminder')) {
    const hasTodo = todos.some(t => t.reminderItemId && t.createdAt?.startsWith(dk))
    const hasSlot = Object.values(days[dk] ?? {}).some(s => s.reminderItemId)
    if (hasTodo || hasSlot)
      dots.push({ id: 'reminder', color: getToolColor('reminder', toolColors) })
  }

  if (activeTools.includes('kognitiv') && kognitivSessions) {
    if (kognitivSessions.some(s => s.date === dk))
      dots.push({ id: 'kognitiv', color: getToolColor('kognitiv', toolColors) })
  }

  if (activeTools.includes('growth') && growthDoneDates) {
    if (growthDoneDates.includes(dk))
      dots.push({ id: 'growth', color: getToolColor('growth', toolColors) })
  }

  return dots
}

export function getCellBars(dk, days, todos, showTools) {
  const slots = days[dk] ?? {}
  return Object.entries(slots)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([, slot]) => {
      const todo   = slot.todoId ? todos.find(t => t.id === slot.todoId) : null
      const isTool = Boolean(todo?.toolId)
      return { text: slot.text, color: slot.color || 'var(--primary)', isTodo: Boolean(slot.todoId), isTool }
    })
    .filter(bar => showTools || !bar.isTool)
}
