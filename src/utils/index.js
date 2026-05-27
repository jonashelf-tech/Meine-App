// ─── Slot key helpers ────────────────────────────────────
export const sk = (h, half = false) => half ? `${h}.5` : String(h)

export const skLabel = (key) => {
  const h = parseFloat(key)
  return `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`
}

export const skToMinutes = (key) => {
  const h = parseFloat(key)
  return Math.floor(h) * 60 + (h % 1 ? 30 : 0)
}

export const minutesToSk = (mins) => {
  const h = Math.floor(mins / 60)
  const half = mins % 60 >= 30
  return sk(h, half)
}

export const ALL_SLOT_KEYS = Array.from({ length: 24 }, (_, h) => [sk(h), sk(h, true)]).flat()

// ─── Slot pixel height ───────────────────────────────────
// 30min = 40px base
export const slotPx = (mins) => Math.max(40, Math.round(mins * 40 / 30))

// ─── Date helpers ────────────────────────────────────────
export const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const todayKey = () => dateKey(new Date())

export const fmtDate = (d) => {
  const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  return `${DAYS_DE[d.getDay()]}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]}`
}

export const fmtDateShort = (d) => {
  const MONTHS_DE = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]}`
}

export const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()

// Mon-first (0=Mo, 6=So)
export const getFirstDayOfMonth = (y, m) => {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export const parseHHMM = (s) => {
  if (!s) return null
  const [h, m] = (s + '').split(':').map(Number)
  if (isNaN(h)) return null
  return h * 60 + (m || 0)
}

export const minsToHHMM = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// ─── Duration slot keys ──────────────────────────────────
export const getDurationKeys = (startKey, durationMins) => {
  const keys = []
  const startIdx = ALL_SLOT_KEYS.indexOf(startKey)
  if (startIdx < 0) return [startKey]
  const slots = Math.ceil(durationMins / 30)
  for (let i = 0; i < slots; i++) {
    if (startIdx + i < ALL_SLOT_KEYS.length) keys.push(ALL_SLOT_KEYS[startIdx + i])
  }
  return keys
}

// ─── Misc ────────────────────────────────────────────────
export const NEON = [
  '#00CFFF','#FF2D78','#BF00FF','#00E5FF','#FF00C8',
  '#4D9EFF','#CC44FF','#38BDFF','#E040FB','#7C4DFF',
  '#00B4D8','#FF6EC7',
]

export const todoColor = (t) => t?.color || '#8B5CF6'

// ─── Tool color helpers ──────────────────────────────────
export function hexToGlow(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `0 0 18px rgba(${r},${g},${b},0.2), 0 0 40px rgba(${r},${g},${b},0.08)`
}

export function getToolColor(toolId, toolColors) {
  if (toolColors && toolColors[toolId]) return toolColors[toolId]
  const DEFAULTS = {
    rad:          '#BF00FF',
    timer:        '#00CFFF',
    rezepte:      '#FF9F43',
    pizza:        '#FF6B6B',
    elvi:         '#00E5FF',
    gewicht:      '#00FF94',
    geburtstage:  '#FF2D78',
    gamification: '#FFD700',
    reminder:     '#00FF94',
    haushalt:     '#10B981',
    klaeren:      '#34D399',
  }
  return DEFAULTS[toolId] ?? '#8B5CF6'
}
