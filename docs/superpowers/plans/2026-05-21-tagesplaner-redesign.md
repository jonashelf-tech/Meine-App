# Tagesplaner Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tagesplaner visuell an den Kalender angleichen, Dauer-Bug via CSS-Grid-Span fixen, Lock-Icon vergrößern und Drag-Hover-Glow ergänzen, Pool aufräumen.

**Architecture:** Grid+ Layout — CSS-Grid mit `grid-auto-rows: 48px` und `grid-row: span N` für Slots längerer Dauer. SlotBlock bekommt einen Done-Circle neben dem Lock/Drag-Handle. Kein Umbau von useDragDrop oder TodoChip-Logik.

**Tech Stack:** React 18, CSS Modules (`:global()` für DnD-Hover-Regeln), kein neues Dependency.

---

## Dateien-Übersicht

| Datei | Änderung |
|-------|---------|
| `src/features/calendar/Pool/Pool.jsx` | Fullscreen-State + Button + Overlay entfernen |
| `src/features/calendar/Pool/Pool.module.css` | `.fullscreenBtn`, `.overlay` entfernen |
| `src/features/calendar/Zeitplan/Zeitplan.jsx` | ROW_H, grid-row span, SlotBlock, LockIcon, Outside-Hints entfernen |
| `src/features/calendar/Zeitplan/Zeitplan.module.css` | Visueller Umbau, Done-Circle, Lock-Hover-Glow, grid-auto-rows |
| `src/components/TodoChip/TodoChip.module.css` | `.rowWrap { height: 100% }` damit Slot-Chip die Zellhöhe ausfüllt |

---

## Task 1: Pool — Fullscreen entfernen

**Files:**
- Modify: `src/features/calendar/Pool/Pool.jsx`
- Modify: `src/features/calendar/Pool/Pool.module.css`

- [ ] **Step 1: Pool.jsx — fullscreen State und Button entfernen**

Ersetze den kompletten `Pool`-Export-Body. Entferne `fullscreen` State, den `⤢`-Button und das `overlay`-Conditional. Der `content`-Block wandert direkt in den Return.

```jsx
export default function Pool({
  todos = [],
  setTodos,
  todaySlots = {},
  onToggleDone,
  onEdit,
  onRemove,
  startDrag,
}) {
  // Memoize placed sets — only slots without a todoId use text fallback
  const { placedIds, placedTexts } = useMemo(() => {
    const slotValues = Object.values(todaySlots).filter(Boolean)
    return {
      placedIds:   new Set(slotValues.map(sl => sl.todoId).filter(Boolean)),
      placedTexts: new Set(slotValues.filter(sl => !sl.todoId).map(sl => sl.text).filter(Boolean)),
    }
  }, [todaySlots])

  const isPlaced = useCallback(
    (t) => placedIds.has(t.id) || placedTexts.has(t.text),
    [placedIds, placedTexts]
  )

  const pool1 = todos.filter(
    t => !t.done && (t.priority === 1 || isFaelligkeit(t)) && !isPlaced(t)
  )
  const pool2 = todos.filter(
    t => !t.done && !(t.priority === 1 || isFaelligkeit(t)) && !isPlaced(t)
  )

  const renderChip = (t) => (
    <PoolChip
      key={t.id}
      todo={t}
      todos={todos}
      setTodos={setTodos}
      onToggleDone={() => onToggleDone?.(t.id)}
      onEdit={() => onEdit?.(t.id)}
      onRemove={() => onRemove?.(t.id)}
      startDrag={startDrag}
      isPlaced={isPlaced(t)}
    />
  )

  return (
    <div className={s.pool}>
      <div className={s.header}>
        <span className={s.poolLabel}>Pool</span>
      </div>

      <Group label="Heute relevant" count={pool1.length} defaultOpen>
        {pool1.length === 0
          ? <p className={s.empty}>Alles verplant ✓</p>
          : pool1.map(renderChip)
        }
      </Group>

      <Group label="Offen" count={pool2.length}>
        {pool2.length === 0
          ? <p className={s.empty}>Kein weiteres Todo</p>
          : pool2.map(renderChip)
        }
      </Group>
    </div>
  )
}
```

