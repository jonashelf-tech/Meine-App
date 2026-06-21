# Growth — Geführter Fluss · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Growth-Tagesansicht von einem „Alles-auf-einmal"-Stapel in einen geführten Ein-Screen-nach-dem-anderen-Fluss mit „Tiefe"-Übergängen, belohnendem Abschluss und einer Übersicht als Ruhezustand umbauen.

**Architecture:** `TabGrowth` wird ein dünner Router (`briefing | settings | flow | overview`). Der Fluss ist eine kleine React-State-Machine (`GrowthFlow`) über einem CSS-Transition-Container (`FlowStepper`). Reine Logik (View-Mode, Step-Liste, neues `flowAbgeschlossen`-Flag) liegt getestet im Store. Check-in bleibt im geteilten `dailyState`-Store.

**Tech Stack:** React 19, Vite, Zustand (App-Store, hier kaum berührt), CSS Modules, Vitest. Keine externen Animations-Libs — CSS-Keyframes + State-Machine.

**Referenz-Spec:** `docs/superpowers/specs/2026-06-21-growth-gefuehrter-fluss-design.md`

**Globale Constraints (in jedem Task einhalten):**
- CSS: nur `var(--…)` aus `styles/vars.css`, **keine** rohen Hex-Werte; `var(--font)`/`var(--font-num)`. (Guard: `src/styleguide.test.js`.)
- Icons: SVG inline, **keine** Emojis als strukturelle Icons (Haken, Pfeile als SVG).
- Touch-Targets ≥ 44px für Primäraktionen.
- `prefers-reduced-motion`: globale Regel in `vars.css` setzt Dauer ≈ 0 — Logik darf **nie** allein auf `animationend` warten (immer Timeout-Fallback).
- Daten nur über `growthStore`/`dailyState`-Helfer; additive, sync-sichere Änderungen.
- Branch: `feat/growth-gefuehrter-fluss` (existiert bereits).

---

## Dateienübersicht

**Neu**
- `src/features/tools/growth/growthFlow.js` — pure: `growthViewMode`, `flowSteps`
- `src/features/tools/growth/growthFlow.test.js` — Tests dazu
- `src/features/tools/growth/FlowStepper.jsx` + `.module.css` — „Tiefe"-Transition-Container
- `src/features/tools/growth/BreathingCircle.jsx` + `.module.css` — Atemkreis + 2-Min-Ring + Breath-Label
- `src/features/tools/growth/StepAnkommen.jsx` + `.module.css`
- `src/features/tools/growth/StepKarte.jsx` + `.module.css`
- `src/features/tools/growth/StepBonusFrage.jsx` + `.module.css`
- `src/features/tools/growth/StepFreitext.jsx` + `.module.css`
- `src/features/tools/growth/StepAbschluss.jsx` + `.module.css`
- `src/features/tools/growth/GrowthFlow.jsx` + `.module.css`
- `src/features/tools/growth/GrowthOverview.jsx` + `.module.css`

**Geändert**
- `src/features/tools/growth/growthStore.js` — `markFlowAbgeschlossen` + Flag
- `src/features/tools/growth/growthStore.test.js` — Tests fürs Flag
- `src/features/tools/growth/TabGrowth.jsx` — Router
- `src/features/tools/growth/DailyStateRow.jsx` + `.module.css` — Dot-Pop-Mikroanimation, optionaler `compact`-Look
- `src/features/tools/growth/GrowthArchiv.jsx` — (nur falls Restyle nötig; sonst unverändert eingebettet)
- `kontext/architektur.md`, evtl. `kontext/tool-pattern.md` — Doku

**Entfernt** (nach Importer-Check; aktuell nur `TabGrowth` importiert)
- `src/features/tools/growth/GrowthOpener.jsx` + `.module.css`

---

## Task 1: `flowAbgeschlossen`-Flag im Store

**Files:**
- Modify: `src/features/tools/growth/growthStore.js`
- Test: `src/features/tools/growth/growthStore.test.js`

- [ ] **Step 1: Failing test**

In `growthStore.test.js` ergänzen (Imports oben um `markFlowAbgeschlossen` erweitern):

```js
import { emptyDay, markFlowAbgeschlossen } from './growthStore'

describe('markFlowAbgeschlossen', () => {
  it('setzt das Flag und legt den Tag bei Bedarf an', () => {
    const data = { days: {}, settings: {} }
    const next = markFlowAbgeschlossen(data, '2026-06-21')
    expect(next.days['2026-06-21'].flowAbgeschlossen).toBe(true)
  })

  it('lässt bestehende Tagesdaten unangetastet', () => {
    const data = { days: { '2026-06-21': { ...emptyDay(), freitext: 'hallo' } }, settings: {} }
    const next = markFlowAbgeschlossen(data, '2026-06-21')
    expect(next.days['2026-06-21'].freitext).toBe('hallo')
    expect(next.days['2026-06-21'].flowAbgeschlossen).toBe(true)
  })
})
```

- [ ] **Step 2: Run — verify fail**

Run: `npx vitest run src/features/tools/growth/growthStore.test.js`
Expected: FAIL (`markFlowAbgeschlossen is not a function`).

- [ ] **Step 3: Implement**

In `growthStore.js` nach `setTimerKarte` einfügen:

```js
// Flow für diesen Tag abgeschlossen/übersprungen → Re-Entry zeigt Übersicht.
export function markFlowAbgeschlossen(data, date) {
  const day = { ...emptyDay(), ...(data.days[date] ?? {}), flowAbgeschlossen: true }
  return { ...data, days: { ...data.days, [date]: day } }
}
```

`emptyDay()` zusätzlich um das Feld ergänzen (Default `false`):

```js
export function emptyDay() {
  return { tageskarteId: null, skipVerwendet: false, karten: [], freitext: '', stateTouched: false, timerKarteId: null, flowAbgeschlossen: false }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npx vitest run src/features/tools/growth/growthStore.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/growth/growthStore.js src/features/tools/growth/growthStore.test.js
git commit -m "feat(growth): flowAbgeschlossen-Flag im Store"
```

