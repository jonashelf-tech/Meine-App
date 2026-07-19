// TDD für die reine Mutations-Logik von calStore (teilen-spec.md §3.5/§3.7):
// Tombstones bei Löschen/Umzug + projectId-Regel. Die Netz-Orchestratoren
// (createCal/joinCal/leaveCal) verifiziert die Feuerprobe/Abnahme (A8/A12).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  addTombstone, projectIdForCal, moveRecordToCal, deleteSharedRecord,
  createCal, joinCal,
} from './calStore'
import { generateCalCreds, buildCalInvite, parseCalInvite } from '../../sync/crypto'
import { sv, lv, SK } from '../../storage'
import { createBlock } from '../todos/Block'
import { createProject } from '../projekte/projektModel'

const memberIdOf = () => 'me'

describe('addTombstone', () => {
  it('legt einen Tombstone im Topf des Kalenders an', () => {
    const out = addTombstone({}, 'CAL1', { id: 't1', updatedAt: 100, by: 'me' })
    expect(out.CAL1).toEqual([{ id: 't1', updatedAt: 100, by: 'me' }])
  })
  it('dedupt pro id — neuerer Stempel ersetzt den alten', () => {
    const start = { CAL1: [{ id: 't1', updatedAt: 100, by: 'me' }] }
    const out = addTombstone(start, 'CAL1', { id: 't1', updatedAt: 200, by: 'me' })
    expect(out.CAL1).toEqual([{ id: 't1', updatedAt: 200, by: 'me' }])
  })
  it('lässt andere Kalender unberührt', () => {
    const start = { CAL2: [{ id: 'x', updatedAt: 1, by: 'a' }] }
    const out = addTombstone(start, 'CAL1', { id: 't1', updatedAt: 100, by: 'me' })
    expect(out.CAL2).toBe(start.CAL2)
  })
})

describe('projectIdForCal (§3.7 — Projekt nur im selben Kalender)', () => {
  const projects = [
    createProject({ id: 'pPriv', cal: null }),
    createProject({ id: 'pCal1', cal: 'CAL1' }),
  ]
  it('behält das Projekt bei gleichem Kalender', () => {
    expect(projectIdForCal('pCal1', 'CAL1', projects)).toBe('pCal1')
    expect(projectIdForCal('pPriv', null, projects)).toBe('pPriv')
  })
  it('nullt das Projekt bei fremdem Kalender', () => {
    expect(projectIdForCal('pPriv', 'CAL1', projects)).toBeNull()   // privates Projekt an geteiltem Record
    expect(projectIdForCal('pCal1', null, projects)).toBeNull()
  })
  it('nullt dangling/leere Referenzen', () => {
    expect(projectIdForCal('weg', 'CAL1', projects)).toBeNull()
    expect(projectIdForCal(null, 'CAL1', projects)).toBeNull()
  })
})

describe('moveRecordToCal (§3.5)', () => {
  const projects = [createProject({ id: 'pPriv', cal: null })]

  it('privat → Kalender: setzt cal, kein Tombstone (war in keinem Topf)', () => {
    const todos = [createBlock({ id: 't1', text: 'Zahnarzt' })]
    const { todos: out, tombstones } = moveRecordToCal({ todos, projects, tombstones: {} }, 't1', 'CAL1', memberIdOf, 500)
    expect(out[0].cal).toBe('CAL1')
    expect(out[0].updatedAt).toBeNull()   // Stempeln übernimmt der Store-Wrapper (stampCal)
    expect(tombstones).toEqual({})
  })

  it('privat → Kalender: nullt ein privates Projekt (projectId-Regel)', () => {
    const todos = [createBlock({ id: 't1', projectId: 'pPriv' })]
    const { todos: out } = moveRecordToCal({ todos, projects, tombstones: {} }, 't1', 'CAL1', memberIdOf, 500)
    expect(out[0].projectId).toBeNull()
  })

  it('Kalender → privat: Tombstone im alten Kalender + Stempel genullt', () => {
    const todos = [createBlock({ id: 't1', cal: 'CAL1', updatedAt: 400, by: 'me' })]
    const { todos: out, tombstones } = moveRecordToCal({ todos, projects, tombstones: {} }, 't1', null, memberIdOf, 500)
    expect(out[0].cal).toBeNull()
    expect(out[0].updatedAt).toBeNull()
    expect(out[0].by).toBeNull()
    expect(tombstones.CAL1).toEqual([{ id: 't1', updatedAt: 500, by: 'me' }])
  })

  it('Kalender → anderer Kalender: Tombstone im alten Topf, cal umgesetzt', () => {
    const todos = [createBlock({ id: 't1', cal: 'CAL1' })]
    const { todos: out, tombstones } = moveRecordToCal({ todos, projects, tombstones: {} }, 't1', 'CAL2', memberIdOf, 500)
    expect(out[0].cal).toBe('CAL2')
    expect(tombstones.CAL1).toEqual([{ id: 't1', updatedAt: 500, by: 'me' }])
    expect(tombstones.CAL2).toBeUndefined()
  })

  it('gleicher Kalender: No-Op', () => {
    const todos = [createBlock({ id: 't1', cal: 'CAL1' })]
    const res = moveRecordToCal({ todos, projects, tombstones: {} }, 't1', 'CAL1', memberIdOf, 500)
    expect(res.todos).toBe(todos)
    expect(res.tombstones).toEqual({})
  })
})

