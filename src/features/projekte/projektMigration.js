// Boot-Migration Kategorie→Projekt (Spec §3) — marker-los & idempotent:
// Shape entscheidet, nicht ein Versions-Key. Läuft VOR der Store-Initialisierung
// (store/index.js) und heilt damit auch Restores alter Backups beim nächsten Boot.
import { sv, lv, SK, saveAutoBackup } from '../../storage'
import { createProject, nextFreeColor, findProjectByName } from './projektModel'

export function needsMigration(projects, todos, cats) {
  return projects.some(p => 'catName' in p || p.color == null)
      || todos.some(t => 'category' in t)
      || cats.length > 0
}

export function migrateData({ projects, todos, cats, days }) {
  // 1) Projekte normalisieren: catName→name, fehlende Farbe vergeben,
  //    Duplikate (gleicher Name) — erstes gewinnt
  const byName = new Map()
  const nextProjects = []
  for (const p of projects) {
    const name = (p.catName ?? p.name ?? '').trim()
    const key = name.toLowerCase()
    if (byName.has(key)) continue
    const rest = { ...p }
    delete rest.catName
    const proj = { ...rest, name, color: p.color ?? nextFreeColor(nextProjects) }
    byName.set(key, proj)
    nextProjects.push(proj)
  }
  // 2) cats-Strings ohne Projekt → neue Projekte
  for (const c of cats) {
    const name = String(c).trim()
    if (!name || byName.has(name.toLowerCase())) continue
    const proj = createProject({ name, color: nextFreeColor(nextProjects) })
    byName.set(name.toLowerCase(), proj)
    nextProjects.push(proj)
  }
  // 3) todo.category → projectId (+ Farb-Sweep), Feld entfernen
  const colorByTodoId = new Map()
  const nextTodos = todos.map(t => {
    if (!('category' in t)) return t
    const { category, ...rest } = t
    if (!category) return { ...rest, projectId: rest.projectId ?? null }
    let proj = findProjectByName(nextProjects, category)
    if (!proj) {
      proj = createProject({ name: String(category).trim(), color: nextFreeColor(nextProjects) })
      byName.set(proj.name.toLowerCase(), proj)
      nextProjects.push(proj)
    }
    colorByTodoId.set(t.id, proj.color)
    return { ...rest, projectId: proj.id, color: proj.color }
  })
  // 4) Slots referenzierter Todos mitfärben
  let nextDays = days
  if (colorByTodoId.size) {
    nextDays = {}
    for (const dk of Object.keys(days)) {
      const day = days[dk]
      let changed = false
      const nd = {}
      for (const slotKey of Object.keys(day)) {
        const slot = day[slotKey]
        const c = slot?.todoId ? colorByTodoId.get(slot.todoId) : undefined
        if (c && slot.color !== c) { nd[slotKey] = { ...slot, color: c }; changed = true }
        else nd[slotKey] = slot
      }
      nextDays[dk] = changed ? nd : day
    }
  }
  return { projects: nextProjects, todos: nextTodos, cats: [], days: nextDays }
}

/** Boot-Einstieg: liest/schreibt localStorage. true = es wurde migriert. */
export function migrateProjekte() {
  const projects = lv(SK.projects, [])
  const todos    = lv(SK.todos, [])
  const cats     = lv(SK.cats, [])
  if (!needsMigration(projects, todos, cats)) return false
  saveAutoBackup(true) // Snapshot des ALTEN Stands (synchron erfasst, Write async)
  const out = migrateData({ projects, todos, cats, days: lv(SK.days, {}) })
  sv(SK.projects, out.projects)
  sv(SK.todos, out.todos)
  sv(SK.cats, [])
  sv(SK.days, out.days)
  return true
}
