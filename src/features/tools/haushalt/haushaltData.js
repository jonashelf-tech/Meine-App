import { sv, lv, SK } from '../../../storage'
import { todayKey } from '../../../utils'
import { GLYPH_NAMES } from '../_shared/glyphs'

// Alte Emoji-Icons → Glyph-Namen (Migration bestehender Daten).
const EMOJI_TO_GLYPH = {
  '🍳': 'kitchen', '🚿': 'bath', '🛁': 'bath', '🛋': 'sofa', '🛏': 'bed',
  '🚪': 'door', '🏠': 'home', '🪟': 'window', '🧺': 'washer', '🌱': 'plant',
  '🌿': 'plant', '🚗': 'car', '🖥': 'desk', '💻': 'desk', '🚽': 'bath',
}

export function normalizeRoomIcon(icon) {
  if (GLYPH_NAMES.includes(icon)) return icon
  return EMOJI_TO_GLYPH[icon] ?? 'home'
}

// ─── Frequency labels ─────────────────────────────────────
export const FREQ_LABELS = {
  daily:    'täglich',
  biweekly: '2× pro Woche',
  weekly:   'wöchentlich',
  monthly:  'monatlich',
  custom:   'individuell',
}

const FREQ_DAYS = { daily: 1, biweekly: 3, weekly: 7, monthly: 30 }

export function freqToDays(task) {
  // customDays muss > 0 sein: 0/negativ (oder null) würde in taskUrgency/taskSegments
  // eine Division durch 0 (→ Infinity/NaN) auslösen und roomStatus/calcRingScore
  // vergiften. `?? 7` fängt nur null/undefined, nicht die 0 — daher `> 0`.
  if (task.freq === 'custom') return task.customDays > 0 ? task.customDays : 7
  return FREQ_DAYS[task.freq] ?? 7
}

