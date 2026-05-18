import { useState, useCallback } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { isFaelligkeit } from '../../todos/Block'
import s from './Pool.module.css'

// ─── PoolChip ─────────────────────────────────────────────
function PoolChip({ todo, onToggleDone, onEdit, onRemove, onDragStart, onSubItemToggle }) {
  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    onDragStart?.(todo.text, todo.color, todo.id, todo.duration)
  }, [todo, onDragStart])

  const handle = (
    <span
      className={s.handle}
      onPointerDown={handlePointerDown}
      aria-label="Ziehen"
    >
      ⠿
    </span>
  )

  return (
    <TodoChip
      todo={todo}
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onRemove={onRemove}
      dragHandle={handle}
      onSubItemToggle={onSubItemToggle}
    />
  )
}

// ─── Pool ─────────────────────────────────────────────────
export default function Pool({
  todos = [],
  todaySlots = {},
  onToggleDone,
  onEdit,
  onRemove,
  onDragStart,
  onSubItemToggle,
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
      onToggleDone={() => onToggleDone?.(t.id)}
      onEdit={() => onEdit?.(t.id)}
      onRemove={() => onRemove?.(t.id)}
      onDragStart={onDragStart}
      onSubItemToggle={(idx) => onSubItemToggle?.(t.id, idx)}
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
