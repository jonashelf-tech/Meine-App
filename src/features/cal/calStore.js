// ─── Kalender-Mutationen (teilen-spec.md §3.5) ────────────
// Der EINZIGE Weg, geteilte Kalender + geteilte Records zu verändern. UI ruft
// nie direkt in todos[]/calList/calTombstones — immer über diese Helfer.
// Reine Kern-Funktionen (unten, getestet) + dünne Netz-Orchestratoren (oben).
import { sv, lv, SK } from '../../storage'
import { generateCalCreds, newMemberId, buildCalInvite, parseCalInvite, sha256Hex } from '../../sync/crypto'
import { loadCloudCreds } from '../../sync/cloudBackup'
import { resetCalSyncState } from '../../sync/syncEngine'
import { useAppStore } from '../../store'
import { myMemberId } from './calStamp'

// calCreds/calList sind reaktive Store-Slices (UI reagiert auf Sync + Mutationen).
const store = () => useAppStore.getState()
const loadCalCreds = () => store().calCreds
const loadCalList  = () => store().calList
const setCalCreds  = (v) => store().setCalCreds(v)
const setCalList   = (v) => store().setCalList(v)
const loadTombstones = () => lv(SK.calTombstones, {})

const calRequest = (path, { method = 'GET', body } = {}) => {
  const c = loadCloudCreds()
  if (!c?.serverUrl || !c?.token) throw new Error('Cloud-Sicherung zuerst einrichten')
  return fetch(`${c.serverUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${c.token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

// ─── Reine Kern-Logik ─────────────────────────────────────

// Tombstone-Topf eines Kalenders: dedupe pro id (neuerer Stempel gewinnt).
export const addTombstone = (tombstones, calId, entry) => {
  const list = (tombstones[calId] ?? []).filter(t => t.id !== entry.id)
  return { ...tombstones, [calId]: [...list, entry] }
}

// projectId-Regel (§3.7): ein Record darf nur ein Projekt im SELBEN Kalender
// referenzieren (oder beide privat). Passt es nicht, wird die Referenz genullt.
export const projectIdForCal = (projectId, targetCal, projects) => {
  if (projectId == null) return null
  const proj = projects.find(p => p.id === projectId)
  if (!proj) return null
  return (proj.cal ?? null) === (targetCal ?? null) ? projectId : null
}

// Verschiebt einen Record nach targetCal (calId | null=privat). Rein: liefert
// neue todos + tombstones. →Kalender überlässt das Stempeln dem Store-Wrapper
// (stampCal); →privat nullt die Stempelfelder. Umzug aus einem Kalender
// hinterlässt dort einen Tombstone (§3.5), damit er bei den anderen verschwindet.
export const moveRecordToCal = ({ todos, projects, tombstones }, recordId, targetCal, memberIdOf, now = Date.now()) => {
  const rec = todos.find(t => t.id === recordId)
  const from = rec?.cal ?? null
  const to = targetCal ?? null
  if (!rec || from === to) return { todos, tombstones }

  const nextTomb = from !== null
    ? addTombstone(tombstones, from, { id: rec.id, updatedAt: now, by: memberIdOf(from) })
    : tombstones
  const projectId = projectIdForCal(rec.projectId, to, projects)
  const nextRec = to === null
    ? { ...rec, cal: null, projectId, updatedAt: null, by: null }
    : { ...rec, cal: to, projectId }
  return { todos: todos.map(t => t.id === recordId ? nextRec : t), tombstones: nextTomb }
}

// Löscht einen Record: raus aus dem Array. Geteilt → zusätzlich Tombstone im cal.
export const deleteSharedRecord = ({ todos, tombstones }, recordId, memberIdOf, now = Date.now()) => {
  const rec = todos.find(t => t.id === recordId)
  const nextTodos = todos.filter(t => t.id !== recordId)
  if (!rec || rec.cal == null) return { todos: nextTodos, tombstones }
  return { todos: nextTodos, tombstones: addTombstone(tombstones, rec.cal, { id: rec.id, updatedAt: now, by: memberIdOf(rec.cal) }) }
}

// ─── Store-integrierte Mutationen (UI-Einstieg) ───────────

export const moveToCal = (recordId, targetCal) => {
  const { todos, projects, setTodos } = useAppStore.getState()
  const res = moveRecordToCal({ todos, projects, tombstones: loadTombstones() }, recordId, targetCal, myMemberId)
  sv(SK.calTombstones, res.tombstones)
  setTodos(res.todos)   // stampCal stempelt den →Kalender-Fall
}

export const deleteShared = (recordId) => {
  const { todos, setTodos } = useAppStore.getState()
  const res = deleteSharedRecord({ todos, tombstones: loadTombstones() }, recordId, myMemberId)
  sv(SK.calTombstones, res.tombstones)
  setTodos(res.todos)
}

// ─── Netz-Orchestratoren ──────────────────────────────────

// Kalender anlegen: Server-Objekt + lokale Creds + Meta. Liefert Einladungs-Code.
export const createCal = async ({ name, color, myName }) => {
  const { calId, joinSecret, calKey, memberId } = generateCalCreds()
  const r = await calRequest('/cal', { method: 'POST', body: { calId, joinSecretHash: await sha256Hex(joinSecret) } })
  if (!r.ok) throw new Error(`Kalender anlegen fehlgeschlagen (${r.status})`)
  const now = Date.now()
  resetCalSyncState(calId)   // frischer Kalender → Erst-Sync
  setCalCreds({ ...loadCalCreds(), [calId]: { key: calKey, memberId, joinedAt: now } })
  setCalList({ ...loadCalList(), [calId]: { name, color, members: { [memberId]: myName }, updatedAt: now } })
  return { calId, invite: await buildCalInvite({ calId, joinSecret, calKey }) }
}

// Neuen Einladungs-Code erzeugen (Re-Invite = frisches joinSecret am Server).
export const reinviteCal = async (calId) => {
  const creds = loadCalCreds()[calId]
  if (!creds) throw new Error('Kein Zugriff auf diesen Kalender')
  const joinSecret = generateCalCreds().joinSecret
  const r = await calRequest('/cal', { method: 'POST', body: { calId, joinSecretHash: await sha256Hex(joinSecret) } })
  if (!r.ok) throw new Error(`Neue Einladung fehlgeschlagen (${r.status})`)
  return { invite: await buildCalInvite({ calId, joinSecret, calKey: creds.key }) }
}

// Kalender beitreten: Code parsen, Server-Join, Creds + eigenes Mitglied lokal.
// Name/Farbe + übrige Mitglieder kommen beim ersten calTick-Pull (Erst-Beitritt).
export const joinCal = async ({ code, myName }) => {
  const { calId, joinSecret, calKey } = await parseCalInvite(code)
  const r = await calRequest('/cal/join', { method: 'POST', body: { calId, joinSecret } })
  if (r.status === 409) throw new Error('Einladung schon benutzt — bitte einen neuen Code anfordern')
  if (r.status === 410) throw new Error('Einladung abgelaufen — bitte einen neuen Code anfordern')
  if (r.status === 403) throw new Error('Einladung ungültig oder Kalender voll')
  if (!r.ok) throw new Error(`Beitritt fehlgeschlagen (${r.status})`)
  const now = Date.now()
  const memberId = newMemberId()
  resetCalSyncState(calId)   // erzwingt Erst-Beitritt (Server-Meta gewinnt + self-heal)
  setCalCreds({ ...loadCalCreds(), [calId]: { key: calKey, memberId, joinedAt: now } })
  const list = loadCalList()
  const prev = list[calId] ?? {}
  setCalList({
    ...list,
    [calId]: { name: prev.name ?? '', color: prev.color ?? null, members: { ...(prev.members ?? {}), [memberId]: myName }, updatedAt: now },
  })
  return { calId }
}

// Kalender verlassen: Server-Zugriff weg + lokale Creds weg. Die Records bleiben
// lokal (cal-Feld erhalten) — ohne Creds read-only, kein stiller Datenverlust.
export const leaveCal = async (calId) => {
  try { await calRequest(`/cal/${calId}/me`, { method: 'DELETE' }) } catch { /* Netz weg → lokal trotzdem trennen */ }
  const creds = { ...loadCalCreds() }   // Kopie — Store-State nicht in place mutieren
  delete creds[calId]
  setCalCreds(creds)
  resetCalSyncState(calId)   // Sync-Zustand des verlassenen Kalenders wegräumen
  return { calId }
}

// Meta ändern (synct via cal-Engine, lww). Nur wenn ich den Kalender kenne.
const patchMeta = (calId, patch) => {
  const list = loadCalList()
  if (!list[calId]) return
  setCalList({ ...list, [calId]: { ...list[calId], ...patch, updatedAt: Date.now() } })
}
export const renameCal  = (calId, name)  => patchMeta(calId, { name })
export const recolorCal = (calId, color) => patchMeta(calId, { color })
