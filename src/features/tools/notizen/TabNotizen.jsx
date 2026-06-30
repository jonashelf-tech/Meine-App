import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { noteTitle, notePreview, formatNoteTime } from '../../notes/Note'
import NoteEditor from './NoteEditor'
import s from './TabNotizen.module.css'

const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
)

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
)

export default function TabNotizen({ onBack }) {
  const { notes, toolColors } = useAppStore()
  const toolColor = getToolColor('notizen', toolColors)
  const [editing, setEditing] = useState(null)   // note-Objekt | 'new' | null
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? notes.filter(n => (n.text || '').toLowerCase().includes(q)) : notes
    return [...list].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  }, [notes, query])

  const pinned = filtered.filter(n => n.pinned)
  const rest   = filtered.filter(n => !n.pinned)

  const renderCard = (n) => {
    const preview = notePreview(n)
    return (
      <button key={n.id} className={s.card} style={{ '--nc': n.color }} onClick={() => setEditing(n)}>
        <div className={s.cardHead}>
          <span className={s.dot} />
          <span className={s.cardTitle}>{noteTitle(n)}</span>
          {n.pinned && <span className={s.cardPin}><PinIcon /></span>}
        </div>
        {preview && <div className={s.cardPreview}>{preview}</div>}
        <div className={s.cardTime}>{formatNoteTime(n.updatedAt)}</div>
      </button>
    )
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="notizen" size={20} />}
        eyebrow="Tool"
        title="Notizen"
        actions={
          <button className={s.addBtn} onClick={() => setEditing('new')}>
            <span className={s.addPlus}>+</span> Notiz
          </button>
        }
      />

      {notes.length > 0 && (
        <div className={s.searchWrap}>
          <span className={s.searchIcon}><SearchIcon /></span>
          <input
            className={s.search}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Notizen durchsuchen"
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
        </div>
      )}

      {notes.length === 0 ? (
        <div className={s.emptyCard}>
          <div className={s.emptyIcon}><ToolIcon id="notizen" size={30} /></div>
          <div className={s.emptyTitle}>Noch keine Notizen</div>
          <div className={s.emptyText}>Halt fest, was dir durch den Kopf geht — du sortierst später. Auch über „+" → Notiz von überall erreichbar.</div>
          <button className={s.emptyCta} onClick={() => setEditing('new')}>Erste Notiz</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={s.noResults}>Nichts gefunden für „{query.trim()}".</div>
      ) : (
        <>
          {pinned.length > 0 && (
            <>
              <div className={s.sectionLabel}>Angepinnt</div>
              <div className={s.pinnedList}>{pinned.map(renderCard)}</div>
            </>
          )}
          {rest.length > 0 && (
            <>
              <div className={s.sectionLabel}>{pinned.length ? 'Alle Notizen' : 'Notizen'}</div>
              <div className={s.masonry}>{rest.map(renderCard)}</div>
            </>
          )}
        </>
      )}

      {editing && (
        <NoteEditor note={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
