// src/features/projekte/ProjekteView.jsx
import { useState } from 'react'
import { useAppStore } from '../../store'
import { PROJEKT_COLORS, createProject, nextFreeColor, dissolveProject } from './projektModel'
import ProjektKarte from './ProjektKarte'
import ProjektMenuSheet from './ProjektMenuSheet'
import s from './ProjekteView.module.css'

const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease)' }}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
)

export default function ProjekteView({ onBack }) {
  const { projects, setProjects, todos, setTodos } = useAppStore()

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(() => nextFreeColor(projects))
  const [showHidden, setShowHidden] = useState(false)
  const [menuProject, setMenuProject] = useState(null)

  const visible = projects.filter(p => !p.hidden)
  const hidden  = projects.filter(p => p.hidden)

  const visibleIds = new Set(visible.map(p => p.id))
  const openTodos = todos.filter(t => !t.done && t.projectId && visibleIds.has(t.projectId)).length

  const startCreate = () => {
    setColor(nextFreeColor(projects))
    setCreating(true)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setProjects([...projects, createProject({ name: trimmed, color })])
    setName('')
    setCreating(false)
  }

  const handleDissolve = (id) => {
    const out = dissolveProject({ projects, todos }, id)
    setProjects(out.projects)
    setTodos(out.todos)
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <button className={s.back} onClick={onBack} aria-label="Zurück">
          <BackIcon />
        </button>
        <div className={s.headTitle}>
          <span className={s.eyebrow}>Planung</span>
          <span className={s.title}>Projekte</span>
        </div>
      </div>

      <div className={s.sum}>{visible.length} Projekte · {openTodos} offene Todos</div>

      {creating ? (
        <form className={s.createForm} onSubmit={handleCreate}>
          <input
            className={s.createInput}
            placeholder="Projektname…"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <div className={s.palette}>
            {PROJEKT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={s.swatch}
                onClick={() => setColor(c)}
                aria-label={`Farbe ${c}`}
              >
                <span
                  className={s.swatchDot}
                  style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : 'none' }}
                />
              </button>
            ))}
          </div>
          <div className={s.formActions}>
            <button type="submit" className={s.submitBtn}>Erstellen</button>
            <button type="button" className={s.cancelBtn} onClick={() => { setCreating(false); setName('') }}>Abbrechen</button>
          </div>
        </form>
      ) : projects.length === 0 ? (
        <div className={s.emptyCard}>
          <span className={s.emptyTitle}>Noch keine Projekte</span>
          <p className={s.emptyText}>Ein Projekt bündelt Todos zu einem Thema — Einkauf, Urlaub, Balkon. Jedes bekommt automatisch eine eigene Farbe, die überall sichtbar ist.</p>
          <button className={s.emptyCta} onClick={startCreate}>+ Erstes Projekt</button>
        </div>
      ) : (
        <button className={s.cta} onClick={startCreate}>+ Neues Projekt</button>
      )}

      {visible.map(p => (
        <ProjektKarte key={p.id} project={p} onOpenMenu={setMenuProject} />
      ))}

      {hidden.length > 0 && (
        <>
          <button className={s.hiddenToggle} onClick={() => setShowHidden(v => !v)}>
            <ChevronIcon open={showHidden} />
            Ausgeblendet ({hidden.length})
          </button>
          {showHidden && hidden.map(p => (
            <ProjektKarte key={p.id} project={p} onOpenMenu={setMenuProject} />
          ))}
        </>
      )}

      {menuProject && (
        <ProjektMenuSheet
          project={menuProject}
          onDissolve={handleDissolve}
          onClose={() => setMenuProject(null)}
        />
      )}
    </div>
  )
}
