import { useState, useCallback, useRef, useMemo } from 'react'
import { sk, getDurationKeys, ALL_SLOT_KEYS, todayKey } from '../../../utils'
import s from './Zeitplan.module.css'
import SlotBlock from './SlotBlock'
import BlockerCard from '../Blocker/BlockerCard'
import { getBlockersForDate, getBlockerForHour } from '../Blocker/blockerUtils'

// ─── RemoveDialog ─────────────────────────────────────────
function RemoveDialog({ slotKey, slotText, onBack, onDelete, onClose }) {
  return (
    <div className={s.dialogOverlay} onClick={onClose}>
      <div className={s.dialog} onClick={e => e.stopPropagation()}>
        <p className={s.dialogTitle}>"{slotText}"</p>
        <button className={s.dialogBtn} onClick={onBack}>
          ↩ Zurück auf Liste
        </button>
        <button className={[s.dialogBtn, s.dialogBtnDelete].join(' ')} onClick={onDelete}>
          Löschen
        </button>
        <button className={s.dialogBtnCancel} onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}

// ─── SlotChipPreview ──────────────────────────────────────
function SlotChipPreview({ slotKey, slot, onTap }) {
  const h    = parseFloat(slotKey)
  const hour = String(Math.floor(h)).padStart(2, '0')
  const min  = h % 1 === 0 ? '00' : '30'
  const meta = `${hour}:${min}${slot.duration ? ` · ${slot.duration}min` : ''}`
  return (
    <div className={s.pillChip} onClick={() => onTap(h)}>
      <div className={s.pillChipStripe} style={{ background: slot.color || '#8B5CF6' }} />
      <div className={s.pillChipBody}>
        <span className={s.pillChipText}>{slot.text || '—'}</span>
        <span className={s.pillChipMeta}>{meta}</span>
      </div>
    </div>
  )
}

// ─── PillStrip ────────────────────────────────────────────
function PillStrip({ slots, visibleStart, visibleEnd, isTop, onExpand, onShrink, onExpandTo }) {
  const outSlots = Object.entries(slots)
    .filter(([k, v]) => {
      if (!v) return false
      const h = Math.floor(parseFloat(k))
      return isTop ? h < visibleStart : h > visibleEnd
    })
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))

  return (
    <div className={s.pillStrip}>
      <button className={[s.pillBtn, s.pillBtnMinus].join(' ')} onClick={onShrink}>−</button>
      <div className={s.pillChips}>
        {outSlots.map(([k, slot]) => (
          <SlotChipPreview key={k} slotKey={k} slot={slot} onTap={onExpandTo} />
        ))}
      </div>
      <button className={[s.pillBtn, s.pillBtnPlus].join(' ')} onClick={onExpand}>+</button>
    </div>
  )
}