- [ ] **Step 2: Pool.module.css — fullscreen Styles entfernen**

Entferne die folgenden Klassen aus `Pool.module.css` (falls vorhanden): `.fullscreenBtn`, `.overlay`. Überprüfe zuerst mit Read welche Klassen existieren und lösche nur die genannten.

- [ ] **Step 3: Commit**

```bash
git add src/features/calendar/Pool/Pool.jsx src/features/calendar/Pool/Pool.module.css
git commit -m "feat: Pool — Vollbild-Button entfernt"
```

---

## Task 2: Duration-Bug fixen — grid-row span + ROW_H 48px

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`
- Modify: `src/components/TodoChip/TodoChip.module.css`

### Hintergrund

Aktuell: `height: slotPx(duration)` auf `.sgHalf` → unzuverlässig, weil `grid-auto-rows: auto` die Höhe nicht konsistent übernimmt.  
Fix: `grid-auto-rows: 48px` (feste Zeilenhöhe) + `grid-row: rowBase / span N` für Slots mit N > 1.

- [ ] **Step 4: Zeitplan.module.css — grid-auto-rows auf 48px setzen**

In `.sgGrid` ersetze `grid-auto-rows: auto;` mit einem Wert passend zu ROW_H = 48:

```css
.sgGrid {
  display: grid;
  grid-template-columns: 28px 1fr;
  grid-auto-rows: 48px;
  overflow: visible;
}
```

In `.sgHalf` entferne `min-height: 40px` und füge `padding: 2px 3px 2px 2px` hinzu (Atmungsraum um den Chip):

```css
.sgHalf {
  grid-column: 2;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: relative;
  overflow: visible;
  transition: background 0.12s;
  padding: 2px 3px 2px 2px;
}
```

In `.sgEmpty` ersetze `height: 40px` mit `height: 100%` und entferne die `padding-left` (stattdessen nutzen wir den sgHalf-Padding):

```css
.sgEmpty {
  display: flex;
  align-items: center;
  padding-left: 6px;
  cursor: default;
  background: rgba(255,255,255,0.008);
  height: 100%;
}
```

In `.sgConsumed` setze `display: none` statt `height: 40px; visibility: hidden`:

```css
.sgConsumed {
  grid-column: 2;
  display: none;
}
```

- [ ] **Step 5: TodoChip.module.css — .rowWrap height 100%**

Damit `chipStyle={{ height: '100%' }}` den Chip korrekt auf die Grid-Zellhöhe streckt, muss die Wrapper-Div ebenfalls die Höhe weitergeben. Füge `height: 100%` zur `.rowWrap`-Klasse hinzu:

```css
.rowWrap {
  animation: chipIn 0.18s ease both;
  height: 100%;
}
```

Diese Änderung wirkt nur wenn der Parent eine definite Höhe hat (z.B. `.sgHalf` mit `grid-auto-rows: 48px`). In Pool-Kontext — wo kein fixer Parent existiert — fällt sie auf `auto` zurück: kein Seiteneffekt.

- [ ] **Step 6: Zeitplan.jsx — ROW_H ändern + grid-row span einbauen**

Am Anfang der Datei:
```js
const ROW_H = 48
```

Die `topH`/`botH` Variablen werden nicht mehr benötigt. Entferne die Berechnung:
```js
// LÖSCHEN:
const topH = topSlot ? slotPx(topSlot.duration || 30) : ROW_H
const botH = botSlot ? slotPx(botSlot.duration || 30) : ROW_H
```

Berechne stattdessen die Span-Werte:
```js
const topSpan = topSlot ? Math.ceil((topSlot.duration || 30) / 30) : 1
const botSpan = botSlot ? Math.ceil((botSlot.duration || 30) / 30) : 1
```

**Top-Half rendering** — ersetze den `topSlot`-Branch:

```jsx
// Vorher:
: topSlot
  ? <div
      key={`top-${h}`}
      className={s.sgHalf}
      style={{ gridRow: rowBase, height: topH }}
      ref={el => registerHalf?.(topKey, el, topSlot.locked ? 'locked' : null)}
    >

