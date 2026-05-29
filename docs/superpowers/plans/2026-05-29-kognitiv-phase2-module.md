# Kognitiv Phase 2 — 6 neue Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6 neue Übungs-Module zum Kognitiv-Tool hinzufügen: Go/No-Go, N-Back, Task Switching, CPT/Vigilanz, Selektive Aufmerksamkeit, Geteilte Aufmerksamkeit.

**Architecture:** Jedes Modul ist eine eigenständige Exercise-Komponente mit `onDone(session)` / `onAbort()` Props — exakt das Pattern von `AlertnessExercise`. Integration in zwei Schritten: (1) `moduleConfig.js` um 6 Einträge erweitern → Module erscheinen sofort in ModuleList, Dashboard und Einstellungen. (2) Jede Exercise in `ExMap` in `TabKognitiv.jsx` eintragen. Briefing, Results, Dashboard und sessionStore bleiben unverändert.

**Tech Stack:** React 18, CSS Modules, Web Audio API (GeteilteExercise only), `createSession` aus `sessionStore.js`

---

## File Map

| Datei | Aktion |
|-------|--------|
| `src/features/tools/kognitiv/moduleConfig.js` | Modify — 6 Einträge, MODULE_ORDER, PHASE2_MODULES |
| `src/features/tools/kognitiv/TabKognitiv.jsx` | Modify — 6 Imports + ExMap |
| `src/features/tools/kognitiv/exercises/GoNoGoExercise.jsx` | Create |
| `src/features/tools/kognitiv/exercises/GoNoGoExercise.module.css` | Create |
| `src/features/tools/kognitiv/exercises/NBackExercise.jsx` | Create |
| `src/features/tools/kognitiv/exercises/NBackExercise.module.css` | Create |
| `src/features/tools/kognitiv/exercises/TaskSwitchingExercise.jsx` | Create |
| `src/features/tools/kognitiv/exercises/TaskSwitchingExercise.module.css` | Create |
| `src/features/tools/kognitiv/exercises/CptExercise.jsx` | Create |
| `src/features/tools/kognitiv/exercises/CptExercise.module.css` | Create |
| `src/features/tools/kognitiv/exercises/SelektivExercise.jsx` | Create |
| `src/features/tools/kognitiv/exercises/SelektivExercise.module.css` | Create |
| `src/features/tools/kognitiv/exercises/GeteilteExercise.jsx` | Create |
| `src/features/tools/kognitiv/exercises/GeteilteExercise.module.css` | Create |

---

## Task 1: moduleConfig.js + TabKognitiv ExMap vorbereiten

**Files:**
- Modify: `src/features/tools/kognitiv/moduleConfig.js`
- Modify: `src/features/tools/kognitiv/TabKognitiv.jsx`

- [ ] **Step 1: moduleConfig.js — Datei vollständig ersetzen**

```js
export const MODULE_CONFIG = {
  alertness: {
    id: 'alertness',
    name: 'Alertness',
    desc: 'Tippe so schnell wie möglich wenn der Kreis erscheint.',
    duration: 'ca. 2,5 Minuten',
    measured: ['Reaktionszeit (ms)', 'Fehler (Falschtippen)', 'Auslasser (verpasst)'],
    notMeasured: ['Intelligenz', 'Ablenkungen außerhalb des Screens'],
    mainMetricLabel: 'Ø Reaktionszeit',
    mainMetricUnit: 'ms',
    variants: ['Ohne Ton', 'Mit Warnton'],
    defaultVariant: 'Ohne Ton',
  },
  zahlensuche: {
    id: 'zahlensuche',
    name: 'Zahlensuche',
    desc: '25 Felder mit Zahlen 01–25. Tippe sie in Reihenfolge so schnell wie möglich.',
    duration: 'ca. 2–4 Minuten',
    measured: ['Gesamtzeit (s)', 'Fehler', 'Zeit pro Zahl'],
    notMeasured: ['Rechenkenntnisse', 'Ablenkungen außerhalb des Screens'],
    mainMetricLabel: 'Gesamtzeit',
    mainMetricUnit: 's',
    variants: ['Normal', 'Schwer', 'Rückwärts'],
    defaultVariant: 'Normal',
  },
  gedaechtnis: {
    id: 'gedaechtnis',
    name: 'Arbeitsgedächtnis',
    desc: '12 Kreise leuchten nacheinander auf — merke dir die Sequenz.',
    duration: 'ca. 5 Minuten',
    measured: ['Korrekte Sequenzen', 'Fehler gesamt', 'Max. Sequenzlänge'],
    notMeasured: ['Gesamtintelligenz', 'Tagesform außerhalb der Übung'],
    mainMetricLabel: 'Korrekte Runden',
    mainMetricUnit: '',
    variants: ['Normal', 'Schwer'],
    defaultVariant: 'Normal',
  },
  gonogo: {
    id: 'gonogo',
    name: 'Go / No-Go',
    desc: 'Tippe bei Grün, halte still bei Rot.',
    duration: 'ca. 3 Minuten',
    measured: ['Reaktionszeit bei Go', 'Fehlerrate bei No-Go (Impulsivität)', 'Auslasser'],
    notMeasured: ['Konzentration auf äußere Reize', 'Emotionale Kontrolle'],
    mainMetricLabel: 'Ø Reaktionszeit',
    mainMetricUnit: 'ms',
    variants: ['Normal', 'Schwer'],
    defaultVariant: 'Normal',
  },
  nback: {
    id: 'nback',
    name: 'N-Back',
    desc: 'Tippe wenn das aktuelle Symbol dasselbe ist wie das vorherige.',
    duration: 'ca. 4 Minuten',
    measured: ['Treffer', 'Fehler', 'Auslasser'],
    notMeasured: ['Reaktionsgeschwindigkeit', 'Sprachkenntnisse'],
    mainMetricLabel: 'Treffer-Rate',
    mainMetricUnit: '%',
    variants: ['Normal', 'Schwer'],
    defaultVariant: 'Normal',
  },
  taskswitching: {
    id: 'taskswitching',
    name: 'Task Switching',
    desc: 'Die Regel wechselt — einmal Form, einmal Farbe matchen.',
    duration: 'ca. 4 Minuten',
    measured: ['Reaktionszeit', 'Switch Cost (RT-Einbruch nach Regelwechsel)', 'Fehler nach Wechsel'],
    notMeasured: ['Allgemeine Intelligenz', 'Kreativität'],
    mainMetricLabel: 'Switch Cost',
    mainMetricUnit: 'ms',
    variants: ['Normal', 'Schwer'],
    defaultVariant: 'Normal',
  },
  cpt: {
    id: 'cpt',
    name: 'Vigilanz',
    desc: '3 Minuten: nur beim Ziel-Symbol tippen, beim anderen nicht.',
    duration: 'ca. 3 Minuten',
    measured: ['Treffer', 'Auslasser', 'False Alarms', 'Aufmerksamkeits-Abfall über Zeit'],
    notMeasured: ['Reaktionsgeschwindigkeit', 'Intelligenz'],
    mainMetricLabel: 'Vigilanz-Dekrement',
    mainMetricUnit: '%',
    variants: ['Normal', 'Schwer'],
    defaultVariant: 'Normal',
  },
  selektiv: {
    id: 'selektiv',
    name: 'Selektive Aufmerksamkeit',
    desc: 'Symbole blitzen auf — tippe nur bei der Zielfarbe.',
    duration: 'ca. 3 Minuten',
    measured: ['Treffer', 'Fehler', 'Auslasser', 'Reaktionszeit'],
    notMeasured: ['Formerkennung', 'Sprachkenntnisse'],
    mainMetricLabel: 'Treffer-Rate',
    mainMetricUnit: '%',
    variants: ['Normal', 'Schwer'],
    defaultVariant: 'Normal',
  },
  geteilt: {
    id: 'geteilt',
    name: 'Geteilte Aufmerksamkeit',
    desc: 'Bild und Ton gleichzeitig beobachten und reagieren.',
    duration: 'ca. 3 Minuten',
    measured: ['Treffer visuell', 'Treffer auditiv', 'Fehler gesamt'],
    notMeasured: ['Reaktionszeit', 'Hörfähigkeit'],
    mainMetricLabel: 'Gesamt-Treffer',
    mainMetricUnit: '%',
    variants: ['Normal', 'Schwer'],
    defaultVariant: 'Normal',
  },
}

export const MODULE_ORDER = [
  'alertness', 'zahlensuche', 'gedaechtnis',
  'gonogo', 'nback', 'taskswitching', 'cpt', 'selektiv', 'geteilt',
]
export const PHASE2_MODULES = []
```