---

## Task 2: Pure View-Mode + Step-Liste (`growthFlow.js`)

**Files:**
- Create: `src/features/tools/growth/growthFlow.js`
- Test: `src/features/tools/growth/growthFlow.test.js`

> **Sonnet-delegierbar** (klare Signaturen, reine Funktionen, eigene Dateien).

- [ ] **Step 1: Failing test**

`growthFlow.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { growthViewMode, flowSteps } from './growthFlow'
import { emptyDay } from './growthStore'

const T = '2026-06-21'

describe('growthViewMode', () => {
  it('frischer heutiger Tag (kein Eintrag, kein Flag) → flow', () => {
    const data = { days: { [T]: { ...emptyDay(), tageskarteId: 'MK01', karten: [{ kartenId: 'MK01', antwort: '', erledigt: false }] } } }
    expect(growthViewMode(data, T, T)).toBe('flow')
  })

  it('heutiger Tag mit Eintrag → overview', () => {
    const data = { days: { [T]: { ...emptyDay(), freitext: 'x' } } }
    expect(growthViewMode(data, T, T)).toBe('overview')
  })

  it('heutiger Tag mit flowAbgeschlossen → overview', () => {
    const data = { days: { [T]: { ...emptyDay(), flowAbgeschlossen: true } } }
    expect(growthViewMode(data, T, T)).toBe('overview')
  })

  it('vergangener Tag → overview', () => {
    const data = { days: {} }
    expect(growthViewMode(data, '2026-06-19', T)).toBe('overview')
  })
})

describe('flowSteps', () => {
  it('mit Tageskarte → ankommen, karte, freitext', () => {
    const data = { days: { [T]: { ...emptyDay(), tageskarteId: 'MK01' } } }
    expect(flowSteps(data, T)).toEqual(['ankommen', 'karte', 'freitext'])
  })

  it('ohne Tageskarte (Pool leer) → ankommen, freitext', () => {
    const data = { days: { [T]: { ...emptyDay() } } }
    expect(flowSteps(data, T)).toEqual(['ankommen', 'freitext'])
  })
})
```

- [ ] **Step 2: Run — verify fail**

Run: `npx vitest run src/features/tools/growth/growthFlow.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`growthFlow.js`:

```js
// Reine Sicht-/Ablauf-Logik des Growth-Flows (getestet, ohne React).
import { dayHasEntry } from './growthStore'

// Beim Öffnen: frischer heutiger Tag → geführter Fluss, sonst Übersicht.
export function growthViewMode(data, viewDate, today) {
  if (viewDate !== today) return 'overview'
  const day = data.days?.[viewDate]
  if (day?.flowAbgeschlossen || dayHasEntry(day)) return 'overview'
  return 'flow'
}

