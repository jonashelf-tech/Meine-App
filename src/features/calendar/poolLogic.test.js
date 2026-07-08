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

describe('sortTodos — projekt', () => {
  const projects = [
    { id: 'p-bau',  name: 'Bau',  color: '#4D9EFF' },
    { id: 'p-auto', name: 'Auto', color: '#14B8A6' },
  ]

  it('gruppiert nach Projekt-Name alphabetisch, innerhalb der Gruppe nach priority', () => {
    const list = [
      { id: 'bau2',  projectId: 'p-bau',  priority: 2, createdAt: '2020-01-01' },
      { id: 'auto1', projectId: 'p-auto', priority: 1, createdAt: '2020-01-01' },
      { id: 'bau1',  projectId: 'p-bau',  priority: 1, createdAt: '2020-01-01' },
    ]
    const out = sortTodos(list, 'projekt', projects).map(t => t.id)
    expect(out).toEqual(['auto1', 'bau1', 'bau2'])
  })

  it('Todos ohne projectId landen als Gruppe zuletzt', () => {
    const list = [
      { id: 'ohne', projectId: null,     priority: 1, createdAt: '2020-01-01' },
      { id: 'auto', projectId: 'p-auto', priority: 1, createdAt: '2020-01-01' },
    ]
    const out = sortTodos(list, 'projekt', projects).map(t => t.id)
    expect(out).toEqual(['auto', 'ohne'])
  })

  it('dangling projectId (kein passendes Projekt in der Liste) verhält sich wie ohne Projekt', () => {
    const list = [
      { id: 'dangling', projectId: 'unbekannt', priority: 1, createdAt: '2020-01-01' },
      { id: 'auto',     projectId: 'p-auto',    priority: 1, createdAt: '2020-01-01' },
    ]
    const out = sortTodos(list, 'projekt', projects).map(t => t.id)
    expect(out).toEqual(['auto', 'dangling'])
  })

  it('sort=kategorie (Alt-Wert aus persistiertem View-State) verhält sich exakt wie projekt', () => {
    const list = [
      { id: 'bau1',  projectId: 'p-bau',  priority: 1, createdAt: '2020-01-01' },
      { id: 'auto1', projectId: 'p-auto', priority: 1, createdAt: '2020-01-01' },
      { id: 'ohne',  projectId: null,     priority: 1, createdAt: '2020-01-01' },
    ]
    expect(sortTodos(list, 'kategorie', projects).map(t => t.id))
      .toEqual(sortTodos(list, 'projekt', projects).map(t => t.id))
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
    const projects = [
      { id: 'p-a', name: 'A' },
      { id: 'p-b', name: 'B' },
    ]
    const list = [
      { id: 'p', priority: 1, paused: true, createdAt: '2020-01-01', projectId: 'p-a' },
      { id: 'x', priority: 1, createdAt: '2020-02-01', projectId: 'p-b' },
    ]
    expect(sortTodos(list, 'alter').map(t => t.id)).toEqual(['x', 'p'])
    expect(sortTodos(list, 'kategorie', projects).map(t => t.id)).toEqual(['x', 'p'])
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
