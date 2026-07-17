// Reihenfolge der Tagesliste. Alle Einträge liegen auf EINER Achse: der
// Dezimalstunde. Termine und Blocker bekommen ihren Rang aus der echten Zeit,
// zeitlose Tages-Todos aus `dayRank`. Deshalb lässt sich beides mischen.
//
// `dayRank` ist ausdrücklich KEIN Zeitpunkt: er wird nie angezeigt, erzeugt nie
// einen Slot und darf über 24 oder unter 0 liegen (etwas ganz unten/oben
// einfügen). Er sortiert, mehr nicht.

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
