// Datenlayer des Growth-Tools (Journaling mit Tageskarten).
// Cross-Tool-Lesen (Dashboard-Section, Kalender-Dots/DayPanel, Garten-XP)
// läuft über dieses Modul, nie roh über localStorage.
import { sv, lv, SK } from '../../../storage'
import { dateKey, todayKey } from '../../../utils'
import content from './growthContent.json'

export const MAX_KARTEN_PRO_TAG = 3
export const LOCK_TAGE = 60
export const NACHTRAG_TAGE = 3

// Stimmungs-Farben 1–5 — nur Palette-Variablen (vars.css), keine neuen Hex-Werte
export const MOOD_COLORS = ['var(--rose)', 'var(--amber)', 'var(--primary)', 'var(--teal)', 'var(--emerald)']

export const KATEGORIEN = content.kategorien
export const OPENER = content.opener
export const karteById = (id) => content.karten.find(k => k.id === id) ?? null

// Opener: rotiert deterministisch pro Tag; gilt als gezeigt, sobald gerendert.
export function openerForDate(date) {
  const dayNum = Math.floor(new Date(date + 'T12:00:00').getTime() / 86400000)
  return content.opener[dayNum % content.opener.length]
}

export function markOpenerShown(data, date) {
  if (data.openerShownFor === date) return data
  return { ...data, openerShownFor: date }
}

export function emptyDay() {
  return { tageskarteId: null, skipVerwendet: false, karten: [], freitext: '', stateTouched: false, timerKarteId: null, flowAbgeschlossen: false }
}

const DEFAULT_SETTINGS = () => ({
  aktiveKategorien: content.kategorien.filter(k => k.default).map(k => k.id),
  openerAn: true,
  kiExportAn: false,
  briefingGesehen: false,
})

// ─── Laden / Speichern ────────────────────────────────────
export function loadGrowth() {
  const raw = lv(SK.growth, null)
  let data = {
    days: raw?.days ?? {},
    queuedCard: raw?.queuedCard ?? null,
    openerShownFor: raw?.openerShownFor ?? null,
    settings: { ...DEFAULT_SETTINGS(), ...(raw?.settings ?? {}) },
    wachstumJournalMigriert: raw?.wachstumJournalMigriert ?? false,
  }
  if (!data.wachstumJournalMigriert) {
    data = migrateWachstumJournal(data, lv(SK.wachstum, null))
    sv(SK.growth, data)
  }
  return data
}

export function saveGrowth(data) { sv(SK.growth, data) }

// ─── Settings ─────────────────────────────────────────────
export function setSettings(data, patch) {
  return { ...data, settings: { ...data.settings, ...patch } }
}

// Kategorie togglen — mindestens 1 muss aktiv bleiben
export function toggleKategorie(data, katId) {
  const cur = data.settings.aktiveKategorien
  const next = cur.includes(katId) ? cur.filter(id => id !== katId) : [...cur, katId]
  if (next.length === 0) return data
  return setSettings(data, { aktiveKategorien: next })
}

// Einmalig: Journal-Texte des alten Wachstum-Tools als Freitext übernehmen.
// Bestehender Freitext gewinnt; Legacy-Key bleibt unangetastet (Backup-Kompat).
export function migrateWachstumJournal(data, legacy) {
  const days = { ...data.days }
  Object.entries(legacy?.journal ?? {}).forEach(([date, text]) => {
    if (!days[date]?.freitext) days[date] = { ...emptyDay(), ...(days[date] ?? {}), freitext: text }
  })
  return { ...data, days, wachstumJournalMigriert: true }
}

// ─── Ziehlogik ────────────────────────────────────────────
// Alle im Sperrfenster um `forDate` gezogenen Karten (Tageskarte + Bonus).
// Fenster wirkt in BEIDE Richtungen, damit Nachtrag-Ziehungen nichts doppeln.
export function collectLockedIds(days, forDate, lockTage) {
  const locked = new Set()
  const ref = new Date(forDate + 'T00:00:00')
  Object.entries(days).forEach(([date, day]) => {
    const diff = Math.abs((ref - new Date(date + 'T00:00:00')) / 86400000)
    if (diff >= lockTage) return
    day.karten?.forEach(k => locked.add(k.kartenId))
    if (day.tageskarteId) locked.add(day.tageskarteId)
  })
  return locked
}

function drawableKarten(days, settings, forDate, lockTage, extraExclude) {
  const locked = collectLockedIds(days, forDate, lockTage)
  return content.karten.filter(k =>
    settings.aktiveKategorien.includes(k.kategorie) &&
    !locked.has(k.id) && !extraExclude.has(k.id))
}

