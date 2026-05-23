# Missed Review Modal — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verpasste Zeitplan-Einträge aus vergangenen Tagen werden einmal täglich in einem Modal gesammelt angezeigt, statt einzeln als ClockPopup oder still in den Pool zurückgelegt.

**Architecture:** Ein neuer `useMissedReview`-Hook sammelt beim App-Start alle unerledigten Items aus vergangenen Tagen und liefert State + Handler für das Modal. Das neue `MissedReviewModal` rendert die Liste mit Checkboxen und drei Aktionen (Erledigt / Ignorieren / In Pool verschieben). `TabHeute` bindet beides ein und entfernt die bisherige Auto-Return- und missedQueue-Logik.

**Tech Stack:** React 18, Zustand Store, CSS Modules, localStorage via `sv/lv/SK`

---

## Dateiübersicht

| Datei | Aktion |
|---|---|
| `src/features/calendar/TabHeute/useMissedReview.js` | Neu erstellen |
| `src/features/calendar/Zeitplan/MissedReviewModal.jsx` | Neu erstellen |
| `src/features/calendar/Zeitplan/MissedReviewModal.module.css` | Neu erstellen |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Modifizieren |
| `kontext/kern.md` | Modifizieren |

---

## Task 1: useMissedReview Hook

**Files:**
- Create: `src/features/calendar/TabHeute/useMissedReview.js`

- [ ] **Schritt 1: Hook erstellen**

Erstelle `src/features/calendar/TabHeute/useMissedReview.js` mit folgendem Inhalt:

