import { useMemo } from 'react'
import { skLabel } from '../../../utils'
import { sortTodos, getActiveTodos } from '../poolLogic'
import { getFixedEntries, isDayComplete } from '../fokusLogic'
import s from './FokusView.module.css'

const CheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="M5 12l5 5L20 6" /></svg>
)
const CalIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
  </svg>
)

export default function FokusView({ viewDate, todaySlots, todos, onToggleSlotDone, onToggleTodoDone, onShowFull }) {
  const fixed = useMemo(() => getFixedEntries(todaySlots), [todaySlots])

  // Top-3 freie IDs pro Tag einfrieren → erledigte rücken NICHT nach.
  // Bewusst nur auf viewDate reagieren (nicht auf todos), damit Abhaken nichts nachschiebt.
  const frozenIds = useMemo(() => {
    const ranked = sortTodos(getActiveTodos(todos, todaySlots), 'standard')
    return ranked.slice(0, 3).map(t => t.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate])

  const free = frozenIds
    .map(id => todos.find(t => t.id === id))
    .filter(Boolean)

  const complete = isDayComplete(fixed, free)
  const doneCount = fixed.filter(e => e.slot.done).length + free.filter(t => t.done).length
  const total = fixed.length + free.length

  return (
    <div className={s.fokus}>
      {fixed.length > 0 && (
        <>
          <div className={s.zlabel}>Heute steht fest</div>
          <div className={s.fixed}>
            {fixed.map(({ slotKey, slot }) => (
              <button
                key={slotKey}
                className={[s.frow, slot.done ? s.done : ''].join(' ')}
                onClick={() => onToggleSlotDone(slotKey)}
              >
                <span className={s.ftick}>{CheckIcon}</span>
                <span className={s.time}>{skLabel(slotKey)}</span>
                <span className={s.ftext}>{slot.text}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className={s.zlabel}>
        {free.length === 0 ? 'Deine freien' : free.length === 1 ? 'Deine Aufgabe' : `Deine ${free.length} freien`}
      </div>
      <div className={s.cards}>
        {free.length === 0 && <p className={s.empty}>Nichts Freies offen — alles verplant ✓</p>}
        {free.map(t => (
          <button
            key={t.id}
            className={[s.card, t.done ? s.done : ''].join(' ')}
            style={{ '--accent': t.color || '#8B5CF6' }}
            onClick={() => onToggleTodoDone(t.id)}
          >
            <span className={s.tick}>{CheckIcon}</span>
            <span className={s.ctext}>{t.text}</span>
          </button>
        ))}
      </div>

      <div className={s.footer}>
        <div className={s.progress}>{doneCount} / {total} erledigt</div>
        <button className={s.daybtn} onClick={onShowFull}>{CalIcon} Ganzen Tag anzeigen</button>
      </div>

      {complete && (
        <div className={s.victory}>
          <div className={s.ring}>{CheckIcon}</div>
          <h2>Tag geschafft.</h2>
          <p>Alles erledigt. Du darfst jetzt fertig sein.</p>
          <button className={s.vbtn} onClick={onShowFull}>Ganzen Tag anzeigen</button>
        </div>
      )}
    </div>
  )
}
