import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { dateKey as toDateKey } from '../../../utils'
import { lv, sv, SK } from '../../../storage'
import { loadEntries } from '../../tools/gewicht/gewichtData'
import { loadSessions as loadKognitivSessions } from '../../tools/kognitiv/sessionStore'
import NavPill from '../../../components/NavPill/NavPill'
import { usePageSwipe } from '../../../hooks/usePageSwipe'
import { MONTH_NAMES, getMonday, addDays } from './kalenderShared'
import WocheView from './WocheView'
import MonatView from './MonatView'
import s from './TabKalender.module.css'

// Orchestrator: Ansicht-Umschaltung, Navigation, Toggles.
// Die eigentlichen Ansichten leben in WocheView / MonatView / DayPanel.
export default function TabKalender() {
  const { days, todos, birthdays = [], activeTools = [], toolColors = {}, setCurrentTab, setDayplanDate, setGrowthOpenDate, setTodos, setDays, calendarDate, setCalendarDate } = useAppStore()
  const [view, setView] = useState(() => lv(SK.calView, 'woche'))
  const handleSetView = (v) => { sv(SK.calView, v); setView(v) }
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayKey = toDateKey(today)

  const [weekStart, setWeekStart]     = useState(() => getMonday(today))
  const [monthRef, setMonthRef]       = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const [showTermine, setShowTermine] = useState(true)
  const [showTodos,   setShowTodos]   = useState(true)
  const [showTools,   setShowTools]   = useState(false)
  const [restoreTodo, setRestoreTodo] = useState(null)

  const weightEntries    = useMemo(() => loadEntries(), [])
  const kognitivSessions = useMemo(() => loadKognitivSessions(), [])

  // Vom WocheView gesetzt — deaktiviert Page-Swipe während eines Block-Drags
  const weekDraggingRef = useRef(null)

  const kalenderSwipeRef = useRef(null)
  usePageSwipe(kalenderSwipeRef, {
    onPrev: view === 'woche'
      ? () => setWeekStart(d => addDays(d, -7))
      : () => setMonthRef(r => {
          const m = r.month === 0 ? 11 : r.month - 1
          const y = r.month === 0 ? r.year - 1 : r.year
          return { year: y, month: m }
        }),
    onNext: view === 'woche'
      ? () => setWeekStart(d => addDays(d, 7))
      : () => setMonthRef(r => {
          const m = r.month === 11 ? 0 : r.month + 1
          const y = r.month === 11 ? r.year + 1 : r.year
          return { year: y, month: m }
        }),
    disabled: () => restoreTodo !== null || weekDraggingRef.current !== null,
  })

  // Intent von außen (DayPanel-Link, Tagesplaner-Datum) einmalig konsumieren
  useEffect(() => {
    if (!calendarDate) return
    const [yr, mo, d] = calendarDate.split('-').map(Number)
    if (view === 'monat') {
      setMonthRef({ year: yr, month: mo - 1 })
    } else {
      setWeekStart(getMonday(new Date(yr, mo - 1, d)))
    }
    setSelectedDay(calendarDate)
    setCalendarDate(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRestore = (todo) => {
    setTodos(prev => prev.map(t =>
      t.id === todo.id
        ? { ...t, done: false, doneAt: null, date: null, time: null }
        : t
    ))
    setRestoreTodo(null)
  }

  const handleDayClick = (dateKey) => {
    if (restoreTodo) return
    setSelectedDay(dateKey)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek  = weekDays.some(d => toDateKey(d) === todayKey)
  const isCurrentMonth = monthRef.year === today.getFullYear() && monthRef.month === today.getMonth()

  return (
    <div className={s.page}>
      {view === 'woche' ? (
        <NavPill
          label={`${addDays(weekStart, 0).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          onPrev={() => setWeekStart(d => addDays(d, -7))}
          onNext={() => setWeekStart(d => addDays(d, 7))}
          isCurrent={isCurrentWeek}
          leftGlows={!isCurrentWeek && toDateKey(weekStart) > toDateKey(getMonday(today))}
          rightGlows={!isCurrentWeek && toDateKey(weekStart) < toDateKey(getMonday(today))}
          onLabelDoubleClick={isCurrentWeek ? undefined : () => setWeekStart(getMonday(today))}
        />
      ) : (
        <NavPill
          label={`${MONTH_NAMES[monthRef.month]} ${monthRef.year}`}
          onPrev={() => setMonthRef(r => {
              const m = r.month === 0 ? 11 : r.month - 1
              const y = r.month === 0 ? r.year - 1 : r.year
              return { year: y, month: m }
            })}
          onNext={() => setMonthRef(r => {
              const m = r.month === 11 ? 0 : r.month + 1
              const y = r.month === 11 ? r.year + 1 : r.year
              return { year: y, month: m }
            })}
          isCurrent={isCurrentMonth}
          leftGlows={monthRef.year > today.getFullYear() || (monthRef.year === today.getFullYear() && monthRef.month > today.getMonth())}
          rightGlows={monthRef.year < today.getFullYear() || (monthRef.year === today.getFullYear() && monthRef.month < today.getMonth())}
          onLabelDoubleClick={isCurrentMonth ? undefined : () => setMonthRef({ year: today.getFullYear(), month: today.getMonth() })}
        />
      )}

      <div className={s.segmented}>
        <button
          className={[s.seg, view === 'woche' ? s.segActive : ''].join(' ')}
          onClick={() => handleSetView('woche')}
        >
          Woche
        </button>
        <button
          className={[s.seg, view === 'monat' ? s.segActive : ''].join(' ')}
          onClick={() => handleSetView('monat')}
        >
          Monat
        </button>
      </div>

      <div ref={kalenderSwipeRef}>
        {view === 'woche' && (
          <WocheView
            weekStart={weekStart}
            todayKey={todayKey}
            days={days} setDays={setDays}
            todos={todos} setTodos={setTodos}
            birthdays={birthdays}
            activeTools={activeTools}
            toolColors={toolColors}
            weightEntries={weightEntries}
            kognitivSessions={kognitivSessions}
            showTermine={showTermine}
            showTodos={showTodos}
            showTools={showTools}
            draggingRef={weekDraggingRef}
          />
        )}

        {view === 'monat' && (
          <MonatView
            monthRef={monthRef}
            todayKey={todayKey}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
            days={days}
            todos={todos} setTodos={setTodos}
            birthdays={birthdays}
            activeTools={activeTools}
            toolColors={toolColors}
            weightEntries={weightEntries}
            kognitivSessions={kognitivSessions}
            showTermine={showTermine}
            showTodos={showTodos}
            showTools={showTools}
            setCurrentTab={setCurrentTab}
            setDayplanDate={setDayplanDate}
            setGrowthOpenDate={setGrowthOpenDate}
            restoreTodo={restoreTodo}
            setRestoreTodo={setRestoreTodo}
            handleRestore={handleRestore}
          />
        )}
      </div>

      <div className={s.toggleStrip}>
        <button
          className={[s.toggleChip, s.toggleChipTermine, showTermine ? s.toggleChipOn : ''].join(' ')}
          onClick={() => setShowTermine(v => !v)}
        >
          Termine
        </button>
        <button
          className={[s.toggleChip, s.toggleChipTodos, showTodos ? s.toggleChipOn : ''].join(' ')}
          onClick={() => setShowTodos(v => !v)}
        >
          Todos
        </button>
        <button
          className={[s.toggleChip, s.toggleChipTools, showTools ? s.toggleChipOn : ''].join(' ')}
          onClick={() => setShowTools(v => !v)}
        >
          Tools
        </button>
      </div>
    </div>
  )
}
