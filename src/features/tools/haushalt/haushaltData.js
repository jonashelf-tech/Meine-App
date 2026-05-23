import { sv, lv, SK } from '../../../storage'

// ─── Energie (user picks this — only relevant in Ordnung mode) ────
export const ENERGIE_META = {
  wenig:  { label: '🪫 Wenig',  color: '#8B5CF6' },
  normal: { label: '⚡ Normal', color: '#8B5CF6' },
  viel:   { label: '🔥 Viel',  color: '#10B981' },
}

// ─── Zustand (auto-detected from task data) ───────────────
export const ZUSTAND_META = {
  chaos:   { label: 'Chaos',      sub: 'Zuerst Grundordnung',  color: '#fb7185', bg: 'rgba(251,113,133,0.10)' },
  knapp:   { label: 'Knapp',      sub: 'Wichtiges zuerst',     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)'  },
  ordnung: { label: 'Im Griff',   sub: 'Energie wählen',       color: '#10B981', bg: 'rgba(16,185,129,0.10)'  },
}

// ─── Frequency labels ─────────────────────────────────────
export const FREQ_LABELS = {
  daily:    'täglich',
  biweekly: '2× pro Woche',
  weekly:   'wöchentlich',
  monthly:  'monatlich',
  custom:   'individuell',
}

// ─── Frequency → days ─────────────────────────────────────
const FREQ_DAYS = { daily: 1, biweekly: 3, weekly: 7, monthly: 30 }

export function freqToDays(task) {
  if (task.freq === 'custom') return task.customDays ?? 7
  return FREQ_DAYS[task.freq] ?? 7
}

