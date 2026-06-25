import { MODULE_CONFIG } from './moduleConfig'
import s from './SessionDetail.module.css'

export default function SessionDetail({ session, onBack }) {
  const m        = MODULE_CONFIG[session.moduleId]
  const taps     = session.taps ?? []
  const hitTimes = taps.filter(t => t.correct && t.time != null).map(t => t.time)
  const maxTime  = Math.max(...hitTimes, 1)

  const fmtDate = (iso) => new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={s.root}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack}>
          <span className={s.arrow}>←</span> Zurück
        </button>
      </div>
      <div className={s.scroll}>
      <div className={s.hdInfo}>
        <div className={s.ey}>{m.name} · Tiefenanalyse</div>
        <div className={s.tt}>{fmtDate(session.startedAt)}</div>
      </div>

      <div className={s.hero}>
        <div className={s.hCol}>
          <div className={s.hVal} style={{ color: 'var(--primary)' }}>{session.mainMetric}{m.mainMetricUnit}</div>
          <div className={s.hLbl}>{m.mainMetricLabel}</div>
        </div>
        <div className={s.hCol} style={{ borderLeft: '1px solid var(--border)' }}>
          <div className={s.hVal} style={{ color: 'var(--emerald)' }}>
            {session.score.correct ?? session.score.correctRounds ?? '—'}
          </div>
          <div className={s.hLbl}>Korrekt</div>
        </div>
        <div className={s.hCol} style={{ borderLeft: '1px solid var(--border)' }}>
          <div className={s.hVal}>{session.duration}s</div>
          <div className={s.hLbl}>Dauer</div>
        </div>
      </div>

      {hitTimes.length > 0 && (
        <div className={s.section}>
          <div className={s.secLabel}>Reaktionszeit pro Tipp</div>
          <div className={s.tapBars}>
            {taps.map((tap, i) => {
              const t     = tap.time ?? 0
              const h     = Math.max(8, Math.min(100, (t / maxTime) * 100))
              const color = !tap.correct ? 'var(--rose)'
                : t < maxTime * 0.4 ? 'var(--emerald)'
                : 'rgba(139,92,246,0.5)'
              return <div key={i} className={s.tapBar} style={{ height: `${h}%`, background: color }} />
            })}
          </div>
          <div className={s.legend}>
            <div className={s.legendItem}><div className={s.legendDot} style={{ background: 'var(--emerald)' }} />Schnell</div>
            <div className={s.legendItem}><div className={s.legendDot} style={{ background: 'rgba(139,92,246,0.5)' }} />Normal</div>
            <div className={s.legendItem}><div className={s.legendDot} style={{ background: 'var(--rose)' }} />Fehler</div>
          </div>
        </div>
      )}

      {taps.length > 0 && (
        <div className={s.section}>
          <div className={s.secLabel}>Jeder Tipp einzeln</div>
          {taps.map((tap, i) => (
            <div key={i} className={[s.tapRow, !tap.correct ? s.tapRowError : ''].join(' ')}>
              <div className={s.tapIdx}>{String(tap.target ?? i + 1).padStart(2, '0')}</div>
              <div className={s.tapBarWrap}>
                <div
                  className={s.tapBarInline}
                  style={{
                    width: `${Math.max(4, Math.min(100, ((tap.time ?? 0) / maxTime) * 100))}%`,
                    background: tap.correct ? 'var(--primary)' : 'var(--rose)',
                  }}
                />
              </div>
              <div className={s.tapTime} style={{ color: tap.correct ? 'var(--text-dim)' : 'var(--rose)' }}>
                {tap.time != null ? `${tap.time.toFixed(2)}s` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
