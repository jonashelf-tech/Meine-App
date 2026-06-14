import { ensureSeeded, currentDay } from '../fitnessStore'
import s from './HeuteTab.module.css'

export default function HeuteTab({ onStartSession }) {
  const fitness = ensureSeeded()
  const { plan, day } = currentDay(fitness)

  if (!plan || !day) {
    return (
      <div className={s.page}>
        <div className={s.empty}>
          <div className={s.emptyTitle}>Kein aktiver Plan</div>
          Lege im Tab „Pläne" einen Plan an und setze ihn aktiv, um hier dein heutiges Training zu sehen.
        </div>
      </div>
    )
  }

  const exerciseCount = day.exercises.length
  const estMinutes = day.exercises.reduce((a, e) => a + (e.zielSaetze || 3), 0) * 3

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.dayName}>{day.name}</div>
        <div className={s.meta}>{exerciseCount} Übungen · ~{estMinutes} min</div>
        <button className={s.startBtn} onClick={() => onStartSession(plan.id, day.id, day.exercises)}>
          Training starten
        </button>
      </div>
    </div>
  )
}
