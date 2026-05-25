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
  color:                 '#8B5CF6',
  priority:              3,
  duration:              null,
  done:                  false,
  doneAt:                null,
  date:                  null,
  time:                  null,
  repeat:                null, // { type: 'daily'|'weekly'|'monthly'|'custom', every?, unit? }
  awaitingClockResponse: false,
  subItems:              [],
  category:              null,
  notes:                 null,
  createdAt:             new Date().toISOString(),
  ...partial,
})
