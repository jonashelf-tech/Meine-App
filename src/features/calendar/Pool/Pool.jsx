import { useState, useCallback } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { isFaelligkeit } from '../../todos/Block'
import s from './Pool.module.css'

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

// ─── PoolChip ─────────────────────────────────────────────
function PoolChip({ todo, todos, setTodos, onToggleDone, onEdit, onRemove, startDrag, isPlaced }) {
  const color = todo.color || '#00CFFF'

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
      {isPlaced
        ? <span className={s.placedIcon}>↩</span>
        : DragIcon
      }
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
}) {
  const [fullscreen, setFullscreen] = useState(false)

  const placedTexts = new Set(
    Object.values(todaySlots).filter(Boolean).map(sl => sl.text).filter(Boolean)
  )
  const placedIds = new Set(
    Object.values(todaySlots).filter(Boolean).map(sl => sl.todoId).filter(Boolean)
  )

  const isPlaced = (t) => placedIds.has(t.id) || placedTexts.has(t.text)

  const pool1 = todos.filter(
    t => !t.done && (t.priority === 1 || isFaelligkeit(t)) && !isPlaced(t)
  )
  const pool2 = todos.filter(
    t => !t.done && !(t.priority === 1 || isFaelligkeit(t)) && !isPlaced(t)
  )

  const renderChip = (t) => (
    <PoolChip
      key={t.id}
      todo={t}
      todos={todos}
      setTodos={setTodos}
      onToggleDone={() => onToggleDone?.(t.id)}
      onEdit={() => onEdit?.(t.id)}
      onRemove={() => onRemove?.(t.id)}
      startDrag={startDrag}
      isPlaced={isPlaced(t)}
    />
  )

  const content = (
    <>
      <div className={s.header}>
        <span className={s.poolLabel}>Pool</span>
        <button
          className={s.fullscreenBtn}
          onClick={() => setFullscreen(v => !v)}
          aria-label={fullscreen ? 'Vollbild schließen' : 'Vollbild öffnen'}
        >
          {fullscreen ? '✕' : '⤢'}
        </button>
      </div>

      <details className={s.group} open>
        <summary className={s.groupHeader}>
          <span className={s.groupLabel}>Heute relevant</span>
          <span className={s.groupCount}>{pool1.length}</span>
        </summary>
        <div className={s.groupItems}>
          {pool1.length === 0
            ? <p className={s.empty}>Alles verplant ✓</p>
            : pool1.map(renderChip)
          }
        </div>
      </details>

      <details className={s.group}>
        <summary className={s.groupHeader}>
          <span className={s.groupLabel}>Offen</span>
          <span className={s.groupCount}>{pool2.length}</span>
        </summary>
        <div className={s.groupItems}>
          {pool2.length === 0
            ? <p className={s.empty}>Kein weiteres Todo</p>
            : pool2.map(renderChip)
          }
        </div>
      </details>
    </>
  )

  if (fullscreen) {
    return <div className={s.overlay}>{content}</div>
  }

  return <div className={s.pool}>{content}</div>
}
