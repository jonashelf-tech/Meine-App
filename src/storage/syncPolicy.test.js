// Guard G1 (sync-architektur.md §9): Jeder Storage-Key hat genau eine Sync-Policy.
// Neuer SK-Key ohne Policy-Eintrag = roter Test. Vorbild: Backup-Abdeckung.
import { describe, it, expect } from 'vitest'
import { SK, SYNC_POLICY, EPHEMERAL, BACKUP_CATS } from './index'

const ALLOWED = new Set(['ephemeral', 'device-local', 'lww', 'byId', 'byId:date', 'bySubkey', 'bySubkey2', 'cal'])

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

  it('Geteilte-Kalender-Keys: Policy + Backup wie teilen-spec.md §3.4', () => {
    expect(SYNC_POLICY[SK.calCreds]).toBe('bySubkey')       // Key-Wrapping — wandert per persönlichem Sync mit
    expect(SYNC_POLICY[SK.calList]).toBe('cal')             // routet NUR die Kalender-Engine (G6)
    expect(SYNC_POLICY[SK.calTombstones]).toBe('cal')
    expect(SYNC_POLICY[SK.calFilter]).toBe('device-local')  // Sichtbarkeit pro Gerät
    expect(SYNC_POLICY[SK.calSeen]).toBe('ephemeral')       // Aktivitäts-Blick pro Gerät
    // 'cal'-Keys sind echte Nutzdaten → im Backup, nicht ephemer
    expect(BACKUP_CATS.kalender).toContain(SK.calList)
    expect(BACKUP_CATS.kalender).toContain(SK.calTombstones)
    expect(BACKUP_CATS.kalender).toContain(SK.calFilter)
    expect(BACKUP_CATS.einstellungen).toContain(SK.calCreds)
  })

  it('cal-Keys sind für den persönlichen Sync unsichtbar (G6-Fundament)', () => {
    // Die persönliche Engine synct nur lww + mergebare Policies; 'cal' fällt raus.
    const MERGEABLE = new Set(['byId', 'byId:date', 'bySubkey', 'bySubkey2'])
    const personalSyncs = (k) => SYNC_POLICY[k] === 'lww' || MERGEABLE.has(SYNC_POLICY[k])
    expect(personalSyncs(SK.calList)).toBe(false)
    expect(personalSyncs(SK.calTombstones)).toBe(false)
  })
})
