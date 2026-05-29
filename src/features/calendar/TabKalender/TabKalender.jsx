import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { dateKey as toDateKey, getDaysInMonth, getFirstDayOfMonth, getToolColor } from '../../../utils'
import { lv, sv, SK } from '../../../storage'
import { getBirthdaysForCalendarDate, formatBirthdayDate } from '../../tools/geburtstage/birthdayUtils'
import { loadEntries } from '../../tools/gewicht/gewichtData'
import { loadSessions as loadKognitivSessions } from '../../tools/kognitiv/sessionStore'
import { TOOL_TAB } from '../../tools/toolTabs'
import NavPill from '../../../components/NavPill/NavPill'
import { usePageSwipe } from '../../../hooks/usePageSwipe'
import TodoModal from '../../../components/TodoModal/TodoModal'
import s from './TabKalender.module.css'

const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const SLOT_H = 28

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function slotToTop(slotKey, start) {
  return (parseFloat(slotKey) - start) * 2 * SLOT_H
}

function slotToHeight(duration) {
  return Math.max(10, Math.round(((duration ?? 30) / 30) * SLOT_H))
}

function getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions) {
  const dots = []

  if (activeTools.includes('gewicht')) {
    if (weightEntries.some(e => e.date === dk))
      dots.push({ id: 'gewicht', color: getToolColor('gewicht', toolColors) })
  }

  if (activeTools.includes('haushalt')) {
    if (todos.some(t => t.toolId === 'haushalt' && t.createdAt?.startsWith(dk)))
      dots.push({ id: 'haushalt', color: getToolColor('haushalt', toolColors) })
  }

  if (activeTools.includes('reminder')) {
    const hasTodo = todos.some(t => t.reminderItemId && t.createdAt?.startsWith(dk))
    const hasSlot = Object.values(days[dk] ?? {}).some(s => s.reminderItemId)
    if (hasTodo || hasSlot)
      dots.push({ id: 'reminder', color: getToolColor('reminder', toolColors) })
  }

  if (activeTools.includes('kognitiv') && kognitivSessions) {
    if (kognitivSessions.some(s => s.date === dk))
      dots.push({ id: 'kognitiv', color: getToolColor('kognitiv', toolColors) })
  }

  return dots
}

function getCellBars(dk, days, todos, showTools) {
  const slots = days[dk] ?? {}
  return Object.entries(slots)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([, slot]) => {
      const todo   = slot.todoId ? todos.find(t => t.id === slot.todoId) : null
      const isTool = Boolean(todo?.toolId)
      return { text: slot.text, color: slot.color || 'var(--primary)', isTodo: Boolean(slot.todoId), isTool }
    })
    .filter(bar => showTools || !bar.isTool)
}

