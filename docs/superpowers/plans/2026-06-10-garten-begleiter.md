# Garten-Begleiter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tool „Erfolge" durch den Garten-Begleiter ersetzen — prozeduraler SVG-Garten, der aus abgeleitetem XP (Todos, Tagesplaner-Tage, Wachstum-Checks/Journal) monoton wächst.

**Architecture:** Reiner Datenlayer `gartenData.js` (pure Funktionen + Storage-Wrapper mit Monotonie-Ratchet), deterministische SVG-Szene `GartenSzene.jsx` (Funktion von stage/dekos/night), Tab + Dashboard-Section. Spec: `docs/superpowers/specs/2026-06-10-garten-begleiter-design.md`.

**Tech Stack:** React 19, Vite, Zustand, CSS Modules, Vitest.

---

### Task 1: Datenlayer `gartenData.js` (TDD)

**Files:**
- Create: `src/features/tools/garten/gartenData.js`
- Test: `src/features/tools/garten/gartenData.test.js`

- [ ] **Step 1: Failing Tests schreiben**

```js
// src/features/tools/garten/gartenData.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  XP_WEIGHTS, computeRawXP, todayRawXP,
  reachedMilestones, nextMilestone, stageNum, currentStage, reachedDekos,
  displayXP, unseenMilestones, markMilestonesSeen,
} from './gartenData'
import { sv, SK } from '../../../storage'

const T = (done, doneAt) => ({ done, doneAt })
const EMPTY_GROWTH = { habits: [], checks: {}, journal: {} }

beforeEach(() => localStorage.clear())

describe('computeRawXP — Gewichte', () => {
  it('gewichtet alle vier Quellen korrekt', () => {
    const todos    = [T(true, '2026-06-10T08:00'), T(true, '2026-06-09T08:00'), T(false, null)]
    const tracking = { tagesplanerDates: ['2026-06-08', '2026-06-09', '2026-06-10'] }
    const growth   = { habits: [], checks: { '2026-06-10': ['a', 'b'], '2026-06-09': ['a'] }, journal: { '2026-06-10': 'x' } }
    // 2·10 + 3·25 + 3·5 + 1·15 = 125
    expect(computeRawXP(todos, tracking, growth)).toBe(125)
  })
  it('funktioniert ohne Wachstum-Daten (leere Defaults)', () => {
    expect(computeRawXP([T(true, 'x')], { tagesplanerDates: [] }, EMPTY_GROWTH)).toBe(XP_WEIGHTS.todo)
  })
})

describe('todayRawXP — zählt nur heutige Beiträge', () => {
  const today = '2026-06-10'
  it('Todos nur mit doneAt von heute', () => {
    const todos = [T(true, '2026-06-10T09:00:00'), T(true, '2026-06-09T09:00:00')]
    expect(todayRawXP(todos, { tagesplanerDates: [] }, EMPTY_GROWTH, today)).toBe(XP_WEIGHTS.todo)
  })
  it('Planer-Tag + Checks + Journal von heute', () => {
    const growth = { habits: [], checks: { [today]: ['a', 'b'] }, journal: { [today]: 'gut' } }
    expect(todayRawXP([], { tagesplanerDates: [today] }, growth, today))
      .toBe(XP_WEIGHTS.planerTag + 2 * XP_WEIGHTS.habitCheck + XP_WEIGHTS.journalTag)
  })
})

describe('Meilensteine', () => {
  it('Schwelle genau erreicht zählt als erreicht', () => {
    expect(reachedMilestones(80).map(m => m.id)).toContain('keimling')
    expect(reachedMilestones(79).map(m => m.id)).not.toContain('keimling')
  })
  it('stageNum: 0 XP = Stufe 1, Endausbau = 8', () => {
    expect(stageNum(0)).toBe(1)
    expect(stageNum(6000)).toBe(8)
  })
  it('nextMilestone nach dem letzten = null', () => {
    expect(nextMilestone(6000)).toBeNull()
    expect(nextMilestone(0)?.id).toBe('keimling')
  })
  it('reachedDekos liefert nur Deko-IDs', () => {
    expect(reachedDekos(1000)).toEqual(['steine', 'gluehwuermchen', 'teich'])
  })
  it('currentStage(0) ist Samen', () => {
    expect(currentStage(0).id).toBe('samen')
  })
})

describe('displayXP — Monotonie-Ratchet', () => {
  it('steigt mit den Daten und fällt nie zurück', () => {
    sv(SK.erfolgeTracking, { tagesplanerDates: ['2026-06-10'] })
    expect(displayXP([T(true, 'x'), T(true, 'y')])).toBe(45) // 25 + 2·10
    // Erledigte Todos gelöscht → Rohwert sinkt, Anzeige nicht
    expect(displayXP([])).toBe(45)
  })
})

describe('Neu-Hinweis', () => {
  it('zählt ungesehene Meilensteine und lässt sich quittieren', () => {
    expect(unseenMilestones(200)).toBe(3) // samen, keimling, steine
    markMilestonesSeen(200)
    expect(unseenMilestones(200)).toBe(0)
  })
})
```

