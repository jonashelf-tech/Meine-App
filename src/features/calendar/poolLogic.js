import { isFaelligkeit, isTermin } from '../todos/Block'
import { todayKey } from '../../utils'

// Sortierung wie im Pool: standard (fällig → prio → alter), projekt, alter.
// 'kategorie' ist der Alt-Wert aus persistiertem View-State (vor der
// Projekte-Migration) und verhält sich identisch zu 'projekt'.
// Pausierte Todos landen — unabhängig vom Sort — stabil ans Ende (raus aus dem
// präsenten Vordergrund, aber sichtbar). Innerhalb beider Gruppen bleibt die
// gewählte Sortierung erhalten.
export function sortTodos(list, sort, projects = []) {
  let sorted
  if (sort === 'alter') {
    sorted = [...list].sort((a, b) =>
      new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    )
  } else if (sort === 'projekt' || sort === 'kategorie') {
    const nameOf = (t) => {
      if (!t.projectId) return '￿'
      return projects.find(p => p.id === t.projectId)?.name ?? '￿'
    }
    sorted = [...list].sort((a, b) => {
      const na = nameOf(a), nb = nameOf(b)
      return na.localeCompare(nb) || (a.priority - b.priority)
    })
  } else {
    const today = todayKey()
    sorted = [...list].sort((a, b) => {
      const fa = isFaelligkeit(a) && a.date <= today ? 0 : 1
      const fb = isFaelligkeit(b) && b.date <= today ? 0 : 1
      if (fa !== fb) return fa - fb
      if (a.priority !== b.priority) return a.priority - b.priority
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    })
  }
  return [...sorted.filter(t => !t.paused), ...sorted.filter(t => t.paused)]
}

// Offene, nicht-terminierte, noch nicht verplante Todos (ungeordnet).
export function getActiveTodos(todos, todaySlots = {}) {
  const today = todayKey()
  const slotValues = Object.values(todaySlots).filter(Boolean)
  const placedIds   = new Set(slotValues.map(sl => sl.todoId).filter(Boolean))
  const placedTexts = new Set(slotValues.filter(sl => !sl.todoId).map(sl => sl.text).filter(Boolean))

  const counts = {}
  todos.forEach(t => { counts[t.text] = (counts[t.text] || 0) + 1 })
  const uniqueTexts = new Set(Object.keys(counts).filter(txt => counts[txt] === 1))

  const isPlaced = (t) =>
    placedIds.has(t.id) || (uniqueTexts.has(t.text) && placedTexts.has(t.text))

  return todos
    .filter(t => !t.done)
    .filter(t => !isTermin(t))
    .filter(t => !t.showFromDate || t.showFromDate <= today)
    .filter(t => !isPlaced(t))
}
