import { isFaelligkeit, isTermin } from '../todos/Block'
import { todayKey } from '../../utils'

// Sortierung wie im Pool: standard (fällig → prio → alter), kategorie, alter.
export function sortTodos(list, sort) {
  if (sort === 'alter') {
    return [...list].sort((a, b) =>
      new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    )
  }
  if (sort === 'kategorie') {
    return [...list].sort((a, b) => {
      const ca = a.category || '￿'
      const cb = b.category || '￿'
      return ca.localeCompare(cb) || (a.priority - b.priority)
    })
  }
  const today = todayKey()
  return [...list].sort((a, b) => {
    const fa = isFaelligkeit(a) && a.date <= today ? 0 : 1
    const fb = isFaelligkeit(b) && b.date <= today ? 0 : 1
    if (fa !== fb) return fa - fb
    if (a.priority !== b.priority) return a.priority - b.priority
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })
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