```js
import { useEffect, useRef, useState, useCallback } from 'react'
import { todayKey } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { createBlock } from '../../todos/Block'

/**
 * Einmal pro Tag beim Mount: sammelt alle unerledigten Items aus vergangenen
 * Tagen und öffnet das MissedReview-Modal. Setzt SK.lastPoolReturn sobald
 * der Dialog abgeschlossen ist.
 *
 * Item-Typen:
 *  - 'text'  → text-only Slot ohne todoId
 *  - 'todo'  → Slot mit todoId + todo.awaitingClockResponse === true
 */
export function useMissedReview({ days, setDays, todos, setTodos }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const today = todayKey()
    if (lv(SK.lastPoolReturn, null) === today) return

    const collected = []

    Object.entries(days).forEach(([dk, dayData]) => {
      if (dk >= today || !dayData || typeof dayData !== 'object') return
      Object.entries(dayData).forEach(([slotKey, slot]) => {
        if (!slot || slot.done || slot.reviewed || !slot.text) return
        if (!slot.todoId) {
          collected.push({
            id: `${dk}|${slotKey}`,
            dateKey: dk,
            slotKey,
            text: slot.text,
            color: slot.color || '#8B5CF6',
            type: 'text',
          })
        } else {
          const todo = todos.find(t => t.id === slot.todoId)
          if (todo && !todo.done && todo.awaitingClockResponse) {
            collected.push({
              id: `${dk}|${slotKey}`,
              dateKey: dk,
              slotKey,
              text: todo.text,
              color: todo.color || '#8B5CF6',
              type: 'todo',
              todoId: todo.id,
            })
          }
        }
      })
    })

    if (collected.length > 0) {
      setItems(collected)
      setIsOpen(true)
    } else {
      sv(SK.lastPoolReturn, today)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Batch-Update für den days-Store: mehrere Slots in einem setDays-Aufruf patchen
  const applyDaysUpdates = useCallback((updates) => {
    // updates: [{ dateKey: string, slotKey: string, patch: object }]
    setDays(prev => {
      const next = { ...prev }
      updates.forEach(({ dateKey, slotKey, patch }) => {
        const dayData = next[dateKey]
        if (!dayData?.[slotKey]) return
        next[dateKey] = { ...dayData, [slotKey]: { ...dayData[slotKey], ...patch } }
      })
      return next
    })
  }, [setDays])

  // ── Erledigt ─────────────────────────────────────────────
  const handleDone = useCallback((selectedIds) => {
    const sel = items.filter(i => selectedIds.has(i.id))
    const todoIds = new Set(sel.filter(i => i.type === 'todo').map(i => i.todoId))

    if (todoIds.size > 0) {
      setTodos(prev => prev.map(t =>
        todoIds.has(t.id)
          ? { ...t, done: true, doneAt: new Date().toISOString(), awaitingClockResponse: false }
          : t
      ))
    }

    applyDaysUpdates(sel.map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey, patch: { done: true, reviewed: true },
    })))

    const remaining = items.filter(i => !selectedIds.has(i.id))
    setItems(remaining)
    if (remaining.length === 0) {
      sv(SK.lastPoolReturn, todayKey())
      setIsOpen(false)
    }
  }, [items, setTodos, applyDaysUpdates])

  // ── Ignorieren ───────────────────────────────────────────
  const handleIgnore = useCallback((selectedIds) => {
    const sel = items.filter(i => selectedIds.has(i.id))
    const todoIds = new Set(sel.filter(i => i.type === 'todo').map(i => i.todoId))

    if (todoIds.size > 0) {
      setTodos(prev => prev.map(t =>
        todoIds.has(t.id) ? { ...t, awaitingClockResponse: false } : t
      ))
    }

    applyDaysUpdates(sel.map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey, patch: { reviewed: true },
    })))

    const remaining = items.filter(i => !selectedIds.has(i.id))
    setItems(remaining)
    if (remaining.length === 0) {
      sv(SK.lastPoolReturn, todayKey())
      setIsOpen(false)
    }
  }, [items, setTodos, applyDaysUpdates])

  // ── In Pool verschieben ──────────────────────────────────
  const handleMoveToPool = useCallback(() => {
    const today = todayKey()
    const newTodos = items
      .filter(i => i.type === 'text')
      .map(i => createBlock({ text: i.text, color: i.color, priority: 3 }))
    const todoIdsToUpdate = new Set(items.filter(i => i.type === 'todo').map(i => i.todoId))

    setTodos(prev => {
      const updated = prev.map(t =>
        todoIdsToUpdate.has(t.id) ? { ...t, awaitingClockResponse: false } : t
      )
      return newTodos.length > 0 ? [...updated, ...newTodos] : updated
    })

    applyDaysUpdates(items.map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey, patch: { reviewed: true },
    })))

    sv(SK.lastPoolReturn, today)
    setIsOpen(false)
    setItems([])
  }, [items, setTodos, applyDaysUpdates])

  return { isOpen, items, handleDone, handleIgnore, handleMoveToPool }
}
```

- [ ] **Schritt 2: Manuell prüfen**

Datei existiert, kein Syntaxfehler, alle Imports zeigen auf existierende Pfade:
- `../../../utils` → `src/utils/index.js` ✓
- `../../../storage` → `src/storage/index.js` ✓
- `../../todos/Block` → `src/features/todos/Block.js` ✓

- [ ] **Schritt 3: Committen**

```bash
git add src/features/calendar/TabHeute/useMissedReview.js
git commit -m "feat: add useMissedReview hook"
```

---

## Task 2: MissedReviewModal — Komponente + Styles

**Files:**
- Create: `src/features/calendar/Zeitplan/MissedReviewModal.jsx`
- Create: `src/features/calendar/Zeitplan/MissedReviewModal.module.css`

- [ ] **Schritt 1: JSX-Komponente erstellen**

Erstelle `src/features/calendar/Zeitplan/MissedReviewModal.jsx`:

