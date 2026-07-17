import { useMemo } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { buildDayEntries } from '../tagesListeLogic'
import { minsToHHMM } from '../../../utils'
import { formatHour } from '../Blocker/blockerUtils'
import s from './Tagesliste.module.css'

const DragIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

// Termine sind Anker, kein Griff. Eine Reihenfolge kann keine Uhrzeit erzeugen —
// und ein Drag, der die Uhrzeit still löscht, wäre eine Falle. Aus dem Tag nehmen
// geht über den Pool-Knopf im Aufklapp-Panel.
const AnchorIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 13.5"/>
  </svg>
)

// Ein Slot in der Liste: derselbe TodoChip wie überall, feste Höhe. Dauer wird
// hier NICHT zur Höhe — die Liste hat kein Raster, in dem eine Höhe etwas
// bedeuten könnte; sie würde nur lügen. Die Dauer steht als Text.
function SlotRow({ slotKey, slot, todos, setTodos, onToggleDone, onEdit, onPlay, onSaveSlot, onToPool }) {
  const todo = todos.find(t => t.id === slot.todoId) || null
  const startMin = Math.round(parseFloat(slotKey) * 60)
  const dur      = slot.duration || 30
  const displayTodo = {
    ...(todo ?? {
      id: null, text: slot.text || '', color: slot.color || 'var(--primary)',
      priority: slot.priority ?? 3, subItems: slot.subItems || [],
      projectId: null, duration: dur,
    }),
    done: !!slot.done,
    date: null, time: null, toolId: null,
  }

  return (
    <TodoChip
      todo={displayTodo}
      todos={todos}
      saveTodos={setTodos}
      saveItem={!todo ? (upd) => onSaveSlot?.(slotKey, { ...slot, subItems: upd.subItems }) : undefined}
      floatExpand
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onPlay={displayTodo.paused ? undefined : onPlay}
      onToPool={onToPool}
      pausable={!!todo}
      timeSpan={`${minsToHHMM(startMin)}–${minsToHHMM(startMin + dur)} · ${dur}m`}
      dragHandle={
        <span className={s.anchor} aria-label="Fester Termin — Uhrzeit änderst du im Raster">
          {AnchorIcon}
        </span>
      }
    />
  )
}

// Ein zeitloses Tages-Todo: derselbe Chip, nur ohne Uhrzeit-Label.
function TodoRow({ todo, todos, setTodos, onToggleDone, onEdit, onToPool, onDragStart }) {
  return (
    <TodoChip
      todo={todo}
      todos={todos}
      saveTodos={setTodos}
      floatExpand
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onToPool={onToPool}
      pausable
      dragHandle={
        <span className={s.handle} data-drag-handle="true" onPointerDown={onDragStart} aria-label="Ziehen">
          {DragIcon}
        </span>
      }
    />
  )
}

export default function Tagesliste({
  viewDate, slots, todos, setTodos, blockers,
  onToggleSlotDone, onToggleTodoDone, onEditTodo, onPlaySlot, onSaveSlot, onToPool,
  onEditBlocker, onToggleBlockerLocked, registerHalf, startDrag,
}) {
  const { rows } = useMemo(
    () => buildDayEntries({ slots, todos, blockers, viewDate }),
    [slots, todos, blockers, viewDate]
  )

  const renderRow = (row) => {
    if (row.type === 'gap') {
      return (
        <div
          key={row.key}
          className={s.gap}
          ref={el => registerHalf?.(row.key, el, row.locked ? 'locked' : 'empty')}
        />
      )
    }
    if (row.type === 'slot') {
      return (
        <SlotRow
          key={row.key}
          slotKey={row.slotKey}
          slot={row.slot}
          todos={todos}
          setTodos={setTodos}
          onToggleDone={() => onToggleSlotDone?.(row.slotKey)}
          onEdit={() => {
            const lt = todos.find(t => t.id === row.slot.todoId)
            lt ? onEditTodo?.(lt.id) : onEditTodo?.(row.slotKey)
          }}
          onPlay={() => onPlaySlot?.(row.slotKey, row.slot)}
          onSaveSlot={onSaveSlot}
          onToPool={() => onToPool?.({ slotKey: row.slotKey })}
        />
      )
    }
    if (row.type === 'todo') {
      return (
        <TodoRow
          key={row.key}
          todo={row.todo}
          todos={todos}
          setTodos={setTodos}
          onToggleDone={() => onToggleTodoDone?.(row.todo.id)}
          onEdit={() => onEditTodo?.(row.todo.id)}
          onToPool={() => onToPool?.({ todoId: row.todo.id })}
          onDragStart={(e) => startDrag?.(row.todo.id, row.todo.text, row.todo.color ?? null, row.todo.duration, e)}
        />
      )
    }
    // Band
    const col = row.blocker.color
    const displayStart = row.blocker._overnight === 'end'   ? row.blocker._origStart : row.blocker.startHour
    const displayEnd   = row.blocker._overnight === 'start' ? row.blocker._origEnd   : row.blocker.endHour
    return (
      <div
        key={row.key}
        className={s.band}
        style={{ border: `1px solid ${col}55`, borderLeftColor: `${col}cc`, background: `${col}0d` }}
      >
        <div
          className={s.bandHead}
          style={{ background: `${col}2e`, borderBottom: `1px solid ${col}33` }}
          onClick={onEditBlocker ? () => onEditBlocker(row.blocker) : undefined}
        >
          <span className={s.bandDot} style={{ background: col }} />
          <span className={s.bandName}>{row.blocker.text || 'Zeitfenster'}</span>
          <span className={s.bandTime} style={{ color: col }}>
            {row.blocker._overnight === 'end' ? '↩ ' : ''}
            {formatHour(displayStart)}–{formatHour(displayEnd)}
            {row.blocker._overnight === 'start' ? ' +1' : ''}
          </span>
          <span
            className={[s.pill, row.blocker.locked ? s.pillLocked : s.pillOpen].join(' ')}
            onClick={e => { e.stopPropagation(); onToggleBlockerLocked?.(row.blocker) }}
          >{row.blocker.locked ? 'geblockt' : 'offen'}</span>
        </div>
        <div className={s.bandBody}>{row.rows.map(renderRow)}</div>
      </div>
    )
  }

  const hasContent = rows.some(r => r.type !== 'gap')

  return (
    <div className={s.liste}>
      {!hasContent && (
        <p className={s.empty}>
          Zieh ein Todo aus dem Pool hierher — es landet auf diesem Tag, ohne Uhrzeit.
        </p>
      )}
      {rows.map(renderRow)}
    </div>
  )
}
