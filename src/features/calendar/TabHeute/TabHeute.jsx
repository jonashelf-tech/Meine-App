import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, sk, parseHHMM } from '../../../utils'
import { isTermin } from '../../todos/Block'
import QuickAdd      from '../QuickAdd/QuickAdd'
import Zeitplan      from '../Zeitplan/Zeitplan'
import Pool          from '../Pool/Pool'
import KiPlanSection from '../KiPlanSection/KiPlanSection'
import EditModal     from '../../../components/EditModal/EditModal'
import TabRad        from '../../tools/rad/TabRad'
import s from './TabHeute.module.css'

const MODI = [
  { id: 'manuell', label: 'Manuell' },
  { id: 'ki',      label: '✨ KI' },
  { id: 'rad',     label: '🎡 Rad' },
]

export default function TabHeute() {
  const { todos, setTodos, days, setDays } = useAppStore()

  const [modus,       setModus]       = useState('manuell')
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

  // ─── handleAdd ───────────────────────────────────────────
  const handleAdd = useCallback((block) => {
    if (isTermin(block) && block.time) {
      const mins    = parseHHMM(block.time)
      const hour    = Math.floor(mins / 60)
      const half    = mins % 60 >= 30
      const slotKey = sk(hour, half)

      setTodaySlots(prev => ({
        ...prev,
        [slotKey]: {
          text:     block.text,
          todoId:   block.id,
          color:    block.color,
          duration: block.duration || 30,
          done:     false,
          locked:   false,
        },
      }))
      setTodos(prev => [...prev, block])
    } else {
      setTodos(prev => [...prev, block])
    }
  }, [setTodaySlots, setTodos])

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
  const handleDragStart = useCallback((text, color, todoId, duration) => {
    setDragState({ text, color, todoId, duration })
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragState(null)
  }, [])

  const handleDropOnSlot = useCallback((slotKey) => {
    if (!dragState) return
    const existing = todaySlots[slotKey]
    if (existing) return
    handleSetSlot(slotKey, {
      text:     dragState.text,
      todoId:   dragState.todoId || null,
      color:    dragState.color,
      duration: dragState.duration || 30,
      locked:   false,
      done:     false,
    })
    setDragState(null)
  }, [dragState, todaySlots, handleSetSlot])

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

  // ─── KI-Plan accept ───────────────────────────────────────
  const handleKiAccept = useCallback((plan) => {
    setTodaySlots(prev => ({ ...prev, ...plan }))
  }, [setTodaySlots])

  return (
    <div className={s.page}>
      <QuickAdd onAdd={handleAdd} />

      {/* Modus row */}
      <div className={s.modusRow}>
        {MODI.map(m => (
          <button
            key={m.id}
            className={[s.modusBtn, modus === m.id ? s.modusBtnActive : ''].join(' ')}
            onClick={() => setModus(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {modus === 'manuell' && (
        <>
          <Zeitplan
            slots={todaySlots}
            todos={todos}
            visibleStart={visStart}
            visibleEnd={visEnd}
            onSetSlot={handleSetSlot}
            onToggleSlotDone={handleToggleSlotDone}
            onEditTodo={(id) => handleEdit(id)}
            onRemoveSlot={handleRemoveSlot}
            onVisibleStartChange={setVisStart}
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
        </>
      )}

      {modus === 'ki' && (
        <KiPlanSection
          todos={todos}
          slots={todaySlots}
          onAccept={handleKiAccept}
        />
      )}

      {modus === 'rad' && (
        <TabRad todos={todos} />
      )}

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
