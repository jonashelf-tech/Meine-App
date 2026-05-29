import { create } from 'zustand'
import { sv, lv, SK, DEFAULT_MODULES } from '../storage'

const ACCENT_LEGACY = {
  cyan:   '#00CFFF',
  pink:   '#FF2D78',
  purple: '#BF00FF',
  green:  '#00FF94',
}

function migrateAccent(stored) {
  if (!stored) return '#8B5CF6'
  if (stored.startsWith('#')) return stored
  return ACCENT_LEGACY[stored] ?? '#8B5CF6'
}

export const useAppStore = create((set, get) => ({
  // ─── Todos ─────────────────────────────────────────────
  todos:     lv(SK.todos, []),
  todoOrder: lv(SK.todoOrder, []),
  cats:      lv(SK.cats, []),
  projects:  lv(SK.projects, []),

  setTodos: (todos) => {
    const next = typeof todos === 'function' ? todos(get().todos) : todos
    set({ todos: next })
    sv(SK.todos, next)
  },
  setTodoOrder: (order) => { set({ todoOrder: order }); sv(SK.todoOrder, order) },
  setCats: (cats) => { set({ cats }); sv(SK.cats, cats) },
  setProjects: (projects) => {
    const next = typeof projects === 'function' ? projects(get().projects) : projects
    set({ projects: next })
    sv(SK.projects, next)
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
  modules:  lv(SK.modules, DEFAULT_MODULES),

  setSettings: (s) => {
    const next = typeof s === 'function' ? s(get().settings) : s
    set({ settings: next })
    sv(SK.settings, next)
  },
  setTheme: (t) => { set({ theme: t }); sv(SK.theme, t) },
  setModules: (m) => {
    const next = typeof m === 'function' ? m(get().modules) : m
    set({ modules: next })
    sv(SK.modules, next)
  },

  // ─── Navigation ────────────────────────────────────────
  currentTab:   0,
  previousTab:  2,
  setCurrentTab: (tab) => set((state) => ({ previousTab: state.currentTab, currentTab: tab })),
  backInterceptor: null,
  setBackInterceptor: (fn) => set({ backInterceptor: fn }),
  heuteModus: 'manuell',
  setHeuteModus: (modus) => set({ heuteModus: modus }),
  dayplanDate: null,
  setDayplanDate: (dk) => set({ dayplanDate: dk }),
  calendarDate: null,
  setCalendarDate: (dk) => set({ calendarDate: dk }),

  // ─── Kognitiv auto-start ──────────────────────────────
  kognitivAutoStart: null,
  setKognitivAutoStart: (id) => set({ kognitivAutoStart: id }),

  // ─── Active Tools ──────────────────────────────────────
  activeTools: lv(SK.activeTools, ['timer', 'rad']),
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
  klaerenSettings: lv(SK.klaerenSettings, { threshold: 30, ageColor: '#FB923C' }),
  setKlaerenSettings: (s) => {
    const next = typeof s === 'function' ? s(get().klaerenSettings) : s
    set({ klaerenSettings: next })
    sv(SK.klaerenSettings, next)
  },
}))
