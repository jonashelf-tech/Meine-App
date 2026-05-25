// ─── Storage keys ─────────────────────────────────────────
export const REMINDER_KEY           = 'adhs_reminder_v1'
export const REMINDER_DISMISSED_KEY = 'adhs_reminder_dismissed'

// ─── Curated items ────────────────────────────────────────
export const CURATED = [
  { id: 'wasser',    text: 'Wasser trinken',        icon: '💧', interval: { every: 1,  unit: 'days'   }, time: '08:00', actionType: 'slot', color: '#00CFFF' },
  { id: 'pause',     text: 'Pause einlegen',         icon: '☕', interval: { every: 1,  unit: 'days'   }, time: '15:00', actionType: 'slot', color: '#BF00FF' },
  { id: 'essen',     text: 'Mittagessen',            icon: '🍽', interval: { every: 1,  unit: 'days'   }, time: '12:30', actionType: 'slot', color: '#FF9F43' },
  { id: 'schlafen',  text: 'Schlafen gehen',         icon: '🌙', interval: { every: 1,  unit: 'days'   }, time: '23:00', actionType: 'slot', color: '#7C4DFF' },
  { id: 'draussen',  text: 'Draußen gehen',          icon: '🌿', interval: { every: 1,  unit: 'days'   }, time: null,    actionType: 'slot', color: '#00FF94' },
  { id: 'zahnarzt',  text: 'Zahnarzt Termin buchen', icon: '🦷', interval: { every: 12, unit: 'months' }, time: null,    actionType: 'todo', color: '#FF2D78' },
  { id: 'hausarzt',  text: 'Hausarzt Termin buchen', icon: '🏥', interval: { every: 12, unit: 'months' }, time: null,    actionType: 'todo', color: '#FF6B6B' },
  { id: 'augenarzt', text: 'Augenarzt buchen',       icon: '👁', interval: { every: 24, unit: 'months' }, time: null,    actionType: 'todo', color: '#00E5FF' },
]

// ─── Helpers ──────────────────────────────────────────────
export function intervalLabel(interval) {
  if (!interval) return 'Nie'
  const { every, unit } = interval
  if (every === 1 && unit === 'days')   return 'Täglich'
  if (every === 1 && unit === 'weeks')  return 'Wöchentlich'
  if (every === 1 && unit === 'months') return 'Monatlich'
  const u = { days: 'Tage', weeks: 'Wochen', months: 'Monate' }
  return `Alle ${every} ${u[unit]}`
}

export function isDueToday(item) {
  if (!item.active || !item.interval) return false
  if (!item.lastAdded) return true
  const diffDays = Math.floor((Date.now() - new Date(item.lastAdded)) / 86400000)
  const { every, unit } = item.interval
  const threshold = unit === 'months' ? every * 30 : unit === 'weeks' ? every * 7 : every
  return diffDays >= threshold
}

export function mergeWithCurated(stored) {
  const map = new Map(stored.map(i => [i.id, i]))
  CURATED.forEach(c => {
    if (!map.has(c.id)) map.set(c.id, { ...c, active: true, curated: true, lastAdded: null })
  })
  return [...map.values()]
}

export function loadReminderItems() {
  try { return JSON.parse(localStorage.getItem(REMINDER_KEY))?.items ?? [] } catch { return [] }
}

export function saveReminderItems(items) {
  try {
    const existing = JSON.parse(localStorage.getItem(REMINDER_KEY)) ?? {}
    localStorage.setItem(REMINDER_KEY, JSON.stringify({ ...existing, items }))
  } catch {}
}

export function loadDismissed() {
  try { return JSON.parse(localStorage.getItem(REMINDER_DISMISSED_KEY)) ?? {} } catch { return {} }
}

export function saveDismissed(data) {
  try { localStorage.setItem(REMINDER_DISMISSED_KEY, JSON.stringify(data)) } catch {}
}
