// Guard G1 (sync-architektur.md §9): Jeder Storage-Key hat genau eine Sync-Policy.
// Neuer SK-Key ohne Policy-Eintrag = roter Test. Vorbild: Backup-Abdeckung.
import { describe, it, expect } from 'vitest'
import { SK, SYNC_POLICY, EPHEMERAL, BACKUP_CATS } from './index'

const ALLOWED = new Set(['ephemeral', 'device-local', 'lww', 'byId', 'byId:date', 'bySubkey', 'bySubkey2'])

describe('Sync-Policy-Registry — Anti-Drift (G1)', () => {
  it('jeder SK-Key hat eine Policy', () => {
    const missing = Object.entries(SK)
      .filter(([, key]) => !(key in SYNC_POLICY))
      .map(([name]) => name)
    expect(missing).toEqual([])
  })

  it('keine Policy für unbekannte Keys (Waisen)', () => {
    const known = new Set(Object.values(SK))
    const orphans = Object.keys(SYNC_POLICY).filter(k => !known.has(k))
    expect(orphans).toEqual([])
  })

  it('nur erlaubte Policy-Werte', () => {
    const bad = Object.entries(SYNC_POLICY)
      .filter(([, p]) => !ALLOWED.has(p))
      .map(([k, p]) => `${k}: ${p}`)
    expect(bad).toEqual([])
  })

  it('EPHEMERAL ist aus der Registry abgeleitet (eine Quelle der Wahrheit)', () => {
    const derived = Object.entries(SYNC_POLICY)
      .filter(([, p]) => p === 'ephemeral')
      .map(([k]) => k)
      .sort()
    expect([...EPHEMERAL].sort()).toEqual(derived)
  })

  it('ephemere Keys sind NICHT im Backup, alle anderen SIND es', () => {
    const backedUp = new Set([
      ...BACKUP_CATS.kalender, ...BACKUP_CATS.tools, ...BACKUP_CATS.einstellungen,
    ])
    const wrong = Object.values(SK).filter(key =>
      SYNC_POLICY[key] === 'ephemeral' ? backedUp.has(key) : !backedUp.has(key)
    )
    expect(wrong).toEqual([])
  })

  it('Anker-Entscheidungen aus dem Design-Doc bleiben festgenagelt', () => {
    expect(SYNC_POLICY[SK.days]).toBe('bySubkey2')        // datum/slotKey — der Kern-Fall
    expect(SYNC_POLICY[SK.todos]).toBe('byId')
    expect(SYNC_POLICY[SK.weight]).toBe('byId:date')      // Einträge haben kein id-Feld
    expect(SYNC_POLICY[SK.doneCounters]).toBe('bySubkey')
    expect(SYNC_POLICY[SK.cloudCreds]).toBe('device-local') // Zugang synct sich nicht selbst
    expect(SYNC_POLICY[SK.cloudMeta]).toBe('ephemeral')
    expect(SYNC_POLICY[SK.heuteModus]).toBe('device-local') // View-State bleibt pro Gerät
  })
})
