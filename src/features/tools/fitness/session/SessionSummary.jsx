import s from './SessionSummary.module.css'

// ─── SVG Icons ────────────────────────────────────────────
const TrophyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8" /><path d="M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 5h2a2 2 0 0 1 0 4h-2" />
    <path d="M7 5H5a2 2 0 0 0 0 4h2" />
  </svg>
)

const fmtDuration = sec => {
  const m = Math.floor(sec / 60)
  const ss = sec % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    return `${h}h ${mm}m`
  }
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const fmtVolume = vol => `${Math.round(vol).toLocaleString('de-DE')} kg`

const prLabel = pr => {
  switch (pr.type) {
    case 'weight': return `Neues Top-Gewicht: ${pr.value} kg`
    case 'e1rm': return `Neuer Kraftwert (e1RM): ${pr.value} kg`
    case 'reps': return `Mehr Wdh bei ${pr.gewicht} kg: ${pr.value}`
    default: return ''
  }
}

export default function SessionSummary({ durationSec, totalVolume, prs, onClose }) {
  return (
    <div className={s.overlay}>
      <div className={s.content}>
        {prs.length > 0 ? (
          <h1 className={s.headline}>Stark! {prs.length} neue Bestleistung{prs.length > 1 ? 'en' : ''}</h1>
        ) : (
          <h1 className={s.headline}>Geschafft — sauber durchgezogen.</h1>
        )}

        <div className={s.stats}>
          <div className={s.statBlock}>
            <div className={s.statValue}>{fmtDuration(durationSec)}</div>
            <div className={s.statLabel}>Dauer</div>
          </div>
          <div className={s.statBlock}>
            <div className={s.statValue}>{fmtVolume(totalVolume)}</div>
            <div className={s.statLabel}>Gesamtvolumen</div>
          </div>
        </div>

        {prs.length > 0 && (
          <div className={s.prList}>
            {prs.map((pr, i) => (
              <div key={i} className={s.prRow}>
                <span className={s.prIcon}><TrophyIcon /></span>
                <div className={s.prText}>
                  <div className={s.prExercise}>{pr.exerciseName}</div>
                  <div className={s.prLabel}>{prLabel(pr)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className={s.finishBtn} onClick={onClose}>Fertig</button>
      </div>
    </div>
  )
}
