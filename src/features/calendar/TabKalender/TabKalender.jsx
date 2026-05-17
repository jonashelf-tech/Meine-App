import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import s from './TabKalender.module.css'

const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year, month) {
  const d = new Date(year, month, 1)
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

function getDots(dateKey, days, todos, birthdays, activeTools) {
  const dots = []
  const slots = days[dateKey] ?? {}
  if (Object.keys(slots).length > 0) dots.push('cyan')

  const doneTodos = todos.filter(t => t.doneAt && t.doneAt.startsWith(dateKey))
  if (doneTodos.length > 0) dots.push('green')

  if (activeTools.includes('geburtstage') && birthdays?.length > 0) {
    const [, mm, dd] = dateKey.split('-')
    const hasBday = birthdays.some(b => b.date === `${mm}-${dd}`)
    if (hasBday) dots.push('pink')
  }

  return dots.slice(0, 3)
}

function DayDetail({ dateKey, days, todos, onNavigate }) {
  const slots = days[dateKey] ?? {}
  const entries = Object.entries(slots)
  const [y, m, d] = dateKey.split('-')
  const label = `${d}.${m}.${y}`

  return (
    <div className={s.detail}>
      <div className={s.detailHeader}>
        <span className={s.detailDate}>{label}</span>
        <button className={s.detailOpenBtn} onClick={() => onNavigate(dateKey)}>
          Heute öffnen →
        </button>
      </div>
      {entries.length === 0 ? (
        <p className={s.detailEmpty}>Keine Einträge</p>
      ) : (
        <div className={s.detailSlots}>
          {entries.slice(0, 6).map(([key, slot]) => (
            <div key={key} className={s.detailSlot}>
              <span
                className={s.detailDot}
                style={{ background: slot.color || 'var(--cyan)' }}
              />
              <span className={s.detailSlotText}>{slot.text}</span>
              {slot.done && <span className={s.detailDone}>✓</span>}
            </div>
          ))}
          {entries.length > 6 && (
            <p className={s.detailMore}>+{entries.length - 6} weitere</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function TabKalender() {
  const { days, todos, birthdays = [], activeTools = [], setCurrentTab, setHeuteModus } = useAppStore()
  const [view, setView] = useState('woche')
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayKey = toDateKey(today)

  const [weekStart, setWeekStart] = useState(() => getMonday(today))
  const [monthRef, setMonthRef]   = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const [selectedDay, setSelectedDay] = useState(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const navigateToDay = (dateKey) => {
    setCurrentTab(0)
    setHeuteModus('manuell')
  }

  const handleDayClick = (dateKey) => {
    setSelectedDay(prev => prev === dateKey ? null : dateKey)
  }

  const monthCells = useMemo(() => {
    const { year, month } = monthRef
    const total = daysInMonth(year, month)
    const startOffset = firstDayOfMonth(year, month)
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
          onClick={() => setView('woche')}
        >
          Woche
        </button>
        <button
          className={[s.seg, view === 'monat' ? s.segActive : ''].join(' ')}
          onClick={() => setView('monat')}
        >
          Monat
        </button>
      </div>

      {view === 'woche' && (
        <>
          <div className={s.navRow}>
            <button className={s.navBtn} onClick={() => setWeekStart(d => addDays(d, -7))}>◀</button>
            <span className={s.navLabel}>
              {addDays(weekStart, 0).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} –{' '}
              {addDays(weekStart, 6).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <button className={s.navBtn} onClick={() => setWeekStart(d => addDays(d, 7))}>▶</button>
          </div>
          <button className={s.todayBtn} onClick={() => setWeekStart(getMonday(today))}>Heute</button>

          <div className={s.weekRow}>
            {weekDays.map(date => {
              const key = toDateKey(date)
              const isToday = key === todayKey
              const dots = getDots(key, days, todos, birthdays, activeTools)
              return (
                <div key={key}>
                  <button
                    className={[s.dayCard, isToday ? s.dayCardToday : '', selectedDay === key ? s.dayCardSelected : ''].join(' ')}
                    onClick={() => handleDayClick(key)}
                  >
                    <span className={s.dayShort}>{DAY_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1]}</span>
                    <span className={s.dayNum}>{date.getDate()}</span>
                    <div className={s.dotRow}>
                      {dots.map((c, i) => (
                        <span key={i} className={s.dot} style={{ background: `var(--${c})` }} />
                      ))}
                    </div>
                  </button>
                  {selectedDay === key && (
                    <DayDetail
                      dateKey={key}
                      days={days}
                      todos={todos}
                      onNavigate={navigateToDay}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {view === 'monat' && (
        <>
          <div className={s.navRow}>
            <button
              className={s.navBtn}
              onClick={() => setMonthRef(r => {
                const m = r.month === 0 ? 11 : r.month - 1
                const y = r.month === 0 ? r.year - 1 : r.year
                return { year: y, month: m }
              })}
            >◀</button>
            <span className={s.navLabel}>
              {MONTH_NAMES[monthRef.month]} {monthRef.year}
            </span>
            <button
              className={s.navBtn}
              onClick={() => setMonthRef(r => {
                const m = r.month === 11 ? 0 : r.month + 1
                const y = r.month === 11 ? r.year + 1 : r.year
                return { year: y, month: m }
              })}
            >▶</button>
          </div>
          <button
            className={s.todayBtn}
            onClick={() => setMonthRef({ year: today.getFullYear(), month: today.getMonth() })}
          >
            Heute
          </button>

          <div className={s.monthGrid}>
            {DAY_SHORT.map(d => (
              <div key={d} className={s.monthHeader}>{d}</div>
            ))}
            {monthCells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className={s.monthCell} />
              const key = `${monthRef.year}-${String(monthRef.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = key === todayKey
              const dots = getDots(key, days, todos, birthdays, activeTools)
              return (
                <div key={key}>
                  <button
                    className={[s.monthCell, s.monthCellBtn, isToday ? s.monthCellToday : '', selectedDay === key ? s.monthCellSelected : ''].join(' ')}
                    onClick={() => handleDayClick(key)}
                  >
                    <span className={s.monthDay}>{day}</span>
                    <div className={s.dotRow}>
                      {dots.map((c, i) => (
                        <span key={i} className={s.dot} style={{ background: `var(--${c})` }} />
                      ))}
                    </div>
                  </button>
                  {selectedDay === key && (
                    <div className={s.monthDetailWrap}>
                      <DayDetail
                        dateKey={key}
                        days={days}
                        todos={todos}
                        onNavigate={navigateToDay}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
