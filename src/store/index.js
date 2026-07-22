import { create } from 'zustand'
import { sv, lv, SK } from '../storage'
import { migrateProjekte } from '../features/projekte/projektMigration'
import { stampCal } from '../features/cal/calStamp'

// Kategorie→Projekt-Migration MUSS vor den lv()-Reads der Store-Initialisierung laufen.
migrateProjekte()

const ACCENT_LEGACY = {
  cyan:   '#00CFFF',
  pink:   '#FF2D78',
  purple: '#BF00FF',
  green:  '#00FF94',
}

export function migrateAccent(stored) {
  if (!stored) return '#8B5CF6'
  if (stored.startsWith('#')) return stored
  return ACCENT_LEGACY[stored] ?? '#8B5CF6'
}

// Einmalige Migration: „notizen" in bestehende activeTools einreihen (2026-06).
// Flag-gegated → wird NICHT erneut hinzugefügt, falls später bewusst entfernt.
function loadActiveTools() {
  let tools = lv(SK.activeTools, ['geburtstage', 'kognitiv', 'haushalt', 'klaeren', 'notizen'])
    .map(id => id === 'erfolge' ? 'garten' : id === 'wachstum' ? 'growth' : id)
    .map(id => id === 'gewicht' ? 'fitness' : id)
  if (!lv(SK.notizenMigrated, false)) {
    if (!tools.includes('notizen')) tools = [...tools, 'notizen']
    sv(SK.notizenMigrated, true)
    sv(SK.activeTools, tools)
  }
  return tools
}

