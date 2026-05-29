// src/features/tools/projekte/ProjektKarte.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getProjectTodos, getProgress, isTodoActive, closeProject, deleteProject } from './projektUtils'
import ProjektQuickAdd from './ProjektQuickAdd'
import s from './ProjektKarte.module.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  return `${parseInt(day)}. ${months[parseInt(month) - 1]}`
}

const MenuIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
)

const CheckIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const ChevronIcon = ({ up }) => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

export default function ProjektKarte({ project, todos, setTodos, cats, setCats, projects, setProjects }) {
  const { id: projectId, catName, autoDelete } = project

  const [menuOpen,      setMenuOpen]      = useState(false)
  const [doneCollapsed, setDoneCollapsed] = useState(true)
  const [closing,       setClosing]       = useState(false)

  // Ref für aktuelle Werte in setTimeout (vermeidet stale closures)
  const latestRef = useRef({})
  latestRef.current = { catName, cats, projects, setTodos, setCats, setProjects }

  const projectTodos = useMemo(() => getProjectTodos(todos, catName), [todos, catName])
  const activeTodos  = useMemo(() => projectTodos.filter(t => !t.done &&  isTodoActive(t)), [projectTodos])
  const futureTodos  = useMemo(() => projectTodos.filter(t => !t.done && !isTodoActive(t)), [projectTodos])
  const doneTodos    = useMemo(() => projectTodos.filter(t => t.done),                      [projectTodos])

  const { done, total } = useMemo(() => getProgress(projectTodos), [projectTodos])
  const allDone = total > 0 && activeTodos.length === 0 && futureTodos.length === 0
  const pct     = total === 0 ? 0 : Math.round((done / total) * 100)

  // Auto-delete wenn alle Todos erledigt
  useEffect(() => {
    if (!allDone || !autoDelete || closing) return
    setClosing(true)
    const timer = setTimeout(() => {
      const r = latestRef.current
      closeProject({ catName: r.catName, cats: r.cats, projects: r.projects, setTodos: r.setTodos, setCats: r.setCats, setProjects: r.setProjects })
    }, 1200)
    return () => clearTimeout(timer)
  }, [allDone, autoDelete, closing])

  const handleToggle = useCallback((todoId) => {
    setTodos(prev => prev.map(t =>
      t.id === todoId
        ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null }
        : t
    ))
  }, [setTodos])

  const handleAdd = useCallback((block) => {
    setTodos(prev => [...prev, block])
  }, [setTodos])

  const handleHide = useCallback(() => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, hidden: !p.hidden } : p))
    setMenuOpen(false)
  }, [projects, projectId, setProjects])

  const handleAutoDeleteToggle = useCallback(() => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, autoDelete: !p.autoDelete } : p))
    setMenuOpen(false)
  }, [projects, projectId, setProjects])

  const handleClose = useCallback(() => {
    setMenuOpen(false)
    closeProject({ catName, cats, projects, setTodos, setCats, setProjects })
  }, [catName, cats, projects, setTodos, setCats, setProjects])

  const handleDelete = useCallback(() => {
    setMenuOpen(false)
    deleteProject({ catName, projects, setProjects })
  }, [catName, projects, setProjects])

  return (
    <div className={[s.card, closing ? s.cardClosing : ''].join(' ')}>

      {/* Header */}
      <div className={s.header}>
        <span className={s.title}>{catName}</span>
        <button className={s.menuBtn} onClick={() => setMenuOpen(v => !v)} aria-label="Menü">
          <MenuIcon />
        </button>
      </div>

      {/* Kontextmenü */}
      {menuOpen && (
        <>
          <div className={s.menuOverlay} onClick={() => setMenuOpen(false)} />
          <div className={s.menu}>
            <button className={s.menuItem} onClick={handleHide}>
              {project.hidden ? 'Einblenden' : 'Ausblenden'}
            </button>
            <button className={s.menuItem} onClick={handleAutoDeleteToggle}>
              Auto-Abschluss: {autoDelete ? 'An ✓' : 'Aus'}
            </button>
            <button className={s.menuItem} onClick={handleClose}>
              Projekt abschließen
            </button>
            <button className={[s.menuItem, s.menuItemDanger].join(' ')} onClick={handleDelete}>
              Aus Projekten entfernen
            </button>
          </div>
        </>
      )}

      {/* Fortschrittsbalken */}
      <div className={s.progressRow}>
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={s.progressLabel}>{done}/{total}</span>
      </div>

      {/* Abschluss-Banner */}
      {allDone && !autoDelete && !closing && (
        <div className={s.doneBanner}>
          <span>Alle Todos erledigt!</span>
          <button className={s.closeProjBtn} onClick={handleClose}>Abschließen</button>
        </div>
      )}
      {closing && (
        <div className={s.doneBanner}>
          <span>Wird abgeschlossen…</span>
        </div>
      )}

      {/* Todo-Liste */}
      <div className={s.todoList}>

        {/* Aktive Todos */}
        {activeTodos.map(t => (
          <button key={t.id} className={s.todoRow} onClick={() => handleToggle(t.id)}>
            <span className={s.checkbox} />
            <span className={s.todoText}>{t.text}</span>
          </button>
        ))}

        {/* Geplante Todos (ausgegraut) */}
        {futureTodos.map(t => (
          <div key={t.id} className={s.todoRowFuture}>
            <span className={s.checkbox} />
            <span className={s.todoTextFuture}>{t.text}</span>
            <span className={s.futureBadge}>ab {formatDate(t.showFromDate)}</span>
          </div>
        ))}

        {/* Erledigte Todos (eingeklappt) */}
        {doneTodos.length > 0 && (
          <div className={s.doneSection}>
            <button
              className={s.doneSectionBtn}
              onClick={() => setDoneCollapsed(v => !v)}
            >
              <ChevronIcon up={!doneCollapsed} />
              {doneTodos.length} erledigt
            </button>
            {!doneCollapsed && doneTodos.map(t => (
              <button key={t.id} className={s.todoRow} onClick={() => handleToggle(t.id)}>
                <span className={[s.checkbox, s.checkboxDone].join(' ')}>
                  <CheckIcon />
                </span>
                <span className={[s.todoText, s.todoTextDone].join(' ')}>{t.text}</span>
              </button>
            ))}
          </div>
        )}

        {projectTodos.length === 0 && (
          <p className={s.emptyHint}>Noch keine Todos — füge welche hinzu</p>
        )}
      </div>

      {/* QuickAdd */}
      <ProjektQuickAdd catName={catName} onAdd={handleAdd} />
    </div>
  )
}
