// Reihenfolge der Tagesliste. Alle Einträge liegen auf EINER Achse: der
// Dezimalstunde. Termine und Blocker bekommen ihren Rang aus der echten Zeit,
// zeitlose Tages-Todos aus `dayRank`. Deshalb lässt sich beides mischen.
//
// `dayRank` ist ausdrücklich KEIN Zeitpunkt: er wird nie angezeigt, erzeugt nie
// einen Slot und darf über 24 oder unter 0 liegen (etwas ganz unten/oben
// einfügen). Er sortiert, mehr nicht.

import { getBlockersForDate } from './Blocker/blockerUtils'

const RANK_END = 24   // Todo ohne Rang → ans Tagesende

export function rankOf(row) {
  if (row.kind === 'slot') return parseFloat(row.slotKey)
  if (row.kind === 'band') return row.blocker.startHour
  return row.todo.dayRank ?? RANK_END
}

// Rang für einen Drop zwischen zwei Nachbarn. Fehlt ein Nachbar, wird um eine
// halbe Stunde davor/dahinter gegriffen. Der Aufrufer setzt bei einem Drop
// INNERHALB eines Blockers dessen Kanten als Nachbarn ein — insertRank selbst
// weiß von Bändern nichts.
export function insertRank(prev, next) {
  if (prev != null && next != null) return (prev + next) / 2
  if (next != null) return next - 0.5
  if (prev != null) return prev + 0.5
  return 12
}

// Aus einem Drop-Key den Einfüge-Rang bestimmen. Lücken-Keys haben die Form
// `gap|<scope>|<prev>|<next>` (der scope hält sie eindeutig, für den Rang zählen
// nur die Ränder). Alles andere — 'pool', echte Slot-Keys — ist kein Listen-Ziel
// und liefert null. Ein Aufrufer nutzt das als Weiche: null → Slot/Pool-Pfad.
export function rankFromGapKey(dropKey) {
  if (typeof dropKey !== 'string' || !dropKey.startsWith('gap|')) return null
  const [, , p, n] = dropKey.split('|')
  return insertRank(p === '' ? null : Number(p), n === '' ? null : Number(n))
}

const byRank = (a, b) => {
  const d = rankOf(a) - rankOf(b)
  if (d !== 0) return d
  // Gleichstand: Anker vor Todo (ein Termin um 10:00 schlägt dayRank 10),
  // unter Todos das ältere zuerst.
  const anchor = (r) => (r.kind === 'todo' ? 1 : 0)
  if (anchor(a) !== anchor(b)) return anchor(a) - anchor(b)
  if (a.kind === 'todo' && b.kind === 'todo') {
    return new Date(a.todo.createdAt || 0) - new Date(b.todo.createdAt || 0)
  }
  return 0
}

// Woran eine nachfolgende Lücke andockt: ein Band endet erst an seiner Endstunde.
function trailingRankOf(row) {
  return row.kind === 'band' ? row.blocker.endHour : rankOf(row)
}

// Lücken zwischen die Zeilen legen — jede Lücke ist ein Drop-Ziel und kennt
// ihre Nachbar-Ränge. `lo`/`hi` sind die Bandkanten: innerhalb eines Blockers
// darf ein Drop nicht außerhalb des Bandes landen, sonst springt der Eintrag
// beim nächsten Rendern wieder raus.
//
// `scope` hält die Keys eindeutig: aus den Nachbar-Rängen allein lässt sich kein
// eindeutiger Key bauen — zwei Fenster mit gleichen Stunden erzeugen sonst
// beide `gap|9|17`. useDragDrop führt die Ziele in einer Map über den Key; ein
// Duplikat überschreibt still das andere und macht eine Drop-Zone tot.
function withGaps(items, { lo = null, hi = null, locked = false, scope = 'root' } = {}) {
  const out = []
  const gap = (prev, next) => ({
    type: 'gap',
    key: `gap|${scope}|${prev ?? ''}|${next ?? ''}`,
    prev, next, locked,
  })
  out.push(gap(lo, items.length ? rankOf(items[0]) : hi))
  items.forEach((item, i) => {
    out.push(item)
    const next = i + 1 < items.length ? rankOf(items[i + 1]) : hi
    out.push(gap(trailingRankOf(item), next))
  })
  return out
}

export function buildDayEntries({ slots = {}, todos = [], blockers = [], viewDate }) {
  const dayBlockers = getBlockersForDate(blockers, viewDate)

  const items = [
    ...Object.entries(slots)
      .filter(([, slot]) => slot)
      .map(([slotKey, slot]) => ({
        type: 'slot', kind: 'slot', key: `slot|${slotKey}`, slotKey, slot,
      })),
    ...todos
      .filter(t => t.date === viewDate && !t.time && !t.done)
      .map(todo => ({ type: 'todo', kind: 'todo', key: `todo|${todo.id}`, todo })),
  ]

  // Zuordnung nach derselben Erst-Treffer-Regel wie das Raster
  // (getBlockerForHour): der erste Blocker, der die Stunde enthält, gewinnt.
  const bandOf = (row) => {
    const h = Math.floor(rankOf(row))
    return dayBlockers.find(b => h >= b.startHour && h < b.endHour) ?? null
  }

  const loose = []
  // Key aus id + startHour: ein Overnight-Blocker kann in zwei Stücken auftreten.
  const inBand = new Map(dayBlockers.map(b => [b.id + b.startHour, []]))
  for (const item of items) {
    const b = bandOf(item)
    if (b) inBand.get(b.id + b.startHour).push(item)
    else loose.push(item)
  }

  const bands = dayBlockers.map(blocker => ({
    type: 'band', kind: 'band', key: `band|${blocker.id}|${blocker.startHour}`,
    blocker,
    rows: withGaps(
      inBand.get(blocker.id + blocker.startHour).sort(byRank),
      {
        lo: blocker.startHour, hi: blocker.endHour, locked: !!blocker.locked,
        scope: `b${blocker.id}${blocker.startHour}`,
      },
    ),
  }))

  return { rows: withGaps([...loose, ...bands].sort(byRank)) }
}
