import { todayKey, dateKey } from '../../utils'
import NavPill from '../NavPill/NavPill'

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
  const today     = todayKey()
  const isToday   = date === today
  const leftGlows = date > today   // heute liegt in Vergangenheit → ‹ bringt zu heute
  const rightGlows = date < today  // heute liegt in Zukunft → › bringt zu heute

  return (
    <NavPill
      label={formatDate(date)}
      onPrev={() => onChange(shiftDay(date, -1))}
      onNext={() => onChange(shiftDay(date, 1))}
      isCurrent={isToday}
      leftGlows={leftGlows}
      rightGlows={rightGlows}
      onLabelClick={onCalendarOpen}
    />
  )
}
