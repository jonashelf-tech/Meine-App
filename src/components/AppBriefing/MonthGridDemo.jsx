import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { dateKey, getDaysInMonth, getFirstDayOfMonth } from '../../utils'
import { createBlock } from '../../features/todos/Block'
import { DayPanel } from '../../features/calendar/TabKalender/TabKalender'
import TapPulse from './TapPulse'
import wk from '../../features/calendar/TabKalender/TabKalender.module.css'
import s from './AppBriefing.module.css'

// Monats-Grid fürs Briefing — nutzt die ECHTEN TabKalender-Styles (pixelgleich).
// Tap-Puls auf einen Tag → die Tagesansicht (DayPanel) klappt darunter auf.

const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const sleep = ms => new Promise(r => setTimeout(r, ms))
const pad = n => String(n).padStart(2, '0')

export default function MonthGridDemo() {
  const stageRef = useRef(null)
  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayK = dateKey(now)

  const cells = useMemo(() => {
    const total = getDaysInMonth(year, month)
    const offset = getFirstDayOfMonth(year, month)
    const arr = []
    for (let i = 0; i < offset; i++) arr.push(null)
    for (let d = 1; d <= total; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month])

  // Demo-Balken auf ein paar Tagen
  const bars = useMemo(() => ({
    8:  [{ text: 'Termin', color: '#14B8A6', todo: false }],
    15: [{ text: 'Sport', color: '#10B981', todo: true }],
    21: [{ text: 'Putzen', color: '#FB7185', todo: true }],
  }), [])

  const selDay = 15
  const selDk = `${year}-${pad(month + 1)}-${pad(selDay)}`

  // Demo-Daten für die aufklappende Tagesansicht
  const [{ days, todos }] = useState(() => {
    const done = createBlock({ text: 'Sport gemacht', priority: 2, color: '#10B981' })
    done.done = true
    done.doneAt = `${selDk}T10:00:00.000Z`
    return {
      days: { [selDk]: { '9': { text: 'Termin Arzt', color: '#14B8A6', duration: 30, locked: false, done: false } } },
      todos: [done],
    }
  })

  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let alive = true
    const run = async () => {
      while (alive) {
        setSelected(null)
        await sleep(2000); if (!alive) break
        setSelected(selDk)
        await sleep(2600); if (!alive) break
      }
    }
    run()
    return () => { alive = false }
  }, [selDk])

  const getCell = useCallback(() => {
    const grid = stageRef.current
    if (!grid) return null
    return [...grid.querySelectorAll(`[class*="monthCell"]`)]
      .find(c => c.querySelector(`[class*="monthDay"]`)?.textContent === String(selDay)) || null
  }, [])

  return (
    <div className={s.stageRel} ref={stageRef}>
      <div className={wk.monthGrid}>
        {DAY_SHORT.map(d => <div key={d} className={wk.monthHeader}>{d}</div>)}
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className={[wk.monthCell, wk.monthCellEmpty].join(' ')} />
          const dk = `${year}-${pad(month + 1)}-${pad(day)}`
          const dayBars = bars[day] ?? []
          return (
            <div
              key={dk}
              className={[
                wk.monthCell,
                dk === todayK ? wk.monthCellToday : '',
                dk === selected ? wk.monthCellSelected : '',
              ].join(' ')}
            >
              <span className={wk.monthDay}>{day}</span>
              {dayBars.map((b, i) => (
                <div key={i} className={[wk.cellBar, b.todo ? wk.cellBarTodo : ''].join(' ')} style={{ background: b.color }}>
                  <span className={wk.cellBarText}>{b.text}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {!selected && <TapPulse stageRef={stageRef} getTarget={getCell} />}

      {selected && (
        <div className={s.panelWrap}>
          <DayPanel
            dateKey={selDk}
            todayKey={todayK}
            days={days}
            todos={todos}
            activeTools={[]}
            toolColors={{}}
            birthdays={[]}
            weightEntry={null}
            setCurrentTab={() => {}}
            setDayplanDate={() => {}}
            setTodos={() => {}}
            restoreTodo={null}
            setRestoreTodo={() => {}}
            handleRestore={() => {}}
            initialOpen={{ zeitplan: true, done: true }}
          />
        </div>
      )}
    </div>
  )
}
