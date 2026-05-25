import { sv, lv, SK } from '../../../storage'

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
  if (task.freq === 'custom') return task.customDays ?? 7
  return FREQ_DAYS[task.freq] ?? 7
}

// Days since isoDate. Returns -1 if never done.
export function daysSince(isoDate) {
  if (!isoDate) return -1
  const d = new Date(isoDate + 'T00:00:00')
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

// Urgency: 0 = fresh, 1.0 = exactly due, >1 = overdue.
// Never done (null) → 1.5 (very overdue, always shows up).
export function taskUrgency(task) {
  const since = daysSince(task.lastDone)
  if (since < 0) return 1.5
  return since / freqToDays(task)
}

// Segment bar data for one task.
export function taskSegments(task) {
  const total   = freqToDays(task)
  const since   = daysSince(task.lastDone)
  const filled  = since < 0 ? total : Math.min(since, total)
  const urgency = since < 0 ? 1.5 : since / total
  const overdue = urgency >= 1.0
  let color
  if (urgency >= 1.0)       color = 'var(--rose)'
  else if (urgency >= 0.7)  color = '#f59e0b'
  else                      color = 'var(--emerald)'
  return { filled, total, color, overdue }
}

// Ring score: % of tasks that are not yet overdue.
export function calcRingScore(rooms) {
  const all = rooms.flatMap(r => r.tasks)
  if (all.length === 0) return 100
  const ok = all.filter(t => taskUrgency(t) < 1.0).length
  return Math.round((ok / all.length) * 100)
}

// Status badge for a room header.
export function roomStatus(room) {
  if (room.tasks.length === 0) return 'ok'
  const max = Math.max(...room.tasks.map(t => taskUrgency(t)))
  if (max >= 1.0) return 'now'
  if (max >= 0.7) return 'soon'
  return 'ok'
}

export const STATUS_META = {
  now:  { label: 'überfällig',  color: 'var(--rose)'    },
  soon: { label: 'bald fällig', color: '#f59e0b'         },
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
export const DEFAULT_ROOMS = [
  {
    id: 'kueche', name: 'Küche', icon: '🍳',
    tasks: [
      { id: 'k-1', text: 'Abwasch / Spülmaschine', duration: 15, freq: 'daily',    customDays: null, lowEnergy: true,  lastDone: null, subItems: [] },
      { id: 'k-2', text: 'Müll rausbringen',        duration:  5, freq: 'biweekly', customDays: null, lowEnergy: true,  lastDone: null, subItems: [] },
      { id: 'k-3', text: 'Herd & Arbeitsflächen',   duration: 10, freq: 'weekly',   customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
      { id: 'k-4', text: 'Kühlschrank ausräumen',   duration: 30, freq: 'monthly',  customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'bad', name: 'Bad', icon: '🚿',
    tasks: [
      { id: 'b-1', text: 'WC reinigen',           duration: 10, freq: 'weekly',   customDays: null, lowEnergy: true,  lastDone: null, subItems: [] },
      { id: 'b-2', text: 'Waschbecken & Spiegel', duration:  5, freq: 'weekly',   customDays: null, lowEnergy: true,  lastDone: null, subItems: [] },
      { id: 'b-3', text: 'Dusche reinigen',        duration: 15, freq: 'biweekly', customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'wohnzimmer', name: 'Wohnzimmer', icon: '🛋',
    tasks: [
      { id: 'w-1', text: 'Aufräumen / Sachen wegräumen', duration: 15, freq: 'weekly',  customDays: null, lowEnergy: true,  lastDone: null, subItems: [] },
      { id: 'w-2', text: 'Staubsaugen',                  duration: 15, freq: 'weekly',  customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
      { id: 'w-3', text: 'Fenster putzen',                duration: 20, freq: 'monthly', customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'schlafzimmer', name: 'Schlafzimmer', icon: '🛏',
    tasks: [
      { id: 's-1', text: 'Wäsche waschen', duration: 10, freq: 'weekly',   customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
      { id: 's-2', text: 'Bett machen',    duration:  5, freq: 'daily',    customDays: null, lowEnergy: true,  lastDone: null, subItems: [] },
      { id: 's-3', text: 'Staubsaugen',    duration: 15, freq: 'biweekly', customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'flur', name: 'Flur', icon: '🚪',
    tasks: [
      { id: 'f-1', text: 'Staubsaugen',      duration: 10, freq: 'weekly', customDays: null, lowEnergy: false, lastDone: null, subItems: [] },
      { id: 'f-2', text: 'Schuhe wegräumen', duration:  5, freq: 'weekly', customDays: null, lowEnergy: true,  lastDone: null, subItems: [] },
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
  const today = new Date().toISOString().slice(0, 10)
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
