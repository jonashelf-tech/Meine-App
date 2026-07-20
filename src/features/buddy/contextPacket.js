// ─── Buddy-Kontextpaket (pur — Guard: contextPacket.test.js) ──────────────
// Baut das JSON, das der Buddy-Call an den Worker (und damit an die KI-API)
// schickt. Datenschutz-Kernstück: nimmt AUSSCHLIESSLICH explizite Eingaben
// entgegen (kein Storage-Zugriff — der statische Guard erzwingt das) und
// filtert nach den calScopes des Nutzers (Konzept §8/§9). Alles gekappt:
// nur das Nötige verlässt das Gerät, nie der komplette Datenbestand.
import { dateKey, minsToHHMM, skLabel } from '../../utils'

export const ALLOWED_PACKET_KEYS = [
  'screen', 'heute', 'wochentag', 'uhrzeit', 'fokusTodo', 'tag', 'pool', 'energie', 'merkzettel', 'notizen',
]

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

const TEXT_MAX = 120
const STEP_MAX = 80
const STEPS_MAX = 12
const TOP_MAX = 5
const WINDOW_MIN = 60          // freie Fenster erst ab 60 min
const DAY_START = 7 * 60
const DAY_END = 22 * 60

const cut = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '')
const ageDays = (createdAt, now) => {
  const t = new Date(createdAt ?? now).getTime()
  return Math.max(0, Math.floor((now.getTime() - t) / 86400000))
}

// Sichtbarkeits-Regel (Konzept §8): explizit gesetzter Scope gewinnt; sonst
// ist ein Kalender mit ≤1 Mitglied (nur ich) default AN, ein geteilter AUS.
const memberCount = (cal) => {
  const m = cal?.members
  if (Array.isArray(m)) return m.length
  if (typeof m === 'number') return m
  return 1
}
export const isScopeAllowed = (calId, calScopes, calList) => {
  if (calId == null) return calScopes?.privat !== false
  const explicit = calScopes?.cals?.[calId]
  if (typeof explicit === 'boolean') return explicit
  return memberCount(calList?.[calId]) <= 1
}

const poolEntry = (t, now) => ({
  id: t.id,
  text: cut(t.text, TEXT_MAX),
  prio: t.priority ?? 3,
  dauerMin: t.duration ?? null,
  alterTage: ageDays(t.createdAt, now),
})

export function buildContextPacket({
  screen, focusTodoId, todos, days, projects, calList,
  buddySettings, buddyMemory, notes, klaerenThreshold = 30, dailyState, now,
}) {
  const scopes = buddySettings?.calScopes ?? { privat: true, cals: {} }
  const visible = (todos ?? []).filter(t => !t.done && isScopeAllowed(t.cal ?? null, scopes, calList))

  const dk = dateKey(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // ── Tages-Skelett (nur Slot-Metadaten, keine kompletten Tage) ──
  // Slot-Texte können zu Todos gesperrter Kalender gehören (eigene Einträge in
  // geteilten Kalendern landen in days) — Text nur, wenn der Scope es erlaubt.
  const todoById = new Map((todos ?? []).map(t => [t.id, t]))
  const slotTextOk = (s) => {
    const t = s.todoId ? todoById.get(s.todoId) : null
    return isScopeAllowed(t ? (t.cal ?? null) : null, scopes, calList)
  }
  const slots = Object.entries(days?.[dk] ?? {})
    .map(([k, s]) => ({ start: parseFloat(k) * 60, dauer: s?.duration ?? 30, text: s?.text ?? '', done: !!s?.done, todoId: s?.todoId, key: k }))
    .sort((a, b) => a.start - b.start)
  const next = slots.find(s => !s.done && s.start >= nowMin) ?? null

  const fenster = []
  let cursor = Math.max(nowMin, DAY_START)
  for (const s of slots) {
    const ende = s.start + s.dauer
    if (s.start > cursor && s.start - cursor >= WINDOW_MIN) fenster.push([cursor, Math.min(s.start, DAY_END)])
    cursor = Math.max(cursor, ende)
    if (cursor >= DAY_END) break
  }
  if (DAY_END - cursor >= WINDOW_MIN) fenster.push([cursor, DAY_END])

  // ── Pool ──
  const pool = visible.filter(t => !t.date && !t.time)
  const poolAges = pool.map(t => ageDays(t.createdAt, now))
  const top = pool
    .filter(t => !t.paused)
    .sort((a, b) => {
      const pa = a.priority ?? 3, pb = b.priority ?? 3
      if (pa !== pb) return pa - pb
      return ageDays(b.createdAt, now) - ageDays(a.createdAt, now)
    })
    .slice(0, TOP_MAX)
    .map(t => poolEntry(t, now))

  const packet = {
    screen: screen ?? 'app',
    heute: dk,
    wochentag: WOCHENTAGE[now.getDay()],
    uhrzeit: minsToHHMM(nowMin),
    tag: {
      slots: slots.length,
      erledigt: slots.filter(s => s.done).length,
      naechster: next ? { zeit: skLabel(next.key), text: slotTextOk(next) ? cut(next.text, 60) : '(privat)' } : null,
      freieFenster: fenster.slice(0, 3).map(([a, b]) => `${minsToHHMM(a)}–${minsToHHMM(b)}`),
    },
    pool: {
      offen: pool.length,
      aeltesteTage: poolAges.length ? Math.max(...poolAges) : 0,
      klaerenReif: poolAges.filter(a => a >= klaerenThreshold).length,
      top,
    },
  }

  // ── Fokus-Todo (nur auf ausdrückliche Auswahl, Scope-gefiltert) ──
  if (focusTodoId) {
    const t = visible.find(x => x.id === focusTodoId) ?? null
    if (t) {
      packet.fokusTodo = {
        ...poolEntry(t, now),
        projekt: (projects ?? []).find(p => p.id === t.projectId)?.name ?? null,
        schritte: (t.subItems ?? []).slice(0, STEPS_MAX).map(s => ({ text: cut(s.text, STEP_MAX), done: !!s.done })),
        ...(t.paused ? { pausiert: true, pauseGrund: cut(t.pauseReason, STEP_MAX) || null } : {}),
      }
    }
  }

  // ── Merk-Notizen: nur die vom Nutzer bestätigten Fakten ──
  const merkzettel = (buddyMemory ?? []).map(m => cut(m.text, 100)).filter(Boolean).slice(0, 20)
  if (merkzettel.length) packet.merkzettel = merkzettel

  // ── Notizen-Tool: nur mit Freigabe (Jonas 2026-07-20: default an, abschaltbar) ──
  if (buddySettings?.notizenLesen !== false) {
    const notizen = [...(notes ?? [])]
      .sort((a, b) => (!!b.pinned - !!a.pinned) || String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
      .map(n => cut(n.text, 300))
      .filter(Boolean)
      .slice(0, 12)
    if (notizen.length) packet.notizen = notizen
  }

  // ── Energie: nur die grobe Selbstauskunft von heute, nie Rohwerte ──
  const energy = dailyState?.[dk]?.energy
  if (typeof energy === 'number') {
    packet.energie = energy <= 2 ? 'niedrig' : energy === 3 ? 'ok' : 'gut'
  }

  return packet
}
