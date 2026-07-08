import { describe, it, expect } from 'vitest'
import { needsMigration, migrateData } from './projektMigration'
import { PROJEKT_COLORS } from './projektModel'

const T = (o) => ({ id: o.id ?? 't' + Math.random(), text: '', color: '#8B5CF6', ...o })

describe('needsMigration', () => {
  it('false bei sauberem Neu-Zustand', () => {
    expect(needsMigration([{ id: 'p', name: 'W', color: '#4D9EFF' }], [{ id: 't', projectId: null }], [])).toBe(false)
  })
  it('true bei catName / category-Feld / cats-Resten', () => {
    expect(needsMigration([{ id: 'p', catName: 'W' }], [], [])).toBe(true)
    expect(needsMigration([], [T({ category: null })], [])).toBe(true)
    expect(needsMigration([], [], ['Uni'])).toBe(true)
  })
})

describe('migrateData', () => {
  it('catName → name + Farbe; cats ohne Projekt → neues Projekt; cats geleert', () => {
    const out = migrateData({
      projects: [{ id: 'p1', catName: 'Wohnung', hidden: false, autoDelete: false }],
      todos: [], cats: ['Wohnung', 'Uni'], days: {},
    })
    expect(out.projects).toHaveLength(2)
    expect(out.projects[0]).toMatchObject({ id: 'p1', name: 'Wohnung' })
    expect(out.projects[0].catName).toBeUndefined()
    expect(PROJEKT_COLORS).toContain(out.projects[0].color)
    expect(out.projects[1].name).toBe('Uni')
    expect(out.projects[0].color).not.toBe(out.projects[1].color)
    expect(out.cats).toEqual([])
  })
  it('Duplikat-Projekte auf gleichen Namen: erstes gewinnt', () => {
    const out = migrateData({
      projects: [{ id: 'p1', catName: 'W' }, { id: 'p2', catName: 'W' }],
      todos: [], cats: ['W'], days: {},
    })
    expect(out.projects).toHaveLength(1)
    expect(out.projects[0].id).toBe('p1')
  })
  it('todo.category → projectId + Farb-Sweep (Todo + Slot); category-Feld entfernt', () => {
    const out = migrateData({
      projects: [{ id: 'p1', catName: 'Wohnung' }],
      todos: [T({ id: 't1', category: 'Wohnung' }), T({ id: 't2', category: null })],
      cats: ['Wohnung'],
      days: { '2026-07-08': { '9': { todoId: 't1', color: '#8B5CF6', text: 'x' } } },
    })
    const p = out.projects[0]
    expect(out.todos[0].projectId).toBe('p1')
    expect(out.todos[0].color).toBe(p.color)
    expect('category' in out.todos[0]).toBe(false)
    expect(out.todos[1].projectId).toBeNull()
    expect('category' in out.todos[1]).toBe(false)
    expect(out.days['2026-07-08']['9'].color).toBe(p.color)
  })
  it('Orphan-category ohne Projekt/cat → Projekt wird angelegt', () => {
    const out = migrateData({ projects: [], todos: [T({ id: 't1', category: 'Neu' })], cats: [], days: {} })
    expect(out.projects).toHaveLength(1)
    expect(out.projects[0].name).toBe('Neu')
    expect(out.todos[0].projectId).toBe(out.projects[0].id)
  })
  it('idempotent: zweiter Lauf ändert nichts mehr', () => {
    const once = migrateData({
      projects: [{ id: 'p1', catName: 'W' }],
      todos: [T({ id: 't1', category: 'W' })], cats: ['W'], days: {},
    })
    expect(needsMigration(once.projects, once.todos, once.cats)).toBe(false)
  })
})
