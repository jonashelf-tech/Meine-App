import { sv, lv, SK } from '../../../storage'

// ─── Mode levels ─────────────────────────────────────────
// Lower number = appears in more modes.
// survival(0) shows in all 3 modes. boost(2) only in boost.
export const MODE_LEVEL = { survival: 0, maintain: 1, boost: 2 }

export const MODE_META = {
  survival: { label: '🛡 Survival', color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  maintain: { label: '🔄 Maintain', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  boost:    { label: '✨ Boost',    color: '#10B981', bg: 'rgba(16,185,129,0.12)'   },
}

// ─── Frequency labels ─────────────────────────────────────
export const FREQ_LABELS = {
  daily:    'täglich',
  biweekly: '2× pro Woche',
  weekly:   'wöchentlich',
  monthly:  'monatlich',
  custom:   'individuell',
}

// ─── Frequency → days mapping ─────────────────────────────
const FREQ_DAYS = {
  daily:    1,
  biweekly: 3,   // 2-3× per week ≈ every 3 days
  weekly:   7,
  monthly:  30,
}

function freqToDays(task) {
  if (task.freq === 'custom') return task.customDays ?? 7
  return FREQ_DAYS[task.freq] ?? 7
}

// Returns how many days ago isoDate was. 999 if never done.
function daysSince(isoDate) {
  if (!isoDate) return 999
  const d = new Date(isoDate + 'T00:00:00')
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

// ─── Default rooms ────────────────────────────────────────
export const DEFAULT_ROOMS = [
  {
    id: 'kueche',
    name: 'Küche',
    icon: '🍳',
    tasks: [
      {
        id: 'kueche-1', text: 'Abwasch / Spülmaschine', duration: 15,
        freq: 'daily', customDays: null, minMode: 'survival', lastDone: null, subItems: [],
      },
      {
        id: 'kueche-2', text: 'Müll rausbringen', duration: 10,
        freq: 'biweekly', customDays: null, minMode: 'survival', lastDone: null, subItems: [],
      },
      {
        id: 'kueche-3', text: 'Herd abwischen', duration: 10,
        freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
      },
      {
        id: 'kueche-4', text: 'Kühlschrank ausräumen', duration: 30,
        freq: 'monthly', customDays: null, minMode: 'boost', lastDone: null, subItems: [],
      },
    ],
  },
  {
    id: 'bad',
    name: 'Bad',
    icon: '🚿',
    tasks: [
      {
        id: 'bad-1', text: 'WC reinigen', duration: 10,
        freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
      },
      {
        id: 'bad-2', text: 'Waschbecken', duration: 5,
        freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
      },
      {
        id: 'bad-3', text: 'Dusche / Wanne', duration: 15,
        freq: 'weekly', customDays: null, minMode: 'boost', lastDone: null, subItems: [],
      },
    ],
  },
  {
    id: 'wohnzimmer',
    name: 'Wohnzimmer',
    icon: '🛋',
    tasks: [
      {
        id: 'wz-1', text: 'Aufräumen', duration: 15,
        freq: 'weekly', customDays: null, minMode: 'survival', lastDone: null, subItems: [],
      },
      {
        id: 'wz-2', text: 'Fenster putzen', duration: 20,
        freq: 'monthly', customDays: null, minMode: 'boost', lastDone: null, subItems: [],
      },
    ],
  },
  {
    id: 'schlafzimmer',
    name: 'Schlafzimmer',
    icon: '🛏',
    tasks: [
      {
        id: 'sz-1', text: 'Bett machen', duration: 5,
        freq: 'daily', customDays: null, minMode: 'survival', lastDone: null, subItems: [],
      },
      {
        id: 'sz-2', text: 'Staubsaugen', duration: 15,
        freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
      },
    ],
  },
  {
    id: 'flur',
    name: 'Flur',
    icon: '🚪',
    tasks: [
      {
        id: 'flur-1', text: 'Staubsaugen', duration: 10,
        freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
      },
      {
        id: 'flur-2', text: 'Boden wischen', duration: 15,
        freq: 'biweekly', customDays: null, minMode: 'boost', lastDone: null, subItems: [],
      },
    ],
  },
]

// ─── Storage helpers ──────────────────────────────────────
export function loadHaushalt() {
  return lv(SK.haushalt, { rooms: DEFAULT_ROOMS, selectedMode: 'maintain' })
}

export function saveHaushalt(config) {
  sv(SK.haushalt, config)
}

// ─── Smart Queue ──────────────────────────────────────────
// Builds a filtered, sorted, time-budgeted task list.
// Urgency is internal — NEVER shown to user.
// Tasks just "appear when they're due" without any "X days overdue" text.
export function buildQueue(config, modus, zeitBudgetMinuten) {
  const level = MODE_LEVEL[modus] ?? 1

  const candidates = []
  for (const room of config.rooms) {
    for (const task of room.tasks) {
      // Skip tasks that require a higher mode than currently selected
      if (MODE_LEVEL[task.minMode] > level) continue
      const since    = daysSince(task.lastDone)
      const freqDays = freqToDays(task)
      const urgency  = since / freqDays  // >= 1.0 means due
      candidates.push({ task, room, urgency })
    }
  }

  // Due tasks first, then by urgency descending
  candidates.sort((a, b) => b.urgency - a.urgency)

  // Greedy fit: accumulate tasks until time budget is consumed
  let remaining = zeitBudgetMinuten
  const result = []
  for (const c of candidates) {
    if (remaining <= 0) break
    const dur = c.task.duration ?? 15
    if (dur <= remaining) {
      result.push({ task: c.task, room: c.room })
      remaining -= dur
    }
  }

  return result
}

// ─── Mark task done ───────────────────────────────────────
export function markTaskDone(config, taskId) {
  const today = new Date().toISOString().slice(0, 10)
  return {
    ...config,
    rooms: config.rooms.map(r => ({
      ...r,
      tasks: r.tasks.map(t =>
        t.id === taskId ? { ...t, lastDone: today } : t
      ),
    })),
  }
}

// ─── Room status badge ────────────────────────────────────
// Returns 'now' | 'soon' | 'ok' — used for colored status badge in Räume view.
export function roomStatus(room) {
  if (room.tasks.length === 0) return 'ok'
  const urgencies = room.tasks.map(t => daysSince(t.lastDone) / freqToDays(t))
  const max = Math.max(...urgencies)
  if (max >= 1.0) return 'now'
  if (max >= 0.7) return 'soon'
  return 'ok'
}

// ─── CRUD helpers ─────────────────────────────────────────
export function addRoom(config, room) {
  return { ...config, rooms: [...config.rooms, room] }
}

export function updateRoom(config, roomId, patch) {
  return {
    ...config,
    rooms: config.rooms.map(r => r.id === roomId ? { ...r, ...patch } : r),
  }
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
      r.id === roomId
        ? { ...r, tasks: r.tasks.filter(t => t.id !== taskId) }
        : r
    ),
  }
}

export function resetToDefaults(config) {
  return { ...config, rooms: DEFAULT_ROOMS }
}
