// src/features/projekte/ProjektKarte.jsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '../../store'
import { dissolveProject } from './projektModel'
import { createBlock } from '../todos/Block'
import { todayKey } from '../../utils'
import s from './ProjektKarte.module.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  return `${parseInt(day)}. ${months[parseInt(month) - 1]}`
}

const MenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="5" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="19" cy="12" r="2" fill="currentColor" />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease)' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export default function ProjektKarte({ project, onOpenMenu }) {
  const { todos, setTodos, projects, setProjects } = useAppStore()

  const [doneCollapsed, setDoneCollapsed] = useState(true)
  const [closing, setClosing] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [showDateField, setShowDateField] = useState(false)
  const [quickDate, setQuickDate] = useState('')

  // Ref für aktuelle Werte im Auto-Abschluss-Timer (vermeidet stale closures) —
  // frische Store-Werte kommen zusätzlich direkt aus useAppStore.getState().
  const latestRef = useRef({})
  latestRef.current = { project }

  const projektTodos = useMemo(() => todos.filter(t => t.projectId === project.id), [todos, project.id])
  const aktive   = useMemo(() => projektTodos.filter(t => !t.done && (!t.showFromDate || t.showFromDate <= todayKey())), [projektTodos])
  const geplant  = useMemo(() => projektTodos.filter(t => !t.done && t.showFromDate && t.showFromDate > todayKey()), [projektTodos])
  const erledigt = useMemo(() => projektTodos.filter(t => t.done), [projektTodos])

  const total   = projektTodos.length
  const done    = erledigt.length
  const pct     = total === 0 ? 0 : Math.round((done / total) * 100)
  const allDone = total > 0 && aktive.length === 0 && geplant.length === 0

  // Auto-Abschluss: alle Todos erledigt + autoDelete an → nach 1200ms auflösen.
  useEffect(() => {
    if (!allDone || !project.autoDelete || closing) return
    setClosing(true)
    const timer = setTimeout(() => {
      const { projects: p, setProjects: sp, todos: t, setTodos: st } = useAppStore.getState()
      const out = dissolveProject({ projects: p, todos: t }, latestRef.current.project.id)
      sp(out.projects)
      st(out.todos)
    }, 1200)
    return () => clearTimeout(timer)
    // closing bewusst nicht in den Deps: es wird in diesem Effect selbst gesetzt —
    // als Dependency würde der eigene setClosing(true)-Aufruf den Effect sofort erneut
    // feuern (Cleanup räumt den gerade gesetzten Timer wieder ab, bevor er auslösen kann).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, project.autoDelete])

  const handleDissolve = () => {
    const out = dissolveProject({ projects, todos }, project.id)
    setProjects(out.projects)
    setTodos(out.todos)
  }

  const handleToggle = (id) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null } : t
    ))
  }

  const handleQuickSubmit = (e) => {
    e.preventDefault()
    const trimmed = quickText.trim()
    if (!trimmed) return
    setTodos(prev => [...prev, createBlock({
      text:         trimmed,
      projectId:    project.id,
      color:        project.color,
      showFromDate: showDateField && quickDate ? quickDate : null,
    })])
    setQuickText('')
    setQuickDate('')
    setShowDateField(false)
  }

  return (
    <div className={[s.card, closing ? s.cardClosing : ''].join(' ')} style={{ '--c': project.color }}>
      <div className={s.head}>
        <span className={s.dot} />
        <span className={s.name}>{project.name}</span>
        <button className={s.menuBtn} onClick={() => onOpenMenu(project)} aria-label="Projekt-Menü">
          <MenuIcon />
        </button>
      </div>

      <div className={s.progressRow}>
        <div className={s.track}><div className={s.fill} style={{ width: `${pct}%` }} /></div>
        <span className={s.count}>{done}/{total}</span>
      </div>

      <div className={s.chips}>
        <span className={s.chip}>{aktive.length} offen</span>
        {geplant.length > 0 && <span className={s.chip}>{geplant.length} geplant</span>}
        {erledigt.length > 0 && <span className={s.chip}>{erledigt.length} erledigt</span>}
      </div>

      {allDone && !project.autoDelete && !closing && (
        <div className={s.doneBanner}>
          <span>Alle Todos erledigt!</span>
          <button className={s.dissolveBtn} onClick={handleDissolve}>Auflösen</button>
        </div>
      )}
      {closing && (
        <div className={s.doneBanner}><span>Wird abgeschlossen…</span></div>
      )}

      {total > 0 ? (
        <div className={s.todoList}>
          {aktive.map(t => (
            <button key={t.id} className={s.todoRow} onClick={() => handleToggle(t.id)}>
              <span className={s.cbox} />
              <span className={s.todoText}>{t.text}</span>
            </button>
          ))}

          {geplant.map(t => (
            <div key={t.id} className={s.todoRowFuture}>
              <span className={s.cbox} />
              <span className={s.todoTextFuture}>{t.text}</span>
              <span className={s.futureBadge}>ab {formatDate(t.showFromDate)}</span>
            </div>
          ))}

          {erledigt.length > 0 && (
            <div className={s.doneSection}>
              <button className={s.doneToggle} onClick={() => setDoneCollapsed(v => !v)}>
                <ChevronIcon open={!doneCollapsed} />
                {erledigt.length} erledigt
              </button>
              {!doneCollapsed && erledigt.map(t => (
                <button key={t.id} className={s.todoRow} onClick={() => handleToggle(t.id)}>
                  <span className={[s.cbox, s.cboxDone].join(' ')}><CheckIcon /></span>
                  <span className={[s.todoText, s.todoTextDone].join(' ')}>{t.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className={s.emptyHint}>Noch keine Todos — füge welche hinzu</p>
      )}

      <form className={s.quickAdd} onSubmit={handleQuickSubmit}>
        <div className={s.quickRow}>
          <input
            className={s.quickInput}
            placeholder="Todo hinzufügen…"
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
          />
          <button type="submit" className={s.quickBtn} aria-label="Hinzufügen">
            <PlusIcon />
          </button>
        </div>
        <button type="button" className={s.dateToggle} onClick={() => setShowDateField(v => !v)}>
          {showDateField ? 'Datum entfernen' : 'Erst ab Datum anzeigen'}
        </button>
        {showDateField && (
          <input
            type="date"
            className={s.dateInput}
            value={quickDate}
            min={todayKey()}
            onChange={e => setQuickDate(e.target.value)}
          />
        )}
      </form>
    </div>
  )
}