- [ ] **Step 2: Tests laufen lassen — müssen failen**

Run: `npx vitest run src/features/tools/garten/gartenData.test.js`
Expected: FAIL („Cannot find module './gartenData'")

- [ ] **Step 3: Implementierung**

```js
// src/features/tools/garten/gartenData.js
// Datenlayer des Garten-Begleiters. XP ist ABGELEITET aus vorhandenen App-Daten
// (kein Event-Tracking) und durch einen Ratchet (xpFloor) monoton — nie Rückschritt.
import { sv, lv, SK } from '../../../storage'
import { todayKey } from '../../../utils'
import { loadGrowth } from '../wachstum/growthData'

export const XP_WEIGHTS = { todo: 10, planerTag: 25, habitCheck: 5, journalTag: 15 }

export const MILESTONES = [
  { xp: 0,    type: 'stage', id: 'samen',          name: 'Samen' },
  { xp: 80,   type: 'stage', id: 'keimling',       name: 'Keimling' },
  { xp: 150,  type: 'deko',  id: 'steine',         name: 'Steine' },
  { xp: 250,  type: 'stage', id: 'spross',         name: 'Spross' },
  { xp: 450,  type: 'deko',  id: 'gluehwuermchen', name: 'Glühwürmchen' },
  { xp: 600,  type: 'stage', id: 'jungePflanze',   name: 'Junge Pflanze' },
  { xp: 900,  type: 'deko',  id: 'teich',          name: 'Teich' },
  { xp: 1200, type: 'stage', id: 'ersteBluete',    name: 'Erste Blüte' },
  { xp: 1700, type: 'deko',  id: 'schmetterling',  name: 'Schmetterling' },
  { xp: 2200, type: 'stage', id: 'beet',           name: 'Beet' },
  { xp: 3000, type: 'deko',  id: 'steinpfad',      name: 'Steinpfad' },
  { xp: 3800, type: 'stage', id: 'garten',         name: 'Garten' },
  { xp: 4800, type: 'deko',  id: 'sternschnuppe',  name: 'Sternschnuppe' },
  { xp: 6000, type: 'stage', id: 'lichtgarten',    name: 'Lichtgarten' },
]

const EMPTY = { xpFloor: 0, seenMilestones: 0 }
const loadState   = () => ({ ...EMPTY, ...lv(SK.garten, EMPTY) })
const trackingNow = () => lv(SK.erfolgeTracking, { tagesplanerDates: [] })

// ─── XP (pur, testbar) ────────────────────────────────────
export function computeRawXP(todos, tracking, growth) {
  const habitChecks = Object.values(growth.checks ?? {}).reduce((n, a) => n + a.length, 0)
  return XP_WEIGHTS.todo       * todos.filter(t => t.done).length
       + XP_WEIGHTS.planerTag  * (tracking.tagesplanerDates ?? []).length
       + XP_WEIGHTS.habitCheck * habitChecks
       + XP_WEIGHTS.journalTag * Object.keys(growth.journal ?? {}).length
}

export function todayRawXP(todos, tracking, growth, today) {
  return XP_WEIGHTS.todo       * todos.filter(t => t.done && (t.doneAt ?? '').startsWith(today)).length
       + XP_WEIGHTS.planerTag  * ((tracking.tagesplanerDates ?? []).includes(today) ? 1 : 0)
       + XP_WEIGHTS.habitCheck * (growth.checks?.[today] ?? []).length
       + XP_WEIGHTS.journalTag * (growth.journal?.[today] ? 1 : 0)
}

// ─── XP (storage-gebunden) ────────────────────────────────
export function displayXP(todos) {
  const raw   = computeRawXP(todos, trackingNow(), loadGrowth())
  const state = loadState()
  if (raw > state.xpFloor) {
    sv(SK.garten, { ...state, xpFloor: raw })
    return raw
  }
  return state.xpFloor
}

export function todayXP(todos) {
  return todayRawXP(todos, trackingNow(), loadGrowth(), todayKey())
}

export function xpBreakdown(todos) {
  const tracking    = trackingNow()
  const growth      = loadGrowth()
  const todosDone   = todos.filter(t => t.done).length
  const planerTage  = (tracking.tagesplanerDates ?? []).length
  const habitChecks = Object.values(growth.checks ?? {}).reduce((n, a) => n + a.length, 0)
  const journalTage = Object.keys(growth.journal ?? {}).length
  return [
    { id: 'todos',   label: 'Erledigte Todos',    count: todosDone,   each: XP_WEIGHTS.todo,       xp: todosDone   * XP_WEIGHTS.todo },
    { id: 'planer',  label: 'Tagesplaner-Tage',   count: planerTage,  each: XP_WEIGHTS.planerTag,  xp: planerTage  * XP_WEIGHTS.planerTag },
    { id: 'checks',  label: 'Gewohnheits-Checks', count: habitChecks, each: XP_WEIGHTS.habitCheck, xp: habitChecks * XP_WEIGHTS.habitCheck },
    { id: 'journal', label: 'Journal-Tage',       count: journalTage, each: XP_WEIGHTS.journalTag, xp: journalTage * XP_WEIGHTS.journalTag },
  ]
}

// ─── Meilensteine (pur) ───────────────────────────────────
export const reachedMilestones = (xp) => MILESTONES.filter(m => xp >= m.xp)
export const nextMilestone     = (xp) => MILESTONES.find(m => xp < m.xp) ?? null
export const stageNum          = (xp) => MILESTONES.filter(m => m.type === 'stage' && xp >= m.xp).length
export const currentStage      = (xp) => MILESTONES.filter(m => m.type === 'stage' && xp >= m.xp).at(-1)
export const reachedDekos      = (xp) => MILESTONES.filter(m => m.type === 'deko' && xp >= m.xp).map(m => m.id)

// ─── Neu-Hinweis (dezent, kein Zwang) ─────────────────────
export function unseenMilestones(xp) {
  return Math.max(0, reachedMilestones(xp).length - loadState().seenMilestones)
}
export function markMilestonesSeen(xp) {
  const state = loadState()
  const n = reachedMilestones(xp).length
  if (n !== state.seenMilestones) sv(SK.garten, { ...state, seenMilestones: n })
}

// ─── Tag/Nacht nach Uhrzeit — Inaktivität bleibt unsichtbar ──
export const isNight = (h = new Date().getHours()) => h >= 21 || h < 6
```

- [ ] **Step 4: Tests laufen lassen — müssen passen**

Run: `npx vitest run src/features/tools/garten/gartenData.test.js`
Expected: PASS (11 Tests). Achtung: braucht den Storage-Key `SK.garten` aus Task 4 —
falls Tests vorher laufen sollen, Task 4 Schritt 1 (SK-Eintrag) vorziehen.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/garten/gartenData.js src/features/tools/garten/gartenData.test.js
git commit -m "feat: Garten-Datenlayer — abgeleitetes XP, Monotonie-Ratchet, Meilensteine"
```

---

### Task 2: Prozedurale SVG-Szene

**Files:**
- Create: `src/features/tools/garten/GartenSzene.jsx`
- Create: `src/features/tools/garten/GartenSzene.module.css`

- [ ] **Step 1: Komponente schreiben**

```jsx
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
```

- [ ] **Step 2: CSS-Modul schreiben** (alle Farben via vars.css + color-mix — keine neuen Hex)

```css
/* src/features/tools/garten/GartenSzene.module.css */
.szene { display: block; width: 100%; height: auto; }

.day {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--primary) 16%, var(--bg)) 0%,
    color-mix(in srgb, var(--primary) 8%, var(--bg)) 55%,
    var(--bg2) 100%);
}
.night {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--primary) 7%, var(--bg)) 0%,
    var(--bg2) 70%,
    var(--bg) 100%);
}

