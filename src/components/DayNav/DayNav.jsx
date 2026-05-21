import { todayKey, dateKey } from '../../utils'
import s from './DayNav.module.css'

const DAY_SHORT   = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function shiftDay(dk, n) {
  const [y, m, d] = dk.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return dateKey(date)
}

function formatDate(dk) {
  const [y, m, d] = dk.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAY_SHORT[date.getDay()]}, ${d}. ${MONTH_NAMES[m - 1]}`
}

export default function DayNav({ date, onChange, onCalendarOpen }) {
  const today      = todayKey()
  const isToday    = date === today
  const leftGlows  = date > today
  const rightGlows = date < today

  return (
    <div className={s.pill}>
      <button
        className={[s.arrow, leftGlows ? s.arrowToday : ''].join(' ')}
        onClick={() => onChange(shiftDay(date, -1))}
        aria-label="Vorheriger Tag"
      >
        ‹
      </button>
      <span
        className={[s.label, isToday ? s.labelToday : ''].join(' ')}
        onClick={onCalendarOpen}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onCalendarOpen?.()}
      >
        {formatDate(date)}
      </span>
      <button
        className={[s.arrow, rightGlows ? s.arrowToday : ''].join(' ')}
        onClick={() => onChange(shiftDay(date, 1))}
        aria-label="Nächster Tag"
      >
        ›
      </button>
    </div>
  )
}
