import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, ALL_SLOT_KEYS } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { useDragDrop } from '../../../hooks/useDragDrop'
import Zeitplan            from '../Zeitplan/Zeitplan'
import Pool                from '../Pool/Pool'
import TodoModal           from '../../../components/TodoModal/TodoModal'
import ReminderSection     from '../../tools/reminder/ReminderSection'
import HaushaltSection     from '../../tools/haushalt/HaushaltSection'
import MissedReviewModal   from '../Zeitplan/MissedReviewModal'
import DayNav              from '../../../components/DayNav/DayNav'
import BlockerModal        from '../Blocker/BlockerModal'
import RepeatDeleteSheet   from '../Blocker/RepeatDeleteSheet'
import { deleteBlockerInstance, deleteBlockerFuture } from '../Blocker/blockerUtils'
import { loadHaushalt, saveHaushalt, markTaskDone as haushaltMarkDone } from '../../tools/haushalt/haushaltData'
import { useTimeEvents } from './useTimeEvents'
import s from './TabHeute.module.css'

export default function TabHeute() {
  const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate, setCalendarDate, blockers, setBlockers } = useAppStore()

  const [viewDate, setViewDate] = useState(() => dayplanDate ?? todayKey())
  const [visStart, setVisStart] = useState(() => lv(SK.visStart, 8))
  const [visEnd,   setVisEnd]   = useState(() => lv(SK.visEnd,   20))
  const [editingTodo,       setEditingTodo]       = useState(null)
  const [blockerModal,      setBlockerModal]       = useState(null)
  const [repeatDeleteSheet, setRepeatDeleteSheet]  = useState(null)

  const { registerHalf, startDrag } = useDragDrop()

  const todaySlots = days[viewDate] ?? {}

  const { isOpen: teOpen, variant: teVariant, items: teItems, handleDone: teDone, handleIgnore: teIgnore, handleMoveToPool: teToPool } =
    useTimeEvents({ days, setDays, todos, setTodos })

  // ─── Consume dayplanDate on mount ─────────────────────
  useEffect(() => {
    if (dayplanDate) {
      setViewDate(dayplanDate)
      setDayplanDate(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setTodos(prev => {
      const todo    = prev.find(t => t.id === id)
      const nowDone = !todo?.done
      if (nowDone && todo?.haushaltTaskIds?.length > 0) {
        const cfg     = loadHaushalt()
        const updated = todo.haushaltTaskIds.reduce(
          (c, tid) => haushaltMarkDone(c, tid), cfg
        )
        saveHaushalt(updated)
      }
      return prev.map(t =>
        t.id === id
          ? { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
          : t
      )
    })
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

  // ─── Kalender-Link ────────────────────────────────────────
  const handleDoneCalendar = useCallback(() => {
    setCalendarDate(viewDate)
    setCurrentTab(1)
  }, [setCurrentTab, setCalendarDate, viewDate])

  // ─── Blocker CRUD ──────────────────────────────────────────
  const handleCreateBlocker = useCallback(() => {
    setBlockerModal({ blocker: null })
  }, [])

  const handleEditBlocker = useCallback((blocker) => {
    setBlockerModal({ blocker })
  }, [])

  const handleSaveBlocker = useCallback((data) => {
    setBlockers(prev =>
      prev.some(b => b.id === data.id)
        ? prev.map(b => b.id === data.id ? data : b)
        : [...prev, data]
    )
    setBlockerModal(null)
  }, [setBlockers])

  const handleDeleteBlocker = useCallback((blocker) => {
    if (blocker.repeat) {
      setRepeatDeleteSheet({ blocker, dateStr: viewDate })
    } else {
      setBlockers(prev => prev.filter(b => b.id !== blocker.id))
      setBlockerModal(null)
    }
  }, [setBlockers, viewDate])

  const handleRepeatDeleteThis = useCallback(() => {
    const { blocker, dateStr } = repeatDeleteSheet
    setBlockers(prev => prev.map(b => b.id === blocker.id ? deleteBlockerInstance(b, dateStr) : b))
    setRepeatDeleteSheet(null)
    setBlockerModal(null)
  }, [repeatDeleteSheet, setBlockers])

  const handleRepeatDeleteFuture = useCallback(() => {
    const { blocker, dateStr } = repeatDeleteSheet
    setBlockers(prev => prev.map(b => b.id === blocker.id ? deleteBlockerFuture(b, dateStr) : b))
    setRepeatDeleteSheet(null)
    setBlockerModal(null)
  }, [repeatDeleteSheet, setBlockers])

  const handleToggleBlockerLocked = useCallback((blockerId) => {
    setBlockers(prev => prev.map(b => b.id === blockerId ? { ...b, locked: !b.locked } : b))
  }, [setBlockers])

  // ─── Drag & Drop ──────────────────────────────────────────
  const startPoolDrag = useCallback((todoId, text, color, duration, e) => {
    startDrag(text, color, (dropKey) => {
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

  return (
    <div className={s.page}>
      <DayNav
        date={viewDate}
        onChange={setViewDate}
        onCalendarOpen={() => { setCalendarDate(viewDate); setCurrentTab(1) }}
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
        blockers={blockers}
        onCreateBlocker={handleCreateBlocker}
        onEditBlocker={handleEditBlocker}
        onToggleBlockerLocked={handleToggleBlockerLocked}
      />
      <Pool
        todos={todos}
        setTodos={setTodos}
        todaySlots={todaySlots}
        onToggleDone={handleToggleDone}
        onEdit={handleEdit}
        onRemove={handleRemove}
        startDrag={startPoolDrag}
        onDoneCalendar={handleDoneCalendar}
      />
      {activeTools.includes('reminder') && <ReminderSection />}
      {activeTools.includes('haushalt') && <HaushaltSection />}

      {editingTodo && (
        <TodoModal
          existingTodo={editingTodo}
          onClose={() => setEditingTodo(null)}
        />
      )}

      {teOpen && (
        <MissedReviewModal
          items={teItems}
          variant={teVariant}
          onDone={teDone}
          onIgnore={teIgnore}
          onMoveToPool={teToPool}
        />
      )}

      {blockerModal !== null && (
        <BlockerModal
          blocker={blockerModal.blocker}
          date={viewDate}
          onSave={handleSaveBlocker}
          onDelete={handleDeleteBlocker}
          onClose={() => setBlockerModal(null)}
        />
      )}

      {repeatDeleteSheet && (
        <RepeatDeleteSheet
          onDeleteThis={handleRepeatDeleteThis}
          onDeleteFuture={handleRepeatDeleteFuture}
          onClose={() => setRepeatDeleteSheet(null)}
        />
      )}
    </div>
  )
}
