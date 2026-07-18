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
import { mergePayloads, mergeCalSlice } from './merge'

const MERGEABLE = new Set(['byId', 'byId:date', 'bySubkey', 'bySubkey2'])
const isSyncable = (key) => SYNC_POLICY[key] === 'lww' || MERGEABLE.has(SYNC_POLICY[key])

// ─── G6: geteilte Records reisen NUR im Kalender-Namespace ────────
// Der persönliche Sync sieht todos/projects immer nur als „private Records".
// Geteilte (cal != null) werden ausgefiltert (Push/Diff/Hash) und beim Anwenden
// eines persönlichen Merges wieder angehängt (sie leben in derselben Liste).
const CAL_RECORD_KEYS = new Set([SK.todos, SK.projects])
const privateOnly = (key, value) =>
  CAL_RECORD_KEYS.has(key) && Array.isArray(value) ? value.filter(r => r?.cal == null) : value
const sharedLocal = (key) => {
  const cur = lv(key, [])
  return CAL_RECORD_KEYS.has(key) && Array.isArray(cur) ? cur.filter(r => r?.cal != null) : []
}

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
  const value = privateOnly(key, lv(key, null))   // G6: geteilte Records nie im persönlichen ns
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
  // Geteilte Kalender (R1: nach Remote-Apply den Store rehydrieren)
  [SK.calList]:         v => setStore({ calList: v ?? {} }),
  [SK.calCreds]:        v => setStore({ calCreds: v ?? {} }),
}