// Nachher:
: topSlot
  ? <div
      key={`top-${h}`}
      className={s.sgHalf}
      style={{ gridRow: topSpan > 1 ? `${rowBase} / span ${topSpan}` : rowBase }}
      ref={el => registerHalf?.(topKey, el, topSlot.locked ? 'locked' : null)}
    >
```

Den `height`-Prop aus den `SlotBlock`-Aufrufen (top und bot) entfernen — `height` wird nicht mehr an SlotBlock weitergegeben.

**Bot-Half rendering** — ersetze den `botSlot`-Branch analog:

```jsx
// Vorher:
? <div
    key={`bot-${h}`}
    className={[s.sgHalf, s.sgHalfBot].join(' ')}
    style={{ gridRow: rowBase + 1, height: botH }}

// Nachher:
? <div
    key={`bot-${h}`}
    className={[s.sgHalf, s.sgHalfBot].join(' ')}
    style={{ gridRow: botSpan > 1 ? `${rowBase + 1} / span ${botSpan}` : rowBase + 1 }}
```

**Consumed-Cells** — ersetze `s.sgConsumed` durch `display:none`:

```jsx
// Vorher (top consumed):
topConsumed
  ? <div key={`top-${h}`} className={s.sgConsumed} style={{ gridRow: rowBase }} />

// Nachher:
topConsumed
  ? <div key={`top-${h}`} style={{ display: 'none' }} />

// Vorher (bot consumed):
(botConsumed || botConsumedByTop)
  ? <div key={`bot-${h}`} className={s.sgConsumed} style={{ gridRow: rowBase + 1 }} />

// Nachher:
(botConsumed || botConsumedByTop)
  ? <div key={`bot-${h}`} style={{ display: 'none' }} />
```

- [ ] **Step 7: Zeitplan.jsx — slotPx Import entfernen**

`slotPx` wird nicht mehr in Zeitplan.jsx benutzt. Entferne es aus dem Import:

```js
// Vorher:
import { sk, skLabel, slotPx, getDurationKeys, ALL_SLOT_KEYS, todayKey } from '../../../utils'

// Nachher:
import { sk, skLabel, getDurationKeys, ALL_SLOT_KEYS, todayKey } from '../../../utils'
```

- [ ] **Step 8: Zeitplan.jsx — SlotBlock chipStyle aktualisieren**

In `SlotBlock`, ersetze den `chipStyle`:

```js
// Vorher:
const chipStyle = { borderRadius: 4, height: height ? `${height}px` : '100%', border: 'none', margin: 0, flexShrink: 0 }

