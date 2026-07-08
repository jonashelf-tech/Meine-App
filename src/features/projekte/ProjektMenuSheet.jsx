// src/features/projekte/ProjektMenuSheet.jsx
import { useState } from 'react'
import { useAppStore } from '../../store'
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset'
import { PROJEKT_COLORS, recolorProject, findProjectByName } from './projektModel'
import Overlay from '../../components/Overlay/Overlay'
import s from './ProjektMenuSheet.module.css'

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function ProjektMenuSheet({ project, onDissolve, onClose }) {
  const { projects, setProjects, todos, setTodos, days, setDays } = useAppStore()
  const keyboardOffset = useKeyboardOffset()

  // project ist ein Prop-Snapshot vom Öffnungszeitpunkt — nach Recolor/Rename/Toggle
  // das frische Projekt aus dem Store lesen, damit Ring/Dot/Status nicht veralten.
  const live = projects.find(p => p.id === project.id) ?? project

  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(live.name)
  const [nameError, setNameError] = useState(false)
  const [confirmDissolve, setConfirmDissolve] = useState(false)

  const handleRecolor = (color) => {
    const out = recolorProject({ projects, todos, days }, project.id, color)
    setProjects(out.projects)
    setTodos(out.todos)
    setDays(out.days)
  }

  const startRename = () => {
    setNameDraft(live.name)
    setNameError(false)
    setRenaming(true)
  }

  const submitRename = (e) => {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    const clash = findProjectByName(projects.filter(p => p.id !== project.id), trimmed)
    if (clash) { setNameError(true); return }
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: trimmed } : p))
    setRenaming(false)
  }

  const handleToggleHidden = () => {
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, hidden: !p.hidden } : p))
    onClose()
  }

  const handleToggleAutoDelete = () => {
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, autoDelete: !p.autoDelete } : p))
  }

  const handleDissolveClick = () => {
    if (!confirmDissolve) { setConfirmDissolve(true); return }
    onDissolve(project.id)
    onClose()
  }

  const overlayStyle = keyboardOffset > 0 ? { paddingBottom: keyboardOffset } : {}

  return (
    <Overlay variant="sheet" onClose={onClose} style={overlayStyle}>
      <div className={s.sheet}>
        <div className={s.grab} />

        <div className={s.titleRow}>
          <span className={s.dot} style={{ background: live.color }} />
          <span className={s.titleName}>{live.name}</span>
        </div>

        <div className={s.section}>
          <div className={s.sectionLabel}>Farbe</div>
          <div className={s.palette}>
            {PROJEKT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={s.swatch}
                onClick={() => handleRecolor(c)}
                aria-label={`Farbe ${c}`}
              >
                <span
                  className={s.swatchDot}
                  style={{ background: c, boxShadow: live.color === c ? `0 0 0 2px var(--bg3), 0 0 0 4px ${c}` : 'none' }}
                />
              </button>
            ))}
          </div>
        </div>

        {renaming ? (
          <form className={s.renameForm} onSubmit={submitRename}>
            <input
              className={s.renameInput}
              value={nameDraft}
              onChange={e => { setNameDraft(e.target.value); setNameError(false) }}
              autoFocus
            />
            <button type="submit" className={s.renameConfirm} aria-label="Umbenennen bestätigen">
              <CheckIcon />
            </button>
          </form>
        ) : (
          <button className={s.row} onClick={startRename}>Umbenennen</button>
        )}
        {nameError && <div className={s.errorHint}>Name existiert schon</div>}

        <button className={s.row} onClick={handleToggleHidden}>
          {live.hidden ? 'Einblenden' : 'Ausblenden'}
        </button>

        <button className={s.row} onClick={handleToggleAutoDelete}>
          Auto-Abschluss
          <small className={s.rowStatus}>{live.autoDelete ? 'An' : 'Aus'}</small>
        </button>

        <button
          className={[s.row, s.rowDanger, confirmDissolve ? s.rowDangerConfirm : ''].join(' ')}
          onClick={handleDissolveClick}
        >
          {confirmDissolve ? 'Wirklich auflösen?' : 'Projekt auflösen'}
        </button>
        <div className={s.note}>Todos bleiben erhalten — nur die Zuordnung verschwindet.</div>
      </div>
    </Overlay>
  )
}
