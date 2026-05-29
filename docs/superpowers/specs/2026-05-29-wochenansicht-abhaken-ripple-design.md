# Wochenansicht — Abhaken + Click-Ripple

**Datum:** 2026-05-29  
**Status:** Approved

---

## Ziel

Zwei Ergänzungen für die Wochenansicht:
1. **Abhaken** — Einzelklick auf beliebigen Slot (Todo oder Termin) → done toggeln, mit Flash-Animation
2. **Click-Ripple** — Klick auf leere Zeitgitter-Zelle → visuelles Klick-Feedback (Ripple) vor dem Quick-Create-Modal

---

## Feature A — Abhaken

### Verhalten

**Todo-Slot** (`slot.todoId` vorhanden):
- Einzelklick → toggle `todo.done`
  - Wird done: `done: true, doneAt: new Date().toISOString()` (→ auf heute gebucht)
  - Wird undone: `done: false, doneAt: null`
- Doppelklick → Edit-Modal (unverändert)

**Termin-Slot** (kein `todoId`):
- Einzelklick → toggle `days[dk][slotKey].done` direkt
  - Kein `doneAt`, kein Todo-Objekt betroffen
- Doppelklick → WeekTerminEditModal (unverändert)

**Kein Restore-Modal.** Einfaches Toggle in beide Richtungen.

### Animation

- State `flashingSlotKey: string | null` in `TabKalender`
- Bei Klick (→ done): `setFlashingSlotKey(\`${dk}-${key}\`)`, nach 650ms → `null`
- CSS `@keyframes weekDoneFlash`: Box-Shadow Glow (emerald) + leichter Scale
  ```css
  @keyframes weekDoneFlash {
    0%   { transform: scale(1);    box-shadow: 0 0 0 0   rgba(16,185,129,0);    }
    30%  { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(16,185,129,0.55); }
    100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(16,185,129,0);    }
  }
  .weekSlotDoneFlash { animation: weekDoneFlash 0.65s ease; }
  ```

### Done-Optik im Wochengitter

- Klasse `.weekSlotDone` auf dem Block wenn `(slot.done || slotTodo?.done)`
  ```css
  .weekSlotDone { opacity: 0.45; }
  .weekSlotDone .weekSlotName { text-decoration: line-through; }
  ```

---

## Feature B — Click-Ripple

### Verhalten

- Klick auf leere `weekDayCol`-Fläche (bestehender Quick-Create-Handler)
- Zusätzlich: Ripple-Kreis erscheint an der geklickten Position

### Implementierung

State: `clickRipple: { dk, x, y, id } | null`

In `onClick` (vor `setQuickCreate`):
```js
const rect = e.currentTarget.getBoundingClientRect()
const x = e.clientX - rect.left
const y = e.clientY - rect.top
const id = Date.now()
setClickRipple({ dk, x, y, id })
setTimeout(() => setClickRipple(r => r?.id === id ? null : r), 420)
```

Render: Innerhalb jeder `weekDayCol` wenn `clickRipple?.dk === dk`:
```jsx
<div
  className={s.weekClickRipple}
  style={{ left: clickRipple.x, top: clickRipple.y }}
/>
```

CSS:
```css
@keyframes weekRipple {
  from { transform: translate(-50%, -50%) scale(0);  opacity: 0.45; }
  to   { transform: translate(-50%, -50%) scale(1);  opacity: 0;    }
}
.weekClickRipple {
  position: absolute;
  width: 60px; height: 60px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.35);
  pointer-events: none;
  animation: weekRipple 0.42s ease-out forwards;
}
```

---

## Technische Änderungen

### `TabKalender.jsx`

- Neue States:
  - `flashingSlotKey: string | null`
  - `clickRipple: { dk, x, y, id } | null`
- `setDays` muss importiert/verfügbar sein (für Termin-Slot done-Toggle)
- `onClick` auf `weekSlotBlock`:
  - `e.stopPropagation()`
  - Wenn Todo-Slot: `setTodos(...)` mit toggle done/doneAt
  - Wenn Termin-Slot: `setDays(...)` mit toggle `slot.done`
  - Wenn `→ done`: `setFlashingSlotKey(\`${dk}-${key}\`)` + Timeout
- `onClick` auf `weekDayCol`: Ripple-State setzen + bisheriges Quick-Create
- Render: `weekSlotDoneFlash`-Klasse wenn `flashingSlotKey === \`${dk}-${key}\``
- Render: `weekSlotDone`-Klasse wenn `slot.done || slotTodo?.done`
- Render: `<div className={s.weekClickRipple}>` in `weekDayCol` wenn aktiv

### `TabKalender.module.css`

- `@keyframes weekDoneFlash`
- `.weekSlotDoneFlash`
- `.weekSlotDone`
- `.weekSlotDone .weekSlotName`
- `@keyframes weekRipple`
- `.weekClickRipple`

---

## Edge Cases

- **Klick auf done Todo-Slot → undone**: Keine Animation (Flash nur bei → done)
- **Sehr kleiner Slot (< 10px)**: Click-Event feuert trotzdem auf `weekSlotBlock`
- **`setDays` Verfügbarkeit**: Muss aus `useAppStore()` destructured werden (falls noch nicht)
- **Ripple + Modal gleichzeitig**: Ripple erscheint kurz, dann öffnet sich Modal — kein Konflikt
- **Mehrere Klicks schnell**: `id`-basiertes Cleanup verhindert Ripple-Hänger
