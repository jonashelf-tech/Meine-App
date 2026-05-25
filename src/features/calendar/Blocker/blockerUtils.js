// src/features/calendar/Blocker/blockerUtils.js

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
// Gibt alle Blocker zurück die an dateStr aktiv sind
export function getBlockersForDate(allBlockers, dateStr) {
  if (!dateStr) return []
  const d   = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay() // 0=So, 1=Mo, ..., 6=Sa
  return allBlockers.filter(b => {
    if (b.exceptions?.includes(dateStr)) return false
    if (b.endDate && dateStr >= b.endDate) return false
    if (!b.repeat) return b.date === dateStr
    if (b.repeat.type === 'daily')    return true
    if (b.repeat.type === 'workdays') return dow >= 1 && dow <= 5
    if (b.repeat.type === 'weekly')   return b.repeat.days?.includes(dow) ?? false
    return false
  })
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
