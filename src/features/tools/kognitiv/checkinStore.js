import { sv, lv, SK } from '../../../storage'
import { todayKey } from '../../../utils'

const todayISO = () => todayKey()
const genId    = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export function loadCheckins() {
  return lv(SK.kognitivCheckin, {})
}

export function loadCheckin(date) {
  return loadCheckins()[date] ?? null
}

export function getTodayCheckin() {
  return loadCheckin(todayISO())
}

export function isCheckinDoneToday() {
  return getTodayCheckin() !== null
}

// Check-in für heute übersprungen (ephemer, nicht im Backup) — verhindert erneutes Nachfragen.
export function markCheckinSkipped() {
  sv(SK.kognitivCheckinSkip, todayISO())
}

export function isCheckinSkippedToday() {
  return lv(SK.kognitivCheckinSkip, null) === todayISO()
}

// Heute bereits behandelt (gespeichert ODER übersprungen) → nicht mehr gaten.
export function isCheckinHandledToday() {
  return isCheckinDoneToday() || isCheckinSkippedToday()
}

export function getLastCheckin() {
  const all   = loadCheckins()
  const dates = Object.keys(all).sort()
  return dates.length > 0 ? all[dates[dates.length - 1]] : null
}

// Returns the saved entry
export function saveCheckin({ sleep, energy, medi, note }) {
  const date  = todayISO()
  const entry = {
    id:      genId(),
    date,
    savedAt: new Date().toISOString(),
    sleep:   sleep  ?? null,
    energy:  energy ?? null,
    medi:    medi   ?? null,
    note:    note   ?? '',
  }
  sv(SK.kognitivCheckin, { ...loadCheckins(), [date]: entry })
  return entry
}
