import { useAppStore } from '../../store'
import s from './CalFilterChips.module.css'

// Globale Kalender-Filter-Leiste (teilen-spec.md §8.1): dieselben Emoji-Chips
// steuern ALLE Ansichten (Woche/Monat/DayPanel/Tagesplaner) über EINEN
// calFilter-Zustand. Kennung ist das frei gewählte Emoji (keine Kalenderfarbe);
// „an" = normaler Chip, „aus" = gedimmt (ausgeblendet, nicht gelöscht).
// Rendert nur, wenn es mindestens einen Kalender gibt.
export default function CalFilterChips() {
  const calList      = useAppStore(st => st.calList)
  const calFilter    = useAppStore(st => st.calFilter)
  const setCalFilter = useAppStore(st => st.setCalFilter)

  const calIds = Object.keys(calList)
  if (calIds.length === 0) return null

  const privatOn = calFilter?.privat !== false
  const isOn = (id) => calFilter?.cals?.[id]?.show !== false

  const togglePrivat = () =>
    setCalFilter(f => ({ ...f, privat: !(f?.privat !== false) }))
  const toggleCal = (id) =>
    setCalFilter(f => ({
      ...f,
      cals: { ...(f?.cals || {}), [id]: { ...(f?.cals?.[id]), show: !isOn(id) } },
    }))

  return (
    <div className={s.row} role="group" aria-label="Kalender-Filter">
      <button
        type="button"
        className={[s.chip, privatOn ? '' : s.off].join(' ')}
        onClick={togglePrivat}
        aria-pressed={privatOn}
      >
        <span className={s.em}>🔒</span>Privat
      </button>
      {calIds.map(id => {
        const cal = calList[id] ?? {}
        const on  = isOn(id)
        return (
          <button
            key={id}
            type="button"
            className={[s.chip, on ? '' : s.off].join(' ')}
            onClick={() => toggleCal(id)}
            aria-pressed={on}
          >
            <span className={s.em}>{cal.emoji ?? '👥'}</span>
            {cal.name || 'Kalender'}
          </button>
        )
      })}
    </div>
  )
}
