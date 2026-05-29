# Wochenansicht — Block-Redesign + Drag & Drop

**Datum:** 2026-05-29  
**Status:** Approved

---

## Ziel

Drei zusammenhängende Verbesserungen der Wochenansicht:
1. **Kompakteres Layout** — SLOT_H von 40px auf 28px
2. **Block-Redesign** — zentrierter Text, Gradient-Hintergrund, kein Uhrzeitlabel, besserer Done-Zustand
3. **Drag & Drop** — Blöcke per Pointer frei in Zeit und Tag verschieben (Touch + Maus)

---

## Feature 1: Kompaktes Layout

- `SLOT_H` Konstante: `40` → `28`
- Alle abhängigen Berechnungen (`slotToTop`, `slotToHeight`, `nowTop`, `scrollTo`) funktionieren automatisch über die Konstante
- `weekScrollBody`: `max-height` bleibt, visuell weniger Platz pro Slot

---

## Feature 2: Block-Redesign

### Optik (`.weekSlotBlock`)
- `background`: via CSS-Variable `--slot-bg` → `linear-gradient(135deg, var(--slot-color), color-mix(in srgb, var(--slot-color) 70%, #000))`
- `--slot-color` wird per inline-style gesetzt (statt `background` direkt)
- `align-items: center`, `justify-content: center`, `text-align: center`
- `box-shadow: 0 1px 6px color-mix(in srgb, var(--slot-color) 40%, transparent)`
- `border-radius: 6px`

### Text
- `.weekSlotName`: `font-size: 0.52rem`, zentriert, truncated
- `.weekSlotTime` entfernt — Zeit wird nicht mehr angezeigt
- Schwellwert für Anzeige: `height >= 16` (statt bisher `>= 20`)

### Done-Zustand (`.weekSlotDone`)
- `background: linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))` (grüner Tint)
- `border: 1px solid rgba(16,185,129,0.4)`
- `box-shadow: none`
- `opacity: 0.6`
- `::after`: `content: '✓'`, position absolute rechts, `color: #10B981`
- `.weekSlotName`: `text-decoration: line-through`, `color: rgba(255,255,255,0.5)`

---

## Feature 3: Drag & Drop

### Interaktion

**Start:** `pointerdown` auf `.weekSlotBlock`
- Pointer-Events capturen (`e.currentTarget.setPointerCapture(e.pointerId)`)
- Erst als "Drag" werten wenn Pointer > 4px bewegt wurde (sonst: normaler Click/DblClick)
- Drag-Threshold verhindert versehentliche Drags beim Abhaken/Doppelklick

**Während Drag:**
- `pointermove` auf dem Block → Zielposition berechnen
- Ziel-Spalte (Tag `dk`): aus `e.clientX` + `getBoundingClientRect()` der Spalten
- Ziel-Zeile (Zeit): aus `e.clientY` relativ zur Spalten-Top + `visibleStart` → nächster 0.5h-Slot
- `dragTarget: { dk, key }` State updaten → Ghost-Block rendern

**Ende:** `pointerup` → Drop committen

### State (in TabKalender)
```js
const [dragging,    setDragging]    = useState(null)  // { dk, key, slot }
const [dragTarget,  setDragTarget]  = useState(null)  // { dk, key }
```

### Visuals während Drag
- Original-Block: zusätzliche Klasse `.weekSlotDragging` → `opacity: 0.3`, gestrichelter Border
- Ghost-Block: separates `div.weekSlotGhost` an `dragTarget`-Position → pulsierender gestrichelter Border, `background: rgba(var(--slot-color), 0.2)`

### Store-Update beim Drop

```js
const handleDrop = (oldDk, oldKey, slot, newDk, newKey) => {
  // 1. Slot verschieben in days
  setDays(prev => {
    const oldDay = { ...prev[oldDk] }
    delete oldDay[oldKey]
    const newSlot = { ...slot }
    return {
      ...prev,
      [oldDk]: oldDay,
      [newDk]: { ...prev[newDk], [newKey]: newSlot },
    }
  })
  // 2. Todo-Datum/Zeit mitziehen wenn todoId vorhanden
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

### Spalten-Refs

Ein `colRefs` Map (`useRef({})`) — jede `weekDayCol` registriert sich mit `ref={el => colRefs.current[dk] = el}`. Beim `pointermove` werden die Rects der Spalten abgefragt um die Ziel-Spalte zu ermitteln.

### Edge Cases
- **Drop auf gleiche Position**: kein Update (oldDk === newDk && oldKey === newKey)
- **Drop außerhalb Grid**: `dragTarget === null` → kein Drop, Drag abbrechen
- **Termin-Slot ohne todoId**: nur `days` updaten, kein Todo-Update
- **Drag-Threshold**: Pointer muss > 4px bewegt werden bevor Drag startet — sonst feuert normaler `onClick` (Abhaken)
- **Touch**: `pointer-events: none` auf `.weekSlotDoneFlash` und `.weekClickRipple` bereits gesetzt ✓

---

## Bug Fix: Abhaken rückgängig

**Problem:** Bei bereits erledigten Todos (vor Session geladen) kann `slotTodo` beim Click stale sein — der onClick-Handler hat `slotTodo` aus dem Render-Scope, der sich nach `setTodos` aktualisiert. Bei normalem Single-Click sollte das korrekt funktionieren.

**Echter Bug:** Das `onClick` auf dem Block feuert auch wenn ein `onDoubleClick` folgt (zwei Single-Clicks vor dem DoubleClick-Event). Wenn jemand doppelklickt um zu bearbeiten, hackt der erste Klick vorher ab.

**Fix:** `useDoubleTap`-Pattern (wie in `TodoChip`) statt natives `onClick`/`onDoubleClick` trennen. Oder einfacher: Doppelklick-Detection via Timer — erster Click startet 250ms Timer, zweiter Click (innerhalb 250ms) cancelt Timer und feuert Edit statt Done.

**Implementierung:** `handleSlotClick(dk, key, slot, slotTodo)` mit internem Timer-Map `clickTimers` (useRef).

---

## Technische Änderungen

| Datei | Änderungen |
|---|---|
| `TabKalender.jsx` | SLOT_H → 28; colRefs; dragging/dragTarget States; handleDrop; Pointer-Handler auf Blocks; Ghost-Block Render; Slot-Click-Timer für Doppelklick-Trennung |
| `TabKalender.module.css` | weekSlotBlock Redesign; weekSlotDone neu; weekSlotDragging; weekSlotGhost + @keyframes; SLOT_H-abhängige Styles anpassen |
