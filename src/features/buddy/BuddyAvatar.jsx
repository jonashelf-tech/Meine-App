// ─── Buddy-Avatar: das Eichhörnchen (Konzept §7.1) ────────
// Weicher Vektor-Stil statt Pixelart — passt in die Calm-Dark-Violet-Optik.
// Warme Bernstein-Töne als bewusster Kontrast zum Violett; Glow-Akzente
// kommen aus var(--primary). Farben sind Charakter-Daten und leben hier in JS.
const FUR       = '#C9854F'
const FUR_DARK  = '#A5673B'
const FUR_LIGHT = '#DDA36B'
const BELLY     = '#EFD3A8'
const ACORN     = '#B98952'
const ACORN_CAP = '#7C5433'
const INK       = '#2A1B12'

// pose: 'idle' (sitzt, hält seine Eichel) · 'denkt' (leuchtende Eichel = Gedanke)
export default function BuddyAvatar({ size = 40, pose = 'idle' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block' }}>
      {/* Schwanz: großer weicher Bogen hinter dem Körper */}
      <path
        d="M25 52 C 8 50, 3 34, 10 21 C 15 11, 28 8, 31 17 C 33 24, 26 26, 21 29 C 15 33, 15 42, 25 45 Z"
        fill={FUR_DARK}
      />
      <path
        d="M24 47 C 13 44, 11 33, 17 25 C 20 20, 27 19, 28 24 C 29 28, 24 30, 21 33 C 18 36, 19 43, 24 44 Z"
        fill={FUR_LIGHT}
        opacity="0.55"
      />

      {/* Körper + Bauch */}
      <ellipse cx="37" cy="45" rx="14" ry="12.5" fill={FUR} />
      <ellipse cx="39.5" cy="47.5" rx="8.5" ry="8" fill={BELLY} />

      {/* Ohren mit Pinseln */}
      <ellipse cx="35" cy="13.5" rx="3.4" ry="5" fill={FUR} transform="rotate(-14 35 13.5)" />
      <ellipse cx="46.5" cy="13.5" rx="3.4" ry="5" fill={FUR} transform="rotate(14 46.5 13.5)" />
      <ellipse cx="35.4" cy="14.6" rx="1.7" ry="2.7" fill={FUR_DARK} transform="rotate(-14 35.4 14.6)" opacity="0.5" />
      <ellipse cx="46.1" cy="14.6" rx="1.7" ry="2.7" fill={FUR_DARK} transform="rotate(14 46.1 14.6)" opacity="0.5" />

      {/* Kopf */}
      <circle cx="41" cy="25" r="11" fill={FUR} />
      <ellipse cx="45" cy="28.5" rx="5.5" ry="4.6" fill={BELLY} opacity="0.85" />

      {/* Gesicht */}
      {pose === 'denkt' ? (
        /* nachdenklich: Augen als sanfte Bögen nach oben */
        <>
          <path d="M35.4 23.4 q 1.8 -2.2 3.6 0" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M44.4 23.4 q 1.8 -2.2 3.6 0" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="37.4" cy="23.4" r="1.9" fill={INK} />
          <circle cx="46.2" cy="23.4" r="1.9" fill={INK} />
          <circle cx="38" cy="22.7" r="0.65" fill="#FFF" opacity="0.9" />
          <circle cx="46.8" cy="22.7" r="0.65" fill="#FFF" opacity="0.9" />
        </>
      )}
      <ellipse cx="41.8" cy="27.6" rx="1.5" ry="1.2" fill={INK} />
      <path d="M41.8 28.8 q 0 1.6 -1.6 1.9 M41.8 28.8 q 0 1.6 1.6 1.9" stroke={INK} strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Wangen */}
      <circle cx="34.4" cy="27.4" r="2" fill="#E58B6B" opacity="0.35" />
      <circle cx="48.6" cy="27.4" r="2" fill="#E58B6B" opacity="0.35" />

      {/* Pfoten + Eichel vor der Brust */}
      <ellipse cx="34" cy="40.5" rx="3.2" ry="2.6" fill={FUR_DARK} />
      <ellipse cx="41" cy="40.5" rx="3.2" ry="2.6" fill={FUR_DARK} />
      <g transform="translate(37.5 38.5)">
        <ellipse cx="0" cy="1.6" rx="2.7" ry="3.1" fill={ACORN} />
        <path d="M-3 -0.4 Q 0 -2.8 3 -0.4 L 2.4 0.8 Q 0 -0.6 -2.4 0.8 Z" fill={ACORN_CAP} />
        <line x1="0" y1="-2" x2="0" y2="-3.4" stroke={ACORN_CAP} strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* Füße */}
      <ellipse cx="31" cy="56" rx="4.4" ry="2.2" fill={FUR_DARK} />
      <ellipse cx="43" cy="56.5" rx="4.4" ry="2.2" fill={FUR_DARK} />

      {/* Gedanken-Eichel: leuchtet in der Akzentfarbe (der „Gedanke") */}
      {pose === 'denkt' && (
        <g transform="translate(55 10)">
          <circle cx="0" cy="0" r="7" fill="var(--primary)" opacity="0.22" />
          <circle cx="0" cy="0" r="4" fill="var(--primary)" opacity="0.18" />
          <ellipse cx="0" cy="0.9" rx="2.3" ry="2.7" fill={ACORN} />
          <path d="M-2.6 -0.6 Q 0 -2.6 2.6 -0.6 L 2 0.5 Q 0 -0.7 -2 0.5 Z" fill={ACORN_CAP} />
        </g>
      )}
    </svg>
  )
}
