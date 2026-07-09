import { SK, rmKey, storageKeys } from '../../storage'

// sessionStorage-Key: Tab, auf den App.jsx nach dem Reset-Reload zurücknavigiert
export const PENDING_TAB_KEY = 'adhs_pending_tab'

// ─── Tool-Reset-Registry ──────────────────────────────────
// Single Source of Truth: welche localStorage-Keys gehören welchem Tool.
// Reset = Keys löschen → Tool baut sich beim Reload aus seinen Defaults neu auf.
// Nur Tools mit eigenen, isolierten Daten stehen hier. Reine Rechner (Pizza,
// Zufallsrad, Was jetzt?, Timer) haben nichts zu resetten; Klären teilt sich
// Daten mit dem Kalender und gehört bewusst NICHT hierher.
export const TOOL_RESETS = {
  haushalt:    { keys: [SK.haushalt, SK.haushaltEnergie] },
  geburtstage: { keys: [SK.birthdays, SK.birthdaySort] },
  rezepte:     { keys: [SK.recipes, SK.rezepteZutaten, SK.rezepteKoerbe, SK.rezepteSettings, SK.recipesVersion, SK.rezepteKorbAktiv] },
  fitness:     { keys: [SK.weight, SK.weightDash, SK.fitness, SK.fitnessSessions] },
  garten:      { keys: [SK.garten] },
  reminder:    { keys: [SK.reminder, SK.reminderDismissed] },
  // prefixes: Alt-Bestand ohne SK-Eintrag (Briefing-Flags früherer Versionen) — Reset räumt sie weiter ab
  kognitiv:    { keys: [SK.kognitiv, SK.kognitivCheckin, SK.kognitivSchedule], prefixes: ['briefing-seen-'] },
  elvi:        { keys: [SK.elvi] },
  // SK.dailyState gehört bewusst NICHT hierher (geteilt mit Kognitiv).
  // SK.wachstum (Legacy) bleibt erhalten — Garten zählt eingefrorene Habit-Checks daraus.
  growth:      { keys: [SK.growth] },
  notizen:     { keys: [SK.notes, SK.noteDraft] },
}

// Löscht alle Daten eines Tools und lädt die App neu (Tools rebauen Defaults).
export function resetTool(id, returnTab) {
  const entry = TOOL_RESETS[id]
  if (!entry) return
  entry.keys?.forEach(rmKey)
  if (entry.prefixes?.length) {
    storageKeys()
      .filter(k => entry.prefixes.some(p => k.startsWith(p)))
      .forEach(rmKey)
  }
  if (returnTab != null) sessionStorage.setItem(PENDING_TAB_KEY, String(returnTab))
  window.location.reload()
}