// Days since isoDate. Returns -1 if never done.
export function daysSince(isoDate) {
  if (!isoDate) return -1
  const d = new Date(isoDate + 'T00:00:00')
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

// Urgency: 0 = fresh, 1.0 = exactly due, >1 = overdue.
// Never done (null) → 1.0: zählt als fällig, mahnt aber nicht als "überfällig"
// (kein Rot-Alarm direkt nach dem Setup — das Tool verspricht "ohne Druck").
export function taskUrgency(task) {
  const since = daysSince(task.lastDone)
  if (since < 0) return 1.0
  return since / freqToDays(task)
}

// Segment bar data for one task. Never done → neutraler "neu"-Zustand (violett).
export function taskSegments(task) {
  const total   = freqToDays(task)
  const since   = daysSince(task.lastDone)
  if (since < 0) {
    return { filled: total, total, color: 'var(--primary)', overdue: false, neu: true }
  }
  const urgency = since / total
  const filled  = Math.min(since, total)
  const overdue = urgency >= 1.0
  let color
  if (urgency >= 1.0)       color = 'var(--rose)'
  else if (urgency >= 0.7)  color = 'var(--amber)'
  else                      color = 'var(--emerald)'
  return { filled, total, color, overdue, neu: false }
}

// Human-readable Fälligkeits-Label für eine Task-Zeile.
// Nutzt daysSince/freqToDays (kein zweites, driftendes Frequenz-Mapping).
export function taskDueLabel(task) {
  if (!task.lastDone) return 'neu'
  const days = daysSince(task.lastDone)
  if (days === 0) return 'heute erledigt'
  if (days === 1) return 'gestern erledigt'
  const left = freqToDays(task) - days
  if (left <= 0) {
    const n = Math.abs(left)
    return `${n} ${n === 1 ? 'Tag' : 'Tage'} überfällig`
  }
  if (left === 1) return 'morgen fällig'
  return `in ${left} Tagen`
}

// Ring score: % of tasks that are not yet overdue.
export function calcRingScore(rooms) {
  const all = rooms.flatMap(r => r.tasks)
  if (all.length === 0) return 100
  const ok = all.filter(t => taskUrgency(t) < 1.0).length
  return Math.round((ok / all.length) * 100)
}

// Status badge for a room header. Nie-erledigte Tasks ergeben höchstens
// "offen" (neutral) — "überfällig"/"bald fällig" nur für wirklich Verschlepptes.
export function roomStatus(room) {
  if (room.tasks.length === 0) return 'ok'
  const doneOnce = room.tasks.filter(t => t.lastDone)
  const max = doneOnce.length ? Math.max(...doneOnce.map(t => taskUrgency(t))) : 0
  if (max >= 1.0) return 'now'
  if (max >= 0.7) return 'soon'
  if (room.tasks.some(t => !t.lastDone)) return 'neu'
  return 'ok'
}

export const STATUS_META = {
  now:  { label: 'überfällig',  color: 'var(--rose)'    },
  soon: { label: 'bald fällig', color: 'var(--amber)'    },
  neu:  { label: 'offen',       color: 'var(--primary)'  },
  ok:   { label: 'alles ok',    color: 'var(--emerald)'  },
}

// Top N most urgent tasks across all rooms (urgency >= 0.7).
export function getUrgentTasks(config, limit = 5) {
  return config.rooms
    .flatMap(r => r.tasks.map(t => ({ task: t, room: r })))
    .filter(({ task }) => taskUrgency(task) >= 0.7)
    .sort((a, b) => taskUrgency(b.task) - taskUrgency(a.task))
    .slice(0, limit)
}

// ─── Default rooms ────────────────────────────────────────
// ADHS-getreu: Routine-Räume halten wenige, konkrete, sichtbar-wirksame Tasks
// (vieles Low-Energy, damit auch an schlechten Tagen was geht). Kein tägliches
// "Bett machen" als Tracker (täglich rot = nur Lärm).
// Die seltenen Brocken (Fenster, Staub, Böden, Mülleimer), die man sonst nie
// macht, stehen gesammelt im Bereich "Großputz" mit niedriger Priorität und
// ehrlich langen Intervallen — so vergisst man sie nicht, ohne dass sie die
// tägliche Liste vollmüllen oder dauernd rot mahnen.
export const DEFAULT_ROOMS = [
  {
    id: 'kueche', name: 'Küche', icon: 'kitchen', priority: 1,
    tasks: [
      { id: 'k-1', text: 'Abwasch / Spülmaschine',        duration: 10, freq: 'daily',  customDays: null, lowEnergy: true, lastDone: null, subItems: [] },
      { id: 'k-2', text: 'Müll & Altglas rausbringen',    duration:  5, freq: 'weekly', customDays: null, lowEnergy: true, lastDone: null, subItems: [] },
      { id: 'k-3', text: 'Arbeitsflächen & Herd wischen', duration: 10, freq: 'weekly', customDays: null, lowEnergy: true, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'bad', name: 'Bad', icon: 'bath', priority: 1,
    tasks: [
      { id: 'b-1', text: 'WC & Waschbecken', duration: 10, freq: 'weekly', customDays: null, lowEnergy: true,  lastDone: null, subItems: [] },
      { id: 'b-2', text: 'Dusche / Wanne',   duration: 15, freq: 'custom', customDays: 14,   lowEnergy: false, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'waesche', name: 'Wäsche', icon: 'washer', priority: 1,
    tasks: [
      { id: 'l-1', text: 'Waschen & aufhängen',       duration: 10, freq: 'biweekly', customDays: null, lowEnergy: true, lastDone: null, subItems: [] },
      { id: 'l-2', text: 'Zusammenlegen & wegräumen', duration: 15, freq: 'weekly',   customDays: null, lowEnergy: true, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'wohnzimmer', name: 'Wohnzimmer', icon: 'sofa', priority: 2,
    tasks: [
      { id: 'w-1', text: 'Flächen freiräumen / aufräumen', duration: 10, freq: 'biweekly', customDays: null, lowEnergy: true, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'schlafzimmer', name: 'Schlafzimmer', icon: 'bed', priority: 2,
    tasks: [
      { id: 's-1', text: 'Bettwäsche wechseln', duration: 10, freq: 'custom', customDays: 14, lowEnergy: false, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'grossputz', name: 'Großputz', icon: 'sparkle', priority: 3,
    tasks: [
      { id: 'g-1', text: 'Saugen (ganze Wohnung)',         duration: 20, freq: 'custom',  customDays:  4,   lowEnergy: false, lastDone: null, subItems: [] },
      { id: 'g-2', text: 'Böden wischen (ganze Wohnung)',  duration: 25, freq: 'custom',  customDays: 14,   lowEnergy: false, lastDone: null, subItems: [] },
      { id: 'g-3', text: 'Staub wischen (Regale & Flächen)', duration: 15, freq: 'monthly', customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
      { id: 'g-4', text: 'Mülleimer auswaschen',           duration:  5, freq: 'custom',  customDays: 60,   lowEnergy: false, lastDone: null, subItems: [] },
      { id: 'g-5', text: 'Fenster putzen',                 duration: 25, freq: 'custom',  customDays: 90,   lowEnergy: false, lastDone: null, subItems: [] },
    ],
  },
]

// ─── Storage ──────────────────────────────────────────────
export function loadHaushalt() {
  const saved = lv(SK.haushalt, null)

  if (!saved) return { rooms: DEFAULT_ROOMS, briefingDone: false, distribution: 'spread' }

  // Determine briefingDone: existing users with data → true, new users → false
  const hasSavedRooms  = Array.isArray(saved.rooms) && saved.rooms.length > 0
  const briefingDone   = saved.briefingDone !== undefined
    ? saved.briefingDone
    : hasSavedRooms

  // Ensure all tasks have lowEnergy field (migration)
  const rooms = (saved.rooms ?? DEFAULT_ROOMS).map(r => ({
    ...r,
    icon: normalizeRoomIcon(r.icon),
    priority: r.priority ?? 3,
    tasks: r.tasks.map(t => ({ ...t, lowEnergy: t.lowEnergy ?? false })),
  }))

  return {
    rooms,
    briefingDone,
    distribution: saved.distribution ?? 'spread',
  }
}

export function saveHaushalt(config) {
  sv(SK.haushalt, config)
}

// ─── Task mutations ───────────────────────────────────────
export function markTaskDone(config, taskId) {
  const today = todayKey()
  return {
    ...config,
    rooms: config.rooms.map(r => ({
      ...r,
      tasks: r.tasks.map(t => t.id === taskId ? { ...t, lastDone: today } : t),
    })),
  }
}

export function resetTaskDone(config, taskId) {
  return {
    ...config,
    rooms: config.rooms.map(r => ({
      ...r,
      tasks: r.tasks.map(t => t.id === taskId ? { ...t, lastDone: null } : t),
    })),
  }
}

// ─── Room / Task CRUD ─────────────────────────────────────
export function addRoom(config, room) {
  return { ...config, rooms: [...config.rooms, room] }
}

export function updateRoom(config, roomId, patch) {
  return { ...config, rooms: config.rooms.map(r => r.id === roomId ? { ...r, ...patch } : r) }
}

export function deleteRoom(config, roomId) {
  return { ...config, rooms: config.rooms.filter(r => r.id !== roomId) }
}

export function addTask(config, roomId, task) {
  return {
    ...config,
    rooms: config.rooms.map(r =>
      r.id === roomId ? { ...r, tasks: [...r.tasks, task] } : r
    ),
  }
}

export function updateTask(config, roomId, taskId, patch) {
  return {
    ...config,
    rooms: config.rooms.map(r =>
      r.id === roomId
        ? { ...r, tasks: r.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t) }
        : r
    ),
  }
}

export function deleteTask(config, roomId, taskId) {
  return {
    ...config,
    rooms: config.rooms.map(r =>
      r.id === roomId ? { ...r, tasks: r.tasks.filter(t => t.id !== taskId) } : r
    ),
  }
}

export function resetToDefaults(config) {
  return { ...config, rooms: DEFAULT_ROOMS, briefingDone: false }
}

// Räume mit mindestens einer wirklich fälligen Task (urgency >= 1.0).
// energie: 'normal' | 'low' — bei 'low' nur lowEnergy-Tasks.
export function getDueRooms(config, energie) {
  return config.rooms
    .map(room => ({
      room,
      dueTasks: room.tasks.filter(t =>
        taskUrgency(t) >= 1.0 &&
        (energie !== 'low' || t.lowEnergy)
      ),
    }))
    .filter(({ dueTasks }) => dueTasks.length > 0)
}
