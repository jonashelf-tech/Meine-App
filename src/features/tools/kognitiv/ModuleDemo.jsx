// Kleine Endlos-Demo des Kern-Mechanismus je Modul — reine CSS-Loops in der
// Bildsprache der echten Übung (kein Timer, kein Scoring). Erbt die Modulfarbe
// über var(--accent) vom umgebenden Screen. prefers-reduced-motion friert ein.
import s from './ModuleDemo.module.css'

const CAPTIONS = {
  alertness:     'Kreis erscheint → so schnell wie möglich tippen',
  zahlensuche:   'Zahlen 01–25 der Reihe nach antippen',
  gedaechtnis:   'Leucht-Reihenfolge merken & nachtippen',
  gonogo:        'Grün → tippen · Rot → still halten',
  nback:         'Gleich wie das vorige Symbol? → tippen',
  taskswitching: 'Regel wechselt — mal Form, mal Farbe matchen',
  geteilt:       'Auf Bild und Ton achten → bei Signal tippen',
  stroop:        'Farbe des Wortes tippen — nicht das Wort',
  speedsort:     'Passt das Symbol zum Ziel? ✓ ja · ✗ nein',
}

const POS6 = [
  { left: '50%', top: '15%' }, { left: '80%', top: '33%' }, { left: '80%', top: '67%' },
  { left: '50%', top: '85%' }, { left: '20%', top: '67%' }, { left: '20%', top: '33%' },
]
const POS5 = [
  { left: '50%', top: '12%' }, { left: '85%', top: '40%' }, { left: '70%', top: '82%' },
  { left: '30%', top: '82%' }, { left: '15%', top: '40%' },
]
const ZAHLEN = [7, 2, 9, 4, 1, 6, 3, 8, 5]

const LoopIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3M3 21v-5h5" />
  </svg>
)

function Demo({ moduleId }) {
  switch (moduleId) {
    case 'alertness':
      return <div className={s.dot} />

    case 'gonogo':
      return <div className={s.gngDot} />

    case 'zahlensuche':
      return (
        <div className={s.zGrid}>
          {ZAHLEN.map((n, i) => (
            <div
              key={i}
              className={[s.zCell, n === 1 ? s.zT1 : n === 2 ? s.zT2 : n === 3 ? s.zT3 : ''].join(' ')}
            >
              {String(n).padStart(2, '0')}
            </div>
          ))}
        </div>
      )

    case 'gedaechtnis':
      return (
        <div className={s.gRing}>
          {POS6.map((pos, i) => (
            <div key={i} className={[s.gDot, i === 0 ? s.gS1 : i === 2 ? s.gS2 : i === 4 ? s.gS3 : ''].join(' ')} style={pos} />
          ))}
        </div>
      )

    case 'nback':
      return (
        <div className={s.nbStack}>
          <span className={[s.nbShape, s.nbTri,  s.nbA].join(' ')} />
          <span className={[s.nbShape, s.nbCirc, s.nbB].join(' ')} />
          <span className={[s.nbShape, s.nbCirc, s.nbC].join(' ')} />
          <span className={[s.nbShape, s.nbSq,   s.nbD].join(' ')} />
          <span className={s.nbBadge}>gleich!</span>
        </div>
      )

    case 'taskswitching':
      return (
        <div className={s.tsWrap}>
          <div className={s.tsPills}>
            <span className={[s.tsPill, s.tsForm].join(' ')}>FORM</span>
            <span className={[s.tsPill, s.tsColor].join(' ')}>FARBE</span>
          </div>
          <div className={s.tsSym}>
            <span className={[s.tsGlyph, s.tsX].join(' ')}>X</span>
            <span className={[s.tsGlyph, s.tsO].join(' ')}>O</span>
          </div>
        </div>
      )

    case 'geteilt':
      return (
        <div className={s.gtWrap}>
          <div className={s.gtRing}>
            {POS5.map((pos, i) => (
              <div key={i} className={s.gtDot} style={{ ...pos, animationDelay: `${i * 0.6}s` }} />
            ))}
          </div>
          <div className={s.gtTone}>
            <span className={s.gtHigh}>HOCH</span>
            <span className={s.gtLow}>TIEF</span>
          </div>
        </div>
      )

    case 'stroop':
      return (
        <div className={s.stWrap}>
          <span className={s.stWord} style={{ color: '#3B82F6' }}>ROT</span>
          <div className={s.stPad}>
            {['#EF4444', '#3B82F6', '#22C55E', '#EAB308'].map((c, i) => (
              <span key={i} className={[s.stSw, i === 1 ? s.stPick : ''].join(' ')} style={{ background: c }} />
            ))}
          </div>
        </div>
      )

    case 'speedsort':
      return (
        <div className={s.ssWrap}>
          <span className={s.ssLbl}>Ziel</span>
          <span className={[s.ssShape, s.ssCirc].join(' ')} />
          <div className={s.ssStream}>
            <span className={[s.ssShape, s.ssCirc, s.ssA].join(' ')} />
            <span className={[s.ssShape, s.ssSq, s.ssB].join(' ')} />
          </div>
          <div className={s.ssBtns}>
            <span className={[s.ssBtn, s.ssYes, s.ssA].join(' ')}>✓</span>
            <span className={[s.ssBtn, s.ssNo, s.ssB].join(' ')}>✗</span>
          </div>
        </div>
      )

    default:
      return null
  }
}

export default function ModuleDemo({ moduleId }) {
  return (
    <div className={s.stage}>
      <span className={s.tag}>So läuft's</span>
      <span className={s.loop}><LoopIcon /></span>
      <Demo moduleId={moduleId} />
      <span className={s.caption}>{CAPTIONS[moduleId]}</span>
    </div>
  )
}
