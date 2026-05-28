import { MODULE_CONFIG } from './moduleConfig'
import { getModuleSessions, getModuleStats } from './sessionStore'
import s from './ModuleDetail.module.css'

export default function ModuleDetail({ moduleId, onBack, onSelectSession }) {
  const m            = MODULE_CONFIG[moduleId]
  const sessions     = getModuleSessions(moduleId).slice().reverse()  // newest first
  const stats        = getModuleStats(moduleId)
  const chronological = [...sessions].reverse()  // for chart
  const maxMetric    = Math.max(...chronological.map(s => s.mainMetric), 1)
  const minMetric    = Math.min(...chronological.map(s => s.mainMetric), 0)

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={s.root}>
      <div className={s.hd}>
        <button className={s.back} onClick={onBack}>‹</button>
        <div>
          <div className={s.ey}>Dashboard → Modul</div>
          <div className={s.tt}>{m.name}</div>
        </div>
      </div>

      {stats && (
        <>
          <div className={s.chart}>
            <div className={s.chartLabel}>{m.mainMetricLabel} ({m.mainMetricUnit}) — Verlauf</div>
            <div className={s.bars}>
              {chronological.map((sess, i) => {
                const h      = Math.max(10, ((sess.mainMetric - minMetric) / (maxMetric - minMetric + 1)) * 100)
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
              <div className={s.statVal} style={{ color: 'var(--emerald)' }}>
                {stats.improvement > 0 ? `−${stats.improvement}` : `+${Math.abs(stats.improvement)}`}{m.mainMetricUnit}
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
          const delta = prev ? prev.mainMetric - sess.mainMetric : null
          return (
            <button key={sess.id} className={s.sessRow} onClick={() => onSelectSession(sess)}>
              <div className={s.sessDate}>{fmtDate(sess.startedAt)} · {fmtTime(sess.startedAt)} · {sess.variant}</div>
              <div className={s.sessRight}>
                <span className={s.sessVal}>{sess.mainMetric}{m.mainMetricUnit}</span>
                {delta !== null && (
                  <span className={[s.sessDelta, delta > 0 ? s.deltaGood : s.deltaBad].join(' ')}>
                    {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                  </span>
                )}
                <span className={s.sessArr}>›</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
