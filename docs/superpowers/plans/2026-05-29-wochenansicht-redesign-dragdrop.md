# Wochenansicht Redesign + Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wochenansicht-Blöcke neu gestalten (zentriert, Gradient, kompakter), Drag & Drop für Zeit und Tag, und Doppelklick-Bug beim Abhaken beheben.

**Architecture:** Drei getrennte Schichten: CSS-Styles, Block-Rendering (SLOT_H + inline styles), dann Pointer-Handler der Click/Drag/DblClick vereint. Drag nutzt document-level pointermove/pointerup mit colRefs-Map für Spalten-Positionsberechnung.

**Tech Stack:** React 18, CSS Modules, Zustand (`useAppStore`)

---

## Datei-Übersicht

| Datei | Was sich ändert |
|---|---|
| `src/features/calendar/TabKalender/TabKalender.module.css` | weekSlotBlock redesign (gradient, zentriert), weekSlotDone neu, weekSlotDragging, weekSlotGhost + Keyframes, touch-action |
| `src/features/calendar/TabKalender/TabKalender.jsx` | SLOT_H 40→28, colRefs, inline style via CSS-Variable, Zeit-Label entfernen, 4 neue States/Refs, handleDrop, handleSlotTap, unified onPointerDown |

---

## Task 1: CSS — Block Redesign + Drag-Styles

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

- [ ] **Schritt 1: `.weekSlotBlock` komplett ersetzen (Zeile 377–389)**

Aktuell:
```css
.weekSlotBlock {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 3px 4px;
  min-height: 10px;
  cursor: pointer;
}
```

Ersetzen durch:
```css
.weekSlotBlock {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2px 3px;
  min-height: 10px;
  cursor: pointer;
  touch-action: none;
  background: linear-gradient(
    135deg,
    var(--slot-color, var(--primary)),
    color-mix(in srgb, var(--slot-color, var(--primary)) 70%, #000)
  );
  box-shadow: 0 1px 6px color-mix(in srgb, var(--slot-color, var(--primary)) 40%, transparent);
  user-select: none;
  -webkit-user-select: none;
}
```

- [ ] **Schritt 2: `.weekSlotTodo` anpassen (Zeile 390)**

Aktuell: `opacity: 0.65`

Lassen wie es ist — Todo-Slots bleiben leicht transparent gegenüber reinen Terminen.

- [ ] **Schritt 3: `.weekSlotName` aktualisieren (Zeile 392–401)**

Aktuell:
```css
.weekSlotName {
  font-family: 'Outfit', sans-serif;
  font-size: 0.52rem;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}
```

Ersetzen durch:
```css
.weekSlotName {
  font-family: 'Outfit', sans-serif;
  font-size: 0.52rem;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
  max-width: 100%;
}
```

- [ ] **Schritt 4: `.weekSlotTime` entfernen (Zeile 403–408)**

Diese Klasse komplett löschen:
```css
.weekSlotTime {
  font-family: 'Outfit', sans-serif;
  font-size: 0.44rem;
  color: var(--text-dim);
  line-height: 1;
}
```

- [ ] **Schritt 5: `.weekSlotDone` und `.weekSlotDone .weekSlotName` ersetzen**

Aktuell (am Ende der Datei, ca. Zeile 1018–1026):
```css
.weekSlotDone {
  opacity: 0.45;
}

.weekSlotDone .weekSlotName {
  text-decoration: line-through;
}
```

Ersetzen durch:
```css
.weekSlotDone {
  background: linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2)) !important;
  border: 1px solid rgba(16,185,129,0.4);
  box-shadow: none !important;
  opacity: 0.65;
}

.weekSlotDone .weekSlotName {
  text-decoration: line-through;
  color: rgba(255,255,255,0.5);
}

.weekSlotDone::after {
  content: '✓';
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.55rem;
  color: #10B981;
  font-weight: 700;
  pointer-events: none;
}
```

- [ ] **Schritt 6: Neue Drag-Styles ans Ende der Datei anhängen (nach `.weekClickRipple`)**

