import { useAppStore } from '../../store'
import { getCalItemsForDate } from './TabKalender/kalenderShared'
import s from './SharedDayStrip.module.css'

// „Geteilt an diesem Tag" — read-only Streifen über dem Tagesplan (Muster
// Geburtstags-Allday, teilen-spec.md §8.2): geteilte Termine des Tages, damit
// man nicht am gemeinsamen Termin vorbeiplant. Filtert über den globalen
// calFilter; Emoji als Kennung, Eintragsfarbe am Rand. Entdoppelt gegen bereits
// als eigenen Slot platzierte Termine (todoId) — die stehen dann schon im Plan.
export default function SharedDayStrip({ viewDate, slots }) {
  const todos     = useAppStore(st => st.todos)
  const calList   = useAppStore(st => st.calList)
  const calCreds  = useAppStore(st => st.calCreds)
  const calFilter = useAppStore(st => st.calFilter)

  const placed = new Set(
    Object.values(slots || {}).map(sl => sl?.todoId).filter(Boolean)
  )
  const items = getCalItemsForDate(todos, calList, calFilter, viewDate)
    .filter(it => !placed.has(it.id) && !it.done)

  if (items.length === 0) return null

  const who = (it) => {
    if (!it.by) return null
    if (it.by === calCreds[it.cal]?.memberId) return 'du'
    return calList[it.cal]?.members?.[it.by] ?? null
  }

  return (
    <div className={s.strip}>
      <div className={s.head}>Geteilt an diesem Tag</div>
      {items.map(it => {
        const w = who(it)
        return (
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
            {w && <span className={s.who}>· {w}</span>}
          </div>
        )
      })}
    </div>
  )
}
