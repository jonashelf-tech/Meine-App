// Zentraler Tages-Store für Schlaf / Energie / Stimmung (je 1–5 oder null).
// Geteilt: Kognitiv spiegelt Schlaf/Energie beim Check-in hierher, Growth
// liest/schreibt alle drei Werte. Keine Doppelerfassung — wer zuerst erfasst,
// dessen Werte sieht das andere Modul.
// Einmalige Seed-Migration: beim allerersten Laden wird das bestehende
// Kognitiv-Check-in-Archiv (Schlaf/Energie) übernommen.
import { sv, lv, SK } from '../../storage'

export function seedFromCheckins(checkins) {
  const out = {}
  Object.entries(checkins ?? {}).forEach(([date, c]) => {
    if (c?.sleep == null && c?.energy == null) return
    out[date] = { sleep: c.sleep ?? null, energy: c.energy ?? null, mood: null }
  })
  return out
}

export function loadDailyStates() {
  const existing = lv(SK.dailyState, null)
  if (existing !== null) return existing
  const seeded = seedFromCheckins(lv(SK.kognitivCheckin, {}))
  sv(SK.dailyState, seeded) // Key-Existenz = Migrations-Marker
  return seeded
}

export function getDayState(date) {
  return loadDailyStates()[date] ?? null
}

export function setDayState(date, patch) {
  const all = loadDailyStates()
  const next = {
    ...all,
    [date]: { sleep: null, energy: null, mood: null, ...(all[date] ?? {}), ...patch },
  }
  sv(SK.dailyState, next)
  return next[date]
}
