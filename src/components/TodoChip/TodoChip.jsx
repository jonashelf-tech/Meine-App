import { useState } from 'react'
import PrioBadge from '../PrioBadge/PrioBadge'
import { useDoubleTap } from '../../hooks/useDoubleTap'
import { isFaelligkeit } from '../../features/todos/Block'
import s from './TodoChip.module.css'

function fmtDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`
}

export default function TodoChip({
  todo,
  onToggleDone,
  onEdit,
  onRemove,
  dragHandle,
  naturalHeight,
  floatExpand,
  disableExpand,
  onSubItemToggle,
  className,
}) {
  const [expanded, setExpanded] = useState(false)

  const handleTap = useDoubleTap(
    onToggleDone ? () => onToggleDone() : undefined,
    onEdit       ? () => onEdit()       : undefined,
  )

  const hasSubItems = todo.subItems?.length > 0
  const showExpand  = hasSubItems && !disableExpand

  const doneCount  = todo.subItems?.filter(si => si.done)?.length ?? 0
  const totalCount = todo.subItems?.length ?? 0

  const rootStyle = {
    '--chip-color': todo.color || '#00CFFF',
    ...(naturalHeight != null ? { height: naturalHeight + 'px' } : {}),
  }

  return (
    <div
      className={[s.chip, todo.done ? s.done : '', className || ''].join(' ').trim()}
      style={rootStyle}
    >
      {/* Stripe */}
      <span className={s.stripe} />

      {/* Expand button */}
      {showExpand && (
        <button
          className={[s.expandBtn, floatExpand ? s.float : ''].join(' ').trim()}
          onClick={() => setExpanded(v => !v)}
          aria-label={expanded ? 'Zuklappen' : 'Aufklappen'}
        >
          <span className={s.expandCount}>{doneCount}/{totalCount}</span>
          <span className={s.expandArrow}>{expanded ? '▴' : '▾'}</span>
        </button>
      )}

      {/* Body */}
      <div
        className={s.body}
        onPointerUp={handleTap}
        style={naturalHeight != null ? { overflow: 'hidden' } : {}}
      >
        <span className={[s.text, todo.done ? s.textDone : ''].join(' ').trim()}>
          {todo.text || <span className={s.empty}>Kein Text</span>}
        </span>

        {/* Meta row */}
        {(isFaelligkeit(todo) || todo.category) && (
          <div className={s.meta}>
            {isFaelligkeit(todo) && (
              <span className={s.metaDate}>{fmtDateShort(todo.date)}</span>
            )}
            {todo.category && (
              <span className={s.metaCat}>#{todo.category}</span>
            )}
          </div>
        )}

        {/* Sub-items (expanded) */}
        {expanded && hasSubItems && (
          <ul className={s.subList}>
            {todo.subItems.map((si, idx) => (
              <li
                key={idx}
                className={[s.subItem, si.done ? s.subDone : ''].join(' ').trim()}
                onPointerUp={() => onSubItemToggle?.(idx)}
              >
                <span className={s.subCheck}>{si.done ? '✓' : '○'}</span>
                <span className={s.subText}>{si.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Prio badge */}
      <PrioBadge priority={todo.priority} />

      {/* Remove button */}
      {onRemove && (
        <button
          className={s.removeBtn}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          aria-label="Entfernen"
        >
          ✕
        </button>
      )}

      {/* Drag handle */}
      {dragHandle && (
        <span className={s.dragHandleWrapper}>{dragHandle}</span>
      )}
    </div>
  )
}
