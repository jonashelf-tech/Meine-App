// ─── Sync-Engine (Sync-Etappe 3, sync-architektur.md §4/§8) ───
// Beobachtet sv()/rmKey() (Diff-on-write), scannt beim Start (fängt
// importData/toolReset-Bypässe), pusht verschlüsselt mit If-Match und merged
// bei 409 auf dem Client. Komplett schlafend, solange cloudCreds.syncOn fehlt.
//
// Erst-Kopplung (Server gewinnt): initSync pullt VOR dem Scan. Keys ohne
// bekannte Server-Version und ohne lokale dirty-Spur übernehmen den
// Server-Stand 1:1; nur echte Live-Edits werden gemerged.
import { sv, lv, SK, SYNC_POLICY, setWriteListener, storageKeys } from '../storage'
import { useAppStore, migrateAccent } from '../store'
import { loadCloudCreds } from './cloudBackup'
import { encryptPayload, decryptPayload, hmacKeyId } from './crypto'
import { updateChangeMap } from './diff'
import { mergePayloads } from './merge'

const MERGEABLE = new Set(['byId', 'byId:date', 'bySubkey', 'bySubkey2'])
const isSyncable = (key) => SYNC_POLICY[key] === 'lww' || MERGEABLE.has(SYNC_POLICY[key])

const PUSH_DELAY_MS = 8000
const RELOAD_MIN_GAP_MS = 60_000

let listenerOn = false
let applying = false      // Remote-Apply läuft → Listener stempelt nicht
let busy = false          // Review R5: nie zwei Pull/Push-Zyklen parallel
let pushTimer = null
let keyIds = null         // { byName, byId } — HMAC-Pseudonyme, pro Schlüssel gecacht
let keyIdsFor = null

const loadMeta = () => lv(SK.syncMeta, { cursor: 0, keys: {} })
const saveMeta = (meta) => sv(SK.syncMeta, meta)

export const isSyncOn = () => {
  const c = loadCloudCreds()
  return !!(c?.syncOn && c?.serverUrl && c?.token && c?.key)
}

// schneller Inhalts-Hash (kein Krypto-Anspruch — nur Änderungs-Erkennung)
const hashStr = (s) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h.toString(36)
}
const hashValue = (value) => hashStr(JSON.stringify(value) ?? 'null')

const buildKeyIds = async () => {
  const { key } = loadCloudCreds()
  if (keyIds && keyIdsFor === key) return keyIds
  const names = Object.values(SK).filter(isSyncable)
  const ids = await Promise.all(names.map(n => hmacKeyId(key, n)))
  const byName = {}, byId = {}
  names.forEach((n, i) => { byName[n] = ids[i]; byId[ids[i]] = n })
  keyIds = { byName, byId }
  keyIdsFor = key
  return keyIds
}

const request = (path, { method = 'GET', body, ifMatch } = {}) => {
  const { serverUrl, token } = loadCloudCreds()
  const headers = { 'content-type': 'application/json', Authorization: `Bearer ${token}` }
  if (ifMatch != null) headers['If-Match'] = String(ifMatch)
  return fetch(`${serverUrl}${path}`, { method, headers, body })
}

const buildPayload = (key, entry) => {
  const value = lv(key, null)
  const payload = SYNC_POLICY[key] === 'lww'
    ? { value, changedAt: entry.changedAt ?? 0 }
    : { value, sub: entry.sub ?? {}, del: entry.del ?? {}, changedAt: entry.changedAt ?? 0 }
  return { payload, h: hashValue(value) }
}

// Review R1: Store-verwaltete Keys werden nach Remote-Apply direkt im
// Zustand-Store rehydriert — sonst überschreibt die nächste Nutzer-Aktion
// aus dem veralteten In-Memory-Stand den gemergten Wert (und der Diff würde
// frisch gepullte Datensätze fälschlich als lokale Löschung tombstonen).
// Defaults spiegeln die Initialisierung in store/index.js.
const setStore = (patch) => useAppStore.setState(patch)
const REHYDRATE = {
  [SK.todos]:           v => setStore({ todos: v ?? [] }),
  [SK.todoOrder]:       v => setStore({ todoOrder: v ?? [] }),
  [SK.projects]:        v => setStore({ projects: v ?? [] }),
  [SK.notes]:           v => setStore({ notes: v ?? [] }),
  [SK.blockers]:        v => setStore({ blockers: v ?? [] }),
  [SK.days]:            v => setStore({ days: v ?? {} }),
  [SK.doneCounters]:    v => setStore({ doneCounters: v ?? {} }),
  [SK.settings]:        v => setStore({ settings: v ?? { lastBackup: null } }),
  [SK.theme]:           v => setStore({ theme: v }),
  [SK.accentColor]:     v => setStore({ accentColor: migrateAccent(v) }),
  [SK.toolColors]:      v => setStore({ toolColors: v ?? {} }),
  [SK.activeTools]:     v => setStore({ activeTools: v ?? [] }),
  [SK.birthdays]:       v => setStore({ birthdays: v ?? [] }),
  [SK.klaerenSettings]: v => setStore({ klaerenSettings: v ?? { threshold: 30, ageColor: '#FB923C', kiZerlegen: true } }),
}

