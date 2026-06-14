import { useMemo, useState } from 'react'
import { ensureSeeded, loadSessions, getExerciseById } from '../fitnessStore'
import s from './ArchivTab.module.css'

// ─── SVG Icons ────────────────────────────────────────────
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)

// ─── Konstanten ─────────────────────────────────────────────
const WORKING = ['normal', 'dropset', 'failure']

const SATZ_TYP_LABELS = {
  warmup: 'Aufwärmen',
  dropset: 'Dropset',
  failure: 'Failure',
}

const FEEDBACK_LABELS = {
  leicht: 'leicht',
  passt: 'passt',
  hart: 'hart',
  nichtGeschafft: 'nicht geschafft',
}

// ─── Helpers ────────────────────────────────────────────────
function sessionVolume(session) {
  return (session.exercises ?? []).reduce((sum, ex) => (
    sum + (ex.saetze ?? [])
      .filter(set => WORKING.includes(set.satzTyp))
      .reduce((a, set) => a + (set.gewicht || 0) * (set.wdh || 0), 0)
  ), 0)
}

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  const text = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  return text
}

function fmtDuration(sec) {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${h}h ${m}m`
  }
  const m = Math.floor(sec / 60)
  const ss = sec % 60
  return ss > 0 ? `${m}:${String(ss).padStart(2, '0')}` : `${m}m`
}

function planDayLabel(session, fitness) {
  if (!session.planId) return 'Freies Training'
  const plan = fitness.plans.find(p => p.id === session.planId)
  if (!plan) return 'Freies Training'
  const day = plan.days?.find(d => d.id === session.dayId)
  if (!day) return 'Freies Training'
  return `${plan.name} · ${day.name}`
}

function prLabel(pr) {
  switch (pr.type) {
    case 'weight': return `Top-Gewicht ${pr.value} kg`
    case 'e1rm': return `e1RM ${pr.value} kg`
    case 'reps': return `${pr.value} Wdh @ ${pr.gewicht} kg`
    default: return ''
  }
}

export default function ArchivTab() {
  const fitness = useMemo(() => ensureSeeded(), [])
  const sessions = useMemo(() => loadSessions(), [])
  const [selId, setSelId] = useState(null)
  const [filterEx, setFilterEx] = useState('')

  const selected = sessions.find(sess => sess.id === selId) ?? null

  const exerciseOptions = useMemo(() => {
    const ids = new Set()
    sessions.forEach(sess => (sess.exercises ?? []).forEach(ex => ids.add(ex.exerciseId)))
    return [...ids]
      .map(id => ({ id, name: getExerciseById(fitness, id)?.name ?? '—' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [sessions, fitness])

  const sorted = useMemo(() => {
    return [...sessions]
      .filter(sess => !filterEx || (sess.exercises ?? []).some(ex => ex.exerciseId === filterEx))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1
        return (a.startedAt < b.startedAt) ? 1 : -1
      })
  }, [sessions, filterEx])

  if (selected) {
    return <DetailView session={selected} fitness={fitness} onBack={() => setSelId(null)} />
  }

  return (
    <div className={s.page}>
      <div className={s.title}>Archiv</div>

      {sessions.length > 0 && (
        <select className={s.filterSelect} value={filterEx} onChange={e => setFilterEx(e.target.value)}>
          <option value="">Alle Übungen</option>
          {exerciseOptions.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      )}

      {sessions.length === 0 ? (
        <div className={s.empty}>Noch keine Trainings aufgezeichnet.</div>
      ) : sorted.length === 0 ? (
        <div className={s.empty}>Keine Trainings mit dieser Übung.</div>
      ) : (
        <div className={s.list}>
          {sorted.map(sess => {
            const vol = sessionVolume(sess)
            const exCount = sess.exercises?.length ?? 0
            return (
              <button key={sess.id} className={s.row} onClick={() => setSelId(sess.id)}>
                <div className={s.rowHead}>
                  <span className={s.rowDate}>{fmtDate(sess.date)}</span>
                  {sess.prs?.length > 0 && (
                    <span className={s.prBadge}>{sess.prs.length} PR</span>
                  )}
                </div>
                <span className={s.rowSub}>{planDayLabel(sess, fitness)}</span>
                <span className={s.rowSummary}>
                  {exCount} Übungen · {vol.toLocaleString('de-DE')} kg · {fmtDuration(sess.durationSec)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Detail ─────────────────────────────────────────────────
function DetailView({ session, fitness, onBack }) {
  const vol = sessionVolume(session)
  const exCount = session.exercises?.length ?? 0

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={onBack} aria-label="Zurück"><BackIcon /></button>
      </div>

      <div className={s.detailHead}>
        <div className={s.detailDate}>{fmtDate(session.date)}</div>
        <div className={s.detailSub}>{planDayLabel(session, fitness)}</div>
        <div className={s.detailSummary}>
          {exCount} Übungen · {vol.toLocaleString('de-DE')} kg · {fmtDuration(session.durationSec)}
        </div>
      </div>

      {session.prs?.length > 0 && (
        <div className={s.prSection}>
          <div className={s.prTitle}>Bestleistungen</div>
          {session.prs.map((pr, i) => (
            <div key={i} className={s.prRow}>
              <span className={s.prExercise}>{pr.exerciseName}</span>
              <span className={s.prValue}>{prLabel(pr)}</span>
            </div>
          ))}
        </div>
      )}

      <div className={s.exList}>
        {(session.exercises ?? []).map((ex, i) => {
          const name = getExerciseById(fitness, ex.exerciseId)?.name ?? '—'
          let workingIdx = 0
          return (
            <div key={i} className={s.exCard}>
              <div className={s.exName}>{name}</div>
              <div className={s.setList}>
                {(ex.saetze ?? []).map((set, j) => {
                  const isWarmup = set.satzTyp === 'warmup'
                  if (!isWarmup) workingIdx += 1
                  return (
                    <div key={j} className={s.setRow}>
                      <span className={s.setIdx}>{isWarmup ? 'W' : workingIdx}</span>
                      <span className={s.setValue}>{set.gewicht} kg × {set.wdh}</span>
                      {set.satzTyp !== 'normal' && SATZ_TYP_LABELS[set.satzTyp] && (
                        <span className={s.setTag}>{SATZ_TYP_LABELS[set.satzTyp]}</span>
                      )}
                      {set.feedback && (
                        <span className={s.setFeedback}>{FEEDBACK_LABELS[set.feedback] ?? set.feedback}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {session.sessionNotiz && (
        <div className={s.note}>{session.sessionNotiz}</div>
      )}
    </div>
  )
}
