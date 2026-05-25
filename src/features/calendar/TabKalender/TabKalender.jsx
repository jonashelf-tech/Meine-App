import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { dateKey as toDateKey, getDaysInMonth, getFirstDayOfMonth, getToolColor } from '../../../utils'
import { lv, sv, SK } from '../../../storage'
import { TOOL_REGISTRY, ToolIcon } from '../../tools/toolRegistry'
import { TOOL_TAB } from '../../tools/toolTabs'
import NavPill from '../../../components/NavPill/NavPill'
import s from './TabKalender.module.css'

const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const SLOT_H     = 28
const GRID_START = 7
const GRID_END   = 22

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

function slotToTop(slotKey) {
  return (parseFloat(slotKey) - GRID_START) * 2 * SLOT_H
}

function slotToHeight(duration) {
  return Math.max(8, Math.round(((duration ?? 30) / 30) * SLOT_H))
}

function getToolDots(dk, todos, activeTools, birthdays = []) {
  const [, mm, dd] = dk.split('-')
  return TOOL_REGISTRY
    .filter(t => {
      if (!activeTools.includes(t.id)) return false
      if (t.id === 'geburtstage') return birthdays.some(b => b.date === `${mm}-${dd}`)
      return true
    })
    .map(t => ({
      id:    t.id,
      color: t.color,
      // geburtstage-Dot filled = Geburtstag ist heute. Alle anderen Dots immer als Ring (kein per-Tool Completion-State).
      done:  t.id === 'geburtstage',
    }))
}

function getCellBars(dk, days) {
  const slots = days[dk] ?? {}
  return Object.entries(slots)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([, slot]) => ({
      text: slot.text,
      color: slot.color || 'var(--primary)',
      isTodo: Boolean(slot.todoId),
    }))
}

