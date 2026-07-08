// projektModel.js — Projekte als Kernfunktion (Spec: Dateien/output/projekte-kernfunktion-spec.md)
// Farben sind Daten (wie moduleConfig): bewusst OHNE Akzent-Violett #8B5CF6 —
// das bleibt „Todo ohne Projekt".
export const PROJEKT_COLORS = [
  '#4D9EFF', '#14B8A6', '#10B981', '#84CC16', '#F59E0B',
  '#FB7185', '#FF6EC7', '#E040FB', '#7C4DFF', '#38BDFF',
]

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const createProject = (partial = {}) => ({
  id:         genId(),
  name:       '',
  color:      PROJEKT_COLORS[0],
  hidden:     false,
  autoDelete: false,
  createdAt:  new Date().toISOString(),
  ...partial,
})

export function nextFreeColor(projects) {
  const used = projects.map(p => p.color)
  const free = PROJEKT_COLORS.find(c => !used.includes(c))
  if (free) return free
  let best = PROJEKT_COLORS[0], bestCount = Infinity
  for (const c of PROJEKT_COLORS) {
    const n = used.filter(u => u === c).length
    if (n < bestCount) { best = c; bestCount = n }
  }
  return best
}

export const findProjectByName = (projects, name) =>
  projects.find(p => p.name.trim().toLowerCase() === String(name).trim().toLowerCase()) ?? null

/** Name → vorhandenes oder neues Projekt. Gibt { projects, project } zurück. */
export function resolveProject(projects, name) {
  const found = findProjectByName(projects, name)
  if (found) return { projects, project: found }
  const project = createProject({ name: String(name).trim(), color: nextFreeColor(projects) })
  return { projects: [...projects, project], project }
}

/** Farbwechsel-Sweep: Projekt + zugehörige Todos + referenzierende Slots. Pure. */
export function recolorProject({ projects, todos, days }, projectId, color) {
  const ids = new Set(todos.filter(t => t.projectId === projectId).map(t => t.id))
  const nextDays = {}
  let daysChanged = false
  for (const dk of Object.keys(days)) {
    const day = days[dk]
    let dayChanged = false
    const nextDay = {}
    for (const slotKey of Object.keys(day)) {
      const slot = day[slotKey]
      if (slot?.todoId && ids.has(slot.todoId) && slot.color !== color) {
        nextDay[slotKey] = { ...slot, color }
        dayChanged = true
      } else nextDay[slotKey] = slot
    }
    nextDays[dk] = dayChanged ? nextDay : day
    daysChanged = daysChanged || dayChanged
  }
  return {
    projects: projects.map(p => p.id === projectId ? { ...p, color } : p),
    todos:    todos.map(t => t.projectId === projectId ? { ...t, color } : t),
    days:     daysChanged ? nextDays : days,
  }
}

/** Projekt auflösen: Zuordnung weg, Todos (samt Farbe) bleiben. Pure. */
export function dissolveProject({ projects, todos }, projectId) {
  return {
    projects: projects.filter(p => p.id !== projectId),
    todos:    todos.map(t => t.projectId === projectId ? { ...t, projectId: null } : t),
  }
}
