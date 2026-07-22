import { useAppStore } from '../../store'
import { getUnplacedCalItems } from './TabKalender/kalenderShared'
import s from './SharedDayStrip.module.css'

// „Geteilt an diesem Tag" — Streifen über dem Tagesplan (Muster Geburtstags-
// Allday, teilen-spec.md §8.2): Termine aus geteilten Kalendern, die noch
// keinen eigenen Slot im Plan haben (entdoppelt über todoId — platzierte
// stehen ja schon im Plan). Filtert über den globalen calFilter; Kennung ist
// allein das Kalender-Emoji, Eintragsfarbe am Rand. Wer den Termin angelegt
// hat, steht bewusst NICHT dabei — dafür ist die Aktivitäts-Sammlung da.
export default function SharedDayStrip({ viewDate, slots }) {
  const todos     = useAppStore(st => st.todos)
  const calList   = useAppStore(st => st.calList)
  const calFilter = useAppStore(st => st.calFilter)

  const items = getUnplacedCalItems(todos, calList, calFilter, viewDate, slots)

  if (items.length === 0) return null

  return (
    <div className={s.strip}>
      <div className={s.head}>Geteilt an diesem Tag</div>
      {items.map(it => (
        <div
          key={it.id}
          className={s.row}
          style={it.color ? { borderLeftColor: it.color } : undefined}
        >
          <span className={s.em}>{it.emoji}</span>
          {it.time && (
            <span className={s.time} style={{ color: it.color || 'var(--primary)' }}>
              {it.time}
            </span>
          )}
          <span className={s.text}>{it.text}</span>
        </div>
      ))}
    </div>
  )
}
