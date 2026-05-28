import { MODULE_CONFIG } from './moduleConfig'
import { getDelta, getModuleSessions } from './sessionStore'
import s from './Results.module.css'

export default function Results({ session, fromArchive = false, onBack, onSaveToCalendar }) {
  const m        = MODULE_CONFIG[session.moduleId]
  const delta    = getDelta(session.moduleId, session.mainMetric)
  const last7    = getModuleSessions(session.moduleId).slice(-7)

  const taps     = session.taps ?? []
  const hitTimes = taps.filter(t => t.correct && t.time != null).map(t => t.time)
  const maxTime  = Math.max(...hitTimes, 1)

  const deltaLabel = delta !== null
    ? (delta > 0
        ? `▲ ${Math.abs(delta)}${m.mainMetricUnit} besser`
        : `▼ ${Math.abs(delta)}${m.mainMetricUnit} schlechter`)
    : null

  return (
    <div className={s.root}>
      <button className={s.backBtn} onClick={onBack}>‹</button>
      <div className={s.eyebrow}>{fromArchive ? 'Archiv' : 'Fertig'}</div>
      <div className={s.title}>{m.name}</div>

      <div className={s.hero}>
        <div className={s.heroLeft}>
          <div className={s.score}>{session.mainMetric}</div>
          <div className={s.scoreLabel}>{m.mainMetricLabel} · {m.mainMetricUnit}</div>
          {deltaLabel && (
            <div className={[s.delta, delta > 0 ? s.deltaGood : s.deltaBad].join(' ')}>
              {deltaLabel}
            </div>
          )}
        </div>
        {last7.length > 1 && (
          <div className={s.heroRight}>
            <div className={s.trendLabel}>Verlauf</div>
            <div className={s.trendBars}>
              {last7.map((sess, i) => (
                <div
                  key={i}
                  className={[s.trendBar, i === last7.length - 1 ? s.trendBarLast : ''].join(' ')}
                  style={{ height: `${Math.max(15, (Math.min(...last7.map(x => x.mainMetric)) / sess.mainMetric) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={s.metrics}>
        <div className={s.metric}>
          <div className={s.mVal} style={{ color: 'var(--emerald)' }}>
            {session.score.correct ?? session.score.correctRounds ?? '—'}
          </div>
          <div className={s.mLbl}>Korrekte</div>
        </div>
        <div className={s.metric}>
          <div className={s.mVal} style={{ color: 'var(--rose)' }}>
            {session.score.errors ?? '—'}
          </div>
          <div className={s.mLbl}>Fehler</div>
        </div>
        <div className={s.metric}>
          <div className={s.mVal}>{session.duration}s</div>
          <div className={s.mLbl}>Dauer</div>
        </div>
      </div>

      {hitTimes.length > 0 && (
        <div className={s.tapSection}>
          <div className={s.tapLabel}>Tipp-Zeiten</div>
          <div className={s.tapBars}>
            {taps.map((tap, i) => {
              const t     = tap.time ?? 0
              const h     = Math.max(10, Math.min(100, (t / maxTime) * 100))
              const color = !tap.correct ? 'var(--rose)'
                : t < maxTime * 0.4 ? 'var(--emerald)'
                : 'rgba(139,92,246,0.5)'
              return <div key={i} className={s.tapBar} style={{ height: `${h}%`, background: color }} />
            })}
          </div>
        </div>
      )}

      {!fromArchive && (
        <button className={s.calBtn} onClick={() => onSaveToCalendar(session)}>
          Im Kalender speichern
        </button>
      )}
      <button className={s.backBtn2} onClick={onBack}>
        {fromArchive ? 'Zurück' : 'Fertig'}
      </button>
    </div>
  )
}
