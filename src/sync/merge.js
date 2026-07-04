// ─── Merge-Engine (sync-architektur.md §3/§4) ─────────────
// Merge passiert IMMER auf dem Client; der Server ist ein dummer Blob-Store.
// Eigenschaften (Guard G5): kommutativ auf disjunkte Änderungen, idempotent,
// Tombstone schlägt älteres Update, ohne Tombstone verschwindet nie etwas.
import { toEntryMap, fromEntryMap, entriesEqual } from './entryModel'

const TOMBSTONE_TTL = 90 * 24 * 60 * 60 * 1000

// Zustand einer Seite zu einem Unterschlüssel: gelöscht@ts, präsent@ts oder unbekannt.
const sideState = (map, sub, del, key) => {
  const tsSub = sub[key] ?? 0
  const tsDel = del[key] ?? 0
  if (tsDel > tsSub) return { deleted: true, ts: tsDel }
  if (key in map) return { deleted: false, ts: tsSub, entry: map[key] }
  if (tsDel > 0) return { deleted: true, ts: tsDel }
  return null   // Seite weiß nichts über diesen Key → darf nichts überstimmen
}

// Gewinner zweier Seiten-Zustände — bewusst symmetrisch (Kommutativität):
// neuerer ts gewinnt; bei Gleichstand gewinnt Löschung, sonst der größere Inhalt.
const pickWinner = (a, b) => {
  if (!a) return b
  if (!b) return a
  if (a.ts !== b.ts) return a.ts > b.ts ? a : b
  if (a.deleted !== b.deleted) return a.deleted ? a : b
  if (a.deleted) return a
  return JSON.stringify(a.entry) >= JSON.stringify(b.entry) ? a : b
}

const mapsEqual = (a, b) => {
  const ka = Object.keys(a), kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every(k => k in b && entriesEqual(a[k], b[k]))
}

const mergeLww = (local, remote) => {
  const lTs = local.changedAt ?? 0
  const rTs = remote.changedAt ?? 0
  const winner = lTs > rTs ? local
    : rTs > lTs ? remote
    : JSON.stringify(local.value) >= JSON.stringify(remote.value) ? local : remote
  return {
    payload: { value: winner.value, changedAt: Math.max(lTs, rTs) },
    changedVsLocal: !entriesEqual(winner.value, local.value),
    changedVsRemote: !entriesEqual(winner.value, remote.value),
  }
}

// local/remote: { value, sub?, del?, changedAt? } — entschlüsselte Payloads.
export const mergePayloads = (policy, local, remote, now = Date.now()) => {
  if (policy === 'lww') return mergeLww(local, remote)

  const lMap = toEntryMap(policy, local.value)
  const rMap = toEntryMap(policy, remote.value)
  const lSub = local.sub ?? {}, lDel = local.del ?? {}
  const rSub = remote.sub ?? {}, rDel = remote.del ?? {}

  const allKeys = new Set([
    ...Object.keys(lMap), ...Object.keys(rMap),
    ...Object.keys(lSub), ...Object.keys(lDel),
    ...Object.keys(rSub), ...Object.keys(rDel),
  ])

  const mergedMap = {}
  const sub = {}
  const del = {}
  for (const key of allKeys) {
    const winner = pickWinner(
      sideState(lMap, lSub, lDel, key),
      sideState(rMap, rSub, rDel, key),
    )
    if (!winner) continue
    if (winner.deleted) {
      if (now - winner.ts <= TOMBSTONE_TTL) del[key] = winner.ts   // GC alter Tombstones
    } else {
      mergedMap[key] = winner.entry
      if (winner.ts > 0) sub[key] = winner.ts
    }
  }

  const localOrder = Object.keys(lMap)
  return {
    payload: { value: fromEntryMap(policy, mergedMap, localOrder), sub, del },
    // Reihenfolge-only-Unterschiede zählen nicht — sonst Push-Ping-Pong bei byId
    changedVsLocal: !mapsEqual(mergedMap, lMap),
    changedVsRemote: !mapsEqual(mergedMap, rMap),
  }
}
