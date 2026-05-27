# Prokrastination-Tool Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Prokrastination-Modal durch einen geführten 4-Screen-Flow ersetzen, einen Kreis-Badge am TodoChip einführen, und konfigurierbare Einstellungen (Schwelle, Farbe) in den Tab einbauen.

**Architecture:** Vier unabhängige Änderungsbereiche: (1) Store bekommt `klaerenSettings`, (2) KlaerenModal wird komplett neu geschrieben, (3) TodoChip bekommt Kreis-Badge + Kontext-Card, (4) TabKlaeren bekommt ausklappbare Settings. Alle Änderungen sind rückwärtskompatibel — bestehende `klaerenHindernis`/`klaerenWert`-Felder werden nur angezeigt wenn vorhanden.

**Tech Stack:** React 18, Zustand, CSS Modules, Vite PWA

---

## Betroffene Dateien

| Datei | Art |
|---|---|
| `src/storage/index.js` | Modify — SK.klaerenSettings hinzufügen |
| `src/store/index.js` | Modify — klaerenSettings State + Setter |
| `src/features/tools/klaeren/KlaerenModal.jsx` | Rewrite |
| `src/features/tools/klaeren/KlaerenModal.module.css` | Rewrite |
| `src/features/tools/klaeren/TabKlaeren.jsx` | Modify — Settings-Sektion |
| `src/features/tools/klaeren/TabKlaeren.module.css` | Modify — Settings-Styles |
| `src/components/TodoChip/TodoChip.jsx` | Modify — Kreis-Badge + Mint-Card |
| `src/components/TodoChip/TodoChip.module.css` | Modify — neue Klassen |

---

## Task 1: Store — klaerenSettings

**Files:**
- Modify: `src/storage/index.js`
- Modify: `src/store/index.js`

- [ ] **Step 1: SK.klaerenSettings in storage/index.js eintragen**

In `src/storage/index.js`, nach `blockers:` eintragen:

```js
klaerenSettings: `${PREFIX}klaeren_settings`,
```

- [ ] **Step 2: klaerenSettings State im Store hinzufügen**

In `src/store/index.js`, nach dem `toolColors` Block einfügen:

```js
// ─── Klaeren Settings ──────────────────────────────────
klaerenSettings: lv(SK.klaerenSettings, { threshold: 30, ageColor: '#FB923C' }),
setKlaerenSettings: (s) => {
  const next = typeof s === 'function' ? s(get().klaerenSettings) : s
  set({ klaerenSettings: next })
  sv(SK.klaerenSettings, next)
},
```

- [ ] **Step 3: Commit**

```bash
git add src/storage/index.js src/store/index.js
git commit -m "feat: add klaerenSettings to store"
```

---

## Task 2: KlaerenModal — 4-Screen Flow (Komplett-Rewrite)

**Files:**
- Rewrite: `src/features/tools/klaeren/KlaerenModal.jsx`
- Rewrite: `src/features/tools/klaeren/KlaerenModal.module.css`

- [ ] **Step 1: KlaerenModal.jsx komplett ersetzen**

