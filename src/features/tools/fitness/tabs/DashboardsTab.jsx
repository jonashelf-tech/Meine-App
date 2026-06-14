import { useMemo, useState } from 'react'
import s from './DashboardsTab.module.css'
import { ensureSeeded, loadSessions } from '../fitnessStore'
import { realSetsPerMuscle, volumeZone, weekStartIso } from '../fitnessLogic'
import { MUSCLES, MUSCLE_LABELS, VOLUME_REF } from '../fitnessModel'
import { todayKey } from '../../../../utils'

const isoAddDays = (iso, days) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const fmtDayMonth = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}.${m}.`
}

const fmtNum = (n) => n.toLocaleString('de-DE')

const ZONE_VARS = {
  low: 'var(--text-dim)',
  optimal: 'var(--emerald)',
  high: 'var(--amber)',
  over: 'var(--rose)',
}

const Chevron = ({ direction }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {direction === 'left'
      ? <polyline points="15 18 9 12 15 6" />
      : <polyline points="9 18 15 12 9 6" />}
  </svg>
)

export default function DashboardsTab() {
  const fitness = ensureSeeded()
  const sessions = loadSessions()
  const exercises = fitness.exercises

  const currentWeekStart = weekStartIso(todayKey())
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const isCurrentWeek = weekStart === currentWeekStart
  const weekEnd = isoAddDays(weekStart, 6)
  const weekEndExclusive = isoAddDays(weekStart, 7)

  const real = useMemo(() => realSetsPerMuscle(sessions, exercises, weekStart), [sessions, exercises, weekStart])

  const sessionCount = useMemo(
    () => sessions.filter(sess => sess.date >= weekStart && sess.date < weekEndExclusive).length,
    [sessions, weekStart, weekEndExclusive]
  )

  const trackedMuscles = MUSCLES.filter(m => VOLUME_REF[m])
  const untrackedMuscles = MUSCLES.filter(m => !VOLUME_REF[m])

  const hasAnySessions = sessions.length > 0

  return (
    <div className={s.page}>
      <div className={s.weekNav}>
        <button className={s.navBtn} onClick={() => setWeekStart(w => isoAddDays(w, -7))} aria-label="Vorherige Woche">
          <Chevron direction="left" />
        </button>
        <div className={s.weekLabel}>
          {isCurrentWeek ? 'Diese Woche' : `${fmtDayMonth(weekStart)}–${fmtDayMonth(weekEnd)}`}
        </div>
        <button
          className={s.navBtn}
          onClick={() => setWeekStart(w => isoAddDays(w, 7))}
          disabled={isCurrentWeek}
          aria-label="Nächste Woche"
        >
          <Chevron direction="right" />
        </button>
      </div>

      <div className={s.consistency}>
        {sessionCount > 0
          ? `${sessionCount} Training${sessionCount === 1 ? '' : 's'} diese Woche`
          : 'Noch kein Training diese Woche'}
      </div>

      {!hasAnySessions ? (
        <div className={s.empty}>Noch keine Trainingsdaten — leg los, dann erscheint hier dein Volumen.</div>
      ) : (
        <>
          <div className={s.bars}>
            {trackedMuscles.map(m => {
              const sets = real[m] ?? 0
              const ref = VOLUME_REF[m]
              const zone = volumeZone(m, sets)
              const fillPct = Math.min(sets, ref.mrv) / ref.mrv * 100
              const mevPct = ref.mev / ref.mrv * 100
              const mavHiPct = ref.mav[1] / ref.mrv * 100
              return (
                <div key={m} className={s.bar}>
                  <div className={s.barHead}>
                    <span className={s.barLabel}>{MUSCLE_LABELS[m]}</span>
                    <span className={s.barValue}>{fmtNum(sets)}</span>
                  </div>
                  <div className={s.track}>
                    <div
                      className={s.fill}
                      style={{ width: `${fillPct}%`, background: ZONE_VARS[zone] }}
                    />
                    <div className={s.tick} style={{ left: `${mevPct}%` }} />
                    <div className={s.tick} style={{ left: `${mavHiPct}%` }} />
                  </div>
                  <div className={s.ref}>
                    MEV {ref.mev} · MAV {ref.mav[0]}–{ref.mav[1]} · MRV {ref.mrv}
                  </div>
                </div>
              )
            })}
          </div>

          <div className={s.untracked}>
            <div className={s.untrackedTitle}>Nur getrackt</div>
            <div className={s.untrackedList}>
              {untrackedMuscles.map(m => (
                <div key={m} className={s.untrackedRow}>
                  <span className={s.untrackedLabel}>{MUSCLE_LABELS[m]}</span>
                  <span className={s.untrackedValue}>{fmtNum(real[m] ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