```css
/* ─── Wochenansicht: Drag & Drop ─────────────────────────── */
.weekSlotDragging {
  opacity: 0.25 !important;
  box-shadow: none !important;
}

@keyframes ghostPulse {
  from { opacity: 0.5; }
  to   { opacity: 0.9; }
}

.weekSlotGhost {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 6px;
  border: 2px dashed var(--slot-color, var(--primary));
  background: color-mix(in srgb, var(--slot-color, var(--primary)) 18%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2px 3px;
  pointer-events: none;
  animation: ghostPulse 0.7s ease-in-out infinite alternate;
  z-index: 3;
}

.weekSlotGhost .weekSlotName {
  color: var(--slot-color, var(--primary));
  opacity: 0.8;
  font-size: 0.52rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
```

- [ ] **Schritt 7: Build prüfen**

```bash
npm run build
```

Erwartung: Build ohne Fehler.

- [ ] **Schritt 8: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "style: Wochenansicht Block-Redesign + Drag-Styles"
```

---

## Task 2: Block-Rendering + SLOT_H + colRefs

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: SLOT_H ändern (Zeile 20)**

```js
const SLOT_H = 28
```

- [ ] **Schritt 2: `colRefs` und `dragJustEnded` Refs nach `weekScrollRef` hinzufügen**

Nach `const weekScrollRef = useRef(null)` (ca. Zeile 406):
```js
const colRefs       = useRef({})
const dragJustEnded = useRef(false)
```

- [ ] **Schritt 3: `weekDayCol` — ref registrieren + dragJustEnded-Check in onClick**

Den `weekDayCol`-Div (ca. Zeile 638) anpassen. Aktuell:
```jsx
<div
  key={dk}
  className={[s.weekDayCol, isColToday ? s.weekDayColToday : ''].join(' ')}
  style={{ height: colHeight }}
  onClick={(e) => {
    if (e.target !== e.currentTarget) return
    ...
  }}
>
```

Ersetzen durch:
```jsx
<div
  key={dk}
  className={[s.weekDayCol, isColToday ? s.weekDayColToday : ''].join(' ')}
  style={{ height: colHeight }}
  ref={el => { if (el) colRefs.current[dk] = el }}
  onClick={(e) => {
    if (e.target !== e.currentTarget) return
    if (dragJustEnded.current) return
    const slotIndex = Math.floor(e.nativeEvent.offsetY / SLOT_H)
    const h  = visibleStart + slotIndex * 0.5
    const hh = String(Math.floor(h)).padStart(2, '0')
    const mm = h % 1 ? '30' : '00'
    const rect = e.currentTarget.getBoundingClientRect()
    const rx = e.clientX - rect.left
    const ry = e.clientY - rect.top
    const rid = Date.now()
    setClickRipple({ dk, x: rx, y: ry, id: rid })
    setTimeout(() => setClickRipple(r => r?.id === rid ? null : r), 420)
    setQuickCreate({ date: dk, time: `${hh}:${mm}` })
  }}
>
```

- [ ] **Schritt 4: Inline-Style des `weekSlotBlock` auf CSS-Variable umstellen + Zeit-Label entfernen**

Den Block-Render (ca. Zeile 705) anpassen. Aktuell:
```jsx
<div
  key={key}
  className={[
    s.weekSlotBlock,
    isTodo ? s.weekSlotTodo : '',
    (slot.done || slotTodo?.done) ? s.weekSlotDone : '',
    flashingSlotKey === `${dk}-${key}` ? s.weekSlotDoneFlash : '',
  ].join(' ')}
  style={{ top, height, background: slot.color || 'var(--primary)' }}
  onClick={(e) => {
    e.stopPropagation()
    handleToggleSlotDone(dk, key, slot, slotTodo)
  }}
  onDoubleClick={(e) => {
    e.stopPropagation()
    if (slot.todoId) {
      const t = todos.find(td => td.id === slot.todoId)
      if (t) setEditingTodo(t)
    } else {
      setEditingTermin({ dk, slotKey: key, slot })
    }
  }}
>
  {height >= 20 && <span className={s.weekSlotName}>{slot.text}</span>}
  {height >= 32 && <span className={s.weekSlotTime}>{hh}:{mm}</span>}
</div>
```

Ersetzen durch (onClick/onDoubleClick kommen in Task 3):
```jsx
<div
  key={key}
  className={[
    s.weekSlotBlock,
    isTodo ? s.weekSlotTodo : '',
    (slot.done || slotTodo?.done) ? s.weekSlotDone : '',
    flashingSlotKey === `${dk}-${key}` ? s.weekSlotDoneFlash : '',
    (dragging?.dk === dk && dragging?.key === key) ? s.weekSlotDragging : '',
  ].join(' ')}
  style={{ top, height, '--slot-color': slot.color || '#8B5CF6' }}
