import { lv, SK } from '../../../storage'

// Einziger Leser für Elvi-Tagesdaten. Andere Features (z.B. Kalender) greifen
// hierüber zu, statt Elvis internes Storage-Format selbst zu parsen.
export function loadElviDay(dateKey) {
  return lv(SK.elvi, null)?.savedDays?.find(d => d.date === dateKey) ?? null
}
