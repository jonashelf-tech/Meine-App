import ModuleIcon from './ModuleIcon'
import { MODULE_CONFIG, MODULE_ORDER } from './moduleConfig'
import { isDoneToday, getLastSession, getModuleStats, barFraction, getScheduledToday } from './sessionStore'
import s from './ModuleList.module.css'

function ModuleCard({ id, onSelectModule, due = false, time = null }) {
  const m     = MODULE_CONFIG[id]
  const done  = isDoneToday(id)
  const stats = getModuleStats(id)
  const last  = getLastSession(id)

  return (
    <button
      className={[s.card, due ? s.cardDue : ''].join(' ')}
      style={{ '--accent': m.color }}
      onClick={() => onSelectModule(id)}
    >
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
          : time
            ? <div className={s.timePill}>{time}</div>
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
                style={{ height: `${Math.max(20, Math.min(100, barFraction(sess.mainMetric, stats.best, stats.higherIsBetter) * 100))}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

export default function ModuleList({ onSelectModule }) {
  const scheduled = getScheduledToday()                       // [{ moduleId, time }]
  const dueTime   = Object.fromEntries(scheduled.map(x => [x.moduleId, x.time]))
  const dueIds    = scheduled.map(x => x.moduleId)
  const restIds   = MODULE_ORDER.filter(id => !dueIds.includes(id))

  return (
    <div className={s.list}>
      {dueIds.length > 0 && (
        <>
          <div className={s.secLabel}>Heute dran</div>
          {dueIds.map(id => (
            <ModuleCard key={id} id={id} onSelectModule={onSelectModule} due time={dueTime[id]} />
          ))}
          <div className={[s.secLabel, s.secLabelGap].join(' ')}>Alle Module</div>
        </>
      )}
      {restIds.map(id => (
        <ModuleCard key={id} id={id} onSelectModule={onSelectModule} />
      ))}
    </div>
  )
}
