import { useState } from 'react'
import { ensureSeeded, currentDay, loadSessions, getExerciseById } from '../fitnessStore'
import {
  recoveryNeeded, scheduleStatus, weeklyStreak, sessionsThisWeek, avgDurationMin,
  weeklyFrequency, plannedRealSetsPerMuscle, estSessionMin,
} from '../fitnessLogic'
import { VOLUME_REF, MUSCLE_LABELS, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from '../fitnessModel'
import s from './HeuteTab.module.css'

const PlayIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
)
const BoltIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
)
const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
  </svg>
)
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HeuteTab({ onStartSession, onStartOnboarding }) {
  const fitness = ensureSeeded()
  const { plan, day, dayIndex } = currentDay(fitness)
  const sessions = loadSessions()
  const settings = fitness.settings
  const today = todayIso()

  const [recoveryDismissed, setRecoveryDismissed] = useState(false)
  const recoveryMuscles = Object.keys(VOLUME_REF)
    .filter(m => recoveryNeeded(m, sessions, fitness.exercises))

  const recoveryHint = !recoveryDismissed && recoveryMuscles.length > 0 && (
    <div className={s.recoveryCard}>
      <span className={s.recoveryText}>
        Erholung könnte helfen: {recoveryMuscles.map(m => MUSCLE_LABELS[m]).join(', ')}. Mach ruhig 3–5 leichtere Tage — kein Stress.
      </span>
      <button className={s.recoveryDismiss} onClick={() => setRecoveryDismissed(true)} aria-label="Hinweis ausblenden">×</button>
    </div>
  )

  const schedule = scheduleStatus(settings.schedule, sessions, today)
  const scheduleHint = schedule && (
    <div className={[s.scheduleHint, schedule.kind === 'rest' ? s.scheduleRest : ''].join(' ')}>
      {schedule.kind === 'done' && 'Heute erledigt'}
      {schedule.kind === 'train' && 'Heute Trainingstag'}
      {schedule.kind === 'rest' && 'Heute Pause'}
    </div>
  )

  if (!plan || !day) {
    return (
      <div className={s.page}>
        {recoveryHint}
        {scheduleHint}
        <div className={s.emptyCard}>
          <div className={s.emptyTitle}>Noch kein aktiver Plan</div>
          <div className={s.emptyText}>Starte den Coach und bekomm in wenigen Schritten einen Plan, der zu dir passt.</div>
          <button className={s.emptyCta} onClick={onStartOnboarding}>Plan erstellen</button>
        </div>
      </div>
    )
  }

  const workingSets = day.exercises.reduce((a, e) => a + (e.zielSaetze || 3), 0)
  const estMinutes = estSessionMin(workingSets)
  const previewNames = day.exercises.slice(0, 3).map(e => getExerciseById(fitness, e.exerciseId)?.name).filter(Boolean)
  const moreCount = day.exercises.length - previewNames.length

  const thisWeek = sessionsThisWeek(sessions, today)
  const weekGoal = settings.schedule?.mode === 'fixed' ? settings.schedule.days.length : null
  const streak = weeklyStreak(sessions, today)
  const avgMin = avgDurationMin(sessions)

  const freq = weeklyFrequency(settings, plan.days.length)
  const planned = plannedRealSetsPerMuscle(plan, fitness.exercises, settings.rhythm, freq)
  const groupBars = Object.entries(MUSCLE_GROUPS)
    .map(([groupId, muscles]) => {
      const sets = muscles.reduce((a, m) => a + (planned[m] || 0), 0)
      const goal = muscles.reduce((a, m) => a + (VOLUME_REF[m]?.mav?.[1] || 0), 0)
      return { groupId, sets, goal }
    })
    .filter(g => g.goal > 0)

  return (
    <div className={s.page}>
      {recoveryHint}
      {scheduleHint}

      <div className={s.sectionLabel}>Jetzt dran</div>
      <div className={s.hero}>
        <div className={s.heroRot}>Tag {dayIndex + 1}/{plan.days.length}</div>
        <div className={s.heroKick}><span className={s.heroDot} /> {plan.name}</div>
        <h2 className={s.heroTitle}>{day.name}</h2>
        <div className={s.heroMeta}>{day.exercises.length} Übungen · ~{estMinutes} min</div>
        {previewNames.length > 0 && (
          <div className={s.chips}>
            {previewNames.map(name => <span key={name} className={s.chip}>{name}</span>)}
            {moreCount > 0 && <span className={[s.chip, s.chipMore].join(' ')}>+{moreCount}</span>}
          </div>
        )}
        <button className={s.cta} onClick={() => onStartSession(plan.id, day.id, day.exercises)}>
          <PlayIcon /> Training starten
        </button>
      </div>

      <div className={s.tiles}>
        <div className={s.tile}>
          <div className={s.tileIcon}><CalIcon /></div>
          <div className={s.tileNum}>{thisWeek}{weekGoal != null && <small>/{weekGoal}</small>}</div>
          <div className={s.tileLabel}>Diese Woche</div>
        </div>
        <div className={[s.tile, s.tileHighlight].join(' ')}>
          <div className={s.tileIcon}><BoltIcon /></div>
          <div className={s.tileNum}>{streak}</div>
          <div className={s.tileLabel}>Wochen Streak</div>
        </div>
        <div className={s.tile}>
          <div className={s.tileIcon}><ClockIcon /></div>
          <div className={s.tileNum}>{avgMin}<small>m</small></div>
          <div className={s.tileLabel}>Ø Dauer</div>
        </div>
      </div>

      {groupBars.length > 0 && (
        <>
          <div className={s.sectionLabel}>Wochenvolumen</div>
          <div className={s.balance}>
            <div className={s.balanceHead}>
              <span className={s.balanceTitle}>Muskel-Balance</span>
              <span className={s.balanceSub}>Soll vs. Optimal</span>
            </div>
            {groupBars.map(({ groupId, sets, goal }) => {
              const fill = Math.min(100, Math.max(0, (sets / goal) * 100))
              return (
                <div key={groupId} className={s.balanceRow}>
                  <span className={s.balanceName}>{MUSCLE_GROUP_LABELS[groupId]}</span>
                  <div className={s.track}><div className={s.fill} style={{ width: `${fill}%` }} /></div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
