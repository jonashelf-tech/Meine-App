import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, sk, parseHHMM, ALL_SLOT_KEYS } from '../../../utils'
import Zeitplan         from '../Zeitplan/Zeitplan'
import Pool             from '../Pool/Pool'
import EditModal        from '../../../components/EditModal/EditModal'
import ReminderSection  from '../../tools/reminder/ReminderSection'
import ClockPopup       from '../Zeitplan/ClockPopup'
import s from './TabHeute.module.css'

export default function TabHeute() {
  const { todos, setTodos, days, setDays, activeTools } = useAppStore()

  const [visStart, setVisStart] = useState(() => {
    try { return parseInt(localStorage.getItem('adhs_vis_start')) || 8 } catch { return 8 }
  })
  const [visEnd, setVisEnd] = useState(() => {
    try { return parseInt(localStorage.getItem('adhs_vis_end')) || 20 } catch { return 20 }
  })
  const [editingTodo, setEditingTodo] = useState(null)
  const [dragState,   setDragState]   = useState(null)
  const [clockPopup,  setClockPopup]  = useState(null)

  const promptedRef = useRef(new Set())
  const snoozeRef   = useRef({})
  const daysRef     = useRef(days)

  const viewDate   = todayKey()
  const todaySlots = days[viewDate] ?? {}

  // ─── Keep daysRef current ─────────────────────────────
  useEffect(() => { daysRef.current = days }, [days])

  // ─── Init: mark done slots as already prompted ────────
  useEffect(() => {
    const slots = daysRef.current[viewDate] ?? {}
    Object.keys(slots).forEach(k => {
      if (slots[k]?.done) promptedRef.current.add(k)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Clock interval ───────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return
      const now     = new Date()
      const nowMins = now.getHours() * 60 + now.getMinutes()
      const slots   = daysRef.current[viewDate] ?? {}

      for (const key of Object.keys(slots)) {
        const slot = slots[key]
        if (!slot || slot.done || slot.locked) continue
        if (promptedRef.current.has(key)) continue
        if (snoozeRef.current[key] && snoozeRef.current[key] > Date.now()) continue

        const startMins = parseFloat(key) * 60
        const endMins   = startMins + (slot.duration || 30)

        if (endMins <= nowMins) {
          promptedRef.current.add(key)
          setClockPopup({ slotKey: key, slotText: slot.text || '?' })
          return // eines nach dem anderen
        }
      }
    }

    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [viewDate])

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
      prev.map(t => t.id === id
        ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null }
        : t
      )
    )
  }, [setTodos])

  const handleRemove = useCallback((id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [setTodos])

  // ─── Slot mutations ───────────────────────────────────────
  const handleToggleSlotDone = useCallback((slotKey) => {
    setTodaySlots(prev => {
      const slot = prev[slotKey]
      if (!slot) return prev
      return { ...prev, [slotKey]: { ...slot, done: !slot.done } }
    })
  }, [setTodaySlots])

  const handleToggleLock = useCallback((slotKey) => {
    setTodaySlots(prev => {
      const slot = prev[slotKey]
      if (!slot) return prev
      return { ...prev, [slotKey]: { ...slot, locked: !slot.locked } }
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

  // ─── Zeitplan expand/shrink ───────────────────────────────
  const saveVis = (start, end) => {
    try {
      localStorage.setItem('adhs_vis_start', start)
      localStorage.setItem('adhs_vis_end', end)
    } catch {}
  }

  const handleExpandUp   = useCallback(() => setVisStart(v => {
    const next = Math.max(0, v - 1); saveVis(next, visEnd); return next
  }), [visEnd])
  const handleExpandDown = useCallback(() => setVisEnd(v => {
    const next = Math.min(23, v + 1); saveVis(visStart, next); return next
  }), [visStart])
  const handleRemoveHour = useCallback((h) => {
    if (h === visStart) setVisStart(v => { const next = Math.min(v + 1, visEnd - 1); saveVis(next, visEnd); return next })
    else if (h === visEnd) setVisEnd(v => { const next = Math.max(v - 1, visStart + 1); saveVis(visStart, next); return next })
  }, [visStart, visEnd])

  // ─── Shift all slots ±30min ───────────────────────────────
  const handleShiftAll = useCallback((dir) => {
    setTodaySlots(currentSlots => {
      const keys = Object.keys(currentSlots).filter(k => !currentSlots[k]?.locked)
      const sorted = [...keys].sort((a, b) => dir * (parseFloat(b) - parseFloat(a)))
      const ns = { ...currentSlots }
      sorted.forEach(k => {
        let ni = ALL_SLOT_KEYS.indexOf(k) + dir
        while (ni >= 0 && ni < ALL_SLOT_KEYS.length && ns[ALL_SLOT_KEYS[ni]]?.locked) ni += dir
        if (ni >= 0 && ni < ALL_SLOT_KEYS.length && !ns[ALL_SLOT_KEYS[ni]]) {
          ns[ALL_SLOT_KEYS[ni]] = ns[k]
          delete ns[k]
        }
      })
      return ns
    })
  }, [setTodaySlots])

  // ─── Drag & drop ─────────────────────────────────────────
  const handleDragStart = useCallback((text, color, todoId, duration, sourceSlotKey = null) => {
    setDragState({ text, color, todoId, duration, sourceSlotKey })
  }, [])

  const handleDragEnd = useCallback(() => setDragState(null), [])

  const handleSlotDragStart = useCallback((slotKey) => {
    const slot = todaySlots[slotKey]
    if (!slot) return
    handleDragStart(slot.text, slot.color, slot.todoId, slot.duration, slotKey)
  }, [todaySlots, handleDragStart])

  const handleDropOnSlot = useCallback((targetKey) => {
    if (!dragState) return
    const existing = todaySlots[targetKey]
    if (existing) return

    const linkedTodo = dragState.todoId ? todos.find(t => t.id === dragState.todoId) : null
    const newSlot = {
      text:     dragState.text,
      todoId:   dragState.todoId || null,
      color:    dragState.color,
      duration: dragState.duration || 30,
      locked:   !!(linkedTodo?.time),
      done:     false,
    }

    if (dragState.sourceSlotKey && dragState.sourceSlotKey !== targetKey) {
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
  }, [dragState, todaySlots, todos, handleSetSlot, setTodaySlots])

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

  // ─── Clock popup actions ──────────────────────────────────
  const closeClockPopup = useCallback(() => setClockPopup(null), [])

  const handleClockDone = useCallback(() => {
    if (!clockPopup) return
    handleToggleSlotDone(clockPopup.slotKey)
    closeClockPopup()
  }, [clockPopup, handleToggleSlotDone, closeClockPopup])

  const handleClockSnooze = useCallback(() => {
    if (!clockPopup) return
    promptedRef.current.delete(clockPopup.slotKey)
    snoozeRef.current[clockPopup.slotKey] = Date.now() + 15 * 60 * 1000
    closeClockPopup()
  }, [clockPopup, closeClockPopup])

  const handleClockShift = useCallback(() => {
    handleShiftAll(1)
    closeClockPopup()
  }, [handleShiftAll, closeClockPopup])

  return (
    <div className={s.page}>
      <Zeitplan
        slots={todaySlots}
        todos={todos}
        setTodos={setTodos}
        visibleStart={visStart}
        visibleEnd={visEnd}
        dateLabel={viewDate}
        onSetSlot={handleSetSlot}
        onToggleSlotDone={handleToggleSlotDone}
        onEditTodo={handleEdit}
        onRemoveSlot={handleRemoveSlot}
        onShiftAll={handleShiftAll}
        onExpandUp={handleExpandUp}
        onExpandDown={handleExpandDown}
        onRemoveHour={handleRemoveHour}
        onSlotDragStart={handleSlotDragStart}
        onToggleLock={handleToggleLock}
        dragState={dragState}
        onDrop={handleDropOnSlot}
        onDragEnd={handleDragEnd}
      />
      <Pool
        todos={todos}
        setTodos={setTodos}
        todaySlots={todaySlots}
        onToggleDone={handleToggleDone}
        onEdit={handleEdit}
        onRemove={handleRemove}
        onDragStart={(text, color, todoId, duration) =>
          handleDragStart(text, color, todoId, duration)
        }
      />
      {activeTools.includes('reminder') && <ReminderSection />}

      {editingTodo && (
        <EditModal
          todo={editingTodo}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditingTodo(null)}
        />
      )}

      {clockPopup && (
        <ClockPopup
          slotText={clockPopup.slotText}
          onDone={handleClockDone}
          onSnooze={handleClockSnooze}
          onShift={handleClockShift}
          onDismiss={closeClockPopup}
        />
      )}
    </div>
  )
}
