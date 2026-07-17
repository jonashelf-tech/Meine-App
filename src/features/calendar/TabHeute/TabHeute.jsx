import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, dateKey, skLabel } from '../../../utils'
import { TOOL_TAB } from '../../tools/toolTabs'
import { sv, lv, SK } from '../../../storage'
import { useDragDrop } from '../../../hooks/useDragDrop'
import Zeitplan            from '../Zeitplan/Zeitplan'
import Tagesliste          from '../Tagesliste/Tagesliste'
import CockpitBar          from './CockpitBar'
import SlotSheet           from '../Zeitplan/SlotSheet'
import Pool                from '../Pool/Pool'
import TodoModal           from '../../../components/TodoModal/TodoModal'
import ReminderSection     from '../../tools/reminder/ReminderSection'
import HaushaltSection     from '../../tools/haushalt/HaushaltSection'
import GartenSection       from '../../tools/garten/GartenSection'
import GrowthSection       from '../../tools/growth/GrowthSection'
import FitnessSection     from '../../tools/fitness/FitnessSection'
import BirthdaySection    from '../../tools/geburtstage/BirthdaySection'
import MealprepSection    from '../../tools/rezepte/MealprepSection'
import MissedReviewModal   from '../Zeitplan/MissedReviewModal'
import DayNav              from '../../../components/DayNav/DayNav'
import BlockerModal        from '../Blocker/BlockerModal'
import KlaerenModal        from '../../tools/klaeren/KlaerenModal'
import RepeatDeleteSheet   from '../Blocker/RepeatDeleteSheet'
import { loadHaushalt, saveHaushalt, markTaskDone as haushaltMarkDone } from '../../tools/haushalt/haushaltData'
import { setReminderLastAdded } from '../../tools/reminder/reminderData'
import { useTimeEvents } from './useTimeEvents'
import { useKognitivScheduleSlots } from './useKognitivScheduleSlots'
import { useSlotMutations } from './useSlotMutations'
import { useBlockerActions } from './useBlockerActions'
import { useTagesplanerDrag } from './useTagesplanerDrag'
import KognitivSection from '../../tools/kognitiv/KognitivSection'
import { usePageSwipe } from '../../../hooks/usePageSwipe'
import ProjekteView from '../../projekte/ProjekteView'
import s from './TabHeute.module.css'

