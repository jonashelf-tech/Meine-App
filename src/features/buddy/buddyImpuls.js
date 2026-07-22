// ─── Buddy-Impuls-Engine (pur — Guard: buddyImpuls.test.js) ───────────────
// Stufe-2-Proaktivität nach dem „Briefkasten-Prinzip": Trigger werden rein
// lokal-deterministisch berechnet (kein API-Call). Es liegt maximal EIN
// stiller Gedanke, sichtbar nur als Punkt am Avatar — kein Schuld-Ton, keine
// Push-Texte, nur ein leises Angebot ("Magst du…?"). Pur wie contextPacket.js:
// kein Storage-/Zustand-Zugriff, alles kommt als Parameter rein.
import { dateKey } from '../../utils'
import { isScopeAllowed } from './contextPacket'

export const KIND_BY_TRIGGER = { rueckkehr: 'start', verschoben: 'klaeren', prio1: 'klaeren', morgen: 'tagesplan', poolstau: 'aufraeumen' }
export const BACKOFF_DAYS = { verschoben: 14, prio1: 14, poolstau: 7 }   // morgen: bis Folgetag · rueckkehr: entschärft sich selbst
export const EMPTY_IMPULS = { active: null, backoff: {}, lastActiveDay: null, lastThoughtDay: null }

const TEXT_MAX = 60
const POOLSTAU_SCHWELLE = 5
const MORGEN_START_H = 6
const MORGEN_END_H = 12
const TAG_MS = 86400000

const cut = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '')

const ageDays = (createdAt, now) => {
  const t = new Date(createdAt ?? now).getTime()
  return Math.max(0, Math.floor((now.getTime() - t) / TAG_MS))
}

// Kalendertage zwischen zwei dateKey-Strings — über Date.UTC gerechnet, damit
// eine Zeitumstellung dazwischen die Differenz nicht verfälscht.
const daysBetween = (fromKey, toKey) => {
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / TAG_MS)
}

const isPoolTodo = (t, scopeOk) => !t.done && !t.date && !t.time && !t.paused && scopeOk(t)
const poolCount = (todos, scopeOk) => (todos ?? []).filter(t => isPoolTodo(t, scopeOk)).length

// Prüft, ob ein bestehender aktiver Gedanke seine Bedingung noch erfüllt.
function isActiveStillValid(active, { today, todoById, scopeOk, days, now, todos }) {
  if (active.day !== today) return false   // Gedanken verfallen am Tagesende

  if (active.trigger === 'verschoben' || active.trigger === 'prio1') {
    const t = todoById.get(active.todoId)
    if (!t || t.done || !scopeOk(t)) return false
    if (active.trigger === 'prio1' && (t.date || t.time)) return false   // wurde geplant, Gedanke erledigt
    return true
  }
  if (active.trigger === 'morgen') {
    const h = now.getHours()
    if (h < MORGEN_START_H || h >= MORGEN_END_H) return false
    return Object.keys(days?.[today] ?? {}).length === 0
  }
  if (active.trigger === 'poolstau') return poolCount(todos, scopeOk) > POOLSTAU_SCHWELLE
  if (active.trigger === 'rueckkehr') return true   // verfällt nur über die day-Regel oben

  return false
}

// Sucht einen neuen Trigger in fester Prioritätsreihenfolge — der erste
// Treffer gewinnt.
function findNewTrigger({ todos, days, today, scopeOk, klaerenThreshold, now, backoff, gapTage }) {
  if (gapTage >= 7) return { trigger: 'rueckkehr' }

  const verschobenKandidaten = (todos ?? [])
    .filter(t =>
      !t.done &&
      (t.postponeCount ?? 0) >= 3 &&
      !t.paused &&
      scopeOk(t) &&
      !(t.postponedAt && dateKey(new Date(t.postponedAt)) === today) &&   // nicht im selben Atemzug wie das Verschieben
      (!t.date || t.date <= today) &&                                    // bewusst umgeplante Todos in Ruhe lassen
      !(`verschoben:${t.id}` in backoff)
    )
    .sort((a, b) =>
      (b.postponeCount ?? 0) - (a.postponeCount ?? 0) ||
      new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0)
    )
  if (verschobenKandidaten.length) return { trigger: 'verschoben', todoId: verschobenKandidaten[0].id }

  const prio1Kandidaten = (todos ?? [])
    .filter(t =>
      !t.done && !t.date && !t.time && !t.paused &&
      t.priority === 1 &&
      ageDays(t.createdAt, now) >= klaerenThreshold &&
      scopeOk(t) &&
      !(`prio1:${t.id}` in backoff)
    )
    .sort((a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0))
  if (prio1Kandidaten.length) return { trigger: 'prio1', todoId: prio1Kandidaten[0].id }

  const hour = now.getHours()
  const hatSlotsHeute = Object.keys(days?.[today] ?? {}).length > 0
  if (hour >= MORGEN_START_H && hour < MORGEN_END_H && !hatSlotsHeute && !('morgen' in backoff)) {
    return { trigger: 'morgen' }
  }

  if (poolCount(todos, scopeOk) > POOLSTAU_SCHWELLE && !('poolstau' in backoff)) return { trigger: 'poolstau' }

  return null
}

