import { useState, useRef, useCallback } from 'react'
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

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const ProgressRing = ({ done, total, chipColor, todoIsDone }) => {
  const SIZE = 22, r = 8.5
  const circ = 2 * Math.PI * r   // ≈ 53.4

  if (todoIsDone) return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
    </svg>
  )

  if (total === 0) return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r={r}
        stroke="rgba(255,255,255,0.09)" strokeWidth="1.5" strokeDasharray="3.5 2.8"/>
      <line x1="11" y1="7.2" x2="11" y2="14.8"
        stroke="rgba(255,255,255,0.38)" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="7.2" y1="11" x2="14.8" y2="11"
        stroke="rgba(255,255,255,0.38)" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )

  const allDone   = done === total
  const ringColor = allDone ? '#00FF94' : chipColor
  const glow      = allDone
    ? 'rgba(0,255,148,0.6)'
    : hexToRgba(chipColor, 0.55)
  const progress  = (done / total) * circ

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={SIZE} height={SIZE} viewBox="0 0 22 22" fill="none"
        style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 0 ${allDone ? 4 : 3}px ${glow})` }}>
        <circle cx="11" cy="11" r={r}
          stroke={hexToRgba(ringColor, 0.18)} strokeWidth="2"/>
        <circle cx="11" cy="11" r={r}
          stroke={ringColor} strokeWidth="2"
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 11 11)"/>
      </svg>
      <span style={{
        position: 'absolute',
        fontSize:     allDone ? 10 : 7.5,
        fontWeight:   800,
        color:        ringColor,
        fontFamily:   'Outfit, sans-serif',
        letterSpacing: '-0.4px',
        lineHeight:    1,
        zIndex:        1,
      }}>
        {allDone ? '✓' : `${done}/${total}`}
      </span>
    </div>
  )
}

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


  const { toolColors, klaerenSettings } = useAppStore()
  const threshold = klaerenSettings?.threshold ?? 30
  const ageColor  = klaerenSettings?.ageColor  ?? '#FB923C'
  const color     = todo.color || '#8B5CF6'
  const glowColor = todo.toolId ? (toolColors?.[todo.toolId] ?? '#8B5CF6') : null

  const ageDays   = (showAge || !!onKlaeren) ? getAgeDays(todo.createdAt) : 0
  const ageLabel  = showAge ? fmtAge(ageDays) : null
  const isOld     = ageDays >= threshold

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
          !todo.done && isOld ? s.chipOld : '',
          className || ''
        ].join(' ').trim()}
        style={{
          '--chip-color': todo.done ? 'rgba(0,255,148,0.15)' : color,
          '--age-color': ageColor,
          ...(glowColor && !todo.done ? {
            boxShadow: `0 0 0 1.5px ${glowColor}, 0 0 14px ${glowColor}44`,
          } : {}),
          ...(chipStyle || {}),
        }}
      >
        {/* Stripe — only when no tool glow active */}
        {!glowColor && <span className={s.stripe} />}

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
            <ProgressRing
              done={doneItems}
              total={allItems.length}
              chipColor={color}
              todoIsDone={todo.done}
            />
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

        {/* Remove */}
        {onRemove && (
          <button
            className={s.removeBtn}
            onClick={e => { e.stopPropagation(); onRemove() }}
            aria-label="Entfernen"
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
