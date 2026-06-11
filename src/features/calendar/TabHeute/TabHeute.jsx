import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, ALL_SLOT_KEYS, getDurationKeys, dateKey } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { useDragDrop } from '../../../hooks/useDragDrop'
import Zeitplan            from '../Zeitplan/Zeitplan'
import Pool                from '../Pool/Pool'
import TodoModal           from '../../../components/TodoModal/TodoModal'
import ReminderSection     from '../../tools/reminder/ReminderSection'
import HaushaltSection     from '../../tools/haushalt/HaushaltSection'
import GartenSection       from '../../tools/garten/GartenSection'
import WachstumSection     from '../../tools/wachstum/WachstumSection'
import GewichtSection     from '../../tools/gewicht/GewichtSection'
import BirthdaySection    from '../../tools/geburtstage/BirthdaySection'
import MealprepSection    from '../../tools/rezepte/MealprepSection'
import MissedReviewModal   from '../Zeitplan/MissedReviewModal'
import DayNav              from '../../../components/DayNav/DayNav'
import BlockerModal        from '../Blocker/BlockerModal'
import KlaerenModal        from '../../tools/klaeren/KlaerenModal'
import RepeatDeleteSheet   from '../Blocker/RepeatDeleteSheet'
import { deleteBlockerInstance, deleteBlockerFuture } from '../Blocker/blockerUtils'
import { loadHaushalt, saveHaushalt, markTaskDone as haushaltMarkDone } from '../../tools/haushalt/haushaltData'
import { createBlock } from '../../todos/Block'
import { setReminderLastAdded } from '../../tools/reminder/reminderData'
import { useTimeEvents } from './useTimeEvents'
import KognitivSection from '../../tools/kognitiv/KognitivSection'
import { MODULE_CONFIG } from '../../tools/kognitiv/moduleConfig'
import { usePageSwipe } from '../../../hooks/usePageSwipe'
import FokusView from './FokusView'
import s from './TabHeute.module.css'

