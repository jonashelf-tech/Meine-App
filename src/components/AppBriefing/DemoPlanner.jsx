import { todayKey } from '../../utils'
import Zeitplan from '../../features/calendar/Zeitplan/Zeitplan'
import Pool from '../../features/calendar/Pool/Pool'
import s from './AppBriefing.module.css'

const noop = () => {}
const EMPTY = []

// Rendert den ECHTEN Planer (Zeitplan + Pool) mit Demo-Daten.
// Alle Callbacks sind no-ops → keine Store-Schreibzugriffe, echte Daten unberührt.
// registerHalf wird durchgereicht, damit die Animation echte Slot-/Pool-Elemente messen kann.
export default function DemoPlanner({ slots = {}, todos = [], visibleStart = 8, visibleEnd = 11, registerHalf = noop }) {
  const dk = todayKey()
  return (
    <div className={s.demoPlanner}>
      <Zeitplan
        slots={slots}
        todos={todos}
        setTodos={noop}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        dateLabel={dk}
        onSetSlot={noop}
        onToggleSlotDone={noop}
        onEditTodo={noop}
        onRemoveSlot={noop}
        onShiftAll={noop}
        onExpandUp={noop}
        onExpandDown={noop}
        onExpandUpTo={noop}
        onExpandDownTo={noop}
        onRemoveHour={noop}
        onToggleLock={noop}
        onCreateBlocker={noop}
        onFokusMode={noop}
        registerHalf={registerHalf}
        startSlotDrag={noop}
        blockers={EMPTY}
        birthdayPills={EMPTY}
      />
      <Pool
        todos={todos}
        setTodos={noop}
        todaySlots={slots}
        viewDate={dk}
        onToggleDone={noop}
        onEdit={noop}
        onRemove={noop}
        startDrag={noop}
        onDoneCalendar={noop}
        onKlaeren={noop}
        registerHalf={registerHalf}
      />
    </div>
  )
}
