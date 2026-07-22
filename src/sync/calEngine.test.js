// Kalender-Engine (teilen-spec.md §6): calTick pullt/pusht Kalender-Slices im
// Namespace c:<calId>, gemergt via mergeCalSlice. G6: der PERSÖNLICHE Sync
// schließt geteilte Records (cal!=null) strikt aus. Fetch gemockt, Rest echt.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sv, lv, SK } from '../storage'
import { generateCreds, buildRecoveryCode, generateCalCreds, encryptPayload, decryptPayload, hmacKeyId } from './crypto'
import { connectWithRecoveryCode } from './cloudBackup'
import { stopSync, setSyncEnabled, pushDirtyNow, pullOnce, calTick, isCalSyncOn } from './syncEngine'
import { createBlock } from '../features/todos/Block'

const res = (status, body) => ({ ok: status < 300, status, json: async () => body })
const emptyPull = () => res(200, { rows: [], cursor: 0 })

let fetchMock
beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn(async () => emptyPull())
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { stopSync(); vi.unstubAllGlobals() })

// Persönlichen Sync einschalten (für die G6-Ausschluss-Tests)
const enablePersonal = async () => {
  const creds = generateCreds()
  await connectWithRecoveryCode({ serverUrl: 'https://sync.example', code: await buildRecoveryCode(creds) })
  await setSyncEnabled(true)
  return creds
}

// Cloud koppeln + einen Kalender lokal kennen (Kalender-Sync ist unabhängig vom
// persönlichen Toggle) — liefert personal-creds + Kalender-Creds.
const enableCal = async () => {
  const personal = generateCreds()
  await connectWithRecoveryCode({ serverUrl: 'https://sync.example', code: await buildRecoveryCode(personal) })
  const cal = generateCalCreds()
  sv(SK.calCreds, { [cal.calId]: { key: cal.calKey, memberId: cal.memberId, joinedAt: 1 } })
  sv(SK.calList, { [cal.calId]: { name: 'Familie', color: '#14B8A6', members: { [cal.memberId]: 'Ich' }, updatedAt: 1 } })
  return { personal, cal }
}

const putCalls = () => fetchMock.mock.calls.filter(([, o]) => o?.method === 'PUT')
const findPut = (re) => putCalls().find(([url]) => re.test(url))

describe('isCalSyncOn — Gating (§6.1)', () => {
  it('an, sobald Cloud + mindestens ein Kalender-Cred da ist — unabhängig vom Geräte-Sync', async () => {
    await enableCal()
    expect(isCalSyncOn()).toBe(true)
  })
  it('aus ohne Kalender-Creds', async () => {
    const creds = generateCreds()
    await connectWithRecoveryCode({ serverUrl: 'https://sync.example', code: await buildRecoveryCode(creds) })
    expect(isCalSyncOn()).toBe(false)
  })
})

describe('G6 — persönlicher Sync schließt geteilte Records aus', () => {
  it('Push-Payload für todos enthält nur private Records', async () => {
    const creds = await enablePersonal()
    sv(SK.todos, [createBlock({ id: 'priv1', text: 'privat' }), createBlock({ id: 'shared1', cal: 'CALX', text: 'geteilt' })])
    fetchMock.mockResolvedValueOnce(res(200, { version: 1 }))

    await pushDirtyNow()

    const put = findPut(/\/kv\/[A-Za-z0-9_-]{22}$/)   // persönlicher ns (kein ?ns=)
    expect(put).toBeTruthy()
    expect(put[0]).not.toContain('ns=')
    const payload = await decryptPayload(creds.key, JSON.parse(put[1].body))
    expect(payload.value.map(r => r.id)).toEqual(['priv1'])   // shared1 fehlt
  })

  it('Pull wendet nur private an — lokale geteilte Records überleben', async () => {
    const creds = await enablePersonal()
    sv(SK.todos, [createBlock({ id: 'shared1', cal: 'CALX', text: 'geteilt' })])
    const keyId = await hmacKeyId(creds.key, SK.todos)
    const remote = await encryptPayload(creds.key, { value: [{ id: 'p1', text: 'vom Server', cal: null }], sub: { p1: Date.now() }, del: {} })
    fetchMock.mockResolvedValueOnce(res(200, { rows: [{ keyId, version: 2, ciphertext: JSON.stringify(remote) }], cursor: 2 }))

    await pullOnce()

    const ids = lv(SK.todos, []).map(r => r.id).sort()
    expect(ids).toEqual(['p1', 'shared1'])   // privat gemerged, geteilt erhalten
  })
})

