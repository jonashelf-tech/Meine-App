import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, sk, parseHHMM, ALL_SLOT_KEYS } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { createBlock } from '../../todos/Block'
import { useDragDrop } from '../../../hooks/useDragDrop'
import Zeitplan         from '../Zeitplan/Zeitplan'
import Pool             from '../Pool/Pool'
import TodoModal        from '../../../components/TodoModal/TodoModal'
import ReminderSection  from '../../tools/reminder/ReminderSection'
import ClockPopup       from '../Zeitplan/ClockPopup'
import DayNav           from '../../../components/DayNav/DayNav'
import s from './TabHeute.module.css'

export default function TabHeute() {
  const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate } = useAppStore()

  const [viewDate, setViewDate] = useState(() => dayplanDate ?? todayKey())
  const [visStart, setVisStart] = useState(() => lv(SK.visStart, 8))
  const [visEnd,   setVisEnd]   = useState(() => lv(SK.visEnd,   20))
  const [editingTodo, setEditingTodo] = useState(null)
  const [clockPopup,  setClockPopup]  = useState(null)

  const { registerHalf, startDrag } = useDragDrop()

  const promptedRef = useRef(new Set())
  const snoozeRef   = useRef({})
  const daysRef     = useRef(days)
  const tickRef     = useRef(null)

  const todaySlots = days[viewDate] ?? {}

  // ─── Consume dayplanDate on mount ─────────────────────
  useEffect(() => {
    if (dayplanDate) {
      setViewDate(dayplanDate)
      setDayplanDate(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // ─── Auto-Return: unchecked Zeitplan-Einträge vergangener Tage → Pool ──
  // Läuft einmal pro Tag beim App-Start. Slots ohne todoId (Text-only) werden
  // als neues Todo angelegt, damit sie im Pool erscheinen.
  useEffect(() => {
    const today = todayKey()
    if (lv(SK.lastPoolReturn, null) === today) return

    const existingIds = new Set(todos.map(t => t.id))
    const newTodos = []

    Object.entries(days).forEach(([dk, dayData]) => {
      if (dk >= today || !dayData || typeof dayData !== 'object') return
      Object.values(dayData).forEach(slot => {
        if (!slot || slot.done || !slot.text) return
        // Slots mit todoId überspringen — todo existiert noch (im Pool) oder wurde gelöscht (gewollt)
        if (slot.todoId) return
        // Nur text-only Slots zurückbringen, die nicht bereits im Pool sind
        if (existingIds.has && todos.some(t => t.text === slot.text && !t.done)) return
        newTodos.push(createBlock({
          text:     slot.text,
          priority: 3,
          ...(slot.color    ? { color:    slot.color    } : {}),
          ...(slot.duration ? { duration: slot.duration } : {}),
        }))
      })
    })

    if (newTodos.length > 0) setTodos(prev => [...prev, ...newTodos])
    sv(SK.lastPoolReturn, today)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Clock interval ───────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return
      const now     = new Date()
      const nowMins = now.getHours() * 60 + now.getMinutes()
      const slots   = daysRef.current[viewDate] ?? {}

      const expired = Object.keys(slots)
        .filter(key => {
          const slot = slots[key]
          if (!slot || slot.done || slot.locked) return false
          if (promptedRef.current.has(key)) return false
          if (snoozeRef.current[key] && snoozeRef.current[key] > Date.now()) return false
          const endMins = parseFloat(key) * 60 + (slot.duration || 30)
          return endMins <= nowMins
        })
        .sort((a, b) => parseFloat(a) - parseFloat(b))

      if (expired.length === 0) return
      const key = expired[0]
      promptedRef.current.add(key)
      setClockPopup({ slotKey: key, slotText: slots[key].text || '?' })
    }

    tickRef.current = tick
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
    sv(SK.visStart, start)
    sv(SK.visEnd,   end)
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
      const keys   = Object.keys(currentSlots).filter(k => !currentSlots[k]?.locked)
      const sorted = [...keys].sort((a, b) => dir * (parseFloat(b) - parseFloat(a)))
      const ns     = { ...currentSlots }
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

  // ─── Drag & Drop (v2.7-Ansatz: Ghost + Koordinaten) ──────
  // Pool-Chip → Zeitplan-Slot
  const startPoolDrag = useCallback((todoId, text, color, duration, e) => {
    startDrag(text, color, (dropKey) => {
      // Bereits verplant → verschieben
      const curKey = Object.keys(todaySlots).find(k => todaySlots[k]?.todoId === todoId)
      if (curKey) {
        if (dropKey === curKey) return
        setTodaySlots(prev => {
          const ns    = { ...prev }
          const entry = ns[curKey]
          delete ns[curKey]
          ns[dropKey] = entry
          return ns
        })
      } else {
        // Neu einplanen
        handleSetSlot(dropKey, {
          text,
          todoId:   todoId || null,
          color,
          duration: duration || 30,
          locked:   false,
          done:     false,
        })
      }
    }, e)
  }, [startDrag, todaySlots, setTodaySlots, handleSetSlot])

  // Zeitplan-Slot → anderen Slot (verschieben)
  const startSlotDrag = useCallback((fromKey, e) => {
    const slot = todaySlots[fromKey]
    if (!slot || slot.locked) return
    startDrag(slot.text, slot.color || '#8B5CF6', (toKey) => {
      if (toKey === fromKey) return
      setTodaySlots(prev => {
        const ns    = { ...prev }
        const entry = ns[fromKey]
        delete ns[fromKey]
        ns[toKey] = entry
        return ns
      })
    }, e)
  }, [startDrag, todaySlots, setTodaySlots])

  // ─── Edit modal ───────────────────────────────────────────
  const handleEdit = useCallback((id) => {
    const todo = todos.find(t => t.id === id)
    if (todo) setEditingTodo(todo)
  }, [todos])

  // ─── Clock popup actions ──────────────────────────────────
  const closeClockPopup = useCallback(() => {
    setClockPopup(null)
    setTimeout(() => tickRef.current?.(), 50)
  }, [])

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
      <DayNav
        date={viewDate}
        onChange={setViewDate}
        onCalendarOpen={() => setCurrentTab(1)}
      />
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
        onToggleLock={handleToggleLock}
        registerHalf={registerHalf}
        startSlotDrag={startSlotDrag}
      />
      <Pool
        todos={todos}
        setTodos={setTodos}
        todaySlots={todaySlots}
        onToggleDone={handleToggleDone}
        onEdit={handleEdit}
        onRemove={handleRemove}
        startDrag={startPoolDrag}
      />
      {activeTools.includes('reminder') && <ReminderSection />}

      {editingTodo && (
        <TodoModal
          existingTodo={editingTodo}
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
