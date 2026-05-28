import { loadSessions, getModuleStats, getWeeklyCount } from './sessionStore'
import { MODULE_CONFIG, MODULE_ORDER } from './moduleConfig'
import { ToolIcon } from '../toolRegistry'
import s from './Dashboard.module.css'

export default function Dashboard({ onSelectModule }) {
  const allSessions = loadSessions()
  const weeklyCount = getWeeklyCount()

  return (
    <div className={s.root}>
      <div className={s.summary}>
        <div className={s.sumCol}>
          <div className={s.sumVal}>{allSessions.length}</div>
          <div className={s.sumLbl}>Sessions</div>
        </div>
        <div className={s.sumDivider} />
        <div className={s.sumCol}>
          <div className={s.sumVal}>{weeklyCount}</div>
          <div className={s.sumLbl}>Diese Woche</div>
        </div>
        <div className={s.sumDivider} />
        <div className={s.sumCol}>
          <div className={s.sumVal} style={{ color: 'var(--emerald)' }}>↑</div>
          <div className={s.sumLbl}>Trend</div>
        </div>
      </div>

      <div className={s.secLabel}>Module</div>

      {MODULE_ORDER.map(id => {
        const m     = MODULE_CONFIG[id]
        const stats = getModuleStats(id)
        if (!stats) return (
          <div key={id} className={s.tile}>
            <div className={s.tileIcon}><ToolIcon id="kognitiv" size={15} /></div>
            <div className={s.tileInfo}>
              <div className={s.tileName}>{m.name}</div>
              <div className={s.tileLast}>Noch keine Session</div>
            </div>
          </div>
        )
        return (
          <button key={id} className={s.tile} onClick={() => onSelectModule(id)}>
            <div className={s.tileIcon}><ToolIcon id="kognitiv" size={15} /></div>
            <div className={s.tileInfo}>
              <div className={s.tileName}>{m.name}</div>
              <div className={s.tileLast}>Zuletzt: {stats.latest}{m.mainMetricUnit} · {stats.sessions} Sessions</div>
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
                    style={{ height: `${Math.max(20, (stats.best / sess.mainMetric) * 100)}%` }}
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