const applyValue = (key, value) => {
  applying = true
  try {
    sv(key, value)
    REHYDRATE[key]?.(value)
  } finally { applying = false }
}

const noteError = (e) => {
  const meta = loadMeta()
  meta.lastError = String(e?.message ?? e)
  saveMeta(meta)
}

// Nach Remote-Apply liest die App erst beim nächsten Mount neu — der Zustand-
// Store hält Werte im Speicher. V1-Antwort wie beim Backup-Restore: neu laden,
// gedrosselt gegen Schleifen. (Feinere Rehydrierung ist bewusst vertagt.)
const maybeReload = () => {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return
  const last = Number(sessionStorage.getItem('adhs_sync_reload_ts') ?? '0')
  if (Date.now() - last < RELOAD_MIN_GAP_MS) return
  sessionStorage.setItem('adhs_sync_reload_ts', String(Date.now()))
  window.location.reload()
}

// ─── Write-Hook ───────────────────────────────────────────

const handleWrite = (key, oldRaw, newValue) => {
  if (applying || !isSyncOn() || !isSyncable(key)) return
  const now = Date.now()
  const meta = loadMeta()
  const entry = meta.keys[key] ?? {}
  if (SYNC_POLICY[key] === 'lww') {
    entry.changedAt = now
  } else {
    let oldValue
    try { oldValue = oldRaw == null ? null : JSON.parse(oldRaw) } catch { oldValue = null }
    const { sub, del } = updateChangeMap(SYNC_POLICY[key], oldValue, newValue, entry.sub ?? {}, entry.del ?? {}, now)
    entry.sub = sub
    entry.del = del
    entry.changedAt = now
  }
  entry.h = hashValue(newValue)
  entry.dirty = true
  meta.keys[key] = entry
  saveMeta(meta)
  schedulePush()
}

// Mutex nur an den ÄUSSEREN Einstiegen (Timer, syncTick) — pushDirtyNow ruft
// intern pullOnce (409-Pfad) und darf sich nicht selbst aussperren.
const runExclusive = async (fn) => {
  if (busy) return
  busy = true
  try { await fn() } finally { busy = false }
}

const schedulePush = () => {
  if (pushTimer || typeof setTimeout === 'undefined') return
  pushTimer = setTimeout(() => {
    pushTimer = null
    runExclusive(() => pushDirtyNow()).catch(noteError)
  }, PUSH_DELAY_MS)
  pushTimer.unref?.()
}

// ─── Scan (fängt alles, was am Hook vorbeischreibt) ───────

export const scanOnce = () => {
  if (!isSyncOn()) return
  const now = Date.now()
  const meta = loadMeta()
  const present = new Set(storageKeys())
  let changed = false
  for (const key of Object.values(SK)) {
    if (!isSyncable(key)) continue
    const value = present.has(key) ? lv(key, null) : null
    const h = hashValue(value)
    const entry = meta.keys[key]
    if (entry?.h === h) continue
    if (!entry && value === null) continue   // nie gesehen und nicht vorhanden
    const e = entry ?? {}
    if (SYNC_POLICY[key] === 'lww') {
      e.changedAt = now
    } else {
      // Altwert nicht mehr greifbar → alles Aktuelle neu stempeln; vorher
      // bekannte, jetzt fehlende Subkeys bekommen Tombstones (toolReset!).
      const { sub, del } = updateChangeMap(SYNC_POLICY[key], null, value, {}, e.del ?? {}, now)
      for (const k of Object.keys(e.sub ?? {})) if (!(k in sub)) del[k] = now
      e.sub = sub
      e.del = del
      e.changedAt = now
    }
    e.h = h
    e.dirty = true
    meta.keys[key] = e
    changed = true
  }
  if (changed) {
    saveMeta(meta)
    schedulePush()
  }
}

// ─── Pull ─────────────────────────────────────────────────

