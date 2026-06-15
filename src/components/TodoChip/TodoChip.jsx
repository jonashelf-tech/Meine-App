import { useState, useRef, useCallback, useMemo } from 'react'
import PrioBadge from '../PrioBadge/PrioBadge'
import { useDoubleTap } from '../../hooks/useDoubleTap'
import { isFaelligkeit, isTermin } from '../../features/todos/Block'
import { useAppStore } from '../../store'
import s from './TodoChip.module.css'

const SubDragIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

const ProgressChevronIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 3 5 7 8 3"/>
  </svg>
)

function fmtDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`
}

function getAgeDays(createdAt) {
  if (!createdAt) return 0
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

function fmtAge(days) {
  if (days < 7)  return null
  if (days < 30) return `${days} T`
  if (days < 90) return `${Math.floor(days / 7)} Wo`
  return `${Math.floor(days / 30)} Mo`
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
  showAge,            // true = show age in meta (Pool only)
  onKlaeren,          // fn(todo) — opens Klären dialog for this todo (Pool only)
  onPlay,             // fn() — startet Fokus-Timer mit diesem Task (Zeitplan only)
}) {
  const [expanded, setExpanded]   = useState(false)
  const [itemInput, setItemInput] = useState('')
  const [flashing, setFlashing]   = useState(false)
  const [subDragOver, setSubDragOver] = useState(null)
  const itemRef    = useRef(null)
  const itemsWrapRef = useRef(null)
  const subDragRef = useRef({ from: null, over: null })

  const allItems = useMemo(() => todo.subItems || [], [todo.subItems])
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
    updateTodo({ ...todo, subItems: [...allItems, { id: crypto.randomUUID(), text: txt, done: false }] })
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

  // ── Expand/collapse sub-items ────────────────────────────
  const toggleExpanded = useCallback(() => {
    setExpanded(p => {
      const n = !p
      const extraPx = n ? (28 + allItems.length * 34 + 46) : 0
      onExpandedChange?.(n, extraPx)
      return n
    })
  }, [allItems.length, onExpandedChange])

  const { klaerenSettings } = useAppStore()
  const threshold = klaerenSettings?.threshold ?? 7
  const ageColor  = klaerenSettings?.ageColor  ?? '#FB923C'
  const color     = todo.color || '#8B5CF6'

  const ageDays   = (showAge || !!onKlaeren) ? getAgeDays(todo.createdAt) : 0
  const ageLabel  = showAge ? fmtAge(ageDays) : null
  const isOld     = ageDays >= threshold

  const timeLabel = [
    isTermin(todo) ? todo.time : null,
    todo.duration  ? `${todo.duration}m` : null,
  ].filter(Boolean).join(' · ')

  const metaParts = [
    todo.category,
    isTermin(todo)      ? fmtDateShort(todo.date) : null,
    isFaelligkeit(todo) ? fmtDateShort(todo.date) : null,
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
        data-todochip="true"
        className={[
          s.chip,
          flashing  ? s.doneFlash : '',
          todo.done ? s.chipDone  : '',
          !todo.done && isOld ? s.chipOld : '',
          !floatExpand && expanded ? s.chipExpanded : '',
          className || ''
        ].join(' ').trim()}
        style={{
          '--chip-color': todo.done ? 'rgba(0,255,148,0.15)' : color,
          '--age-color': ageColor,
          ...(chipStyle || {}),
        }}
      >
        <span className={s.stripe} />

        {/* Body — single/double tap */}
        <div className={s.body} onClick={tapHandler}>
          <div className={s.titleRow}>
            <span className={s.text}>
              {todo.text || <span className={s.emptyText}>Kein Text</span>}
              {todo.duration && todo.duration <= 2 && (
                <span className={s.quickBadge}>⚡</span>
              )}
            </span>
            {timeLabel && <span className={s.timeLabel}>{timeLabel}</span>}
          </div>

          {/* Fortschrittsbalken — nur wenn Subtodos */}
          {!disableExpand && allItems.length > 0 && (
            <button
              className={s.progressRow}
              onClick={e => { e.stopPropagation(); toggleExpanded() }}
              aria-label="Unterpunkte anzeigen"
              aria-expanded={expanded}
            >
              <span className={s.progressTrack}>
                <span className={s.progressFill} style={{ width: `${Math.round((doneItems / allItems.length) * 100)}%` }} />
              </span>
              <span className={[s.progressChevron, expanded ? s.progressChevronOpen : ''].join(' ')}>
                <ProgressChevronIcon />
              </span>
            </button>
          )}

          {(metaParts.length > 0 || ageLabel) && (
            <span className={s.meta}>
              <span className={s.metaLeft}>{metaParts.join(' · ')}</span>
              {ageLabel && (
                <span className={[s.ageTag, isOld ? s.ageTagOld : ''].join(' ')}>
                  {ageLabel}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Klaeren Circle Badge */}
        {onKlaeren && !todo.done && ageDays >= threshold && (
          <button
            className={s.klaerenCircle}
            onClick={e => { e.stopPropagation(); onKlaeren(todo) }}
            aria-label="Prokrastination"
          >
            <span className={s.klaerenCircleNum}>{ageDays}</span>
            <span className={s.klaerenCircleUnit}>Tage</span>
          </button>
        )}

        {/* Play — Fokus-Timer starten */}
        {onPlay && !todo.done && (
          <button
            className={s.playBtn}
            onClick={e => { e.stopPropagation(); onPlay() }}
            aria-label="Fokus-Timer starten"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 21 12 6 21" />
            </svg>
          </button>
        )}

        {/* Remove — nur fakeTodo-Chips ohne onEdit (Reminder/Birthday) */}
        {onRemove && !onEdit && (
          <button
            className={s.removeBtn}
            onClick={e => { e.stopPropagation(); onRemove() }}
            aria-label="Entfernen"
          >✕</button>
        )}

        {/* PrioBadge */}
        <span className={s.prioBadgeWrap}>
          <PrioBadge priority={todo.priority} />
        </span>

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
              top:          'calc(100% + 4px)',
              left:         0,
              right:        0,
              zIndex:       50,
              borderRadius: '10px',
              maxHeight:    '60vh',
              overflowY:    'auto',
              boxShadow:    '0 8px 24px rgba(0,0,0,0.6)',
              border:       `1px solid ${color}44`,
              borderTop:    `2px solid ${color}`,
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
                aria-label="Ziehen"
              ><SubDragIcon /></span>
            </div>
          ))}

          {/* Klaeren-Kontext */}
          {(todo.klaerenHindernis || todo.klaerenWert) && (
            <div className={s.klaerenContext}>
              {todo.klaerenHindernis && (
                <div className={s.klaerenRow}>
                  <span className={s.klaerenIcon}>🏔</span>
                  <div>
                    <span className={s.klaerenLabel}>Hindernis</span>
                    <span className={s.klaerenText}>{todo.klaerenHindernis}</span>
                  </div>
                </div>
              )}
              {todo.klaerenWert && (
                <div className={s.klaerenRow}>
                  <span className={s.klaerenIcon}>✨</span>
                  <div>
                    <span className={s.klaerenLabel}>Wert</span>
                    <span className={s.klaerenText}>{todo.klaerenWert}</span>
                  </div>
                </div>
              )}
            </div>
          )}

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