export default function TabHeute() {
  const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate, setCalendarDate, blockers, setBlockers, birthdays, setBirthdays, heuteModus, setHeuteModus } = useAppStore()

  const [viewDate, setViewDate] = useState(() => dayplanDate ?? todayKey())
  const [visStart, setVisStart] = useState(() => lv(SK.visStart, 8))
  const [visEnd,   setVisEnd]   = useState(() => lv(SK.visEnd,   18))
  const [editingTodo,       setEditingTodo]       = useState(null)
  const [klaerenTodo,       setKlaerenTodo]       = useState(null)
  const [blockerModal,      setBlockerModal]       = useState(null)
  const [repeatDeleteSheet, setRepeatDeleteSheet]  = useState(null)

  const { registerHalf, startDrag } = useDragDrop()

  const todaySlots = days[viewDate] ?? {}

  const { isOpen: teOpen, variant: teVariant, items: teItems, handleDone: teDone, handleIgnore: teIgnore, handleMoveToPool: teToPool } =
    useTimeEvents({ days, setDays, todos, setTodos })

  const swipeRef = useRef(null)
  usePageSwipe(swipeRef, {
    onPrev: () => {
      const [y, m, d] = viewDate.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      date.setDate(date.getDate() - 1)
      setViewDate(dateKey(date))
    },
    onNext: () => {
      const [y, m, d] = viewDate.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      date.setDate(date.getDate() + 1)
      setViewDate(dateKey(date))
    },
    disabled: editingTodo !== null || blockerModal !== null || klaerenTodo !== null || teOpen,
  })

  // ─── Consume dayplanDate on mount ─────────────────────
  useEffect(() => {
    if (dayplanDate) {
      setViewDate(dayplanDate)
      setDayplanDate(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Kognitiv schedule slots ──────────────────────────────
  useEffect(() => {
    const schedule = lv(SK.kognitivSchedule, {})
    if (Object.keys(schedule).length === 0) return

    const dayOfWeek    = new Date(viewDate + 'T12:00:00').getDay()
    const currentSlots = lv(SK.days, {})[viewDate] ?? {}
    const newSlots     = {}

    Object.entries(schedule).forEach(([moduleId, cfg]) => {
      if (cfg.mode !== 'scheduled') return
      if (!(cfg.days ?? []).includes(dayOfWeek)) return

      const alreadyExists = Object.values(currentSlots).some(
        slot => slot?.toolId === 'kognitiv' && slot?.moduleId === moduleId
      )
      if (alreadyExists) return

      const [h]     = (cfg.time ?? '09:00').split(':').map(Number)
      const slotKey = String(h)
      if (currentSlots[slotKey]) return

      const m = MODULE_CONFIG[moduleId]
      newSlots[slotKey] = {
        text:     `🧠 ${m.name}`,
        color:    '#8B5CF6',
        duration: 30,
        locked:   true,
        done:     false,
        toolId:   'kognitiv',
        moduleId,
      }
    })

    if (Object.keys(newSlots).length > 0) {
      setDays(prev => ({
        ...prev,
        [viewDate]: { ...(prev[viewDate] ?? {}), ...newSlots },
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate])

  // ─── Tagesplaner-Öffnung tracken (einmalig pro Tag) ───
  useEffect(() => {
    const tracking = lv(SK.erfolgeTracking, { tagesplanerDates: [] })
    const today    = todayKey()
    if (!tracking.tagesplanerDates.includes(today)) {
      sv(SK.erfolgeTracking, {
        ...tracking,
        tagesplanerDates: [...tracking.tagesplanerDates, today].slice(-1000),
      })
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
      if (nowDone && todo?.reminderItemId) {
        setReminderLastAdded(todo.reminderItemId, todayKey())
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
      const nowDone = !slot.done
      if (nowDone && slot.reminderItemId) {
        setReminderLastAdded(slot.reminderItemId, todayKey())
      }
      return { ...prev, [slotKey]: { ...slot, done: nowDone } }
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
    const slot = todaySlots[slotKey]
    setTodaySlots(prev => {
      const next = { ...prev }
      delete next[slotKey]
      return next
    })
    if (mode === 'delete') {
      if (slot?.todoId) {
        setTodos(prev => prev.filter(t => t.id !== slot.todoId))
      }
    } else if (mode === 'back') {
      if (slot?.todoId) {
        setTodos(prev => prev.map(t =>
          t.id === slot.todoId ? { ...t, date: null, time: null } : t
        ))
      }
    }
  }, [setTodaySlots, todaySlots, setTodos])

  const handleSetSlot = useCallback((slotKey, slotData) => {
    if (slotKey === 'pool') return  // 'pool' ist Drop-Zone, kein echter Slot-Key
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

  const handleExpandUpTo = useCallback((h) => {
    const next = Math.floor(h)
    setVisStart(next)
    saveVis(next, visEnd)
  }, [visEnd])

  const handleExpandDownTo = useCallback((h) => {
    const next = Math.floor(h)
    setVisEnd(next)
    saveVis(visStart, next)
  }, [visStart])

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
    const dur    = duration || 30
    const curKey = Object.keys(todaySlots).find(k => todaySlots[k]?.todoId === todoId)
    const canDrop = dur > 30
      ? (key) => {
          const blocking = getDurationKeys(key, dur).slice(1).filter(k => k !== curKey && todaySlots[k])
          return blocking.length === 0 ? true : blocking
        }
      : null
    startDrag(text, color, (dropKey) => {
      // Drop zurück in den Pool: Slot lösen (falls verplant), Todo bleibt reines Pool-Todo
      if (dropKey === 'pool') {
        if (curKey) {
          setTodaySlots(prev => { const ns = { ...prev }; delete ns[curKey]; return ns })
          if (todoId) {
            setTodos(prev => prev.map(t =>
              t.id === todoId ? { ...t, date: null, time: null } : t
            ))
          }
        }
        return
      }
      const hh = String(Math.floor(parseFloat(dropKey))).padStart(2, '0')
      const mm = parseFloat(dropKey) % 1 ? '30' : '00'
      if (curKey) {
        if (dropKey === curKey) return
        setTodaySlots(prev => {
          const ns    = { ...prev }
          const entry = ns[curKey]
          delete ns[curKey]
          ns[dropKey] = entry
          return ns
        })
        if (todoId) {
          setTodos(prev => prev.map(t =>
            t.id === todoId ? { ...t, date: viewDate, time: `${hh}:${mm}` } : t
          ))
        }
      } else {
        handleSetSlot(dropKey, {
          text,
          todoId:   todoId || null,
          color,
          duration: duration || 30,
          locked:   false,
          done:     false,
        })
        if (todoId) {
          setTodos(prev => prev.map(t =>
            t.id === todoId ? { ...t, date: viewDate, time: `${hh}:${mm}` } : t
          ))
        }
      }
    }, e, canDrop, dur)
  }, [startDrag, todaySlots, setTodaySlots, handleSetSlot, setTodos, viewDate])

  const startHaushaltDrag = useCallback((room, uncoveredTasks, haushaltColor, e) => {
    const existing = todos.find(t => t.toolId === 'haushalt' && t.haushaltRoomId === room.id && !t.done)
    if (existing) {
      startPoolDrag(existing.id, existing.text, existing.color, existing.duration, e)
      return
    }
    const text     = `${room.icon} ${room.name}`
    const duration = Math.max(uncoveredTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0), 30)
    const canDrop  = duration > 30
      ? (key) => {
          if (key === 'pool') return true
          const blocking = getDurationKeys(key, duration).slice(1).filter(k => todaySlots[k])
          return blocking.length === 0 ? true : blocking
        }
      : null
    startDrag(text, haushaltColor, (dropKey) => {
      const newTodo = createBlock({
        text,
        duration,
        subItems:        uncoveredTasks.map(t => ({ id: crypto.randomUUID(), text: t.text, done: false })),
        color:           haushaltColor,
        toolId:          'haushalt',
        haushaltRoomId:  room.id,
        haushaltTaskIds: uncoveredTasks.map(t => t.id),
        priority:        room.priority ?? 3,
      })
      setTodos(prev => [...prev, newTodo])
      handleSetSlot(dropKey, { text, todoId: newTodo.id, color: haushaltColor, duration, locked: false, done: false })
    }, e, canDrop, duration)
  }, [todos, todaySlots, startDrag, startPoolDrag, setTodos, handleSetSlot])

  const startReminderDrag = useCallback((item, reminderColor, e) => {
    const text     = item.text
    const duration = 30
    startDrag(text, reminderColor, (dropKey) => {
      const newTodo = createBlock({ text, priority: 2, color: reminderColor, category: 'Selfcare', reminderItemId: item.id, toolId: 'reminder', duration })
      setTodos(prev => [...prev, newTodo])
      if (dropKey !== 'pool') {
        handleSetSlot(dropKey, { text, todoId: newTodo.id, color: reminderColor, duration, locked: false, done: false })
      }
    }, e, null, duration)
  }, [startDrag, setTodos, handleSetSlot])

  const startBirthdayDrag = useCallback((chip, chipColor, e, bulkChips) => {
    // Bulk-Add in Pool (Masse-Hinzufügen-Button)
    if (!chip && bulkChips) {
      const newTodos = bulkChips.map(c =>
        createBlock({
          text:           c.text,
          priority:       c.type === 'birthday' ? 2 : 3,
          color:          c.color,
          toolId:         'geburtstage',
          birthdayChipId: `${c.type}-${c.birthday.id}`,
        })
      )
      setTodos(prev => [...prev, ...newTodos])
      // Geburtstags-Chips: plannedYear setzen
      const currentYear = new Date().getFullYear()
      const bChips = bulkChips.filter(c => c.type === 'birthday')
      if (bChips.length > 0) {
        setBirthdays(prev => prev.map(b => {
          const hit = bChips.find(c => c.birthday.id === b.id)
          return hit ? { ...b, plannedYear: currentYear } : b
        }))
      }
      return
    }

    startDrag(chip.text, chipColor, (dropKey) => {
      const newTodo = createBlock({
        text:           chip.text,
        priority:       chip.type === 'birthday' ? 2 : 3,
        color:          chipColor,
        toolId:         'geburtstage',
        birthdayChipId: `${chip.type}-${chip.birthday.id}`,
      })
      setTodos(prev => [...prev, newTodo])
      if (dropKey !== 'pool') {
        handleSetSlot(dropKey, { text: chip.text, todoId: newTodo.id, color: chipColor, locked: false, done: false })
        // Geburtstags-Chip in Zeitplan platziert → Kalender-Entry ausblenden
        if (chip.type === 'birthday') {
          const currentYear = new Date().getFullYear()
          setBirthdays(prev => prev.map(b =>
            b.id === chip.birthday.id ? { ...b, plannedYear: currentYear } : b
          ))
        }
      }
    }, e, null)
  }, [startDrag, setTodos, handleSetSlot, setBirthdays])

  const startSlotDrag = useCallback((fromKey, e) => {
    const slot = todaySlots[fromKey]
    if (!slot || slot.locked) return
    const dur = slot.duration || 30
    const canDrop = dur > 30
      ? (toKey) => {
          if (toKey === 'pool') return true
          const blocking = getDurationKeys(toKey, dur).slice(1).filter(k => k !== fromKey && todaySlots[k])
          return blocking.length === 0 ? true : blocking
        }
      : null
    startDrag(slot.text, slot.color || '#8B5CF6', (toKey) => {
      if (toKey === 'pool') {
        handleRemoveSlot(fromKey, 'back')
        return
      }
      if (toKey === fromKey) return
      setTodaySlots(prev => {
        const ns    = { ...prev }
        const entry = ns[fromKey]
        delete ns[fromKey]
        ns[toKey] = entry
        return ns
      })
      // Uhrzeit im Todo aktualisieren — wie in der Wochenansicht
      if (slot.todoId) {
        const todo = todos.find(t => t.id === slot.todoId)
        if (todo?.time) {
          const hh = String(Math.floor(parseFloat(toKey))).padStart(2, '0')
          const mm = parseFloat(toKey) % 1 ? '30' : '00'
          setTodos(prev => prev.map(t =>
            t.id === slot.todoId ? { ...t, time: `${hh}:${mm}` } : t
          ))
        }
      }
    }, e, canDrop, slot.duration || 30)
  }, [startDrag, todaySlots, setTodaySlots, handleRemoveSlot, todos, setTodos])

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
      {heuteModus === 'fokus' ? (
        <FokusView
          viewDate={viewDate}
          todaySlots={todaySlots}
          todos={todos}
          onToggleSlotDone={handleToggleSlotDone}
          onToggleTodoDone={handleToggleDone}
          onShowFull={() => setHeuteModus('voll')}
        />
      ) : (
        <div ref={swipeRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          onExpandUpTo={handleExpandUpTo}
          onExpandDownTo={handleExpandDownTo}
          onExpandUp={handleExpandUp}
          onExpandDown={handleExpandDown}
          onRemoveHour={handleRemoveHour}
          onShiftAll={handleShiftAll}
          onToggleLock={handleToggleLock}
          onFokusMode={() => setHeuteModus('fokus')}
          registerHalf={registerHalf}
          startSlotDrag={startSlotDrag}
          blockers={blockers}
          onCreateBlocker={handleCreateBlocker}
          onEditBlocker={handleEditBlocker}
          onToggleBlockerLocked={handleToggleBlockerLocked}
          birthdayPills={birthdays}
          birthdayPillsDate={viewDate}
        />
        <Pool
          todos={todos}
          setTodos={setTodos}
          todaySlots={todaySlots}
          viewDate={viewDate}
          onToggleDone={handleToggleDone}
          onEdit={handleEdit}
          onRemove={handleRemove}
          startDrag={startPoolDrag}
          onDoneCalendar={handleDoneCalendar}
          onKlaeren={(todo) => setKlaerenTodo(todo)}
          registerHalf={registerHalf}
        />
        {(() => {
          const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, garten: GartenSection, gewicht: GewichtSection, geburtstage: BirthdaySection, kognitiv: KognitivSection, wachstum: WachstumSection, rezepte: MealprepSection }
          const SECTION_PROPS = {
            haushalt:    { onStartDrag: startHaushaltDrag },
            reminder:    { onStartDrag: startReminderDrag },
            geburtstage: { onStartDrag: startBirthdayDrag },
          }
          return activeTools
            .filter(id => SECTIONS[id])
            .map(id => { const Sec = SECTIONS[id]; return <Sec key={id} {...(SECTION_PROPS[id] ?? {})} /> })
        })()}
        </div>
      )}

      {editingTodo && (
        <TodoModal
          existingTodo={editingTodo}
          onClose={() => setEditingTodo(null)}
        />
      )}

      {klaerenTodo && (
        <KlaerenModal
          todo={klaerenTodo}
          onClose={() => setKlaerenTodo(null)}
          onSave={(upd) => {
            setTodos(prev => prev.map(t => t.id === upd.id ? upd : t))
            setKlaerenTodo(null)
          }}
          onDelete={(id) => {
            setTodos(prev => prev.filter(t => t.id !== id))
            setKlaerenTodo(null)
          }}
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