export const pullOnce = async () => {
  if (!isSyncOn()) return
  const ids = await buildKeyIds()
  const r = await request(`/kv?since=${loadMeta().cursor ?? 0}`)
  if (!r.ok) throw new Error(`Sync-Pull fehlgeschlagen (${r.status})`)
  const { rows, cursor } = await r.json()
  const applied = []

  for (const row of rows ?? []) {
    const key = ids.byId[row.keyId]
    if (!key) continue   // Key aus neuerer App-Version — heilt beim nächsten Schreiben dort
    let remote
    try {
      remote = await decryptPayload(loadCloudCreds().key, JSON.parse(row.ciphertext))
    } catch {
      continue           // kaputte Zeile blockiert den Sync nicht; Voll-Reset = neu verbinden
    }
    const meta = loadMeta()
    const entry = meta.keys[key] ?? {}

    if (entry.v == null && !entry.dirty) {
      // Erst-Kopplung: Server gewinnt 1:1
      applyValue(key, remote.value)
      meta.keys[key] = {
        v: row.version, h: hashValue(remote.value), dirty: false,
        changedAt: remote.changedAt ?? 0, sub: remote.sub ?? {}, del: remote.del ?? {},
      }
      saveMeta(meta)
      applied.push(key)
      continue
    }

    const { payload: local } = buildPayload(key, entry)
    const { payload, changedVsLocal, changedVsRemote } =
      mergePayloads(SYNC_POLICY[key], local, remote)
    if (changedVsLocal) {
      applyValue(key, payload.value)
      applied.push(key)
    }
    const m2 = loadMeta()
    m2.keys[key] = {
      v: row.version, h: hashValue(payload.value), dirty: !!changedVsRemote,
      changedAt: payload.changedAt ?? entry.changedAt ?? 0,
      sub: payload.sub ?? {}, del: payload.del ?? {},
    }
    saveMeta(m2)
  }

  const m3 = loadMeta()
  m3.cursor = cursor ?? m3.cursor ?? 0
  m3.lastSyncAt = Date.now()
  m3.lastError = null
  saveMeta(m3)
  // Reload nur noch für Keys OHNE Rehydrator (Tool-Stores lesen bei Mount frisch;
  // offene Tool-Screens sollen nicht auf altem Stand weiterarbeiten)
  if (applied.some(k => !(k in REHYDRATE))) maybeReload()
  if (Object.values(loadMeta().keys).some(e => e.dirty)) schedulePush()
}

// ─── Push ─────────────────────────────────────────────────

export const pushDirtyNow = async () => {
  if (!isSyncOn()) return
  const ids = await buildKeyIds()

  for (let round = 0; round < 2; round++) {
    const dirtyKeys = Object.entries(loadMeta().keys)
      .filter(([, e]) => e.dirty).map(([k]) => k)
    if (!dirtyKeys.length) return

    let conflicted = false
    for (const key of dirtyKeys) {
      const entry = loadMeta().keys[key]
      if (!entry?.dirty) continue
      const { payload, h: pushedHash } = buildPayload(key, entry)
      const env = await encryptPayload(loadCloudCreds().key, payload)
      const r = await request(`/kv/${ids.byName[key]}`, {
        method: 'PUT', body: JSON.stringify(env), ifMatch: entry.v ?? 0,
      })
      if (r.status === 409) { conflicted = true; break }
      if (!r.ok) throw new Error(`Sync-Push fehlgeschlagen (${r.status})`)
      const { version } = await r.json()
      const meta = loadMeta()
      const e2 = meta.keys[key] ?? {}
      e2.v = version
      // dirty nur löschen, wenn seit dem Push nichts Neues geschrieben wurde
      if (e2.h === pushedHash) e2.dirty = false
      meta.keys[key] = e2
      meta.lastSyncAt = Date.now()
      meta.lastError = null
      saveMeta(meta)
    }
    if (!conflicted) return
    await pullOnce()   // 409: Fremd-Stand holen + client-seitig mergen, dann Runde 2
  }
}

// ─── Lebenszyklus ─────────────────────────────────────────

export const initSync = async () => {
  if (!isSyncOn()) return false
  if (!listenerOn) {
    setWriteListener(handleWrite)
    listenerOn = true
  }
  await buildKeyIds()
  try {
    await pullOnce()     // VOR dem Scan — Erst-Kopplung: Server gewinnt
  } catch (e) { noteError(e) }
  scanOnce()
  try {
    await pushDirtyNow()
  } catch (e) { noteError(e) }
  return true
}

export const stopSync = () => {
  if (listenerOn) {
    setWriteListener(null)
    listenerOn = false
  }
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
}

export const setSyncEnabled = async (on) => {
  const creds = loadCloudCreds()
  if (!creds) throw new Error('Cloud-Sicherung zuerst einrichten')
  sv(SK.cloudCreds, { ...creds, syncOn: !!on })
  if (on) return initSync()
  stopSync()
  return false
}

// App-Anlass (Start / sichtbar werden): holen, scannen, liefern — still bei Fehlern.
export const syncTick = async () => {
  if (!isSyncOn()) return
  await runExclusive(async () => {
    try {
      scanOnce()
      await pullOnce()
      await pushDirtyNow()
    } catch (e) { noteError(e) }
  })
}

export const getSyncStatus = () => {
  const meta = loadMeta()
  return {
    on: isSyncOn(),
    cursor: meta.cursor ?? 0,
    dirtyCount: Object.values(meta.keys ?? {}).filter(e => e.dirty).length,
    lastSyncAt: meta.lastSyncAt ?? null,
    lastError: meta.lastError ?? null,
  }
}
