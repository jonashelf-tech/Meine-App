import { useState, useCallback, useMemo } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { isFaelligkeit, isTermin } from '../../todos/Block'
import { todayKey } from '../../../utils'
import { lv, sv, SK } from '../../../storage'
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

// ─── Sort ──────────────────────────────────────────────────
function sortTodos(list, sort) {
  if (sort === 'alter') {
    return [...list].sort((a, b) =>
      new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    )
  }
  if (sort === 'kategorie') {
    return [...list].sort((a, b) => {
      const ca = a.category || '￿'
      const cb = b.category || '￿'
      return ca.localeCompare(cb) || (a.priority - b.priority)
    })
  }
  // Standard: fällig (heute/vergangen) zuerst → prio → alter
  const today = todayKey()
  return [...list].sort((a, b) => {
    const fa = isFaelligkeit(a) && a.date <= today ? 0 : 1
    const fb = isFaelligkeit(b) && b.date <= today ? 0 : 1
    if (fa !== fb) return fa - fb
    if (a.priority !== b.priority) return a.priority - b.priority
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })
}

// ─── PoolChip ─────────────────────────────────────────────
function PoolChip({ todo, todos, setTodos, onToggleDone, onEdit, onRemove, startDrag, isPlaced, onKlaeren }) {
  const color = todo.color || '#8B5CF6'

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    startDrag?.(todo.id, todo.text, color, todo.duration, e)
  }, [todo, color, startDrag])

  const handle = (
    <span
      className={s.handle}
      onPointerDown={handlePointerDown}
      aria-label="Ziehen"
    >
      {isPlaced ? PlacedIcon : DragIcon}
    </span>
  )

  return (
    <TodoChip
      todo={todo}
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onRemove={onRemove}
      todos={todos}
      saveTodos={setTodos}
      dragHandle={handle}
      showAge
      onKlaeren={onKlaeren}
    />
  )
}

// ─── Pool ─────────────────────────────────────────────────
export default function Pool({
  todos = [],
  setTodos,
  todaySlots = {},
  onToggleDone,
  onEdit,
  onRemove,
  startDrag,
  onDoneCalendar,
  onKlaeren,        // fn(todo) — opens Klären dialog; wired up when Klären-Tool is built
  registerHalf,
}) {
  const [collapsed,      setCollapsed]      = useState(false)
  const [sort,           setSort]           = useState(() => lv(SK.poolSort, 'standard'))
  const [showAll,        setShowAll]        = useState(false)
  const [confirmId,      setConfirmId]      = useState(null)

  const handleSort = useCallback((key) => {
    setSort(key)
    sv(SK.poolSort, key)
  }, [])
  const [pendingDoneIds, setPendingDoneIds] = useState(() => new Set())

  // ─── Placed detection ───────────────────────────────────
  const { placedIds, placedTexts } = useMemo(() => {
    const slotValues = Object.values(todaySlots).filter(Boolean)
    return {
      placedIds:   new Set(slotValues.map(sl => sl.todoId).filter(Boolean)),
      placedTexts: new Set(slotValues.filter(sl => !sl.todoId).map(sl => sl.text).filter(Boolean)),
    }
  }, [todaySlots])

  // Text-Match nur wenn der Text unter allen Todos eindeutig ist (verhindert false positives bei Duplikaten)
  const uniqueTexts = useMemo(() => {
    const counts = {}
    todos.forEach(t => { counts[t.text] = (counts[t.text] || 0) + 1 })
    return new Set(Object.keys(counts).filter(txt => counts[txt] === 1))
  }, [todos])

  const isPlaced = useCallback(
    (t) => placedIds.has(t.id) || (uniqueTexts.has(t.text) && placedTexts.has(t.text)),
    [placedIds, placedTexts, uniqueTexts]
  )

  // ─── Derived lists ──────────────────────────────────────
  const activePool = useMemo(() => {
    const undone = todos.filter(t => !t.done).filter(t => !isTermin(t)).filter(t => !isPlaced(t))
    const pending = todos.filter(t => t.done && pendingDoneIds.has(t.id))
    return [...sortTodos(undone, sort), ...pending]
  }, [todos, pendingDoneIds, sort, isPlaced])

  const doneCount = useMemo(() => {
    const today = todayKey()
    return todos.filter(t =>
      t.done &&
      t.doneAt?.startsWith(today) &&
      !pendingDoneIds.has(t.id)
    ).length
  }, [todos, pendingDoneIds])

  const visiblePool = showAll ? activePool : activePool.slice(0, 10)
  const hasMore     = !showAll && activePool.length > 10

  // ─── Handlers ───────────────────────────────────────────
  const handleToggle = useCallback((id) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    if (!todo.done) {
      setPendingDoneIds(prev => new Set([...prev, id]))
    }
    onToggleDone?.(id)
  }, [todos, onToggleDone])

  const handleCleanup = useCallback(() => {
    setPendingDoneIds(new Set())
  }, [])

  // ─── Render chip ────────────────────────────────────────
  const renderChip = (t) => (
    <PoolChip
      key={t.id}
      todo={t}
      todos={todos}
      setTodos={setTodos}
      onToggleDone={() => handleToggle(t.id)}
      onEdit={() => onEdit?.(t.id)}
      onRemove={() => setConfirmId(t.id)}
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
              { key: 'standard',  label: 'Standard'  },
              { key: 'kategorie', label: 'Kategorie' },
              { key: 'alter',     label: 'Alter'     },
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

        <span className={s.chevron}><ChevronIcon collapsed={collapsed} /></span>
      </div>

      {!collapsed && (
        <>
          {/* ── Aktive Liste ──────────────────────────── */}
          <div className={s.listArea}>
            {activePool.length === 0 && (
              <p className={s.empty}>Alle Todos verplant ✓</p>
            )}

            {visiblePool.map(renderChip)}

            {hasMore && (
              <button className={s.expandMore} onClick={() => setShowAll(true)}>
                Weitere anzeigen
                <span className={s.expandCount}>+{activePool.length - 10}</span>
                ▾
              </button>
            )}

            {pendingDoneIds.size > 0 && (
              <div className={s.cleanupRow}>
                <button className={s.cleanupBtn} onClick={handleCleanup}>
                  ✓ Aufräumen
                  <span className={s.cleanupCount}>{pendingDoneIds.size}</span>
                </button>
              </div>
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

      {confirmId && (() => {
        const todo = todos.find(t => t.id === confirmId)
        return (
          <div className={s.dialogOverlay} onClick={() => setConfirmId(null)}>
            <div className={s.dialog} onClick={e => e.stopPropagation()}>
              <p className={s.dialogTitle}>"{todo?.text}"</p>
              <button
                className={s.dialogBtnDelete}
                onClick={() => { onRemove?.(confirmId); setConfirmId(null) }}
              >
                Löschen
              </button>
              <button className={s.dialogBtnCancel} onClick={() => setConfirmId(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
