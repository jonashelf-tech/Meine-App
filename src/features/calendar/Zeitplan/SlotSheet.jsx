import { useMemo } from 'react'
import { skLabel, getDurationKeys } from '../../../utils'
import { getActiveTodos, sortTodos } from '../poolLogic'
import PrioBadge from '../../../components/PrioBadge/PrioBadge'
import Overlay from '../../../components/Overlay/Overlay'
import s from './SlotSheet.module.css'

// Zentriertes Modal beim Tap auf einen leeren Slot: neues Todo direkt im Slot
// erstellen oder ein Pool-Todo per Tap platzieren (Alternative zum Drag).
// dateLabel (optional): Wochenansicht zeigt zusätzlich den Zieltag.
export default function SlotSheet({ slotKey, dateLabel = null, todos, todaySlots, onPlace, onCreateNew, onClose }) {
  const poolTodos = useMemo(
    () => sortTodos(getActiveTodos(todos, todaySlots), 'standard'),
    [todos, todaySlots]
  )

  // Todos mit Überlänge passen nur, wenn die Folge-Slots frei sind —
  // gleiche Regel wie beim Drag (canDrop)
  const fits = (todo) => {
    const dur = todo.duration || 30
    if (dur <= 30) return true
    return getDurationKeys(slotKey, dur).slice(1).every(k => !todaySlots[k])
  }

  return (
    <Overlay variant="center" onClose={onClose}>
      <div className={s.sheet}>

        <div className={s.header}>
          <div className={s.headerText}>
            <span className={s.title}>Was planst du?</span>
            <span className={s.time}>{dateLabel ? `${dateLabel} · ` : ''}{skLabel(slotKey)}</span>
          </div>
          <button className={s.closeBtn} onClick={onClose} aria-label="Schließen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <button className={s.newBtn} onClick={onCreateNew}>
          + Neues Todo / Termin
        </button>

        {poolTodos.length > 0 && (
          <>
            <div className={s.sectionLabel}>Aus dem Pool</div>
            <div className={s.list}>
              {poolTodos.map(t => {
                const ok = fits(t)
                return (
                  <button
                    key={t.id}
                    className={[s.row, ok ? '' : s.rowBlocked].join(' ')}
                    disabled={!ok}
                    onClick={() => onPlace(t)}
                  >
                    <span className={s.stripe} style={{ background: t.color || 'var(--primary)' }} />
                    <span className={s.rowText}>{t.text}</span>
                    {t.duration && <span className={s.rowDur}>{t.duration} min</span>}
                    {!ok && <span className={s.blockedHint}>passt nicht</span>}
                    <PrioBadge priority={t.priority} />
                  </button>
                )
              })}
            </div>
          </>
        )}

      </div>
    </Overlay>
  )
}
