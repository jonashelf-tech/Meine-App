// ─── Buddy-Avatar: das Eichhörnchen (Konzept §7.1, Look v2) ───────────────
// Richtung von Jonas' Referenzbildern (2026-07-20): Kindchenschema — großer
// Kopf, große Glanz-Augen, offenes Lächeln, dicke Outlines (Sticker-Look),
// helles warmes Fell. Farben sind Charakter-Daten und leben hier in JS;
// nur der Gedanken-Glow kommt aus var(--primary).
const FUR     = '#E9BE8C'
const TAIL    = '#DFA76F'
const CREAM   = '#F7E7CE'
const EAR_IN  = '#F2C9A0'
const OUTLINE = '#4A2E1C'
const INK     = '#2A1B12'
const ACORN   = '#C89A62'
const CAP     = '#8A5B36'
const BLUSH   = '#F2A08C'
const ZUNGE   = '#E58B6B'

// pose: 'idle' (große Augen, lächelt) · 'denkt' (Augen glücklich zu, leuchtende Gedanken-Eichel)
export default function BuddyAvatar({ size = 40, pose = 'idle' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block' }}>
      {/* Schwanz: großer S-Curl rechts, mit innerer Wirbel-Linie */}
      <path
        d="M40 51 C 54 51, 62 41, 60 29 C 58 17, 45 12, 42 20 C 40 25.5, 45.5 28, 48 31.5 C 50.5 35, 48.5 42, 40 44 Z"
        fill={TAIL} stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M46 22 C 52.5 23.5, 55.5 30, 52.5 36.5" fill="none" stroke={OUTLINE} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />

      {/* Körper + Bauch + Füße */}
      <ellipse cx="25.5" cy="48.5" rx="11.5" ry="9.3" fill={FUR} stroke={OUTLINE} strokeWidth="1.5" />
      <ellipse cx="25.5" cy="50" rx="7" ry="5.8" fill={CREAM} />
      <ellipse cx="18.5" cy="56.6" rx="4.3" ry="2.5" fill={FUR} stroke={OUTLINE} strokeWidth="1.3" />
      <ellipse cx="32.5" cy="56.6" rx="4.3" ry="2.5" fill={FUR} stroke={OUTLINE} strokeWidth="1.3" />

      {/* Ohren mit Pinsel-Tufts (vor dem Kopf gezeichnet → Kopf überlappt den Ansatz) */}
      <path d="M13.2 4.6 L 11.8 1.9 M15.8 4.1 L 15.5 1.3" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M38.3 4.6 L 39.7 1.9 M35.7 4.1 L 36 1.3" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="15.5" cy="9.8" rx="4.8" ry="6" fill={FUR} stroke={OUTLINE} strokeWidth="1.5" transform="rotate(-16 15.5 9.8)" />
      <ellipse cx="36" cy="9.8" rx="4.8" ry="6" fill={FUR} stroke={OUTLINE} strokeWidth="1.5" transform="rotate(16 36 9.8)" />
      <ellipse cx="15.9" cy="11" rx="2.4" ry="3.2" fill={EAR_IN} transform="rotate(-16 15.9 11)" />
      <ellipse cx="35.6" cy="11" rx="2.4" ry="3.2" fill={EAR_IN} transform="rotate(16 35.6 11)" />

      {/* Kopf: groß (Kindchenschema) */}
      <circle cx="25.5" cy="23" r="15.6" fill={FUR} stroke={OUTLINE} strokeWidth="1.6" />
      <ellipse cx="25.5" cy="28.3" rx="8.8" ry="6.2" fill={CREAM} opacity="0.95" />

      {/* Augen */}
      {pose === 'denkt' ? (
        <>
          <path d="M16.4 21.8 q 2.4 -2.6 4.8 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M29.8 21.8 q 2.4 -2.6 4.8 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="18.8" cy="21.8" rx="2.4" ry="3" fill={INK} />
          <ellipse cx="32.2" cy="21.8" rx="2.4" ry="3" fill={INK} />
          <circle cx="18" cy="20.7" r="0.95" fill="#FFF" />
          <circle cx="31.4" cy="20.7" r="0.95" fill="#FFF" />
          <circle cx="19.7" cy="22.8" r="0.48" fill="#FFF" opacity="0.85" />
          <circle cx="33.1" cy="22.8" r="0.48" fill="#FFF" opacity="0.85" />
        </>
      )}

      {/* Nase + offenes Lächeln mit Zunge */}
      <ellipse cx="25.5" cy="27" rx="1.55" ry="1.25" fill={INK} />
      <path d="M21.8 29.8 Q 25.5 35 29.2 29.8 Z" fill={INK} />
      <ellipse cx="25.5" cy="31" rx="1.9" ry="1.15" fill={ZUNGE} />

      {/* Wangen */}
      <ellipse cx="14.6" cy="27.2" rx="2.8" ry="1.8" fill={BLUSH} opacity="0.55" />
      <ellipse cx="36.4" cy="27.2" rx="2.8" ry="1.8" fill={BLUSH} opacity="0.55" />

      {/* Eichel vor der Brust + Pfoten, die sie halten */}
      <ellipse cx="25.5" cy="45.6" rx="3.8" ry="4.2" fill={ACORN} stroke={OUTLINE} strokeWidth="1.2" />
      <path d="M20.9 43 Q 25.5 39.4 30.1 43 L 29.2 44.8 Q 25.5 42.9 21.8 44.8 Z" fill={CAP} stroke={OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M25.5 40.4 L 25.5 38.6" stroke={OUTLINE} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="21" cy="46.4" rx="2.7" ry="2.3" fill={FUR} stroke={OUTLINE} strokeWidth="1.2" />
      <ellipse cx="30" cy="46.4" rx="2.7" ry="2.3" fill={FUR} stroke={OUTLINE} strokeWidth="1.2" />

      {/* Gedanken-Eichel: leuchtet in der Akzentfarbe */}
      {pose === 'denkt' && (
        <g transform="translate(54.5 7)">
          <circle cx="0" cy="0" r="6.5" fill="var(--primary)" opacity="0.22" />
          <circle cx="0" cy="0" r="3.8" fill="var(--primary)" opacity="0.18" />
          <ellipse cx="0" cy="0.9" rx="2.3" ry="2.7" fill={ACORN} />
          <path d="M-2.6 -0.6 Q 0 -2.6 2.6 -0.6 L 2 0.5 Q 0 -0.7 -2 0.5 Z" fill={CAP} />
        </g>
      )}
    </svg>
  )
}