describe('deleteSharedRecord (§3.5)', () => {
  it('geteilt: raus aus dem Array + Tombstone', () => {
    const todos = [createBlock({ id: 't1', cal: 'CAL1' }), createBlock({ id: 't2' })]
    const { todos: out, tombstones } = deleteSharedRecord({ todos, tombstones: {} }, 't1', memberIdOf, 500)
    expect(out.map(t => t.id)).toEqual(['t2'])
    expect(tombstones.CAL1).toEqual([{ id: 't1', updatedAt: 500, by: 'me' }])
  })
  it('privat: raus aus dem Array, kein Tombstone', () => {
    const todos = [createBlock({ id: 't1' })]
    const { todos: out, tombstones } = deleteSharedRecord({ todos, tombstones: {} }, 't1', memberIdOf, 500)
    expect(out).toEqual([])
    expect(tombstones).toEqual({})
  })
})

// Netz-Orchestratoren gegen die Server-Routen aus A2 (fetch gemockt) — sichert
// den Client↔Server-Vertrag ab, bevor die Einstellungen-Karte (A8) ihn nutzt.
describe('createCal / joinCal (Server-Vertrag)', () => {
  const okJson = (status, body) => ({ ok: status < 400, status, json: async () => body })
  beforeEach(() => {
    localStorage.clear()
    sv(SK.cloudCreds, { serverUrl: 'http://x', token: 'tok', key: 'k', syncOn: false })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('createCal legt Creds + Meta an und liefert einen parsebaren Einladungs-Code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson(201, { ok: true })))
    const { calId, invite } = await createCal({ name: 'Familie', emoji: '👨‍👩‍👧', myName: 'Jonas' })
    const parsed = await parseCalInvite(invite)
    expect(parsed.calId).toBe(calId)
    expect(lv(SK.calCreds, {})[calId].key).toBe(parsed.calKey)   // Schlüssel im Code == lokal gespeicherter
    expect(lv(SK.calList, {})[calId].name).toBe('Familie')
    expect(lv(SK.calList, {})[calId].emoji).toBe('👨‍👩‍👧')   // Emoji = Kalender-Kennung (statt Farbe)
    expect(Object.values(lv(SK.calList, {})[calId].members)).toContain('Jonas')
  })

  it('joinCal speichert Creds aus dem Code + eigenen Namen', async () => {
    const src = generateCalCreds()
    const code = await buildCalInvite(src)
    vi.stubGlobal('fetch', vi.fn(async () => okJson(200, { ok: true })))
    const { calId } = await joinCal({ code, myName: 'Paula' })
    expect(calId).toBe(src.calId)
    expect(lv(SK.calCreds, {})[calId].key).toBe(src.calKey)
    expect(Object.values(lv(SK.calList, {})[calId].members)).toContain('Paula')
  })

  it('joinCal macht aus 409 eine sprechende Meldung', async () => {
    const code = await buildCalInvite(generateCalCreds())
    vi.stubGlobal('fetch', vi.fn(async () => okJson(409, { error: 'Keine offene Einladung' })))
    await expect(joinCal({ code, myName: 'Paula' })).rejects.toThrow(/schon benutzt/)
  })
})
