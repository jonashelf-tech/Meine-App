// Guard G7 (teilen-spec.md §3.2/§10): der Stempel-Choke-Point. Nur der
// Store-Wrapper stempelt updatedAt/by an geteilten Records — nie eine UI-Stelle.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { sv, SK } from '../../storage'
import { stampCal, myMemberId, CAL_PERSONAL_FIELDS } from './calStamp'
import { createBlock } from '../todos/Block'
import { createProject } from '../projekte/projektModel'

beforeEach(() => { localStorage.clear() })

describe('Modell-Felder (teilen-spec.md §3.1)', () => {
  it('createBlock hat cal/updatedAt/by = null (additiv, Default = heutiges Verhalten)', () => {
    const b = createBlock()
    expect(b.cal).toBeNull()
    expect(b.updatedAt).toBeNull()
    expect(b.by).toBeNull()
  })
  it('createProject hat cal/updatedAt/by = null', () => {
    const p = createProject()
    expect(p.cal).toBeNull()
    expect(p.updatedAt).toBeNull()
    expect(p.by).toBeNull()
  })
})

describe('myMemberId', () => {
  it('liest die eigene Mitglieds-ID aus den Creds', () => {
    sv(SK.calCreds, { CAL1: { key: 'k', memberId: 'me123456', joinedAt: 1 } })
    expect(myMemberId('CAL1')).toBe('me123456')
  })
  it('null, wenn keine Creds für den Kalender (z.B. nach Verlassen)', () => {
    expect(myMemberId('UNBEKANNT')).toBeNull()
  })
})

describe('stampCal (Choke-Point, §3.2)', () => {
  const seed = () => sv(SK.calCreds, { CAL1: { key: 'k', memberId: 'me', joinedAt: 1 } })

  it('stempelt einen neu geteilten Record mit updatedAt + by', () => {
    seed()
    const next = [createBlock({ id: 't1', cal: 'CAL1', text: 'Zahnarzt' })]
    const out = stampCal([], next, 1000)
    expect(out[0].updatedAt).toBe(1000)
    expect(out[0].by).toBe('me')
  })

  it('lässt private Records (cal=null) unberührt — identische Referenz', () => {
    seed()
    const next = [createBlock({ id: 't1', text: 'privat' })]
    const out = stampCal([], next, 1000)
    expect(out[0].updatedAt).toBeNull()
    expect(out[0].by).toBeNull()
    expect(out).toBe(next)
  })

  it('re-stempelt einen inhaltlich unveränderten Record NICHT', () => {
    seed()
    const rec = createBlock({ id: 't1', cal: 'CAL1', text: 'x', updatedAt: 500, by: 'me' })
    const out = stampCal([rec], [{ ...rec }], 9999)
    expect(out[0].updatedAt).toBe(500)
  })

  it('stempelt bei echter Inhaltsänderung neu', () => {
    seed()
    const rec = createBlock({ id: 't1', cal: 'CAL1', text: 'alt', updatedAt: 500, by: 'me' })
    const out = stampCal([rec], [{ ...rec, text: 'neu' }], 9999)
    expect(out[0].updatedAt).toBe(9999)
    expect(out[0].by).toBe('me')
  })

  it('eine reine dayRank-Änderung (persönlich) stempelt NICHT', () => {
    seed()
    const rec = createBlock({ id: 't1', cal: 'CAL1', date: '2026-07-20', updatedAt: 500, by: 'me' })
    const out = stampCal([rec], [{ ...rec, dayRank: 3 }], 9999)
    expect(out[0].updatedAt).toBe(500)
    expect(CAL_PERSONAL_FIELDS).toContain('dayRank')
  })

  it('stempelt Records ohne eigene Mitgliedschaft NICHT (read-only nach Verlassen)', () => {
    const rec = createBlock({ id: 't1', cal: 'CALX', text: 'geerbt', updatedAt: 500, by: 'other' })
    const out = stampCal([rec], [{ ...rec, text: 'ich fasse an' }], 9999)
    expect(out[0].updatedAt).toBe(500)
    expect(out[0].by).toBe('other')
  })

  it('monoton: spätere Inhaltsänderung → updatedAt steigt', () => {
    seed()
    let recs = stampCal([], [createBlock({ id: 't1', cal: 'CAL1', text: 'a' })], 100)
    recs = stampCal(recs, [{ ...recs[0], text: 'b' }], 200)
    recs = stampCal(recs, [{ ...recs[0], text: 'c' }], 300)
    expect(recs[0].updatedAt).toBe(300)
  })

  it('stempelt auch Projekte (setProjects nutzt denselben Wrapper)', () => {
    seed()
    const out = stampCal([], [createProject({ id: 'p1', cal: 'CAL1', name: 'Urlaub' })], 700)
    expect(out[0].updatedAt).toBe(700)
    expect(out[0].by).toBe('me')
  })
})

describe('G7 — nur der Store-Wrapper stempelt', () => {
  const storeSrc = readFileSync(new URL('../../store/index.js', import.meta.url), 'utf8')
  it('store importiert stampCal und nutzt ihn (setTodos + setProjects)', () => {
    expect(storeSrc).toMatch(/import\s*\{[^}]*stampCal[^}]*\}\s*from/)
    expect((storeSrc.match(/stampCal\(/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})