// ─── Day Panel ────────────────────────────────────────────
function DayPanel({ dateKey, days, todos, activeTools, toolColors, setCurrentTab, setDayplanDate, setTodos }) {
  const [open, setOpen] = useState({ zeitplan: true, done: true, tools: true })
  const [restoreTodo, setRestoreTodo] = useState(null)

  const handleRestore = (todo) => {
    setTodos(prev => prev.map(t =>
      t.id === todo.id
        ? { ...t, done: false, doneAt: null, date: null, time: null }
        : t
    ))
    setRestoreTodo(null)
  }

  const slots = days[dateKey] ?? {}
  const sortedSlots = Object.entries(slots)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))

  const doneTodos = todos.filter(t => t.doneAt?.startsWith(dateKey))

  const activeToolsData = activeTools
    .map(id => TOOL_REGISTRY.find(t => t.id === id))
    .filter(Boolean)

  const [y, m, d] = dateKey.split('-')
  const dateObj  = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  const dayName  = dateObj.toLocaleDateString('de-DE', { weekday: 'long' })
  const label    = `${dayName}, ${d}.${m}.${y}`

  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className={s.dayPanel}>
      <div className={s.dayPanelHeader}>
        <span className={s.dayPanelDate}>{label}</span>
      </div>

      {/* Zeitplan */}
      <div className={s.dayPanelSection}>
        <button className={s.dayPanelSectionHead} onClick={() => toggle('zeitplan')}>
          <span className={s.dayPanelSectionLabel}>Zeitplan</span>
          {sortedSlots.length > 0 && (
            <span className={s.dayPanelSectionCount}>{sortedSlots.length}</span>
          )}
          <span className={s.dayPanelArrow}>{open.zeitplan ? '▾' : '▸'}</span>
        </button>
        {open.zeitplan && (
          <div className={s.dayPanelList}>
            {sortedSlots.length === 0 ? (
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
                  onDoubleClick={() => { setDayplanDate(dateKey); setCurrentTab(0) }}
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

      {/* Tools */}
      <div className={s.dayPanelSection}>
        <button className={s.dayPanelSectionHead} onClick={() => toggle('tools')}>
          <span className={s.dayPanelSectionLabel}>Tools</span>
          {activeToolsData.length > 0 && (
            <span className={s.dayPanelSectionCount}>{activeToolsData.length}</span>
          )}
          <span className={s.dayPanelArrow}>{open.tools ? '▾' : '▸'}</span>
        </button>
        {open.tools && (
          <div className={s.dayPanelToolGrid}>
            {activeToolsData.length === 0 ? (
              <p className={s.dayPanelEmpty}>Keine aktiven Tools</p>
            ) : activeToolsData.map(tool => {
              const color = getToolColor(tool.id, toolColors)
              const tab   = TOOL_TAB[tool.id]
              return (
                <button
                  key={tool.id}
                  className={s.dayPanelToolChip}
                  style={{
                    borderColor: `${color}55`,
                    background:  `${color}14`,
                    color,
                  }}
                  onDoubleClick={() => tab != null && setCurrentTab(tab)}
                >
                  <span className={s.dayPanelToolIcon}><ToolIcon id={tool.id} size={16} /></span>
                  <span className={s.dayPanelToolName}>{tool.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

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

export default function TabKalender() {
  const { days, todos, birthdays = [], activeTools = [], toolColors = {}, setCurrentTab, setDayplanDate, setTodos } = useAppStore()
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
  const [selectedDay, setSelectedDay] = useState(null)
  const [showTermine, setShowTermine] = useState(true)
  const [showTodos,   setShowTodos]   = useState(true)
  const [showTools,   setShowTools]   = useState(true)
  const weekScrollRef = useRef(null)

  useEffect(() => {
    if (view !== 'woche' || !weekScrollRef.current) return
    const scrollTo = Math.max(0, (new Date().getHours() - GRID_START) * 2 * SLOT_H - 80)
    weekScrollRef.current.scrollTop = scrollTo
  }, [view])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek  = weekDays.some(d => toDateKey(d) === todayKey)
  const isCurrentMonth = monthRef.year === today.getFullYear() && monthRef.month === today.getMonth()

  const handleDayClick = (dateKey) => {
    setSelectedDay(prev => prev === dateKey ? null : dateKey)
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

  return (
    <div className={s.page}>
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

      {/* ─── WOCHENANSICHT — Zeitgitter ───────────────────────── */}
      {view === 'woche' && (
        <>
          <NavPill
            label={`${addDays(weekStart, 0).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            onPrev={() => setWeekStart(d => addDays(d, -7))}
            onNext={() => setWeekStart(d => addDays(d, 7))}
            isCurrent={isCurrentWeek}
            leftGlows={!isCurrentWeek && toDateKey(weekStart) > toDateKey(getMonday(today))}
            rightGlows={!isCurrentWeek && toDateKey(weekStart) < toDateKey(getMonday(today))}
            onLabelDoubleClick={isCurrentWeek ? undefined : () => setWeekStart(getMonday(today))}
          />

          <div className={s.weekWrapper}>
            {/* Spalten-Header */}
            <div className={s.weekHeaderRow}>
              <div className={s.weekTimeCorner} />
              {weekDays.map(date => {
                const dk       = toDateKey(date)
                const isToday  = dk === todayKey
                const toolDots = showTools ? getToolDots(dk, todos, activeTools, birthdays) : []
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
                            className={[s.toolDot, dot.done ? '' : s.toolDotActive].join(' ')}
                            style={dot.done
                              ? { background: dot.color }
                              : { color: dot.color, borderColor: dot.color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Allday-Streifen — Todos ohne Uhrzeit */}
            {showTodos && (
              <div className={s.weekAlldayRow}>
                <div className={s.weekAlldayLabel}>All</div>
                {weekDays.map(date => {
                  const dk          = toDateKey(date)
                  const alldayTodos = todos.filter(t => t.date === dk && !t.time)
                  return (
                    <div key={dk} className={s.weekAlldayCol}>
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
                {Array.from({ length: (GRID_END - GRID_START) * 2 }, (_, i) => {
                  const h      = GRID_START + i * 0.5
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
                  const dk      = toDateKey(date)
                  const slots   = days[dk] ?? {}
                  const entries = Object.entries(slots).filter(([key]) => {
                    const h = parseFloat(key)
                    return h >= GRID_START && h < GRID_END
                  })
                  return (
                    <div key={dk} className={s.weekDayCol}>
                      {entries.map(([key, slot]) => {
                        const isTodo = Boolean(slot.todoId)
                        if (!showTermine && !isTodo) return null
                        if (!showTodos   &&  isTodo) return null
                        const top    = slotToTop(key)
                        const height = slotToHeight(slot.duration)
                        const hh     = String(Math.floor(parseFloat(key))).padStart(2, '0')
                        const mm     = parseFloat(key) % 1 ? '30' : '00'
                        return (
                          <div
                            key={key}
                            className={[s.weekSlotBlock, isTodo ? s.weekSlotTodo : ''].join(' ')}
                            style={{ top, height, background: slot.color || 'var(--primary)' }}
                          >
                            {height >= 20 && <span className={s.weekSlotName}>{slot.text}</span>}
                            {height >= 32 && <span className={s.weekSlotTime}>{hh}:{mm}</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── MONATSANSICHT ────────────────────────────────────── */}
      {view === 'monat' && (
        <>
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

          <div className={s.monthGrid}>
            {DAY_SHORT.map(d => (
              <div key={d} className={s.monthHeader}>{d}</div>
            ))}
            {monthCells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className={[s.monthCell, s.monthCellEmpty].join(' ')} />
              const dk         = `${monthRef.year}-${String(monthRef.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday    = dk === todayKey
              const isSelected = selectedDay === dk
              const bars       = getCellBars(dk, days)
              const filtered   = [
                ...(showTermine ? bars.filter(b => !b.isTodo) : []),
                ...(showTodos   ? bars.filter(b =>  b.isTodo) : []),
              ]
              const visible  = filtered.slice(0, 3)
              const overflow = filtered.length - visible.length
              const toolDots = showTools ? getToolDots(dk, todos, activeTools, birthdays) : []

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
                          className={[s.toolDot, dot.done ? '' : s.toolDotActive].join(' ')}
                          style={dot.done
                            ? { background: dot.color }
                            : { color: dot.color, borderColor: dot.color }}
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
              days={days}
              todos={todos}
              activeTools={activeTools}
              toolColors={toolColors}
              setCurrentTab={setCurrentTab}
              setDayplanDate={setDayplanDate}
              setTodos={setTodos}
            />
          )}
        </>
      )}

      <div className={s.toggleStrip}>
        <button
          className={[s.toggleChip, s.toggleChipTermine, showTermine ? s.toggleChipOn : ''].join(' ')}
          onClick={() => setShowTermine(v => !v)}
        >
          Termine {showTermine ? '●' : '○'}
        </button>
        <button
          className={[s.toggleChip, s.toggleChipTodos, showTodos ? s.toggleChipOn : ''].join(' ')}
          onClick={() => setShowTodos(v => !v)}
        >
          Todos {showTodos ? '●' : '○'}
        </button>
        <button
          className={[s.toggleChip, s.toggleChipTools, showTools ? s.toggleChipOn : ''].join(' ')}
          onClick={() => setShowTools(v => !v)}
        >
          Tools {showTools ? '●' : '○'}
        </button>
      </div>
    </div>
  )
}
