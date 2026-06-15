import { useState } from 'react'
import { ensureSeeded, currentDay, loadSessions, loadFitness } from '../fitnessStore'
import { recoveryNeeded, trainingDayStatus } from '../fitnessLogic'
import { VOLUME_REF, MUSCLE_LABELS } from '../fitnessModel'
import s from './HeuteTab.module.css'

export default function HeuteTab({ onStartSession }) {
  const fitness = ensureSeeded()
  const { plan, day } = currentDay(fitness)

  const [recoveryDismissed, setRecoveryDismissed] = useState(false)
  const recoveryMuscles = Object.keys(VOLUME_REF)
    .filter(m => recoveryNeeded(m, loadSessions(), fitness.exercises))

  const recoveryHint = !recoveryDismissed && recoveryMuscles.length > 0 && (
    <div className={s.recoveryCard}>
      <span className={s.recoveryText}>
        Erholung könnte helfen: {recoveryMuscles.map(m => MUSCLE_LABELS[m]).join(', ')}. Mach ruhig 3–5 leichtere Tage — kein Stress.
      </span>
      <button className={s.recoveryDismiss} onClick={() => setRecoveryDismissed(true)} aria-label="Hinweis ausblenden">×</button>
    </div>
  )

  const todayIso = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const rhythm = loadFitness().settings.rhythm
  const status = trainingDayStatus(rhythm, loadSessions(), todayIso)

  const rhythmHint = status && (
    <div className={`${s.rhythmHint} ${status.kind === 'rest' ? s.rhythmRest : ''}`}>
      {status.kind === 'done' && 'Heute erledigt 💪'}
      {status.kind === 'rest' && `Heute Pause empfohlen 😴 · ${rhythm.on}/${rhythm.off}-Rhythmus`}
      {status.kind === 'train' && 'Trainingstag'}
    </div>
  )

  if (!plan || !day) {
    return (
      <div className={s.page}>
        {recoveryHint}
        {rhythmHint}
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
      {recoveryHint}
      {rhythmHint}
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
