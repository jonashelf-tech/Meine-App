export const SK_WEIGHT = 'adhs_health_weight'

export const isoToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const isoAddDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// "27.05" – kurz für Verlauf
export const isoLabel = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

// "So, 27. Mai" – für NavPill
const DAYS   = ['So','Mo','Di','Mi','Do','Fr','Sa']
const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
export const isoNavLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]}, ${d}. ${MONTHS[m - 1]}`
}

export const loadEntries = () => {
  try {
    const r = localStorage.getItem(SK_WEIGHT)
    if (!r) return []
    return JSON.parse(r)
      .map(e => ({ date: e.date, kg: e.kg ?? e.weight ?? null, kcal: e.kcal ?? null }))
      .filter(e => e.date && e.kg != null)
  } catch { return [] }
}

export const saveEntries = entries => {
  try { localStorage.setItem(SK_WEIGHT, JSON.stringify(entries)) } catch {}
}

export const upsertEntry = (entries, rec) => {
  const idx = entries.findIndex(e => e.date === rec.date)
  const next = idx >= 0
    ? entries.map((e, i) => i === idx ? rec : e)
    : [...entries, rec].sort((a, b) => a.date.localeCompare(b.date))
  saveEntries(next)
  return next
}