// Nachher:
const chipStyle = { height: '100%', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.09)', margin: 0, flexShrink: 0 }
```

Entferne außerdem den `height`-Parameter aus der `SlotBlock`-Funktionssignatur:

```js
// Vorher:
function SlotBlock({ slotKey, slot, todo, height, todos, setTodos, onToggleDone, onEdit, onRemove, onDragStart, onToggleLock }) {

// Nachher:
function SlotBlock({ slotKey, slot, todo, todos, setTodos, onToggleDone, onEdit, onRemove, onDragStart, onToggleLock }) {
```

- [ ] **Step 9: Visuell prüfen**

App starten (`npm run dev`) und einen Todo in den Zeitplan ziehen. Ein 60min-Todo muss doppelt so hoch sein wie ein 30min-Todo. Teste auch 90min (3× so hoch).

- [ ] **Step 10: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.jsx src/features/calendar/Zeitplan/Zeitplan.module.css src/components/TodoChip/TodoChip.module.css
git commit -m "fix: Tagesplaner Dauer-Visualisierung — grid-row span statt height-Trick, ROW_H 48px"
```

---

## Task 3: SlotBlock — Done-Circle + größeres Lock-Icon

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`

- [ ] **Step 11: Zeitplan.jsx — LockIcon SVG vergrößern**

Ersetze die `LockIcon`-Funktion (aktuell 9×11 px) mit einer größeren Version (12×14 px):

```jsx
function LockIcon({ locked }) {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="6" width="10" height="8" rx="2" fill="currentColor"/>
      {locked
        ? <path d="M3.5 6V4a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        : <path d="M3.5 5.5V4a2.5 2.5 0 015 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.45"/>
      }
    </svg>
  )
}
```

- [ ] **Step 12: Zeitplan.jsx — Done-Circle in SlotBlock handle einbauen**

Im `SlotBlock`-Body, ersetze den `handle`-Block:

```jsx
const handle = (
  <>
    <span
      className={s.slotDone}
      onClick={(e) => { e.stopPropagation(); onToggleDone?.() }}
    >
      <span className={[s.doneCircle, slot.done ? s.doneCircleDone : ''].join(' ')}>
        {slot.done ? '✓' : ''}
      </span>
    </span>
    <span
      className={[s.slotHandle, slot.locked ? s.slotHandleLocked : ''].join(' ')}
      onPointerDown={handlePointerDown}
    >
      {slot.locked ? <LockIcon locked={true} /> : DragIcon}
    </span>
  </>
)
```

Da `onToggleDone` jetzt im Handle aufgerufen wird, wird es weiterhin auch durch den Body-Tap von TodoChip (`useDoubleTap`) ausgelöst — beide Wege funktionieren parallel.

- [ ] **Step 13: Zeitplan.module.css — Done-Circle Styles**

Füge am Ende der Datei (nach dem Remove-Dialog-Block) ein:

```css
/* ── Done-Circle ──────────────────────────────────────── */
.slotDone {
  width: 36px;
  min-width: 36px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}

.slotDone:hover {
  background: rgba(16, 185, 129, 0.06);
}

.doneCircle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.44rem;
  color: transparent;
  transition: all 0.15s;
  user-select: none;
  line-height: 1;
}

.doneCircleDone {
  background: rgba(16, 185, 129, 0.25);
  border-color: rgba(16, 185, 129, 0.55);
  color: #34d399;
}
```

- [ ] **Step 14: Zeitplan.module.css — slotHandle + slotHandleLocked aktualisieren**

Ersetze die bestehenden `.slotHandle` und `.slotHandleLocked` Regeln:

```css
/* ── Slot handle ──────────────────────────────────────── */
.slotHandle {
  width: 36px;
  min-width: 36px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.16);
  cursor: grab;
  flex-shrink: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: color 0.15s, filter 0.15s;
}

.slotHandle:hover  { color: rgba(255, 255, 255, 0.42); }
.slotHandle:active { cursor: grabbing; }

.slotHandleLocked {
  cursor: pointer;
  color: var(--primary);
  filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.45));
}

.slotHandleLocked:hover {
  color: var(--primary);
  filter: drop-shadow(0 0 7px rgba(139, 92, 246, 0.7));
}
```

- [ ] **Step 15: Visuell prüfen**

- Done-Circle erscheint rechts im Slot (neben Drag-Handle)
- Klick auf Circle togglet done (Slot wird transparent + durchgestrichen)
- Lock-Icon ist größer als vorher
- Locked Slot: violetter Glow auf dem Lock-Icon

- [ ] **Step 16: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.jsx src/features/calendar/Zeitplan/Zeitplan.module.css
git commit -m "feat: SlotBlock — Done-Circle, größeres Lock-Icon"
```

---

