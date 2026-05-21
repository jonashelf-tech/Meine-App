import s from './ToolHeader.module.css'

export default function ToolHeader({ onBack, icon, eyebrow, title, actions }) {
  return (
    <div className={s.header}>
      <button className={s.back} onClick={onBack}>
        <span className={s.arrow}>←</span> Zurück
      </button>
      <div className={s.titleRow}>
        <div className={s.iconBox}>{icon}</div>
        <div className={s.titleText}>
          {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
          <span className={s.name}>{title}</span>
        </div>
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  )
}