// Gleichgewichtet: erst Kategorie zufällig (unter denen mit ziehbaren Karten),
// dann Karte daraus. Pool leer → Sperrfrist halbieren (60→30→15…) statt Fehler.
export function drawKarteId(data, forDate, rng = Math.random, extraExclude = new Set()) {
  let lockTage = LOCK_TAGE
  let pool = drawableKarten(data.days, data.settings, forDate, lockTage, extraExclude)
  while (pool.length === 0 && lockTage > 0) {
    lockTage = Math.floor(lockTage / 2)
    pool = drawableKarten(data.days, data.settings, forDate, lockTage, extraExclude)
  }
  if (pool.length === 0) return null
  const cats = [...new Set(pool.map(k => k.kategorie))]
  const cat = cats[Math.floor(rng() * cats.length)]
  const inCat = pool.filter(k => k.kategorie === cat)
  return inCat[Math.floor(rng() * inCat.length)].id
}

// Stellt sicher, dass `date` eine gezogene Tageskarte hat (deterministisch via
// Persistenz). Eine vorgemerkte (geskippte) Karte überschreibt die Ziehung.
export function ensureDayCard(data, date, rng = Math.random) {
  if (data.days[date]?.tageskarteId) return data
  let kartenId, queuedCard = data.queuedCard
  if (queuedCard?.date === date) {
    kartenId = queuedCard.kartenId
    queuedCard = null
  } else {
    kartenId = drawKarteId(data, date, rng)
  }
  if (!kartenId) return data
  const prev = data.days[date]
  const day = { ...emptyDay(), ...(prev ?? {}), tageskarteId: kartenId }
  if (!day.karten.some(k => k.kartenId === kartenId)) {
    day.karten = [...day.karten, { kartenId, antwort: '', erledigt: false }]
  }
  return { ...data, days: { ...data.days, [date]: day }, queuedCard }
}

export function nextDate(date) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return dateKey(d)
}

// Skip: genau 1×/Tag. Geskippte Karte → Tageskarte für morgen; sofort Ersatz ziehen.
export function skipKarte(data, date, rng = Math.random) {
  const day = data.days[date]
  if (!day?.tageskarteId || day.skipVerwendet) return data
  const skippedId = day.tageskarteId
  const ersatzId = drawKarteId(data, date, rng, new Set([skippedId]))
  if (!ersatzId) return data
  const karten = day.karten
    .filter(k => k.kartenId !== skippedId)
    .concat({ kartenId: ersatzId, antwort: '', erledigt: false })
  return {
    ...data,
    days: { ...data.days, [date]: { ...day, tageskarteId: ersatzId, skipVerwendet: true, karten } },
    queuedCard: { date: nextDate(date), kartenId: skippedId },
  }
}

// Bonus: max 3 Karten/Tag gesamt. Zählt nie für Dot-/Offen-Logik.
export function drawBonusKarte(data, date, rng = Math.random) {
  const day = data.days[date]
  if (!day || day.karten.length >= MAX_KARTEN_PRO_TAG) return data
  const id = drawKarteId(data, date, rng, new Set(day.karten.map(k => k.kartenId)))
  if (!id) return data
  const karten = [...day.karten, { kartenId: id, antwort: '', erledigt: false }]
  return { ...data, days: { ...data.days, [date]: { ...day, karten } } }
}

// ─── Antworten / Freitext / State ─────────────────────────
export function setAntwort(data, date, kartenId, patch) {
  const day = data.days[date]
  if (!day) return data
  const karten = day.karten.map(k => k.kartenId === kartenId ? { ...k, ...patch } : k)
  return { ...data, days: { ...data.days, [date]: { ...day, karten } } }
}

export function setFreitext(data, date, text) {
  const day = { ...emptyDay(), ...(data.days[date] ?? {}), freitext: text }
  return { ...data, days: { ...data.days, [date]: day } }
}

// State im Growth-Tool erfasst/korrigiert → zählt für die Erfolgs-Schwelle (Dot)
export function markStateTouched(data, date) {
  const day = { ...emptyDay(), ...(data.days[date] ?? {}), stateTouched: true }
  return { ...data, days: { ...data.days, [date]: day } }
}

export function setTimerKarte(data, date, kartenId) {
  const day = data.days[date]
  if (!day) return data
  return { ...data, days: { ...data.days, [date]: { ...day, timerKarteId: kartenId } } }
}

// Flow für diesen Tag abgeschlossen/übersprungen → Re-Entry zeigt Übersicht.
export function markFlowAbgeschlossen(data, date) {
  const day = { ...emptyDay(), ...(data.days[date] ?? {}), flowAbgeschlossen: true }
  return { ...data, days: { ...data.days, [date]: day } }
}

