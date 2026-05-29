# Wochenansicht Abhaken + Ripple Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einzelklick auf Wochenansicht-Slots → abhaken (mit Flash-Animation, auf heute gebucht); Klick auf leere Zelle → Ripple-Feedback.

**Architecture:** Zwei kleine Features rein in `TabKalender.jsx` + `TabKalender.module.css`. Keine neuen Komponenten. Slot-Abhaken nutzt denselben Store-Mechanismus wie der Tagesplaner (`setTodos` für Todo-Slots, `setDays` für Termin-Slots). Ripple ist ein kurzlebiger absolut-positionierter Div.

**Tech Stack:** React 18, CSS Modules, Zustand (`useAppStore`)

---

## Datei-Übersicht

| Datei | Was sich ändert |
|---|---|
| `src/features/calendar/TabKalender/TabKalender.jsx` | `setDays` zur Destructure hinzufügen; 2 neue States; onClick auf Slots; Ripple-State in weekDayCol-onClick; done-Klassen + Ripple-Div rendern |
| `src/features/calendar/TabKalender/TabKalender.module.css` | 4 neue Keyframes/Klassen: `weekDoneFlash`, `weekSlotDoneFlash`, `weekSlotDone`, `weekClickRipple` + `@keyframes weekRipple` |

---

## Task 1: CSS — Done-Flash + Ripple-Animationen

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

- [ ] **Schritt 1: Ende der CSS-Datei öffnen**

Die Datei endet aktuell nach den `.terminBtnCancel`-Styles. Dort anhängen.

- [ ] **Schritt 2: Done-Flash-Animation + Klassen ergänzen**

Direkt ans Ende der Datei anhängen:

```css
/* ─── Wochenansicht: Slot abhaken ─────────────────────────── */
@keyframes weekDoneFlash {
  0%   { transform: scale(1);    box-shadow: 0 0 0 0   rgba(16, 185, 129, 0);    }
  30%  { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.55); }
  100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(16, 185, 129, 0);    }
}

.weekSlotDoneFlash {
  animation: weekDoneFlash 0.65s ease;
}

.weekSlotDone {
  opacity: 0.45;
}

.weekSlotDone .weekSlotName {
  text-decoration: line-through;
}

/* ─── Wochenansicht: Click-Ripple ─────────────────────────── */
@keyframes weekRipple {
  from { transform: translate(-50%, -50%) scale(0); opacity: 0.45; }
  to   { transform: translate(-50%, -50%) scale(1); opacity: 0;    }
}

.weekClickRipple {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.35);
  pointer-events: none;
  animation: weekRipple 0.42s ease-out forwards;
}
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "style: done-flash + ripple animations für Wochenansicht"
```

---

## Task 2: State + Handler

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: `setDays` zur Store-Destructure hinzufügen**

Zeile 348 — aktuelle Destructure:
```js
const { days, todos, birthdays = [], activeTools = [], toolColors = {}, setCurrentTab, setDayplanDate, setTodos, calendarDate, setCalendarDate } = useAppStore()
```

Ersetzen durch:
```js
const { days, todos, birthdays = [], activeTools = [], toolColors = {}, setCurrentTab, setDayplanDate, setTodos, setDays, calendarDate, setCalendarDate } = useAppStore()
```

- [ ] **Schritt 2: Zwei neue States nach `quickCreate` hinzufügen**

Nach Zeile 369 (`const [quickCreate, setQuickCreate] = useState(null)`):
```js
const [flashingSlotKey, setFlashingSlotKey] = useState(null)
const [clickRipple,     setClickRipple]     = useState(null)
```

- [ ] **Schritt 3: `handleToggleSlotDone` Handler ergänzen**

Nach `handleSaveTermin` (nach Zeile 377), neuen Handler einfügen:
```js
const handleToggleSlotDone = (dk, key, slot, slotTodo) => {
  const compositeKey = `${dk}-${key}`
  if (slot.todoId && slotTodo) {
    const nowDone = !slotTodo.done
    if (nowDone) {
      setFlashingSlotKey(compositeKey)
      setTimeout(() => setFlashingSlotKey(k => k === compositeKey ? null : k), 650)
    }
    setTodos(prev => prev.map(t =>
      t.id === slotTodo.id
        ? { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
        : t
    ))
  } else {
    const nowDone = !slot.done
    if (nowDone) {
      setFlashingSlotKey(compositeKey)
      setTimeout(() => setFlashingSlotKey(k => k === compositeKey ? null : k), 650)
    }
    setDays(prev => ({
      ...prev,
      [dk]: { ...prev[dk], [key]: { ...slot, done: nowDone } },
    }))
  }
}
```

- [ ] **Schritt 4: Ripple-Logik in `weekDayCol` onClick ergänzen**

Den bestehenden `onClick` auf `weekDayCol` (Zeile ~641) ersetzen:

Aktuell:
```jsx
onClick={(e) => {
  if (e.target !== e.currentTarget) return
  const slotIndex = Math.floor(e.nativeEvent.offsetY / SLOT_H)
  const h  = visibleStart + slotIndex * 0.5
  const hh = String(Math.floor(h)).padStart(2, '0')
  const mm = h % 1 ? '30' : '00'
  setQuickCreate({ date: dk, time: `${hh}:${mm}` })
}}
```

Ersetzen durch:
```jsx
onClick={(e) => {
  if (e.target !== e.currentTarget) return
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
```

- [ ] **Schritt 5: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: state + handler für Slot-Abhaken und Click-Ripple"
```

---

## Task 3: Rendering

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: `onClick` auf `weekSlotBlock` hinzufügen + Done-Klassen**

Den bestehenden `weekSlotBlock`-Div (Zeile ~666) anpassen.

Aktuell:
```jsx
<div
  key={key}
  className={[s.weekSlotBlock, isTodo ? s.weekSlotTodo : ''].join(' ')}
  style={{ top, height, background: slot.color || 'var(--primary)' }}
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
```

Ersetzen durch:
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
```

- [ ] **Schritt 2: Ripple-Div in `weekDayCol` rendern**

Innerhalb des `weekDayCol`-Divs, nach dem `{isColToday && nowTop !== null && ...}` Block und vor `{entries.map(...)}`, einfügen:

```jsx
{clickRipple?.dk === dk && (
  <div
    className={s.weekClickRipple}
    style={{ left: clickRipple.x, top: clickRipple.y }}
  />
)}
```

- [ ] **Schritt 3: Visuell testen**

1. App starten (`npm run dev`)
2. Wochenansicht öffnen
3. **Abhaken:** Auf ein Todo-Slot klicken → grüner Glow-Flash + Slot wird halb-transparent + Text durchgestrichen. Nochmal klicken → zurück auf normal.
4. **Abhaken Termin:** Auf einen reinen Termin-Slot klicken → gleiche Optik.
5. **Ripple:** Auf leere Spalte klicken → violetter Ripple-Kreis erscheint kurz an der Klickposition, dann öffnet sich das Quick-Create-Modal.
6. **Doppelklick bleibt:** Doppelklick auf Todo-Slot → Edit-Modal öffnet sich (kein Abhaken).

- [ ] **Schritt 4: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: Wochenansicht Slot-Abhaken + Click-Ripple"
```
