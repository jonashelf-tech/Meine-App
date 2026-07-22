// ─── Notifications-Feed (A10 / notifications-feed-konzept.md) ─────────
// Reine Ableitung: „das ist passiert seit deinem letzten Blick" aus
// todos + calTombstones + calList + calCreds + calFilter + calSeen + days.
// Berechnet, nie gespeichert (analog reconcileDaySlots) — kein Sync-State.
import { blocksOverlap } from '../calendar/TabKalender/kalenderShared'

// Aktivität pro Kalender (A8-Toggle) — getrennt vom Sicht-Chip `show`:
// der Chip regelt, was der Plan zeigt, activity regelt nur diesen Feed.
const isActive = (calFilter, calId) => calFilter?.cals?.[calId]?.activity !== false

// Typ-Regel (teilen-spec.md §7): nach dem letzten Blick erstellt → added ·
// frisch erledigt → done · sonst → changed. ISO-Felder (createdAt/doneAt)
// werden gegen den ms-Blick geparst.
const typeOf = (t, seen) => {
  if (Date.parse(t.createdAt) > seen) return 'added'
  if (t.done && t.doneAt && Date.parse(t.doneAt) > seen) return 'done'
  return 'changed'
}

// Kollision (Konzept §2.2): unplatzierter fremder Termin überlappt einen
// eigenen Slot → Text des ersten Getroffenen. Als Slot platziert oder erledigt
// = kein Konflikt (reconcileDaySlots platziert nur, was frei ist).
const clashWith = (t, days) => {
  if (!t.date || !t.time || t.done) return null
  const slots = days?.[t.date]
  if (!slots) return null
  const entries = Object.entries(slots).filter(([, sl]) => sl)
  if (entries.some(([, sl]) => sl.todoId === t.id)) return null
  const [hh, mm] = t.time.split(':').map(Number)
  const start = hh + (mm || 0) / 60
  for (const [k, sl] of entries) {
    if (blocksOverlap(start, t.duration, parseFloat(k), sl.duration)) return sl.text ?? ''
  }
  return null
}

// Digest-Eintrag: { type: 'added'|'changed'|'done'|'deleted'|'clash',
//   calId, todoId, by, who, title, at, date, time, clashWith }
export function getNotifications(input) {
  const { todos = [], calTombstones = {}, calList = {}, calCreds = {}, calFilter = {}, calSeen = {}, days = {} } = input
  const who = (calId, by) => calList[calId]?.members?.[by] ?? 'Jemand'
  const out = []

  for (const t of todos) {
    if (!t?.cal || t.updatedAt == null || !t.by) continue
    if (!isActive(calFilter, t.cal)) continue
    if (t.by === (calCreds[t.cal]?.memberId ?? null)) continue
    const seen = calSeen[t.cal] ?? 0
    if (t.updatedAt <= seen) continue
    const base = typeOf(t, seen)
    const clash = base === 'done' ? null : clashWith(t, days)
    out.push({
      type: clash != null ? 'clash' : base, calId: t.cal, todoId: t.id, by: t.by,
      who: who(t.cal, t.by), title: t.text, at: t.updatedAt, date: t.date, time: t.time,
      ...(clash != null && { clashWith: clash }),
    })
  }

  for (const [calId, tombs] of Object.entries(calTombstones)) {
    if (!isActive(calFilter, calId)) continue
    const myId = calCreds[calId]?.memberId ?? null
    const seen = calSeen[calId] ?? 0
    for (const tb of tombs ?? []) {
      if (!tb?.by || tb.by === myId || tb.updatedAt <= seen) continue
      out.push({
        type: 'deleted', calId, todoId: tb.id, by: tb.by,
        who: who(calId, tb.by), title: null, at: tb.updatedAt, date: null, time: null,
      })
    }
  }

  return out.sort((a, b) => b.at - a.at)
}
