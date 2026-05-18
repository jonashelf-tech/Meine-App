import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, sk, parseHHMM } from '../../../utils'
import Zeitplan  from '../Zeitplan/Zeitplan'
import Pool      from '../Pool/Pool'
import EditModal from '../../../components/EditModal/EditModal'
import s from './TabHeute.module.css'

export default function TabHeute() {
  const { todos, setTodos, days, setDays } = useAppStore()

  const [visStart,    setVisStart]    = useState(8)
  const [visEnd]                      = useState(20)
  const [editingTodo, setEditingTodo] = useState(null)
  const [dragState,   setDragState]   = useState(null)

  const viewDate   = todayKey()
  const todaySlots = days[viewDate] ?? {}

  // ─── Helpers ─────────────────────────────────────────────
  const setTodaySlots = useCallback((updater) => {
    setDays(prev => {
      const current = prev[viewDate] ?? {}
      const next    = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [viewDate]: next }
    })
  }, [setDays, viewDate])

  // ─── Todo mutations ───────────────────────────────────────
  const handleToggleDone = useCallback((id) => {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null } : t)
    )
  }, [setTodos])

  const handleRemove = useCallback((id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [setTodos])

  const handleSubItemToggle = useCallback((todoId, subIdx) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t
      const newSubs = t.subItems.map((si, i) =>
        i === subIdx ? { ...si, done: !si.done } : si
      )
      return { ...t, subItems: newSubs }
    }))
  }, [setTodos])

  // ─── Slot mutations ───────────────────────────────────────
  const handleToggleSlotDone = useCallback((slotKey) => {
    setTodaySlots(prev => {
      const slot = prev[slotKey]
      if (!slot) return prev
      return { ...prev, [slotKey]: { ...slot, done: !slot.done } }
    })
  }, [setTodaySlots])

  const handleRemoveSlot = useCallback((slotKey, mode) => {
    setTodaySlots(prev => {
      const next = { ...prev }
      delete next[slotKey]
      return next
    })
    if (mode === 'delete') {
      const slot = todaySlots[slotKey]
      if (slot?.todoId) {
        setTodos(prev => prev.filter(t => t.id !== slot.todoId))
      }
    }
  }, [setTodaySlots, todaySlots, setTodos])

  const handleSetSlot = useCallback((slotKey, slotData) => {
    if (slotData === null) {
      setTodaySlots(prev => {
        const next = { ...prev }
        delete next[slotKey]
        return next
      })
    } else {
      setTodaySlots(prev => ({ ...prev, [slotKey]: slotData }))
    }
  }, [setTodaySlots])

  // ─── Drag & drop ─────────────────────────────────────────
  const handleDragStart = useCallback((text, color, todoId, duration, sourceSlotKey = null) => {
    setDragState({ text, color, todoId, duration, sourceSlotKey })
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragState(null)
  }, [])

  // Called when user drags a slot block via its drag handle
  const handleSlotDragStart = useCallback((slotKey) => {
    const slot = todaySlots[slotKey]
    if (!slot) return
    handleDragStart(slot.text, slot.color, slot.todoId, slot.duration, slotKey)
  }, [todaySlots, handleDragStart])

  const handleDropOnSlot = useCallback((targetKey) => {
    if (!dragState) return
    const existing = todaySlots[targetKey]
    if (existing) return

    const newSlot = {
      text:     dragState.text,
      todoId:   dragState.todoId || null,
      color:    dragState.color,
      duration: dragState.duration || 30,
      locked:   false,
      done:     false,
    }

    if (dragState.sourceSlotKey && dragState.sourceSlotKey !== targetKey) {
      // Move: remove source, set target atomically
      setTodaySlots(prev => {
        const next = { ...prev }
        delete next[dragState.sourceSlotKey]
        next[targetKey] = newSlot
        return next
      })
    } else {
      handleSetSlot(targetKey, newSlot)
    }
    setDragState(null)
  }, [dragState, todaySlots, handleSetSlot, setTodaySlots])

  // ─── Edit modal ───────────────────────────────────────────
  const handleEdit = useCallback((id) => {
    const todo = todos.find(t => t.id === id)
    if (todo) setEditingTodo(todo)
  }, [todos])

  const handleEditSave = useCallback((updated) => {
    setTodos(prev => prev.map(t => t.id === updated.id ? updated : t))
    setEditingTodo(null)
  }, [setTodos])

  const handleEditDelete = useCallback((id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    setEditingTodo(null)
  }, [setTodos])

  return (
    <div className={s.page}>
      <Zeitplan
        slots={todaySlots}
        todos={todos}
        visibleStart={visStart}
        visibleEnd={visEnd}
        dateLabel={viewDate}
        onSetSlot={handleSetSlot}
        onToggleSlotDone={handleToggleSlotDone}
        onEditTodo={(id) => handleEdit(id)}
        onRemoveSlot={handleRemoveSlot}
        onVisibleStartChange={setVisStart}
        onSlotDragStart={handleSlotDragStart}
        dragState={dragState}
        onDrop={handleDropOnSlot}
        onDragEnd={handleDragEnd}
        onSubItemToggle={(todoId, subIdx) => handleSubItemToggle(todoId, subIdx)}
      />
      <Pool
        todos={todos}
        todaySlots={todaySlots}
        onToggleDone={handleToggleDone}
        onEdit={(id) => handleEdit(id)}
        onRemove={handleRemove}
        onDragStart={(text, color, todoId, duration) => handleDragStart(text, color, todoId, duration)}
        onSubItemToggle={(todoId, subIdx) => handleSubItemToggle(todoId, subIdx)}
      />

      {editingTodo && (
        <EditModal
          todo={editingTodo}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditingTodo(null)}
        />
      )}
    </div>
  )
}
