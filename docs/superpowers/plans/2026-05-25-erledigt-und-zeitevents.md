# Erledigt-Umstrukturierung & Zeitbasierte Ereignisse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Heute erledigt" zieht komplett in den Kalender-DayPanel; ClockPopup wird durch ein batch-fähiges Tagesplaner-Modal (2 Varianten) ersetzt.

**Architecture:** Feature 1 bereinigt Pool.jsx (DoneChips raus, Kalender-Link rein) und erweitert DayPanel um ein Restore-Modal. Feature 2 löscht ClockPopup, schreibt `useMissedReview` zu `useTimeEvents` um (Variante 1: selber Tag, Variante 2: neuer Tag) und aktualisiert das MissedReviewModal mit per-Auswahl "Zurück in Pool"-Aktion.

**Tech Stack:** React 18 · Zustand (`useAppStore`) · CSS Modules · `sv/lv/SK` aus `storage/index.js` · `createBlock` aus `features/todos/Block.js`

---

## Datei-Übersicht

| Datei | Aktion |
|---|---|
| `src/features/calendar/Pool/Pool.jsx` | Modify — Tasks 1 + 7 |
| `src/features/calendar/Pool/Pool.module.css` | Modify — Task 1 |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Modify — Tasks 2 + 6 |
| `src/features/calendar/TabKalender/TabKalender.jsx` | Modify — Task 3 |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Modify — Task 3 |
| `src/features/calendar/TabHeute/useTimeEvents.js` | Create — Task 4 |
| `src/features/calendar/TabHeute/useMissedReview.js` | Delete — Task 8 |
| `src/features/calendar/Zeitplan/MissedReviewModal.jsx` | Modify — Task 5 |
| `src/features/calendar/Zeitplan/ClockPopup.jsx` | Delete — Task 8 |
| `kontext/kern.md` | Modify — Task 9 |

---

## Feature 1 — "Heute erledigt" Umstrukturierung

---

### Task 1: Pool — DoneChip entfernen, Kalender-Link hinzufügen

**Files:**
- Modify: `src/features/calendar/Pool/Pool.jsx`
- Modify: `src/features/calendar/Pool/Pool.module.css`

- [ ] **Schritt 1: DoneChip-Komponente und doneToday entfernen**

In `Pool.jsx`:
1. Die gesamte `DoneChip`-Funktion löschen (ca. Zeilen 81–99)
2. Das `doneToday`-useMemo löschen:
   ```js
   // LÖSCHEN:
   const doneToday = useMemo(() => {
     const today = todayKey()
     return todos.filter(t =>
       t.done &&
       t.doneAt?.startsWith(today) &&
       !pendingDoneIds.has(t.id)
     )
   }, [todos, pendingDoneIds])
   ```
3. Stattdessen `doneCount` einfügen (direkt nach `visiblePool`/`hasMore`):
   ```js
   const doneCount = useMemo(() => {
     const today = todayKey()
     return todos.filter(t =>
       t.done &&
       t.doneAt?.startsWith(today) &&
       !pendingDoneIds.has(t.id)
     ).length
   }, [todos, pendingDoneIds])
   ```

- [ ] **Schritt 2: `onDoneCalendar` Prop hinzufügen**

Prop-Signatur des Pool-Komponenten ergänzen:
```js
export default function Pool({
  todos = [],
  setTodos,
  todaySlots = {},
  onToggleDone,
  onEdit,
  onRemove,
  startDrag,
  onDoneCalendar,   // NEU
}) {
```

- [ ] **Schritt 3: "Erledigt heute"-Sektion durch Kalender-Link ersetzen**

Den gesamten `<div className={s.doneSection}>...</div>` Block (ca. Zeilen 269–291) ersetzen durch:
```jsx
{doneCount > 0 && (
  <button className={s.calLink} onClick={onDoneCalendar}>
    {doneCount} erledigt · <span className={s.calLinkAccent}>Kalender →</span>
  </button>
)}
```

- [ ] **Schritt 4: CSS hinzufügen**

