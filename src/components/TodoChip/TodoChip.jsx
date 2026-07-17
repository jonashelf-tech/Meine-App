import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
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
  <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 3 5 7 8 3"/>
  </svg>
)

const ProkrastinationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
)

const PauseGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="5" width="4" height="14" rx="1"/>
    <rect x="14" y="5" width="4" height="14" rx="1"/>
  </svg>
)

const PlayGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="7 4 20 12 7 20"/>
  </svg>
)

const ToPoolGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4"/>
    <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
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
  onRemove,           // fn() — delete (zeigt ✕-Button nur ohne onEdit; fakeTodo-Chips ohne Edit-Modal)
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
  pausable,           // true = Pause-Steuerung anzeigen (Pool only)
  onToPool,           // fn() — Eintrag zurück in den Pool (Zeitplan + Tagesliste; im Pool selbst sinnlos)
  timeSpan,           // string — Zeitspannen-Label vom Zeitplan ("14:00–15:30 · 90m")
  timeSpanInline,     // true = timeSpan in der Titelzeile (30-min-Blöcke) statt Meta-Zeile
  active,             // true = Slot läuft gerade (hellere Kontur)
  hideDate,           // true = Fälligkeits-Datum ausblenden (Tagesliste — der Tag ist eh schon der Kontext)
}) {
  const [expanded, setExpanded]   = useState(false)
  const [itemInput, setItemInput] = useState('')
  const [flashing, setFlashing]   = useState(false)
  const [subDragOver, setSubDragOver] = useState(null)
  const itemRef    = useRef(null)
  const itemsWrapRef = useRef(null)
  const rowWrapRef = useRef(null)
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

  // ── Pause / Resume ──────────────────────────────────────
  // Feldtext (falls vorhanden) wird zum Grund; leer = ohne Grund.
  const pauseTodo = useCallback(() => {
    updateTodo({ ...todo, paused: true, pauseReason: itemInput.trim() || null })
    setItemInput('')
    setExpanded(false)
    onExpandedChange?.(false, 0)
  }, [todo, itemInput, updateTodo, onExpandedChange])

  const resumeTodo = useCallback(() => {
    updateTodo({ ...todo, paused: false, pauseReason: null })
  }, [todo, updateTodo])

  const showPause = pausable && !todo.done

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

  const closeExpand = useCallback(() => {
    setExpanded(false)
    onExpandedChange?.(false, 0)
  }, [onExpandedChange])

  // Schwebendes Unterpunkte-Panel (floatExpand = Zeitplan): Tippen außerhalb
  // schließt es. Früher lag hier ein `position:fixed; inset:0` Vollbild-Backdrop
  // als Klick-Fänger — der deckte aber den einzigen Scroll-Container (.content)
  // ab und schluckte damit jeden Touch-Scroll: bei offenem Unterpunkt ließ sich
  // die Seite nicht mehr hoch/runter scrollen (ein horizontaler Swipe „löste"
  // es nur kurz, weil der Transform am Swipe-Wrapper den fixed-Backdrop kurz auf
  // dessen Box schrumpfte). Kein physisches Overlay mehr → Scroll läuft
  // ungehindert durch; Außen-Tipp wird per Document-Listener erkannt.
  // WICHTIG: hier NICHT wieder ein Vollbild-Overlay einführen — .content (nicht
  // body) ist der Scroller, ein fixed Overlay darüber blockiert den Scroll.
  useEffect(() => {
    if (!floatExpand || !expanded || disableExpand) return
    const onOutsideClick = (e) => {
      if (!rowWrapRef.current?.contains(e.target)) closeExpand()
    }
    document.addEventListener('click', onOutsideClick, true)
    return () => document.removeEventListener('click', onOutsideClick, true)
  }, [floatExpand, expanded, disableExpand, closeExpand])

  const { klaerenSettings, projects } = useAppStore()
  const threshold = klaerenSettings?.threshold ?? 7
  const ageColor  = klaerenSettings?.ageColor  ?? '#FB923C'
  // Ohne gewählte Farbe → Akzentfarbe (live gekoppelt, wandert bei Akzentwechsel mit)
  const color     = todo.color || 'var(--primary)'

  const projektName = todo.projectId
    ? (projects.find(p => p.id === todo.projectId)?.name ?? null)
    : null
  const metaTag = todo.tagLabel ?? projektName

  const ageDays   = (showAge || !!onKlaeren) ? getAgeDays(todo.createdAt) : 0
  const ageLabel  = showAge ? fmtAge(ageDays) : null
  const isOld     = ageDays >= threshold

  // timeSpan (Zeitplan) verdrängt das eigene Zeit/Dauer-Label: inline in der
  // Titelzeile (30-min-Blöcke) oder unten in der Meta-Zeile (hohe Blöcke).
  const ownTimeLabel = [
    isTermin(todo) ? todo.time : null,
    todo.duration  ? `${todo.duration}m` : null,
  ].filter(Boolean).join(' · ')
  const timeLabel = timeSpan
    ? (timeSpanInline ? timeSpan : null)
    : ownTimeLabel

  const metaParts = [
    timeSpan && !timeSpanInline ? timeSpan : null,
    isTermin(todo)      ? fmtDateShort(todo.date) : null,
    (isFaelligkeit(todo) && !hideDate) ? fmtDateShort(todo.date) : null,
  ].filter(Boolean)

  return (
    <>
      <div
        ref={rowWrapRef}
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
          todo.paused && !todo.done ? s.chipPaused : '',
          !todo.done && isOld ? s.chipOld : '',
          active && !todo.done ? s.chipNow : '',
          className || ''
        ].join(' ').trim()}
        style={{
          '--chip-color': todo.done ? 'rgba(0,255,148,0.15)' : color,
          '--age-color': ageColor,
          ...(chipStyle || {}),
        }}
      >
        <span className={s.stripe} />

        {/* Aufklapp-Button — volle Chip-Höhe, links: großes Tap-Ziel, getrennt
            vom Body, damit Abhaken (Body) und Aufklappen sich nicht überlappen. */}
        {!disableExpand && (
          showPause && todo.paused ? (
            <button
              className={[s.expandBtn, s.resumeBtn].join(' ')}
              onClick={e => { e.stopPropagation(); resumeTodo() }}
              aria-label="Fortsetzen"
            >
              <PlayGlyph />
            </button>
          ) : (
            <button
              className={[s.expandBtn, expanded ? s.expandBtnOpen : ''].join(' ')}
              onClick={e => { e.stopPropagation(); toggleExpanded() }}
              aria-label={allItems.length > 0 ? 'Unterpunkte anzeigen' : 'Unterpunkt hinzufügen'}
              aria-expanded={expanded}
            >
              <ProgressChevronIcon />
            </button>
          )
        )}

        {/* Body — single/double tap (abhaken / bearbeiten) */}
        <div className={s.body} onClick={tapHandler}>
          <div className={s.titleBlock}>
            <div className={s.titleRow}>
              <span className={s.text}>
                {todo.text || <span className={s.emptyText}>Kein Text</span>}
                {todo.duration && todo.duration <= 2 && (
                  <span className={s.quickBadge}>⚡</span>
                )}
              </span>
              {metaTag && <span className={s.categoryTag}>{metaTag}</span>}
              {!disableExpand && allItems.length > 0 && (
                <span className={s.subCount}>{doneItems}/{allItems.length}</span>
              )}
              {timeLabel && <span className={s.timeLabel}>{timeLabel}</span>}
            </div>

            {/* Zweite Zeile — feste Chip-Höhe: Pause-Grund VERDRÄNGT die Meta-Zeile */}
            {todo.paused && !todo.done && todo.pauseReason ? (
              <div className={s.pauseMarker}>
                <PauseGlyph />
                <span className={s.pauseMarkerText}>{todo.pauseReason}</span>
              </div>
            ) : (metaParts.length > 0 || ageLabel) && (
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

          {/* Fortschrittsbalken — unten im Body, nur wenn Unterpunkte existieren */}
          {!disableExpand && allItems.length > 0 && (
            <span className={s.progressTrack}>
              <span className={s.progressFill} style={{ width: `${Math.round((doneItems / allItems.length) * 100)}%` }} />
            </span>
          )}
        </div>

        {/* Kontextuelle Tool-Aktionen */}
        {((onPlay && !todo.done) || (onKlaeren && !todo.done)) && (
          <span className={s.actions}>
            {/* Play — Fokus-Timer starten */}
            {onPlay && !todo.done && (
              <button
                className={[s.toolAct, s.toolActPlay].join(' ')}
                onClick={e => { e.stopPropagation(); onPlay() }}
                aria-label="Fokus-Timer starten"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 21 12 6 21" />
                </svg>
              </button>
            )}

            {/* Prokrastination — anwählbar solange Tool aktiv, Alter = Highlight */}
            {onKlaeren && !todo.done && (
              <button
                className={[s.toolAct, isOld ? s.toolActHot : ''].join(' ')}
                style={isOld ? { '--hot': ageColor } : undefined}
                onClick={e => { e.stopPropagation(); onKlaeren(todo) }}
                aria-label="Prokrastination"
              >
                <ProkrastinationIcon />
              </button>
            )}
          </span>
        )}

        {/* Remove — nur fakeTodo-Chips ohne onEdit (Reminder/Birthday) */}
        {onRemove && !onEdit && (
          <button
            className={s.removeBtn}
            onClick={e => { e.stopPropagation(); onRemove() }}
            aria-label="Entfernen"
          >✕</button>
        )}

        {/* Prio-Punkt */}
        <span className={s.prioBadgeWrap} aria-label={`Priorität ${todo.priority ?? 'keine'}`}>
          <span className={[s.prioDot, s[`prioDot${todo.priority}`] || s.prioDot3].join(' ')} />
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
              marginTop:    0,
              left:         0,
              right:        0,
              zIndex:       50,
              borderRadius: '10px',
              maxHeight:    '60vh',
              overflowY:    'auto',
              boxShadow:    '0 8px 24px rgba(0,0,0,0.6)',
              border:       `1px solid color-mix(in srgb, ${color} 27%, transparent)`,
              borderTop:    `2px solid ${color}`,
            } : {})
          }}
        >
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

          {/* Add row — links + (Subtodo), rechts Pause und Zurück-in-Pool */}
          <div className={s.itemAddRow}>
            <button
              className={s.itemAddBtn}
              onClick={e => { e.stopPropagation(); addItem() }}
              aria-label="Unterpunkt hinzufügen"
            >+</button>
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
            {showPause && (
              <button
                className={s.rowAct}
                onClick={e => { e.stopPropagation(); pauseTodo() }}
                aria-label="Pausieren"
                title="Pausieren — Text im Feld wird zum Grund"
              >
                <PauseGlyph />
              </button>
            )}
            {onToPool && (
              <button
                className={s.rowAct}
                onClick={e => { e.stopPropagation(); closeExpand(); onToPool() }}
                aria-label="Zurück in den Pool"
                title="Zurück in den Pool"
              >
                <ToPoolGlyph />
              </button>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  )
}
