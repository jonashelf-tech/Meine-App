import { useState, useCallback, useMemo, useEffect } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { todayKey } from '../../../utils'
import { lv, sv, SK } from '../../../storage'
import { sortTodos, getActiveTodos } from '../poolLogic'
import s from './Pool.module.css'

// ─── Icons ────────────────────────────────────────────────
const DragIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

const PlacedIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
    <polyline points="9 14 4 9 9 4"/>
    <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
  </svg>
)

const ChevronIcon = ({ collapsed }) => (
  <svg
    width="10" height="10" viewBox="0 0 10 10"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s ease' }}
  >
    <polyline points="2 3 5 7 8 3"/>
  </svg>
)

const FolderIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)

// ─── PoolChip ─────────────────────────────────────────────
function PoolChip({ todo, todos, setTodos, onToggleDone, onEdit, startDrag, isPlaced, onKlaeren }) {
  const [doneFlash, setDoneFlash] = useState(false)

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    if (todo.done) {
      setDoneFlash(true)
      setTimeout(() => setDoneFlash(false), 500)
      return
    }
    // Farbe roh durchreichen: null = Standard (Akzent) — kein Hex einbrennen
    startDrag?.(todo.id, todo.text, todo.color ?? null, todo.duration, e)
  }, [todo, startDrag])

  const handle = (
    <span
      className={[s.handle, doneFlash ? s.handleDoneFlash : ''].join(' ')}
      onPointerDown={handlePointerDown}
      data-drag-handle="true"
      aria-label="Ziehen"
      style={todo.done ? { cursor: 'not-allowed' } : undefined}
    >
      {isPlaced ? PlacedIcon : DragIcon}
    </span>
  )

  return (
    <TodoChip
      todo={todo}
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      todos={todos}
      saveTodos={setTodos}
      dragHandle={handle}
      showAge
      onKlaeren={onKlaeren}
      pausable
    />
  )
}

