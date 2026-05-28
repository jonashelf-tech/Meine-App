import s from './NavPill.module.css'

export default function NavPill({ label, onPrev, onNext, isCurrent, leftGlows, rightGlows, onLabelClick, onLabelDoubleClick, badge }) {
  const isInteractive = onLabelClick || onLabelDoubleClick
  return (
    <div className={s.pill}>
      <button
        className={[s.arrow, leftGlows ? s.arrowGlow : ''].join(' ')}
        onClick={onPrev}
        aria-label="Zurück"
      >
        ‹
      </button>
      <span
        className={[
          s.label,
          isCurrent ? s.labelCurrent : '',
          isInteractive ? s.labelClickable : '',
        ].join(' ')}
        onClick={onLabelClick}
        onDoubleClick={onLabelDoubleClick}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={onLabelClick ? (e => e.key === 'Enter' && onLabelClick()) : undefined}
      >
        {label}
      </span>
      {badge && <span className={s.badge}>{badge}</span>}
      <button
        className={[s.arrow, rightGlows ? s.arrowGlow : ''].join(' ')}
        onClick={onNext}
        aria-label="Vor"
      >
        ›
      </button>
    </div>
  )
}
