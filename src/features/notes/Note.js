// Notiz — eigenständiger Capture-Typ. Bewusst NICHT im todos[]-Array, sondern
// eigener Store/Key (SK.notes): Notizen haben keinen done/Termin/Kalender-
// Lebenszyklus und sollen nicht durch Pool/Kalender/Missed-Review rutschen.
// Block-ähnlich geformt, damit eine spätere „→ Todo"-Promotion trivial bliebe.

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