>
  {height >= 14 && <span className={s.weekSlotName}>{slot.text}</span>}
</div>
```

*(Pointer-Handler folgt in Task 3 — der Block hat vorerst keinen onClick)*

- [ ] **Schritt 5: `hh`/`mm` Berechnung im Slot-Render entfernen**

In der Entries-Map (ca. Zeile 700) die nicht mehr benötigten Zeilen löschen:
```js
// Diese zwei Zeilen löschen:
const hh = String(Math.floor(parseFloat(key))).padStart(2, '0')
const mm = parseFloat(key) % 1 ? '30' : '00'
```

*(Sie werden nur noch für `weekSlotTime` gebraucht, das wir entfernt haben)*

- [ ] **Schritt 6: `dragging` State und `draggingRef` hinzufügen**

Nach den bestehenden States `flashingSlotKey` und `clickRipple`:
```js
const [dragging,    setDragging]    = useState(null)  // { dk, key, slot }
const [dragTarget,  setDragTarget]  = useState(null)  // { dk, key }
const draggingRef   = useRef(null)
const dragTargetRef = useRef(null)
const clickTimers   = useRef({})
```

- [ ] **Schritt 7: Build prüfen**

```bash
npm run build
```

Erwartung: Build ohne Fehler. Visuell: Blöcke sehen jetzt zentriert + Gradient aus, kompakter Abstand.

- [ ] **Schritt 8: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: SLOT_H 28px, Block-Redesign, colRefs, Drag-States"
```

---

## Task 3: Unified Pointer-Handler (Click / DblClick / Drag-Start)

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: `handleSlotTap` Handler nach `handleToggleSlotDone` einfügen**

```js
const handleSlotTap = (dk, key, slot, slotTodo) => {
  const ck = `${dk}-${key}`
  if (clickTimers.current[ck]) {
    clearTimeout(clickTimers.current[ck])
    delete clickTimers.current[ck]
    // Doppel-Tap → Edit
    if (slot.todoId) {
      const t = todos.find(td => td.id === slot.todoId)
      if (t) setEditingTodo(t)
    } else {
      setEditingTermin({ dk, slotKey: key, slot })
    }
  } else {
    clickTimers.current[ck] = setTimeout(() => {
      delete clickTimers.current[ck]
      // Einzel-Tap → Abhaken
      handleToggleSlotDone(dk, key, slot, slotTodo)
    }, 250)
  }
}
```

- [ ] **Schritt 2: `onPointerDown` auf `weekSlotBlock` hinzufügen**

Den Block-Div aus Task 2 (der noch keinen Handler hat) anpassen:

```jsx
<div
  key={key}
  className={[
    s.weekSlotBlock,
    isTodo ? s.weekSlotTodo : '',
    (slot.done || slotTodo?.done) ? s.weekSlotDone : '',
    flashingSlotKey === `${dk}-${key}` ? s.weekSlotDoneFlash : '',
    (dragging?.dk === dk && dragging?.key === key) ? s.weekSlotDragging : '',
  ].join(' ')}
  style={{ top, height, '--slot-color': slot.color || '#8B5CF6' }}
  onPointerDown={(e) => {
    e.stopPropagation()
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const startX = e.clientX
    const startY = e.clientY
    let dragStarted = false

    const onMove = (me) => {
      if (dragStarted) {
        updateDragTarget(me.clientX, me.clientY)
        return
      }
      if (Math.hypot(me.clientX - startX, me.clientY - startY) > 4) {
        dragStarted = true
        const ck = `${dk}-${key}`
        if (clickTimers.current[ck]) {
          clearTimeout(clickTimers.current[ck])
          delete clickTimers.current[ck]
        }
        draggingRef.current = { dk, key, slot }
        setDragging({ dk, key, slot })
      }
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (dragStarted) {
        if (dragTargetRef.current) {
          handleDrop(
            draggingRef.current.dk,
            draggingRef.current.key,
            draggingRef.current.slot,
            dragTargetRef.current.dk,
            dragTargetRef.current.key,
          )
        }
        draggingRef.current = null
        dragTargetRef.current = null
        setDragging(null)
        setDragTarget(null)
        dragJustEnded.current = true
        setTimeout(() => { dragJustEnded.current = false }, 50)
      } else {
        handleSlotTap(dk, key, slot, slotTodo)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }}
>
  {height >= 14 && <span className={s.weekSlotName}>{slot.text}</span>}
</div>
```

