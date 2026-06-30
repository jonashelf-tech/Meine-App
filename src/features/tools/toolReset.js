import { SK } from '../../storage'

// ─── Tool-Reset-Registry ──────────────────────────────────
// Single Source of Truth: welche localStorage-Keys gehören welchem Tool.
// Reset = Keys löschen → Tool baut sich beim Reload aus seinen Defaults neu auf.
// Nur Tools mit eigenen, isolierten Daten stehen hier. Reine Rechner (Pizza,
// Zufallsrad, Was jetzt?, Timer) haben nichts zu resetten; Klären/Projekte
// teilen sich Daten mit dem Kalender und gehören bewusst NICHT hierher.
export const TOOL_RESETS = {
  haushalt:    { keys: [SK.haushalt, SK.haushaltEnergie] },
  geburtstage: { keys: [SK.birthdays, 'adhs_bday_sort'] },
  rezepte:     { keys: [SK.recipes, SK.rezepteZutaten, SK.rezepteKoerbe, SK.rezepteSettings, SK.recipesVersion, SK.rezepteKorbAktiv] },
  fitness:     { keys: [SK.weight, SK.weightDash, SK.fitness, SK.fitnessSessions] },
  garten:      { keys: [SK.garten] },
  reminder:    { keys: ['adhs_reminder_v1', 'adhs_reminder_dismissed'] },
  kognitiv:    { keys: [SK.kognitiv, SK.kognitivCheckin, SK.kognitivSchedule], prefixes: ['briefing-seen-'] },
  elvi:        { keys: ['adhs_elvi_v1'] },
  // SK.dailyState gehört bewusst NICHT hierher (geteilt mit Kognitiv).
  // SK.wachstum (Legacy) bleibt erhalten — Garten zählt eingefrorene Habit-Checks daraus.
  growth:      { keys: [SK.growth] },
  notizen:     { keys: [SK.notes, SK.noteDraft] },
}

// Löscht alle Daten eines Tools und lädt die App neu (Tools rebauen Defaults).
export function resetTool(id) {
  const entry = TOOL_RESETS[id]
  if (!entry) return
  entry.keys?.forEach(k => localStorage.removeItem(k))
  if (entry.prefixes?.length) {
    Object.keys(localStorage)
      .filter(k => entry.prefixes.some(p => k.startsWith(p)))
      .forEach(k => localStorage.removeItem(k))
  }
  window.location.reload()
}
