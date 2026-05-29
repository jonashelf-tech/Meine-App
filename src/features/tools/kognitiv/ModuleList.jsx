import { ToolIcon } from '../toolRegistry'
import { MODULE_CONFIG, MODULE_ORDER, PHASE2_MODULES } from './moduleConfig'
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
          <button key={id} className={s.card} onClick={() => onSelectModule(id)}>
            <div className={s.iconWrap}>
              <ToolIcon id="kognitiv" size={18} />
            </div>
            <div className={s.info}>
              <div className={s.name}>{m.name}</div>
              <div className={s.desc}>{m.desc.split('.')[0]}.</div>
            </div>
            <div className={s.right}>
              {done && <div className={s.donePill}>✓ heute</div>}
              {!done && last && (
                <div className={s.lastVal}>
                  {last.mainMetric}{m.mainMetricUnit}
                </div>
              )}
              {stats && (
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
