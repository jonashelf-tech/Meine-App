import { useState } from 'react'
import { useAppStore } from '../../../store'
import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import { createNote } from '../../notes/Note'
import { NEON } from '../../../utils'
import Overlay from '../../../components/Overlay/Overlay'
import s from './NoteEditor.module.css'

const PinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
)

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
  </svg>
)

export default function NoteEditor({ note = null, onClose }) {
  const keyboardOffset = useKeyboardOffset()
  const { setNotes, accentColor } = useAppStore()
  const isEdit = note !== null

  const [text,    setText]    = useState(note?.text ?? '')
  const [color,   setColor]   = useState(note?.color ?? accentColor ?? '#8B5CF6')
  const [pinned,  setPinned]  = useState(note?.pinned ?? false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = () => {
    const t = text.trim()
    if (!t) return
    if (isEdit) {
      setNotes(prev => prev.map(n =>
        n.id === note.id ? { ...n, text: t, color, pinned, updatedAt: new Date().toISOString() } : n
      ))
    } else {
      setNotes(prev => [createNote({ text: t, color, pinned }), ...prev])
    }
    onClose()
  }

  const remove = () => {
    setNotes(prev => prev.filter(n => n.id !== note.id))
    onClose()
  }

  return (
    <Overlay
      variant="center"
      onClose={onClose}
      closeOnBackdrop={false}
      style={keyboardOffset > 0 ? { alignItems: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset } : undefined}
    >
      <div className={s.modal} style={{ '--nc': color }}>
        <div className={s.header}>
          <span className={s.title}>{isEdit ? 'Notiz' : 'Neue Notiz'}</span>
          <div className={s.headerActions}>
            <button
              className={[s.pinBtn, pinned ? s.pinBtnOn : ''].join(' ')}
              onClick={() => setPinned(p => !p)}
              aria-label={pinned ? 'Loslösen' : 'Anpinnen'}
            >
              <PinIcon /> {pinned ? 'Angepinnt' : 'Pinnen'}
            </button>
            {isEdit && (
              <button
                className={[s.deleteBtn, confirmDelete ? s.deleteBtnConfirm : ''].join(' ')}
                onClick={confirmDelete ? remove : () => setConfirmDelete(true)}
                onBlur={() => setConfirmDelete(false)}
                aria-label="Löschen"
              >
                <TrashIcon /> {confirmDelete && 'Wirklich?'}
              </button>
            )}
            <button className={s.closeBtn} onClick={onClose} aria-label="Schließen">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <textarea
          className={s.area}
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Schreib alles rein, was raus muss…"
        />

        <div className={s.colorRow}>
          {NEON.map(c => (
            <button
              key={c}
              className={[s.colorCircle, color === c ? s.colorCircleActive : ''].join(' ')}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Farbe ${c}`}
            />
          ))}
        </div>

        <button className={s.saveBtn} onClick={save} disabled={!text.trim()}>
          {isEdit ? 'Speichern' : 'Notiz speichern'}
        </button>
      </div>
    </Overlay>
  )
}