.huegel { fill: color-mix(in srgb, var(--primary) 14%, var(--bg)); }
.boden  { fill: color-mix(in srgb, var(--emerald) 12%, var(--bg)); }

.stiel { stroke: color-mix(in srgb, var(--emerald) 70%, var(--bg)); stroke-width: 2; fill: none; stroke-linecap: round; }
.blatt { fill: color-mix(in srgb, var(--emerald) 55%, var(--bg)); }
.gras path { stroke: color-mix(in srgb, var(--emerald) 45%, var(--bg)); stroke-width: 1.4; fill: none; stroke-linecap: round; }

.samen     { fill: color-mix(in srgb, var(--primary) 70%, white); }
.erdhuegel { fill: color-mix(in srgb, var(--emerald) 8%, var(--bg3)); }
.knospe    { fill: color-mix(in srgb, var(--primary) 75%, var(--bg)); }

.bluetePrimary  { fill: color-mix(in srgb, var(--primary) 80%, white); opacity: 0.92; }
.blueteMitte    { fill: var(--teal); }
.blueteTeal     { fill: color-mix(in srgb, var(--teal) 75%, white); }
.blueteHell circle { fill: color-mix(in srgb, var(--emerald) 60%, white); }

.stein      { fill: color-mix(in srgb, white 14%, var(--bg3)); }
.teich      { fill: color-mix(in srgb, var(--teal) 30%, var(--bg2)); }
.teichLicht { fill: color-mix(in srgb, white 22%, transparent); }

