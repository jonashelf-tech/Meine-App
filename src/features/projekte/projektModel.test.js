import { describe, it, expect } from 'vitest'
import {
  PROJEKT_COLORS, createProject, nextFreeColor, findProjectByName,
  resolveProject, recolorProject, dissolveProject,
} from './projektModel'

describe('PROJEKT_COLORS', () => {
  it('hat 10 eindeutige Farben, ohne Akzent-Violett', () => {
    expect(PROJEKT_COLORS).toHaveLength(10)
    expect(new Set(PROJEKT_COLORS).size).toBe(10)
    expect(PROJEKT_COLORS).not.toContain('#8B5CF6')
  })
})

describe('createProject', () => {
  it('liefert vollständiges Projekt mit UUID + createdAt', () => {
    const p = createProject({ name: 'Wohnung', color: '#4D9EFF' })
    expect(p.id).toBeTruthy()
    expect(p.name).toBe('Wohnung')
    expect(p.color).toBe('#4D9EFF')
    expect(p.hidden).toBe(false)
    expect(p.autoDelete).toBe(false)
    expect(p.createdAt).toBeTruthy()
    expect(createProject().id).not.toBe(createProject().id)
  })
})

describe('nextFreeColor', () => {
  it('gibt erste unbenutzte Farbe (auch ausgeblendete Projekte zählen)', () => {
    const projects = [
      { id: 'a', color: PROJEKT_COLORS[0], hidden: true },
      { id: 'b', color: PROJEKT_COLORS[1], hidden: false },
    ]
    expect(nextFreeColor(projects)).toBe(PROJEKT_COLORS[2])
  })
  it('alle belegt → am seltensten genutzte', () => {
    const projects = PROJEKT_COLORS.flatMap((c, i) =>
      Array.from({ length: i === 3 ? 1 : 2 }, (_, k) => ({ id: `${c}${k}`, color: c })))
    expect(nextFreeColor(projects)).toBe(PROJEKT_COLORS[3])
  })
  it('leere Liste → erste Palettenfarbe', () => {
    expect(nextFreeColor([])).toBe(PROJEKT_COLORS[0])
  })
})

describe('findProjectByName / resolveProject', () => {
  const ps = [{ id: 'p1', name: 'Wohnung', color: '#4D9EFF' }]
  it('findet case-insensitiv + getrimmt', () => {
    expect(findProjectByName(ps, '  wohnung ')).toBe(ps[0])
    expect(findProjectByName(ps, 'Einkauf')).toBeNull()
  })
  it('resolveProject: vorhandenes Projekt → unveränderte Liste', () => {
    const r = resolveProject(ps, 'WOHNUNG')
    expect(r.project).toBe(ps[0])
    expect(r.projects).toBe(ps)
  })
  it('resolveProject: unbekannter Name → legt mit freier Farbe an', () => {
    const r = resolveProject(ps, ' Uni ')
    expect(r.project.name).toBe('Uni')
    expect(r.project.color).toBe(nextFreeColor(ps))
    expect(r.projects).toHaveLength(2)
  })
})

describe('recolorProject — Sweep', () => {
  const state = {
    projects: [{ id: 'p1', name: 'W', color: '#4D9EFF' }],
    todos: [
      { id: 't1', projectId: 'p1', color: '#4D9EFF' },
      { id: 't2', projectId: null, color: '#8B5CF6' },
    ],
    days: {
      '2026-07-08': {
        '9':  { todoId: 't1', color: '#4D9EFF', text: 'x' },
        '10': { todoId: 't2', color: '#8B5CF6', text: 'y' },
        '11': { text: 'text-slot ohne todoId', color: '#4D9EFF' },
      },
    },
  }
  it('färbt Projekt + Projekt-Todos + referenzierende Slots, sonst nichts', () => {
    const out = recolorProject(state, 'p1', '#F59E0B')
    expect(out.projects[0].color).toBe('#F59E0B')
    expect(out.todos[0].color).toBe('#F59E0B')
    expect(out.todos[1].color).toBe('#8B5CF6')
    expect(out.days['2026-07-08']['9'].color).toBe('#F59E0B')
    expect(out.days['2026-07-08']['10'].color).toBe('#8B5CF6')
    expect(out.days['2026-07-08']['11'].color).toBe('#4D9EFF')
    expect(state.todos[0].color).toBe('#4D9EFF') // Input unverändert (pure)
  })
})

describe('dissolveProject — Auflösen', () => {
  it('entfernt Projekt, nullt projectId, Todos + Farben bleiben', () => {
    const out = dissolveProject({
      projects: [{ id: 'p1', name: 'W', color: '#4D9EFF' }],
      todos: [{ id: 't1', projectId: 'p1', color: '#4D9EFF', text: 'bleibt' }],
    }, 'p1')
    expect(out.projects).toHaveLength(0)
    expect(out.todos[0]).toMatchObject({ projectId: null, color: '#4D9EFF', text: 'bleibt' })
  })
})