// ─── Erfolgs-Schwelle / Offen-Logik ───────────────────────
// Kleinste Schwelle: State-Check (im Tool) ODER 1 Zeichen Freitext ODER beantwortete Karte.
export function dayHasEntry(day) {
  if (!day) return false
  return day.stateTouched
    || (day.freitext ?? '').length > 0
    || (day.karten ?? []).some(k => (k.antwort ?? '').trim().length > 0 || k.erledigt)
}

export function getDoneDates(data = loadGrowth()) {
  return Object.entries(data.days).filter(([, d]) => dayHasEntry(d)).map(([date]) => date).sort()
}

// ─── Statistik (Overview-Kacheln) ─────────────────────────
// Serie: zusammenhängende Eintrags-Tage bis heute. Ein (noch) leerer heutiger
// Tag bricht die Serie nicht — er zählt nur nicht mit.
export function growthStreak(data, today = todayKey()) {
  const done = new Set(getDoneDates(data))
  const d = new Date(today + 'T12:00:00')
  if (!done.has(today)) d.setDate(d.getDate() - 1)
  let streak = 0
  while (done.has(dateKey(d))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

// Eintrags-Tage der laufenden Woche (Mo bis heute).
export function doneThisWeek(data, today = todayKey()) {
  const d = new Date(today + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const monday = dateKey(d)
  return getDoneDates(data).filter(x => x >= monday && x <= today).length
}

// Nur Karte 1 zählt als „offen" — Bonuskarten nie.
export function isTageskarteOffen(data, date) {
  const day = data.days[date]
  if (!day?.tageskarteId) return true
  const k1 = day.karten.find(k => k.kartenId === day.tageskarteId)
  return !k1 || (!(k1.antwort ?? '').trim() && !k1.erledigt)
}

export function isEditable(date, today = todayKey()) {
  const diff = (new Date(today + 'T00:00:00') - new Date(date + 'T00:00:00')) / 86400000
  return diff >= 0 && diff <= NACHTRAG_TAGE
}

// ─── Tageszusammenfassung (Kalender-DayPanel) ─────────────
export function getDaySummary(date) {
  const data = loadGrowth()
  const day = data.days[date]
  if (!day || !dayHasEntry(day)) return null
  return {
    freitext: day.freitext ?? '',
    karten: (day.karten ?? [])
      .filter(k => (k.antwort ?? '').trim() || k.erledigt)
      .map(k => ({ ...k, frage: karteById(k.kartenId)?.text ?? '' })),
  }
}

// ─── KI-Export ────────────────────────────────────────────
// Template exakt aus der Spezifikation (§3.7). Keine API, keine Netzwerk-Calls.
export function buildKiPrompt(data, dailyStates, nTage, today = todayKey()) {
  const tage = []
  for (let i = nTage - 1; i >= 0; i--) {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - i)
    const date = dateKey(d)
    const day = data.days[date]
    const state = dailyStates[date]
    if (!dayHasEntry(day) && !state) continue
    const zeilen = [`Datum: ${date}`]
    if (state) {
      const fmt = (v) => v != null ? `${v}/5` : '–'
      zeilen.push(`Stimmung: ${fmt(state.mood)} · Energie: ${fmt(state.energy)} · Schlaf: ${fmt(state.sleep)}`)
    }
    ;(day?.karten ?? []).forEach(k => {
      if (!(k.antwort ?? '').trim() && !k.erledigt) return
      const frage = karteById(k.kartenId)?.text ?? k.kartenId
      zeilen.push(`Karte: ${frage}`)
      if ((k.antwort ?? '').trim()) zeilen.push(`Antwort: ${k.antwort.trim()}`)
      else zeilen.push('Antwort: (als erledigt markiert)')
    })
    if ((day?.freitext ?? '').trim()) zeilen.push(`Freitext: ${day.freitext.trim()}`)
    tage.push(zeilen.join('\n'))
  }
  return `Du bist ein einfühlsamer, ehrlicher Coach. Unten stehen meine Journaling-Einträge der letzten ${nTage} Tage (Stimmung, Energie, beantwortete Reflexionskarten, freie Texte). Werte sie aus:
1. Welche wiederkehrenden Muster siehst du (Stimmung, Energie, Themen)?
2. Was läuft erkennbar gut und sollte beibehalten werden?
3. Welche 2–3 konkreten, kleinen nächsten Schritte empfiehlst du?
Sei direkt und konkret, kein Allgemeinplatz-Coaching. Ich habe ADHS — berücksichtige das bei den Empfehlungen (kleine Schritte, Systeme statt Disziplin).

--- EINTRÄGE ---
${tage.join('\n\n')}`
}
