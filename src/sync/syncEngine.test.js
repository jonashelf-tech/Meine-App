// Sync-Engine (sync-architektur.md §4/§8): sv-Hook → dirty + Stempel,
// Push mit If-Match, 409 → Pull-Merge-Retry, Erst-Kopplung = Server gewinnt.
// Fetch gemockt, Storage/Krypto/Merge echt.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sv, lv, SK, importData } from '../storage'
import { generateCreds, buildRecoveryCode, encryptPayload, hmacKeyId } from './crypto'
import { connectWithRecoveryCode } from './cloudBackup'
import {
  stopSync, setSyncEnabled, syncTick,
  scanOnce, pushDirtyNow, pullOnce, getSyncStatus,
} from './syncEngine'

const res = (status, body) => ({ ok: status < 300, status, json: async () => body })
const emptyPull = () => res(200, { rows: [], cursor: 0 })

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn(async () => emptyPull())
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  stopSync()
  vi.unstubAllGlobals()
})

// Cloud koppeln + Sync einschalten (initSync läuft gegen leeren Server)
const enable = async () => {
  const creds = generateCreds()
  await connectWithRecoveryCode({ serverUrl: 'https://sync.example', code: await buildRecoveryCode(creds) })
  await setSyncEnabled(true)
  return creds
}

