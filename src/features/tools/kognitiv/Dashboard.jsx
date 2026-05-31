import { loadSessions, getModuleStats, getWeeklyCount } from './sessionStore'
import { MODULE_CONFIG, MODULE_ORDER } from './moduleConfig'
import ModuleIcon from './ModuleIcon'
import s from './Dashboard.module.css'

export default function Dashboard({ onSelectModule }) {
  const allSessions = loadSessions()
  const weeklyCount = getWeeklyCount()
  const trained     = MODULE_ORDER.filter(id => getModuleStats(id))

  if (allSessions.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.empty}>
          <div className={s.emptyIcon}><ModuleIcon id="alertness" size={26} /></div>
          <div className={s.emptyTitle}>Noch kein Training</div>
          <div className={s.emptyText}>Starte ein Modul — hier siehst du danach deinen Fortschritt über die Zeit.</div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.root}>
      <div className={s.summary}>
        <div className={s.sumCol}>
          <div className={s.sumVal}>{allSessions.length}</div>
          <div className={s.sumLbl}>Sessions</div>
        </div>
        <div className={s.sumDivider} />
        <div className={s.sumCol}>
          <div className={s.sumVal}>{weeklyCount || '—'}</div>
          <div className={s.sumLbl}>Diese Woche</div>
        </div>
        <div className={s.sumDivider} />
        <div className={s.sumCol}>
          <div className={s.sumVal}>{trained.length}<span className={s.sumOf}>/{MODULE_ORDER.length}</span></div>
          <div className={s.sumLbl}>Module</div>
        </div>
      </div>

      <div className={s.secLabel}>Fortschritt je Modul</div>

      {trained.map(id => {
        const m     = MODULE_CONFIG[id]
        const stats = getModuleStats(id)
        return (
          <button key={id} className={s.tile} style={{ '--accent': m.color }} onClick={() => onSelectModule(id)}>
            <div className={s.tileIcon}><ModuleIcon id={id} size={17} /></div>
            <div className={s.tileInfo}>
              <div className={s.tileName}>{m.name}</div>
              <div className={s.tileLast}>
                {stats.latest > 0 ? `${stats.latest}${m.mainMetricUnit}` : '—'}{stats.latestDuration != null ? ` · ${stats.latestDuration}s` : ''} · {stats.sessions} {stats.sessions === 1 ? 'Session' : 'Sessions'}
              </div>
            </div>
            <div className={s.tileRight}>
              <div className={[s.tileDelta, stats.improvement > 0 ? s.deltaGood : s.deltaBad].join(' ')}>
                {stats.improvement > 0 ? '↑' : '↓'} {Math.abs(stats.improvement)}{m.mainMetricUnit}
              </div>
              <div className={s.miniChart}>
                {stats.last7.map((sess, i) => (
                  <div
                    key={i}
                    className={[s.miniBar, i === stats.last7.length - 1 ? s.miniBarLast : ''].join(' ')}
                    style={{ height: `${stats.best > 0 && sess.mainMetric > 0 ? Math.max(20, Math.min(100, (stats.best / sess.mainMetric) * 100)) : 50}%` }}
                  />
                ))}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
