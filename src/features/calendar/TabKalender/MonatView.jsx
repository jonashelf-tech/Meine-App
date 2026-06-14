import { useMemo } from 'react'
import { getDaysInMonth, getFirstDayOfMonth, getToolColor } from '../../../utils'
import { getBirthdaysForCalendarDate } from '../../tools/geburtstage/birthdayUtils'
import { DAY_SHORT, getToolDots, getCellBars } from './kalenderShared'
import { DayPanel } from './DayPanel'
import s from './TabKalender.module.css'

// ─── Monatsansicht — Kacheln mit Farbbalken + DayPanel ───────────────
export default function MonatView({
  monthRef, todayKey, selectedDay, onDayClick,
  days, todos, setTodos,
  birthdays, activeTools, toolColors, weightEntries, kognitivSessions, fitnessSessions, growthDoneDates,
  showTermine, showTodos, showTools,
  setCurrentTab, setDayplanDate, setGrowthOpenDate,
  restoreTodo, setRestoreTodo, handleRestore,
}) {
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
          const toolDots = getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions, fitnessSessions, growthDoneDates)
          const bdays    = getBirthdaysForCalendarDate(birthdays, dk)

          return (
            <button
              key={dk}
              className={[
                s.monthCell,
                isToday    ? s.monthCellToday    : '',
                isSelected ? s.monthCellSelected : '',
              ].join(' ')}
              onClick={() => onDayClick(dk)}
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
          setGrowthOpenDate={setGrowthOpenDate}
          setTodos={setTodos}
          restoreTodo={restoreTodo}
          setRestoreTodo={setRestoreTodo}
          handleRestore={handleRestore}
        />
      )}
    </>
  )
}