.stern { fill: white; opacity: 0.7; animation: sternFunkeln 3.2s ease-in-out infinite; }
.mond  { fill: color-mix(in srgb, white 80%, var(--primary)); opacity: 0.9; }

.gluehwuermchen { fill: color-mix(in srgb, var(--emerald) 60%, white); animation: gluehen 2.6s ease-in-out infinite; }
.lichtpunkt     { fill: color-mix(in srgb, var(--primary) 50%, white); animation: gluehen 3.4s ease-in-out infinite; }

.schmetterling         { animation: flattern 4s ease-in-out infinite; }
.schmetterling ellipse { fill: color-mix(in srgb, var(--rose) 70%, white); opacity: 0.85; }
.schmetterling line    { stroke: color-mix(in srgb, white 60%, var(--bg)); stroke-width: 1; }

.sternschnuppe line   { stroke: color-mix(in srgb, white 70%, var(--teal)); stroke-width: 1; opacity: 0.8; }
.sternschnuppe circle { fill: white; }

@keyframes sternFunkeln { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.85; } }
@keyframes gluehen      { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.95; } }
@keyframes flattern     { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

@media (prefers-reduced-motion: reduce) {
  .stern, .gluehwuermchen, .lichtpunkt, .schmetterling { animation: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/garten/GartenSzene.jsx src/features/tools/garten/GartenSzene.module.css
git commit -m "feat: GartenSzene — prozedurales SVG, 8 Stufen, Dekos, Tag/Nacht"
```

---

### Task 3: TabGarten + GartenSection

**Files:**
- Create: `src/features/tools/garten/TabGarten.jsx` + `TabGarten.module.css`
- Create: `src/features/tools/garten/GartenSection.jsx` + `GartenSection.module.css`

- [ ] **Step 1: TabGarten.jsx**

```jsx
// src/features/tools/garten/TabGarten.jsx
import { useEffect } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import GartenSzene from './GartenSzene'
import {
  MILESTONES, displayXP, stageNum, currentStage, reachedDekos,
  reachedMilestones, nextMilestone, xpBreakdown, markMilestonesSeen, isNight,
} from './gartenData'
import s from './TabGarten.module.css'

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function TabGarten({ onBack }) {
  const { todos, toolColors } = useAppStore()
  const toolColor = getToolColor('garten', toolColors)

  const xp        = displayXP(todos)
  const stage     = stageNum(xp)
  const next      = nextMilestone(xp)
  const breakdown = xpBreakdown(todos)

  const reached = reachedMilestones(xp)
  const prevXp  = reached[reached.length - 1]?.xp ?? 0
  const pct     = next ? Math.round(((xp - prevXp) / (next.xp - prevXp)) * 100) : 100

  useEffect(() => { markMilestonesSeen(xp) }, [xp])

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="garten" size={22} />}
        eyebrow="Begleiter"
        title="Garten"
      />

      <div className={s.szeneCard}>
        <GartenSzene stage={stage} dekos={reachedDekos(xp)} night={isNight()} />
      </div>

      <div className={s.xpCard}>
        <div className={s.xpNum}>{xp}<span className={s.xpUnit}> XP</span></div>
        <div className={s.xpStufe}>{currentStage(xp).name}</div>
        {next ? (
          <>
            <div className={s.track}><div className={s.fill} style={{ width: `${pct}%` }} /></div>
            <div className={s.nextLabel}>
              Nächste Freischaltung: <b>{next.name}</b> — noch {next.xp - xp} XP
            </div>
          </>
        ) : (
          <div className={s.nextLabel}>Dein Garten ist voll erblüht.</div>
        )}
      </div>

      <div className={s.section}>
        <div className={s.sectionLabel}>So wächst dein Garten</div>
        {breakdown.map(b => (
          <div key={b.id} className={s.srcRow}>
            <span className={s.srcLabel}>{b.label}</span>
            <span className={s.srcCount}>{b.count} × {b.each}</span>
            <span className={s.srcXP}>{b.xp} XP</span>
          </div>
        ))}
      </div>

      <div className={s.section}>
        <div className={s.sectionLabel}>Meilensteine</div>
        {MILESTONES.map(m => {
          const done = xp >= m.xp
          return (
            <div key={m.id} className={[s.msRow, done ? s.msDone : ''].join(' ')}>
              <span className={s.msDot}>{done && <CheckIcon />}</span>
              <span className={s.msName}>{m.name}{m.id === 'sternschnuppe' ? ' (nachts)' : ''}</span>
              <span className={s.msType}>{m.type === 'stage' ? 'Stufe' : 'Deko'}</span>
              <span className={s.msXP}>{m.xp} XP</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TabGarten.module.css** (`.page`-Grundgerüst an TabErfolge.module.css angleichen — vor dem Schreiben kurz lesen)

```css
/* src/features/tools/garten/TabGarten.module.css */
.page { display: flex; flex-direction: column; gap: 14px; padding-bottom: 24px; }

.szeneCard {
  border-radius: var(--r);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
}

.xpCard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 16px;
  text-align: center;
}
.xpNum {
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  color: var(--tool-color);
  text-shadow: 0 0 18px color-mix(in srgb, var(--tool-color) 55%, transparent);
}
.xpUnit  { font-size: 0.9rem; color: var(--text-dim); }
.xpStufe { color: var(--text); margin-top: 2px; font-weight: 600; }

.track {
  height: 6px;
  border-radius: 3px;
  background: var(--surface);
  border: 1px solid var(--border);
  margin-top: 12px;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--tool-color);
  border-radius: 3px;
  box-shadow: 0 0 8px color-mix(in srgb, var(--tool-color) 60%, transparent);
}
.nextLabel { margin-top: 8px; font-size: 0.8rem; color: var(--text-dim); }
.nextLabel b { color: var(--text); }

.section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
}
.sectionLabel {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  margin-bottom: 10px;
}

.srcRow   { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; font-size: 0.86rem; }
.srcLabel { flex: 1; color: var(--text); }
.srcCount { color: var(--text-dim); font-size: 0.76rem; }
.srcXP    { font-family: 'Orbitron', sans-serif; font-size: 0.78rem; color: var(--tool-color); min-width: 64px; text-align: right; }

.msRow  { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 0.86rem; opacity: 0.55; }
.msDone { opacity: 1; }
.msDot {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--emerald);
  flex-shrink: 0;
}
.msDone .msDot {
  border-color: color-mix(in srgb, var(--emerald) 50%, transparent);
  background: color-mix(in srgb, var(--emerald) 14%, transparent);
}
.msName { flex: 1; }
.msType {
  font-size: 0.68rem;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 1px 7px;
}
.msXP { font-family: 'Orbitron', sans-serif; font-size: 0.74rem; color: var(--text-dim); min-width: 56px; text-align: right; }
```

- [ ] **Step 3: GartenSection.jsx**

```jsx
// src/features/tools/garten/GartenSection.jsx
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import GartenSzene from './GartenSzene'
import {
  displayXP, todayXP, stageNum, reachedDekos,
  reachedMilestones, nextMilestone, unseenMilestones, isNight,
} from './gartenData'
import s from './GartenSection.module.css'

export default function GartenSection() {
  const { todos, toolColors, setCurrentTab } = useAppStore()
  const toolColor = getToolColor('garten', toolColors)

  const xp     = displayXP(todos)
  const plus   = todayXP(todos)
  const next   = nextMilestone(xp)
  const unseen = unseenMilestones(xp)

  const reached = reachedMilestones(xp)
  const prevXp  = reached[reached.length - 1]?.xp ?? 0
  const pct     = next ? Math.round(((xp - prevXp) / (next.xp - prevXp)) * 100) : 100

  return (
    <ToolSection
      toolId="garten"
      title="Garten"
      color={toolColor}
      defaultOpen
      badge={plus > 0 ? `+${plus} heute` : null}
      onTitleClick={() => setCurrentTab(TOOL_TAB.garten)}
    >
      <div className={s.wrap} style={{ '--tool-color': toolColor }}>
        <div className={s.szeneWrap}>
          <GartenSzene stage={stageNum(xp)} dekos={reachedDekos(xp)} night={isNight()} />
        </div>
        {next && (
          <div className={s.progressRow}>
            <div className={s.track}><div className={s.fill} style={{ width: `${pct}%` }} /></div>
            <span className={s.nextLabel}>
              {unseen > 0 ? 'Neues freigeschaltet — schau rein' : `${next.name} in ${next.xp - xp} XP`}
            </span>
          </div>
        )}
      </div>
    </ToolSection>
  )
}
```

- [ ] **Step 4: GartenSection.module.css**

```css
/* src/features/tools/garten/GartenSection.module.css */
.wrap { display: flex; flex-direction: column; gap: 10px; }

.szeneWrap {
  border-radius: var(--r-sm);
  overflow: hidden;
  border: 1px solid var(--border);
}

.progressRow { display: flex; align-items: center; gap: 10px; }
.track {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: var(--surface);
  border: 1px solid var(--border);
  overflow: hidden;
}
.fill { height: 100%; background: var(--tool-color); border-radius: 3px; }
.nextLabel { font-size: 0.72rem; color: var(--text-dim); white-space: nowrap; }
```

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/garten/
git commit -m "feat: TabGarten + GartenSection (Dashboard-Karte)"
```

---

### Task 4: Integration + Migration (Erfolge raus, Garten rein)

**Files:**
- Modify: `src/storage/index.js` (SK + BACKUP_CATS)
- Modify: `src/features/tools/toolRegistry.jsx` (Icon + Eintrag)
- Modify: `src/features/tools/toolReset.js`
- Modify: `src/store/index.js:90` (activeTools-Mapping)
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx:11,570`
- Delete: `src/features/tools/erfolge/` (5 Dateien)

- [ ] **Step 1: Storage-Key + Backup** — in `src/storage/index.js`:

In `SK` nach `wachstum`-Zeile:
```js
  garten:          `${PREFIX}garten_v1`,
```
In `BACKUP_CATS.tools` nach `SK.wachstum,`:
```js
    SK.garten,
```

- [ ] **Step 2: toolRegistry.jsx** — Icon `erfolge` ersetzen durch:

```jsx
  garten:       { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/></svg> },
```

Registry-Eintrag `erfolge` (id/name/icon/color/description/component) ersetzen durch:

```jsx
  {
    id: 'garten',
    tabId: 10,
    name: 'Garten',
    icon: '🌿',
    color: '#2DD4BF',
    description: 'Dein Begleiter — wächst mit allem, was du erledigst',
    standalone: true,
    integrated: false,
    component: lazy(() => import('./garten/TabGarten')),
  },
```

- [ ] **Step 3: toolReset.js** — Zeile `erfolge: …` ersetzen durch:

```js
  garten:      { keys: [SK.garten] },
```
(Bewusst OHNE `SK.erfolgeTracking` — das ist Kern-Aktivitätshistorie, ihr Löschen wäre Rückschritt.)

- [ ] **Step 4: store/index.js** — activeTools-Init (Zeile 90), einmalige idempotente Migration:

```js
  activeTools: lv(SK.activeTools, ['geburtstage', 'kognitiv', 'haushalt', 'klaeren']).map(id => id === 'erfolge' ? 'garten' : id),
```

- [ ] **Step 5: TabHeute.jsx** — Import (Zeile 11) und SECTIONS (Zeile 570):

```js
import GartenSection       from '../../tools/garten/GartenSection'
```
```js
const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, garten: GartenSection, gewicht: GewichtSection, geburtstage: BirthdaySection, kognitiv: KognitivSection, wachstum: WachstumSection }
```
Der erfolgeTracking-Effect (Zeile 118–129) bleibt UNVERÄNDERT.

- [ ] **Step 6: Erfolge-Ordner löschen**

```bash
git rm -r src/features/tools/erfolge
```

- [ ] **Step 7: Alle Tests + Build**

Run: `npx vitest run` → Expected: PASS (inkl. Anti-Drift mit SK.garten)
Run: `npm run build` → Expected: Erfolg, keine Import-Fehler

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Garten ersetzt Erfolge — Registry, Reset, Backup, Dashboard, Migration activeTools"
```

---

### Task 5: Verifikation im Browser

- [ ] **Step 1: Dev-Server via preview_start** (es läuft bereits ein Vite auf dem Standardport — Vite weicht automatisch aus bzw. Preview nutzt eigenen Port)
- [ ] **Step 2: Leerer Zustand** — Tagesplaner: Garten-Karte zeigt Samen-Szene; Tab 10: Samen + „Nächste Freischaltung: Keimling".
- [ ] **Step 3: Gewachsener Zustand simulieren** — per preview_eval:

```js
localStorage.setItem('adhs_erfolge_tracking_v1', JSON.stringify({
  tagesplanerDates: Array.from({ length: 80 }, (_, i) => `2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, '0')}`)
})); location.reload()
```
→ 2000 XP → Stufe „Beet", Dekos bis Schmetterling sichtbar.

- [ ] **Step 4: Screenshots** — Dashboard-Karte + TabGarten (Beleg für den User).
- [ ] **Step 5: Konsole prüfen** — preview_console_logs ohne Fehler.

---

### Task 6: Kontext-Dateien + Spec-Abgleich

**Files:**
- Modify: `kontext/kern.md` (SK-Tabelle, Tab-Routing Tab 10, Dots-Liste)
- Modify: `kontext/tool-pattern.md` (Tab-Liste)
- Modify: `kontext/architektur.md` (Ordnerstruktur: garten statt gamification/erfolge-Altlast)
- Modify: `docs/superpowers/specs/2026-06-10-garten-begleiter-design.md` („kompakt"-Prop aus Szene-Beschreibung streichen — eine Szene überall)

- [ ] **Step 1: kern.md** — Tab 10 → `Garten (garten)`; SK-Tabelle ergänzen:
```
SK.garten            → 'adhs_garten_v1'         // { xpFloor, seenMilestones } — Monotonie-Ratchet
SK.erfolge           → LEGACY (altes Erfolge-Tool, nur Backup-Kompat)
SK.erfolgeTracking   → 'adhs_erfolge_tracking_v1' // Tagesplaner-Tage; schreibt TabHeute, liest Garten
```
„Keine Dots für: … Erfolge" → „… Garten".
- [ ] **Step 2: tool-pattern.md** — `Tab 10 — XP & Level (gamification)` → `Tab 10 — Garten (garten)`.
- [ ] **Step 3: architektur.md** — in der Ordnerstruktur den Tools-Block aktualisieren: `garten/` mit den 5 neuen Dateien eintragen; veraltete `gamification/`-Zeile nur ersetzen, wenn der Ordner real nicht existiert (vorher mit Glob prüfen — sonst melden statt löschen).
- [ ] **Step 4: Commit**

```bash
git add kontext/ docs/
git commit -m "docs: Kontext-Dateien — Garten ersetzt Erfolge (Tab 10, SK.garten)"
```
