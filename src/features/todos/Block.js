export const PRIO = {
  1: { label: 'Wichtig', color: '#FF2D78', bg: 'rgba(255,45,120,0.12)' },
  2: { label: 'Sollte',  color: '#00CFFF', bg: 'rgba(0,207,255,0.08)' },
  3: { label: 'Kann',    color: 'rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.04)' },
}

export const isTermin      = (b) => !!(b.date && b.time)
export const isFaelligkeit = (b) => !!(b.date && !b.time)
export const isTodo        = (b) => !b.date && !b.time

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const createBlock = (partial = {}) => ({
  id:                    genId(),
  text:                  '',
  color:                 null,    // null = Standard: rendert als Akzentfarbe (var(--primary))
  priority:              3,
  duration:              null,
  done:                  false,
  doneAt:                null,
  date:                  null,
  time:                  null,
  dayRank:               null,   // Sortier-Rang auf der Tagesachse (Listenmodus) — KEIN Zeitpunkt, wird nie angezeigt
  repeat:                null, // { type: 'daily'|'weekly'|'monthly'|'custom', every?, unit? }
  subItems:              [],
  projectId:             null,
  notes:                 null,
  paused:                false,  // pausiert = raus aus dem präsenten Vordergrund, ans Pool-Ende
  pauseReason:           null,   // optionaler Grund („woran hängt's"), als Marker am Chip
  showFromDate:          null,   // "2026-06-15" — Todo erst ab diesem Datum im Pool sichtbar
  createdAt:             new Date().toISOString(),
  toolId:                null,
  haushaltTaskIds:       [],
  haushaltRoomId:        null,
  cal:                   null,   // null = privat · '<calId>' = geteilter Kalender (teilen-spec.md §3.1)
  updatedAt:             null,   // ms-Epoch — nur für cal!=null gepflegt (LWW-Quelle zwischen Personen)
  by:                    null,   // memberId des letzten Bearbeiters — nur für cal!=null
  ...partial,
})