describe('calTick — Pull (§6.2)', () => {
  it('übernimmt einen geteilten Record aus dem Kalender-Namespace', async () => {
    const { cal } = await enableCal()
    const todosKey = await hmacKeyId(cal.calKey, 'todos')
    const remoteSlice = await encryptPayload(cal.calKey, {
      records: [{ id: 's1', cal: cal.calId, text: 'Zahnarzt', updatedAt: 999, by: 'paula' }],
      tombstones: [],
    })
    fetchMock.mockResolvedValueOnce(res(200, { rows: [{ keyId: todosKey, version: 1, ciphertext: JSON.stringify(remoteSlice) }], cursor: 1 }))

    await calTick()

    const s1 = lv(SK.todos, []).find(r => r.id === 's1')
    expect(s1).toBeTruthy()
    expect(s1.cal).toBe(cal.calId)
    expect(s1.dayRank).toBeNull()   // persönliches Feld lokal ergänzt
  })

  it('Erst-Beitritt: Server-Meta gewinnt, aber ich bleibe in der Mitgliederliste (self-heal)', async () => {
    const { cal } = await enableCal()
    const metaKey = await hmacKeyId(cal.calKey, 'meta')
    const remoteMeta = await encryptPayload(cal.calKey, { name: 'Familie', color: '#14B8A6', members: { creator: 'Paula' }, updatedAt: 5 })
    fetchMock.mockResolvedValue(res(200, { version: 2 }))   // Default für Push
    fetchMock.mockResolvedValueOnce(res(200, { rows: [{ keyId: metaKey, version: 1, ciphertext: JSON.stringify(remoteMeta) }], cursor: 1 }))

    await calTick()

    const members = lv(SK.calList, {})[cal.calId].members
    expect(members.creator).toBe('Paula')            // Server-Meta übernommen
    expect(members[cal.memberId]).toBe('Ich')        // aber ich bin nicht rausgefallen
  })
})

