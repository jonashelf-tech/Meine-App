import { useState } from 'react'
import { MODULE_CONFIG } from './moduleConfig'
import { ToolIcon } from '../toolRegistry'
import s from './Briefing.module.css'

export default function Briefing({ moduleId, onStart, onBack }) {
  const m = MODULE_CONFIG[moduleId]
  const [variant, setVariant] = useState(m.defaultVariant)

  return (
    <div className={s.root}>
      <button className={s.backBtn} onClick={onBack}>‹</button>

      <div className={s.iconWrap}>
        <ToolIcon id="kognitiv" size={24} />
      </div>
      <div className={s.name}>{m.name}</div>
      <div className={s.durationPill}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {m.duration}
      </div>
      <p className={s.desc}>{m.desc}</p>

      <div className={s.infoBlock}>
        <div className={s.infoLabel} data-type="measured">Was gemessen wird</div>
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
    </div>
  )
}
