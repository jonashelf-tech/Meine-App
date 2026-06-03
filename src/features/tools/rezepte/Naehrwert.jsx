import { formatNaehrwert } from './naehrwerte'

// n = {kcal, protein, carbs, fat}
// className optional for styling context
export default function Naehrwert({ n, className = '' }) {
  if (!n) return null
  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
        opacity: 0.65,
        fontSize: '0.72rem',
        fontFamily: 'Orbitron, monospace',
        letterSpacing: '0.02em',
      }}
    >
      {formatNaehrwert(n)}
    </span>
  )
}
