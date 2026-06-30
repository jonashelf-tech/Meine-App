// Notiz — eigenständiger Capture-Typ. Bewusst NICHT im todos[]-Array, sondern
// eigener Store/Key (SK.notes): Notizen haben keinen done/Termin/Kalender-
// Lebenszyklus und sollen nicht durch Pool/Kalender/Missed-Review rutschen.
// Block-ähnlich geformt, damit eine spätere „→ Todo"-Promotion trivial bliebe.
import { fmtDateShort } from '../../utils'

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const createNote = (partial = {}) => {
  const now = new Date().toISOString()
  return {
    id:        genId(),
    text:      '',
    color:     '#8B5CF6',
    pinned:    false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

// Erste nicht-leere Zeile = Titel, der Rest = Vorschau.
export const noteTitle = (note) =>
  (note.text || '').split('\n').map(l => l.trim()).find(Boolean) || 'Leere Notiz'

export const notePreview = (note) => {
  const lines = (note.text || '').split('\n').map(l => l.trim()).filter(Boolean)
  return lines.slice(1).join(' ')
}

// Relativ: heute → „Heute · 14:20", gestern, diese Woche → Wochentag, sonst „12. Jun".
export const formatNoteTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000)
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (diffDays === 0) return `Heute · ${hhmm}`
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]
  return fmtDateShort(d)
}
