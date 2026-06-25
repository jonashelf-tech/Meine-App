import { loadSessions, getModuleStats, getWeeklyCount, barFraction } from './sessionStore'
import { MODULE_CONFIG, MODULE_ORDER } from './moduleConfig'
import { ToolIcon } from '../toolRegistry'
import ModuleIcon from './ModuleIcon'
import s from './Dashboard.module.css'

const PulseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>
)
const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
)
const GridIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
)

export default function Dashboard({ onSelectModule }) {
  const allSessions = loadSessions()
  const weeklyCount = getWeeklyCount()
  const trained     = MODULE_ORDER.filter(id => getModuleStats(id))

  if (allSessions.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.empty}>
          <div className={s.emptyIcon}><ToolIcon id="kognitiv" size={26} /></div>
          <div className={s.emptyTitle}>Noch kein Training</div>
          <div className={s.emptyText}>Starte ein Modul — hier siehst du danach deinen Fortschritt über die Zeit.</div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.root}>
      <div className={s.tiles}>
        <div className={s.tile}>
          <div className={s.tileIcon}><PulseIcon /></div>
          <div className={s.tileNum}>{allSessions.length}</div>
          <div className={s.tileLabel}>Sessions</div>
        </div>
        <div className={[s.tile, s.tileHighlight].join(' ')}>
          <div className={s.tileIcon}><CalIcon /></div>
          <div className={s.tileNum}>{weeklyCount || '—'}</div>
          <div className={s.tileLabel}>Diese Woche</div>
        </div>
        <div className={s.tile}>
          <div className={s.tileIcon}><GridIcon /></div>
          <div className={s.tileNum}>{trained.length}<small>/{MODULE_ORDER.length}</small></div>
          <div className={s.tileLabel}>Module</div>
        </div>
      </div>

      <div className={s.secLabel}>Fortschritt je Modul</div>

      {trained.map(id => {
        const m     = MODULE_CONFIG[id]
        const stats = getModuleStats(id)
        const imp   = stats.improvement
        return (
          <button key={id} className={s.card} style={{ '--accent': m.color }} onClick={() => onSelectModule(id)}>
            <div className={s.cardIcon}><ModuleIcon id={id} size={18} /></div>
            <div className={s.cardInfo}>
              <div className={s.cardName}>{m.name}</div>
              <div className={s.cardLast}>
                {stats.latest > 0 ? `${stats.latest}${m.mainMetricUnit}` : '—'}{stats.latestDuration != null ? ` · ${stats.latestDuration}s` : ''} · {stats.sessions} {stats.sessions === 1 ? 'Session' : 'Sessions'}
              </div>
            </div>
            <div className={s.cardRight}>
              <div className={[s.delta, imp > 0 ? s.deltaGood : imp < 0 ? s.deltaBad : s.deltaFlat].join(' ')}>
                {imp > 0 ? '▲' : imp < 0 ? '▼' : '–'} {Math.abs(imp)}{m.mainMetricUnit}
              </div>
              {stats.last7.length > 1 && (
                <div className={s.miniChart}>
                  {stats.last7.map((sess, i) => (
                    <div
                      key={i}
                      className={[s.miniBar, i === stats.last7.length - 1 ? s.miniBarLast : ''].join(' ')}
                      style={{ height: `${Math.max(20, Math.min(100, barFraction(sess.mainMetric, stats.best, stats.higherIsBetter) * 100))}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