// ─── Zeitplan ─────────────────────────────────────────────
export default function Zeitplan({
  slots = {},
  todos = [],
  setTodos,
  visibleStart = 8,
  visibleEnd = 18,
  dateLabel,
  onSetSlot,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onShiftAll,
  onExpandUp,
  onExpandDown,
  onExpandUpTo,
  onExpandDownTo,
  onRemoveHour,
  onToggleLock,
  registerHalf,
  startSlotDrag,
  blockers = [],
  onCreateBlocker,
  onEditBlocker,
  onToggleBlockerLocked,
}) {
  const [hideEmpty, setHideEmpty]       = useState(false)
  const [removeDialog, setRemoveDialog] = useState(null)

  const openRemove  = useCallback((slotKey, slotText) => setRemoveDialog({ slotKey, slotText }), [])
  const closeRemove = useCallback(() => setRemoveDialog(null), [])

  const now = new Date()
  const isNow = dateLabel === todayKey()

  const fullHours  = Array.from({ length: 24 }, (_, i) => i)
  const rangeHours = Array.from({ length: visibleEnd - visibleStart + 1 }, (_, i) => i + visibleStart)

  // blockersForDate muss vor hours berechnet werden
  const blockersForDate = useMemo(
    () => getBlockersForDate(blockers, dateLabel),
    [blockers, dateLabel]
  )

  const hours = hideEmpty
    ? fullHours.filter(h =>
        slots[sk(h, false)] || slots[sk(h, true)] || !!getBlockerForHour(h, blockersForDate)
      )
    : rangeHours

  const consumedKeys = new Set()
  for (const key of ALL_SLOT_KEYS) {
    const slot = slots[key]
    if (!slot) continue
    const dur = slot.duration || 30
    if (dur <= 30) continue
    const spanned = getDurationKeys(key, dur)
    for (let i = 1; i < spanned.length; i++) consumedKeys.add(spanned[i])
  }

  // Stunden in Sections aufteilen: normal | blocker
  const sections = useMemo(() => {
    const result  = []
    let normalBuf = []
    const handled = new Set()

    for (const h of hours) {
      const blocker = getBlockerForHour(h, blockersForDate)
      if (blocker) {
        if (!handled.has(blocker.id)) {
          if (normalBuf.length) {
            result.push({ type: 'normal', hours: normalBuf })
            normalBuf = []
          }
          const blockerHours = hours.filter(bh => bh >= blocker.startHour && bh < blocker.endHour)
          result.push({ type: 'blocker', blocker, hours: blockerHours })
          handled.add(blocker.id)
        }
      } else {
        normalBuf.push(h)
      }
    }
    if (normalBuf.length) result.push({ type: 'normal', hours: normalBuf })
    return result
  }, [hours, blockersForDate])

  // ─── Hour rows renderer (wiederverwendet in normal sections) ──
  const renderHourRows = (hourList) => hourList.map((h, hi) => {
    const rowBase = hi * 2 + 1
    const topKey  = sk(h, false)
    const botKey  = sk(h, true)
    const topSlot = slots[topKey]
    const botSlot = slots[botKey]
    const isNowHour   = isNow && now.getHours() === h
    const topConsumed = consumedKeys.has(topKey)
    const botConsumed = consumedKeys.has(botKey)

    const topSpan = topSlot ? Math.ceil((topSlot.duration || 30) / 30) : 1
    const botSpan = botSlot ? Math.ceil((botSlot.duration || 30) / 30) : 1

    return [
      <div
        key={`lbl-${h}`}
        className={[s.sgLabel, isNowHour ? s.sgLabelNow : ''].join(' ')}
        style={{ gridRow: `${rowBase} / span 2` }}
      >
        {String(h).padStart(2, '0')}
      </div>,

      topConsumed
        ? <div key={`top-${h}`} className={s.sgConsumed} />
        : topSlot
          ? <div
              key={`top-${h}`}
              className={s.sgHalf}
              style={{ gridRow: topSpan > 1 ? `${rowBase} / span ${topSpan}` : String(rowBase) }}
              ref={el => registerHalf?.(topKey, el, topSlot.locked ? 'locked' : 'occupied')}
            >
              <SlotBlock
                slotKey={topKey}
                slot={topSlot}
                todo={todos.find(t => t.id === topSlot.todoId) || null}
                todos={todos}
                setTodos={setTodos}
                onToggleDone={() => onToggleSlotDone?.(topKey)}
                onEdit={() => {
                  const lt = todos.find(t => t.id === topSlot.todoId)
                  lt ? onEditTodo?.(lt.id) : onEditTodo?.(topKey)
                }}
                onRemove={() => openRemove(topKey, topSlot.text)}
                onDragStart={startSlotDrag && !topSlot.locked
                  ? (e) => startSlotDrag(topKey, e)
                  : undefined
                }
                onToggleLock={() => onToggleLock?.(topKey)}
                onSaveSlot={onSetSlot}
              />
            </div>
          : <div
              key={`top-${h}`}
              className={[s.sgHalf, s.sgEmpty, isNowHour ? s.sgNow : ''].join(' ')}
              style={{ gridRow: String(rowBase) }}
              ref={el => registerHalf?.(topKey, el, 'empty')}
            >
              <span className={s.halfTime}>:00</span>
            </div>,

      botConsumed
        ? <div key={`bot-${h}`} className={s.sgConsumed} />
        : botSlot
          ? <div
              key={`bot-${h}`}
              className={[s.sgHalf, s.sgHalfBot].join(' ')}
              style={{ gridRow: botSpan > 1 ? `${rowBase + 1} / span ${botSpan}` : String(rowBase + 1) }}
              ref={el => registerHalf?.(botKey, el, botSlot.locked ? 'locked' : 'occupied')}
            >
              <SlotBlock
                slotKey={botKey}
                slot={botSlot}
                todo={todos.find(t => t.id === botSlot.todoId) || null}
                todos={todos}
                setTodos={setTodos}
                onToggleDone={() => onToggleSlotDone?.(botKey)}
                onEdit={() => {
                  const lt = todos.find(t => t.id === botSlot.todoId)
                  lt ? onEditTodo?.(lt.id) : onEditTodo?.(botKey)
                }}
                onRemove={() => openRemove(botKey, botSlot.text)}
                onDragStart={startSlotDrag && !botSlot.locked
                  ? (e) => startSlotDrag(botKey, e)
                  : undefined
                }
                onToggleLock={() => onToggleLock?.(botKey)}
                onSaveSlot={onSetSlot}
              />
            </div>
          : <div
              key={`bot-${h}`}
              className={[s.sgHalf, s.sgHalfBot, s.sgEmpty].join(' ')}
              style={{ gridRow: String(rowBase + 1) }}
              ref={el => registerHalf?.(botKey, el, 'empty')}
            >
              <span className={s.halfTime}>:30</span>
            </div>,
    ].filter(Boolean)
  })

  return (
    <div className={s.zeitplan}>

      {/* Shift controls */}
      <div className={s.controls}>
        <button className={s.shiftBtn} onClick={() => onShiftAll?.(-1)}>▲ 30min</button>
        <button className={s.shiftBtn} onClick={() => onShiftAll?.(1)}>▼ 30min</button>
        <div style={{ flex: 1 }} />
        {onCreateBlocker && (
          <button className={s.blockerBtn} onClick={onCreateBlocker}>+ Fenster</button>
        )}
        <div className={s.viewToggle}>
          <button className={[s.viewBtn, !hideEmpty ? s.viewBtnActive : ''].join(' ')} onClick={() => setHideEmpty(false)}>Alles</button>
          <button className={[s.viewBtn,  hideEmpty ? s.viewBtnActive : ''].join(' ')} onClick={() => setHideEmpty(true)}>Minimal</button>
        </div>
      </div>

      {/* Top pill strip */}
      <PillStrip
        slots={slots}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        isTop={true}
        onExpand={() => onExpandUp?.()}
        onShrink={() => onRemoveHour?.(visibleStart)}
        onExpandTo={(h) => onExpandUpTo?.(h)}
      />

      {/* Sections: normal grids + blocker cards */}
      <div className={s.slotsContainer}>
        {sections.map((sec, si) =>
          sec.type === 'normal'
            ? (
              <div key={`sec-${si}`} className={s.sgGrid}>
                {renderHourRows(sec.hours)}
              </div>
            )
            : (
              <BlockerCard
                key={sec.blocker.id}
                blocker={sec.blocker}
                hours={sec.hours}
                slots={slots}
                todos={todos}
                setTodos={setTodos}
                consumedKeys={consumedKeys}
                onToggleSlotDone={onToggleSlotDone}
                onEditTodo={onEditTodo}
                onRemoveSlot={(key, text) => openRemove(key, text)}
                onToggleLock={onToggleLock}
                onToggleLocked={() => onToggleBlockerLocked?.(sec.blocker.id)}
                onSetSlot={onSetSlot}
                registerHalf={registerHalf}
                startSlotDrag={startSlotDrag}
                onEdit={() => onEditBlocker?.(sec.blocker)}
              />
            )
        )}
      </div>

      {/* Bottom pill strip */}
      <PillStrip
        slots={slots}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        isTop={false}
        onExpand={() => onExpandDown?.()}
        onShrink={() => onRemoveHour?.(visibleEnd)}
        onExpandTo={(h) => onExpandDownTo?.(h)}
      />

      {/* Remove dialog */}
      {removeDialog && (
        <RemoveDialog
          slotKey={removeDialog.slotKey}
          slotText={removeDialog.slotText}
          onBack={() => { onRemoveSlot?.(removeDialog.slotKey, 'back'); closeRemove() }}
          onDelete={() => { onRemoveSlot?.(removeDialog.slotKey, 'delete'); closeRemove() }}
          onClose={closeRemove}
        />
      )}
    </div>
  )
}
