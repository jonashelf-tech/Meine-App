// src/features/tools/garten/GartenSzene.jsx
// Prozeduraler SVG-Garten — reine Funktion von (stage, dekos, night).
// Layouts sind handgesetzt (kein RNG), Farben kommen aus vars.css via CSS-Modul.
import s from './GartenSzene.module.css'

const W = 360, H = 200, GROUND = 168

const PLANTS = [
  { x: 180, h: 62, variant: 0, bloom: true,  minStage: 5 },
  { x: 142, h: 36, variant: 1, bloom: true,  minStage: 6 },
  { x: 220, h: 30, variant: 2, bloom: false, minStage: 6 },
  { x: 94,  h: 44, variant: 2, bloom: true,  minStage: 7 },
  { x: 264, h: 48, variant: 1, bloom: true,  minStage: 7 },
  { x: 318, h: 28, variant: 0, bloom: true,  minStage: 7 },
  { x: 48,  h: 36, variant: 1, bloom: true,  minStage: 8 },
  { x: 296, h: 40, variant: 0, bloom: true,  minStage: 8 },
]
const GRAS = [
  { x: 70,  minStage: 5 }, { x: 122, minStage: 5 }, { x: 206, minStage: 5 },
  { x: 250, minStage: 6 }, { x: 304, minStage: 6 },
  { x: 30,  minStage: 7 }, { x: 162, minStage: 7 }, { x: 342, minStage: 7 },
]
const STERNE = [
  { x: 40, y: 30, r: 1.2 }, { x: 90, y: 18, r: 0.9 }, { x: 150, y: 38, r: 1.1 },
  { x: 220, y: 22, r: 0.8 }, { x: 270, y: 44, r: 1.3 }, { x: 330, y: 28, r: 1 },
  { x: 190, y: 56, r: 0.7 },
]
const GLUEHWUERMCHEN = [{ x: 130, y: 120 }, { x: 235, y: 105 }, { x: 285, y: 132 }]
const PFAD = [
  { x: 184, y: 176, rx: 7, ry: 2.5 }, { x: 170, y: 182, rx: 8, ry: 3 },
  { x: 192, y: 187, rx: 8, ry: 3 },   { x: 174, y: 193, rx: 9, ry: 3.5 },
]
const LICHT = [{ x: 110, y: 96 }, { x: 168, y: 78 }, { x: 226, y: 92 }, { x: 196, y: 118 }]

function Blatt({ x, y, side, len = 10 }) {
  return (
    <ellipse
      cx={x + side * (len * 0.6)} cy={y} rx={len * 0.7} ry={len * 0.32}
      className={s.blatt}
      transform={`rotate(${side * -28} ${x} ${y})`}
    />
  )
}

function Bluete({ x, y, variant }) {
  if (variant === 1) {
    return <path d={`M ${x} ${y} m -5 0 q 5 -10 10 0 q -2 6 -5 7 q -3 -1 -5 -7`} className={s.blueteTeal} />
  }
  if (variant === 2) {
    return (
      <g className={s.blueteHell}>
        <circle cx={x - 4} cy={y + 2} r={2.2} />
        <circle cx={x + 1} cy={y - 3} r={2.6} />
        <circle cx={x + 5} cy={y + 3} r={2} />
      </g>
    )
  }
  return (
    <g>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx={x} cy={y - 6} rx={3} ry={6}
          transform={`rotate(${a} ${x} ${y})`} className={s.bluetePrimary} />
      ))}
      <circle cx={x} cy={y} r={3.2} className={s.blueteMitte} />
    </g>
  )
}

function Pflanze({ x, h, variant, bloom }) {
  const top = GROUND - h
  return (
    <g>
      <path
        d={`M ${x} ${GROUND} C ${x - 4} ${GROUND - h * 0.35}, ${x + 4} ${GROUND - h * 0.7}, ${x} ${top}`}
        className={s.stiel}
      />
      <Blatt x={x} y={GROUND - h * 0.35} side={-1} len={h * 0.22 + 5} />
      <Blatt x={x} y={GROUND - h * 0.55} side={1}  len={h * 0.2 + 4} />
      {bloom && <Bluete x={x} y={top} variant={variant} />}
    </g>
  )
}

function Gras({ x }) {
  return (
    <g className={s.gras}>
      <path d={`M ${x} ${GROUND} q -2 -7 -5 -9`} />
      <path d={`M ${x} ${GROUND} q 0 -8 0 -11`} />
      <path d={`M ${x} ${GROUND} q 2 -7 5 -9`} />
    </g>
  )
}