// ─── Day Panel ────────────────────────────────────────────
function DayPanel({ dateKey, todayKey, days, todos, activeTools, toolColors, birthdays = [], weightEntry, setCurrentTab, setDayplanDate, setTodos, restoreTodo, setRestoreTodo, handleRestore }) {
  const [open, setOpen] = useState({ zeitplan: true, done: false, gewicht: true })

  const birthdayEntries = getBirthdaysForCalendarDate(birthdays, dateKey)

  const slots = days[dateKey] ?? {}
  const sortedSlots = Object.entries(slots)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))

  const doneTodos = todos.filter(t => t.doneAt?.startsWith(dateKey))

  const [y, m, d] = dateKey.split('-')
  const dateObj  = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  const dayName  = dateObj.toLocaleDateString('de-DE', { weekday: 'long' })
  const label    = `${dayName}, ${d}.${m}.${y}`

  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  const totalZeitplan = sortedSlots.length + birthdayEntries.length

  return (
    <div className={s.dayPanel}>
      <div className={s.dayPanelHeader}>
        <span
          className={[s.dayPanelDate, s.dayPanelDateLink].join(' ')}
          onClick={() => { setDayplanDate(dateKey); setCurrentTab(0) }}
        >
          {label}
        </span>
        {dateKey === todayKey && <span className={s.todayBadge}>heute</span>}
      </div>

      {/* Zeitplan */}
      <div className={s.dayPanelSection}>
        <button className={s.dayPanelSectionHead} onClick={() => toggle('zeitplan')}>
          <span className={s.dayPanelSectionLabel}>Zeitplan</span>
          {totalZeitplan > 0 && (
            <span className={s.dayPanelSectionCount}>{totalZeitplan}</span>
          )}
          <span className={s.dayPanelArrow}>{open.zeitplan ? '▾' : '▸'}</span>
        </button>
        {open.zeitplan && (
          <div className={s.dayPanelList}>
            {birthdayEntries.map(b => (
              <div key={b.id} className={s.dayPanelAlldayEntry}>
                <span className={s.dayPanelAlldayStar}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#FF2D78" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/>
                  </svg>
                </span>
                <span className={s.dayPanelAlldayName}>{b.name} Geburtstag</span>
                <span className={s.dayPanelAlldayDate}>{formatBirthdayDate(b.date)}</span>
              </div>
            ))}
            {sortedSlots.length === 0 && birthdayEntries.length === 0 ? (
              <p className={s.dayPanelEmpty}>Keine Termine</p>
            ) : sortedSlots.map(([key, slot]) => {
              const hh     = String(Math.floor(parseFloat(key))).padStart(2, '0')
              const mm     = parseFloat(key) % 1 ? '30' : '00'
              const isTodo = Boolean(slot.todoId)
              const color  = slot.color || 'var(--primary)'
              return (
                <div
                  key={key}
                  className={[s.dayPanelEntry, isTodo ? s.dayPanelEntryTodo : ''].join(' ')}
                  style={{ borderLeftColor: color }}
                >
                  <span className={s.dayPanelEntryTime} style={{ color }}>{hh}:{mm}</span>
                  <span className={s.dayPanelEntryText}>{slot.text}</span>
                  {isTodo && <span className={s.dayPanelBadge}>Todo</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Abgehakte Todos */}
      <div className={s.dayPanelSection}>
        <button className={s.dayPanelSectionHead} onClick={() => toggle('done')}>
          <span className={s.dayPanelSectionLabel}>Erledigt</span>
          {doneTodos.length > 0 && (
            <span className={s.dayPanelSectionCount}>{doneTodos.length}</span>
          )}
          <span className={s.dayPanelArrow}>{open.done ? '▾' : '▸'}</span>
        </button>
        {open.done && (
          <div className={s.dayPanelList}>
            {doneTodos.length === 0 ? (
              <p className={s.dayPanelEmpty}>Keine erledigten Todos</p>
            ) : doneTodos.map(t => (
              <div
                key={t.id}
                className={s.dayPanelTodoEntry}
                style={{ borderLeftColor: t.color || 'var(--primary)' }}
                onClick={() => setRestoreTodo(t)}
              >
                <span className={s.dayPanelCheck}>✓</span>
                <span className={s.dayPanelEntryText}>{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gewicht — nur wenn Eintrag für diesen Tag */}
      {weightEntry && (
        <div className={s.dayPanelSection}>
          <button className={s.dayPanelSectionHead} onClick={() => toggle('gewicht')}>
            <span className={s.dayPanelSectionLabel}>Gewicht</span>
            <span className={s.dayPanelArrow}>{open.gewicht ? '▾' : '▸'}</span>
          </button>
          {open.gewicht && (
            <div className={s.dayPanelGewichtRow}>
              <span className={s.dayPanelGewichtIcon}>⚖️</span>
              <span className={s.dayPanelGewichtVal}>{weightEntry.kg} kg</span>
              {weightEntry.kcal && (
                <span className={s.dayPanelGewichtKcal}>{weightEntry.kcal.toLocaleString('de-DE')} kcal</span>
              )}
              <button
                className={s.dayPanelGewichtLink}
                onClick={() => setCurrentTab(TOOL_TAB.gewicht)}
              >
                → Gewicht
              </button>
            </div>
          )}
        </div>
      )}

      {/* Restore-Modal */}
      {restoreTodo && (
        <div className={s.restoreOverlay} onClick={() => setRestoreTodo(null)}>
          <div className={s.restoreModal} onClick={e => e.stopPropagation()}>
            <p className={s.restoreTitle}>Wiederherstellen?</p>
            <p className={s.restoreText}>{restoreTodo.text}</p>
            <div className={s.restoreActions}>
              <button className={s.restoreBtnYes} onClick={() => handleRestore(restoreTodo)}>
                Ja
              </button>
              <button className={s.restoreBtnNo} onClick={() => setRestoreTodo(null)}>
                Nein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WeekPillStrip({ days, weekDays, visibleStart, visibleEnd, isTop, onExpand, onShrink, onExpandTo }) {
  const outSlots = []
  for (const date of weekDays) {
    const dk    = toDateKey(date)
    const slots = days[dk] ?? {}
    for (const [key, slot] of Object.entries(slots)) {
      if (!slot) continue
      const h = Math.floor(parseFloat(key))
      if (isTop ? h < visibleStart : h >= visibleEnd) {
        const hh = String(Math.floor(parseFloat(key))).padStart(2, '0')
        const mm = parseFloat(key) % 1 ? '30' : '00'
        outSlots.push({ key: `${dk}-${key}`, time: `${hh}:${mm}`, text: slot.text, h })
      }
    }
  }
  outSlots.sort((a, b) => a.h - b.h)

  const emptyText = isTop
    ? `Keine Termine vor ${String(visibleStart).padStart(2, '0')}:00`
    : `Keine Termine nach ${String(visibleEnd).padStart(2, '0')}:00`

  return (
    <div className={[s.weekPillStrip, isTop ? '' : s.weekPillStripBot].join(' ')}>
      <button className={s.weekPillBtn} onClick={onShrink}>−</button>
      <div className={s.weekPillChips}>
        {outSlots.length === 0
          ? <span className={s.weekPillEmpty}>{emptyText}</span>
          : outSlots.map(slot => (
              <div key={slot.key} className={s.weekPillChip} onClick={() => onExpandTo(slot.h)}>
                {slot.time} {slot.text}
              </div>
            ))
        }
      </div>
      <button className={s.weekPillBtn} onClick={onExpand}>+</button>
    </div>
  )
}

const TERMIN_COLORS = [
  { value: '#8B5CF6', label: 'Lila'  },
  { value: '#FB7185', label: 'Rot'   },
  { value: '#F59E0B', label: 'Gelb'  },
  { value: '#10B981', label: 'Grün'  },
  { value: '#06B6D4', label: 'Cyan'  },
]

function WeekTerminEditModal({ dk, slotKey, slot, onSave, onClose }) {
  const [text,     setText]     = useState(slot.text     ?? '')
  const [duration, setDuration] = useState(slot.duration ?? 30)
  const [color,    setColor]    = useState(slot.color    ?? '#8B5CF6')

  const handleSave = () => {
    if (!text.trim()) return
    onSave(dk, slotKey, { ...slot, text: text.trim(), duration, color })
  }

  return (
    <div className={s.terminOverlay} onClick={onClose}>
      <div className={s.terminCard} onClick={e => e.stopPropagation()}>
        <p className={s.terminTitle}>Termin bearbeiten</p>

        <input
          className={s.terminInput}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Bezeichnung"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
        />

        <div>
          <span className={s.terminLabel}>Dauer</span>
          <div className={s.terminDurRow}>
            {[15, 30, 60, 90].map(v => (
              <button
                key={v}
                className={[s.terminDurBtn, duration === v ? s.terminDurBtnActive : ''].join(' ')}
                onClick={() => setDuration(v)}
              >
                {v < 60 ? `${v}m` : `${v / 60}h`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={s.terminLabel}>Farbe</span>
          <div className={s.terminColorRow}>
            {TERMIN_COLORS.map(c => (
              <button
                key={c.value}
                className={[s.terminColorDot, color === c.value ? s.terminColorDotActive : ''].join(' ')}
                style={{ background: c.value }}
                onClick={() => setColor(c.value)}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        <div className={s.terminActions}>
          <button className={s.terminBtnSave} onClick={handleSave}>Speichern</button>
          <button className={s.terminBtnCancel} onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

export default function TabKalender() {
  const { days, todos, birthdays = [], activeTools = [], toolColors = {}, setCurrentTab, setDayplanDate, setTodos, setDays, calendarDate, setCalendarDate } = useAppStore()
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
  const [visibleStart, setVisibleStart] = useState(() => lv(SK.weekVisStart, 7))
  const [visibleEnd,   setVisibleEnd]   = useState(() => lv(SK.weekVisEnd,   21))

  const [editingTodo,   setEditingTodo]   = useState(null)
  const [editingTermin, setEditingTermin] = useState(null)
  const [quickCreate,   setQuickCreate]   = useState(null)
  const [flashingSlotKey, setFlashingSlotKey] = useState(null)
  const [clickRipple,     setClickRipple]     = useState(null)
  const [dragging,        setDragging]        = useState(null)
  const [dragTarget,      setDragTarget]      = useState(null)
  const draggingRef   = useRef(null)
  const dragTargetRef = useRef(null)
  const clickTimers   = useRef({})

  const handleToggleSlotDone = (dk, key, slot, slotTodo) => {
    const compositeKey = `${dk}-${key}`
    if (slot.todoId && slotTodo) {
      const nowDone = !slotTodo.done
      if (nowDone) {
        setFlashingSlotKey(compositeKey)
        setTimeout(() => setFlashingSlotKey(k => k === compositeKey ? null : k), 650)
      }
      setTodos(prev => prev.map(t =>
        t.id === slotTodo.id
          ? { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
          : t
      ))
    } else {
      const nowDone = !slot.done
      if (nowDone) {
        setFlashingSlotKey(compositeKey)
        setTimeout(() => setFlashingSlotKey(k => k === compositeKey ? null : k), 650)
      }
      setDays(prev => ({
        ...prev,
        [dk]: { ...prev[dk], [key]: { ...slot, done: nowDone } },
      }))
    }
  }

  const handleSaveTermin = (dk, slotKey, updatedSlot) => {
    setDays(prev => ({
      ...prev,
      [dk]: { ...prev[dk], [slotKey]: updatedSlot },
    }))
    setEditingTermin(null)
  }

  const expandStart = () => {
    const v = Math.max(0, visibleStart - 1)
    sv(SK.weekVisStart, v); setVisibleStart(v)
  }
  const shrinkStart = () => {
    const v = Math.min(visibleEnd - 1, visibleStart + 1)
    sv(SK.weekVisStart, v); setVisibleStart(v)
  }
  const expandEnd = () => {
    const v = Math.min(24, visibleEnd + 1)
    sv(SK.weekVisEnd, v); setVisibleEnd(v)
  }
  const shrinkEnd = () => {
    const v = Math.max(visibleStart + 1, visibleEnd - 1)
    sv(SK.weekVisEnd, v); setVisibleEnd(v)
  }
  const expandToStart = (h) => {
    const v = Math.min(visibleStart, h)
    sv(SK.weekVisStart, v); setVisibleStart(v)
  }
  const expandToEnd = (h) => {
    const v = Math.max(visibleEnd, h + 1)
    sv(SK.weekVisEnd, v); setVisibleEnd(v)
  }
  const [restoreTodo, setRestoreTodo] = useState(null)
  const weightEntries   = useMemo(() => loadEntries(), [])
  const kognitivSessions = useMemo(() => loadKognitivSessions(), [])
  const weekScrollRef  = useRef(null)
  const colRefs        = useRef({})
  const dragJustEnded  = useRef(false)

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
    disabled: restoreTodo !== null,
  })

  useEffect(() => {
    if (view !== 'woche' || !weekScrollRef.current) return
    const scrollTo = Math.max(0, (new Date().getHours() - visibleStart) * 2 * SLOT_H - 80)
    weekScrollRef.current.scrollTop = scrollTo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek  = weekDays.some(d => toDateKey(d) === todayKey)
  const nowTop = useMemo(() => {
    if (!isCurrentWeek) return null
    const n = new Date()
    const h = n.getHours()
    const m = n.getMinutes()
    if (h < visibleStart || h >= visibleEnd) return null
    return ((h - visibleStart) * 60 + m) / 30 * SLOT_H
  }, [isCurrentWeek, visibleStart, visibleEnd])
  const isCurrentMonth = monthRef.year === today.getFullYear() && monthRef.month === today.getMonth()

  const handleDayClick = (dateKey) => {
    if (restoreTodo) return
    setSelectedDay(dateKey)
  }

  const monthCells = useMemo(() => {
    const { year, month } = monthRef
    const total = getDaysInMonth(year, month)
    const startOffset = getFirstDayOfMonth(year, month)
    const cells = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= total; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [monthRef])

  const colHeight = (visibleEnd - visibleStart) * 2 * SLOT_H

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
      {/* ─── WOCHENANSICHT — Zeitgitter ───────────────────────── */}
      {view === 'woche' && (
        <>
          <div className={s.weekWrapper}>
            {/* Spalten-Header */}
            <div className={s.weekHeaderRow}>
              <div className={s.weekTimeCorner} />
              {weekDays.map(date => {
                const dk       = toDateKey(date)
                const isToday  = dk === todayKey
                const toolDots = getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions)
                return (
                  <div key={dk} className={[s.weekDayHead, isToday ? s.weekDayHeadToday : ''].join(' ')}>
                    <span className={s.weekDayHeadName}>
                      {DAY_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                    </span>
                    <span className={s.weekDayHeadNum}>{date.getDate()}</span>
                    {toolDots.length > 0 && (
                      <div className={s.weekDayToolDots}>
                        {toolDots.map(dot => (
                          <span
                            key={dot.id}
                            className={s.toolDot}
                            style={{ background: dot.color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* PillStrip oben */}
            <WeekPillStrip
              days={days}
              weekDays={weekDays}
              visibleStart={visibleStart}
              visibleEnd={visibleEnd}
              isTop={true}
              onExpand={expandStart}
              onShrink={shrinkStart}
              onExpandTo={expandToStart}
            />

            {/* Allday-Streifen — Geburtstage + Todos ohne Uhrzeit */}
            {(showTodos || showTermine) && (
              <div className={s.weekAlldayRow}>
                <div className={s.weekAlldayLabel}>Ganzt.</div>
                {weekDays.map(date => {
                  const dk          = toDateKey(date)
                  const bdays       = getBirthdaysForCalendarDate(birthdays, dk)
                  const alldayTodos = showTodos ? todos.filter(t => t.date === dk && !t.time) : []
                  return (
                    <div key={dk} className={s.weekAlldayCol}>
                      {bdays.map(b => (
                        <div
                          key={b.id}
                          className={s.weekAlldayBar}
                          style={{ background: getToolColor('geburtstage', toolColors) }}
                        >
                          <span className={s.weekAlldayBarText}>{b.name}</span>
                        </div>
                      ))}
                      {alldayTodos.map(t => (
                        <div
                          key={t.id}
                          className={s.weekAlldayBar}
                          style={{ background: t.color || 'var(--primary)' }}
                        >
                          <span className={s.weekAlldayBarText}>{t.text}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Scrollbares Zeitgitter */}
            <div className={s.weekScrollBody} ref={weekScrollRef}>
              <div className={s.weekTimeAxis}>
                {Array.from({ length: (visibleEnd - visibleStart) * 2 }, (_, i) => {
                  const h      = visibleStart + i * 0.5
                  const isHour = h === Math.floor(h)
                  if (!isHour) return <div key={i} className={s.weekTimeLabel} />
                  return (
                    <div key={i} className={s.weekTimeLabel}>
                      {String(Math.floor(h)).padStart(2, '0')}:00
                    </div>
                  )
                })}
              </div>
              <div className={s.weekColsBody}>
                {weekDays.map(date => {
                  const dk    = toDateKey(date)
                  const slots = days[dk] ?? {}
                  const isColToday = dk === todayKey
                  const entries = Object.entries(slots).filter(([key]) => {
                    const h = parseFloat(key)
                    return h >= visibleStart && h < visibleEnd
                  })
                  return (
                    <div
                      key={dk}
                      className={[s.weekDayCol, isColToday ? s.weekDayColToday : ''].join(' ')}
                      style={{ height: colHeight }}
                      ref={el => { if (el) colRefs.current[dk] = el }}
                      onClick={(e) => {
                        if (e.target !== e.currentTarget) return
                        if (dragJustEnded.current) return
                        const slotIndex = Math.floor(e.nativeEvent.offsetY / SLOT_H)
                        const h  = visibleStart + slotIndex * 0.5
                        const hh = String(Math.floor(h)).padStart(2, '0')
                        const mm = h % 1 ? '30' : '00'
                        const rect = e.currentTarget.getBoundingClientRect()
                        const rx = e.clientX - rect.left
                        const ry = e.clientY - rect.top
                        const rid = Date.now()
                        setClickRipple({ dk, x: rx, y: ry, id: rid })
                        setTimeout(() => setClickRipple(r => r?.id === rid ? null : r), 420)
                        setQuickCreate({ date: dk, time: `${hh}:${mm}` })
                      }}
                    >
                      {isColToday && nowTop !== null && (
                        <div className={s.weekNowLine} style={{ top: nowTop }}>
                          <div className={s.weekNowDot} />
                        </div>
                      )}
                      {clickRipple?.dk === dk && (
                        <div
                          className={s.weekClickRipple}
                          style={{ left: clickRipple.x, top: clickRipple.y }}
                        />
                      )}
                      {entries.map(([key, slot]) => {
                        const isTodo   = Boolean(slot.todoId)
                        if (!showTermine && !isTodo) return null
                        if (!showTodos   &&  isTodo) return null
                        const slotTodo = slot.todoId ? todos.find(t => t.id === slot.todoId) : null
                        if (!showTools && slotTodo?.toolId) return null
                        const top    = slotToTop(key, visibleStart)
                        const height = slotToHeight(slot.duration)
                        return (
                          <div
                            key={key}
                            className={[
                              s.weekSlotBlock,
                              isTodo ? s.weekSlotTodo : '',
                              (slot.done || slotTodo?.done) ? s.weekSlotDone : '',
                              flashingSlotKey === `${dk}-${key}` ? s.weekSlotDoneFlash : '',
                              (dragging?.dk === dk && dragging?.key === key) ? s.weekSlotDragging : '',
                            ].join(' ')}
                            style={{ top, height, '--slot-color': slot.color || '#8B5CF6' }}
                          >
                            {height >= 14 && <span className={s.weekSlotName}>{slot.text}</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* PillStrip unten */}
            <WeekPillStrip
              days={days}
              weekDays={weekDays}
              visibleStart={visibleStart}
              visibleEnd={visibleEnd}
              isTop={false}
              onExpand={expandEnd}
              onShrink={shrinkEnd}
              onExpandTo={expandToEnd}
            />
          </div>
        </>
      )}

      {/* ─── MONATSANSICHT ────────────────────────────────────── */}
      {view === 'monat' && (
        <>
          <div className={s.monthGrid}>
            {DAY_SHORT.map(d => (
              <div key={d} className={s.monthHeader}>{d}</div>
            ))}
            {monthCells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className={[s.monthCell, s.monthCellEmpty].join(' ')} />
              const dk         = `${monthRef.year}-${String(monthRef.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday    = dk === todayKey
              const isSelected = selectedDay === dk
              const bars       = getCellBars(dk, days, todos, showTools)
              const filtered   = [
                ...(showTermine ? bars.filter(b => !b.isTodo) : []),
                ...(showTodos   ? bars.filter(b =>  b.isTodo) : []),
              ]
              const visible  = filtered.slice(0, 3)
              const overflow = filtered.length - visible.length
              const toolDots = getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions)
              const bdays    = getBirthdaysForCalendarDate(birthdays, dk)

              return (
                <button
                  key={dk}
                  className={[
                    s.monthCell,
                    isToday    ? s.monthCellToday    : '',
                    isSelected ? s.monthCellSelected : '',
                  ].join(' ')}
                  onClick={() => handleDayClick(dk)}
                >
                  <span className={s.monthDay}>{day}</span>
                  {bdays.map(b => (
                    <div
                      key={b.id}
                      className={s.cellBar}
                      style={{ background: getToolColor('geburtstage', toolColors), opacity: 0.85 }}
                    >
                      <span className={s.cellBarText}>{b.name}</span>
                    </div>
                  ))}
                  {visible.map((bar, i) => (
                    <div
                      key={i}
                      className={[s.cellBar, bar.isTodo ? s.cellBarTodo : ''].join(' ')}
                      style={{ background: bar.color }}
                    >
                      <span className={s.cellBarText}>{bar.text}</span>
                    </div>
                  ))}
                  {overflow > 0 && <span className={s.cellMore}>+{overflow}</span>}
                  {toolDots.length > 0 && (
                    <div className={s.toolDots}>
                      {toolDots.map(dot => (
                        <span
                          key={dot.id}
                          className={s.toolDot}
                          style={{ background: dot.color }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Day Panel */}
          {selectedDay && (
            <DayPanel
              dateKey={selectedDay}
              todayKey={todayKey}
              days={days}
              todos={todos}
              activeTools={activeTools}
              toolColors={toolColors}
              birthdays={birthdays}
              weightEntry={weightEntries.find(e => e.date === selectedDay) ?? null}
              setCurrentTab={setCurrentTab}
              setDayplanDate={setDayplanDate}
              setTodos={setTodos}
              restoreTodo={restoreTodo}
              setRestoreTodo={setRestoreTodo}
              handleRestore={handleRestore}
            />
          )}
        </>
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

      {editingTodo && (
        <TodoModal
          existingTodo={editingTodo}
          onClose={() => setEditingTodo(null)}
        />
      )}
      {editingTermin && (
        <WeekTerminEditModal
          dk={editingTermin.dk}
          slotKey={editingTermin.slotKey}
          slot={editingTermin.slot}
          onSave={handleSaveTermin}
          onClose={() => setEditingTermin(null)}
        />
      )}
      {quickCreate && (
        <TodoModal
          prefill={quickCreate}
          onClose={() => setQuickCreate(null)}
        />
      )}
    </div>
  )
}
