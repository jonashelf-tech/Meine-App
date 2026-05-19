import { useState, useCallback } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { sk, skLabel, slotPx, getDurationKeys, ALL_SLOT_KEYS } from '../../../utils'
import s from './Zeitplan.module.css'

const ROW_H = 40

// ─── LockIcon ─────────────────────────────────────────────
function LockIcon({ locked }) {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="5" width="7" height="6" rx="1.5" fill="currentColor"/>
      {locked
        ? <path d="M2.5 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        : <path d="M2.5 4.5V3a2 2 0 014 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
      }
    </svg>
  )
}

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
function SlotBlock({ slotKey, slot, todo, height, todos, setTodos, onToggleDone, onEdit, onRemove, onDragStart }) {
  const displayTodo = {
    ...(todo ?? {
      id: null,
      text: slot.text || '',
      color: slot.color || '#00CFFF',
      priority: slot.priority ?? 3,
      subItems: [],
      date: null, time: null, category: null,
      duration: slot.duration || 30,
    }),
    done: !!(slot.done),
  }
  const chipStyle = { borderRadius: 4, height: height ? `${height}px` : '100%', border: 'none', margin: 0, flexShrink: 0 }
  const handle = onDragStart ? (
    <span className={s.slotHandle} onPointerDown={e => { e.preventDefault(); onDragStart() }}>⠿</span>
  ) : null
  return (
    <TodoChip
      todo={displayTodo}
      chipStyle={chipStyle}
      floatExpand={true}
      disableExpand={!todo}
      todos={todos}
      saveTodos={setTodos}
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onRemove={onRemove}
      dragHandle={handle}
    />
  )
}

