import s from './PrioBadge.module.css'

const GRAY = 'rgba(255,255,255,0.12)'
const RED  = '#FF2D78'
const CYAN = '#00CFFF'

const CONFIGS = {
  1: [RED,  RED,  RED],
  2: [CYAN, CYAN, GRAY],
  3: [CYAN + '66', GRAY, GRAY],
}

export default function PrioBadge({ priority }) {
  const colors = CONFIGS[priority] ?? [GRAY, GRAY, GRAY]
  const isPrio1 = priority === 1

  return (
    <span className={s.badge} aria-label={`Priorität ${priority ?? 'keine'}`}>
      {colors.map((c, i) => (
        <span
          key={i}
          className={`${s.block} ${isPrio1 ? s.pulse : ''}`}
          style={{ background: c }}
        />
      ))}
    </span>
  )
}
