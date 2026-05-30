import ModuleIcon from './ModuleIcon'
import { MODULE_CONFIG, MODULE_ORDER } from './moduleConfig'
import { isDoneToday, getLastSession, getModuleStats } from './sessionStore'
import s from './ModuleList.module.css'

export default function ModuleList({ onSelectModule }) {
  return (
    <div className={s.list}>
      {MODULE_ORDER.map(id => {
        const m     = MODULE_CONFIG[id]
        const done  = isDoneToday(id)
        const stats = getModuleStats(id)
        const last  = getLastSession(id)
        return (
          <button
            key={id}
            className={s.card}
            style={{ '--accent': m.color }}
            onClick={() => onSelectModule(id)}
          >
            <div className={s.accentBar} />
            <div className={s.iconWrap}>
              <ModuleIcon id={id} size={20} />
            </div>
            <div className={s.info}>
              <div className={s.domain}>{m.domain}</div>
              <div className={s.name}>{m.name}</div>
              <div className={s.desc}>{m.desc.split('.')[0]}.</div>
            </div>
            <div className={s.right}>
              {done
                ? <div className={s.donePill}>✓ heute</div>
                : last
                  ? <div className={s.lastVal}>{last.mainMetric}<span className={s.unit}>{m.mainMetricUnit}</span></div>
                  : <div className={s.newPill}>neu</div>
              }
              {stats && stats.last7.length > 1 && (
                <div className={s.miniChart}>
                  {stats.last7.map((sess, i) => (
                    <div
                      key={i}
                      className={[s.miniBar, i === stats.last7.length - 1 ? s.miniBarLast : ''].join(' ')}
                      style={{ height: `${Math.max(20, Math.min(100, (stats.best / sess.mainMetric) * 100))}%` }}
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
