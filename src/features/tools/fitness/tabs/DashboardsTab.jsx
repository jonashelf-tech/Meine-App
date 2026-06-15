import { useMemo, useState } from 'react'
import s from './DashboardsTab.module.css'
import { ensureSeeded, loadSessions, savePlan } from '../fitnessStore'
import { realSetsPerMuscle, plannedRealSetsPerMuscle, volumeZone, weekStartIso, e1rmSeries, reviewExercise, weeklyVolumeAdjust } from '../fitnessLogic'
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

const TREND_VARS = {
  up: 'var(--emerald)',
  down: 'var(--rose)',
  flat: 'var(--text-dim)',
}

const TrendArrow = ({ trend }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TREND_VARS[trend]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {trend === 'up' && <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="6 11 12 5 18 11" /></>}
    {trend === 'down' && <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="6 13 12 19 18 13" /></>}
    {trend === 'flat' && <line x1="5" y1="12" x2="19" y2="12" />}
  </svg>
)

const fmtKg = (n) => `${n.toLocaleString('de-DE')} kg`

const fmtDate = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}.${m}.`
}

function Sparkline({ series }) {
  const values = series.map(p => p.e1rm)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const pad = range > 0 ? range * 0.15 : Math.max(max * 0.1, 1)
  const yMin = min - pad
  const yMax = max + pad
  const W = 300
  const H = 80
  const x = (i) => series.length > 1 ? (i / (series.length - 1)) * W : W / 2
  const y = (v) => H - ((v - yMin) / (yMax - yMin)) * H
  const points = series.map((p, i) => `${x(i)},${y(p.e1rm)}`).join(' ')

  return (
    <div className={s.sparkWrap}>
      <svg className={s.sparkSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {series.length > 1 && (
          <polyline points={points} fill="none" stroke="var(--tool-color, var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {series.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.e1rm)} r="3" fill="var(--tool-color, var(--primary))" />
        ))}
      </svg>
      <div className={s.sparkLabels}>
        <span>{fmtKg(min)}</span>
        <span>{fmtKg(max)}</span>
      </div>
      <div className={s.sparkRange}>
        {fmtDate(series[0].date)} – {fmtDate(series[series.length - 1].date)}
      </div>
    </div>
  )
}

// Primärmuskel: Key mit dem höchsten Allokations-Anteil.
const primaryMuscle = (allocation) =>
  Object.entries(allocation || {}).sort((a, b) => b[1] - a[1])[0]?.[0]

function WeekCheckCard() {
  const [dismissed, setDismissed] = useState(false)

  const { coachPlan, proposals } = useMemo(() => {
    const fitness = ensureSeeded()
    const sessions = loadSessions()
    const plan = fitness.plans.find(p => p.id === fitness.meta.activePlanId)
    const coachPlan = plan?.modus === 'coach' ? plan : null
    if (!coachPlan) return { coachPlan: null, proposals: [] }

    const seen = new Set()
    const proposals = []
    coachPlan.days.forEach(day => {
      day.exercises.forEach(entry => {
        const exId = entry.exerciseId
        if (seen.has(exId)) return
        seen.add(exId)
        const exObj = fitness.exercises.find(e => e.id === exId)
        if (!exObj) return
        const { trend, feedbackDist } = reviewExercise(sessions, exId)
        const hasSignal = trend !== 'flat' || Object.values(feedbackDist).some(n => n > 0)
        if (!hasSignal) return
        const muscle = primaryMuscle(exObj.allocation)
        const currentZielSaetze = entry.zielSaetze
        const newSets = weeklyVolumeAdjust(muscle, currentZielSaetze, trend, feedbackDist)
        const min = exObj.kategorie === 'grund' ? 3 : 2
        const max = exObj.kategorie === 'grund' ? 5 : 4
        const bounded = Math.max(min, Math.min(newSets, max))
        if (bounded !== currentZielSaetze) {
          proposals.push({ exId, name: exObj.name, from: currentZielSaetze, to: bounded })
        }
      })
    })
    return { coachPlan, proposals }
  }, [])

  if (!coachPlan || !proposals.length || dismissed) return null

  const apply = () => {
    const updatedPlan = {
      ...coachPlan,
      days: coachPlan.days.map(day => ({
        ...day,
        exercises: day.exercises.map(entry => {
          const proposal = proposals.find(p => p.exId === entry.exerciseId)
          return proposal ? { ...entry, zielSaetze: proposal.to } : entry
        }),
      })),
    }
    savePlan(updatedPlan)
    setDismissed(true)
  }

  return (
    <div className={s.weekCheck}>
      <div className={s.weekCheckTitle}>Wochen-Check</div>
      <div className={s.weekCheckHint}>Vorschläge auf Basis von Verlauf & Feedback:</div>
      <div className={s.weekCheckList}>
        {proposals.map(p => (
          <div key={p.exId} className={s.weekCheckRow}>
            <span className={s.weekCheckName}>{p.name}</span>
            <span className={[s.weekCheckChange, p.to > p.from ? s.weekCheckUp : s.weekCheckDown].join(' ')}>
              {p.from} → {p.to} Sätze
            </span>
          </div>
        ))}
      </div>
      <div className={s.weekCheckBtns}>
        <button className={s.weekCheckBtnPrimary} onClick={apply}>Anwenden</button>
        <button className={s.weekCheckBtnGhost} onClick={() => setDismissed(true)}>Später</button>
      </div>
    </div>
  )
}

// Balken pro Muskel: reale Sätze gegen die MEV/MAV/MRV-Referenz (geloggt oder geplant).
function MuscleVolumeBars({ data }) {
  const trackedMuscles = MUSCLES.filter(m => VOLUME_REF[m])
  const untrackedMuscles = MUSCLES.filter(m => !VOLUME_REF[m])
  return (
    <>
      <div className={s.bars}>
        {trackedMuscles.map(m => {
          const sets = data[m] ?? 0
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
                <div className={s.fill} style={{ width: `${fillPct}%`, background: ZONE_VARS[zone] }} />
                <div className={s.tick} style={{ left: `${mevPct}%` }} />
                <div className={s.tick} style={{ left: `${mavHiPct}%` }} />
              </div>
              <div className={s.ref}>MEV {ref.mev} · MAV {ref.mav[0]}–{ref.mav[1]} · MRV {ref.mrv}</div>
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
              <span className={s.untrackedValue}>{fmtNum(data[m] ?? 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// Geplantes Soll-Volumen des aktiven Plans gegen die Referenztabelle.
function PlannedView({ exercises }) {
  const fitness = ensureSeeded()
  const plan = fitness.plans.find(p => p.id === fitness.meta.activePlanId)
  const planned = useMemo(() => plan ? plannedRealSetsPerMuscle(plan, exercises) : {}, [plan, exercises])

  if (!plan) {
    return <div className={s.empty}>Kein aktiver Plan — setze einen Plan aktiv, um sein Soll-Volumen pro Muskel zu sehen.</div>
  }
  return (
    <>
      <div className={s.consistency}>{plan.name} · geplantes reales Volumen / Woche</div>
      <MuscleVolumeBars data={planned} />
    </>
  )
}

function VolumeView({ sessions, exercises }) {
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

  const hasAnySessions = sessions.length > 0

  return (
    <>
      <WeekCheckCard />

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
        <MuscleVolumeBars data={real} />
      )}
    </>
  )
}

function StrengthView({ sessions, exercises }) {
  const [expandedId, setExpandedId] = useState(null)

  const rows = useMemo(() => {
    return exercises
      .map(ex => {
        const series = e1rmSeries(sessions, ex.id)
        if (!series.length) return null
        const last = series[series.length - 1]
        const prev = series.length > 1 ? series[series.length - 2] : null
        let trend = 'flat'
        if (prev) {
          if (last.e1rm > prev.e1rm) trend = 'up'
          else if (last.e1rm < prev.e1rm) trend = 'down'
        }
        return { exercise: ex, series, current: last.e1rm, trend }
      })
      .filter(Boolean)
      .sort((a, b) => b.current - a.current)
  }, [sessions, exercises])

  if (!rows.length) {
    return <div className={s.empty}>Noch keine Kraftdaten — nach dem ersten Training erscheinen hier deine e1RM-Verläufe.</div>
  }

  return (
    <div className={s.strengthList}>
      {rows.map(({ exercise, series, current, trend }) => {
        const isOpen = expandedId === exercise.id
        return (
          <div key={exercise.id} className={s.strengthCard}>
            <button
              className={s.strengthRow}
              onClick={() => setExpandedId(isOpen ? null : exercise.id)}
              aria-expanded={isOpen}
            >
              <span className={s.strengthName}>{exercise.name}</span>
              <span className={s.strengthRight}>
                <span className={s.strengthValue}>{fmtKg(current)}</span>
                <TrendArrow trend={trend} />
              </span>
            </button>
            {isOpen && <Sparkline series={series} />}
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardsTab() {
  const fitness = ensureSeeded()
  const sessions = loadSessions()
  const exercises = fitness.exercises

  const [view, setView] = useState('plan')

  return (
    <div className={s.page}>
      <div className={s.toggle}>
        <button
          className={[s.toggleBtn, view === 'plan' ? s.toggleBtnActive : ''].join(' ')}
          onClick={() => setView('plan')}
        >
          Plan-Soll
        </button>
        <button
          className={[s.toggleBtn, view === 'volumen' ? s.toggleBtnActive : ''].join(' ')}
          onClick={() => setView('volumen')}
        >
          Geloggt
        </button>
        <button
          className={[s.toggleBtn, view === 'kraft' ? s.toggleBtnActive : ''].join(' ')}
          onClick={() => setView('kraft')}
        >
          Kraft
        </button>
      </div>

      {view === 'plan' && <PlannedView exercises={exercises} />}
      {view === 'volumen' && <VolumeView sessions={sessions} exercises={exercises} />}
      {view === 'kraft' && <StrengthView sessions={sessions} exercises={exercises} />}
    </div>
  )
}