export const useAppStore = create((set, get) => ({
  // ─── Todos ─────────────────────────────────────────────
  todos:     lv(SK.todos, []),
  todoOrder: lv(SK.todoOrder, []),
  projects:  lv(SK.projects, []),

  setTodos: (todos) => {
    const prev = get().todos
    const next = stampCal(prev, typeof todos === 'function' ? todos(prev) : todos)
    set({ todos: next })
    sv(SK.todos, next)
  },
  setTodoOrder: (order) => { set({ todoOrder: order }); sv(SK.todoOrder, order) },
  setProjects: (projects) => {
    const prev = get().projects
    const next = stampCal(prev, typeof projects === 'function' ? projects(prev) : projects)
    set({ projects: next })
    sv(SK.projects, next)
  },

  // ─── Notes ─────────────────────────────────────────────
  notes: lv(SK.notes, []),
  setNotes: (notes) => {
    const next = typeof notes === 'function' ? notes(get().notes) : notes
    set({ notes: next })
    sv(SK.notes, next)
  },

  // ─── Blockers ──────────────────────────────────────────
  blockers: lv(SK.blockers, []),
  setBlockers: (blockers) => {
    const next = typeof blockers === 'function' ? blockers(get().blockers) : blockers
    set({ blockers: next })
    sv(SK.blockers, next)
  },

  // ─── Calendar ──────────────────────────────────────────
  days:         lv(SK.days, {}),
  doneCounters: lv(SK.doneCounters, {}),

  setDays: (days) => {
    const next = typeof days === 'function' ? days(get().days) : days
    set({ days: next })
    sv(SK.days, next)
  },
  setDoneCounters: (dc) => {
    const next = typeof dc === 'function' ? dc(get().doneCounters) : dc
    set({ doneCounters: next })
    sv(SK.doneCounters, next)
  },

  // ─── App ───────────────────────────────────────────────
  settings: lv(SK.settings, { lastBackup: null }),
  theme:    lv(SK.theme, null),
  setSettings: (s) => {
    const next = typeof s === 'function' ? s(get().settings) : s
    set({ settings: next })
    sv(SK.settings, next)
  },
  setTheme: (t) => { set({ theme: t }); sv(SK.theme, t) },

  // ─── Navigation ────────────────────────────────────────
  currentTab:   0,
  previousTab:  2,
  setCurrentTab: (tab) => set((state) => ({ previousTab: state.currentTab, currentTab: tab })),
  backInterceptor: null,
  setBackInterceptor: (fn) => set({ backInterceptor: fn }),
  // Alt-Werte aus persistiertem View-State migrieren (Vorbild: poolSort
  // 'kategorie'→'projekt'). 'fokus' hieß der Modus, bevor er zur Liste wurde.
  heuteModus: (() => {
    const v = lv(SK.heuteModus, 'raster')
    if (v === 'voll')  return 'raster'
    if (v === 'fokus') return 'liste'
    return v
  })(),
  setHeuteModus: (modus) => { set({ heuteModus: modus }); sv(SK.heuteModus, modus) },
  dayplanDate: null,
  setDayplanDate: (dk) => set({ dayplanDate: dk }),
  calendarDate: null,
  setCalendarDate: (dk) => set({ calendarDate: dk }),

  // Growth: Kalender-DayPanel → bestimmten Tag im Tool öffnen (flüchtig)
  growthOpenDate: null,
  setGrowthOpenDate: (dk) => set({ growthOpenDate: dk }),

  // Notizen: „+"-Modal → bestimmte Notiz direkt im Tool öffnen (flüchtig)
  notizenOpenId: null,
  setNotizenOpenId: (id) => set({ notizenOpenId: id }),

  // ─── Kognitiv auto-start ──────────────────────────────
  kognitivAutoStart: null,
  setKognitivAutoStart: (id) => set({ kognitivAutoStart: id }),

  // ─── Timer auto-start (Play am Slot) ───────────────────
  // { todoId, text, color, duration, date, slotKey, returnTab? } — flüchtig, kein localStorage
  timerAutoStart: null,
  setTimerAutoStart: (data) => set({ timerAutoStart: data }),

  // ─── Active Tools ──────────────────────────────────────
  activeTools: loadActiveTools(),
  setActiveTools: (tools) => { set({ activeTools: tools }); sv(SK.activeTools, tools) },
  toggleTool: (id) => {
    const current = get().activeTools
    const next = current.includes(id) ? current.filter(t => t !== id) : [...current, id]
    set({ activeTools: next })
    sv(SK.activeTools, next)
  },

  // ─── Birthdays ─────────────────────────────────────────
  birthdays: lv(SK.birthdays, []),
  setBirthdays: (bdays) => {
    const next = typeof bdays === 'function' ? bdays(get().birthdays) : bdays
    set({ birthdays: next })
    sv(SK.birthdays, next)
  },

  // ─── Accent ────────────────────────────────────────────
  accentColor: migrateAccent(lv(SK.accentColor, null)),
  setAccentColor: (color) => { set({ accentColor: color }); sv(SK.accentColor, color) },

  // ─── Tool Colors ───────────────────────────────────────
  toolColors: lv(SK.toolColors, {}),
  setToolColors: (colors) => {
    const next = typeof colors === 'function' ? colors(get().toolColors) : colors
    set({ toolColors: next })
    sv(SK.toolColors, next)
  },

  // ─── Klaeren Settings ──────────────────────────────────
  klaerenSettings: lv(SK.klaerenSettings, { threshold: 30, ageColor: '#FB923C', kiZerlegen: true }),
  setKlaerenSettings: (s) => {
    const next = typeof s === 'function' ? s(get().klaerenSettings) : s
    set({ klaerenSettings: next })
    sv(SK.klaerenSettings, next)
  },

  // ─── Geteilte Kalender (Teilen Stufe A) ────────────────
  // Reaktiv, damit Einstellungen-Karte + Kalender-Views auf Sync/Mutationen reagieren.
  calCreds:  lv(SK.calCreds, {}),   // { [calId]: { key, memberId, joinedAt } }
  calList:   lv(SK.calList, {}),    // { [calId]: { name, emoji, members, updatedAt } }
  calFilter: lv(SK.calFilter, { privat: true, cals: {} }),
  calSeen:   lv(SK.calSeen, {}),    // { [calId]: ts } — letzter Aktivitäts-Blick (A10-Digest)
  setCalCreds: (c) => {
    const next = typeof c === 'function' ? c(get().calCreds) : c
    set({ calCreds: next }); sv(SK.calCreds, next)
  },
  setCalList: (c) => {
    const next = typeof c === 'function' ? c(get().calList) : c
    set({ calList: next }); sv(SK.calList, next)
  },
  setCalFilter: (c) => {
    const next = typeof c === 'function' ? c(get().calFilter) : c
    set({ calFilter: next }); sv(SK.calFilter, next)
  },
  setCalSeen: (c) => {
    const next = typeof c === 'function' ? c(get().calSeen) : c
    set({ calSeen: next }); sv(SK.calSeen, next)
  },
}))