// ─── Zeitplan ─────────────────────────────────────────────
export default function Zeitplan({
  slots = {},
  todos = [],
  setTodos,
  visibleStart = 8,
  visibleEnd = 20,
  dateLabel,
  onSetSlot,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onShiftAll,
  onExpandUp,
  onExpandDown,
  onRemoveHour,
  onSlotDragStart,
  onToggleLock,
  dragState,
  onDrop,
  onDragEnd,
}) {
  const [hideEmpty, setHideEmpty]       = useState(false)
  const [removeDialog, setRemoveDialog] = useState(null)

  const openRemove  = useCallback((slotKey, slotText) => setRemoveDialog({ slotKey, slotText }), [])
  const closeRemove = useCallback(() => setRemoveDialog(null), [])

  const now = new Date()
  const isNow = true

  // Build list of hours in range (inclusive of visibleEnd)
  const hours = Array.from({ length: visibleEnd - visibleStart + 1 }, (_, i) => i + visibleStart)

  // Determine which slots are "consumed" by a previous multi-slot block
  const consumedKeys = new Set()
  for (const key of ALL_SLOT_KEYS) {
    const slot = slots[key]
    if (!slot) continue
    const dur = slot.duration || 30
    if (dur <= 30) continue
    const spanned = getDurationKeys(key, dur)
    for (let i = 1; i < spanned.length; i++) consumedKeys.add(spanned[i])
  }

  return (
    <div className={s.zeitplan} onPointerUp={() => { if (dragState) onDragEnd?.() }}>

      {/* Shift controls */}
      <div className={s.controls}>
        <button className={s.shiftBtn} onClick={() => onShiftAll?.(-1)}>▲ 30min</button>
        <button className={s.shiftBtn} onClick={() => onShiftAll?.(1)}>▼ 30min</button>
        <div style={{ flex: 1 }} />
        <button
          className={[s.hideBtn, hideEmpty ? s.hideBtnOn : ''].join(' ')}
          onClick={() => setHideEmpty(v => !v)}
        >
          {hideEmpty ? 'Minimal' : 'Alles'}
        </button>
      </div>

      {/* Top expand row */}
      <div className={s.expandRow}>
        <button className={[s.xBtn, s.xBtnAdd].join(' ')} onClick={() => onExpandUp?.()}>+ früher</button>
        {visibleStart < visibleEnd - 1 && (
          <button className={[s.xBtn, s.xBtnRm].join(' ')} onClick={() => onRemoveHour?.(visibleStart)}>− früh</button>
        )}
      </div>

      {/* Flat grid */}
      <div className={s.slotsContainer}>
        <div className={s.sgGrid}>
          {hours.map((h, hi) => {
            const rowBase = hi * 2 + 1
            const topKey = sk(h, false)
            const botKey = sk(h, true)
            const topSlot = slots[topKey]
            const botSlot = slots[botKey]
            const isNowHour = isNow && now.getHours() === h
            const topConsumed = consumedKeys.has(topKey)
            const botConsumed = consumedKeys.has(botKey)

            // Top span: how many 30-min slots does topSlot take?
            const topSpan = topSlot?.duration ? Math.ceil(topSlot.duration / 30) : 1
            const botConsumedByTop = !topConsumed && topSlot && topSpan > 1
              && !botSlot && consumedKeys.has(botKey)

            const topH = topSlot ? slotPx(topSlot.duration || 30) : ROW_H
            const botH = botSlot ? slotPx(botSlot.duration || 30) : ROW_H

            return [
              // Hour label — spans 2 rows
              <div
                key={`lbl-${h}`}
                className={[s.sgLabel, isNowHour ? s.sgLabelNow : ''].join(' ')}
                style={{ gridRow: `${rowBase} / span 2` }}
              >
                {String(h).padStart(2, '0')}
              </div>,

              // Top half
              topConsumed
                ? <div key={`top-${h}`} className={s.sgConsumed} style={{ gridRow: rowBase }} />
                : topSlot
                  ? <div key={`top-${h}`} className={s.sgHalf} style={{ gridRow: rowBase, height: topH }}>
                      <SlotBlock
                        slotKey={topKey}
                        slot={topSlot}
                        todo={todos.find(t => t.id === topSlot.todoId) || null}
                        height={topH}
                        todos={todos}
                        setTodos={setTodos}
                        onToggleDone={() => onToggleSlotDone?.(topKey)}
                        onEdit={() => {
                          const lt = todos.find(t => t.id === topSlot.todoId)
                          lt ? onEditTodo?.(lt.id) : onEditTodo?.(topKey)
                        }}
                        onRemove={() => openRemove(topKey, topSlot.text)}
                        onDragStart={onSlotDragStart ? () => onSlotDragStart(topKey) : undefined}
                      />
                      <button
                        className={[s.lockBtn, topSlot.locked ? s.lockBtnOn : ''].join(' ')}
                        onClick={e => { e.stopPropagation(); onToggleLock?.(topKey) }}
                      >
                        <LockIcon locked={!!topSlot.locked} />
                      </button>
                    </div>
                  : <div
                      key={`top-${h}`}
                      className={[s.sgHalf, s.sgEmpty, isNowHour ? s.sgNow : ''].join(' ')}
                      style={{ gridRow: rowBase }}
                      onPointerUp={() => dragState && onDrop?.(topKey)}
                    >
                      <span className={s.halfTime}>:00</span>
                      {dragState && <span className={s.dropHint}>+</span>}
                    </div>,

              // Bot half
              (botConsumed || botConsumedByTop)
                ? <div key={`bot-${h}`} className={s.sgConsumed} style={{ gridRow: rowBase + 1 }} />
                : botSlot
                  ? <div key={`bot-${h}`} className={[s.sgHalf, s.sgHalfBot].join(' ')} style={{ gridRow: rowBase + 1, height: botH }}>
                      <SlotBlock
                        slotKey={botKey}
                        slot={botSlot}
                        todo={todos.find(t => t.id === botSlot.todoId) || null}
                        height={botH}
                        todos={todos}
                        setTodos={setTodos}
                        onToggleDone={() => onToggleSlotDone?.(botKey)}
                        onEdit={() => {
                          const lt = todos.find(t => t.id === botSlot.todoId)
                          lt ? onEditTodo?.(lt.id) : onEditTodo?.(botKey)
                        }}
                        onRemove={() => openRemove(botKey, botSlot.text)}
                        onDragStart={onSlotDragStart ? () => onSlotDragStart(botKey) : undefined}
                      />
                      <button
                        className={[s.lockBtn, botSlot.locked ? s.lockBtnOn : ''].join(' ')}
                        onClick={e => { e.stopPropagation(); onToggleLock?.(botKey) }}
                      >
                        <LockIcon locked={!!botSlot.locked} />
                      </button>
                    </div>
                  : <div
                      key={`bot-${h}`}
                      className={[s.sgHalf, s.sgHalfBot, s.sgEmpty].join(' ')}
                      style={{ gridRow: rowBase + 1 }}
                      onPointerUp={() => dragState && onDrop?.(botKey)}
                    >
                      <span className={s.halfTime}>:30</span>
                      {dragState && <span className={s.dropHint}>+</span>}
                    </div>,
            ].filter(Boolean)
          })}
        </div>
      </div>

      {/* Bottom expand row */}
      <div className={s.expandRow}>
        {visibleStart < visibleEnd - 1 && (
          <button className={[s.xBtn, s.xBtnRm].join(' ')} onClick={() => onRemoveHour?.(visibleEnd)}>− spät</button>
        )}
        <button className={[s.xBtn, s.xBtnAdd].join(' ')} onClick={() => onExpandDown?.()}>+ später</button>
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
