import s from './NavPill.module.css'

const Chevron = ({ dir }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    {dir === 'left' ? <polyline points="14 6 8 12 14 18" /> : <polyline points="10 6 16 12 10 18" />}
  </svg>
)

export default function NavPill({ label, onPrev, onNext, isCurrent, leftGlows, rightGlows, onLabelClick, onLabelDoubleClick, badge }) {
  const isInteractive = onLabelClick || onLabelDoubleClick
  return (
    <div className={s.pill}>
      <button
        className={[s.arrow, leftGlows ? s.arrowGlow : ''].join(' ')}
        onClick={onPrev}
        aria-label="Zurück"
      >
        <Chevron dir="left" />
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
        <Chevron dir="right" />
      </button>
    </div>
  )
}
