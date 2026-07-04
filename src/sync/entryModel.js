// ─── Eintrags-Modell für merge-fähige Keys ────────────────
// Übersetzt zwischen dem gespeicherten Wert eines Keys und einer flachen
// Map subkey → Eintrag (sync-architektur.md §3). Reine Funktionen.
//   byId       Array von {id,…}         → { id: record }
//   byId:date  Array von {date,…}       → { date: record }
//   bySubkey   Objekt-Map               → unverändert (flach)
//   bySubkey2  { a: { b: entry } }      → { 'a/b': entry }  (days: datum/slot)

const SEP = '/'

export const entriesEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Datensatz-Schlüssel; ohne id/date fällt er auf den Inhalt zurück —
// stabil über Geräte, ein Edit wirkt dann als Löschen+Anlegen.
const recordKey = (policy, record) => {
  const key = policy === 'byId:date' ? record?.date : record?.id
  return key != null ? String(key) : `#${JSON.stringify(record)}`
}

export const toEntryMap = (policy, value) => {
  if (value == null) return {}
  if (policy === 'byId' || policy === 'byId:date') {
    const map = {}
    for (const record of Array.isArray(value) ? value : []) {
      map[recordKey(policy, record)] = record
    }
    return map
  }
  if (policy === 'bySubkey2') {
    const map = {}
    for (const [outer, inner] of Object.entries(value)) {
      if (inner == null || typeof inner !== 'object') continue
      for (const [k, entry] of Object.entries(inner)) map[`${outer}${SEP}${k}`] = entry
    }
    return map
  }
  return { ...value }   // bySubkey
}

// localOrder: Subkey-Reihenfolge der lokalen Seite (byId behält lokale
// Array-Reihenfolge, Remote-Neues kommt hinten dran; byId:date sortiert).
export const fromEntryMap = (policy, map, localOrder = []) => {
  if (policy === 'byId' || policy === 'byId:date') {
    const keys = policy === 'byId:date'
      ? Object.keys(map).sort()
      : [...localOrder.filter(k => k in map), ...Object.keys(map).filter(k => !localOrder.includes(k))]
    return keys.map(k => map[k])
  }
  if (policy === 'bySubkey2') {
    const value = {}
    for (const [flat, entry] of Object.entries(map)) {
      const i = flat.indexOf(SEP)
      const outer = flat.slice(0, i)
      const k = flat.slice(i + 1)
      ;(value[outer] ??= {})[k] = entry
    }
    return value
  }
  return { ...map }
}