describe('calTick — Push (§6.2/§6.3)', () => {
  it('pusht den Kalender-Slice verschlüsselt in c:<calId>, dayRank gestrippt', async () => {
    const { cal } = await enableCal()
    sv(SK.todos, [createBlock({ id: 's1', cal: cal.calId, text: 'geteilt', dayRank: 7, updatedAt: 111, by: cal.memberId })])
    fetchMock.mockResolvedValue(res(200, { version: 1 }))

    await calTick()

    const todosKey = await hmacKeyId(cal.calKey, 'todos')
    const put = findPut(new RegExp(`/kv/${todosKey}\\?ns=c:${cal.calId}`))
    expect(put).toBeTruthy()
    const slice = await decryptPayload(cal.calKey, JSON.parse(put[1].body))
    const s1 = slice.records.find(r => r.id === 's1')
    expect(s1.text).toBe('geteilt')
    expect('dayRank' in s1).toBe(false)   // persönlich → nie mitgeschickt
  })

  it('kein persönlicher Push berührt den Kalender-Namespace (G6)', async () => {
    await enableCal()
    sv(SK.todos, [createBlock({ id: 's1', cal: (lv(SK.calCreds, {}) && Object.keys(lv(SK.calCreds, {}))[0]), text: 'geteilt', updatedAt: 5, by: 'x' })])
    fetchMock.mockResolvedValue(res(200, { version: 1 }))

    await calTick()

    // Alle PUTs gehen in den Kalender-Namespace, keiner in den persönlichen
    for (const [url] of putCalls()) expect(url).toContain('ns=c:')
  })

  it('409 → Pull, Merge, Retry (nichts geht verloren)', async () => {
    const { cal } = await enableCal()
    sv(SK.todos, [createBlock({ id: 'mine', cal: cal.calId, text: 'meins', updatedAt: 200, by: cal.memberId })])
    const todosKey = await hmacKeyId(cal.calKey, 'todos')
    const remoteSlice = await encryptPayload(cal.calKey, {
      records: [{ id: 'fremd', cal: cal.calId, text: 'von Paula', updatedAt: 100, by: 'paula' }], tombstones: [],
    })
    fetchMock
      .mockResolvedValueOnce(emptyPull())                                   // 1. Pull leer
      .mockResolvedValueOnce(res(409, { version: 3 }))                      // 1. Push (todos) → 409
      .mockResolvedValueOnce(res(200, { rows: [{ keyId: todosKey, version: 3, ciphertext: JSON.stringify(remoteSlice) }], cursor: 3 })) // Re-Pull
      .mockResolvedValue(res(200, { version: 4 }))                          // Retry-Push ok

    await calTick()

    const ids = lv(SK.todos, []).map(r => r.id).sort()
    expect(ids).toEqual(['fremd', 'mine'])   // Union nach Merge
  })
})

describe('🕶 Geheim-Flag (secret) — A9: gesichert, aber nie an Mitglieder', () => {
  it('Geheim-Eintrag reist NIE im Kalender-Push-Slice', async () => {
    const { cal } = await enableCal()
    sv(SK.todos, [
      createBlock({ id: 'offen',  cal: cal.calId, text: 'sichtbar', updatedAt: 111, by: cal.memberId }),
      createBlock({ id: 'geheim', cal: cal.calId, secret: true, text: 'nur ich', updatedAt: 222, by: cal.memberId }),
    ])
    fetchMock.mockResolvedValue(res(200, { version: 1 }))

    await calTick()

    const todosKey = await hmacKeyId(cal.calKey, 'todos')
    const put = findPut(new RegExp(`/kv/${todosKey}\\?ns=c:${cal.calId}`))
    expect(put).toBeTruthy()
    const slice = await decryptPayload(cal.calKey, JSON.parse(put[1].body))
    expect(slice.records.map(r => r.id)).toEqual(['offen'])   // 'geheim' ist raus
  })

  // Regressions-Guard (grün unter G5 „ohne Tombstone verschwindet nie etwas"):
  // schützt davor, dass ein späterer Push-Filter den lokalen Geheim-Eintrag aus
  // der Merge-Basis strippt, ohne ihn wieder anzuhängen (= Datenverlust).
  it('Kalender-Pull löscht lokale Geheim-Einträge nicht', async () => {
    const { cal } = await enableCal()
    sv(SK.todos, [createBlock({ id: 'geheim', cal: cal.calId, secret: true, text: 'nur ich', updatedAt: 50, by: cal.memberId })])
    const todosKey = await hmacKeyId(cal.calKey, 'todos')
    const remoteSlice = await encryptPayload(cal.calKey, {
      records: [{ id: 'fremd', cal: cal.calId, text: 'von Paula', updatedAt: 999, by: 'paula' }],
      tombstones: [],
    })
    fetchMock.mockResolvedValueOnce(res(200, { rows: [{ keyId: todosKey, version: 1, ciphertext: JSON.stringify(remoteSlice) }], cursor: 1 }))
    fetchMock.mockResolvedValue(res(200, { version: 2 }))

    await calTick()

    const ids = lv(SK.todos, []).map(r => r.id).sort()
    expect(ids).toContain('geheim')   // bleibt lokal erhalten
    expect(ids).toContain('fremd')    // Fremd-Record aus dem Merge übernommen
  })
})
