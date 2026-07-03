import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sv, lv, SK } from '../storage'
import { generateCreds, buildRecoveryCode, sha256Hex, encryptPayload } from './crypto'
import {
  activateCloud, connectWithRecoveryCode, deactivateCloud,
  loadCloudCreds, isCloudActive,
  pushCloudBackup, maybeAutoPush, restoreCloudBackup,
  loadCloudMeta, saveCloudMeta, cloudBackupAgeDays,
} from './cloudBackup'

const res = (status, body) => ({ ok: status < 300, status, json: async () => body })

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Gerät ohne Server-Roundtrip koppeln (nutzt die echte Krypto)
const coupleDevice = async () => {
  const creds = generateCreds()
  const code = await buildRecoveryCode(creds)
  await connectWithRecoveryCode({ serverUrl: 'https://sync.example', code })
  return creds
}

describe('activateCloud (Ersteinrichtung)', () => {
  it('registriert den Token-Hash, speichert Creds und liefert einen Recovery-Code', async () => {
    fetchMock.mockResolvedValueOnce(res(201, { ok: true }))

    const { recoveryCode } = await activateCloud({
      serverUrl: 'https://sync.example/',   // mit Slash — muss normalisiert werden
      setupSecret: 'geheim123',
    })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://sync.example/register')
    expect(opts.method).toBe('POST')
    expect(opts.headers['x-setup-secret']).toBe('geheim123')

    const creds = loadCloudCreds()
    expect(creds.serverUrl).toBe('https://sync.example')
    expect(JSON.parse(opts.body).tokenHash).toBe(await sha256Hex(creds.token))
    expect(isCloudActive()).toBe(true)
    expect(recoveryCode).toMatch(/^([A-Z2-7]{5}-)+[A-Z2-7]{5}$/)
  })

  it('falscher Setup-Code (401) → wirft, nichts gespeichert', async () => {
    fetchMock.mockResolvedValueOnce(res(401, { error: 'nope' }))
    await expect(activateCloud({ serverUrl: 'https://s.example', setupSecret: 'falsch' }))
      .rejects.toThrow(/Setup-Code/)
    expect(isCloudActive()).toBe(false)
  })
})

describe('connectWithRecoveryCode (zweites Gerät)', () => {
  it('übernimmt Token+Key aus dem Code, ohne Server-Registrierung', async () => {
    const creds = await coupleDevice()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(loadCloudCreds().token).toBe(creds.token)
    expect(loadCloudCreds().key).toBe(creds.key)
    expect(isCloudActive()).toBe(true)
  })

  it('deactivateCloud entfernt die Creds wieder', async () => {
    await coupleDevice()
    deactivateCloud()
    expect(isCloudActive()).toBe(false)
    expect(loadCloudCreds()).toBeNull()
  })
})

describe('pushCloudBackup', () => {
  it('ohne Aktivierung: übersprungen, kein Netzwerk-Call', async () => {
    const result = await pushCloudBackup()
    expect(result.skipped).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lädt ein verschlüsseltes Envelope hoch — ohne Klartext, mit Bearer-Token', async () => {
    sv(SK.todos, [{ id: 'x1', text: 'Zahnarzt anrufen' }])
    const creds = await coupleDevice()
    fetchMock.mockResolvedValueOnce(res(200, { ok: true }))

    const result = await pushCloudBackup({ force: true })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://sync.example/backup')
    expect(opts.method).toBe('PUT')
    expect(opts.headers['Authorization']).toBe(`Bearer ${creds.token}`)
    const env = JSON.parse(opts.body)
    expect(env.v).toBe(1)
    expect(env.alg).toBe('A256GCM')
    expect(opts.body).not.toContain('Zahnarzt')
    expect(result.ok).toBe(true)
    expect(loadCloudMeta().lastPushAt).toBeGreaterThan(0)
  })

  it('Server-Fehler (500) → wirft, lastError gesetzt, Creds bleiben', async () => {
    await coupleDevice()
    fetchMock.mockResolvedValueOnce(res(500, { error: 'kaputt' }))
    await expect(pushCloudBackup({ force: true })).rejects.toThrow()
    expect(loadCloudMeta().lastError).toBeTruthy()
    expect(isCloudActive()).toBe(true)
  })
})

describe('maybeAutoPush (Drossel)', () => {
  it('frischer Push → kein erneuter Upload', async () => {
    await coupleDevice()
    saveCloudMeta({ lastPushAt: Date.now() })
    await maybeAutoPush()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('alter Push → lädt hoch', async () => {
    await coupleDevice()
    saveCloudMeta({ lastPushAt: Date.now() - 2 * 60 * 60 * 1000 })
    fetchMock.mockResolvedValueOnce(res(200, { ok: true }))
    await maybeAutoPush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('Fehler beim Auto-Push wird geschluckt (kein Throw in den App-Fluss)', async () => {
    await coupleDevice()
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await expect(maybeAutoPush()).resolves.toBeUndefined()
  })
})

describe('restoreCloudBackup', () => {
  it('holt das Envelope, entschlüsselt und spielt die adhs_-Keys ein', async () => {
    const creds = await coupleDevice()
    const env = await encryptPayload(creds.key, {
      [SK.todos]: '[{"id":"r1","text":"Wiederhergestellt"}]',
      _savedAt: 1234567890,
    })
    fetchMock.mockResolvedValueOnce(res(200, env))

    const result = await restoreCloudBackup()

    expect(fetchMock.mock.calls[0][0]).toBe('https://sync.example/backup/latest')
    expect(lv(SK.todos, [])).toEqual([{ id: 'r1', text: 'Wiederhergestellt' }])
    expect(result.savedAt).toBe(1234567890)
    expect(result.keyCount).toBe(1)
  })

  it('entschlüsselte Daten ohne adhs_-Keys → wirft, nichts eingespielt', async () => {
    const creds = await coupleDevice()
    const env = await encryptPayload(creds.key, { foo: 'bar' })
    fetchMock.mockResolvedValueOnce(res(200, env))
    await expect(restoreCloudBackup()).rejects.toThrow(/Backup/)
    expect(lv(SK.todos, null)).toBeNull()
  })

  it('kein Backup vorhanden (404) → verständlicher Fehler', async () => {
    await coupleDevice()
    fetchMock.mockResolvedValueOnce(res(404, { error: 'not found' }))
    await expect(restoreCloudBackup()).rejects.toThrow(/[Kk]ein/)
  })
})

describe('cloudBackupAgeDays', () => {
  it('Infinity ohne bisherigen Push', () => {
    expect(cloudBackupAgeDays()).toBe(Infinity)
  })

  it('rechnet Tage seit dem letzten Push', async () => {
    await coupleDevice()
    saveCloudMeta({ lastPushAt: Date.now() - 2 * 24 * 60 * 60 * 1000 })
    expect(cloudBackupAgeDays()).toBeGreaterThan(1.9)
    expect(cloudBackupAgeDays()).toBeLessThan(2.1)
  })
})
