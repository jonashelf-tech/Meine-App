import { useState, useRef, useCallback } from 'react'
import PrioBadge from '../PrioBadge/PrioBadge'
import { useDoubleTap } from '../../hooks/useDoubleTap'
import { isFaelligkeit, isTermin } from '../../features/todos/Block'
import s from './TodoChip.module.css'

function fmtDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`
}

export default function TodoChip({
  todo,
  onToggleDone,       // fn() — toggle done
  onEdit,             // fn() — open edit modal
  onRemove,           // fn() — delete
  todos,              // full todos array — for sub-item save
  saveTodos,          // setTodos fn — for sub-item save
  saveItem,           // fn(upd) — alternative save when no todo (e.g. slot)
  dragHandle,         // JSX — rendered at right edge
  chipStyle,          // extra inline styles for the chip div
  floatExpand,        // true = sub-items as floating overlay (SlotBlock)
  disableExpand,      // true = hide expand btn + sub-items entirely
  onExpandedChange,   // fn(isExpanded, extraPx)
  className,
}) {
  const [expanded, setExpanded]   = useState(false)
  const [itemInput, setItemInput] = useState('')
  const [flashing, setFlashing]   = useState(false)
  const [subDragOver, setSubDragOver] = useState(null)
  const itemRef    = useRef(null)
  const itemsWrapRef = useRef(null)
  const subDragRef = useRef({ from: null, over: null })

  const allItems = todo.subItems || []
  const doneItems = allItems.filter(si => si.done).length

  // ── Done flash ──────────────────────────────────────────
  const handleSingle = useCallback(() => {
    if (!todo.done) { setFlashing(true); setTimeout(() => setFlashing(false), 650) }
    onToggleDone?.()
  }, [todo.done, onToggleDone])

  const handleDouble = useCallback(() => onEdit?.(), [onEdit])
  const tapHandler   = useDoubleTap(handleSingle, handleDouble)

  // ── Sub-item mutations ──────────────────────────────────
  const updateTodo = useCallback((upd) => {
    if (saveItem) { saveItem(upd); return }
    if (!saveTodos || !todos) return
    saveTodos(todos.map(x => x.id === todo.id ? upd : x))
  }, [saveItem, todo.id, todos, saveTodos])

  const toggleItem = useCallback((id) => {
    updateTodo({ ...todo, subItems: allItems.map(si => si.id === id ? { ...si, done: !si.done } : si) })
  }, [todo, allItems, updateTodo])

  const removeItem = useCallback((id) => {
    updateTodo({ ...todo, subItems: allItems.filter(si => si.id !== id) })
  }, [todo, allItems, updateTodo])

  const addItem = useCallback(() => {
    const txt = itemInput.trim(); if (!txt) return
    updateTodo({ ...todo, subItems: [...allItems, { id: Date.now(), text: txt, done: false }] })
    setItemInput(''); itemRef.current?.focus()
  }, [todo, allItems, itemInput, updateTodo])

  // ── Sub-item drag-to-reorder ────────────────────────────
  const startSubDrag = useCallback((fromIdx, e) => {
    e.stopPropagation(); e.preventDefault()
    subDragRef.current = { from: fromIdx, over: fromIdx }
    const mv = (me) => {
      const y = me.touches ? me.touches[0].clientY : me.clientY
      const wrap = itemsWrapRef.current; if (!wrap) return
      const rows = wrap.querySelectorAll('[data-sub-row]')
      let closest = subDragRef.current.from, closestDist = Infinity
      rows.forEach((el, idx) => {
        const rc  = el.getBoundingClientRect()
        const mid = rc.top + rc.height / 2
        const dist = Math.abs(y - mid)
        if (dist < closestDist) { closestDist = dist; closest = idx }
      })
      if (closest !== subDragRef.current.over) {
        subDragRef.current.over = closest; setSubDragOver(closest)
      }
    }
    const up = () => {
      const { from, over } = subDragRef.current
      if (from !== null && over !== null && from !== over) {
        const ni = [...allItems]
        const [moved] = ni.splice(from, 1)
        ni.splice(over, 0, moved)
        updateTodo({ ...todo, subItems: ni })
      }
      subDragRef.current = { from: null, over: null }; setSubDragOver(null)
      document.removeEventListener('pointermove', mv)
      document.removeEventListener('pointerup', up)
    }
    document.addEventListener('pointermove', mv, { passive: false })
    document.addEventListener('pointerup', up)
  }, [allItems, todo, updateTodo])


  const color = todo.color || '#8B5CF6'

  const metaParts = [
    todo.category,
    isTermin(todo)     ? `${fmtDateShort(todo.date)} ${todo.time}` : null,
    isFaelligkeit(todo) ? fmtDateShort(todo.date)                  : null,
    todo.duration && todo.duration > 2 ? todo.duration + 'min'     : null,
  ].filter(Boolean)

  return (
    <>
      {floatExpand && expanded && !disableExpand && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          onClick={() => { setExpanded(false); onExpandedChange?.(false, 0) }}
        />
      )}
      <div
        className={s.rowWrap}
        style={floatExpand ? { position: 'relative', zIndex: expanded ? 51 : undefined } : {}}
      >

      {/* ── Chip ──────────────────────────────────── */}
      <div
        className={[
          s.chip,
          flashing  ? s.doneFlash : '',
          todo.done ? s.chipDone  : '',
          className || ''
        ].join(' ').trim()}
        style={{ '--chip-color': todo.done ? 'rgba(0,255,148,0.15)' : color, ...(chipStyle || {}) }}
      >
        {/* Stripe */}
        <span className={s.stripe} />

        {/* Expand button */}
        {!disableExpand && (
          <button
            data-expand-btn
            className={s.expandBtn}
            onClick={e => {
              e.stopPropagation()
              setExpanded(p => {
                const n = !p
                const extraPx = n ? (28 + allItems.length * 34 + 46) : 0
                onExpandedChange?.(n, extraPx)
                return n
              })
            }}
          >
            <span className={s.expandArr}>{expanded ? '▾' : '▸'}</span>
            {!todo.done && (
              <span className={[
                s.expandCount,
                allItems.length > 0 && doneItems === allItems.length ? s.expandCountDone : ''
              ].join(' ')}>
                {doneItems}/{allItems.length}
              </span>
            )}
          </button>
        )}

        {/* Body — single/double tap */}
        <div className={s.body} onClick={tapHandler}>
          <span className={s.text}>
            {todo.text || <span className={s.emptyText}>Kein Text</span>}
            {todo.duration && todo.duration <= 2 && (
              <span className={s.quickBadge}>⚡</span>
            )}
          </span>
          {metaParts.length > 0 && (
            <span className={s.meta}>{metaParts.join(' · ')}</span>
          )}
        </div>

        {/* Remove */}
        {onRemove && (
          <button
            className={s.removeBtn}
            onClick={e => { e.stopPropagation(); onRemove() }}
          >✕</button>
        )}

        {/* PrioBadge */}
        <PrioBadge priority={todo.priority} />

        {/* Drag handle — passed in as JSX */}
        {dragHandle}
      </div>

      {/* ── Sub-items (sibling, outside chip) ─────── */}
      {!disableExpand && expanded && (
        <div
          ref={itemsWrapRef}
          className={s.itemsWrap}
          onClick={e => e.stopPropagation()}
          style={{
            '--chip-color': color,
            ...(floatExpand ? {
              position:     'absolute',
              top:          '100%',
              left:         0,
              right:        0,
              zIndex:       50,
              borderRadius: '0 0 10px 10px',
              maxHeight:    '60vh',
              overflowY:    'auto',
              boxShadow:    '0 8px 24px rgba(0,0,0,0.6)',
              border:       `1px solid ${color}44`,
              borderTop:    'none',
            } : {})
          }}
        >
          {/* Header */}
          {!floatExpand && <div className={s.itemsHeader}>{todo.text}</div>}

          {/* Rows */}
          {allItems.map((item, idx) => (
            <div
              key={item.id}
              data-sub-row
              className={[
                s.itemRow,
                item.done      ? s.itemDone     : '',
                subDragOver === idx ? s.itemDragOver : ''
              ].join(' ').trim()}
            >
              <div
                className={[s.itemCheck, item.done ? s.itemCheckDone : ''].join(' ')}
                onClick={() => toggleItem(item.id)}
              >
                {item.done ? '✓' : ''}
              </div>
              <span className={s.itemText} onClick={() => toggleItem(item.id)}>
                {item.text}
              </span>
              <button
                className={s.itemRm}
                onClick={e => { e.stopPropagation(); removeItem(item.id) }}
              >✕</button>
              <span
                className={s.itemDragHandle}
                onPointerDown={e => startSubDrag(idx, e)}
              >⠿</span>
            </div>
          ))}

          {/* Add row */}
          <div className={s.itemAddRow}>
            <input
              ref={itemRef}
              className={s.itemInput}
              placeholder="Punkt hinzufügen…"
              value={itemInput}
              onChange={e => setItemInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  addItem()
                if (e.key === 'Escape') setExpanded(false)
              }}
              onClick={e => e.stopPropagation()}
            />
            <button
              className={s.itemAddBtn}
              onClick={e => { e.stopPropagation(); addItem() }}
            >+</button>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
