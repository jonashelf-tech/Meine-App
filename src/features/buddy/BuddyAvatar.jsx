// ─── Buddy-Avatar: das Eichhörnchen (Konzept §7.1, Look v3 = Pixelart) ─────
// Herkunft (2026-07-20): Jonas' eigene Pixelart-Referenz (Dateien/input/
// "Eichhoernchan ki buddy.png", KI-generiert, copyright-frei). Statt von Auge
// nachzuzeichnen wurde das Bild programmatisch ausgelesen — Canvas-Pixel,
// Raster-Erkennung per Autokorrelation, Farb-Clustering, dann von Hand nur:
// Ohr-Härchen entfernt (Jonas' Wunsch), Augen-Glanzpunkte + Wangenröte
// nachgetragen (beim Farb-Clustering verwaschen), 3 isolierte Fehlpixel in
// den Pupillen gefüllt (fielen fälschlich auf Hintergrundfarbe). Rest ist
// exakt das Quellbild. 48×48-Raster (Jonas' Wahl nach Vergleich mit 37/64 —
// keine der Stufen zeigt mehr echte Form-Details, 48 traf seinen Geschmack).
// Farben leben als JS-Konstanten; nur der Gedanken-Glow kommt aus var(--primary).
const PAL = {
  f: '#dfa97a', // Fell
  o: '#cb9061', // Fell dunkler (Schweif)
  c: '#342217', // Kontur / Pupille
  i: '#f3d9ba', // Creme: Schnauze, Bauch
  e: '#523622', // Kontur dunkel (Schweif-Wirbel, Schatten)
  w: '#af7c54', // Fell mittel
  b: '#765135', // Augenbereich dunkel
  d: '#936543', // Schweif-Wirbel hell
  a: '#e8bf9b', // Fell hell / Augenbereich hell
  W: '#ffffff', // Glanzpunkt
  P: '#e59e82', // Wangenröte
}

// Körper inkl. idle-Augen (Original-Extraktion) — Zeichenkette je Pixelzeile
const BASE = [
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '.......cccc.............cccc....................',
  '......cfffbc..........ccfffoc...................',
  '.....efffffb.ccccccc..cfffffoc..................',
  '.....effffocewwwwwwwbccofaffoc..................',
  '.....effabcwwfffffffobbcoaafoc..................',
  '.....efoewwffffffffffffocbafoc..................',
  '......ebbfffffffffffffffweeoc...................',
  '......cefffffffffffffffffbecc...................',
  '......caffffffffffffffffffwc....eeeeeec.........',
  '.....caffffffffffffffffffffoc.cbwooooooc........',
  '.....cffffafffffffffaaafffffccwooooooooobc......',
  '.....efffaaifffffffaiiiaffffccwoooooooooowc.....',
  '....cffffaabfffffffawccifffffccoooooooooooo.....',
  '...ccffffwWbbffffffooWccfffffccwobbboooooooc....',
  '...ccfffobabbffffffowaccfffffccdwbbbboooooodc...',
  '...ccfffobbbdfaiiffoccccfffffccdobooobooooooec..',
  '...ccffffcccwiiiiiiocccefffffecdwoooooboooooec..',
  '...ccffffwcciiocciiioccafffffecbdwddoowoooooec..',
  '...ccffPPfiiiiaeeiiiiiffPPfffecebdebooooooooodc.',
  '....cffffaiiiaiiiiaiiiaffffffec.ccbdwoooooooodc.',
  '.....efffiiiiicdecaiiiifffffc.....cwdoooooooodc.',
  '.....cffffiiiiiiiiiiiiiffffo......cedoooooooodc.',
  '......cfffiiiiiiiiiiiiifffd.......cbooooooooodc.',
  '.......cffiiiiiiiiiiiiafoec.......cboodoooooodc.',
  '........ccbboiiiiiiiaobbcc........cbooooooooodc.',
  '...........cceeeccceecccc.........bwooooooooec..',
  '..........ceeeeeeecceewwcc.......cboooooooooec..',
  '.........cwoowwoooowwwoooec......eooooooooooec..',
  '........cwfeoiiiiiiiwefffoec...ceooooooooooc....',
  '........coocoiiiiiiocbffoowc.ccbwooooooooodc....',
  '.......ccoooceiiiiccfoffbfoecbdwoooooooowwb.....',
  '.......ceeoooewiiocooffwbffbcbwwoooooooowbc.....',
  '.......eocooocwiiocoooocfffoccwwoooooowwec......',
  '......cefbcdbeoiiocewdcwfffoccdwwwwwwwwec.......',
  '......cbffdbbaiiiibcceofffffccwwwwwdbbc.........',
  '......cbfoaiiiiiiiiiiiifffffccdddddbcc..........',
  '.......ceooiiiiiiiiiiaoffoodcccccccc............',
  '........cccciiiiiiiiwccccwdc....................',
  '.......ccwwwcbfaaiaeewwwdec.....................',
  '......cwfoffocwiiiaeoffffwc.....................',
  '......cooffffeccccceffffffc.....................',
  '.......cccccc.......cccccc......................',
  '................................................',
  '................................................',
]

// 'denkt': überdeckt beide Augen mit einem entspannten Bogen + Gedanken-Eichel
const EYE_CLEAR = ['fffffff', 'fffffff', '..ccc..', '.c...c.', 'fffffff']
const DENKT_EYES = [
  { x: 7, y: 15, rows: EYE_CLEAR },
  { x: 18, y: 15, rows: EYE_CLEAR },
]
const ACORN = { x: 38, y: 1, rows: ['.cc.', 'cccc', '.aa.', '.a..'] }

function paint(pose) {
  const g = BASE.map(row => [...row])
  if (pose === 'denkt') {
    for (const { x, y, rows } of [...DENKT_EYES, ACORN]) {
      rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
        if (ch !== '.') g[y + dy][x + dx] = ch
      }))
    }
  }
  // Waagerechte Läufe gleicher Farbe zu einem Rechteck zusammenfassen
  const out = []
  g.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.') { x++; continue }
      let end = x
      while (end + 1 < row.length && row[end + 1] === ch) end++
      out.push(<rect key={`${y}-${x}`} x={x} y={y} width={end - x + 1} height="1" fill={PAL[ch]} />)
      x = end + 1
    }
  })
  return out
}

const POSES = { idle: paint('idle'), denkt: paint('denkt') }

// pose: 'idle' (Original-Ausdruck) · 'denkt' (Augen entspannt zu + Gedanken-Eichel)
export default function BuddyAvatar({ size = 40, pose = 'idle' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block' }}>
      {pose === 'denkt' && (
        <circle cx="40" cy="3" r="7" fill="var(--primary)" opacity="0.22" />
      )}
      <g shapeRendering="crispEdges">{POSES[pose] ?? POSES.idle}</g>
    </svg>
  )
}