const applyValue = (key, value) => {
  applying = true
  try {
    // Persönlicher Merge betrifft nur private Records — geteilte (leben in
    // derselben Liste) bleiben unangetastet und werden wieder angehängt (G6).
    const full = CAL_RECORD_KEYS.has(key) && Array.isArray(value)
      ? [...value, ...sharedLocal(key)]
      : value
    sv(key, full)
    REHYDRATE[key]?.(full)
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

const CAL_RELEVANT = new Set([SK.todos, SK.projects, SK.calList, SK.calTombstones])

const handleWrite = (key, oldRaw, newValue) => {
  if (applying) return
  if (isSyncOn() && isSyncable(key)) {
    const now = Date.now()
    const meta = loadMeta()
    const entry = meta.keys[key] ?? {}
    if (SYNC_POLICY[key] === 'lww') {
      entry.changedAt = now
    } else {
      let oldValue
      try { oldValue = oldRaw == null ? null : JSON.parse(oldRaw) } catch { oldValue = null }
      // G6: nur die private Projektion diffen — geteilte Records tauchen im
      // persönlichen Änderungsprotokoll nie auf (Umzug privat→cal = private Löschung).
      const { sub, del } = updateChangeMap(SYNC_POLICY[key], privateOnly(key, oldValue), privateOnly(key, newValue), entry.sub ?? {}, entry.del ?? {}, now)
      entry.sub = sub
      entry.del = del
      entry.changedAt = now
    }
    entry.h = hashValue(privateOnly(key, newValue))
    entry.dirty = true
    meta.keys[key] = entry
    saveMeta(meta)
    scheduleFlush()
  }
  // Kalender-Sync ist scan-basiert: jede Kalender-relevante Änderung stößt einen Flush an.
  if (isCalSyncOn() && CAL_RELEVANT.has(key)) scheduleFlush()
}

// Mutex nur an den ÄUSSEREN Einstiegen (Timer, syncTick) — pushDirtyNow ruft
// intern pullOnce (409-Pfad) und darf sich nicht selbst aussperren.
const runExclusive = async (fn) => {
  if (busy) return
  busy = true
  try { await fn() } finally { busy = false }
}

const scheduleFlush = () => {
  if (pushTimer || typeof setTimeout === 'undefined') return
  pushTimer = setTimeout(() => {
    pushTimer = null
    runExclusive(async () => {
      if (isSyncOn()) await pushDirtyNow()
      if (isCalSyncOn()) await calTickInner()
    }).catch(noteError)
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
    const value = privateOnly(key, present.has(key) ? lv(key, null) : null)   // G6
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
    scheduleFlush()
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
  if (Object.values(loadMeta().keys).some(e => e.dirty)) scheduleFlush()
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

// ─── Kalender-Sync (Teilen Stufe A, teilen-spec.md §6) ────
// Unabhängig vom persönlichen Toggle: läuft, sobald Cloud + Kalender-Creds da
// sind. Pro Kalender zwei KV-Keys im Namespace c:<calId> — meta (lww) und todos
// (Slice + Tombstones via mergeCalSlice). Scan-basiert: Slice-Hash vergleichen.

export const isCalSyncOn = () => {
  const c = loadCloudCreds()
  return !!(c?.serverUrl && c?.token) && Object.keys(lv(SK.calCreds, {})).length > 0
}

const calState = (calId) => loadMeta().cal?.[calId] ?? { cursor: 0, keys: {} }
const calSaveState = (calId, updater) => {
  const meta = loadMeta()
  meta.cal = meta.cal ?? {}
  meta.cal[calId] = updater(meta.cal[calId] ?? { cursor: 0, keys: {} })
  saveMeta(meta)
}

const calKeyIds = async (calKey) => ({
  meta:  await hmacKeyId(calKey, 'meta'),
  todos: await hmacKeyId(calKey, 'todos'),
})

const byIdSort = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

// Kanonischer (sortierter, dayRank-freier) lokaler Slice eines Kalenders.
const localCalSlice = (calId) => ({
  records: lv(SK.todos, [])
    .filter(r => r?.cal === calId)
    .map(({ dayRank, ...rest }) => rest)              // dayRank ist persönlich (§3.3)
    .sort(byIdSort),
  tombstones: [...((lv(SK.calTombstones, {})[calId]) ?? [])].sort(byIdSort),
})
const localCalMeta = (calId) =>
  lv(SK.calList, {})[calId] ?? { name: '', color: null, members: {}, updatedAt: 0 }

// Mich selbst in die Mitgliederliste zurückschreiben — Meta ist lww, ein
// Server-Meta-Pull darf meinen Eintrag nicht verschlucken (§6.2 self-heal).
const selfHealMeta = (calId, meta) => {
  const memberId = lv(SK.calCreds, {})[calId]?.memberId
  if (!memberId || meta.members?.[memberId]) return meta
  const myName = localCalMeta(calId).members?.[memberId] ?? ''
  return { ...meta, members: { ...(meta.members ?? {}), [memberId]: myName } }
}

// Kalender-Write: direkt (voller Wert) + Rehydrate, ohne die private/shared-
// Wiederanhäng-Logik von applyValue (die todos hier bereits vollständig gebaut).
const applyCalWrite = (key, value) => {
  applying = true
  try { sv(key, value); REHYDRATE[key]?.(value) } finally { applying = false }
}

const applyCalMetaPull = (calId, remote, version) => {
  const known = calState(calId).keys?.meta?.v != null
  const local = localCalMeta(calId)
  // Erst-Beitritt: Server gewinnt 1:1; danach LWW über updatedAt (Gleichstand → Remote)
  if (!known || (remote.updatedAt ?? 0) >= (local.updatedAt ?? 0)) {
    applyCalWrite(SK.calList, { ...lv(SK.calList, {}), [calId]: selfHealMeta(calId, remote) })
  }
  // h = Server-Stand → mein self-geheilter/neuerer Stand pusht sich anschließend selbst
  calSaveState(calId, s => ({ ...s, keys: { ...s.keys, meta: { v: version, h: hashValue(remote) } } }))
}

const applyCalTodosPull = (calId, remote, version) => {
  const merged = mergeCalSlice(localCalSlice(calId), remote)
  if (merged.changedVsLocal) {
    const others = lv(SK.todos, []).filter(r => r?.cal !== calId)   // privat + andere Kalender
    applyCalWrite(SK.todos, [...others, ...merged.records])         // dayRank steckt in merged.records
    applyCalWrite(SK.calTombstones, { ...lv(SK.calTombstones, {}), [calId]: merged.tombstones })
  }
  calSaveState(calId, s => ({ ...s, keys: { ...s.keys, todos: { v: version, h: hashValue(remote) } } }))
}

const calPull = async (calId, calKey, ids) => {
  const nameFor = { [ids.meta]: 'meta', [ids.todos]: 'todos' }
  const r = await request(`/kv?ns=c:${calId}&since=${calState(calId).cursor ?? 0}`)
  if (!r.ok) throw new Error(`Kalender-Pull fehlgeschlagen (${r.status})`)
  const { rows, cursor } = await r.json()
  for (const row of rows ?? []) {
    const name = nameFor[row.keyId]
    if (!name) continue
    let remote
    try { remote = await decryptPayload(calKey, JSON.parse(row.ciphertext)) } catch { continue }
    if (name === 'meta') applyCalMetaPull(calId, remote, row.version)
    else applyCalTodosPull(calId, remote, row.version)
  }
  calSaveState(calId, s => ({ ...s, cursor: cursor ?? s.cursor ?? 0 }))
}

const calPush = async (calId, calKey, ids) => {
  const jobs = [
    ['meta',  ids.meta,  () => selfHealMeta(calId, localCalMeta(calId))],
    ['todos', ids.todos, () => localCalSlice(calId)],
  ]
  for (const [name, keyId, build] of jobs) {
    const value = build()
    const h = hashValue(value)
    const stored = calState(calId).keys?.[name]
    if (stored && stored.h === h) continue           // nichts geändert
    const env = await encryptPayload(calKey, value)
    const r = await request(`/kv/${keyId}?ns=c:${calId}`, { method: 'PUT', body: JSON.stringify(env), ifMatch: stored?.v ?? 0 })
    if (r.status === 409) return true
    if (!r.ok) throw new Error(`Kalender-Push fehlgeschlagen (${r.status})`)
    const { version } = await r.json()
    calSaveState(calId, s => ({ ...s, keys: { ...s.keys, [name]: { v: version, h } } }))
  }
  return false
}

const calSyncOne = async (calId) => {
  const calKey = lv(SK.calCreds, {})[calId]?.key
  if (!calKey) return
  const ids = await calKeyIds(calKey)
  for (let round = 0; round < 2; round++) {
    await calPull(calId, calKey, ids)
    if (!(await calPush(calId, calKey, ids))) return   // kein 409 → fertig
  }
}

const calTickInner = async () => {
  const creds = lv(SK.calCreds, {})
  // Sync-Zustand verlassener Kalender wegräumen (join/leave setzt zusätzlich zurück)
  const meta = loadMeta()
  if (meta.cal) {
    let pruned = false
    for (const id of Object.keys(meta.cal)) if (!creds[id]) { delete meta.cal[id]; pruned = true }
    if (pruned) saveMeta(meta)
  }
  for (const calId of Object.keys(creds)) {
    try { await calSyncOne(calId) } catch (e) { noteError(e) }
  }
  const m = loadMeta(); m.lastSyncAt = Date.now(); saveMeta(m)
}

// Direkter Einstieg (App-Anlass/Test) — eigener Mutex-Durchlauf.
export const calTick = async () => {
  if (!isCalSyncOn()) return
  await runExclusive(calTickInner)
}

// Kalender-Sync-Zustand zurücksetzen (join/leave) → erzwingt Erst-Beitritt.
export const resetCalSyncState = (calId) => {
  const meta = loadMeta()
  if (meta.cal?.[calId]) { delete meta.cal[calId]; saveMeta(meta) }
}

// ─── Lebenszyklus ─────────────────────────────────────────

// Write-Listener anschalten, sobald irgendein Sync aktiv ist (persönlich ODER Kalender).
const ensureListener = () => {
  if (!listenerOn && (isSyncOn() || isCalSyncOn())) {
    setWriteListener(handleWrite)
    listenerOn = true
  }
}

export const initSync = async () => {
  ensureListener()
  if (isSyncOn()) {
    await buildKeyIds()
    try {
      await pullOnce()     // VOR dem Scan — Erst-Kopplung: Server gewinnt
    } catch (e) { noteError(e) }
    scanOnce()
    try {
      await pushDirtyNow()
    } catch (e) { noteError(e) }
  }
  if (isCalSyncOn()) {
    try { await calTickInner() } catch (e) { noteError(e) }
  }
  return isSyncOn() || isCalSyncOn()
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
  // Kalender-Sync läuft unabhängig weiter, falls Creds vorhanden
  if (isCalSyncOn()) ensureListener()
  return false
}

// App-Anlass (Start / sichtbar werden): holen, scannen, liefern — still bei Fehlern.
export const syncTick = async () => {
  ensureListener()
  if (!isSyncOn() && !isCalSyncOn()) return
  await runExclusive(async () => {
    try {
      if (isSyncOn()) { scanOnce(); await pullOnce(); await pushDirtyNow() }
      if (isCalSyncOn()) await calTickInner()
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
