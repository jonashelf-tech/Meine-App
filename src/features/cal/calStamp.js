// ─── Stempel-Choke-Point für geteilte Records (teilen-spec.md §3.2) ───
// Zwischen zwei PERSONEN braucht jeder geteilte Record einen Vergleichsstempel
// (updatedAt/by) am Datensatz — sonst kann Gerät B meine ältere Version nicht
// von Paulas neuerer unterscheiden. Statt 50 Schreibstellen zu stempeln, läuft
// alles durch EINEN Wrapper in setTodos/setProjects (store/index.js). UI-Stellen
// (Done-Toggle, Editor, Drag) werden nicht angefasst.
import { lv, SK } from '../../storage'

// Persönliche Felder an geteilten Records: reisen NICHT mit (§3.3) und zählen
// darum nicht als „Inhaltsänderung" — eine reine Umsortierung stempelt nicht.
export const CAL_PERSONAL_FIELDS = ['dayRank']

// Meine Mitglieds-ID in einem Kalender (aus den lokalen Creds). null, wenn ich
// (nicht mehr) Mitglied bin → solche Records bleiben read-only und ungestempelt.
export const myMemberId = (calId) => lv(SK.calCreds, {})[calId]?.memberId ?? null

const IGNORED = new Set(['updatedAt', 'by', ...CAL_PERSONAL_FIELDS])

// Inhalts-Fingerabdruck eines Records ohne Stempel- und Persönlich-Felder.
const contentKey = (rec) => {
  const o = {}
  for (const k of Object.keys(rec).sort()) if (!IGNORED.has(k)) o[k] = rec[k]
  return JSON.stringify(o)
}

// prev/next: Record-Arrays (todos oder projects). Stempelt inhaltlich geänderte
// geteilte Records (cal != null) mit updatedAt/by. Reine Funktion abgesehen vom
// Creds-Read; `now` injizierbar für Tests. Gibt bei nichts-zu-tun die
// next-Referenz unverändert zurück (kein unnötiges Kopieren).
export const stampCal = (prev, next, now = Date.now()) => {
  if (!Array.isArray(next)) return next
  if (!next.some(r => r?.cal != null)) return next   // nichts Geteiltes → nichts zu stempeln

  const prevKey = new Map()
  for (const r of prev ?? []) if (r?.cal != null) prevKey.set(r.id, contentKey(r))

  let changed = false
  const out = next.map(rec => {
    if (rec.cal == null) return rec
    const memberId = myMemberId(rec.cal)
    if (!memberId) return rec                          // keine eigene Mitgliedschaft → nicht stempeln
    const before = prevKey.get(rec.id)
    if (before !== undefined && before === contentKey(rec)) return rec   // unverändert
    changed = true
    return { ...rec, updatedAt: now, by: memberId }
  })
  return changed ? out : next
}