// Days since isoDate. Returns -1 if never done (neutral, not overdue).
export function daysSince(isoDate) {
  if (!isoDate) return -1
  const d = new Date(isoDate + 'T00:00:00')
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

function taskUrgency(task) {
  const since = daysSince(task.lastDone)
  if (since < 0) return 0   // never tracked → neutral
  return since / freqToDays(task)
}

// ─── Auto-detect Zustand ──────────────────────────────────
// Looks at survival tasks only. If 50%+ are overdue → chaos.
// 25–49% overdue → knapp. Otherwise → ordnung.
export function calcZustand(rooms) {
  const survival = rooms.flatMap(r => r.tasks).filter(t => t.minMode === 'survival')
  if (survival.length === 0) return 'ordnung'
  const overdue = survival.filter(t => taskUrgency(t) >= 1.0).length
  const ratio   = overdue / survival.length
  if (ratio >= 0.5)  return 'chaos'
  if (ratio >= 0.25) return 'knapp'
  return 'ordnung'
}

// ─── ADHS-realistic defaults ──────────────────────────────
// survival  → wird zum echten Problem wenn nicht erledigt
// maintain  → sollte regelmäßig passieren
// boost     → nice to have, größere Aufgaben
export const DEFAULT_ROOMS = [
  {
    id: 'kueche', name: 'Küche', icon: '🍳',
    tasks: [
      { id: 'k-1', text: 'Abwasch / Spülmaschine', duration: 15, freq: 'daily',    customDays: null, minMode: 'survival', lastDone: null, subItems: [] },
      { id: 'k-2', text: 'Müll rausbringen',        duration:  5, freq: 'biweekly', customDays: null, minMode: 'survival', lastDone: null, subItems: [] },
      { id: 'k-3', text: 'Herd & Arbeitsflächen',   duration: 10, freq: 'weekly',   customDays: null, minMode: 'maintain', lastDone: null, subItems: [] },
      { id: 'k-4', text: 'Kühlschrank ausräumen',   duration: 30, freq: 'monthly',  customDays: null, minMode: 'boost',    lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'bad', name: 'Bad', icon: '🚿',
    tasks: [
      { id: 'b-1', text: 'WC reinigen',            duration: 10, freq: 'weekly',   customDays: null, minMode: 'survival', lastDone: null, subItems: [] },
      { id: 'b-2', text: 'Waschbecken & Spiegel',  duration:  5, freq: 'weekly',   customDays: null, minMode: 'maintain', lastDone: null, subItems: [] },
      { id: 'b-3', text: 'Dusche reinigen',         duration: 15, freq: 'biweekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'wohnzimmer', name: 'Wohnzimmer', icon: '🛋',
    tasks: [
      { id: 'w-1', text: 'Aufräumen / Sachen wegräumen', duration: 15, freq: 'weekly',  customDays: null, minMode: 'survival', lastDone: null, subItems: [] },
      { id: 'w-2', text: 'Staubsaugen',                  duration: 15, freq: 'weekly',  customDays: null, minMode: 'maintain', lastDone: null, subItems: [] },
      { id: 'w-3', text: 'Fenster putzen',                duration: 20, freq: 'monthly', customDays: null, minMode: 'boost',    lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'schlafzimmer', name: 'Schlafzimmer', icon: '🛏',
    tasks: [
      { id: 's-1', text: 'Wäsche waschen',  duration: 10, freq: 'weekly',   customDays: null, minMode: 'survival', lastDone: null, subItems: [] },
      { id: 's-2', text: 'Bett machen',     duration:  5, freq: 'daily',    customDays: null, minMode: 'maintain', lastDone: null, subItems: [] },
      { id: 's-3', text: 'Staubsaugen',     duration: 15, freq: 'biweekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [] },
    ],
  },
  {
    id: 'flur', name: 'Flur', icon: '🚪',
    tasks: [
      { id: 'f-1', text: 'Staubsaugen',       duration: 10, freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [] },
      { id: 'f-2', text: 'Schuhe wegräumen',  duration:  5, freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [] },
    ],
  },
]

// ─── Storage helpers ──────────────────────────────────────
export function loadHaushalt() {
  const saved = lv(SK.haushalt, null)
  if (!saved) return { rooms: DEFAULT_ROOMS, energie: 'normal' }
  // Migrate old selectedMode → energie
  if (saved.selectedMode && !saved.energie) {
    const map = { survival: 'wenig', maintain: 'normal', boost: 'viel' }
    return { rooms: saved.rooms ?? DEFAULT_ROOMS, energie: map[saved.selectedMode] ?? 'normal' }
  }
  return { rooms: saved.rooms ?? DEFAULT_ROOMS, energie: saved.energie ?? 'normal' }
}

export function saveHaushalt(config) {
  sv(SK.haushalt, config)
}

// ─── Smart Queue ──────────────────────────────────────────
// Chaos/Knapp: alle überfälligen survival+maintain Tasks, nach Dringlichkeit.
// Ordnung: fällige + bald fällige Tasks, gefiltert nach Energie (Dauer).
export function buildSmartQueue(config, energie, zeitBudgetMinuten) {
  const zustand    = calcZustand(config.rooms)
  const candidates = []

  for (const room of config.rooms) {
    for (const task of room.tasks) {
      const urgency = taskUrgency(task)

      if (zustand === 'chaos' || zustand === 'knapp') {
        if (urgency < 1.0) continue           // nur überfällige anzeigen
        if (task.minMode === 'boost') continue // boost im Chaos überspringen
      } else {
        // ordnung: nach Energie (Dauer) filtern
        const maxDur = energie === 'wenig' ? 10 : energie === 'normal' ? 25 : 999
        if ((task.duration ?? 15) > maxDur) continue
        if (urgency < 0.5) continue            // noch nicht bald fällig → ausblenden
      }

      candidates.push({ task, room, urgency })
    }
  }

  candidates.sort((a, b) => b.urgency - a.urgency)

  let remaining = zeitBudgetMinuten
  const result  = []
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
      tasks: r.tasks.map(t => t.id === taskId ? { ...t, lastDone: today } : t),
    })),
  }
}

// ─── Room status badge ────────────────────────────────────
export function roomStatus(room) {
  if (room.tasks.length === 0) return 'ok'
  const urgencies = room.tasks.map(t => taskUrgency(t))
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
  return { ...config, rooms: DEFAULT_ROOMS }
}
