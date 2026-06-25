import { MODULE_CONFIG } from './moduleConfig'
import { getModuleSessions, getModuleStats, barFraction, computeDelta } from './sessionStore'
import s from './ModuleDetail.module.css'

export default function ModuleDetail({ moduleId, onBack, onSelectSession }) {
  const m            = MODULE_CONFIG[moduleId]
  const hib          = m.higherIsBetter ?? false
  const sessions     = getModuleSessions(moduleId).slice().reverse()  // newest first
  const stats        = getModuleStats(moduleId)
  const chronological = [...sessions].reverse()  // for chart

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={s.root} style={{ '--accent': m.color }}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack}>
          <span className={s.arrow}>←</span> Zurück
        </button>
      </div>
      <div className={s.scroll}>
      <div className={s.hdInfo}>
        <div className={s.ey}>{m.domain}</div>
        <div className={s.tt}>{m.name}</div>
      </div>

      {stats && (
        <>
          <div className={s.chart}>
            <div className={s.chartLabel}>{m.mainMetricLabel} ({m.mainMetricUnit}) — Verlauf</div>
            <div className={s.bars}>
              {chronological.map((sess, i) => {
                const h      = Math.max(10, Math.min(100, barFraction(sess.mainMetric, stats.best, hib) * 100))
                const isLast = i === chronological.length - 1
                return <div key={sess.id} className={[s.bar, isLast ? s.barLast : ''].join(' ')} style={{ height: `${h}%` }} />
              })}
            </div>
          </div>

          <div className={s.statsRow}>
            <div className={s.stat}>
              <div className={s.statVal}>{stats.best}{m.mainMetricUnit}</div>
              <div className={s.statLbl}>Best</div>
            </div>
            <div className={s.stat}>
              <div className={s.statVal}>{stats.sessions}</div>
              <div className={s.statLbl}>Sessions</div>
            </div>
            <div className={s.stat}>
              <div className={s.statVal} style={{ color: stats.improvement >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                {stats.improvement >= 0 ? '▲' : '▼'}{Math.abs(stats.improvement)}{m.mainMetricUnit}
              </div>
              <div className={s.statLbl}>Gesamt</div>
            </div>
          </div>
        </>
      )}

      <div className={s.listLabel}>Alle Sessions</div>
      <div className={s.list}>
        {sessions.map((sess, idx) => {
          const prev  = sessions[idx + 1]
          const delta = prev ? computeDelta(prev.mainMetric, sess.mainMetric, hib) : null
          return (
            <button key={sess.id} className={s.sessRow} onClick={() => onSelectSession(sess)}>
              <div className={s.sessDate}>{fmtDate(sess.startedAt)} · {fmtTime(sess.startedAt)}</div>
              <div className={s.sessRight}>
                <span className={[s.sessDelta, delta == null ? '' : delta > 0 ? s.deltaGood : s.deltaBad].join(' ')}>
                  {delta == null ? '' : delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                </span>
                <span className={s.sessVal}>{sess.mainMetric}{m.mainMetricUnit}</span>
                <span className={s.sessArr}>›</span>
              </div>
            </button>
          )
        })}
      </div>
      </div>
    </div>
  )
}
