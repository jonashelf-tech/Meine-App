import { describe, it, expect } from 'vitest'
import { sortTodos, getActiveTodos } from './poolLogic'

const todayKey = () => new Date().toISOString().slice(0, 10)

describe('sortTodos — standard', () => {
  it('fällige (date <= heute, keine Uhrzeit) zuerst, dann nach Prio', () => {
    const heute = todayKey()
    const list = [
      { id: 'a', priority: 3, createdAt: '2020-01-01' },
      { id: 'b', priority: 1, createdAt: '2020-01-01' },
      { id: 'c', priority: 2, date: heute, createdAt: '2020-01-01' },
    ]
    const out = sortTodos(list, 'standard').map(t => t.id)
    expect(out).toEqual(['c', 'b', 'a'])
  })
})

describe('sortTodos — pausierte ans Ende', () => {
  it('pausierte landen hinter offenen, unabhängig von Prio', () => {
    const list = [
      { id: 'p1', priority: 1, paused: true, createdAt: '2020-01-01' },
      { id: 'a',  priority: 3, createdAt: '2020-01-01' },
      { id: 'b',  priority: 1, createdAt: '2020-01-01' },
    ]
    const out = sortTodos(list, 'standard').map(t => t.id)
    expect(out).toEqual(['b', 'a', 'p1'])
  })

  it('erhält die normale Sortierung innerhalb der pausierten Gruppe', () => {
    const list = [
      { id: 'p2', priority: 3, paused: true, createdAt: '2020-01-01' },
      { id: 'p1', priority: 1, paused: true, createdAt: '2020-01-01' },
      { id: 'a',  priority: 2, createdAt: '2020-01-01' },
    ]
    const out = sortTodos(list, 'standard').map(t => t.id)
    expect(out).toEqual(['a', 'p1', 'p2'])
  })

  it('gilt auch für sort=alter und sort=kategorie', () => {
    const list = [
      { id: 'p', priority: 1, paused: true, createdAt: '2020-01-01', category: 'A' },
      { id: 'x', priority: 1, createdAt: '2020-02-01', category: 'B' },
    ]
    expect(sortTodos(list, 'alter').map(t => t.id)).toEqual(['x', 'p'])
    expect(sortTodos(list, 'kategorie').map(t => t.id)).toEqual(['x', 'p'])
  })
})

describe('getActiveTodos', () => {
  it('filtert erledigte, Termine und verplante Todos raus', () => {
    const heute = todayKey()
    const todos = [
      { id: 'open',  priority: 1, createdAt: '2020-01-01' },
      { id: 'done',  priority: 1, done: true, createdAt: '2020-01-01' },
      { id: 'termin', priority: 1, date: heute, time: '14:00', createdAt: '2020-01-01' },
      { id: 'placed', priority: 1, createdAt: '2020-01-01' },
    ]
    const todaySlots = { '9': { todoId: 'placed', text: 'x' } }
    const out = getActiveTodos(todos, todaySlots).map(t => t.id)
    expect(out).toEqual(['open'])
  })

  it('erkennt textbasiert verplante Slots (ohne todoId) nur bei eindeutigem Text', () => {
    const todos = [{ id: 'x', text: 'Einkaufen', priority: 1, createdAt: '2020-01-01' }]
    const todaySlots = { '9': { text: 'Einkaufen' } }
    expect(getActiveTodos(todos, todaySlots)).toEqual([])
  })
})