- [ ] **Step 2: TabKognitiv.jsx — 6 neue Imports hinzufügen**

Nach Zeile 19 (`import GedaechtnisExercise`) einfügen:

```jsx
import GoNoGoExercise        from './exercises/GoNoGoExercise'
import NBackExercise         from './exercises/NBackExercise'
import TaskSwitchingExercise from './exercises/TaskSwitchingExercise'
import CptExercise           from './exercises/CptExercise'
import SelektivExercise      from './exercises/SelektivExercise'
import GeteilteExercise      from './exercises/GeteilteExercise'
```

- [ ] **Step 3: TabKognitiv.jsx — ExMap erweitern**

Zeile 126 (`const ExMap = { alertness: ...`) ersetzen durch:

```jsx
const ExMap = {
  alertness:      AlertnessExercise,
  zahlensuche:    ZahlensucheExercise,
  gedaechtnis:    GedaechtnisExercise,
  gonogo:         GoNoGoExercise,
  nback:          NBackExercise,
  taskswitching:  TaskSwitchingExercise,
  cpt:            CptExercise,
  selektiv:       SelektivExercise,
  geteilt:        GeteilteExercise,
}
```

- [ ] **Step 4: App starten und prüfen**

`npx vite` → Kognitiv öffnen → Module-Tab zeigt 9 Module → "Go/No-Go" anklicken → Briefing öffnet → "Starten" → zeigt Placeholder-Text "Exercise gonogo — noch nicht implementiert". Kein JS-Fehler in der Konsole.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/kognitiv/moduleConfig.js src/features/tools/kognitiv/TabKognitiv.jsx
git commit -m "feat(kognitiv): add 6 new module configs + ExMap wiring"
```

---

## Task 2: Go/No-Go Exercise

**Files:**
- Create: `src/features/tools/kognitiv/exercises/GoNoGoExercise.module.css`
- Create: `src/features/tools/kognitiv/exercises/GoNoGoExercise.jsx`

- [ ] **Step 1: CSS erstellen**

```css
.root { position:fixed; inset:0; background:#05050e; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent; }
.closeBtn { position:absolute; top:16px; left:16px; width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,0.04); border:none; color:rgba(255,255,255,0.18); font-size:.75rem; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; }
.arena { flex:1; width:100%; display:flex; align-items:center; justify-content:center; }
.go   { width:110px; height:110px; border-radius:50%; background:rgba(16,185,129,0.15); border:3px solid #10B981; box-shadow:0 0 40px rgba(16,185,129,0.35),0 0 80px rgba(16,185,129,0.15); }
.nogo { width:110px; height:110px; border-radius:50%; background:rgba(251,113,133,0.12); border:3px solid #FB7185; box-shadow:0 0 40px rgba(251,113,133,0.25); }
```

- [ ] **Step 2: JSX erstellen**

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './GoNoGoExercise.module.css'

const TOTAL      = 30
const NOGO_COUNT = 6
const STIM_MS    = 800

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function buildSeq() {
  const seq = [...Array(TOTAL - NOGO_COUNT).fill('go'), ...Array(NOGO_COUNT).fill('nogo')]
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]]
  }
  return seq
}

export default function GoNoGoExercise({ variant, onDone, onAbort }) {
  const isiRange = variant === 'Schwer' ? [800, 2500] : [1500, 4000]
  const [stimType, setStimType] = useState(null)

  const seqRef      = useRef(buildSeq())
  const idxRef      = useRef(0)
  const tapsRef     = useRef([])
  const startedAt   = useRef(new Date().toISOString())
  const timerRef    = useRef(null)
  const appearedAt  = useRef(null)
  const finishedRef = useRef(false)
  const schedRef    = useRef(null)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits   = tapsRef.current.filter(t => t.type === 'hit')
    const misses = tapsRef.current.filter(t => t.type === 'miss')
    const fa     = tapsRef.current.filter(t => t.type === 'false-alarm')
    const avgMs  = hits.length > 0 ? Math.round(hits.reduce((a, b) => a + b.reactionMs, 0) / hits.length) : 0
    const dur    = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'gonogo', variant, startedAt: startedAt.current, duration: dur,
      score: { correct: hits.length, errors: fa.length, misses: misses.length, total: TOTAL },
      mainMetric: avgMs, taps: tapsRef.current,
    }))
  }, [variant, onDone])

  function showStim() {
    if (finishedRef.current) return
    if (idxRef.current >= TOTAL) { finish(); return }
    const type = seqRef.current[idxRef.current++]
    appearedAt.current = Date.now()
    setStimType(type)
    timerRef.current = setTimeout(() => {
      if (type === 'go') {
        tapsRef.current.push({ index: idxRef.current - 1, type: 'miss', correct: false, reactionMs: null })
      }
      appearedAt.current = null
      setStimType(null)
      if (idxRef.current >= TOTAL) finish()
      else schedRef.current()
    }, STIM_MS)
  }

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(showStim, rand(...isiRange))
  }, [isiRange])
  schedRef.current = schedule

  useEffect(() => { schedRef.current(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current) return
    if (stimType !== null && appearedAt.current !== null) {
      const rt = Date.now() - appearedAt.current
      clearTimeout(timerRef.current)
      const correct = stimType === 'go'
      tapsRef.current.push({ index: idxRef.current - 1, type: correct ? 'hit' : 'false-alarm', correct, reactionMs: rt })
      appearedAt.current = null
      setStimType(null)
      if (idxRef.current >= TOTAL) finish()
      else schedRef.current()
    } else {
      tapsRef.current.push({ index: idxRef.current, type: 'false-alarm', correct: false, reactionMs: null })
    }
  }, [stimType, finish])

  return (
    <div className={s.root} onClick={handleTap}>
      <button className={s.closeBtn} onClick={e => { e.stopPropagation(); onAbort() }}>✕</button>
      <div className={s.arena}>
        {stimType === 'go'   && <div className={s.go} />}
        {stimType === 'nogo' && <div className={s.nogo} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manuell testen**

App → Kognitiv → Go/No-Go → Normal starten → schwarzer Screen, grüner Kreis erscheint zufällig → tippen → Rote Kreise erscheinen → nicht tippen → nach 30 Stimuli öffnet Ergebnis-Screen mit Ø RT in ms. Schwer starten → Abstände kürzer.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/kognitiv/exercises/GoNoGoExercise.jsx src/features/tools/kognitiv/exercises/GoNoGoExercise.module.css
git commit -m "feat(kognitiv): add Go/No-Go exercise"
```

---

## Task 3: N-Back Exercise

**Files:**
- Create: `src/features/tools/kognitiv/exercises/NBackExercise.module.css`
- Create: `src/features/tools/kognitiv/exercises/NBackExercise.jsx`

- [ ] **Step 1: CSS erstellen**

```css
.root { position:fixed; inset:0; background:#05050e; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent; }
.closeBtn { position:absolute; top:16px; left:16px; width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,0.04); border:none; color:rgba(255,255,255,0.18); font-size:.75rem; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; }
.arena { flex:1; width:100%; display:flex; align-items:center; justify-content:center; }
```

- [ ] **Step 2: JSX erstellen**

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './NBackExercise.module.css'

const SHAPES = ['circle', 'triangle', 'square', 'star']
const STROKE = { circle: '#8B5CF6', triangle: '#14B8A6', square: '#10B981', star: '#FB7185' }
const FILL   = { circle: 'rgba(139,92,246,0.15)', triangle: 'rgba(20,184,166,0.15)', square: 'rgba(16,185,129,0.15)', star: 'rgba(251,113,133,0.15)' }
const GREY   = 'rgba(255,255,255,0.45)'
const TOTAL  = 22
const GAP_MS = 400

function buildSeq() {
  const seq = [SHAPES[Math.floor(Math.random() * SHAPES.length)]]
  while (seq.length < TOTAL) {
    const prev = seq[seq.length - 1]
    if (Math.random() < 0.38) {
      seq.push(prev)
    } else {
      const opts = SHAPES.filter(x => x !== prev)
      seq.push(opts[Math.floor(Math.random() * opts.length)])
    }
  }
  return seq
}

function ShapeIcon({ type, color, fill }) {
  if (type === 'circle')
    return <svg width="110" height="110" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" stroke={color} strokeWidth="4" fill={fill} /></svg>
  if (type === 'triangle')
    return <svg width="110" height="110" viewBox="0 0 100 100"><polygon points="50,6 94,90 6,90" stroke={color} strokeWidth="4" fill={fill} /></svg>
  if (type === 'square')
    return <svg width="110" height="110" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="8" stroke={color} strokeWidth="4" fill={fill} /></svg>
  // star
  return <svg width="110" height="110" viewBox="0 0 100 100"><polygon points="50,6 61,36 94,36 68,58 78,90 50,70 22,90 32,58 6,36 39,36" stroke={color} strokeWidth="4" fill={fill} /></svg>
}

export default function NBackExercise({ variant, onDone, onAbort }) {
  const isHard  = variant === 'Schwer'
  const showMs  = isHard ? 800 : 1200
  const [current, setCurrent] = useState(null)

  const seqRef      = useRef(buildSeq())
  const idxRef      = useRef(0)
  const tapsRef     = useRef([])
  const startedAt   = useRef(new Date().toISOString())
  const timerRef    = useRef(null)
  const tappedRef   = useRef(false)
  const finishedRef = useRef(false)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const seq     = seqRef.current
    const total   = seq.filter((x, i) => i > 0 && x === seq[i - 1]).length
    const hits    = tapsRef.current.filter(t => t.type === 'hit').length
    const errors  = tapsRef.current.filter(t => t.type === 'false-alarm').length
    const misses  = tapsRef.current.filter(t => t.type === 'miss').length
    const dur     = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'nback', variant, startedAt: startedAt.current, duration: dur,
      score: { hits, errors, misses, total },
      mainMetric: total > 0 ? Math.round((hits / total) * 100) : 0,
      taps: tapsRef.current,
    }))
  }, [variant, onDone])

  function showNext() {
    if (finishedRef.current) return
    if (idxRef.current >= TOTAL) { finish(); return }
    const idx   = idxRef.current
    const shape = seqRef.current[idx]
    const prev  = idx > 0 ? seqRef.current[idx - 1] : null
    const isMatch = shape === prev
    idxRef.current++
    tappedRef.current = false
    setCurrent(shape)
    timerRef.current = setTimeout(() => {
      if (isMatch && !tappedRef.current) {
        tapsRef.current.push({ index: idx, type: 'miss', correct: false, shape, prev })
      }
      setCurrent(null)
      timerRef.current = setTimeout(() => {
        if (idxRef.current >= TOTAL) finish()
        else showNext()
      }, GAP_MS)
    }, showMs)
  }

  useEffect(() => { showNext(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current || current === null || tappedRef.current) return
    tappedRef.current = true
    const idx     = idxRef.current - 1
    const prev    = idx > 0 ? seqRef.current[idx - 1] : null
    const isMatch = seqRef.current[idx] === prev
    tapsRef.current.push({ index: idx, type: isMatch ? 'hit' : 'false-alarm', correct: isMatch, shape: current, prev })
  }, [current])

  const color = current ? (isHard ? GREY : STROKE[current]) : GREY
  const fill  = current ? (isHard ? 'none' : FILL[current]) : 'none'

  return (
    <div className={s.root} onClick={handleTap}>
      <button className={s.closeBtn} onClick={e => { e.stopPropagation(); onAbort() }}>✕</button>
      <div className={s.arena}>
        {current && <ShapeIcon type={current} color={color} fill={fill} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manuell testen**

App → N-Back → Normal starten → farbige Symbole erscheinen nacheinander → bei Wiederholung tippen → Ergebnis zeigt Treffer-Rate %. Schwer: alle Symbole gleich grau.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/kognitiv/exercises/NBackExercise.jsx src/features/tools/kognitiv/exercises/NBackExercise.module.css
git commit -m "feat(kognitiv): add N-Back exercise"
```

---

## Task 4: Task Switching Exercise

**Files:**
- Create: `src/features/tools/kognitiv/exercises/TaskSwitchingExercise.module.css`
- Create: `src/features/tools/kognitiv/exercises/TaskSwitchingExercise.jsx`

- [ ] **Step 1: CSS erstellen**

```css
.root { position:fixed; inset:0; background:#05050e; display:flex; flex-direction:column; align-items:center; justify-content:center; user-select:none; -webkit-tap-highlight-color:transparent; cursor:pointer; }
.closeBtn { position:absolute; top:16px; left:16px; width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,0.04); border:none; color:rgba(255,255,255,0.18); font-size:.75rem; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; }
.arena { flex:1; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.rulePill { display:flex; align-items:center; gap:8px; border-radius:20px; padding:5px 18px; margin-bottom:40px; border:1px solid; font-size:12px; font-weight:700; letter-spacing:1px; }
.ruleDot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.stimulus { font-family:'Outfit',sans-serif; font-size:100px; font-weight:900; line-height:1; }
.switchScreen { position:fixed; inset:0; background:#05050e; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; }
.switchLabel { font-size:22px; font-weight:800; color:#FB7185; letter-spacing:2px; }
.switchCountdown { font-family:'Orbitron',monospace; font-size:80px; font-weight:700; color:#FB7185; }
```

- [ ] **Step 2: JSX erstellen**

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './TaskSwitchingExercise.module.css'

const SYMBOLS   = ['X', 'O']
const COLORS    = ['#8B5CF6', '#14B8A6', '#10B981', '#FB7185']
const PER_PHASE = 30
const STIM_MS   = 1500

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function getRule(p) { return p % 2 === 1 ? 'shape' : 'color' }

export default function TaskSwitchingExercise({ variant, onDone, onAbort }) {
  const numPhases = variant === 'Schwer' ? 3 : 2

  const [phase,       setPhase]       = useState(1)
  const [stim,        setStim]        = useState(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [countdown,   setCountdown]   = useState(null)

  const phaseRef      = useRef(1)
  const phaseCountRef = useRef(0)
  const prevStimRef   = useRef(null)
  const matchRef      = useRef(false)
  const tappedRef     = useRef(false)
  const appearedAt    = useRef(null)
  const tapsRef       = useRef([])
  const startedAt     = useRef(new Date().toISOString())
  const timerRef      = useRef(null)
  const finishedRef   = useRef(false)
  const schedRef      = useRef(null)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits1   = tapsRef.current.filter(t => t.phase === 1 && t.type === 'hit')
    const hits2   = tapsRef.current.filter(t => t.phase === 2 && t.type === 'hit')
    const avg     = arr => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t.reactionMs, 0) / arr.length) : 0
    const cost    = Math.max(0, avg(hits2) - avg(hits1))
    const correct = tapsRef.current.filter(t => t.type === 'hit').length
    const errors  = tapsRef.current.filter(t => t.type !== 'hit').length
    const dur     = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'taskswitching', variant, startedAt: startedAt.current, duration: dur,
      score: { correct, errors, switchErrors: tapsRef.current.filter(t => t.phase === 2 && t.type !== 'hit').length, total: PER_PHASE * numPhases },
      mainMetric: cost, taps: tapsRef.current,
    }))
  }, [variant, onDone, numPhases])

  function doSwitchCountdown(nextPhase, cb) {
    setIsSwitching(true)
    setCountdown(3)
    let n = 3
    const iv = setInterval(() => {
      n--
      if (n <= 0) {
        clearInterval(iv)
        phaseRef.current = nextPhase
        phaseCountRef.current = 0
        prevStimRef.current = null
        setPhase(nextPhase)
        setIsSwitching(false)
        setCountdown(null)
        cb()
      } else {
        setCountdown(n)
      }
    }, 1000)
  }

  function showStim() {
    if (finishedRef.current) return
    if (phaseCountRef.current >= PER_PHASE) {
      const next = phaseRef.current + 1
      if (next > numPhases) { finish(); return }
      const nextLabel = getRule(next) === 'shape' ? 'FORM' : 'FARBE'
      doSwitchCountdown(next, () => schedRef.current())
      return
    }
    const sym     = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    const col     = COLORS[Math.floor(Math.random() * COLORS.length)]
    const newStim = { symbol: sym, color: col }
    const rule    = getRule(phaseRef.current)
    const prev    = prevStimRef.current
    const isMatch = prev ? (rule === 'shape' ? sym === prev.symbol : col === prev.color) : false
    phaseCountRef.current++
    matchRef.current   = isMatch
    tappedRef.current  = false
    appearedAt.current = Date.now()
    setStim(newStim)
    timerRef.current = setTimeout(() => {
      if (isMatch && !tappedRef.current) {
        tapsRef.current.push({ phase: phaseRef.current, type: 'miss', correct: false, reactionMs: null, symbol: sym, color: col })
      }
      prevStimRef.current = newStim
      setStim(null)
      appearedAt.current = null
      timerRef.current = setTimeout(() => schedRef.current(), 100)
    }, STIM_MS)
  }

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(showStim, rand(800, 2000))
  }, [])
  schedRef.current = schedule

  useEffect(() => { schedRef.current(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current || stim === null || tappedRef.current || isSwitching) return
    tappedRef.current = true
    const rt      = Date.now() - appearedAt.current
    const isMatch = matchRef.current
    tapsRef.current.push({
      phase: phaseRef.current, type: isMatch ? 'hit' : 'false-alarm',
      correct: isMatch, reactionMs: rt, symbol: stim.symbol, color: stim.color,
    })
  }, [stim, isSwitching])

  const ruleLabel = phase % 2 === 1 ? 'FORM' : 'FARBE'
  const ruleColor = phase % 2 === 1 ? '#8B5CF6' : '#14B8A6'
  const nextLabel = (phase + 1) % 2 === 1 ? 'FORM' : 'FARBE'

  if (isSwitching) {
    return (
      <div className={s.switchScreen}>
        <div className={s.switchLabel}>JETZT: {nextLabel}</div>
        {countdown !== null && <div key={countdown} className={s.switchCountdown}>{countdown}</div>}
      </div>
    )
  }

  return (
    <div className={s.root} onClick={handleTap}>
      <button className={s.closeBtn} onClick={e => { e.stopPropagation(); onAbort() }}>✕</button>
      <div className={s.arena}>
        <div className={s.rulePill} style={{ color: ruleColor, borderColor: `${ruleColor}55`, background: `${ruleColor}18` }}>
          <div className={s.ruleDot} style={{ background: ruleColor }} />
          {ruleLabel}
        </div>
        {stim && <div className={s.stimulus} style={{ color: stim.color }}>{stim.symbol}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manuell testen**

App → Task Switching → Normal starten → "FORM"-Pill oben, X/O in Farben erscheinen → bei gleicher Form tippen → nach 30 Stimuli: "JETZT: FARBE" + 3-Sekunden-Countdown → Phase 2: "FARBE"-Pill → bei gleicher Farbe tippen → Ergebnis zeigt Switch Cost in ms. Schwer: 3 Phasen (Form → Farbe → Form).

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/kognitiv/exercises/TaskSwitchingExercise.jsx src/features/tools/kognitiv/exercises/TaskSwitchingExercise.module.css
git commit -m "feat(kognitiv): add Task Switching exercise"
```

---

## Task 5: CPT / Vigilanz Exercise

**Files:**
- Create: `src/features/tools/kognitiv/exercises/CptExercise.module.css`
- Create: `src/features/tools/kognitiv/exercises/CptExercise.jsx`

- [ ] **Step 1: CSS erstellen**

```css
.root { position:fixed; inset:0; background:#05050e; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent; }
.closeBtn { position:absolute; top:16px; left:16px; width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,0.04); border:none; color:rgba(255,255,255,0.18); font-size:.75rem; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; }
.arena { flex:1; width:100%; display:flex; align-items:center; justify-content:center; }
.circle { width:110px; height:110px; border-radius:50%; background:rgba(139,92,246,0.15); border:3px solid #8B5CF6; box-shadow:0 0 40px rgba(139,92,246,0.35); }
.xStim { font-family:'Outfit',sans-serif; font-size:96px; font-weight:900; color:rgba(255,255,255,0.45); line-height:1; }
```

- [ ] **Step 2: JSX erstellen**

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './CptExercise.module.css'

const STIM_MS     = 600
const ISI_MIN     = 1000
const ISI_MAX     = 2500
const DURATION_MS = 180_000  // 3 Minuten

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

export default function CptExercise({ variant, onDone, onAbort }) {
  const targetType = variant === 'Schwer' ? 'x' : 'circle'
  const [stim, setStim] = useState(null)  // 'circle' | 'x' | null

  const startTimeRef     = useRef(Date.now())
  const startedAt        = useRef(new Date().toISOString())
  const timerRef         = useRef(null)
  const appearedAt       = useRef(null)
  const currentTypeRef   = useRef(null)
  const currentMinRef    = useRef(1)
  const tappedRef        = useRef(false)
  const tapsRef          = useRef([])
  const targetsPerMin    = useRef({ 1: 0, 2: 0, 3: 0 })
  const finishedRef      = useRef(false)
  const schedRef         = useRef(null)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits  = tapsRef.current.filter(t => t.type === 'hit')
    const miss  = tapsRef.current.filter(t => t.type === 'miss')
    const fa    = tapsRef.current.filter(t => t.type === 'false-alarm')
    const hitsPerMin = m => tapsRef.current.filter(t => t.type === 'hit' && t.minute === m).length
    const acc1  = targetsPerMin.current[1] > 0 ? hitsPerMin(1) / targetsPerMin.current[1] : 1
    const acc3  = targetsPerMin.current[3] > 0 ? hitsPerMin(3) / targetsPerMin.current[3] : acc1
    const decrement = Math.max(0, Math.round((acc1 - acc3) * 100))
    const dur   = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'cpt', variant, startedAt: startedAt.current, duration: dur,
      score: { hits: hits.length, misses: miss.length, falseAlarms: fa.length, total: hits.length + miss.length },
      mainMetric: decrement, taps: tapsRef.current,
    }))
  }, [variant, onDone])

  function showStim() {
    if (finishedRef.current) return
    if (Date.now() - startTimeRef.current >= DURATION_MS) { finish(); return }
    const elapsed = Date.now() - startTimeRef.current
    const minute  = Math.min(3, Math.floor(elapsed / 60000) + 1)
    const type    = Math.random() < 0.7 ? targetType : (targetType === 'circle' ? 'x' : 'circle')
    if (type === targetType) targetsPerMin.current[minute]++
    currentTypeRef.current  = type
    currentMinRef.current   = minute
    tappedRef.current       = false
    appearedAt.current      = Date.now()
    setStim(type)
    timerRef.current = setTimeout(() => {
      if (!tappedRef.current && type === targetType) {
        tapsRef.current.push({ type: 'miss', stimType: type, correct: false, reactionMs: null, minute })
      }
      setStim(null)
      appearedAt.current = null
      timerRef.current = setTimeout(() => schedRef.current(), rand(ISI_MIN, ISI_MAX))
    }, STIM_MS)
  }

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(showStim, rand(ISI_MIN, ISI_MAX))
  }, [])
  schedRef.current = schedule

  useEffect(() => { schedRef.current(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current || stim === null || tappedRef.current) return
    tappedRef.current = true
    const rt      = Date.now() - appearedAt.current
    const correct = currentTypeRef.current === targetType
    tapsRef.current.push({ type: correct ? 'hit' : 'false-alarm', stimType: currentTypeRef.current, correct, reactionMs: rt, minute: currentMinRef.current })
  }, [stim, targetType])

  return (
    <div className={s.root} onClick={handleTap}>
      <button className={s.closeBtn} onClick={e => { e.stopPropagation(); onAbort() }}>✕</button>
      <div className={s.arena}>
        {stim === 'circle' && <div className={s.circle} />}
        {stim === 'x'      && <div className={s.xStim}>✕</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manuell testen**

App → Vigilanz → Normal starten → Kreis (lila) und X (grau) erscheinen abwechselnd → nur bei Kreis tippen → 3 Minuten später Ergebnis mit Vigilanz-Dekrement %. Schwer: nur bei X tippen, Kreis ignorieren.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/kognitiv/exercises/CptExercise.jsx src/features/tools/kognitiv/exercises/CptExercise.module.css
git commit -m "feat(kognitiv): add CPT/Vigilanz exercise"
```

---

## Task 6: Selektive Aufmerksamkeit Exercise

**Files:**
- Create: `src/features/tools/kognitiv/exercises/SelektivExercise.module.css`
- Create: `src/features/tools/kognitiv/exercises/SelektivExercise.jsx`

- [ ] **Step 1: CSS erstellen**

```css
.root { position:fixed; inset:0; background:#05050e; display:flex; flex-direction:column; align-items:center; user-select:none; -webkit-tap-highlight-color:transparent; cursor:pointer; }
.closeBtn { position:absolute; top:16px; left:16px; width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,0.04); border:none; color:rgba(255,255,255,0.18); font-size:.75rem; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; }
.indicator { display:flex; align-items:center; gap:8px; margin-top:56px; border-radius:20px; padding:5px 16px; border:1px solid; font-size:12px; font-weight:600; transition:opacity 0.5s; }
.dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.arena { flex:1; width:100%; display:flex; align-items:center; justify-content:center; }
```

- [ ] **Step 2: JSX erstellen**

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './SelektivExercise.module.css'

const SHAPES     = ['circle', 'triangle', 'square', 'star']
const COLORS     = ['#8B5CF6', '#14B8A6', '#10B981', '#FB7185']
const COLOR_NAME = { '#8B5CF6': 'Lila', '#14B8A6': 'Teal', '#10B981': 'Grün', '#FB7185': 'Rose' }
const STIM_MS    = 600
const ISI_MIN    = 800
const ISI_MAX    = 2000
const DURATION_MS = 180_000
const HIDE_AFTER  = 30_000  // Schwer: Indicator nach 30s ausblenden

function ShapeIcon({ type, color }) {
  const f = `${color}22`
  if (type === 'circle')   return <svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" stroke={color} strokeWidth="4" fill={f} /></svg>
  if (type === 'triangle') return <svg width="100" height="100" viewBox="0 0 100 100"><polygon points="50,6 94,90 6,90" stroke={color} strokeWidth="4" fill={f} /></svg>
  if (type === 'square')   return <svg width="100" height="100" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="8" stroke={color} strokeWidth="4" fill={f} /></svg>
  return <svg width="100" height="100" viewBox="0 0 100 100"><polygon points="50,6 61,36 94,36 68,58 78,90 50,70 22,90 32,58 6,36 39,36" stroke={color} strokeWidth="4" fill={f} /></svg>
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

export default function SelektivExercise({ variant, onDone, onAbort }) {
  const isHard      = variant === 'Schwer'
  const targetColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)])
  const [stim,         setStim]         = useState(null)  // { shape, color }
  const [showIndicator, setShowIndicator] = useState(true)

  const startTimeRef   = useRef(Date.now())
  const startedAt      = useRef(new Date().toISOString())
  const timerRef       = useRef(null)
  const appearedAt     = useRef(null)
  const currentRef     = useRef(null)
  const tappedRef      = useRef(false)
  const tapsRef        = useRef([])
  const targetsRef     = useRef(0)
  const finishedRef    = useRef(false)
  const schedRef       = useRef(null)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits   = tapsRef.current.filter(t => t.type === 'hit').length
    const misses = tapsRef.current.filter(t => t.type === 'miss').length
    const fa     = tapsRef.current.filter(t => t.type === 'false-alarm').length
    const dur    = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'selektiv', variant, startedAt: startedAt.current, duration: dur,
      score: { hits, misses, falseAlarms: fa, total: targetsRef.current },
      mainMetric: targetsRef.current > 0 ? Math.round((hits / targetsRef.current) * 100) : 0,
      taps: tapsRef.current,
    }))
  }, [variant, onDone])

  function showStim() {
    if (finishedRef.current) return
    if (Date.now() - startTimeRef.current >= DURATION_MS) { finish(); return }
    if (isHard && Date.now() - startTimeRef.current >= HIDE_AFTER) setShowIndicator(false)
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const isTarget = color === targetColor.current
    if (isTarget) targetsRef.current++
    currentRef.current = { shape, color, isTarget }
    tappedRef.current  = false
    appearedAt.current = Date.now()
    setStim({ shape, color })
    timerRef.current = setTimeout(() => {
      if (!tappedRef.current && isTarget) {
        tapsRef.current.push({ type: 'miss', color, shape, correct: false, reactionMs: null })
      }
      setStim(null)
      appearedAt.current = null
      timerRef.current = setTimeout(() => schedRef.current(), rand(ISI_MIN, ISI_MAX))
    }, STIM_MS)
  }

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(showStim, rand(ISI_MIN, ISI_MAX))
  }, [isHard])
  schedRef.current = schedule

  useEffect(() => { schedRef.current(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current || stim === null || tappedRef.current) return
    tappedRef.current = true
    const rt      = Date.now() - appearedAt.current
    const correct = currentRef.current.isTarget
    tapsRef.current.push({ type: correct ? 'hit' : 'false-alarm', color: stim.color, shape: stim.shape, correct, reactionMs: rt })
  }, [stim])

  const tc = targetColor.current

  return (
    <div className={s.root} onClick={handleTap}>
      <button className={s.closeBtn} onClick={e => { e.stopPropagation(); onAbort() }}>✕</button>
      <div className={s.indicator} style={{ opacity: showIndicator ? 1 : 0, color: tc, borderColor: `${tc}55`, background: `${tc}18` }}>
        <div className={s.dot} style={{ background: tc }} />
        Ziel: {COLOR_NAME[tc]}
      </div>
      <div className={s.arena}>
        {stim && <ShapeIcon type={stim.shape} color={stim.color} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manuell testen**

App → Selektive Aufmerksamkeit → Normal starten → Zielfarbe-Pill erscheint oben (z.B. "Ziel: Lila") → farbige Symbole blitzen auf → nur bei Lila tippen → 3 Minuten → Ergebnis mit Treffer-Rate %. Schwer: nach 30s verschwindet die Pill.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/kognitiv/exercises/SelektivExercise.jsx src/features/tools/kognitiv/exercises/SelektivExercise.module.css
git commit -m "feat(kognitiv): add Selektive Aufmerksamkeit exercise"
```

---

## Task 7: Geteilte Aufmerksamkeit Exercise

**Files:**
- Create: `src/features/tools/kognitiv/exercises/GeteilteExercise.module.css`
- Create: `src/features/tools/kognitiv/exercises/GeteilteExercise.jsx`

- [ ] **Step 1: CSS erstellen**

```css
.root { position:fixed; inset:0; background:#05050e; display:flex; flex-direction:column; align-items:center; justify-content:center; user-select:none; -webkit-tap-highlight-color:transparent; cursor:pointer; }
.closeBtn { position:absolute; top:16px; left:16px; width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,0.04); border:none; color:rgba(255,255,255,0.18); font-size:.75rem; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; }
.arena { display:flex; flex-direction:column; align-items:center; gap:48px; }
.circles { display:flex; gap:16px; align-items:center; }
.circle { width:52px; height:52px; border-radius:50%; border:2.5px solid rgba(255,255,255,0.2); transition:background 0.08s, border-color 0.08s, box-shadow 0.08s; }
.circleClosed { border-color:#8B5CF6; background:rgba(139,92,246,0.25); box-shadow:0 0 18px rgba(139,92,246,0.5); }
.toneLabel { font-size:11px; font-weight:600; letter-spacing:1px; color:rgba(255,255,255,0.2); text-transform:uppercase; }
.toneActive { color:#14B8A6; }
```

- [ ] **Step 2: JSX erstellen**

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './GeteilteExercise.module.css'

const NUM_CIRCLES  = 5
const DURATION_MS  = 180_000  // 3 Minuten
const TAP_WINDOW   = 600      // ms nach Beat-Start zum Tippen

// Beat intervals
const BEAT_NORMAL = 1200
const BEAT_SCHWER = 800

// Audio frequencies
const FREQ_HIGH = 880
const FREQ_LOW  = 330

function playTone(ctx, freq) {
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') ctx.resume()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {}
}

export default function GeteilteExercise({ variant, onDone, onAbort }) {
  const beatMs   = variant === 'Schwer' ? BEAT_SCHWER : BEAT_NORMAL

  const [circles, setCircles]   = useState(Array(NUM_CIRCLES).fill(false))
  const [toneLabel, setToneLabel] = useState(null)   // 'HOCH' | 'TIEF' | null

  const startTimeRef  = useRef(Date.now())
  const startedAt     = useRef(new Date().toISOString())
  const beatTimerRef  = useRef(null)
  const tapWindowRef  = useRef(null)
  const audioCtxRef   = useRef(null)
  const lastToneRef   = useRef(null)     // 'high' | 'low'
  const beatDataRef   = useRef(null)     // { visualTarget, audioTarget }
  const tappedRef     = useRef(false)
  const tapsRef       = useRef([])
  const finishedRef   = useRef(false)

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)() } catch {}
    }
    return audioCtxRef.current
  }, [])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(beatTimerRef.current)
    clearTimeout(tapWindowRef.current)
    const vHits = tapsRef.current.filter(t => t.triggerVisual && t.correct).length
    const aHits = tapsRef.current.filter(t => t.triggerAudio && t.correct).length
    const errors = tapsRef.current.filter(t => !t.correct).length
    const misses = tapsRef.current.filter(t => t.type === 'miss').length
    const total  = tapsRef.current.filter(t => t.type !== 'false-alarm').length
    const allCorrect = vHits + aHits
    const dur    = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'geteilt', variant, startedAt: startedAt.current, duration: dur,
      score: { visualHits: vHits, audioHits: aHits, errors, misses, total },
      mainMetric: total > 0 ? Math.round((allCorrect / total) * 100) : 0,
      taps: tapsRef.current,
    }))
  }, [variant, onDone])

  const tick = useCallback(() => {
    if (finishedRef.current) return
    if (Date.now() - startTimeRef.current >= DURATION_MS) { finish(); return }

    // Generate new circle states: each circle ~20% chance closed, aim for ~1-2 closed per beat
    const newCircles = Array(NUM_CIRCLES).fill(false).map(() => Math.random() < 0.22)
    const visualTarget = newCircles.some(c => c)

    // Generate tone: alternate with 25% repeat chance
    const prev = lastToneRef.current
    let tone
    if (!prev) {
      tone = Math.random() < 0.5 ? 'high' : 'low'
    } else {
      tone = Math.random() < 0.25 ? prev : (prev === 'high' ? 'low' : 'high')
    }
    const audioTarget = tone === prev && prev !== null
    lastToneRef.current = tone

    beatDataRef.current = { visualTarget, audioTarget }
    tappedRef.current   = false
    setCircles(newCircles)
    setToneLabel(tone === 'high' ? 'HOCH' : 'TIEF')
    playTone(getCtx(), tone === 'high' ? FREQ_HIGH : FREQ_LOW)

    // If this beat is a target, open tap window
    if (visualTarget || audioTarget) {
      tapWindowRef.current = setTimeout(() => {
        if (!tappedRef.current) {
          tapsRef.current.push({
            type: 'miss', correct: false, triggerVisual: visualTarget, triggerAudio: audioTarget, reactionMs: null,
          })
        }
        setToneLabel(null)
      }, TAP_WINDOW)
    } else {
      setTimeout(() => setToneLabel(null), TAP_WINDOW)
    }

    beatTimerRef.current = setTimeout(tick, beatMs)
  }, [beatMs, getCtx, finish])

  useEffect(() => {
    beatTimerRef.current = setTimeout(tick, beatMs)
    return () => {
      clearTimeout(beatTimerRef.current)
      clearTimeout(tapWindowRef.current)
    }
  }, [tick, beatMs])

  const handleTap = useCallback(() => {
    if (finishedRef.current) return
    // Resume audio on first tap (iOS unlock)
    const ctx = getCtx()
    if (ctx?.state === 'suspended') ctx.resume()

    const bd = beatDataRef.current
    if (!bd) {
      tapsRef.current.push({ type: 'false-alarm', correct: false, triggerVisual: false, triggerAudio: false, reactionMs: null })
      return
    }
    if (tappedRef.current) return
    tappedRef.current = true
    const isTarget = bd.visualTarget || bd.audioTarget
    tapsRef.current.push({
      type: isTarget ? 'hit' : 'false-alarm',
      correct: isTarget,
      triggerVisual: bd.visualTarget,
      triggerAudio: bd.audioTarget,
      reactionMs: null,
    })
  }, [getCtx])

  return (
    <div className={s.root} onClick={handleTap}>
      <button className={s.closeBtn} onClick={e => { e.stopPropagation(); onAbort() }}>✕</button>
      <div className={s.arena}>
        <div className={s.circles}>
          {circles.map((closed, i) => (
            <div key={i} className={[s.circle, closed ? s.circleClosed : ''].join(' ')} />
          ))}
        </div>
        <div className={[s.toneLabel, toneLabel ? s.toneActive : ''].join(' ')}>
          {toneLabel ?? '· · ·'}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manuell testen**

App → Geteilte Aufmerksamkeit → Normal starten → 5 Kreise im Takt, einer leuchtet manchmal lila auf + Töne → tippen wenn Kreis leuchtet ODER Ton sich wiederholt → 3 Minuten → Ergebnis mit visuellen und auditiven Treffern getrennt. Schwer: schnellerer Takt.

iOS-Hinweis: Erster Tap entsperrt Audio, erste Töne können silent sein.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/kognitiv/exercises/GeteilteExercise.jsx src/features/tools/kognitiv/exercises/GeteilteExercise.module.css
git commit -m "feat(kognitiv): add Geteilte Aufmerksamkeit exercise"
```

---

## Self-Review Checkliste

- [x] **Spec coverage:** Alle 6 Module aus Spec sind implementiert. Go/No-Go ✓ N-Back ✓ Task Switching ✓ CPT/Vigilanz ✓ Selektiv ✓ Geteilt ✓. Schwer-Varianten aller Module vorhanden.
- [x] **Keine Placeholders:** Alle Steps haben vollständigen Code. Kein TBD.
- [x] **Type-Konsistenz:** `createSession` immer mit identischer Signatur aufgerufen. `moduleId` Strings stimmen mit `moduleConfig.js` überein: `gonogo`, `nback`, `taskswitching`, `cpt`, `selektiv`, `geteilt`.
- [x] **CSS-Klassen:** Alle in JSX genutzten CSS-Klassen sind in den Module-CSS-Dateien definiert.
- [x] **Props-Interface:** Alle Exercises nutzen `{ variant, onDone, onAbort }` — konsistent mit AlertnessExercise.
- [x] **Audio unlock:** GeteilteExercise erstellt AudioContext lazy und resumed bei erstem Tap.