In `Pool.module.css` ans Ende anfügen:
```css
.calLink {
  display: block;
  width: 100%;
  padding: 9px 16px;
  background: none;
  border: none;
  border-top: 1px solid rgba(255,255,255,0.05);
  font-family: inherit;
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  text-align: center;
  letter-spacing: 0.03em;
}
.calLinkAccent {
  color: var(--primary);
}
```

- [ ] **Schritt 5: Nun `handleUndo` und `handleCleanup` prüfen**

`handleUndo` verwendet `onToggleDone`. Da DoneChip weg ist, wird `handleUndo` nicht mehr aufgerufen. Prüfen ob es noch andere Verwendungsstellen gibt — wenn nicht, ebenfalls löschen.

`handleCleanup` (`setPendingDoneIds(new Set())`) bleibt — wird weiter vom "Aufräumen"-Button aufgerufen.

- [ ] **Schritt 6: Commit**
```bash
git add src/features/calendar/Pool/Pool.jsx src/features/calendar/Pool/Pool.module.css
git commit -m "feat: Pool zeigt Kalender-Link statt Erledigt-Sektion"
```

---

### Task 2: TabHeute — `onDoneCalendar` an Pool übergeben

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: Callback definieren**

In `TabHeute.jsx`, nach den anderen `useCallback`-Definitionen hinzufügen:
```js
const handleDoneCalendar = useCallback(() => {
  setCurrentTab(1)
}, [setCurrentTab])
```

- [ ] **Schritt 2: Prop an Pool übergeben**

In der Pool-JSX-Nutzung das neue Prop hinzufügen:
```jsx
<Pool
  todos={todos}
  setTodos={setTodos}
  todaySlots={todaySlots}
  onToggleDone={handleToggleDone}
  onEdit={handleEdit}
  onRemove={handleRemove}
  startDrag={startPoolDrag}
  onDoneCalendar={handleDoneCalendar}   {/* NEU */}
/>
```

- [ ] **Schritt 3: Manuell testen**

Dev-Server starten (`npm run dev`), ein Todo abhaken, "Aufräumen" drücken → Link "X erledigt · Kalender →" erscheint unten im Pool → Klick darauf → wechselt zu Tab 1 (Kalender).

- [ ] **Schritt 4: Commit**
```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: Pool-Kalender-Link navigiert zu Tab Kalender"
```

---

### Task 3: DayPanel — Restore-Modal für erledigte Todos

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

- [ ] **Schritt 1: `setTodos` aus Store holen**

In `TabKalender`, die useAppStore-Destructure erweitern:
```js
const { days, todos, birthdays = [], activeTools = [], toolColors = {}, setCurrentTab, setDayplanDate, setTodos } = useAppStore()
```

- [ ] **Schritt 2: `setTodos` an DayPanel übergeben**

DayPanel-Aufruf im JSX erweitern:
```jsx
<DayPanel
  dateKey={selectedDay}
  days={days}
  todos={todos}
  activeTools={activeTools}
  toolColors={toolColors}
  setCurrentTab={setCurrentTab}
  setDayplanDate={setDayplanDate}
  setTodos={setTodos}    {/* NEU */}
/>
```

- [ ] **Schritt 3: DayPanel-Signatur und Restore-State ergänzen**

In der `DayPanel`-Funktion (innerhalb TabKalender.jsx):
```js
function DayPanel({ dateKey, days, todos, activeTools, toolColors, setCurrentTab, setDayplanDate, setTodos }) {
  const [open, setOpen] = useState({ zeitplan: true, done: true, tools: true })
  const [restoreTodo, setRestoreTodo] = useState(null)   // NEU
  // ... Rest bleibt
```

- [ ] **Schritt 4: Restore-Funktion hinzufügen**

Direkt nach dem `restoreTodo`-State:
```js
const handleRestore = (todo) => {
  setTodos(prev => prev.map(t =>
    t.id === todo.id
      ? { ...t, done: false, doneAt: null, date: null, time: null }
      : t
  ))
  setRestoreTodo(null)
}
```

- [ ] **Schritt 5: Klick-Handler auf doneTodos**

