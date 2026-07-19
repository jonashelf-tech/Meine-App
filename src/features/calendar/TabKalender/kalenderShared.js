import { getToolColor, dateKey } from '../../../utils'

// createdAt ist ein UTC-ISO-Zeitstempel; ein Vergleich per startsWith(localDateKey)
// verschöbe den Tool-Punkt in UTC+X für nachts erstellte Todos um einen Tag.
// Immer über den lokalen Datums-Key vergleichen (Konvention wie kognitiv/sessionStore).
const createdOnLocalDay = (createdAt, dk) => !!createdAt && dateKey(new Date(createdAt)) === dk

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
  // Dauer nach unten auf 1 min klemmen: eine negative Dauer würde end < start
  // erzeugen und die Überlappungsprüfung invertieren (Kollisionen unerkannt).
  const end1 = start1 + Math.max(1, dur1 || 30) / 60
  const end2 = start2 + Math.max(1, dur2 || 30) / 60
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

export function getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions, fitnessSessions = [], growthDoneDates) {
  const dots = []

  if (activeTools.includes('fitness')) {
    const hasWeight  = weightEntries.some(e => e.date === dk)
    const hasSession = fitnessSessions.some(s => s.date === dk)
    if (hasWeight || hasSession)
      dots.push({ id: 'fitness', color: getToolColor('fitness', toolColors) })
  }

  if (activeTools.includes('haushalt')) {
    if (todos.some(t => t.toolId === 'haushalt' && createdOnLocalDay(t.createdAt, dk)))
      dots.push({ id: 'haushalt', color: getToolColor('haushalt', toolColors) })
  }

  if (activeTools.includes('reminder')) {
    const hasTodo = todos.some(t => t.reminderItemId && createdOnLocalDay(t.createdAt, dk))
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

// calList/calFilter sind optional: ohne calFilter bleibt alles sichtbar, ohne
// calList fällt das Emoji geteilter Einträge auf 👥 zurück (wie getCalItemsForDate).
export function getCellBars(dk, days, todos, showTools, calList, calFilter) {
  const slots = days[dk] ?? {}
  return Object.entries(slots)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([, slot]) => {
      const todo   = slot.todoId ? todos.find(t => t.id === slot.todoId) : null
      const isTool = Boolean(todo?.toolId)
      const cal    = todo?.cal ?? null
      return {
        text: slot.text, color: slot.color || 'var(--primary)',
        isTodo: Boolean(slot.todoId), isTool,
        cal, emoji: calEmoji(calList, cal),
      }
    })
    .filter(bar => showTools || !bar.isTool)
    .filter(bar => isEntryShown(calFilter, bar.cal))
}

// ─── Geteilte Kalender: additiver Lesepfad (teilen-spec.md §8.2) ──────
// Der globale calFilter ({ privat, cals: { [id]: { show, activity } } })
// steuert ALLE Ansichten gleich. Default überall sichtbar.

export function isCalShown(calFilter, calId) {
  return calFilter?.cals?.[calId]?.show !== false
}

export function isPrivatShown(calFilter) {
  return calFilter?.privat !== false
}

// Jeder Eintrag folgt dem Chip seines Kalenders — privat (cal null) dem
// Privat-Chip. Ein Slot ohne todoId (Woche-Termin) zählt als privat.
export function isEntryShown(calFilter, calId) {
  return calId ? isCalShown(calFilter, calId) : isPrivatShown(calFilter)
}

// Kalender-Kennung: Emoji des Kalenders (Default 👥), null bei privat.
export function calEmoji(calList, calId) {
  return calId ? (calList?.[calId]?.emoji ?? '👥') : null
}

// Geteilte Termine eines Tages (Muster Geburtstags-Allday): rein, filtert
// über calFilter, löst das Kalender-Emoji aus calList auf (Default 👥).
// Slot-Platzierung/Dedup gegen eigene `days`-Slots bleibt Sache der View —
// hier kommt der volle geteilte Bestand des Tages zurück.
// Sortierung: ohne Uhrzeit zuerst, dann aufsteigend nach time.
export function getCalItemsForDate(todos, calList, calFilter, dk) {
  const out = []
  for (const t of todos) {
    if (!t.cal || t.date !== dk) continue
    if (!isCalShown(calFilter, t.cal)) continue
    out.push({ ...t, emoji: calList?.[t.cal]?.emoji ?? '👥' })
  }
  return out.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
}

// Die additive Hälfte des Lesepfads: geteilte Termine des Tages, die NICHT
// schon als eigener Slot im Plan stehen (Dedup über todoId) und nicht erledigt
// sind. Genau das, was eine Ansicht zusätzlich zu ihren `days`-Slots zeigt.
export function getUnplacedCalItems(todos, calList, calFilter, dk, daySlots) {
  const placed = new Set(
    Object.values(daySlots || {}).map(sl => sl?.todoId).filter(Boolean)
  )
  return getCalItemsForDate(todos, calList, calFilter, dk)
    .filter(it => !placed.has(it.id) && !it.done)
}
