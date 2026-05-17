import { create } from 'zustand'
import { sv, lv, SK, DEFAULT_MODULES } from '../storage'

export const useAppStore = create((set, get) => ({
  // ─── Todos ─────────────────────────────────────────────
  todos:     lv(SK.todos, []),
  routines:  lv(SK.routines, []),
  todoOrder: lv(SK.todoOrder, []),
  cats:      lv(SK.cats, []),

  setTodos: (todos) => {
    const next = typeof todos === 'function' ? todos(get().todos) : todos
    set({ todos: next })
    sv(SK.todos, next)
  },
  setRoutines: (routines) => {
    const next = typeof routines === 'function' ? routines(get().routines) : routines
    set({ routines: next })
    sv(SK.routines, next)
  },
  setTodoOrder: (order) => { set({ todoOrder: order }); sv(SK.todoOrder, order) },
  setCats: (cats) => { set({ cats }); sv(SK.cats, cats) },

  // ─── Calendar ──────────────────────────────────────────
  days:         lv(SK.days, {}),
  doneCounters: lv(SK.doneCounters, {}),
  templates:    lv(SK.templates, []),

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
  setTemplates: (t) => { set({ templates: t }); sv(SK.templates, t) },

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
}))