In der "Abgehakte Todos"-Sektion den `onDoubleClick` durch `onClick` auf `setRestoreTodo` ersetzen:
```jsx
{doneTodos.map(t => (
  <div
    key={t.id}
    className={s.dayPanelTodoEntry}
    style={{ borderLeftColor: t.color || 'var(--primary)' }}
    onClick={() => setRestoreTodo(t)}    {/* onClick statt onDoubleClick */}
  >
    <span className={s.dayPanelCheck}>✓</span>
    <span className={s.dayPanelEntryText}>{t.text}</span>
  </div>
))}
```

- [ ] **Schritt 6: Restore-Modal JSX hinzufügen**

Am Ende der `DayPanel`-Return-Struktur (vor dem schließenden `</div>` des `dayPanel`-Containers):
```jsx
{restoreTodo && (
  <div className={s.restoreOverlay} onClick={() => setRestoreTodo(null)}>
    <div className={s.restoreModal} onClick={e => e.stopPropagation()}>
      <p className={s.restoreTitle}>Wiederherstellen?</p>
      <p className={s.restoreText}>{restoreTodo.text}</p>
      <div className={s.restoreActions}>
        <button className={s.restoreBtnYes} onClick={() => handleRestore(restoreTodo)}>
          Ja
        </button>
        <button className={s.restoreBtnNo} onClick={() => setRestoreTodo(null)}>
          Nein
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Schritt 7: CSS hinzufügen**

In `TabKalender.module.css` ans Ende anfügen:
```css
.restoreOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.restoreModal {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 24px 20px;
  width: min(320px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow-lg);
}
.restoreTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  text-align: center;
}
.restoreText {
  font-size: 13px;
  color: var(--text-dim);
  text-align: center;
  line-height: 1.4;
}
.restoreActions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.restoreBtnYes {
  flex: 1;
  padding: 10px;
  background: rgba(139,92,246,0.15);
  border: 1px solid rgba(139,92,246,0.35);
  border-radius: var(--r);
  color: var(--primary);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.restoreBtnNo {
  flex: 1;
  padding: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: var(--r);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
}
```

- [ ] **Schritt 8: Manuell testen**

Dev-Server, ein Todo abhaken → im Kalender Monatsansicht auf heute klicken → DayPanel öffnet → "Erledigt"-Sektion → erledigtes Todo antippen → Restore-Modal erscheint → "Ja" → Todo ist wieder im Pool (done=false, kein Datum).

Termin-Test: einen Termin (Todo mit date+time) erledigen → im DayPanel wiederherstellen → Termin ist als datumsloses Todo zurück.

- [ ] **Schritt 9: Commit**
```bash
git add src/features/calendar/TabKalender/TabKalender.jsx src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "feat: DayPanel Restore-Modal für erledigte Todos"
```

---

## Feature 2 — Zeitbasierte Ereignisse (ClockPopup-Ersatz)

---

### Task 4: `useTimeEvents` Hook erstellen

**Files:**
- Create: `src/features/calendar/TabHeute/useTimeEvents.js`

- [ ] **Schritt 1: Datei erstellen**

`src/features/calendar/TabHeute/useTimeEvents.js`:
```js
import { useEffect, useRef, useState, useCallback } from 'react'
import { todayKey } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { createBlock } from '../../todos/Block'

/**
 * Zwei Varianten der Zeitereingis-Abfrage:
 *
 * 'same-day' — beim Öffnen des Tagesplaners, heute abgelaufene Slots
 *   Ignorieren → slot.ignored = true  (kommt bei 'new-day' wieder)
 *
 * 'new-day'  — erster Start eines neuen Tages, alle offenen vergangenen Slots
 *   inkl. bisher ignorierter Items.
 *   Ignorieren → slot.reviewed = true (endgültig weg)
 */
export function useTimeEvents({ days, setDays, todos, setTodos }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [variant, setVariant] = useState(null) // 'same-day' | 'new-day'
  const ranRef    = useRef(false)
  const variantRef = useRef(null)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const today   = todayKey()
    const now     = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()

    // ── Variante 2: neuer Tag ──────────────────────────────
    if (lv(SK.lastPoolReturn, null) !== today) {
      const collected = []
      Object.entries(days).forEach(([dk, dayData]) => {
        if (dk >= today || !dayData || typeof dayData !== 'object') return
        Object.entries(dayData).forEach(([slotKey, slot]) => {
          if (!slot || slot.done || slot.reviewed || !slot.text) return
          // ignored = true → kommen hier trotzdem dran
          collected.push({
            id:      `${dk}|${slotKey}`,
            dateKey: dk,
            slotKey,
            text:    slot.text,
            color:   slot.color || '#8B5CF6',
            type:    slot.todoId ? 'todo' : 'text',
            todoId:  slot.todoId || null,
          })
        })
      })

      if (collected.length > 0) {
        setItems(collected)
        setVariant('new-day')
        variantRef.current = 'new-day'
        setIsOpen(true)
      } else {
        sv(SK.lastPoolReturn, today)
      }
      return
    }

    // ── Variante 1: selber Tag, abgelaufene Slots ──────────
    const dayData = days[today]
    if (!dayData) return

    const collected = []
    Object.entries(dayData).forEach(([slotKey, slot]) => {
      if (!slot || slot.done || slot.ignored || slot.reviewed || !slot.text) return
      const endMins = parseFloat(slotKey) * 60 + (slot.duration || 30)
      if (endMins > nowMins) return
      collected.push({
        id:      `${today}|${slotKey}`,
        dateKey: today,
        slotKey,
        text:    slot.text,
        color:   slot.color || '#8B5CF6',
        type:    slot.todoId ? 'todo' : 'text',
        todoId:  slot.todoId || null,
      })
    })

    if (collected.length > 0) {
      setItems(collected)
      setVariant('same-day')
      variantRef.current = 'same-day'
      setIsOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Batch-Update für days-Store
  const applyDaysUpdates = useCallback((updates) => {
    setDays(prev => {
      const next = { ...prev }
      updates.forEach(({ dateKey, slotKey, patch }) => {
        const d = next[dateKey]
        if (!d?.[slotKey]) return
        next[dateKey] = { ...d, [slotKey]: { ...d[slotKey], ...patch } }
      })
      return next
    })
  }, [setDays])

  // Schließt Modal wenn Liste leer; speichert SK.lastPoolReturn bei new-day
  const finish = useCallback((remaining) => {
    setItems(remaining)
    if (remaining.length === 0) {
      if (variantRef.current === 'new-day') sv(SK.lastPoolReturn, todayKey())
      setIsOpen(false)
      setVariant(null)
      variantRef.current = null
    }
  }, [])

  // ── Erledigt ─────────────────────────────────────────────
  const handleDone = useCallback((selectedIds) => {
    const sel      = items.filter(i => selectedIds.has(i.id))
    const todoIds  = new Set(sel.filter(i => i.type === 'todo').map(i => i.todoId))

    if (todoIds.size > 0) {
      setTodos(prev => prev.map(t =>
        todoIds.has(t.id)
          ? { ...t, done: true, doneAt: new Date().toISOString(), awaitingClockResponse: false }
          : t
      ))
    }
    applyDaysUpdates(sel.map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey,
      patch: { done: true, reviewed: true },
    })))
    finish(items.filter(i => !selectedIds.has(i.id)))
  }, [items, setTodos, applyDaysUpdates, finish])

  // ── Ignorieren ───────────────────────────────────────────
  const handleIgnore = useCallback((selectedIds) => {
    const sel = items.filter(i => selectedIds.has(i.id))
    const patch = variantRef.current === 'same-day'
      ? { ignored: true }                          // kommt bei new-day wieder
      : { ignored: false, reviewed: true }         // endgültig weg

    applyDaysUpdates(sel.map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey, patch,
    })))
    finish(items.filter(i => !selectedIds.has(i.id)))
  }, [items, applyDaysUpdates, finish])

  // ── Zurück in Pool ───────────────────────────────────────
  const handleMoveToPool = useCallback((selectedIds) => {
    const sel         = items.filter(i => selectedIds.has(i.id))
    const textItems   = sel.filter(i => i.type === 'text')
    const todoIds     = new Set(sel.filter(i => i.type === 'todo').map(i => i.todoId))
    const newTodos    = textItems.map(i => createBlock({ text: i.text, color: i.color, priority: 3 }))

    if (newTodos.length > 0 || todoIds.size > 0) {
      setTodos(prev => {
        const updated = todoIds.size > 0
          ? prev.map(t => todoIds.has(t.id) ? { ...t, awaitingClockResponse: false } : t)
          : prev
        return newTodos.length > 0 ? [...updated, ...newTodos] : updated
      })
    }

    // Slots entfernen (nicht nur reviewed setzen)
    setDays(prev => {
      const next = { ...prev }
      sel.forEach(({ dateKey, slotKey }) => {
        const d = next[dateKey]
        if (!d?.[slotKey]) return
        const newDay = { ...d }
        delete newDay[slotKey]
        next[dateKey] = newDay
      })
      return next
    })

    finish(items.filter(i => !selectedIds.has(i.id)))
  }, [items, setTodos, setDays, finish])

  return { isOpen, variant, items, handleDone, handleIgnore, handleMoveToPool }
}
```

- [ ] **Schritt 2: Commit**
```bash
git add src/features/calendar/TabHeute/useTimeEvents.js
git commit -m "feat: useTimeEvents Hook (Variante 1 + 2)"
```

---

### Task 5: MissedReviewModal überarbeiten

**Files:**
- Modify: `src/features/calendar/Zeitplan/MissedReviewModal.jsx`

- [ ] **Schritt 1: `variant` Prop + Header-Texte**

Komponenten-Signatur und Header anpassen:
```jsx
export default function MissedReviewModal({ items, variant, onDone, onIgnore, onMoveToPool }) {
```

Header-Bereich ersetzen (den `<div className={s.head}>...</div>` Block):
```jsx
<div className={s.head}>
  <span className={s.icon}>{CalendarIcon}</span>
  <div>
    <p className={s.title}>
      {variant === 'new-day' ? 'Offene Ereignisse — gestern' : 'Abgelaufene Ereignisse'}
    </p>
    <p className={s.subtitle}>
      {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'} offen
    </p>
  </div>
</div>
```

- [ ] **Schritt 2: Aktions-Callbacks auf `selectedIds` umstellen**

Alle drei Handler arbeiten auf der aktuellen Auswahl:
```js
const handleDone = useCallback(() => {
  if (selected.size === 0) return
  onDone(selected)
  setSelected(new Set())
}, [selected, onDone])

const handleIgnore = useCallback(() => {
  if (selected.size === 0) return
  onIgnore(selected)
  setSelected(new Set())
}, [selected, onIgnore])

const handleMoveToPool = useCallback(() => {
  if (selected.size === 0) return
  onMoveToPool(selected)
  setSelected(new Set())
}, [selected, onMoveToPool])
```

- [ ] **Schritt 3: "Zurück in Pool" als dritter Aktions-Button ersetzen den globalen poolBtn**

Den `<div className={s.actions}>` Block und den `<button className={s.poolBtn}>` ersetzen durch:
```jsx
<div className={s.actions}>
  <button
    className={[s.btn, s.btnDone].join(' ')}
    onClick={handleDone}
    disabled={selected.size === 0}
  >
    ✓ Erledigt
  </button>
  <button
    className={[s.btn, s.btnIgnore].join(' ')}
    onClick={handleIgnore}
    disabled={selected.size === 0}
  >
    ✕ Ignorieren
  </button>
  <button
    className={[s.btn, s.btnPool].join(' ')}
    onClick={handleMoveToPool}
    disabled={selected.size === 0}
  >
    ↩ In Pool
  </button>
</div>
```

Der alte `<button className={s.poolBtn}>` Footer-Button wird **gelöscht**.

- [ ] **Schritt 4: `.btnPool` CSS hinzufügen**

In `MissedReviewModal.module.css` einen Stil für den neuen Button ergänzen (analog `.btnIgnore`, nur andere Farbe):
```css
.btnPool {
  flex: 1;
  padding: 10px 0;
  border-radius: var(--r);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(20,184,166,0.12);
  border: 1px solid rgba(20,184,166,0.3);
  color: var(--teal);
}
.btnPool:disabled {
  opacity: 0.35;
  cursor: default;
}
```

Falls die `.actions`-Klasse noch `flex` mit zwei Elementen ist, sicherstellen dass 3 Buttons passen — ggf. `flex-wrap: wrap` setzen.

- [ ] **Schritt 5: Commit**
```bash
git add src/features/calendar/Zeitplan/MissedReviewModal.jsx
git commit -m "feat: MissedReviewModal mit 3 per-Auswahl-Aktionen und Variante-Header"
```

---

### Task 6: TabHeute — ClockPopup-Logik raus, `useTimeEvents` rein

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: Imports tauschen**

Ersetzen:
```js
import ClockPopup        from '../Zeitplan/ClockPopup'
// ...
import { useMissedReview } from './useMissedReview'
```
Durch:
```js
import { useTimeEvents } from './useTimeEvents'
```

- [ ] **Schritt 2: ClockPopup-State und Refs löschen**

Diese State/Ref-Deklarationen löschen:
```js
// LÖSCHEN:
const [clockPopup, setClockPopup] = useState(null)
const promptedRef = useRef(new Set())
const snoozeRef   = useRef({})
const tickRef     = useRef(null)
```

- [ ] **Schritt 3: Clock-Interval useEffect löschen**

Den gesamten `// ─── Clock interval ───` useEffect-Block löschen (ca. 30 Zeilen).

- [ ] **Schritt 4: Init-Effect für promptedRef löschen**

Den `// ─── Init: mark done slots as already prompted ───` useEffect-Block löschen.

- [ ] **Schritt 5: Clock-Handler löschen**

Diese Funktionen löschen:
```js
// LÖSCHEN:
const closeClockPopup   = ...
const handleClockDone   = ...
const handleClockSnooze = ...
const handleClockShift  = ...
```

- [ ] **Schritt 6: `useMissedReview` durch `useTimeEvents` ersetzen**

Ersetzen:
```js
const { isOpen: missedOpen, items: missedItems, handleDone: missedDone, handleIgnore: missedIgnore, handleMoveToPool: missedToPool } =
  useMissedReview({ days, setDays, todos, setTodos })
```
Durch:
```js
const { isOpen: teOpen, variant: teVariant, items: teItems, handleDone: teDone, handleIgnore: teIgnore, handleMoveToPool: teToPool } =
  useTimeEvents({ days, setDays, todos, setTodos })
```

- [ ] **Schritt 7: JSX aktualisieren**

Das `{clockPopup && <ClockPopup ... />}` Block löschen.

Das `{missedOpen && <MissedReviewModal ... />}` ersetzen durch:
```jsx
{teOpen && (
  <MissedReviewModal
    items={teItems}
    variant={teVariant}
    onDone={teDone}
    onIgnore={teIgnore}
    onMoveToPool={teToPool}
  />
)}
```

- [ ] **Schritt 8: Manuell testen**

Dev-Server starten. Sicherstellen:
- App baut ohne Fehler
- Einen Slot auf eine vergangene Zeit setzen (z.B. Slot 08:00, jetzt ist 12:00) → Tab verlassen + zurückkehren → Variante-1-Modal erscheint
- Items abhaken / ignorieren / in Pool → Liste leert sich → Modal schließt

- [ ] **Schritt 9: Commit**
```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: TabHeute nutzt useTimeEvents, ClockPopup-Logik entfernt"
```

---

### Task 7: Pool — `awaitingClockResponse`-Filter entfernen

**Files:**
- Modify: `src/features/calendar/Pool/Pool.jsx`

- [ ] **Schritt 1: Filter-Zeile löschen**

In der `activePool`-useMemo, die Zeile entfernen:
```js
// LÖSCHEN:
if (t.awaitingClockResponse) return false
```

Der verbleibende `undone`-Filter sieht dann so aus:
```js
const undone = todos.filter(t => {
  if (t.done) return false
  return true
}).filter(t => !isPlaced(t))
```

- [ ] **Schritt 2: Commit**
```bash
git add src/features/calendar/Pool/Pool.jsx
git commit -m "feat: awaitingClockResponse-Filter aus Pool entfernt"
```

---

### Task 8: ClockPopup und useMissedReview löschen

**Files:**
- Delete: `src/features/calendar/Zeitplan/ClockPopup.jsx`
- Delete: `src/features/calendar/Zeitplan/ClockPopup.module.css` (falls vorhanden)
- Delete: `src/features/calendar/TabHeute/useMissedReview.js`

- [ ] **Schritt 1: Dateien löschen**
```bash
rm src/features/calendar/Zeitplan/ClockPopup.jsx
rm src/features/calendar/TabHeute/useMissedReview.js
# Falls vorhanden:
rm src/features/calendar/Zeitplan/ClockPopup.module.css
```

- [ ] **Schritt 2: Build prüfen**
```bash
npm run build
```
Keine Fehler erwartet (Imports wurden in Task 6 bereits entfernt).

- [ ] **Schritt 3: Commit**
```bash
git add -A
git commit -m "chore: ClockPopup und useMissedReview gelöscht"
```

---

### Task 9: `kontext/kern.md` aktualisieren

**Files:**
- Modify: `kontext/kern.md`

- [ ] **Schritt 1: Slot-Format um `ignored` ergänzen**

Im Slot-Format-Block das `ignored`-Feld und die Deprecated-Markierung eintragen:
```js
// days["2024-01-15"]["8"] =
{
  text:     "Todo-Text",
  color:    "#8B5CF6",
  duration: 30,
  locked:   false,
  done:     false,
  todoId:   123,
  subItems: [],
  reviewed: false,      // true = behandelt, taucht nicht mehr auf
  ignored:  false,      // true = in Variante 1 ignoriert; kommt bei Variante 2 (neuer Tag) wieder
}
```

- [ ] **Schritt 2: `awaitingClockResponse` im Block-Format als deprecated markieren**

Im Block-Datentyp-Abschnitt:
```js
awaitingClockResponse: false,  // DEPRECATED — nicht mehr setzen; ClockPopup wurde entfernt
```

- [ ] **Schritt 3: MissedReviewModal-Abschnitt in kern.md aktualisieren**

Den `## MissedReviewModal — Logik`-Abschnitt ersetzen durch:

```markdown
## TimeEvents — Logik

Läuft beim Mount von TabHeute (`useTimeEvents`-Hook in `TabHeute/useTimeEvents.js`).

**Variante 1 — selber Tag:**
- Trigger: `viewDate === today` UND Slots heute mit `endzeit ≤ jetzt` + `!done && !ignored && !reviewed`
- Aktionen: Erledigt → `done=true, reviewed=true` · Ignorieren → `ignored=true` · In Pool → Slot löschen, ggf. Todo erstellen

**Variante 2 — neuer Tag:**
- Trigger: `SK.lastPoolReturn !== today`
- Zeigt: alle Slots aus `days[dk < today]` mit `!done && !reviewed` (inkl. `ignored=true`)
- Aktionen: Erledigt → wie V1 · Ignorieren → `reviewed=true` (endgültig) · In Pool → wie V1
- Abschluss: `sv(SK.lastPoolReturn, today)`

**Reihenfolge:** Variante 2 hat Priorität. Nie beide gleichzeitig.
```

- [ ] **Schritt 4: Commit**
```bash
git add kontext/kern.md
git commit -m "docs: kern.md mit ignored-Slot-Feld und useTimeEvents-Logik"
```

---

## Abschluss-Check

- [ ] `npm run build` — keine Fehler
- [ ] Pool zeigt Kalender-Link statt Erledigt-Sektion
- [ ] DayPanel: Klick auf erledigtes Todo → Restore-Modal → Ja stellt wieder her
- [ ] ClockPopup feuert nicht mehr
- [ ] Abgelaufener Slot heute → Tagesplaner öffnen → Variante-1-Modal
- [ ] Neuer Tag → Tagesplaner öffnen → Variante-2-Modal (inkl. früher ignorierte Items)
- [ ] `done: true`-Todos erscheinen in keinem Modal
