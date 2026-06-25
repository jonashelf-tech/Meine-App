import { useState } from 'react'
import { MODULE_CONFIG } from './moduleConfig'
import ModuleIcon from './ModuleIcon'
import ModuleDemo from './ModuleDemo'
import s from './Briefing.module.css'

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
)
const PlayIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4" /></svg>
)

export default function Briefing({ moduleId, onStart, onBack }) {
  const m = MODULE_CONFIG[moduleId]
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className={s.root} style={{ '--accent': m.color }}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack}>
          <span className={s.arrow}>←</span> Zurück
        </button>
      </div>

      <div className={s.scroll}>
        <div className={s.hero}>
          <div className={s.iconWrap}><ModuleIcon id={moduleId} size={26} /></div>
          <div className={s.domain}>{m.domain}</div>
          <h1 className={s.name}>{m.name}</h1>
          <div className={s.meta}>
            <span className={s.metaPill}><ClockIcon /> {m.duration}</span>
            <span className={s.metaPill}>misst {m.mainMetricLabel}</span>
          </div>
          <p className={s.desc}>{m.desc}</p>
        </div>

        <ModuleDemo moduleId={moduleId} />

        <button className={s.detailsToggle} onClick={() => setDetailsOpen(v => !v)}>
          <span className={s.detailsLabel}>Details</span>
          <span className={[s.chev, detailsOpen ? s.chevOpen : ''].join(' ')}>›</span>
        </button>

        {detailsOpen && (
          <div className={s.details}>
            {m.steps && (
              <ol className={s.steps}>
                {m.steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            )}
            <div className={s.infoBlock}>
              <div className={s.infoLabel} data-type="measured">Gemessen</div>
              {m.measured.map(item => (
                <div key={item} className={s.infoRow}><span className={s.idot} data-type="measured" />{item}</div>
              ))}
            </div>
            <div className={s.infoBlock}>
              <div className={s.infoLabel} data-type="not">Nicht relevant</div>
              {m.notMeasured.map(item => (
                <div key={item} className={s.infoRow}><span className={s.idot} data-type="not" />{item}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button className={s.startBtn} onClick={() => onStart()}>
        <PlayIcon /> Starten
      </button>
    </div>
  )
}
