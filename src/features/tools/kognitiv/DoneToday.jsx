import { MODULE_CONFIG } from './moduleConfig'
import { getLastSession } from './sessionStore'
import s from './DoneToday.module.css'

export default function DoneToday({ moduleId, onBack, onViewResult, onRepeat }) {
  const m    = MODULE_CONFIG[moduleId]
  const last = getLastSession(moduleId)

  const time = last
    ? new Date(last.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={s.root} style={{ '--accent': m.color }}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack}>
          <span className={s.arrow}>←</span> Zurück
        </button>
      </div>
      <div className={s.center}>
        <div className={s.checkIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div className={s.msg}>Heute erledigt</div>
        <div className={s.sub}>Dein Gehirn braucht Zeit zum Verarbeiten — eine Runde reicht meist. Magst du trotzdem nochmal, geht das jederzeit.</div>
      </div>
      {last && (
        <div className={s.lastBox}>
          <div className={s.lastLabel}>Letzte Session — heute {time}</div>
          <div className={s.lastRow}>
            <div>
              <div className={s.lastVal}>{last.mainMetric}{m.mainMetricUnit}</div>
              <div className={s.lastSub}>{m.mainMetricLabel}</div>
            </div>
            <button className={s.viewBtn} onClick={() => onViewResult(last)}>Ergebnis ansehen →</button>
          </div>
        </div>
      )}
      <button className={s.repeatBtn} onClick={onRepeat}>
        Nochmal trainieren <span className={s.repeatSub}>· wird gewertet →</span>
      </button>
    </div>
  )
}