// ─── Pool ─────────────────────────────────────────────────
export default function Pool({
  todos = [],
  setTodos,
  todaySlots = {},
  viewDate,
  excludeDate = null,   // Listenmodus: zeitlose Todos dieses Tages stehen dort oben in der Liste
  onToggleDone,
  onEdit,
  startDrag,
  onDoneCalendar,
  onKlaeren,        // fn(todo) — opens Klären dialog; wired up when Klären-Tool is built
  registerHalf,
  projects = [],
  onOpenProjekte,
}) {
  const [collapsed,      setCollapsed]      = useState(false)
  const [sort,           setSort]           = useState(() => {
    const s = lv(SK.poolSort, 'standard')
    return s === 'kategorie' ? 'projekt' : s
  })
  const [showAll,        setShowAll]        = useState(false)

  const handleSort = useCallback((key) => {
    setSort(key)
    sv(SK.poolSort, key)
  }, [])
  const [pendingDoneIds, setPendingDoneIds] = useState(() => new Set())

  // ─── Placed detection (für „verplant"-Icon) ─────────────
  const isPlaced = useMemo(() => {
    const slotValues  = Object.values(todaySlots).filter(Boolean)
    const placedIds   = new Set(slotValues.map(sl => sl.todoId).filter(Boolean))
    const placedTexts = new Set(slotValues.filter(sl => !sl.todoId).map(sl => sl.text).filter(Boolean))
    const counts = {}
    todos.forEach(t => { counts[t.text] = (counts[t.text] || 0) + 1 })
    const uniqueTexts = new Set(Object.keys(counts).filter(txt => counts[txt] === 1))
    return (t) => placedIds.has(t.id) || (uniqueTexts.has(t.text) && placedTexts.has(t.text))
  }, [todos, todaySlots])

  // ─── Derived lists ──────────────────────────────────────
  const activePool = useMemo(() => {
    const undone  = sortTodos(getActiveTodos(todos, todaySlots, excludeDate), sort, projects)
    const pending = todos.filter(t => t.done && pendingDoneIds.has(t.id))
    return [...undone, ...pending]
  }, [todos, todaySlots, excludeDate, pendingDoneIds, sort, projects])

  const doneCount = useMemo(() => {
    const today = todayKey()
    return todos.filter(t => t.done && t.doneAt?.startsWith(today)).length
  }, [todos])

  // ─── Endzeit-Projektion: „wenn du jetzt startest, bist du um X fertig" ──
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const projection = useMemo(() => {
    const open    = activePool.filter(t => !t.done)
    const withDur = open.filter(t => t.duration)
    const total   = withDur.reduce((sum, t) => sum + t.duration, 0)
    if (!total) return null
    const end = new Date(Date.now() + total * 60000)
    const hh  = String(end.getHours()).padStart(2, '0')
    const mm  = String(end.getMinutes()).padStart(2, '0')
    const dur = total >= 60
      ? `${Math.floor(total / 60)} h${total % 60 ? ` ${total % 60} min` : ''}`
      : `${total} min`
    return { dur, end: `${hh}:${mm}`, noDur: open.length - withDur.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePool, tick])

  const visiblePool = showAll ? activePool : activePool.slice(0, 10)
  const hasMore     = !showAll && activePool.length > 10

  // ─── Auto-Fade: erledigtes Todo bleibt als Bestätigung sichtbar,
  //     fällt bei nächster Interaktion raus (anderes Todo haken = unten,
  //     Tag wechseln = dieser Effekt, Tab verlassen = unmount) ───────
  useEffect(() => {
    setPendingDoneIds(prev => prev.size ? new Set() : prev)
  }, [viewDate])

  // ─── Handlers ───────────────────────────────────────────
  const handleToggle = useCallback((id) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    if (!todo.done) {
      // nur das zuletzt abgehakte bleibt liegen — vorheriges fadet weg
      setPendingDoneIds(new Set([id]))
    } else {
      setPendingDoneIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
    onToggleDone?.(id)
  }, [todos, onToggleDone])

  // ─── Gruppen-Key für Sortierung 'projekt' ──────────────
  const groupKey = (t) => {
    if (!t.projectId) return null
    return projects.some(p => p.id === t.projectId) ? t.projectId : null
  }

  // ─── Render chip ────────────────────────────────────────
  const renderChip = (t) => (
    <PoolChip
      key={t.id}
      todo={t}
      todos={todos}
      setTodos={setTodos}
      onToggleDone={() => handleToggle(t.id)}
      onEdit={() => onEdit?.(t.id)}
      startDrag={startDrag}
      isPlaced={isPlaced(t)}
      onKlaeren={onKlaeren}
    />
  )

  return (
    <div
      className={s.pool}
      ref={el => registerHalf?.('pool', el, 'empty')}
    >

      {/* ── Header ────────────────────────────────────── */}
      <div
        className={s.header}
        onClick={() => setCollapsed(v => !v)}
        role="button"
        aria-expanded={!collapsed}
      >
        <span className={s.poolLabel}>Todos</span>

        {collapsed && activePool.length > 0 && (
          <span className={s.countBadge}>{activePool.length} offen</span>
        )}

        {!collapsed && (
          <div className={s.sortRow} onClick={e => e.stopPropagation()}>
            {[
              { key: 'standard', label: 'Standard' },
              { key: 'projekt',  label: 'Projekt'   },
              { key: 'alter',    label: 'Alter'     },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={[s.sortChip, sort === key ? s.sortChipActive : ''].join(' ')}
                onClick={() => handleSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {!collapsed && (
          <button
            className={s.projBtn}
            onClick={(e) => { e.stopPropagation(); onOpenProjekte?.() }}
            aria-label="Projekte verwalten"
          >
            {FolderIcon}
            <span className={s.projBtnLabel}>Projekte</span>
            <span className={s.projBtnCount}>{projects.filter(p => !p.hidden).length}</span>
          </button>
        )}

        <span className={s.chevron}><ChevronIcon collapsed={collapsed} /></span>
      </div>

      {!collapsed && (
        <>
          {projection && (
            <div className={s.projection}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>
                {projection.dur} offen · fertig ~{projection.end}
                {projection.noDur > 0 && <span className={s.projectionDim}> · +{projection.noDur} ohne Dauer</span>}
              </span>
            </div>
          )}

          {/* ── Aktive Liste ──────────────────────────── */}
          <div className={s.listArea}>
            {activePool.length === 0 && (
              <p className={s.empty}>
                {todos.length === 0
                  ? 'Über + legst du deine erste Aufgabe an.'
                  : 'Alle Todos verplant ✓'}
              </p>
            )}

            {sort === 'projekt'
              ? (() => {
                  const rows = []
                  let last
                  let started = false
                  visiblePool.forEach(t => {
                    const key = groupKey(t)
                    if (!started || key !== last) {
                      started = true
                      last = key
                      const proj = key ? projects.find(p => p.id === key) : null
                      const count = visiblePool.filter(x => groupKey(x) === key).length
                      rows.push(
                        <div key={`h-${key ?? 'ohne'}`} className={s.groupHead}>
                          <span className={s.groupDot} style={{ background: proj ? proj.color : undefined }} />
                          {proj?.name ?? 'Ohne Projekt'}
                          <span className={s.groupCount}>{count}</span>
                        </div>
                      )
                    }
                    rows.push(renderChip(t))
                  })
                  return rows
                })()
              : visiblePool.map(renderChip)}

            {hasMore && (
              <button className={s.expandMore} onClick={() => setShowAll(true)}>
                Weitere anzeigen
                <span className={s.expandCount}>+{activePool.length - 10}</span>
                ▾
              </button>
            )}
          </div>

          {/* ── Kalender-Link ─────────────────────────── */}
          {doneCount > 0 && (
            <button className={s.calLink} onClick={onDoneCalendar}>
              {doneCount} erledigt · <span className={s.calLinkAccent}>Kalender →</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}