export function computeImpuls(prev, { todos, days, calScopes, calList, klaerenThreshold = 30, focusActive = false, now }) {
  const base = prev ?? EMPTY_IMPULS
  const today = dateKey(now)

  // Rückkehr-Lücke VOR dem Update messen — lastActiveDay wird unten so oder so überschrieben
  const gapTage = base.lastActiveDay ? daysBetween(base.lastActiveDay, today) : 0

  // Abgelaufene Backoff-Einträge raus, State klein halten
  const nowTs = now.getTime()
  const backoff = {}
  for (const [key, untilTs] of Object.entries(base.backoff ?? {})) {
    if (untilTs > nowTs) backoff[key] = untilTs
  }

  const todoById = new Map((todos ?? []).map(t => [t.id, t]))
  const scopeOk = (t) => isScopeAllowed(t?.cal ?? null, calScopes, calList)
  const ctx = { today, todoById, scopeOk, days, now, todos }

  // Aktiven Gedanken revalidieren
  let active = base.active && isActiveStillValid(base.active, ctx) ? base.active : null
  let lastThoughtDay = base.lastThoughtDay ?? null

  // Neuen Gedanken nur, wenn keiner übrig ist, heute noch keiner erzeugt wurde
  // und kein Fokus-Timer läuft
  if (!active && base.lastThoughtDay !== today && !focusActive) {
    const found = findNewTrigger({ todos, days, today, scopeOk, klaerenThreshold, now, backoff, gapTage })
    if (found) {
      active = { ...found, day: today }
      lastThoughtDay = today
    }
  }

  return { active, backoff, lastActiveDay: today, lastThoughtDay }
}

// "Nicht jetzt" — Gedanke geht weg, Backoff verhindert kurzfristiges Wiederkommen.
export function dismissImpuls(state, now) {
  const s = state ?? EMPTY_IMPULS
  const backoff = { ...(s.backoff ?? {}) }
  const active = s.active

  if (active?.trigger === 'verschoben' || active?.trigger === 'prio1') {
    backoff[`${active.trigger}:${active.todoId}`] = now.getTime() + BACKOFF_DAYS[active.trigger] * TAG_MS
  } else if (active?.trigger === 'poolstau') {
    backoff.poolstau = now.getTime() + BACKOFF_DAYS.poolstau * TAG_MS
  } else if (active?.trigger === 'morgen') {
    backoff.morgen = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime()
  }
  // rueckkehr: kein Backoff-Eintrag — die Lücke schließt sich von selbst

  return { ...s, active: null, backoff }
}

// "Zeig mir" — das Gespräch übernimmt, der Gedanke ist konsumiert.
export function consumeImpuls(state) {
  const s = state ?? EMPTY_IMPULS
  return { ...s, active: null }
}

// Deterministische, kostenlose Anrede-Zeile — nie eine Ansage, immer ein Angebot.
export function impulsTeaser(active, todos, now) {
  if (!active) return null
  const todoById = new Map((todos ?? []).map(t => [t.id, t]))

  switch (active.trigger) {
    case 'rueckkehr':
      return 'Schön, dass du wieder da bist. Magst du einen kleinen Einstieg?'
    case 'verschoben': {
      const t = todoById.get(active.todoId)
      if (!t) return null
      return `„${cut(t.text, TEXT_MAX)}" hat sich ein paarmal verschoben — wollen wir rausfinden, woran es hakt?`
    }
    case 'prio1': {
      const t = todoById.get(active.todoId)
      if (!t) return null
      return `„${cut(t.text, TEXT_MAX)}" ist dir wichtig und liegt seit ${ageDays(t.createdAt, now)} Tagen — suchen wir einen winzigen ersten Schritt?`
    }
    case 'morgen':
      return 'Der Tag ist noch leer — wollen wir ihn grob aufstellen?'
    case 'poolstau':
      return 'Im Pool hat sich einiges angesammelt — wollen wir zusammen sortieren?'
    default:
      return null
  }
}
