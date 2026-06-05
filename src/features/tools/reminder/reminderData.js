import { sv, lv, SK } from '../../../storage'

// ─── Storage keys ─────────────────────────────────────────
export const REMINDER_KEY           = SK.reminder
export const REMINDER_DISMISSED_KEY = SK.reminderDismissed

// ─── Curated items ────────────────────────────────────────
// icon = Glyph-Name aus _shared/glyphs.jsx (kein Emoji mehr).
export const CURATED = [
  { id: 'wasser',      text: 'Wasser trinken',           icon: 'droplet', interval: { every: 1, unit: 'days'   }, time: '10:00', actionType: 'slot', color: '#14B8A6' },
  { id: 'meds',        text: 'Medikamente nehmen',       icon: 'pill',    interval: { every: 1, unit: 'days'   }, time: '08:00', actionType: 'slot', color: '#8B5CF6' },
  { id: 'luft',        text: 'Kurz an die frische Luft', icon: 'leaf',    interval: { every: 1, unit: 'days'   }, time: null,    actionType: 'slot', color: '#10B981' },
  { id: 'augen',       text: 'Bildschirm-Pause',         icon: 'eye',     interval: { every: 1, unit: 'days'   }, time: '15:00', actionType: 'slot', color: '#14B8A6' },
  { id: 'schlafen',    text: 'Handy weg, Schlafenszeit', icon: 'moon',    interval: { every: 1, unit: 'days'   }, time: '22:30', actionType: 'slot', color: '#7C4DFF' },
  { id: 'pflanzen',    text: 'Pflanzen gießen',          icon: 'plant',   interval: { every: 3, unit: 'days'   }, time: null,    actionType: 'todo', color: '#10B981' },
  { id: 'bettwaesche', text: 'Bettwäsche wechseln',      icon: 'washer',  interval: { every: 2, unit: 'weeks'  }, time: null,    actionType: 'todo', color: '#8B5CF6' },
  { id: 'rezept',      text: 'Rezept nachbestellen',     icon: 'health',  interval: { every: 1, unit: 'months' }, time: null,    actionType: 'todo', color: '#FB7185' },
  { id: 'zahnarzt',    text: 'Zahnarzt-Kontrolle buchen',icon: 'tooth',   interval: { every: 6, unit: 'months' }, time: null,    actionType: 'todo', color: '#14B8A6' },
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
  return lv(SK.reminder, {})?.items ?? []
}

export function saveReminderItems(items) {
  sv(SK.reminder, { ...lv(SK.reminder, {}), items })
}

export function loadDismissed() {
  return lv(SK.reminderDismissed, {})
}

export function saveDismissed(data) {
  sv(SK.reminderDismissed, data)
}

// ─── Segment / Fälligkeits-Helpers ────────────────────────
export function reminderIntervalDays(item) {
  if (!item.interval) return 1
  const { every, unit } = item.interval
  if (unit === 'months') return every * 30
  if (unit === 'weeks')  return every * 7
  return every
}

export function reminderSegments(item) {
  const total   = reminderIntervalDays(item)
  const rawDays = item.lastAdded
    ? Math.floor((Date.now() - new Date(item.lastAdded)) / 86_400_000)
    : -1
  const filled  = rawDays < 0 ? total : Math.min(rawDays, total)
  const urgency = rawDays < 0 ? 1.5 : rawDays / total
  const overdue = urgency >= 1.0
  const color   = urgency >= 1.0 ? 'var(--rose)' : urgency >= 0.7 ? '#f59e0b' : 'var(--emerald)'
  return { filled, total, color, overdue }
}

export function reminderDueLabel(item) {
  if (!item.lastAdded) return 'noch nie hinzugefügt'
  const days = Math.floor((Date.now() - new Date(item.lastAdded)) / 86_400_000)
  if (days === 0) return 'heute hinzugefügt'
  const threshold = reminderIntervalDays(item)
  const left = threshold - days
  if (left <= 0) return `${Math.abs(left)} ${Math.abs(left) === 1 ? 'Tag' : 'Tage'} überfällig`
  if (left === 1) return 'morgen fällig'
  return `in ${left} Tagen`
}

export function setReminderLastAdded(itemId, date) {
  const stored = lv(SK.reminder, { items: [] })
  const items = (stored.items ?? []).map(i =>
    i.id === itemId ? { ...i, lastAdded: date } : i
  )
  sv(SK.reminder, { ...stored, items })
}
