// src/features/calendar/Blocker/blockerUtils.js
import { dateKey } from '../../../utils'

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

// ─── Factory ──────────────────────────────────────────────
export const createBlocker = (partial = {}) => ({
  id:         genId(),
  text:       '',
  color:      '#3b82f6',
  startHour:  9,
  endHour:    17,
  locked:     false,
  date:       null,       // "2026-05-23" — Anker für Wiederholung + einmalige Blocker
  repeat:     null,       // { type: 'daily'|'weekly'|'monthly'|'custom', every?, unit?, days? }
  endDate:    null,       // "2026-05-23" — Abschneidedatum für wiederkehrende
  exceptions: [],         // ["2026-05-23"] — übersprungene Instanzen
  ...partial,
})

// ─── Query ────────────────────────────────────────────────
function isActiveOn(b, dateStr) {
  const d   = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  if (b.exceptions?.includes(dateStr)) return false
  if (b.endDate && dateStr >= b.endDate) return false
  if (!b.repeat) return b.date === dateStr
  if (b.repeat.type === 'daily')    return true
  if (b.repeat.type === 'workdays') return dow >= 1 && dow <= 5
  if (b.repeat.type === 'weekly')   return b.repeat.days?.includes(dow) ?? false
  if (b.repeat.type === 'monthly') {
    if (!b.date) return true
    return d.getDate() === new Date(b.date + 'T00:00:00').getDate()
  }
  if (b.repeat.type === 'custom') {
    if (!b.date) return true
    const anchor = new Date(b.date + 'T00:00:00')
    // round statt floor: lokale Mitternachten liegen über die Sommerzeit-
    // Umstellung ±1h auseinander — floor ließe custom-Blocker ab Ende März
    // dauerhaft einen Tag verrutschen.
    const diff = Math.round((d - anchor) / 86400000)
    if (diff < 0) return false
    const { every: ev = 1, unit = 'days' } = b.repeat
    const step = unit === 'months' ? ev * 30 : unit === 'weeks' ? ev * 7 : ev
    return diff % step === 0
  }
  return false
}

// Gibt alle Blocker zurück die an dateStr aktiv sind.
// Overnight-Blocker (startHour > endHour) werden als zwei normalisierte
// Objekte geliefert: '_overnight: start' (Starttag bis 24) und
// '_overnight: end' (Folgetag ab 0), mit _origStart/_origEnd für die Anzeige.
export function getBlockersForDate(allBlockers, dateStr) {
  if (!dateStr) return []

  const prevD = new Date(dateStr + 'T00:00:00')
  prevD.setDate(prevD.getDate() - 1)
  const prevDateStr = dateKey(prevD)   // lokal — toISOString() wäre in +TZ ein Tag zu früh

  const result = []
  for (const b of allBlockers) {
    const overnight = b.startHour > b.endHour
    if (isActiveOn(b, dateStr)) {
      if (overnight) {
        result.push({ ...b, endHour: 24, _overnight: 'start', _origEnd: b.endHour })
      } else {
        result.push(b)
      }
    }
    if (overnight && isActiveOn(b, prevDateStr)) {
      result.push({ ...b, startHour: 0, _overnight: 'end', _origStart: b.startHour })
    }
  }
  return result
}

// Gibt den Blocker zurück der die Stunde hour (ganzzahlig) enthält, sonst null
export function getBlockerForHour(hour, blockersForDate) {
  return blockersForDate.find(b => hour >= b.startHour && hour < b.endHour) ?? null
}

// ─── Mutations (geben neue Objekte zurück, nie mutieren) ──
// Nur diese Instanz löschen — fügt dateStr zu exceptions hinzu
export function deleteBlockerInstance(blocker, dateStr) {
  return { ...blocker, exceptions: [...(blocker.exceptions ?? []), dateStr] }
}

// Diese und alle zukünftigen Instanzen löschen — setzt endDate
export function deleteBlockerFuture(blocker, dateStr) {
  return { ...blocker, endDate: dateStr }
}

// ─── Formatierung ─────────────────────────────────────────
// Dezimalstunde → "HH:MM" (9 → "09:00", 9.5 → "09:30")
export function formatHour(h) {
  const hh = Math.floor(h)
  const mm  = h % 1 === 0.5 ? '30' : '00'
  return `${String(hh).padStart(2, '0')}:${mm}`
}

// "HH:MM" → Dezimalstunde ("09:30" → 9.5)
export function parseHourStr(str) {
  const [h, m] = str.split(':').map(Number)
  return h + (m === 30 ? 0.5 : 0)
}
