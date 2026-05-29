// src/features/tools/projekte/projektUtils.js
import { todayKey } from '../../../utils'

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/** Neues Projekt-Objekt erzeugen */
export function createProject(catName) {
  return { id: genId(), catName, hidden: false, autoDelete: false }
}

/** Alle Todos einer Kategorie */
export function getProjectTodos(todos, catName) {
  return todos.filter(t => t.category === catName)
}

/** Fortschritt: { done, total } — inkl. geplante Todos */
export function getProgress(projectTodos) {
  return {
    done:  projectTodos.filter(t => t.done).length,
    total: projectTodos.length,
  }
}

/** True wenn Todo heute aktiv ist (showFromDate erreicht oder nicht gesetzt) */
export function isTodoActive(block) {
  return !block.showFromDate || block.showFromDate <= todayKey()
}

/**
 * Projekt abschließen:
 * - category → null auf allen Projekt-Todos
 * - catName aus cats entfernen
 * - Projekt aus projects entfernen
 */
export function closeProject({ catName, cats, projects, setTodos, setCats, setProjects }) {
  setTodos(prev => prev.map(t => t.category === catName ? { ...t, category: null } : t))
  setCats(cats.filter(c => c !== catName))
  setProjects(projects.filter(p => p.catName !== catName))
}

/**
 * Aus Projekten entfernen (Todos + Kategorie bleiben erhalten):
 */
export function deleteProject({ catName, projects, setProjects }) {
  setProjects(projects.filter(p => p.catName !== catName))
}