```jsx
import { useState, useRef } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import s from './KlaerenModal.module.css'

const SCREENS = ['relevanz', 'hindernis', 'wert', 'schritte']

function ProgressDots({ current }) {
  return (
    <div className={s.progressDots}>
      {SCREENS.map(screen => (
        <div
          key={screen}
          className={[s.dot, current === screen ? s.dotActive : ''].join(' ')}
        />
      ))}
    </div>
  )
}

export default function KlaerenModal({ todo, onClose, onSave, onDelete }) {
  const { toolColors } = useAppStore()
  const toolColor      = getToolColor('klaeren', toolColors)
  const keyboardOffset = useKeyboardOffset()

  const [screen,    setScreen]    = useState('relevanz')
  const [hindernis, setHindernis] = useState('')
  const [wert,      setWert]      = useState('')
  const [steps,     setSteps]     = useState(todo.subItems || [])
  const [stepInput, setStepInput] = useState('')
  const stepRef = useRef(null)

  const doneSteps = steps.filter(st => st.done).length

  const addStep = () => {
    const txt = stepInput.trim()
    if (!txt) return
    setSteps(prev => [...prev, { id: crypto.randomUUID(), text: txt, done: false }])
    setStepInput('')
    stepRef.current?.focus()
  }

  const toggleStep = (id) =>
    setSteps(prev => prev.map(st => st.id === id ? { ...st, done: !st.done } : st))

  const removeStep = (id) =>
    setSteps(prev => prev.filter(st => st.id !== id))

  const handleFertig = () => {
    const updated = {
      ...todo,
      subItems: steps,
      ...(hindernis.trim() ? { klaerenHindernis: hindernis.trim() } : {}),
      ...(wert.trim()      ? { klaerenWert:      wert.trim()      } : {}),
    }
    onSave(updated)
  }

  const overlayStyle = keyboardOffset > 0
    ? { alignItems: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset }
    : {}

  return (
    <div className={s.overlay} style={overlayStyle} onClick={onClose}>
      <div
        className={s.modal}
        style={{ '--tool-color': toolColor }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Screen: relevanz ─────────────────────── */}
        {screen === 'relevanz' && (
          <>
            <div className={s.todoTitle}>{todo.text}</div>
            <div className={s.question}>
              Möchtest du das angehen — oder willst du es loslassen?
            </div>
            <div className={s.tagline}>Die falsche Entscheidung ist nur keine.</div>
            <button className={s.confirmBtn} onClick={() => setScreen('hindernis')}>
              Angehen ✓
            </button>
            <button className={s.loslassenBtn} onClick={() => onDelete(todo.id)}>
              Loslassen &amp; löschen
            </button>
            <ProgressDots current="relevanz" />
          </>
        )}

        {/* ── Screen: hindernis ────────────────────── */}
        {screen === 'hindernis' && (
          <>
            <button className={s.back} onClick={() => setScreen('relevanz')}>← Zurück</button>
            <div className={s.question}>Was ist gerade dein größter „Gegner" dabei?</div>
            <div className={s.questionSub}>Kurz und ehrlich. Kein perfekter Satz nötig.</div>
            <textarea
              className={s.textarea}
              placeholder="z.B. „Ich weiß nicht wo ich anfangen soll""
              value={hindernis}
              onChange={e => setHindernis(e.target.value)}
              rows={3}
              onClick={e => e.stopPropagation()}
            />
            <div className={s.delegationHint}>
              <span className={s.delegationIcon}>🤝</span>
              <span className={s.delegationText}>
                <strong>Tipp:</strong> Kannst du genau diesen einen Punkt abgeben?
                Manchmal braucht es nur eine kurze Frage an die richtige Person.
              </span>
            </div>
            <button className={s.confirmBtn} onClick={() => setScreen('wert')}>Weiter →</button>
            <button className={s.skipLink} onClick={() => setScreen('wert')}>Überspringen</button>
            <ProgressDots current="hindernis" />
          </>
        )}

        {/* ── Screen: wert ─────────────────────────── */}
        {screen === 'wert' && (
          <>
            <button className={s.back} onClick={() => setScreen('hindernis')}>← Zurück</button>
            <div className={s.question}>Was wird konkret besser, wenn es erledigt ist?</div>
            <div className={s.questionSub}>Nicht was es kostet — was du gewinnst.</div>
            <textarea
              className={s.textarea}
              placeholder="z.B. „Weniger Stress, Geld zurück""
              value={wert}
              onChange={e => setWert(e.target.value)}
              rows={3}
              onClick={e => e.stopPropagation()}
            />
            <button className={s.confirmBtn} onClick={() => setScreen('schritte')}>Weiter →</button>
            <button className={s.skipLink} onClick={() => setScreen('schritte')}>Überspringen</button>
            <ProgressDots current="wert" />
          </>
        )}

        {/* ── Screen: schritte ─────────────────────── */}
        {screen === 'schritte' && (
          <>
            <button className={s.back} onClick={() => setScreen('wert')}>← Zurück</button>
            <div className={s.question}>Zerleg es in die kleinsten möglichen Schritte:</div>

            {/* Chip-Simulation */}
            <div className={s.chipSim}>
              <div className={s.chipSimRing}>
                {steps.length === 0
                  ? '+'
                  : doneSteps === steps.length
                    ? '✓'
                    : `${doneSteps}/${steps.length}`}
              </div>
              <div className={s.chipSimText}>{todo.text}</div>
            </div>

            {/* Schritt-Liste */}
            {steps.length > 0 && (
              <div className={s.stepsList}>
                {steps.map(step => (
                  <div
                    key={step.id}
                    className={[s.stepRow, step.done ? s.stepDone : ''].join(' ')}
                  >
                    <div
                      className={[s.stepCheck, step.done ? s.stepCheckDone : ''].join(' ')}
                      onClick={() => toggleStep(step.id)}
                    >
                      {step.done ? '✓' : ''}
                    </div>
                    <span className={s.stepText} onClick={() => toggleStep(step.id)}>
                      {step.text}
                    </span>
                    <button className={s.stepRm} onClick={() => removeStep(step.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Eingabe */}
            <div className={s.stepAddRow}>
              <input
                ref={stepRef}
                className={s.stepInput}
                placeholder="+ Schritt hinzufügen…"
                value={stepInput}
                onChange={e => setStepInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addStep() }}
                onClick={e => e.stopPropagation()}
              />
              <button className={s.stepAddBtn} onClick={addStep}>+</button>
            </div>

            <button className={s.confirmBtn} onClick={handleFertig}>Fertig ✓</button>
            <ProgressDots current="schritte" />
          </>
        )}

      </div>
    </div>
  )
}
```

