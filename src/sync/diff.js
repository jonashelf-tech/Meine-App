// ─── Diff-on-write (sync-architektur.md §4) ───────────────
// Schreibt die Änderungs-Metadaten eines Keys fort: sub = wann welcher
// Unterschlüssel zuletzt geändert wurde, del = Tombstones. Die Zeitstempel
// kommen aus der Sync-Schicht — das Datenmodell der App bleibt unberührt.
import { toEntryMap, entriesEqual } from './entryModel'

export const updateChangeMap = (policy, oldValue, newValue, prevSub = {}, prevDel = {}, now = Date.now()) => {
  const oldMap = toEntryMap(policy, oldValue)
  const newMap = toEntryMap(policy, newValue)
  const sub = { ...prevSub }
  const del = { ...prevDel }

  for (const [key, entry] of Object.entries(newMap)) {
    if (!(key in oldMap) || !entriesEqual(oldMap[key], entry)) {
      sub[key] = now
      delete del[key]
    }
  }
  for (const key of Object.keys(oldMap)) {
    if (!(key in newMap)) {
      del[key] = now
      delete sub[key]
    }
  }
  return { sub, del }
}
