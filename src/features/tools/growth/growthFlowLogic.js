// Reine Sicht-/Ablauf-Logik des Growth-Flows (getestet, ohne React).
import { dayHasEntry } from './growthStore'

// Beim Öffnen: frischer heutiger Tag → geführter Fluss, sonst Übersicht.
export function growthViewMode(data, viewDate, today) {
  if (viewDate !== today) return 'overview'
  const day = data.days?.[viewDate]
  if (day?.flowAbgeschlossen || dayHasEntry(day)) return 'overview'
  return 'flow'
}

// Basis-Schrittfolge. Bonus wird zur Laufzeit eingeschoben (nutzerabhängig),
// taucht hier nicht auf. „ankommen" enthält den Check-in und ist immer dabei.
export function flowSteps(data, viewDate) {
  const day = data.days?.[viewDate]
  const steps = ['ankommen']
  if (day?.tageskarteId) steps.push('karte')
  steps.push('freitext')
  return steps
}
