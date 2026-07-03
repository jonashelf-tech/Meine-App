// ─── Cloud-Backup (Etappe 2, sync-architektur.md §8) ──────
// Verschlüsseltes Voll-Backup zum eigenen Cloudflare Worker. Rein additiv:
// localStorage bleibt primär, OPFS-Spiegel + JSON-Download bleiben bestehen.
import { sv, lv, SK, exportData, importData } from '../storage'
import {
  generateCreds, buildRecoveryCode, parseRecoveryCode,
  encryptPayload, decryptPayload, sha256Hex,
} from './crypto'

const AUTO_PUSH_MS = 60 * 60 * 1000   // Auto-Push höchstens stündlich

// ─── Config ───────────────────────────────────────────────

export const loadCloudCreds = () => lv(SK.cloudCreds, null)
export const loadCloudMeta  = () => lv(SK.cloudMeta, {})
export const saveCloudMeta  = (partial) => sv(SK.cloudMeta, { ...loadCloudMeta(), ...partial })

export const isCloudActive = () => {
  const c = loadCloudCreds()
  return !!(c?.serverUrl && c?.token && c?.key)
}

export const cloudBackupAgeDays = () => {
  const last = loadCloudMeta().lastPushAt
  if (!last) return Infinity
  return (Date.now() - last) / (24 * 60 * 60 * 1000)
}

const normalizeUrl = (u) => String(u ?? '').trim().replace(/\/+$/, '')

const request = (serverUrl, path, { method = 'GET', token, setupSecret, body } = {}) => {
  const headers = { 'content-type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (setupSecret) headers['x-setup-secret'] = setupSecret
  return fetch(`${serverUrl}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  })
}

// ─── Lebenszyklus ─────────────────────────────────────────

// Ersteinrichtung: Creds erzeugen, Token-Hash registrieren (Server sieht den
// Token selbst nie im Klartext gespeichert), Recovery-Code fürs Sichern liefern.
export const activateCloud = async ({ serverUrl, setupSecret }) => {
  const url = normalizeUrl(serverUrl)
  const creds = generateCreds()
  const r = await request(url, '/register', {
    method: 'POST', setupSecret, body: { tokenHash: await sha256Hex(creds.token) },
  })
  if (r.status === 401 || r.status === 403) throw new Error('Setup-Code falsch')
  if (!r.ok) throw new Error(`Registrierung fehlgeschlagen (${r.status})`)
  sv(SK.cloudCreds, { serverUrl: url, token: creds.token, key: creds.key, activatedAt: Date.now() })
  return { recoveryCode: await buildRecoveryCode(creds) }
}

// Weiteres Gerät: Recovery-Code enthält Token+Key — keine erneute Registrierung.
export const connectWithRecoveryCode = async ({ serverUrl, code }) => {
  const { token, key } = await parseRecoveryCode(code)
  sv(SK.cloudCreds, { serverUrl: normalizeUrl(serverUrl), token, key, activatedAt: Date.now() })
}

export const deactivateCloud = () => {
  sv(SK.cloudCreds, null)
  sv(SK.cloudMeta, {})
}

// ─── Backup ───────────────────────────────────────────────

export const pushCloudBackup = async ({ force = false } = {}) => {
  if (!isCloudActive()) return { skipped: 'inaktiv' }
  if (!force && Date.now() - (loadCloudMeta().lastPushAt ?? 0) < AUTO_PUSH_MS)
    return { skipped: 'frisch' }
  const { serverUrl, token, key } = loadCloudCreds()
  try {
    const env = await encryptPayload(key, { ...exportData(), _savedAt: Date.now() })
    const r = await request(serverUrl, '/backup', { method: 'PUT', token, body: env })
    if (!r.ok) throw new Error(`Upload fehlgeschlagen (${r.status})`)
    const bytes = JSON.stringify(env).length
    saveCloudMeta({ lastPushAt: Date.now(), lastPushBytes: bytes, lastError: null })
    return { ok: true, bytes }
  } catch (e) {
    saveCloudMeta({ lastError: String(e?.message ?? e) })
    throw e
  }
}

// Auto-Pfad (App-Start / sichtbar werden): still — Fehler landen in lastError.
export const maybeAutoPush = async () => {
  if (!isCloudActive()) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  try { await pushCloudBackup() } catch { /* bewusst still, Status zeigt lastError */ }
}

export const restoreCloudBackup = async (id = 'latest') => {
  const { serverUrl, token, key } = loadCloudCreds() ?? {}
  const r = await request(serverUrl, `/backup/${id}`, { token })
  if (r.status === 404) throw new Error('Kein Cloud-Backup vorhanden')
  if (!r.ok) throw new Error(`Abruf fehlgeschlagen (${r.status})`)
  const data = await decryptPayload(key, await r.json())
  const keys = Object.keys(data).filter(k => k.startsWith('adhs_'))
  if (!keys.length) throw new Error('Kein gültiges ADHS-Backup')
  importData(data)
  return { savedAt: data._savedAt ?? null, keyCount: keys.length }
}
