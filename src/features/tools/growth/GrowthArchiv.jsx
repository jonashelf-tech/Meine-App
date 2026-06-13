// Dezente horizontale Leiste vergangener Tage: Datum, Stimmungsfarbe, erste Zeile.
// Tap → Eintrag wird in der (gleichen) Tagesansicht geöffnet — ≤3 Tage editierbar.
import { dayHasEntry, MOOD_COLORS, karteById } from './growthStore'
import { loadDailyStates } from '../../daily/dailyState'
import s from './GrowthArchiv.module.css'

function firstLine(day) {
  if ((day.freitext ?? '').trim()) return day.freitext.trim().split('\n')[0]
  const beantwortet = (day.karten ?? []).find(k => (k.antwort ?? '').trim())
  if (beantwortet) return beantwortet.antwort.trim().split('\n')[0]
  const erledigt = (day.karten ?? []).find(k => k.erledigt)
  if (erledigt) return karteById(erledigt.kartenId)?.text ?? ''
  return ''
}

export default function GrowthArchiv({ data, today, onOpen, children }) {
  const states = loadDailyStates()
  const eintraege = Object.entries(data.days)
    .filter(([date, day]) => date < today && dayHasEntry(day))
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)

  if (eintraege.length === 0 && !children) return null

  return (
    <div className={s.wrap}>
      <div className={s.label}>Frühere Tage</div>
      {eintraege.length > 0 && (
        <div className={s.strip}>
          {eintraege.map(([date, day]) => {
            const mood = states[date]?.mood
            return (
              <button key={date} className={s.mini} onClick={() => onOpen(date)}>
                <span className={s.miniHead}>
                  {mood != null && <span className={s.moodDot} style={{ background: MOOD_COLORS[mood - 1] }} />}
                  <span className={s.miniDate}>{date.slice(8, 10)}.{date.slice(5, 7)}.</span>
                </span>
                <span className={s.miniText}>{firstLine(day)}</span>
              </button>
            )
          })}
        </div>
      )}
      {children /* KI-Export-Bereich, Task 11 */}
    </div>
  )
}