export default function TabHeute() {
  const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate, setCalendarDate, blockers, setBlockers, birthdays, setBirthdays, heuteModus, setHeuteModus, setTimerAutoStart, projects, setBackInterceptor } = useAppStore()

  const [viewDate, setViewDate] = useState(() => dayplanDate ?? todayKey())
  const [editingTodo,       setEditingTodo]       = useState(null)
  const [klaerenTodo,       setKlaerenTodo]       = useState(null)
  const [slotSheet,         setSlotSheet]          = useState(null)  // slotKey | null
  const [createSlot,        setCreateSlot]         = useState(null)  // slotKey | null → TodoModal mit Datum+Zeit
  const [projekteOpen,      setProjekteOpen]       = useState(false)

  const { registerHalf, startDrag, draggingRef } = useDragDrop()

  useKognitivScheduleSlots(viewDate, setDays)

  const {
    todaySlots, setTodaySlots, visStart, visEnd,
    handleToggleSlotDone, handleToggleLock, handleRemoveSlot, handleSetSlot,
    handleBandExpand, handleBandShrink, handleShiftAll,
  } = useSlotMutations({ viewDate, days, setDays, setTodos })

  const {
    blockerModal, setBlockerModal, repeatDeleteSheet, setRepeatDeleteSheet,
    handleCreateBlocker, handleEditBlocker, handleSaveBlocker, handleDeleteBlocker,
    handleRepeatDeleteThis, handleRepeatDeleteFuture, handleToggleBlockerLocked,
  } = useBlockerActions({ setBlockers, viewDate })

  const { startPoolDrag, startListDrag, startHaushaltDrag, startReminderDrag, startBirthdayDrag, startSlotDrag } =
    useTagesplanerDrag({ startDrag, todaySlots, setTodaySlots, handleSetSlot, handleRemoveSlot, todos, setTodos, viewDate, setBirthdays })

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
    disabled: () => editingTodo !== null || blockerModal !== null || klaerenTodo !== null || teOpen || slotSheet !== null || createSlot !== null || draggingRef.current,
  })

  // ─── Consume dayplanDate on mount ─────────────────────
  useEffect(() => {
    if (dayplanDate) {
      setViewDate(dayplanDate)
      setDayplanDate(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── ProjekteView: Swipe-Back schließt zuerst die Subview ─
  useEffect(() => {
    setBackInterceptor(projekteOpen ? () => setProjekteOpen(false) : null)
    return () => setBackInterceptor(null)
  }, [projekteOpen, setBackInterceptor])

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
  }, [])

  // ─── Todo mutations ───────────────────────────────────────
  // Seiteneffekte (Haushalt/Reminder) bewusst VOR dem setTodos — Updater
  // müssen pure bleiben (React darf sie mehrfach aufrufen).
  const handleToggleDone = useCallback((id) => {
    const todo    = todos.find(t => t.id === id)
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
    setTodos(prev => prev.map(t =>
      t.id === id
        ? { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
        : t
    ))
  }, [todos, setTodos])

  // ─── Kalender-Link ────────────────────────────────────────
  const handleDoneCalendar = useCallback(() => {
    setCalendarDate(viewDate)
    setCurrentTab(1)
  }, [setCurrentTab, setCalendarDate, viewDate])

  // ─── Edit modal ───────────────────────────────────────────
  const handleEdit = useCallback((id) => {
    const todo = todos.find(t => t.id === id)
    if (todo) setEditingTodo(todo)
  }, [todos])

  // ─── Play am Slot → Fokus-Timer vorbefüllt ────────────────
  const handlePlaySlot = useCallback((slotKey, slot) => {
    setTimerAutoStart({
      todoId:   slot.todoId ?? null,
      text:     slot.text,
      color:    slot.color,
      duration: slot.duration || 30,
      date:     viewDate,
      slotKey,
    })
    setCurrentTab(TOOL_TAB.timer)
  }, [setTimerAutoStart, setCurrentTab, viewDate])

  // ─── Slot-Tap-Sheet: leerer Slot → erstellen oder platzieren ──
  const handleSheetPlace = useCallback((todo) => {
    const slotKey = slotSheet
    if (!slotKey) return
    const hh = String(Math.floor(parseFloat(slotKey))).padStart(2, '0')
    const mm = parseFloat(slotKey) % 1 ? '30' : '00'
    handleSetSlot(slotKey, {
      text:     todo.text,
      todoId:   todo.id,
      color:    todo.color ?? null,
      duration: todo.duration || 30,
      locked:   false,
      done:     false,
    })
    setTodos(prev => prev.map(t =>
      t.id === todo.id ? { ...t, date: viewDate, time: `${hh}:${mm}` } : t
    ))
    setSlotSheet(null)
  }, [slotSheet, handleSetSlot, setTodos, viewDate])

  // Zeitlose Todos dieses Tages — Grundlage für Liste, Bilanz und Pool-Filter.
  const dayTodos = useMemo(
    () => todos.filter(t => t.date === viewDate && !t.time && !t.done),
    [todos, viewDate]
  )

  // Zurück in den Pool — für Slot-Chips und für Tages-Todos derselbe Knopf.
  const handleToPool = useCallback((target) => {
    if (target.slotKey) { handleRemoveSlot(target.slotKey, 'back'); return }
    setTodos(prev => prev.map(t =>
      t.id === target.todoId ? { ...t, date: null, time: null, dayRank: null } : t
    ))
  }, [handleRemoveSlot, setTodos])

  return (
    <div className={s.page}>
      {projekteOpen ? (
        <ProjekteView onBack={() => setProjekteOpen(false)} />
      ) : (
        <>
        <DayNav
          date={viewDate}
          onChange={setViewDate}
          onCalendarOpen={() => { setCalendarDate(viewDate); setCurrentTab(1) }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Nur die Tagesansicht swipt beim Tageswechsel — Pool + Dashboards sind
            datumsunabhängig und bleiben stehen (sonst wandert Unverändertes mit). */}
        <div ref={swipeRef}>
        <CockpitBar
          viewDate={viewDate}
          slots={todaySlots}
          dayTodos={dayTodos}
          modus={heuteModus}
          onModus={setHeuteModus}
          onShiftAll={handleShiftAll}
          onCreateBlocker={handleCreateBlocker}
        />
        {heuteModus === 'liste' ? (
          <Tagesliste
            viewDate={viewDate}
            slots={todaySlots}
            todos={todos}
            setTodos={setTodos}
            blockers={blockers}
            onToggleSlotDone={handleToggleSlotDone}
            onToggleTodoDone={handleToggleDone}
            onEditTodo={handleEdit}
            onPlaySlot={handlePlaySlot}
            onSaveSlot={handleSetSlot}
            onToPool={handleToPool}
            onEditBlocker={handleEditBlocker}
            onToggleBlockerLocked={handleToggleBlockerLocked}
            registerHalf={registerHalf}
            startDrag={startListDrag}
          />
        ) : (
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
            onTapExpand={handleBandExpand}
            onTapShrink={handleBandShrink}
            onToggleLock={handleToggleLock}
            onPlaySlot={handlePlaySlot}
            onToPool={handleToPool}
            onEmptyTap={setSlotSheet}
            registerHalf={registerHalf}
            startSlotDrag={startSlotDrag}
            blockers={blockers}
            onEditBlocker={handleEditBlocker}
            onToggleBlockerLocked={handleToggleBlockerLocked}
            birthdayPills={birthdays}
            birthdayPillsDate={viewDate}
          />
        )}
        </div>
        <Pool
          todos={todos}
          setTodos={setTodos}
          todaySlots={todaySlots}
          viewDate={viewDate}
          excludeDate={heuteModus === 'liste' ? viewDate : null}
          onToggleDone={handleToggleDone}
          onEdit={handleEdit}
          startDrag={heuteModus === 'liste' ? startListDrag : startPoolDrag}
          onDoneCalendar={handleDoneCalendar}
          onKlaeren={activeTools.includes('klaeren') ? (todo) => setKlaerenTodo(todo) : undefined}
          registerHalf={registerHalf}
          projects={projects}
          onOpenProjekte={() => setProjekteOpen(true)}
        />
        {(() => {
          const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, garten: GartenSection, fitness: FitnessSection, geburtstage: BirthdaySection, kognitiv: KognitivSection, growth: GrowthSection, rezepte: MealprepSection }
          const SECTION_PROPS = {
            haushalt:    { onStartDrag: startHaushaltDrag },
            reminder:    { onStartDrag: startReminderDrag },
            geburtstage: { onStartDrag: startBirthdayDrag },
          }
          const secs = activeTools
            .filter(id => SECTIONS[id])
            .map(id => { const Sec = SECTIONS[id]; return <Sec key={id} {...(SECTION_PROPS[id] ?? {})} /> })
          return secs.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{secs}</div>
            : null
        })()}
        </div>
        </>
      )}

      {editingTodo && (
        <TodoModal
          existingTodo={editingTodo}
          onClose={() => setEditingTodo(null)}
        />
      )}

      {slotSheet && (
        <SlotSheet
          slotKey={slotSheet}
          todos={todos}
          todaySlots={todaySlots}
          onPlace={handleSheetPlace}
          onCreateNew={() => { setCreateSlot(slotSheet); setSlotSheet(null) }}
          onClose={() => setSlotSheet(null)}
        />
      )}

      {createSlot && (
        <TodoModal
          prefill={{ date: viewDate, time: skLabel(createSlot) }}
          onClose={() => setCreateSlot(null)}
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