## Task 4: Lock Drag-Hover-Glow

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`

### Hintergrund

`useDragDrop.js` fügt `.dnd-half-locked` auf das `.sgHalf`-Element, wenn ein Chip darüber gezogen wird. `vars.css` definiert bereits `.dnd-half-locked { background: rgba(251,113,133,0.07) }` als Container-Glow. Jetzt ergänzen wir: Lock-Icon innerhalb des Containers leuchtet heller auf.

- [ ] **Step 17: Zeitplan.module.css — :global(.dnd-half-locked) Regel ergänzen**

Füge nach den `.slotHandleLocked` Regeln ein:

```css
/* ── DnD Hover auf gesperrtem Slot ───────────────────── */
:global(.dnd-half-locked) .slotHandle,
:global(.dnd-half-locked) .slotHandleLocked {
  color: #c4b5fd;
  filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.9));
}
```

Diese Regel gilt in beiden Richtungen:
- Pool-Chip über gesperrten Slot ziehen → Lock leuchtet auf
- Zeitplan-Slot über gesperrten Slot ziehen → Lock leuchtet auf

- [ ] **Step 18: Visuell prüfen**

1. Einen Todo aus dem Pool ziehen
2. Über einen gesperrten Slot hovern (🔒-Icon) → Lock muss heller leuchten
3. Einen unlocked Slot im Zeitplan ziehen → über gesperrten anderen Slot hovern → gleicher Effekt

- [ ] **Step 19: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.module.css
git commit -m "feat: Lock Drag-Hover-Glow via :global(.dnd-half-locked)"
```

---

## Task 5: Außenbereich-Hinweise entfernen

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`

- [ ] **Step 20: Zeitplan.jsx — outsideBefore/outsideAfter entfernen**

Entferne die folgenden Variablen-Definitionen:

```js
// LÖSCHEN:
const outsideBefore = !hideEmpty
  ? fullHours.filter(h => h < visibleStart && (slots[sk(h, false)] || slots[sk(h, true)]))
  : []
const outsideAfter = !hideEmpty
  ? fullHours.filter(h => h > visibleEnd && (slots[sk(h, false)] || slots[sk(h, true)]))
  : []
```

Entferne die JSX-Blöcke für `outsideBefore` und `outsideAfter` (beide `{outsideBefore.length > 0 && (...)}` und `{outsideAfter.length > 0 && (...)}`).

- [ ] **Step 21: Zeitplan.module.css — Outside-Hint Styles entfernen**

Entferne die folgenden Klassen aus der CSS-Datei (alle unter dem Kommentar `/* ── Outside-range hints */`):
- `.outsideHint`
- `.outsideItem`
- `.outsideDot`
- `.outsideTime`
- `.outsideText`

- [ ] **Step 22: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.jsx src/features/calendar/Zeitplan/Zeitplan.module.css
git commit -m "feat: Tagesplaner — Außenbereich-Hinweise entfernt"
```

---

## Task 6: Visueller Feinschliff (CSS)

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`

Dieser Task poliert die restlichen visuellen Details an, damit der Tagesplaner der Kalender-Sprache näher kommt.

- [ ] **Step 23: sgLabel Now-Farbe + sgNow Background**

Stelle sicher, dass die `sgLabelNow` und `sgNow` Klassen korrekt sind:

```css
.sgLabelNow {
  color: var(--primary);
  font-size: 0.65rem;
}

.sgNow {
  background: rgba(139, 92, 246, 0.015);
}
```

- [ ] **Step 24: slotsContainer Border-Radius angleichen**

```css
.slotsContainer {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--r);
  overflow: visible;
  background: rgba(0, 0, 0, 0.1);
  margin-bottom: 4px;
}
```

- [ ] **Step 25: halfTime in Empty-Slots dezenter**

```css
.halfTime {
  font-size: 0.54rem;
  color: rgba(255, 255, 255, 0.07);
  font-family: 'Outfit', sans-serif;
  transition: color 0.12s;
  user-select: none;
}

.sgEmpty:hover .halfTime {
  color: rgba(255, 255, 255, 0.2);
}
```

- [ ] **Step 26: Finale Sichtprüfung**

App öffnen und prüfen:
- [ ] Tagesplaner sieht visuell cleaner aus als vorher
- [ ] 30min-Slot = halbe Höhe eines 60min-Slots
- [ ] Schloss (gesperrt) leuchtet violett, beim Drag-Hover heller
- [ ] Done-Circle erscheint rechts im Slot
- [ ] Pool hat keinen Vollbild-Button mehr
- [ ] Keine Außenbereich-Hinweise mehr
- [ ] + früher / − früh / − spät / + später alle vorhanden

- [ ] **Step 27: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.module.css
git commit -m "feat: Tagesplaner — visueller Feinschliff, Kalender-Harmonisiert"
```