- [ ] **Step 2: KlaerenModal.module.css komplett ersetzen**

```css
/* ── Overlay ─────────────────────────────────────────────── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  padding-bottom: max(20px, env(safe-area-inset-bottom, 20px));
}

/* ── Modal ───────────────────────────────────────────────── */
.modal {
  background: rgba(12, 12, 26, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--r);
  padding: 20px 16px;
  width: 100%;
  max-width: 480px;
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: scaleIn 0.18s ease both;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 24px 64px rgba(0, 0, 0, 0.7),
    0 8px 24px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.93) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Navigation ──────────────────────────────────────────── */
.back {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-align: left;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
  align-self: flex-start;
}
.back:hover { color: rgba(255, 255, 255, 0.7); }

/* ── Todo-Titel ──────────────────────────────────────────── */
.todoTitle {
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.35;
}

/* ── Frage ───────────────────────────────────────────────── */
.question {
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.4;
}

.questionSub {
  font-family: 'Outfit', sans-serif;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.38);
  line-height: 1.4;
  margin-top: -4px;
}

.tagline {
  font-family: 'Outfit', sans-serif;
  font-size: 0.76rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.32);
  margin-top: -4px;
}

/* ── Textarea ────────────────────────────────────────────── */
.textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  padding: 11px 12px;
  outline: none;
  resize: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
  line-height: 1.5;
}
.textarea::placeholder { color: rgba(255, 255, 255, 0.2); }
.textarea:focus {
  border-color: var(--tool-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tool-color) 18%, transparent);
}

/* ── Delegations-Tipp ────────────────────────────────────── */
.delegationHint {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: color-mix(in srgb, var(--tool-color) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--tool-color) 20%, transparent);
  border-radius: var(--r-sm);
  padding: 10px 12px;
}

.delegationIcon {
  font-size: 1rem;
  flex-shrink: 0;
  line-height: 1.4;
}

.delegationText {
  font-family: 'Outfit', sans-serif;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
}

.delegationText strong {
  color: var(--tool-color);
  font-weight: 700;
}

/* ── Bestätigen-Button ───────────────────────────────────── */
.confirmBtn {
  background: color-mix(in srgb, var(--tool-color) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--tool-color) 45%, transparent);
  border-radius: var(--r-sm);
  color: var(--tool-color);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 13px 16px;
  width: 100%;
  transition: background 0.18s, border-color 0.18s;
  -webkit-tap-highlight-color: transparent;
}
.confirmBtn:hover {
  background: color-mix(in srgb, var(--tool-color) 24%, transparent);
}

/* ── Loslassen-Button ────────────────────────────────────── */
.loslassenBtn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--r-sm);
  color: rgba(255, 255, 255, 0.38);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 12px 16px;
  width: 100%;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.loslassenBtn:hover {
  background: rgba(255, 80, 80, 0.08);
  color: rgba(255, 120, 120, 0.7);
  border-color: rgba(255, 80, 80, 0.2);
}

/* ── Überspringen-Link ───────────────────────────────────── */
.skipLink {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.25);
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 0;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
}
.skipLink:hover { color: rgba(255, 255, 255, 0.5); }

/* ── Chip-Simulation ─────────────────────────────────────── */
.chipSim {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(139, 92, 246, 0.08);
  border: 1.5px solid rgba(139, 92, 246, 0.3);
  border-radius: var(--r-sm);
  padding: 10px 12px;
}

.chipSimRing {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--tool-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Outfit', sans-serif;
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--tool-color);
  flex-shrink: 0;
  transition: border-color 0.2s;
}

.chipSimText {
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Schritte-Liste ──────────────────────────────────────── */
.stepsList {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.stepRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.stepRow:last-child { border-bottom: none; }
.stepRow:hover { background: rgba(255, 255, 255, 0.02); }

.stepDone { opacity: 0.4; }

.stepCheck {
  width: 18px;
  height: 18px;
  min-width: 18px;
  border-radius: 4px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  color: var(--tool-color);
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s;
}
.stepCheckDone {
  background: color-mix(in srgb, var(--tool-color) 15%, transparent);
  border-color: color-mix(in srgb, var(--tool-color) 50%, transparent);
}

.stepText {
  flex: 1;
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  min-width: 0;
  word-break: break-word;
}
.stepDone .stepText { text-decoration: line-through; }

.stepRm {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.12);
  font-size: 0.55rem;
  cursor: pointer;
  padding: 3px 5px;
  flex-shrink: 0;
  transition: color 0.12s;
}
.stepRm:hover { color: var(--rose, #fb7185); }

/* ── Schritt-Eingabe ─────────────────────────────────────── */
.stepAddRow {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: var(--r-sm);
  padding: 4px 8px 4px 12px;
}

.stepInput {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  padding: 7px 4px 7px 0;
  caret-color: var(--tool-color);
}
.stepInput::placeholder { color: rgba(255, 255, 255, 0.2); }

.stepAddBtn {
  background: none;
  border: none;
  color: var(--tool-color);
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 6px;
  transition: opacity 0.12s;
  line-height: 1;
}
.stepAddBtn:hover { opacity: 0.7; }

/* ── Fortschritts-Dots ───────────────────────────────────── */
.progressDots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding-top: 4px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: background 0.2s;
}

.dotActive {
  background: var(--tool-color);
}
```