describe('Gate', () => {
  it('ohne Aktivierung: Schreiben hinterlässt keine Sync-Spuren, syncTick ruft nichts', async () => {
    sv(SK.dailyState, { '2026-07-03': 2 })
    await syncTick()
    expect(lv(SK.syncMeta, null)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('Schreiben → dirty + Stempel', () => {
  it('sv auf einem merge-Key stempelt den Unterschlüssel und markiert dirty', async () => {
    await enable()
    sv(SK.dailyState, { '2026-07-03': 2 })
    const entry = lv(SK.syncMeta, {}).keys[SK.dailyState]
    expect(entry.dirty).toBe(true)
    expect(entry.sub['2026-07-03']).toBeGreaterThan(0)
  })

  it('Meta-Schreiben selbst löst keine Endlos-Spur aus (ephemeral wird ignoriert)', async () => {
    await enable()
    sv(SK.dailyState, { a: 1 })
    const keys = Object.keys(lv(SK.syncMeta, {}).keys)
    expect(keys).not.toContain(SK.syncMeta)
    expect(keys).not.toContain(SK.cloudCreds)
  })
})

describe('pushDirtyNow', () => {
  it('pusht verschlüsselt mit If-Match, übernimmt Version, dirty erlischt', async () => {
    await enable()
    sv(SK.dailyState, { '2026-07-03': 2 })
    fetchMock.mockResolvedValueOnce(res(200, { version: 1 }))

    await pushDirtyNow()

    const putCall = fetchMock.mock.calls.find(([, o]) => o?.method === 'PUT')
    const [url, opts] = putCall
    expect(url).toMatch(/\/kv\/[A-Za-z0-9_-]{22}$/)
    expect(url).not.toContain('daily_state')             // Key-Name pseudonymisiert
    expect(opts.headers['If-Match']).toBe('0')
    expect(opts.body).not.toContain('2026-07-03')       // kein Klartext
    const entry = lv(SK.syncMeta, {}).keys[SK.dailyState]
    expect(entry.v).toBe(1)
    expect(entry.dirty).toBe(false)
  })

  it('409 → Pull, Client-Merge, Retry mit neuer Version — nichts geht verloren', async () => {
    const creds = await enable()
    sv(SK.dailyState, { lokal: 1 })

    const keyId = await hmacKeyId(creds.key, SK.dailyState)
    const remoteEnv = await encryptPayload(creds.key, {
      value: { fremd: 9 }, sub: { fremd: Date.now() - 1000 }, del: {},
    })
    fetchMock
      .mockResolvedValueOnce(res(409, { version: 2 }))                       // 1. PUT scheitert
      .mockResolvedValueOnce(res(200, {                                      // Pull liefert Fremd-Stand
        rows: [{ keyId, version: 2, ciphertext: JSON.stringify(remoteEnv) }],
        cursor: 2,
      }))
      .mockResolvedValueOnce(res(200, { version: 3 }))                       // Retry-PUT ok

    await pushDirtyNow()

    expect(lv(SK.dailyState, {})).toEqual({ fremd: 9, lokal: 1 })          // Union!
    const entry = lv(SK.syncMeta, {}).keys[SK.dailyState]
    expect(entry.v).toBe(3)
    expect(entry.dirty).toBe(false)
    const secondPut = fetchMock.mock.calls.filter(([, o]) => o?.method === 'PUT')[1]
    expect(secondPut[1].headers['If-Match']).toBe('2')
  })
})

describe('Erst-Kopplung — Server gewinnt', () => {
  it('frisches Gerät übernimmt Server-Stand, ohne ihn dirty zu markieren', async () => {
    const creds = await enable()
    const keyId = await hmacKeyId(creds.key, SK.todos)
    const remoteEnv = await encryptPayload(creds.key, {
      value: [{ id: 'r1', text: 'Vom Server' }], sub: { r1: Date.now() - 500 }, del: {},
    })
    fetchMock.mockResolvedValueOnce(res(200, {
      rows: [{ keyId, version: 4, ciphertext: JSON.stringify(remoteEnv) }],
      cursor: 4,
    }))

    await pullOnce()

    expect(lv(SK.todos, [])).toEqual([{ id: 'r1', text: 'Vom Server' }])
    const entry = lv(SK.syncMeta, {}).keys[SK.todos]
    expect(entry.v).toBe(4)
    expect(entry.dirty).toBeFalsy()                     // Remote-Apply erzeugt keinen Re-Push
    expect(getSyncStatus().cursor).toBe(4)
  })

  it('unbekannte keyIds werden übersprungen, der Cursor rückt trotzdem vor', async () => {
    await enable()
    fetchMock.mockResolvedValueOnce(res(200, {
      rows: [{ keyId: 'XXunbekanntXXunbekannt', version: 7, ciphertext: '{}' }],
      cursor: 7,
    }))
    await pullOnce()
    expect(getSyncStatus().cursor).toBe(7)
  })
})

describe('Review-Fix R1 — Rehydrieren statt Reload', () => {
  it('Remote-Apply auf Store-Keys aktualisiert den Zustand-Store im Speicher', async () => {
    const { useAppStore } = await import('../store')
    const creds = await enable()
    const keyId = await hmacKeyId(creds.key, SK.todos)
    const remoteEnv = await encryptPayload(creds.key, {
      value: [{ id: 'r9', text: 'Live im Store' }], sub: { r9: Date.now() - 100 }, del: {},
    })
    fetchMock.mockResolvedValueOnce(res(200, {
      rows: [{ keyId, version: 2, ciphertext: JSON.stringify(remoteEnv) }],
      cursor: 2,
    }))

    await pullOnce()

    expect(useAppStore.getState().todos).toEqual([{ id: 'r9', text: 'Live im Store' }])
  })
})

describe('Review-Fix R5 — kein paralleler Sync-Zyklus', () => {
  it('syncTick während eines laufenden Ticks wird übersprungen', async () => {
    await enable()
    let release
    fetchMock.mockImplementationOnce(() => new Promise(r => { release = () => r(emptyPull()) }))

    const first = syncTick()                    // hängt im Pull
    await new Promise(r => setTimeout(r, 10))
    const callsWhileBusy = fetchMock.mock.calls.length
    await syncTick()                            // muss sofort zurückkommen, ohne Netz
    expect(fetchMock.mock.calls.length).toBe(callsWhileBusy)

    release()
    await first
  })
})

describe('scanOnce — fängt Trichter-Umgehungen', () => {
  it('importData (Restore) schreibt am Hook vorbei — der Scan sieht es', async () => {
    await enable()
    sv(SK.dailyState, { a: 1 })
    fetchMock.mockResolvedValueOnce(res(200, { version: 1 }))
    await pushDirtyNow()
    expect(lv(SK.syncMeta, {}).keys[SK.dailyState].dirty).toBe(false)

    importData({ [SK.dailyState]: '{"a":1,"b":2}' })   // Bypass (kein Listener)
    expect(lv(SK.syncMeta, {}).keys[SK.dailyState].dirty).toBe(false)

    scanOnce()
    expect(lv(SK.syncMeta, {}).keys[SK.dailyState].dirty).toBe(true)
  })
})
