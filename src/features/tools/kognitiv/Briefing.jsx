import { useState, useEffect } from 'react'
import { MODULE_CONFIG } from './moduleConfig'
import { isPracticeAvailable } from './sessionStore'
import ModuleIcon from './ModuleIcon'
import s from './Briefing.module.css'

export default function Briefing({ moduleId, onStart, onPractice, onBack }) {
  const m = MODULE_CONFIG[moduleId]
  const [variant, setVariant] = useState(m.defaultVariant)
  const [infoOpen, setInfoOpen] = useState(() => !localStorage.getItem(`briefing-seen-${moduleId}`))
  const canPractice = isPracticeAvailable(moduleId)

  useEffect(() => { localStorage.setItem(`briefing-seen-${moduleId}`, '1') }, [moduleId])

  return (
    <div className={s.root} style={{ '--accent': m.color }}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack}>
          <span className={s.arrow}>←</span> Zurück
        </button>
      </div>

      <div className={s.scroll}>
        <div className={s.hero}>
          <div className={s.iconWrap}>
            <ModuleIcon id={moduleId} size={28} />
          </div>
          <div className={s.domain}>{m.domain}</div>
          <div className={s.name}>{m.name}</div>
          <div className={s.durationPill}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {m.duration}
          </div>
          <p className={s.desc}>{m.desc}</p>
        </div>

        <button className={s.infoToggle} onClick={() => setInfoOpen(v => !v)}>
          <span className={s.infoToggleLabel}>Was gemessen wird</span>
          <span className={[s.infoChevron, infoOpen ? s.infoChevronOpen : ''].join(' ')}>›</span>
        </button>

        {infoOpen && (
          <>
            <div className={s.infoBlock}>
              <div className={s.infoLabel} data-type="measured">Gemessen</div>
              {m.measured.map(item => (
                <div key={item} className={s.infoRow}>
                  <div className={s.dot} data-type="measured" />
                  {item}
                </div>
              ))}
            </div>

            <div className={s.infoBlock}>
              <div className={s.infoLabel} data-type="not">Nicht relevant</div>
              {m.notMeasured.map(item => (
                <div key={item} className={s.infoRow}>
                  <div className={s.dot} data-type="not" />
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        <div className={s.diffLabel}>Schwierigkeit</div>
        <div className={s.diffRow}>
          {m.variants.map(v => (
            <button
              key={v}
              className={[s.diffBtn, variant === v ? s.diffOn : ''].join(' ')}
              onClick={() => setVariant(v)}
            >
              {v}
            </button>
          ))}
        </div>

        <button className={s.startBtn} onClick={() => onStart(variant)}>
          Starten →
        </button>

        {canPractice && (
          <button className={s.practiceBtn} onClick={() => onPractice(variant)}>
            Üben <span className={s.practiceSub}>· 1× diese Woche · nicht gewertet</span>
          </button>
        )}
      </div>
    </div>
  )
}