- [ ] **Step 3: Manuell testen**

App starten (`npm run dev`), Prokrastination-Modal öffnen über Pool-Chip. Alle 4 Screens durchklicken. Sicherstellen dass:
- Screen-Wechsel funktionieren
- „Zurück" navigiert korrekt
- „Loslassen & löschen" löscht das Todo
- Screen 4: Schritte hinzufügen, togglen, löschen
- „Fertig" speichert Todo mit Sub-Items + Hindernis/Wert

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/klaeren/KlaerenModal.jsx src/features/tools/klaeren/KlaerenModal.module.css
git commit -m "feat: rewrite KlaerenModal with 4-screen flow"
```

---

## Task 3: TodoChip — Kreis-Badge + Mint-Card + ageColor

**Files:**
- Modify: `src/components/TodoChip/TodoChip.jsx`
- Modify: `src/components/TodoChip/TodoChip.module.css`

- [ ] **Step 1: klaerenSettings aus Store lesen und Threshold/ageColor berechnen**

In `TodoChip.jsx` den `useAppStore`-Aufruf erweitern (Zeile 196):

```js
const { toolColors, klaerenSettings } = useAppStore()
const threshold = klaerenSettings?.threshold ?? 30
const ageColor  = klaerenSettings?.ageColor  ?? '#FB923C'
```

- [ ] **Step 2: ageDays immer berechnen wenn onKlaeren aktiv**

Zeilen 200–202 ersetzen:

```js
const ageDays  = (showAge || !!onKlaeren) ? getAgeDays(todo.createdAt) : 0
const ageLabel = showAge ? fmtAge(ageDays) : null
const isOld    = ageDays >= threshold
```

- [ ] **Step 3: --age-color CSS-Variable auf chip div setzen**

Im `style`-Objekt des `.chip` div (Zeile 233–239) `'--age-color': ageColor` ergänzen:

```jsx
style={{
  '--chip-color': todo.done ? 'rgba(0,255,148,0.15)' : color,
  '--age-color': ageColor,
  ...(glowColor && !todo.done ? {
    boxShadow: `0 0 0 1.5px ${glowColor}, 0 0 14px ${glowColor}44`,
  } : {}),
  ...(chipStyle || {}),
}}
```

- [ ] **Step 4: klaerenBtn aus meta entfernen + meta-Kondition anpassen**

Den Block `{onKlaeren && !todo.done && (...)}` innerhalb von `<span className={s.meta}>` entfernen.

Die äußere Bedingung für die meta-span ändern von:
```jsx
{(metaParts.length > 0 || ageLabel || onKlaeren) && (
```
zu:
```jsx
{(metaParts.length > 0 || ageLabel) && (
```

- [ ] **Step 5: Kreis-Badge zwischen body und removeBtn einfügen**

Nach dem `<div className={s.body}>...</div>` Block und vor `{onRemove && (` einfügen:

```jsx
{/* Klaeren Circle Badge */}
{onKlaeren && !todo.done && ageDays >= threshold && (
  <button
    className={s.klaerenCircle}
    onClick={e => { e.stopPropagation(); onKlaeren(todo) }}
    aria-label="Prokrastination"
  >
    <span className={s.klaerenCircleNum}>{ageDays}</span>
    <span className={s.klaerenCircleUnit}>Tage</span>
  </button>
)}
```

- [ ] **Step 6: Mint-Card im expanded Bereich einfügen**

In der Sub-Items-Section (`!disableExpand && expanded && ...`), nach den `allItems.map(...)` Zeilen und vor dem `{/* Add row */}` Block einfügen:

```jsx
{/* Klaeren-Kontext */}
{(todo.klaerenHindernis || todo.klaerenWert) && (
  <div className={s.klaerenContext}>
    {todo.klaerenHindernis && (
      <div className={s.klaerenRow}>
        <span className={s.klaerenIcon}>🏔</span>
        <div>
          <span className={s.klaerenLabel}>Hindernis</span>
          <span className={s.klaerenText}>{todo.klaerenHindernis}</span>
        </div>
      </div>
    )}
    {todo.klaerenWert && (
      <div className={s.klaerenRow}>
        <span className={s.klaerenIcon}>✨</span>
        <div>
          <span className={s.klaerenLabel}>Wert</span>
          <span className={s.klaerenText}>{todo.klaerenWert}</span>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 7: TodoChip.module.css — ageColor dynamisch + Kreis-Badge + Mint-Card Styles**

`.chipOld` und `.chipOld:hover` ersetzen:

```css
/* Old todo — Farbe kommt aus klaerenSettings.ageColor */
.chipOld {
  border-color: color-mix(in srgb, var(--age-color) 35%, transparent);
}
.chipOld:hover {
  border-color: color-mix(in srgb, var(--age-color) 55%, transparent);
}
```

`.ageTagOld` ersetzen:

```css
/* 30+ days → ageColor */
.ageTagOld {
  color: color-mix(in srgb, var(--age-color) 75%, transparent);
}
```

Bestehende `.klaerenBtn` und `.klaerenBtn:hover` komplett ersetzen durch:

```css
/* ── Klaeren Kreis-Badge ─────────────────────────────────── */
.klaerenCircle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 34px;
  min-width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(52, 211, 153, 0.08);
  border: 1.5px solid rgba(52, 211, 153, 0.35);
  cursor: pointer;
  flex-shrink: 0;
  align-self: center;
  margin: 0 3px;
  transition: background 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.klaerenCircle:hover {
  background: rgba(52, 211, 153, 0.16);
  border-color: rgba(52, 211, 153, 0.65);
}

.klaerenCircleNum {
  font-family: 'Outfit', sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
  color: #34D399;
  line-height: 1;
}

.klaerenCircleUnit {
  font-family: 'Outfit', sans-serif;
  font-size: 0.46rem;
  font-weight: 600;
  color: rgba(52, 211, 153, 0.6);
  line-height: 1;
}

/* ── Klaeren Kontext-Card (im expanded Bereich) ──────────── */
.klaerenContext {
  margin: 6px 12px 2px;
  border: 1px solid rgba(52, 211, 153, 0.35);
  border-radius: 8px;
  background: rgba(52, 211, 153, 0.05);
  overflow: hidden;
}

.klaerenRow {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(52, 211, 153, 0.12);
}
.klaerenRow:last-child { border-bottom: none; }

.klaerenIcon {
  font-size: 0.85rem;
  flex-shrink: 0;
  line-height: 1.5;
}

.klaerenLabel {
  display: block;
  font-family: 'Outfit', sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(52, 211, 153, 0.6);
  margin-bottom: 2px;
}

.klaerenText {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
  word-break: break-word;
}
```

- [ ] **Step 8: Manuell testen**

- Altes Todo (>30 Tage) im Pool: Kreis-Badge erscheint links vom ✕
- Kreis zeigt korrekte Tageszahl
- Neues Todo: kein Kreis-Badge
- Erledigtes Todo: kein Kreis-Badge
- Chip aufklappen nach Prokrastination: Mint-Card mit Hindernis/Wert sichtbar
- Chip ohne klaerenHindernis/klaerenWert: keine Mint-Card

- [ ] **Step 9: Commit**

```bash
git add src/components/TodoChip/TodoChip.jsx src/components/TodoChip/TodoChip.module.css
git commit -m "feat: add klaeren circle badge and context card to TodoChip"
```

---

## Task 4: TabKlaeren — Settings-Sektion

**Files:**
- Modify: `src/features/tools/klaeren/TabKlaeren.jsx`
- Modify: `src/features/tools/klaeren/TabKlaeren.module.css`

- [ ] **Step 1: TabKlaeren.jsx — Settings State + Preset-Farben + threshold-aware Filter**

Imports ergänzen (nach dem letzten Import):
```jsx
import { useState, useMemo } from 'react'
// useState war schon da — nur useMemo ergänzen falls nicht vorhanden
```

Die bestehende `useAppStore()`-Destructuring-Zeile (Zeile 21) erweitern:
```jsx
const { todos, setTodos, toolColors, klaerenSettings, setKlaerenSettings } = useAppStore()
```

Danach nach dem bestehenden `const [search, setSearch] = useState('')` hinzufügen:
```jsx
const [settingsOpen, setSettingsOpen] = useState(false)
const threshold = klaerenSettings?.threshold ?? 30
const ageColor  = klaerenSettings?.ageColor  ?? '#FB923C'

const AGE_COLOR_PRESETS = ['#FB923C', '#F87171', '#FACC15', '#34D399', '#60A5FA']
```

`oldTodos` useMemo auf `threshold` umstellen (den bestehenden ersetzen):
```jsx
const oldTodos = useMemo(() => (
  todos
    .filter(t => !t.done && getAgeDays(t.createdAt) >= threshold)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
), [todos, threshold])
```

- [ ] **Step 2: Settings-Sektion im JSX ergänzen**

Am Ende des `.list` Divs, nach dem `pickBtn` und vor `</div>`, einfügen:

```jsx
{/* ── Einstellungen ──────────────────────────────────────── */}
<div className={s.settingsSection}>
  <button
    className={s.settingsToggle}
    onClick={() => setSettingsOpen(p => !p)}
  >
    <span>⚙ Einstellungen</span>
    <span className={[s.settingsArrow, settingsOpen ? s.settingsArrowOpen : ''].join(' ')}>›</span>
  </button>
  {settingsOpen && (
    <div className={s.settingsBody}>
      <div className={s.settingsRow}>
        <span className={s.settingsLabel}>Schwelle</span>
        <div className={s.settingsControl}>
          <input
            type="number"
            className={s.settingsNumInput}
            value={threshold}
            min={1}
            max={365}
            onChange={e =>
              setKlaerenSettings({
                ...klaerenSettings,
                threshold: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
          <span className={s.settingsUnit}>Tage</span>
        </div>
      </div>
      <div className={s.settingsRow}>
        <span className={s.settingsLabel}>Alter-Farbe</span>
        <div className={s.settingsSwatches}>
          {AGE_COLOR_PRESETS.map(c => (
            <button
              key={c}
              className={[s.swatch, c === ageColor ? s.swatchActive : ''].join(' ')}
              style={{ '--swatch-color': c }}
              onClick={() => setKlaerenSettings({ ...klaerenSettings, ageColor: c })}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 3: TabKlaeren.module.css — Settings-Styles anhängen**

Am Ende der Datei anhängen:

```css
/* ── Settings ───────────────────────────────────────────── */
.settingsSection {
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.settingsToggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 14px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
  text-align: left;
}
.settingsToggle:hover {
  color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.02);
}

.settingsArrow {
  transition: transform 0.2s;
  display: inline-block;
}
.settingsArrowOpen {
  transform: rotate(90deg);
}

.settingsBody {
  padding: 10px 14px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: rgba(255, 255, 255, 0.015);
}

.settingsRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settingsLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.settingsControl {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settingsNumInput {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Outfit', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 6px 10px;
  width: 60px;
  text-align: center;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.settingsNumInput:focus {
  border-color: var(--tool-color);
}

.settingsUnit {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.3);
}

.settingsSwatches {
  display: flex;
  gap: 8px;
}

.swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--swatch-color);
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.12s, border-color 0.12s;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.swatch:hover {
  transform: scale(1.15);
}
.swatchActive {
  border-color: rgba(255, 255, 255, 0.7);
  transform: scale(1.1);
}
```

- [ ] **Step 4: Manuell testen**

- Settings-Toggle anklicken → Bereich klappt auf/zu
- Schwelle auf 7 ändern → mehr Todos erscheinen in der Liste
- Farbe wechseln → alte Todos im Pool bekommen neue Border-/Text-Farbe
- Einstellungen bleiben nach App-Reload erhalten

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/klaeren/TabKlaeren.jsx src/features/tools/klaeren/TabKlaeren.module.css
git commit -m "feat: add configurable settings to TabKlaeren"
```

---

## Task 5: Deploy

- [ ] **Step 1: Build prüfen**

```bash
npm run build
```

Erwartetes Ergebnis: kein Build-Fehler, Warnungen sind ok.

- [ ] **Step 2: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 3: Auf Gerät testen**

https://meine-app-pi.vercel.app öffnen. Pool aufrufen, altes Todo finden, Kreis-Badge antippen, alle 4 Screens durchlaufen, Fertig drücken, Chip aufklappen → Mint-Card sichtbar.