```jsx
import { useState, useCallback } from 'react'
import s from './MissedReviewModal.module.css'

// ─── Icon ────────────────────────────────────────────────
const CalendarIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

// ─── Helpers ──────────────────────────────────────────────
function formatSlotLabel(dateKey, slotKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const dayName = weekdays[date.getDay()]
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  const h = Math.floor(parseFloat(slotKey))
  const min = parseFloat(slotKey) % 1 !== 0 ? '30' : '00'
  return `${dayName} ${dd}.${mm} · ${String(h).padStart(2, '0')}:${min}`
}

// ─── MissedReviewModal ────────────────────────────────────
export default function MissedReviewModal({ items, onDone, onIgnore, onMoveToPool }) {
  const [selected, setSelected] = useState(new Set())

  const toggle = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const selectAll  = useCallback(() => setSelected(new Set(items.map(i => i.id))), [items])
  const selectNone = useCallback(() => setSelected(new Set()), [])

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

  if (!items.length) return null

  return (
    <div className={s.overlay}>
      <div className={s.modal}>

        {/* Header */}
        <div className={s.head}>
          <span className={s.icon}>{CalendarIcon}</span>
          <div>
            <p className={s.title}>Vergangene Ereignisse</p>
            <p className={s.subtitle}>
              {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'} nicht erledigt
            </p>
          </div>
        </div>

        {/* Liste */}
        <div className={s.list}>
          {items.map(item => (
            <div
              key={item.id}
              className={[s.item, selected.has(item.id) ? s.itemSelected : ''].join(' ')}
              onClick={() => toggle(item.id)}
              role="checkbox"
              aria-checked={selected.has(item.id)}
            >
              <span className={s.colorBar} style={{ background: item.color }} />
              <span className={[s.checkbox, selected.has(item.id) ? s.checkboxChecked : ''].join(' ')}>
                {selected.has(item.id) && <span className={s.checkmark}>✓</span>}
              </span>
              <div className={s.itemContent}>
                <span className={s.itemText}>{item.text}</span>
                <span className={s.itemMeta}>{formatSlotLabel(item.dateKey, item.slotKey)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Auswahl-Zeile */}
        <div className={s.selectRow}>
          <button className={s.selectBtn} onClick={selectAll}>Alle</button>
          <button className={s.selectBtn} onClick={selectNone}>Keine</button>
        </div>

        {/* Aktionen */}
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
        </div>

        {/* Footer */}
        <button className={s.poolBtn} onClick={onMoveToPool}>
          → In Pool verschieben
        </button>

      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: CSS erstellen**

Erstelle `src/features/calendar/Zeitplan/MissedReviewModal.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.modal {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  width: 100%;
  max-width: 440px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* ── Header ─────────────────────────────────────────────── */
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.icon {
  color: var(--primary);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.subtitle {
  font-size: 12px;
  color: var(--text-dim);
  margin: 3px 0 0;
}

/* ── Liste ───────────────────────────────────────────────── */
.list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  display: flex;
  flex-direction: column;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 10px 0;
  cursor: pointer;
  position: relative;
  transition: background 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.item:active,
.itemSelected {
  background: var(--surface);
}

.colorBar {
  width: 3px;
  align-self: stretch;
  border-radius: 2px;
  flex-shrink: 0;
  margin-left: 12px;
}

.checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s, border-color 0.12s;
}

.checkboxChecked {
  background: var(--primary);
  border-color: var(--primary);
}

.checkmark {
  font-size: 11px;
  color: #fff;
  line-height: 1;
  font-weight: 700;
}

.itemContent {
  flex: 1;
  min-width: 0;
}

.itemText {
  display: block;
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.itemMeta {
  display: block;
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}

/* ── Auswahl-Zeile ───────────────────────────────────────── */
.selectRow {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.selectBtn {
  font-size: 12px;
  color: var(--text-dim);
  background: none;
  border: none;
  padding: 4px 10px;
  border-radius: var(--r-sm);
  cursor: pointer;
  font-family: inherit;
}

.selectBtn:active {
  background: var(--surface);
  color: var(--text);
}

/* ── Aktions-Buttons ─────────────────────────────────────── */
.actions {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  flex-shrink: 0;
}

.btn {
  flex: 1;
  padding: 11px;
  border-radius: var(--r-sm);
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}

.btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.btnDone {
  background: rgba(16, 185, 129, 0.12);
  color: var(--emerald);
  border: 1px solid rgba(16, 185, 129, 0.22);
}

.btnIgnore {
  background: var(--surface);
  color: var(--text-dim);
  border: 1px solid var(--border);
}

/* ── Pool-Button ─────────────────────────────────────────── */
.poolBtn {
  width: 100%;
  padding: 15px;
  background: rgba(139, 92, 246, 0.18);
  color: var(--primary);
  border: none;
  border-top: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  flex-shrink: 0;
}

.poolBtn:active {
  background: rgba(139, 92, 246, 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .overlay, .modal { animation: none; }
}
```

- [ ] **Schritt 3: Committen**

```bash
git add src/features/calendar/Zeitplan/MissedReviewModal.jsx src/features/calendar/Zeitplan/MissedReviewModal.module.css
git commit -m "feat: add MissedReviewModal component"
```

---

## Task 3: TabHeute — alte Logik raus, neue einbinden

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: Imports anpassen**

Oben in `TabHeute.jsx` die Imports ändern:

**Entfernen:**
```js
import { createBlock } from '../../todos/Block'
import ClockPopup       from '../Zeitplan/ClockPopup'
```

**Hinzufügen (an deren Stelle):**
```js
import ClockPopup          from '../Zeitplan/ClockPopup'
import MissedReviewModal   from '../Zeitplan/MissedReviewModal'
import { useMissedReview } from './useMissedReview'
```

> Hinweis: `createBlock` wird nach dem Entfernen der Auto-Return-Logik nicht mehr in TabHeute benötigt.

- [ ] **Schritt 2: missedQueueRef und clockPopup-State — Zeile 23–31**

Aktuelle Zeilen 27–31:
```js
const promptedRef    = useRef(new Set())
const snoozeRef      = useRef({})
const daysRef        = useRef(days)
const tickRef        = useRef(null)
const missedQueueRef = useRef([])
```

Ersetzen durch (missedQueueRef entfernen):
```js
const promptedRef = useRef(new Set())
const snoozeRef   = useRef({})
const daysRef     = useRef(days)
const tickRef     = useRef(null)
```

- [ ] **Schritt 3: useMissedReview Hook einbinden — nach `const todaySlots = ...`**

Nach Zeile `const todaySlots = days[viewDate] ?? {}` einfügen:
```js
const { isOpen: missedOpen, items: missedItems, handleDone: missedDone, handleIgnore: missedIgnore, handleMoveToPool: missedToPool } = useMissedReview({ days, setDays, todos, setTodos })
```

- [ ] **Schritt 4: Auto-Return useEffect entfernen (Zeilen 59–104)**

Den gesamten Block entfernen:
```js
// ─── Auto-Return: unchecked Zeitplan-Einträge vergangener Tage → Pool ──
useEffect(() => {
  const today = todayKey()
  if (lv(SK.lastPoolReturn, null) === today) return
  // ... (gesamter Block bis sv(SK.lastPoolReturn, today))
}, [])
```

- [ ] **Schritt 5: showNextMissed Callback entfernen (Zeilen 138–148)**

Den gesamten Block entfernen:
```js
const showNextMissed = useCallback(() => {
  const next = missedQueueRef.current.shift()
  if (!next) return
  setClockPopup({ ... })
}, [])
```

- [ ] **Schritt 6: handleClockDone vereinfachen**

Aktuell (mit isMissed-Branch):
```js
const handleClockDone = useCallback(() => {
  if (!clockPopup) return
  if (clockPopup.isMissed) {
    setTodos(prev => prev.map(t =>
      t.id === clockPopup.todoId
        ? { ...t, done: true, doneAt: new Date().toISOString(), awaitingClockResponse: false }
        : t
    ))
  } else {
    handleToggleSlotDone(clockPopup.slotKey)
    const slot = todaySlots[clockPopup.slotKey]
    if (slot?.todoId) {
      setTodos(prev => prev.map(t =>
        t.id === slot.todoId ? { ...t, awaitingClockResponse: false } : t
      ))
    }
  }
  closeClockPopup()
  if (clockPopup.isMissed) setTimeout(() => showNextMissed(), 300)
}, [clockPopup, handleToggleSlotDone, todaySlots, setTodos, closeClockPopup, showNextMissed])
```

Ersetzen durch:
```js
const handleClockDone = useCallback(() => {
  if (!clockPopup) return
  handleToggleSlotDone(clockPopup.slotKey)
  const slot = todaySlots[clockPopup.slotKey]
  if (slot?.todoId) {
    setTodos(prev => prev.map(t =>
      t.id === slot.todoId ? { ...t, awaitingClockResponse: false } : t
    ))
  }
  closeClockPopup()
}, [clockPopup, handleToggleSlotDone, todaySlots, setTodos, closeClockPopup])
```

- [ ] **Schritt 7: handleMissedToPool entfernen**

Den gesamten Callback entfernen:
```js
const handleMissedToPool = useCallback(() => {
  if (!clockPopup?.isMissed) return
  setTodos(prev => prev.map(t =>
    t.id === clockPopup.todoId ? { ...t, awaitingClockResponse: false } : t
  ))
  closeClockPopup()
  setTimeout(() => showNextMissed(), 300)
}, [clockPopup, setTodos, closeClockPopup, showNextMissed])
```

- [ ] **Schritt 8: handleClockSnooze vereinfachen**

Aktuell (mit isMissed-Branch):
```js
const handleClockSnooze = useCallback(() => {
  if (!clockPopup) return
  if (clockPopup.isMissed) {
    closeClockPopup()
    setTimeout(() => showNextMissed(), 300)
    return
  }
  promptedRef.current.delete(clockPopup.slotKey)
  snoozeRef.current[clockPopup.slotKey] = Date.now() + 15 * 60 * 1000
  closeClockPopup()
}, [clockPopup, closeClockPopup, showNextMissed])
```

Ersetzen durch:
```js
const handleClockSnooze = useCallback(() => {
  if (!clockPopup) return
  promptedRef.current.delete(clockPopup.slotKey)
  snoozeRef.current[clockPopup.slotKey] = Date.now() + 15 * 60 * 1000
  closeClockPopup()
}, [clockPopup, closeClockPopup])
```

- [ ] **Schritt 9: JSX anpassen — MissedReviewModal hinzufügen, onToPool entfernen**

Im Return-Block des JSX:

`ClockPopup` aufräumen (kein `onToPool` mehr nötig):
```jsx
{clockPopup && (
  <ClockPopup
    slotText={clockPopup.slotText}
    isMissed={false}
    onDone={handleClockDone}
    onSnooze={handleClockSnooze}
    onShift={handleClockShift}
    onDismiss={closeClockPopup}
  />
)}
```

Direkt darunter das neue Modal hinzufügen:
```jsx
{missedOpen && (
  <MissedReviewModal
    items={missedItems}
    onDone={missedDone}
    onIgnore={missedIgnore}
    onMoveToPool={missedToPool}
  />
)}
```

- [ ] **Schritt 10: Nicht mehr verwendete Imports bereinigen**

Prüfen ob `lv` noch genutzt wird nach dem Entfernen der Auto-Return-Logik:
- `lv` wird noch in `useState(() => lv(SK.visStart, 8))` und `useState(() => lv(SK.visEnd, 20))` benutzt → bleibt
- `createBlock` wurde entfernt → Import ist weg (bereits in Schritt 1 erledigt)

- [ ] **Schritt 11: App starten und manuell testen**

```bash
npm run dev
```

Testszenarien:
1. **Kein verpasstes Item** → kein Modal, Pool normal, keine Fehler in Console
2. **Frisch installiert / leerer Store** → kein Modal
3. **Modal testen** (localStorage manipulieren für einen vergangenen Tag):
   - In DevTools Console: `localStorage.removeItem('adhs_view_last_pool_return')` + Seite neu laden
   - Falls `adhs_calendar_days` leer: testweise einen vergangenen Slot anlegen (s. unten)

Test-Slot anlegen in Console:
```js
const days = JSON.parse(localStorage.getItem('adhs_calendar_days') || '{}')
days['2026-05-20'] = { '9': { text: 'Test Todo', color: '#8B5CF6', duration: 30, locked: false, done: false } }
localStorage.setItem('adhs_calendar_days', JSON.stringify(days))
localStorage.removeItem('adhs_view_last_pool_return')
location.reload()
```

Erwartetes Ergebnis: Modal öffnet sich mit "Vergangene Ereignisse", 1 Eintrag "Test Todo".

4. **Erledigt:** Item auswählen → ✓ Erledigt klicken → Item verschwindet, wenn leer → Modal schließt, Todo im Pool als erledigt
5. **Ignorieren:** Item auswählen → ✕ Ignorieren klicken → Item verschwindet, nächster Reload zeigt es nicht mehr
6. **In Pool verschieben:** Ohne Aktion → "→ In Pool verschieben" → Modal schließt, Todo erscheint im Pool
7. **Gleichtägige ClockPopups** (Slot läuft während Session ab) → ClockPopup erscheint wie vorher, kein Modal

- [ ] **Schritt 12: Committen**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: replace auto-return + missedQueue with MissedReviewModal"
```

---

## Task 4: Kontext aktualisieren

**Files:**
- Modify: `kontext/kern.md`

- [ ] **Schritt 1: Slot-Format updaten**

In `kontext/kern.md` den Slot-Kommentar-Block erweitern:

Aktuell:
```js
{
  text:     "Todo-Text",
  color:    "#8B5CF6",
  duration: 30,
  locked:   false,
  done:     false,
  todoId:   123,
  subItems: [],
}
```

Ersetzen durch:
```js
{
  text:     "Todo-Text",
  color:    "#8B5CF6",
  duration: 30,
  locked:   false,
  done:     false,
  todoId:   123,         // optional, Referenz auf todos[]
  subItems: [],          // optional, [{ id, text, done }] — nur wenn kein todoId
  reviewed: false,       // true = wurde im MissedReviewModal behandelt, taucht nicht nochmal auf
}
```

- [ ] **Schritt 2: MissedReviewModal-Sektion ergänzen**

Am Ende von `kontext/kern.md` (vor oder nach den TabHeute-Features) einfügen:

```markdown
## MissedReviewModal — Logik

Läuft einmal pro Tag beim Mount von TabHeute (`useMissedReview`-Hook).

**Trigger:** `SK.lastPoolReturn !== todayKey()` UND es gibt Slots in `days[dk < today]` mit `!slot.done && !slot.reviewed`.

**Item-Typen:**
- `type: 'text'` — Slot ohne `todoId`, text-only
- `type: 'todo'` — Slot mit `todoId` wo `todo.awaitingClockResponse === true`

**Aktionen:**
- Erledigt → `slot.done = true`, `slot.reviewed = true`, todo: `done + doneAt + awaitingClockResponse: false`
- Ignorieren → `slot.reviewed = true`, todo: `awaitingClockResponse: false` (Todo bleibt im Pool)
- In Pool verschieben → text-type: neues Todo via `createBlock`, todo-type: `awaitingClockResponse: false`, alle Slots: `reviewed: true`, dann `SK.lastPoolReturn = today`

**Auto-close:** Modal schließt automatisch wenn nach Erledigt/Ignorieren keine Items mehr übrig.
```

- [ ] **Schritt 3: Committen**

```bash
git add kontext/kern.md
git commit -m "docs: update kern.md with reviewed slot field and MissedReviewModal"
```

---

## Fertig ✓

Nach allen 4 Tasks:
- Kein stilles Auto-Return mehr
- Keine einzelnen isMissed-ClockPopups mehr
- Einheitliches Modal für alle verpassten Items
- `reviewed`-Flag verhindert doppeltes Erscheinen
- Gleichtägige ClockPopups unverändert