- [ ] **Schritt 3: Build prüfen**

```bash
npm run build
```

Erwartung: Build ohne Fehler.

- [ ] **Schritt 4: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: unified Pointer-Handler (tap/dblTap/drag-start)"
```

---

## Task 4: Drag & Drop — Target-Berechnung + Drop + Ghost

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: `updateDragTarget` Funktion nach `handleSlotTap` einfügen**

```js
const updateDragTarget = (clientX, clientY) => {
  for (const [colDk, el] of Object.entries(colRefs.current)) {
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (clientX >= rect.left && clientX <= rect.right) {
      const relY    = clientY - rect.top
      const idx     = Math.max(0, Math.floor(relY / SLOT_H))
      const h       = Math.min(visibleEnd - 0.5, visibleStart + idx * 0.5)
      const key     = String(h)
      dragTargetRef.current = { dk: colDk, key }
      setDragTarget({ dk: colDk, key })
      return
    }
  }
  dragTargetRef.current = null
  setDragTarget(null)
}
```

- [ ] **Schritt 2: `handleDrop` Funktion nach `updateDragTarget` einfügen**

```js
const handleDrop = (oldDk, oldKey, slot, newDk, newKey) => {
  if (oldDk === newDk && oldKey === newKey) return
  setDays(prev => {
    const oldDay = { ...(prev[oldDk] ?? {}) }
    delete oldDay[oldKey]
    return {
      ...prev,
      [oldDk]: oldDay,
      [newDk]: { ...(prev[newDk] ?? {}), [newKey]: { ...slot } },
    }
  })
  if (slot.todoId) {
    const hh = String(Math.floor(parseFloat(newKey))).padStart(2, '0')
    const mm = parseFloat(newKey) % 1 ? '30' : '00'
    setTodos(prev => prev.map(t =>
      t.id === slot.todoId
        ? { ...t, date: newDk, time: `${hh}:${mm}` }
        : t
    ))
  }
}
```

- [ ] **Schritt 3: Ghost-Block in `weekDayCol` rendern**

In der `weekDayCol`, direkt nach dem Ripple-Block und vor `{entries.map(...)}`:

```jsx
{dragTarget?.dk === dk && dragging && (() => {
  const ghostTop    = slotToTop(dragTarget.key, visibleStart)
  const ghostHeight = slotToHeight(dragging.slot.duration)
  return (
    <div
      className={s.weekSlotGhost}
      style={{
        top:           ghostTop,
        height:        ghostHeight,
        '--slot-color': dragging.slot.color || '#8B5CF6',
      }}
    >
      {ghostHeight >= 14 && (
        <span className={s.weekSlotName}>{dragging.slot.text}</span>
      )}
    </div>
  )
})()}
```

- [ ] **Schritt 4: Visuell testen**

1. `npm run dev` starten
2. Wochenansicht öffnen
3. **Drag innerhalb Tag:** Block anfassen, nach oben/unten ziehen → Ghost erscheint, loslassen → Block landet an neuer Zeit
4. **Drag zwischen Tagen:** Block auf andere Spalte ziehen → Ghost in neuer Spalte, Drop → Block erscheint am neuen Tag
5. **Todo nach Drag:** Wenn Todo-Slot gezogen, in Todo-Liste prüfen: `date` und `time` aktualisiert
6. **Klick noch funktioniert:** Kurz antippen → Todo abgehakt (Flash-Animation)
7. **Doppel-Tap:** Zweimal schnell antippen → Edit-Modal öffnet sich
8. **Kein Quick-Create nach Drag:** Nach Drop auf leere Fläche öffnet sich kein Modal

- [ ] **Schritt 5: Build prüfen**

```bash
npm run build
```

Erwartung: Build ohne Fehler.

- [ ] **Schritt 6: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: Drag & Drop für Wochenansicht (Zeit + Tag)"
```
