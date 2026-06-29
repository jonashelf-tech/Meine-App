// Gemeinsame geometrische Symbole (Kreis, Dreieck, Rechteck, Stern) —
// genutzt von N-Back und Speed-Sort, damit beide denselben Symbolsatz teilen.
export const SHAPE_KEYS = ['circle', 'triangle', 'square', 'star']

export const SHAPE_STROKE = {
  circle:   '#8B5CF6',
  triangle: '#14B8A6',
  square:   '#10B981',
  star:     '#FB7185',
}
export const SHAPE_FILL = {
  circle:   'rgba(139,92,246,0.15)',
  triangle: 'rgba(20,184,166,0.15)',
  square:   'rgba(16,185,129,0.15)',
  star:     'rgba(251,113,133,0.15)',
}

export default function ShapeIcon({ type, color = 'currentColor', fill = 'none', size = 110 }) {
  const common = { width: size, height: size, viewBox: '0 0 100 100' }
  if (type === 'circle')
    return <svg {...common}><circle cx="50" cy="50" r="44" stroke={color} strokeWidth="4" fill={fill} /></svg>
  if (type === 'triangle')
    return <svg {...common}><polygon points="50,8 92,88 8,88" stroke={color} strokeWidth="4" fill={fill} strokeLinejoin="round" /></svg>
  if (type === 'square')
    return <svg {...common}><rect x="10" y="10" width="80" height="80" rx="10" stroke={color} strokeWidth="4" fill={fill} /></svg>
  return <svg {...common}><polygon points="50,6 61,36 94,36 68,58 78,90 50,70 22,90 32,58 6,36 39,36" stroke={color} strokeWidth="4" fill={fill} strokeLinejoin="round" /></svg>
}