// Basis-Schrittfolge. Bonus wird zur Laufzeit eingeschoben (nutzerabhängig),
// taucht hier nicht auf. „ankommen" enthält den Check-in und ist immer dabei.
export function flowSteps(data, viewDate) {
  const day = data.days?.[viewDate]
  const steps = ['ankommen']
  if (day?.tageskarteId) steps.push('karte')
  steps.push('freitext')
  return steps
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npx vitest run src/features/tools/growth/growthFlow.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/growth/growthFlow.js src/features/tools/growth/growthFlow.test.js
git commit -m "feat(growth): pure growthViewMode + flowSteps"
```

---

## Task 3: `FlowStepper` — „Tiefe"-Übergang

**Files:**
- Create: `src/features/tools/growth/FlowStepper.jsx`, `FlowStepper.module.css`

Kontrakt: `<FlowStepper stepKey={string} direction={'forward'|'back'}>{children}</FlowStepper>`. Bei Wechsel von `stepKey` rendert er kurz den alten Inhalt (`.leaving`) und den neuen (`.entering`) gleichzeitig, dann committet er. `reduced-motion`-sicher via Timeout.

- [ ] **Step 1: Implement Komponente**

`FlowStepper.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react'
import s from './FlowStepper.module.css'

const DUR = 420 // muss zur CSS-Dauer passen; Timeout-Fallback für reduced-motion

export default function FlowStepper({ stepKey, direction = 'forward', children }) {
  const [shown, setShown] = useState({ key: stepKey, node: children })
  const [leaving, setLeaving] = useState(null) // { key, node, direction }
  const timer = useRef(null)

  useEffect(() => {
    if (stepKey === shown.key) { setShown({ key: stepKey, node: children }); return }
    setLeaving({ ...shown, direction })
    setShown({ key: stepKey, node: children })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLeaving(null), DUR)
    return () => clearTimeout(timer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, children])

  return (
    <div className={s.stage}>
      {leaving && (
        <div key={leaving.key} className={[s.layer, s.leaving, leaving.direction === 'back' ? s.back : ''].join(' ')}>
          {leaving.node}
        </div>
      )}
      <div key={shown.key} className={[s.layer, s.entering, direction === 'back' ? s.back : ''].join(' ')}>
        {shown.node}
      </div>
    </div>
  )
}
```

`FlowStepper.module.css`:

```css
.stage { position: relative; flex: 1; min-height: 0; display: flex; }
.layer { position: absolute; inset: 0; display: flex; flex-direction: column; }
.entering { animation: stepIn var(--g-step-dur, 420ms) cubic-bezier(.34,1.3,.5,1) both; }
.leaving  { animation: stepOut var(--g-step-dur, 420ms) cubic-bezier(.34,1.3,.5,1) both; pointer-events: none; }
@keyframes stepIn  { from { opacity: 0; transform: translateY(46px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes stepOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(.86) translateY(-12px); } }
.back.entering { animation-name: stepInBack; }
.back.leaving  { animation-name: stepOutBack; }
@keyframes stepInBack  { from { opacity: 0; transform: scale(.86) translateY(-12px); } to { opacity: 1; transform: none; } }
@keyframes stepOutBack { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(46px) scale(.98); } }
```

(`prefers-reduced-motion` → globale Regel macht die Dauer ≈ 0; der `setTimeout(…, 420)` räumt `leaving` trotzdem zuverlässig ab.)

- [ ] **Step 2: Verify (smoke)**

Wird in Task 10 im Fluss live geprüft. Kein Unit-Test (rein visuell/timing).

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/growth/FlowStepper.jsx src/features/tools/growth/FlowStepper.module.css
git commit -m "feat(growth): FlowStepper Tiefe-Übergang"
```

---

## Task 4: `BreathingCircle`

**Files:**
- Create: `src/features/tools/growth/BreathingCircle.jsx`, `BreathingCircle.module.css`

> **Sonnet-delegierbar** (isolierte Präsentations-Komponente, klarer Kontrakt).

Kontrakt: `<BreathingCircle aktiv dauerSek={120} onFertig={fn} />`. Animierter Atemkreis (4 s ein / 6 s aus = 10 s/Zyklus), SVG-Fortschrittsring über `dauerSek`, Breath-Label („Einatmen…/Ausatmen…") per Crossfade. Läuft `dauerSek` ab → `onFertig()` (einmalig). Kein Gate: Parent zeigt trotzdem „Weiter".

- [ ] **Step 1: Implement**

`BreathingCircle.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react'
import s from './BreathingCircle.module.css'

const ZYKLUS_MS = 10000

export default function BreathingCircle({ aktiv = true, dauerSek = 120, onFertig }) {
  const [progress, setProgress] = useState(0) // 0..1 über dauerSek
  const start = useRef(Date.now())
  const fertigRef = useRef(onFertig)
  fertigRef.current = onFertig

  useEffect(() => {
    if (!aktiv) return
    start.current = Date.now()
    let raf
    const tick = () => {
      const p = Math.min(1, (Date.now() - start.current) / (dauerSek * 1000))
      setProgress(p)
      if (p >= 1) { fertigRef.current?.(); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [aktiv, dauerSek])

  const R = 64, C = 2 * Math.PI * R
  const rest = Math.max(0, dauerSek - Math.round(progress * dauerSek))
  const mm = Math.floor(rest / 60), ss = String(rest % 60).padStart(2, '0')

  return (
    <div className={s.wrap}>
      <div className={s.ringWrap}>
        <svg className={s.ring} width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={R} className={s.ringBg} />
          <circle cx="70" cy="70" r={R} className={s.ringFg}
            style={{ strokeDasharray: C, strokeDashoffset: C * (1 - progress) }} />
        </svg>
        <div className={s.disc} />
        <div className={s.label}>
          <span className={s.labelIn}>Einatmen…</span>
          <span className={s.labelOut}>Ausatmen…</span>
        </div>
      </div>
      <div className={s.timer}>{mm}:{ss}</div>
    </div>
  )
}
```

`BreathingCircle.module.css`:

```css
.wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ringWrap { position: relative; width: 140px; height: 140px; }
.ring { position: absolute; inset: 0; transform: rotate(-90deg); }
.ringBg { fill: none; stroke: var(--border); stroke-width: 3; }
.ringFg { fill: none; stroke: var(--tool-color); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 0.2s linear; }
.disc { position: absolute; inset: 18px; border-radius: 50%; border: 2px solid var(--tool-color);
  background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--tool-color) 45%, transparent), transparent 70%);
  box-shadow: 0 0 30px color-mix(in srgb, var(--tool-color) 35%, transparent);
  animation: gBreathe 10s ease-in-out infinite; }
@keyframes gBreathe { 0% { transform: scale(.62); } 40% { transform: scale(1); } 100% { transform: scale(.62); } }
.label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.label span { position: absolute; font-size: 0.78rem; color: var(--text-dim); font-family: var(--font); }
.labelIn  { animation: gLabIn  10s ease-in-out infinite; }
.labelOut { animation: gLabOut 10s ease-in-out infinite; }
@keyframes gLabIn  { 0%{opacity:0;} 12%,38%{opacity:1;} 46%,100%{opacity:0;} }
@keyframes gLabOut { 0%,50%{opacity:0;} 60%,92%{opacity:1;} 100%{opacity:0;} }
.timer { font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-num); }
@media (prefers-reduced-motion: reduce) {
  .disc { animation: none; transform: scale(.85); }
  .labelIn, .labelOut { animation: none; }
  .labelOut { opacity: 0; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/tools/growth/BreathingCircle.jsx src/features/tools/growth/BreathingCircle.module.css
git commit -m "feat(growth): BreathingCircle (Atemkreis + 2-Min-Ring)"
```

---

## Task 5: `DailyStateRow` — Dot-Pop + `compact`-Look

**Files:**
- Modify: `src/features/tools/growth/DailyStateRow.jsx`, `DailyStateRow.module.css`

- [ ] **Step 1: Pop-Animation beim Setzen**

In `DailyStateRow.jsx` den gesetzten Dot kurz markieren. `setField` erweitern:

```jsx
const [popped, setPopped] = useState(null) // `${key}-${n}`
const setField = (key, val) => {
  if (!editable) return
  setState(setDayState(date, { [key]: val }))
  onTouched?.()
  const id = `${key}-${val}`
  setPopped(id)
  setTimeout(() => setPopped(p => (p === id ? null : p)), 260)
}
```

Im Button-`className` ergänzen: `popped === \`${key}-${n}\` ? s.pop : ''`.

- [ ] **Step 2: CSS Pop**

In `DailyStateRow.module.css` ergänzen:

```css
.pop { animation: dsPop 260ms ease-out; }
@keyframes dsPop { 0%{transform:scale(1);} 45%{transform:scale(1.28); box-shadow:0 0 8px var(--tool-color);} 100%{transform:scale(1);} }
@media (prefers-reduced-motion: reduce) { .pop { animation: none; } }
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/styleguide.test.js` (stellt sicher: keine rohen Hex/Font-Verstöße).
Expected: PASS. Visuelle Prüfung später im Fluss.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/growth/DailyStateRow.jsx src/features/tools/growth/DailyStateRow.module.css
git commit -m "feat(growth): DailyStateRow Dot-Pop-Mikroanimation"
```

---

## Task 6: `StepAnkommen`

**Files:**
- Create: `src/features/tools/growth/StepAnkommen.jsx`, `StepAnkommen.module.css`

Kontrakt: `<StepAnkommen date settings opener onStateTouched onWeiter onSkip />`.
`opener` = `openerForDate(date)` (Worte). Atemkreis nur wenn `settings.openerAn`.

- [ ] **Step 1: Implement**

`StepAnkommen.jsx`:

```jsx
import BreathingCircle from './BreathingCircle'
import DailyStateRow from './DailyStateRow'
import s from './StepAnkommen.module.css'

export default function StepAnkommen({ date, settings, opener, onStateTouched, onWeiter, onSkip }) {
  return (
    <div className={s.step}>
      <button className={s.skip} onClick={onSkip}>Überspringen</button>
      <div className={s.top}>
        {settings.openerAn && <BreathingCircle aktiv dauerSek={120} onFertig={onWeiter} />}
        <div className={s.eyebrow}>Ankommen</div>
        {settings.openerAn && opener?.anleitung && <div className={s.opener}>{opener.anleitung}</div>}
      </div>
      <div className={s.checkTitle}>Wie geht's dir gerade?</div>
      <DailyStateRow date={date} editable onTouched={onStateTouched} />
      <button className={s.cta} onClick={onWeiter}>Weiter</button>
    </div>
  )
}
```

`StepAnkommen.module.css`:

```css
.step { flex: 1; display: flex; flex-direction: column; gap: 14px; padding: 8px 2px; }
.skip { position: absolute; top: 0; right: 0; border: none; background: none; color: var(--text-dim); font-size: 0.78rem; font-family: var(--font); cursor: pointer; padding: 6px; min-height: 36px; z-index: 2; }
.top { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 8px; animation: fadeInUp .4s ease both; }
.eyebrow { font-size: 0.66rem; letter-spacing: .14em; text-transform: uppercase; color: var(--tool-color); font-weight: 600; }
.opener { font-size: 0.85rem; color: var(--text-dim); text-align: center; line-height: 1.5; max-width: 280px; }
.checkTitle { font-size: 0.9rem; color: var(--text); text-align: center; margin-top: auto; animation: fadeInUp .4s ease .06s both; }
.cta { align-self: stretch; min-height: 48px; border: none; border-radius: var(--r); background: var(--tool-color); color: #fff; font-size: 0.95rem; font-weight: 600; font-family: var(--font); cursor: pointer; box-shadow: var(--shadow-md); animation: fadeInUp .4s ease .12s both; }
.cta:active { transform: scale(.97); }
```
(`#fff` ist hier zulässig — Button-Text auf farbiger Fläche; falls der Styleguide-Test rohe Hex flaggt, `var(--text)` bzw. eine vorhandene On-Color-Variable verwenden.)

> **Hinweis Styleguide-Guard:** Falls `#fff` im Test als roher Hex anschlägt, projektvorhandene Lösung übernehmen (z. B. wie andere Tool-CTAs Buttontext setzen — vor dem Schreiben `grep` auf bestehende `.cta`/Primärbuttons in `src/features/tools/**/*.module.css`).

- [ ] **Step 2: Commit**

```bash
git add src/features/tools/growth/StepAnkommen.jsx src/features/tools/growth/StepAnkommen.module.css
git commit -m "feat(growth): StepAnkommen (Atem + Check-in)"
```

---

## Task 7: `StepKarte`

**Files:**
- Create: `src/features/tools/growth/StepKarte.jsx`, `StepKarte.module.css`

Kontrakt: `<StepKarte eintrag date editable istTageskarte skipMoeglich onPatch onSkip onStartTimer onWeiter />` — gleiche Datenpunkte wie das alte `TageskarteCard`, aber als fokussierter Vollbild-Step mit Stagger. Antwort via `useAutosave` → `onPatch({ antwort })`. „Warum?", Timer, Erledigt wie gehabt.

- [ ] **Step 1: Implement** (Logik 1:1 aus `TageskarteCard.jsx` übernehmen, Layout = Step)

```jsx
import { useState } from 'react'
import { karteById, KATEGORIEN } from './growthStore'
import { useAutosave } from './useAutosave'
import s from './StepKarte.module.css'

export default function StepKarte({ eintrag, date, editable, istTageskarte, skipMoeglich, onPatch, onSkip, onStartTimer, onWeiter }) {
  const karte = karteById(eintrag.kartenId)
  const [warumOffen, setWarumOffen] = useState(false)
  const [antwort, onAntwort] = useAutosave(eintrag.antwort ?? '', (t) => onPatch({ antwort: t }), [date, eintrag.kartenId])
  if (!karte) return null
  const kategorie = KATEGORIEN.find(k => k.id === karte.kategorie)

  return (
    <div className={s.step}>
      <div className={s.head}>
        <span className={s.eyebrow}>{kategorie?.name}{!istTageskarte && ' · Bonus'}</span>
        {skipMoeglich && <button className={s.skip} onClick={onSkip}>Andere Karte</button>}
      </div>
      <div className={s.text}>{karte.text}</div>
      {karte.warum && (
        <div className={s.warumWrap}>
          <button className={s.warumLink} onClick={() => setWarumOffen(v => !v)}>Warum diese Frage?</button>
          {warumOffen && <div className={s.warumText}>{karte.warum}</div>}
        </div>
      )}
      {karte.typ === 'timer-aufgabe' && editable && !eintrag.erledigt && (
        <button className={s.timerBtn} onClick={() => onStartTimer(karte)}>▶ {karte.timer} min starten</button>
      )}
      {(karte.typ === 'aufgabe' || karte.typ === 'timer-aufgabe') && (
        <button className={[s.erledigtBtn, eintrag.erledigt ? s.erledigtOn : ''].join(' ')}
          onClick={() => editable && onPatch({ erledigt: !eintrag.erledigt })} disabled={!editable}>
          {eintrag.erledigt ? '✓ Erledigt' : 'Erledigt'}
        </button>
      )}
      <textarea className={s.antwort} value={antwort} onChange={e => onAntwort(e.target.value)}
        placeholder="Ein Satz reicht." rows={3} disabled={!editable} />
      <button className={s.cta} onClick={onWeiter}>Weiter</button>
    </div>
  )
}
```

`StepKarte.module.css`: Step-Container (`flex:1; display:flex; flex-direction:column; gap:12px;`), Stagger via `animation: fadeInUp .4s ease both` mit gestaffeltem `animation-delay` für `.text` (0), `.antwort` (.06s), `.cta` (.12s). Restliche Klassen (`.eyebrow`, `.text`, `.warum*`, `.timerBtn`, `.erledigtBtn`, `.antwort`, `.skip`, `.cta`) optisch aus `TageskarteCard.module.css` übernehmen, nur größer/zentrierter. Erledigt-On: `var(--emerald)`; `.cta`: `var(--tool-color)`. Done-/Pfeil-Icons als SVG statt `▶`/`✓` (siehe globale Constraints) — `▶`/`✓` hier nur als Kürzel im Plan.

- [ ] **Step 2: Commit**

```bash
git add src/features/tools/growth/StepKarte.jsx src/features/tools/growth/StepKarte.module.css
git commit -m "feat(growth): StepKarte (fokussierte Tageskarte)"
```

---

## Task 8: `StepBonusFrage` + `StepFreitext`

**Files:**
- Create: `StepBonusFrage.jsx`/`.module.css`, `StepFreitext.jsx`/`.module.css`

> **Sonnet-delegierbar** (kleine, klar umrissene Präsentations-Steps).

- [ ] **Step 1: `StepBonusFrage`**

```jsx
import s from './StepBonusFrage.module.css'
export default function StepBonusFrage({ canDraw, onJa, onNein }) {
  return (
    <div className={s.step}>
      <div className={s.title}>Magst du noch eine Karte ziehen?</div>
      <div className={s.actions}>
        <button className={s.ja} onClick={onJa} disabled={!canDraw}>Ja, eine</button>
        <button className={s.nein} onClick={onNein}>Nein, weiter</button>
      </div>
      {!canDraw && <div className={s.hint}>Für heute genug Karten gezogen.</div>}
    </div>
  )
}
```

CSS: zentrierter Step, `.ja` = `var(--tool-color)`-Button (min-height 48px), `.nein` = Border-Button (`var(--border)`), `.hint` = `var(--text-dim)`, `fadeInUp`.

- [ ] **Step 2: `StepFreitext`**

```jsx
import { useAutosave } from './useAutosave'
import s from './StepFreitext.module.css'
export default function StepFreitext({ date, initial, editable = true, onSave, onFertig, onSkip }) {
  const [text, onText] = useAutosave(initial ?? '', onSave, [date])
  return (
    <div className={s.step}>
      <button className={s.skip} onClick={onSkip}>Überspringen</button>
      <div className={s.title}>Sonst noch was im Kopf?</div>
      <textarea className={s.field} value={text} onChange={e => onText(e.target.value)}
        placeholder="Ein Satz reicht." rows={5} disabled={!editable} autoFocus />
      <button className={s.cta} onClick={onFertig}>Fertig</button>
    </div>
  )
}
```

CSS: Step-Container, `.title` Stagger (delay 0), `.field` (.06s), `.cta` (.12s) `var(--tool-color)`; `.skip` oben rechts; Fertig-Haken als SVG.

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/growth/StepBonusFrage.* src/features/tools/growth/StepFreitext.*
git commit -m "feat(growth): StepBonusFrage + StepFreitext"
```

---

## Task 9: `StepAbschluss` (Belohnungsmoment)

**Files:**
- Create: `StepAbschluss.jsx`, `StepAbschluss.module.css`

Kontrakt: `<StepAbschluss onDone />` — spielt Haken-Pop + Ring-Puls, ruft danach `onDone()` (Timeout-gesichert; `onAnimationEnd` zusätzlich).

- [ ] **Step 1: Implement**

```jsx
import { useEffect, useRef } from 'react'
import s from './StepAbschluss.module.css'

export default function StepAbschluss({ onDone }) {
  const done = useRef(false)
  const fire = () => { if (!done.current) { done.current = true; onDone() } }
  useEffect(() => { const t = setTimeout(fire, 1100); return () => clearTimeout(t) }, [])
  return (
    <div className={s.step}>
      <div className={s.ring} />
      <div className={s.check} onAnimationEnd={fire}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <div className={s.text}>Du warst heute da.</div>
    </div>
  )
}
```

`StepAbschluss.module.css`:

```css
.step { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.check { width: 72px; height: 72px; border-radius: 50%; border: 2.5px solid var(--emerald); display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle, color-mix(in srgb, var(--emerald) 30%, transparent), transparent 70%); animation: gCheckPop .5s cubic-bezier(.34,1.5,.5,1) both; }
.ring { position: absolute; width: 72px; height: 72px; border-radius: 50%; border: 2px solid var(--emerald); animation: gRingPulse .9s ease-out both; }
.text { font-size: 1rem; color: var(--text); font-weight: 600; animation: fadeInUp .4s ease .4s both; }
@keyframes gCheckPop { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }
@keyframes gRingPulse { 0% { opacity: .7; transform: scale(1);} 100% { opacity: 0; transform: scale(1.8);} }
@media (prefers-reduced-motion: reduce) { .check, .ring, .text { animation: none; } .ring { opacity: 0; } }
```

- [ ] **Step 2: Commit**

```bash
git add src/features/tools/growth/StepAbschluss.jsx src/features/tools/growth/StepAbschluss.module.css
git commit -m "feat(growth): StepAbschluss Belohnungsmoment"
```

---

## Task 10: `GrowthFlow` — State-Machine

**Files:**
- Create: `GrowthFlow.jsx`, `GrowthFlow.module.css`

Kontrakt: `<GrowthFlow data persist date today onFinished onStartTimer />`.
- `persist(nextData)` = die `persist`-Funktion aus `TabGrowth` (schreibt `dataRef` synchron + speichert).
- `onFinished()` ruft Parent → `markFlowAbgeschlossen` + Mode → overview.
- `onStartTimer(karte)` = bestehende Timer-Logik aus `TabGrowth`.

Verhalten: baut Laufzeit-Step-Liste aus `flowSteps(data, date)`; Bonus-Karten werden nach „Ja" als zusätzliche `karte`-Steps eingeschoben. Fortschrittspunkte = Basis-Schritte. Skip/Fertig → `StepAbschluss` → `onFinished`.

- [ ] **Step 1: Implement**

```jsx
import { useState, useRef, useEffect } from 'react'
import FlowStepper from './FlowStepper'
import StepAnkommen from './StepAnkommen'
import StepKarte from './StepKarte'
import StepBonusFrage from './StepBonusFrage'
import StepFreitext from './StepFreitext'
import StepAbschluss from './StepAbschluss'
import { flowSteps } from './growthFlow'
import {
  ensureDayCard, openerForDate, setAntwort, setFreitext, markStateTouched,
  skipKarte, drawBonusKarte, MAX_KARTEN_PRO_TAG,
} from './growthStore'
import s from './GrowthFlow.module.css'

export default function GrowthFlow({ data, persist, date, today, onFinished, onStartTimer }) {
  // Tageskarte sicherstellen (einmalig beim Mount für diesen Tag)
  useEffect(() => { persist(ensureDayCard(data, date)) // eslint-disable-next-line
  }, [date])

  const day = data.days[date] ?? {}
  const editable = date === today
  const base = flowSteps(data, date)            // z.B. ['ankommen','karte','freitext']
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState('forward')
  const [bonusOffen, setBonusOffen] = useState(false)  // Bonus-Frage statt Freitext zeigen
  const [bonusKartenId, setBonusKartenId] = useState(null) // aktuell gezogene Bonuskarte
  const [finishing, setFinishing] = useState(false)

  const go = (next) => { setDir(next > idx ? 'forward' : 'back'); setIdx(next) }
  const finish = () => { setDir('forward'); setFinishing(true) }

  if (finishing) {
    return <div className={s.flow}><StepAbschluss onDone={onFinished} /></div>
  }

  const stepName = base[idx]
  const istLetzte = idx === base.length - 1

  // Karte-Index in der Tageskarte (idx der 'karte'-Position)
  const renderStep = () => {
    if (bonusKartenId) {
      const eintrag = day.karten?.find(k => k.kartenId === bonusKartenId)
      return (
        <StepKarte key={'bonus-' + bonusKartenId} eintrag={eintrag} date={date} editable={editable}
          istTageskarte={false} skipMoeglich={false}
          onPatch={(p) => persist(setAntwort(data, date, bonusKartenId, p))}
          onStartTimer={onStartTimer}
          onWeiter={() => { setBonusKartenId(null); setBonusOffen(true) }} />
      )
    }
    if (bonusOffen) {
      const canDraw = (day.karten?.length ?? 0) < MAX_KARTEN_PRO_TAG
      return (
        <StepBonusFrage key="bonus-frage" canDraw={canDraw}
          onJa={() => {
            const next = drawBonusKarte(data, date); persist(next)
            const neu = next.days[date].karten.at(-1)?.kartenId
            setBonusOffen(false); setBonusKartenId(neu ?? null)
          }}
          onNein={() => { setBonusOffen(false); go(idx + 1) }} />
      )
    }
    if (stepName === 'ankommen') {
      return (
        <StepAnkommen key="ankommen" date={date} settings={data.settings} opener={openerForDate(date)}
          onStateTouched={() => persist(markStateTouched(data, date))}
          onWeiter={() => go(idx + 1)} onSkip={finish} />
      )
    }
    if (stepName === 'karte') {
      const eintrag = day.karten?.find(k => k.kartenId === day.tageskarteId)
      if (!eintrag) return null
      return (
        <StepKarte key="karte" eintrag={eintrag} date={date} editable={editable}
          istTageskarte skipMoeglich={editable && !day.skipVerwendet && !(eintrag.antwort ?? '').trim() && !eintrag.erledigt}
          onPatch={(p) => persist(setAntwort(data, date, day.tageskarteId, p))}
          onSkip={() => persist(skipKarte(data, date))}
          onStartTimer={onStartTimer}
          onWeiter={() => setBonusOffen(true)} />  /* nach Tageskarte: Bonus anbieten */
      )
    }
    if (stepName === 'freitext') {
      return (
        <StepFreitext key="freitext" date={date} initial={day.freitext} editable={editable}
          onSave={(t) => persist(setFreitext(data, date, t))}
          onFertig={finish} onSkip={finish} />
      )
    }
    return null
  }

  // Fortschrittspunkte über Basis-Schritte
  const dots = base.map((_, i) => i <= idx)

  return (
    <div className={s.flow}>
      <div className={s.progress}>
        {dots.map((on, i) => <span key={i} className={[s.dot, on ? s.dotOn : ''].join(' ')} />)}
      </div>
      <FlowStepper stepKey={bonusKartenId ? 'bonus-' + bonusKartenId : bonusOffen ? 'bonus-frage' : stepName} direction={dir}>
        {renderStep()}
      </FlowStepper>
    </div>
  )
}
```

`GrowthFlow.module.css`:

```css
.flow { display: flex; flex-direction: column; flex: 1; min-height: 70vh; gap: 14px; position: relative; }
.progress { display: flex; gap: 6px; justify-content: center; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); transition: background .3s, box-shadow .3s; }
.dotOn { background: var(--tool-color); box-shadow: 0 0 8px var(--tool-color); }
```

> **Hinweis:** Wenn nach der Tageskarte „Bonus" angeboten wird und der Nutzer „Nein, weiter" wählt, geht es zu `idx+1` (= `freitext`). Übersprungene Bonus-Frage bei skip-fähigem `flowSteps` ohne Karte: dann erscheint `bonusOffen` nie (kein „karte"-Step), Freitext folgt direkt.

- [ ] **Step 2: Verify (live, Task 12 schließt an)**

Erst nach Task 12 (Router) im laufenden Dev-Server prüfbar.

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/growth/GrowthFlow.jsx src/features/tools/growth/GrowthFlow.module.css
git commit -m "feat(growth): GrowthFlow State-Machine"
```

---

## Task 11: `GrowthOverview` (Ruhezustand)

**Files:**
- Create: `GrowthOverview.jsx`, `GrowthOverview.module.css`

> **Sonnet-delegierbar** (Layout aus Mockup `finish-overview.html`, klare Datenquellen).

Kontrakt: `<GrowthOverview data persist date today editable onLosgehen onOpenDay onStartTimer>{kiExportSlot}</GrowthOverview>`.
Inhalt:
- Kopf: Datum + „Du warst heute da." + SVG-Haken (Haken nur wenn `dayHasEntry`).
- Block Check-in: `DailyStateRow date editable onTouched={() => persist(markStateTouched(data,date))}`.
- Block Karte(n): für jede beantwortete/erledigte Karte: Kategorie-Eyebrow + Frage + Antwort. Antippen → inline editierbar (reuse `TageskarteCard`-Darstellung; bei `editable` Textarea, sonst read). Tageskarte zuerst.
- Wenn Tageskarte noch offen und `editable`: dezenter „Karte beantworten →"-Hinweis, der `onLosgehen()` (Flow ab Karte) auslöst — vereinfachte Variante: `onLosgehen()` startet Flow von vorn.
- „+ Noch eine Karte ziehen?" wenn `editable && !isTageskarteOffen && karten.length < MAX`.
- `GrowthArchiv data today onOpen={onOpenDay}` (frühere Tage) — `{kiExportSlot}` als `children`.
- Leerzustand (`!dayHasEntry && editable`): „Heute noch nichts festgehalten" + Button „Loslegen →" → `onLosgehen()`.

Konkrete Datenhelfer: `dayHasEntry`, `isTageskarteOffen`, `karteById`, `KATEGORIEN`, `MAX_KARTEN_PRO_TAG`, `drawBonusKarte`, `setAntwort`, `markStateTouched`. CSS-Blöcke wie Mockup (`.ovBlk` mit `var(--surface)`/`var(--border)`, Antwort mit `border-left: 2px solid var(--tool-color)`), Reveal-Stagger via `fadeInUp` mit gestaffeltem `animation-delay` (das ist die „Enthüllung" nach dem Abschluss).

- [ ] **Step 1: Implement** (vollständige JSX/CSS analog Mockup; alle Texte/Icons wie oben, Haken/Pfeile als SVG)
- [ ] **Step 2: Verify** `npx vitest run src/styleguide.test.js` → PASS (Fonts/Hex).
- [ ] **Step 3: Commit**

```bash
git add src/features/tools/growth/GrowthOverview.jsx src/features/tools/growth/GrowthOverview.module.css
git commit -m "feat(growth): GrowthOverview Ruhezustand"
```

---

## Task 12: `TabGrowth` als Router

**Files:**
- Modify: `src/features/tools/growth/TabGrowth.jsx`

Ziel: bestehende geteilte Effekte behalten (Tageswechsel, Timer-Rückkehr, BackInterceptor, growthOpenDate, KI-Export), aber die Tagesansicht über `growthViewMode` auf `GrowthFlow` bzw. `GrowthOverview` aufteilen. `nav==='settings'`/Briefing bleiben.

- [ ] **Step 1: Router-Logik einbauen**

Kernänderungen:
- Import: `GrowthFlow`, `GrowthOverview`, `growthViewMode`, `markFlowAbgeschlossen`. Entfällt: `GrowthOpener`, `TageskarteCard`-Direktnutzung (in Overview gekapselt), `DailyStateRow`-Direktnutzung im Tages-Render (jetzt in Step/Overview), `ensureDayCard` (nach `GrowthFlow` verschoben), `isTageskarteOffen`/`drawBonusKarte`/`setAntwort`/`skipKarte` im Tages-Render (in Flow/Overview).
- Neuer lokaler State: `const [forceFlow, setForceFlow] = useState(false)`.
- `handleStartTimer` bleibt (wird an `GrowthFlow`/`GrowthOverview` als `onStartTimer` gereicht).
- `markOpenerShown`-Effekt: weiterhin beim ersten Anzeigen heute (kann bleiben; schadet nicht). Optional vereinfachen.
- Tages-Render ersetzen durch:

```jsx
const mode = forceFlow ? 'flow' : growthViewMode(data, viewDate, today)

return (
  <div className={s.page} style={{ '--tool-color': toolColor }}>
    <ToolHeader onBack={onBack} icon={<ToolIcon id="growth" size={20} />} eyebrow="Tool" title="Growth"
      actions={<button className={s.settingsBtn} onClick={() => setNav('settings')} aria-label="Einstellungen"><SettingsIcon /></button>} />

    {viewDate !== today && (
      <button className={s.backToToday} onClick={() => setViewDate(today)}>← Zurück zu heute</button>
    )}

    {mode === 'flow' ? (
      <GrowthFlow data={data} persist={persist} date={viewDate} today={today}
        onStartTimer={handleStartTimer}
        onFinished={() => { persist(markFlowAbgeschlossen(dataRef.current, viewDate)); setForceFlow(false) }} />
    ) : (
      <GrowthOverview data={data} persist={persist} date={viewDate} today={today}
        editable={isEditable(viewDate, today)}
        onStartTimer={handleStartTimer}
        onLosgehen={() => setForceFlow(true)}
        onOpenDay={(d) => { setViewDate(d); setForceFlow(false) }}>
        {data.settings.kiExportAn && (
          <div className={s.kiRow}>
            <span className={s.kiLabel}>{kiKopiert ? '✓ In Zwischenablage kopiert' : 'Für KI exportieren:'}</span>
            {!kiKopiert && [7, 30, 90].map(n => (
              <button key={n} className={s.kiBtn} onClick={() => handleKiExport(n)}>{n} Tage</button>
            ))}
          </div>
        )}
      </GrowthOverview>
    )}
  </div>
)
```

- BackInterceptor-Effekt erweitern: wenn `forceFlow` aktiv → Back schließt Flow (`setForceFlow(false)`) statt Tool. Reihenfolge: `nav` > `forceFlow` > `viewDate!==today` > null.
- `ensureDayCard`-Effekt aus `TabGrowth` entfernen (lebt jetzt in `GrowthFlow`); der `editable`/`briefingGesehen`-Effekt entfällt entsprechend.

- [ ] **Step 2: Verify (live)** — Dev-Server, Growth aktivieren, durchspielen (siehe Task 14).
- [ ] **Step 3: Commit**

```bash
git add src/features/tools/growth/TabGrowth.jsx
git commit -m "refactor(growth): TabGrowth als Router (flow|overview|settings|briefing)"
```

---

## Task 13: Aufräumen — `GrowthOpener` entfernen

**Files:**
- Delete: `src/features/tools/growth/GrowthOpener.jsx`, `GrowthOpener.module.css`

- [ ] **Step 1: Importer prüfen**

Run: `grep -rn "GrowthOpener" src/`
Expected: nur (jetzt entfernte) Referenz in `TabGrowth.jsx`. Falls weitere → erst dort lösen.

- [ ] **Step 2: Löschen + Build**

```bash
git rm src/features/tools/growth/GrowthOpener.jsx src/features/tools/growth/GrowthOpener.module.css
npx vitest run
```
Expected: keine Import-Fehler, alle Tests grün.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(growth): GrowthOpener entfernt (ersetzt durch BreathingCircle/StepAnkommen)"
```

---

## Task 14: Live-Verifikation (Dev-Server + Preview)

**Files:** keine (Verifikation).

- [ ] **Step 1:** Dev-Server starten (`preview_start` „dev"). Growth aktivieren (Tools → Alle Tools → Growth +), Briefing durchklicken.
- [ ] **Step 2:** Frischer heutiger Tag → **Fluss** startet (Ankommen mit Atemkreis). Screenshot.
- [ ] **Step 3:** Durchspielen: Ankommen → Karte → Bonus „Nein" → Freitext → **Fertig** → Abschluss-Haken → **Übersicht**. „Tiefe"-Übergang sichtbar. Screenshots.
- [ ] **Step 4:** Growth schließen/erneut öffnen (gleicher Tag) → landet direkt auf **Übersicht** (nicht Fluss).
- [ ] **Step 5:** Übersicht: Block antippen → inline editieren; „Frühere Tage" → lesende Übersicht.
- [ ] **Step 6:** Einstellungen → „Ankommen" aus → neuer Tag/Flow erzwingen (`onLosgehen`) → Ankommen-Step ohne Atemkreis, Check-in bleibt.
- [ ] **Step 7:** `prefers-reduced-motion` simulieren (`preview_eval` Emulation oder DevTools) → Übergänge sofort, kein Hängen.
- [ ] **Step 8:** Volllauf Tests: `npx vitest run` → alle grün.

Keine Commits (reine Prüfung; gefundene Fehler in den jeweiligen Task-Dateien fixen + committen).

---

## Task 15: Kontext-Doku aktualisieren

**Files:**
- Modify: `kontext/architektur.md` (Growth-Dateiliste), evtl. `kontext/tool-pattern.md`

- [ ] **Step 1:** In `architektur.md` die Growth-Komponentenzeile aktualisieren: neue Dateien (GrowthFlow, FlowStepper, BreathingCircle, Step*, GrowthOverview, growthFlow.js), entfernte (GrowthOpener), neue Architektur (Router + Flow/Overview) in 1–2 Sätzen.
- [ ] **Step 2: Commit**

```bash
git add kontext/architektur.md
git commit -m "docs(kontext): Growth geführter Fluss — Architektur aktualisiert"
```

---

## Self-Review (Autor)

**Spec-Abdeckung:** Flow-Screens → Tasks 5–9; Übergänge → Task 3; Atmen+Check-in verschmolzen → Tasks 4–6; Bonus-Logik → Task 10; Abschluss → Task 9; Übersicht + Inline-Edit + Archiv + Leerzustand + KI-Export → Task 11/12; Eintrittslogik/Flag → Tasks 1,2,12; Settings-Toggle (nur Atem-Ebene) → Task 6 (`settings.openerAn`); reduced-motion → Tasks 3,4,9,14; Tests/Guards → Tasks 1,2,5,11,13,14; Doku → Task 15. Keine offene Spec-Anforderung ohne Task.

**Platzhalter:** Logik-/Animations-Kerntasks (1–4, 9, 10, 12) enthalten vollständigen Code. Layout-Tasks (6–8, 11) geben vollständige JSX + CSS-Vorgaben; bei der Umsetzung keine „TODO" hinterlassen.

**Typ-Konsistenz:** `markFlowAbgeschlossen(data,date)`, `growthViewMode(data,viewDate,today)`, `flowSteps(data,viewDate)`, Step-Props (`onWeiter/onSkip/onFinished/onStartTimer`) durchgängig gleich benannt. `persist` = `TabGrowth.persist` (synchroner `dataRef`-Write) konsequent durchgereicht.

**Risiko:** `persist` liest in den Step-Callbacks `data` aus dem Render-Closure — da `persist` `dataRef.current` synchron mitzieht und Re-Render auslöst, bei verketteten Persists in Folge-Callbacks `dataRef.current` statt `data` verwenden (wie im bestehenden `TabGrowth`). In `GrowthFlow` ggf. `data` durch einen `dataRef` ersetzen, falls in einem Callback mehrere Persists nacheinander laufen (aktuell nicht der Fall — je Callback ein Persist).
