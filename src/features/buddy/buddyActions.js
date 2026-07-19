// ─── Buddy-Action-Validierung (pur — Guard: buddyActions.test.js) ─────────
// Server-Actions sind Fremd-Input (KI-Antwort). Hier wird streng validiert
// und normalisiert; ausgeführt wird IMMER erst nach Nutzer-Bestätigung über
// die bestehenden Store-Pfade (BuddySheet). Unbekanntes fällt still weg.
import { getDurationKeys } from '../../utils'

const TEXT_MAX = 200
const ITEMS_MAX = 20

const cleanText = (s, max = TEXT_MAX) =>
  typeof s === 'string' ? s.trim().slice(0, max) : ''

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^(\d{1,2}):(\d{2})$/

const parseTime = (s) => {
  const m = TIME_RE.exec(typeof s === 'string' ? s : '')
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return { h, min }
}

// "08:30" → "8.5" — das Slot-Key-Format des days-Stores. Minuten außerhalb
// des Halbstunden-Rasters werden auf die letzte Rasterstelle abgerundet.
export const timeToSlotKey = (s) => {
  const t = parseTime(s)
  if (!t) return null
  return t.min >= 30 ? `${t.h}.5` : `${t.h}`
}

const slotKeyToTime = (key) => {
  const h = Math.trunc(parseFloat(key))
  const half = String(key).endsWith('.5')
  return `${String(h).padStart(2, '0')}:${half ? '30' : '00'}`
}

export const scheduleTargetFree = (days, date, slotKey, duration) => {
  const slots = days?.[date] ?? {}
  return getDurationKeys(slotKey, duration || 30).every(k => !slots[k])
}

export function validateAction(a) {
  if (!a || typeof a !== 'object') return null

  if (a.type === 'subtasks') {
    const items = (Array.isArray(a.items) ? a.items : [])
      .map(x => cleanText(x))
      .filter(Boolean)
      .slice(0, ITEMS_MAX)
    if (!items.length) return null
    const out = { type: 'subtasks', items }
    if (typeof a.todoId === 'string' && a.todoId) out.todoId = a.todoId
    return out
  }

  if (a.type === 'create_todo') {
    const text = cleanText(a.text)
    if (!text) return null
    const out = { type: 'create_todo', text }
    if (Number.isInteger(a.priority) && a.priority >= 1 && a.priority <= 3) out.priority = a.priority
    if (Number.isFinite(a.duration) && a.duration > 0 && a.duration <= 600) out.duration = Math.round(a.duration)
    if (typeof a.date === 'string' && DATE_RE.test(a.date)) out.date = a.date
    if (parseTime(a.time)) {
      const t = parseTime(a.time)
      out.time = `${String(t.h).padStart(2, '0')}:${String(t.min).padStart(2, '0')}`
    }
    return out
  }

  if (a.type === 'focus') {
    if (!Number.isFinite(a.minutes)) return null
    const out = { type: 'focus', minutes: Math.min(120, Math.max(5, Math.round(a.minutes))) }
    if (typeof a.todoId === 'string' && a.todoId) out.todoId = a.todoId
    if (cleanText(a.text)) out.text = cleanText(a.text)
    return out
  }

  if (a.type === 'schedule') {
    if (typeof a.todoId !== 'string' || !a.todoId) return null
    if (typeof a.date !== 'string' || !DATE_RE.test(a.date)) return null
    const slotKey = timeToSlotKey(a.time)
    if (slotKey == null) return null
    return { type: 'schedule', todoId: a.todoId, date: a.date, time: slotKeyToTime(slotKey), slotKey }
  }

  if (a.type === 'remember') {
    const text = cleanText(a.text)
    if (!text) return null
    return { type: 'remember', text }
  }

  return null
}
