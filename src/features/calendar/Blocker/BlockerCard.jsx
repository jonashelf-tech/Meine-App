import SlotBlock from '../Zeitplan/SlotBlock'
import { formatHour } from './blockerUtils'
import s from './BlockerCard.module.css'

export default function BlockerCard({
  blocker,
  hours,
  slots,
  todos,
  setTodos,
  consumedKeys,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onToggleLock,
  onSetSlot,
  registerHalf,
  startSlotDrag,
  onEdit,
}) {
  const col = blocker.color

  const cardStyle = {
    border:          `1px solid ${col}55`,
    borderLeftColor: `${col}cc`,
    background:      `${col}0d`,
  }
  const headerStyle = {
    background:   `${col}2e`,
    borderBottom: `1px solid ${col}33`,
  }

  return (
    <div className={s.card} style={cardStyle}>
      {/* Header — Tap öffnet Edit */}
      <div className={s.header} style={headerStyle} onClick={onEdit}>
        <div className={s.dot} style={{ background: col }} />
        <span className={s.name}>{blocker.text || 'Zeitfenster'}</span>
        <span className={s.time} style={{ color: col }}>
          {formatHour(blocker.startHour)}–{formatHour(blocker.endHour)}
        </span>
        <span className={[s.pill, blocker.locked ? s.pillLocked : s.pillOpen].join(' ')}>
          {blocker.locked ? 'geblockt' : 'offen'}
        </span>
      </div>

      {/* Body: gleiches Grid wie Zeitplan */}
      <div className={s.body}>
        {hours.map((h, hi) => {
          const rowBase = hi * 2 + 1
          const topKey  = String(h)
          const botKey  = `${h}.5`
          const topSlot = slots[topKey]
          const botSlot = slots[botKey]
          const topConsumed = consumedKeys.has(topKey)
          const botConsumed = consumedKeys.has(botKey)
          const zoneType = blocker.locked ? 'locked' : 'empty'

          const topSpan = topSlot ? Math.ceil((topSlot.duration || 30) / 30) : 1
          const botSpan = botSlot ? Math.ceil((botSlot.duration || 30) / 30) : 1

          return [
            <div
              key={`lbl-${h}`}
              className={s.lbl}
              style={{ gridRow: `${rowBase} / span 2` }}
            >
              {String(h).padStart(2, '0')}
            </div>,

            topConsumed
              ? <div key={`top-${h}`} className={s.consumed} />
              : topSlot
                ? <div
                    key={`top-${h}`}
                    className={s.half}
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
                      onRemove={() => onRemoveSlot?.(topKey, topSlot.text)}
                      onDragStart={startSlotDrag && !topSlot.locked ? (e) => startSlotDrag(topKey, e) : undefined}
                      onToggleLock={() => onToggleLock?.(topKey)}
                      onSaveSlot={onSetSlot}
                    />
                  </div>
                : <div
                    key={`top-${h}`}
                    className={[s.half, s.empty, blocker.locked ? s.lockedEmpty : ''].join(' ')}
                    style={{ gridRow: String(rowBase) }}
                    ref={el => registerHalf?.(topKey, el, zoneType)}
                  >
                    <span className={s.halfTime}>:00</span>
                  </div>,

            botConsumed
              ? <div key={`bot-${h}`} className={s.consumed} />
              : botSlot
                ? <div
                    key={`bot-${h}`}
                    className={[s.half, s.halfBot].join(' ')}
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
                      onRemove={() => onRemoveSlot?.(botKey, botSlot.text)}
                      onDragStart={startSlotDrag && !botSlot.locked ? (e) => startSlotDrag(botKey, e) : undefined}
                      onToggleLock={() => onToggleLock?.(botKey)}
                      onSaveSlot={onSetSlot}
                    />
                  </div>
                : <div
                    key={`bot-${h}`}
                    className={[s.half, s.halfBot, s.empty, blocker.locked ? s.lockedEmpty : ''].join(' ')}
                    style={{ gridRow: String(rowBase + 1) }}
                    ref={el => registerHalf?.(botKey, el, zoneType)}
                  >
                    <span className={s.halfTime}>:30</span>
                  </div>,
          ].filter(Boolean)
        })}
      </div>
    </div>
  )
}