// Stufen 1–4: die eine zentrale Pflanze in Entwicklungsgrößen
function Jungpflanze({ stage }) {
  const x = 180
  if (stage === 1) {
    return (
      <g>
        <ellipse cx={x} cy={GROUND - 2} rx={10} ry={4} className={s.erdhuegel} />
        <ellipse cx={x} cy={GROUND - 4} rx={3} ry={4} className={s.samen} />
      </g>
    )
  }
  const h = stage === 2 ? 16 : stage === 3 ? 32 : 48
  const top = GROUND - h
  return (
    <g>
      <path
        d={`M ${x} ${GROUND} C ${x - 3} ${GROUND - h * 0.4}, ${x + 3} ${GROUND - h * 0.7}, ${x} ${top}`}
        className={s.stiel}
      />
      <Blatt x={x} y={GROUND - h * 0.45} side={-1} len={6 + stage * 2} />
      {stage >= 3 && <Blatt x={x} y={GROUND - h * 0.65} side={1} len={5 + stage * 2} />}
      {stage >= 3 && <Blatt x={x} y={GROUND - h * 0.3}  side={1} len={4 + stage} />}
      {stage === 4 && <circle cx={x} cy={top - 2} r={3.5} className={s.knospe} />}
    </g>
  )
}

export default function GartenSzene({ stage, dekos, night }) {
  const hat = (id) => dekos.includes(id)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={[s.szene, night ? s.night : s.day].join(' ')}
      role="img" aria-label={`Garten — Stufe ${stage}`}
    >
      <defs>
        <radialGradient id="g-glow">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g-sonne">
          <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g-mondglow">
          <stop offset="0%" stopColor="white" stopOpacity="0.25" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {night ? (
        <g>
          {STERNE.map((st, i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.r} className={s.stern}
              style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
          <circle cx={308} cy={36} r={26} fill="url(#g-mondglow)" />
          <circle cx={308} cy={36} r={12} className={s.mond} />
        </g>
      ) : (
        <circle cx={300} cy={40} r={34} fill="url(#g-sonne)" />
      )}

      {night && hat('sternschnuppe') && (
        <g className={s.sternschnuppe}>
          <line x1={60} y1={22} x2={96} y2={40} />
          <circle cx={96} cy={40} r={1.6} />
        </g>
      )}

      <path d={`M 0 ${GROUND} Q 70 118 150 ${GROUND} L 0 ${GROUND} Z`} className={s.huegel} />
      <path d={`M 360 ${GROUND} Q 290 128 190 ${GROUND} L 360 ${GROUND} Z`} className={s.huegel} />
      <rect x={0} y={GROUND} width={W} height={H - GROUND} className={s.boden} />

      {stage >= 8 && <ellipse cx={180} cy={GROUND - 30} rx={120} ry={70} fill="url(#g-glow)" />}

      {hat('teich') && (
        <g>
          <ellipse cx={292} cy={GROUND + 12} rx={40} ry={10} className={s.teich} />
          <ellipse cx={282} cy={GROUND + 10} rx={14} ry={3} className={s.teichLicht} />
        </g>
      )}
      {hat('steinpfad') && PFAD.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} className={s.stein} />
      ))}
      {hat('steine') && (
        <g>
          <ellipse cx={58} cy={GROUND - 3} rx={9} ry={6}   className={s.stein} />
          <ellipse cx={72} cy={GROUND - 2} rx={6} ry={4.5} className={s.stein} />
          <ellipse cx={48} cy={GROUND - 1} rx={5} ry={3.5} className={s.stein} />
        </g>
      )}

      {GRAS.filter(g => stage >= g.minStage).map((g, i) => <Gras key={i} x={g.x} />)}
      {stage < 5
        ? <Jungpflanze stage={stage} />
        : PLANTS.filter(p => stage >= p.minStage).map((p, i) => <Pflanze key={i} {...p} />)}

      {stage === 1 && <circle cx={180} cy={GROUND - 6} r={16} fill="url(#g-glow)" />}

      {hat('gluehwuermchen') && GLUEHWUERMCHEN.map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y} r={1.8} className={s.gluehwuermchen}
          style={{ animationDelay: `${i * 1.1}s` }} />
      ))}
      {hat('schmetterling') && (
        <g className={s.schmetterling}>
          <ellipse cx={232} cy={88} rx={4} ry={2.6} transform="rotate(-30 234 90)" />
          <ellipse cx={236} cy={92} rx={4} ry={2.6} transform="rotate(30 234 90)" />
          <line x1={233} y1={87} x2={235} y2={93} />
        </g>
      )}
      {stage >= 8 && LICHT.map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={1.4} className={s.lichtpunkt}
          style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
    </svg>
  )
}
