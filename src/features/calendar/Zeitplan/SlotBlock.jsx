import { useRef } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import s from './SlotBlock.module.css'

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

function LockIcon({ locked }) {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
      <rect x="1" y="6" width="10" height="8" rx="2" fill="currentColor"/>
      {locked
        ? <path d="M3.5 6V4a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        : <path d="M3.5 5.5V4a2.5 2.5 0 015 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.45"/>
      }
    </svg>
  )
}

export default function SlotBlock({ slotKey, slot, todo, todos, setTodos, onToggleDone, onEdit, onRemove, onDragStart, onToggleLock, onSaveSlot }) {
  const displayTodo = {
    ...(todo ?? {
      id: null,
      text: slot.text || '',
      color: slot.color || '#8B5CF6',
      priority: slot.priority ?? 3,
      subItems: slot.subItems || [],
      date: null, time: null, category: null,
      duration: slot.duration || 30,
    }),
    done: !!(slot.done),
  }
  const chipStyle = { height: '100%', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.09)', margin: 0, flexShrink: 0 }

  const dragRef = useRef(null)

  const handlePointerDown = (e) => {
    e.preventDefault()
    const start = { x: e.clientX, y: e.clientY, moved: false, evt: e }
    dragRef.current = start

    const onMove = (me) => {
      if (start.moved) return
      const dx = me.clientX - start.x
      const dy = me.clientY - start.y
      if (Math.hypot(dx, dy) > 4 && onDragStart) {
        start.moved = true
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        onDragStart(start.evt)
      }
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (!start.moved) onToggleLock?.()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const handle = (
    <span
      className={[s.slotHandle, slot.locked ? s.slotHandleLocked : ''].join(' ')}
      onPointerDown={handlePointerDown}
    >
      {slot.locked ? <LockIcon locked={true} /> : DragIcon}
    </span>
  )

  return (
    <TodoChip
      todo={displayTodo}
      chipStyle={chipStyle}
      floatExpand={true}
      disableExpand={false}
      todos={todos}
      saveTodos={setTodos}
      saveItem={!todo ? (upd) => onSaveSlot?.(slotKey, { ...slot, subItems: upd.subItems }) : undefined}
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onRemove={onRemove}
      dragHandle={handle}
    />
  )
}
