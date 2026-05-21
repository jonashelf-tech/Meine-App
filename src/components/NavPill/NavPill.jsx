import s from './NavPill.module.css'

export default function NavPill({ label, onPrev, onNext, isCurrent, leftGlows, rightGlows, onLabelClick }) {
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
          onLabelClick ? s.labelClickable : '',
        ].join(' ')}
        onClick={onLabelClick}
        role={onLabelClick ? 'button' : undefined}
        tabIndex={onLabelClick ? 0 : undefined}
        onKeyDown={onLabelClick ? (e => e.key === 'Enter' && onLabelClick()) : undefined}
      >
        {label}
      </span>
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
