import { useState, useCallback } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { sk, skLabel, slotPx, getDurationKeys, ALL_SLOT_KEYS } from '../../../utils'
import s from './Zeitplan.module.css'

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

// ─── SlotBlock ────────────────────────────────────────────
function SlotBlock({ slotKey, slot, todo, height, onToggleDone, onEdit, onRemove, onSubItemToggle, onDragStart }) {
  const fakeTodo = todo ?? {
    id: null,
    text: slot.text || '',
    color: slot.color || '#00CFFF',
    priority: slot.priority ?? 3,
    done: slot.done ?? false,
    subItems: [],
    date: null,
    time: null,
    category: null,
    duration: slot.duration || 30,
  }

  const handle = onDragStart ? (
    <span
      className={s.slotHandle}
      onPointerDown={e => { e.preventDefault(); onDragStart() }}
    >
      ⠿
    </span>
  ) : null

  return (
    <TodoChip
      todo={fakeTodo}
      naturalHeight={height}
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onRemove={onRemove}
      onSubItemToggle={onSubItemToggle}
      dragHandle={handle}
    />
  )
}

// ─── Zeitplan ─────────────────────────────────────────────
export default function Zeitplan({
  slots = {},
  todos = [],
  visibleStart = 8,
  visibleEnd = 20,
  dateLabel,
  onSetSlot,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onVisibleStartChange,
  onVisibleEndChange,
  onSlotDragStart,
  dragState,
  onDrop,
  onDragEnd,
  onSubItemToggle,
}) {
  const [hideEmpty, setHideEmpty]       = useState(false)
  const [removeDialog, setRemoveDialog] = useState(null)

  const openRemove = useCallback((slotKey, slotText) => {
    setRemoveDialog({ slotKey, slotText })
  }, [])

  const closeRemove = useCallback(() => setRemoveDialog(null), [])

  // Build list of hours in range
  const hours = []
  for (let h = visibleStart; h < visibleEnd; h++) hours.push(h)

  // Determine which slots are "consumed" by a previous multi-slot block
  const consumedKeys = new Set()
  for (const key of ALL_SLOT_KEYS) {
    const slot = slots[key]
    if (!slot) continue
    const dur = slot.duration || 30
    if (dur <= 30) continue
    const spanned = getDurationKeys(key, dur)
    for (let i = 1; i < spanned.length; i++) {
      consumedKeys.add(spanned[i])
    }
  }

  // Format dateLabel for display
  const dateLabelFmt = dateLabel
    ? (() => { const [,mm,dd] = dateLabel.split('-'); return `${dd}.${mm}.` })()
    : null

  // Row render
  const renderHour = (h) => {
    const topKey = sk(h, false)
    const botKey = sk(h, true)

    const topSlot     = slots[topKey]
    const botSlot     = slots[botKey]
    const topConsumed = consumedKeys.has(topKey)
    const botConsumed = consumedKeys.has(botKey)

    const topEmpty = !topSlot && !topConsumed
    const botEmpty = !botSlot && !botConsumed
    if (hideEmpty && topEmpty && botEmpty) return null

    const topHeight = topSlot ? slotPx(topSlot.duration || 30) : 40
    const botHeight = botSlot ? slotPx(botSlot.duration || 30) : 40

    const renderSlot = (slotKey, slot, consumed, height) => {
      if (consumed) return <div key={slotKey} className={s.consumed} />

      const linkedTodo = slot?.todoId
        ? todos.find(t => t.id === slot.todoId) || null
        : null

      return (
        <div
          key={slotKey}
          className={[s.slot, slot ? s.slotFilled : s.slotEmpty].join(' ')}
          style={{ height: height + 'px' }}
        >
          {slot ? (
            <SlotBlock
              slotKey={slotKey}
              slot={slot}
              todo={linkedTodo}
              height={height}
              onToggleDone={() => onToggleSlotDone?.(slotKey)}
              onEdit={() => linkedTodo
                ? onEditTodo?.(linkedTodo.id)
                : onEditTodo?.(slotKey)
              }
              onRemove={() => openRemove(slotKey, slot.text)}
              onSubItemToggle={linkedTodo
                ? (idx) => onSubItemToggle?.(linkedTodo.id, idx)
                : undefined
              }
              onDragStart={onSlotDragStart ? () => onSlotDragStart(slotKey) : undefined}
            />
          ) : (
            <div
              className={[s.emptySlot, dragState ? s.dropZone : ''].join(' ')}
              onPointerUp={() => dragState && onDrop?.(slotKey)}
            >
              <span className={s.emptyTime}>{skLabel(slotKey)}</span>
              {dragState && <span className={s.dropHint}>+</span>}
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={h} className={s.hourRow}>
        <div className={s.hourLabel}>
          <span className={s.hourNum}>{String(h).padStart(2, '0')}</span>
        </div>

        <div className={s.subSlots}>
          {renderSlot(topKey, topSlot, topConsumed, topHeight)}
          {!topConsumed || botConsumed ? (
            renderSlot(botKey, botSlot, botConsumed, botHeight)
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={s.zeitplan}
      onPointerUp={() => { if (dragState) onDragEnd?.() }}
    >
      {/* Controls */}
      <div className={s.controls}>
        <div className={s.shiftBtns}>
          <button
            className={s.ctrlBtn}
            onClick={() => onVisibleStartChange?.(Math.max(0, visibleStart - 1))}
            aria-label="Eine Stunde früher"
          >
            ◀
          </button>
          <span className={s.visRange}>
            {String(visibleStart).padStart(2,'0')}–{String(visibleEnd).padStart(2,'0')}
          </span>
          <button
            className={s.ctrlBtn}
            onClick={() => onVisibleStartChange?.(Math.min(visibleEnd - 2, visibleStart + 1))}
            aria-label="Eine Stunde später"
          >
            ▶
          </button>
        </div>

        {dateLabelFmt && <span className={s.dateLabel}>{dateLabelFmt}</span>}

        <button
          className={[s.ctrlBtn, hideEmpty ? s.ctrlBtnActive : ''].join(' ')}
          onClick={() => setHideEmpty(v => !v)}
        >
          Leere {hideEmpty ? 'zeigen' : 'ausblenden'}
        </button>
      </div>

      {/* Grid */}
      <div className={s.grid}>
        {hours.map(renderHour)}
      </div>

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
