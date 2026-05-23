# Blocker / Zeitfenster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Farbige Zeitfenster-Blocker im Tagesplaner — als gerundete Karten die Slots visuell umrahmen, offen oder geblockt, mit Wiederholung und eigenem Modal.

**Architecture:** Blocker sind eine separate Datenstruktur (flaches Array im Store, getrennt von Todos/Slots). Die Zeitplan-Komponente gruppiert Hours in Sections (normal vs. Blocker-Karte) und rendert BlockerCard-Komponenten. TabHeute verwaltet Blocker-CRUD und öffnet BlockerModal über ein neues `+ Zeitfenster`-Button in den Zeitplan-Controls.

**Tech Stack:** React 18, Zustand, CSS Modules, Vite

---

## File Map

**Neu erstellen:**
- `src/features/calendar/Blocker/blockerUtils.js` — Pure Logik: createBlocker, getBlockersForDate, Hilfsfunktionen
- `src/features/calendar/Blocker/BlockerCard.jsx` — Karte die einen Zeitraum im Zeitplan umrahmt
- `src/features/calendar/Blocker/BlockerCard.module.css`
- `src/features/calendar/Blocker/BlockerModal.jsx` — Modal für Create/Edit
- `src/features/calendar/Blocker/BlockerModal.module.css`
- `src/features/calendar/Blocker/RepeatDeleteSheet.jsx` — Action Sheet beim Löschen einer wiederkehrenden Instanz
- `src/features/calendar/Blocker/RepeatDeleteSheet.module.css`
- `src/features/calendar/Zeitplan/SlotBlock.jsx` — Aus Zeitplan.jsx extrahiert
- `src/features/calendar/Zeitplan/SlotBlock.module.css`

**Modifizieren:**
- `src/storage/index.js` — SK.blockers hinzufügen
- `src/store/index.js` — blockers + setBlockers
- `src/features/calendar/Zeitplan/Zeitplan.jsx` — SlotBlock importieren, Blocker-Rendering, + Zeitfenster Button
- `src/features/calendar/Zeitplan/Zeitplan.module.css` — slotHandle Styles entfernen (nach SlotBlock.module.css)
- `src/features/calendar/TabHeute/TabHeute.jsx` — Blocker State + Modal verdrahten

---

## Task 1: Storage Key & Store

**Files:**
- Modify: `src/storage/index.js`
- Modify: `src/store/index.js`

- [ ] **Step 1: SK.blockers zu storage/index.js hinzufügen**

In `src/storage/index.js` nach `calView` einfügen:

```js
  calView:        `${PREFIX}view_cal_view`,
  blockers:       `${PREFIX}blockers`,
```

- [ ] **Step 2: blockers + setBlockers in store/index.js hinzufügen**

In `src/store/index.js` nach dem `setDays`/`setDoneCounters` Block einfügen:

```js
  // ─── Blockers ──────────────────────────────────────────
  blockers: lv(SK.blockers, []),
  setBlockers: (blockers) => {
    const next = typeof blockers === 'function' ? blockers(get().blockers) : blockers
    set({ blockers: next })
    sv(SK.blockers, next)
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/storage/index.js src/store/index.js
git commit -m "feat: add blockers storage key and store slice"
```

---

## Task 2: blockerUtils.js

**Files:**
- Create: `src/features/calendar/Blocker/blockerUtils.js`

- [ ] **Step 1: Datei erstellen**

```js
// src/features/calendar/Blocker/blockerUtils.js

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

// ─── Factory ──────────────────────────────────────────────
export const createBlocker = (partial = {}) => ({
  id:         genId(),
  text:       '',
  color:      '#3b82f6',
  startHour:  9,
  endHour:    17,
  locked:     false,
  date:       null,       // "2026-05-23" — für einmalige Blocker
  repeat:     null,       // { type: 'daily'|'workdays'|'weekly', days: [0-6] }
  endDate:    null,       // "2026-05-23" — Abschneidedatum für wiederkehrende
  exceptions: [],         // ["2026-05-23"] — übersprungene Instanzen
  ...partial,
})

// ─── Query ────────────────────────────────────────────────
// Gibt alle Blocker zurück die an dateStr aktiv sind
export function getBlockersForDate(allBlockers, dateStr) {
  if (!dateStr) return []
  const d   = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay() // 0=So, 1=Mo, ..., 6=Sa
  return allBlockers.filter(b => {
    if (b.exceptions?.includes(dateStr)) return false
    if (b.endDate && dateStr >= b.endDate) return false
    if (!b.repeat) return b.date === dateStr
    if (b.repeat.type === 'daily')    return true
    if (b.repeat.type === 'workdays') return dow >= 1 && dow <= 5
    if (b.repeat.type === 'weekly')   return b.repeat.days?.includes(dow) ?? false
    return false
  })
}

// Gibt den Blocker zurück der die Stunde hour (ganzzahlig) enthält, sonst null
export function getBlockerForHour(hour, blockersForDate) {
  return blockersForDate.find(b => hour >= b.startHour && hour < b.endHour) ?? null
}

// ─── Mutations (geben neue Objekte zurück, nie mutieren) ──
// Nur diese Instanz löschen — fügt dateStr zu exceptions hinzu
export function deleteBlockerInstance(blocker, dateStr) {
  return { ...blocker, exceptions: [...(blocker.exceptions ?? []), dateStr] }
}

// Diese und alle zukünftigen Instanzen löschen — setzt endDate
export function deleteBlockerFuture(blocker, dateStr) {
  return { ...blocker, endDate: dateStr }
}

// ─── Formatierung ─────────────────────────────────────────
// Dezimalstunde → "HH:MM" (9 → "09:00", 9.5 → "09:30")
export function formatHour(h) {
  const hh = Math.floor(h)
  const mm  = h % 1 === 0.5 ? '30' : '00'
  return `${String(hh).padStart(2, '0')}:${mm}`
}

// "HH:MM" → Dezimalstunde ("09:30" → 9.5)
export function parseHourStr(str) {
  const [h, m] = str.split(':').map(Number)
  return h + (m === 30 ? 0.5 : 0)
}

// Alle Slot-Keys einer Stunde (ganzzahlig): ["9", "9.5"]
export function hourSlotKeys(h) {
  return [String(h), `${h}.5`]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/calendar/Blocker/blockerUtils.js
git commit -m "feat: add blockerUtils with createBlocker, getBlockersForDate, helpers"
```

---

## Task 3: SlotBlock aus Zeitplan.jsx extrahieren

**Files:**
- Create: `src/features/calendar/Zeitplan/SlotBlock.jsx`
- Create: `src/features/calendar/Zeitplan/SlotBlock.module.css`
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`

- [ ] **Step 1: SlotBlock.module.css erstellen**

Die `.slotHandle`/`.slotHandleLocked` Styles aus `Zeitplan.module.css` in neue Datei übertragen:

```css
/* src/features/calendar/Zeitplan/SlotBlock.module.css */

.slotHandle {
  width: 34px;
  min-width: 34px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.18);
  cursor: grab;
  flex-shrink: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: color 0.15s, filter 0.15s;
}

.slotHandle:hover  { color: rgba(255, 255, 255, 0.45); }
.slotHandle:active { cursor: grabbing; }

.slotHandleLocked {
  cursor: pointer;
  color: var(--primary);
  filter: drop-shadow(0 0 5px rgba(139, 92, 246, 0.45));
}

.slotHandleLocked:hover {
  color: #c4b5fd;
  filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.65));
}

:global(.dnd-half-locked) .slotHandle,
:global(.dnd-half-locked) .slotHandleLocked {
  color: #c4b5fd;
  filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.9));
}
```

- [ ] **Step 2: SlotBlock.jsx erstellen**

LockIcon, DragIcon und SlotBlock-Komponente aus Zeitplan.jsx kopieren:

```jsx
// src/features/calendar/Zeitplan/SlotBlock.jsx
import { useRef } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import s from './SlotBlock.module.css'

const DragIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

function LockIcon({ locked }) {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
      <rect x="1" y="6" width="10" height="8" rx="2" fill="currentColor"/>
      {locked
        ? <path d="M3.5 6V4a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        : <path d="M3.5 5.5V4a2.5 2.5 0 015 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.45"/>
      }
    </svg>
  )
}

export default function SlotBlock({ slotKey, slot, todo, todos, setTodos, onToggleDone, onEdit, onRemove, onDragStart, onToggleLock, onSaveSlot }) {
  const displayTodo = {
    ...(todo ?? {
      id: null,
      text: slot.text || '',
      color: slot.color || '#8B5CF6',
      priority: slot.priority ?? 3,
      subItems: slot.subItems || [],
      date: null, time: null, category: null,
      duration: slot.duration || 30,
    }),
    done: !!(slot.done),
  }
  const chipStyle = { height: '100%', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.09)', margin: 0, flexShrink: 0 }

  const dragRef = useRef(null)

  const handlePointerDown = (e) => {
    e.preventDefault()
    const start = { x: e.clientX, y: e.clientY, moved: false, evt: e }
    dragRef.current = start

    const onMove = (me) => {
      if (start.moved) return
      const dx = me.clientX - start.x
      const dy = me.clientY - start.y
      if (Math.hypot(dx, dy) > 4 && onDragStart) {
        start.moved = true
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        onDragStart(start.evt)
      }
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (!start.moved) onToggleLock?.()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const handle = (
    <span
      className={[s.slotHandle, slot.locked ? s.slotHandleLocked : ''].join(' ')}
      onPointerDown={handlePointerDown}
    >
      {slot.locked ? <LockIcon locked={true} /> : DragIcon}
    </span>
  )

  return (
    <TodoChip
      todo={displayTodo}
      chipStyle={chipStyle}
      floatExpand={true}
      disableExpand={false}
      todos={todos}
      saveTodos={setTodos}
      saveItem={!todo ? (upd) => onSaveSlot?.(slotKey, { ...slot, subItems: upd.subItems }) : undefined}
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onRemove={onRemove}
      dragHandle={handle}
    />
  )
}
```

- [ ] **Step 3: LockIcon, DragIcon, SlotBlock aus Zeitplan.jsx entfernen, SlotBlock importieren**

In `Zeitplan.jsx`:
- Zeilen 1–119 (DragIcon, LockIcon, SlotBlock) entfernen
- Stattdessen am Anfang einfügen:

```js
import SlotBlock from './SlotBlock'
```

- [ ] **Step 4: slotHandle-Styles aus Zeitplan.module.css entfernen**

In `Zeitplan.module.css` die folgenden Blöcke entfernen (Zeilen 194–231):
```
/* ── Slot handle ── */
.slotHandle { ... }
.slotHandle:hover { ... }
.slotHandle:active { ... }
.slotHandleLocked { ... }
.slotHandleLocked:hover { ... }
:global(.dnd-half-locked) ... { ... }
```

- [ ] **Step 5: App starten und prüfen dass Zeitplan noch funktioniert**

```bash
npx vite
```

Prüfen: Zeitplan rendert, Todos können gezogen werden, Lock-Icon funktioniert.

- [ ] **Step 6: Commit**

```bash
git add src/features/calendar/Zeitplan/SlotBlock.jsx src/features/calendar/Zeitplan/SlotBlock.module.css src/features/calendar/Zeitplan/Zeitplan.jsx src/features/calendar/Zeitplan/Zeitplan.module.css
git commit -m "refactor: extract SlotBlock into own file"
```

---

## Task 4: BlockerCard

**Files:**
- Create: `src/features/calendar/Blocker/BlockerCard.jsx`
- Create: `src/features/calendar/Blocker/BlockerCard.module.css`

- [ ] **Step 1: BlockerCard.module.css erstellen**

```css
/* src/features/calendar/Blocker/BlockerCard.module.css */

.card {
  margin: 5px 0;
  border-radius: 12px;
  overflow: hidden;
  border-left-width: 3px;
  border-left-style: solid;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.name {
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
  flex: 1;
}

.time {
  font-family: 'Orbitron', monospace;
  font-size: 10px;
  opacity: 0.8;
}

.pill {
  font-family: 'Outfit', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 20px;
  padding: 2px 7px;
  margin-left: 4px;
  border-width: 1px;
  border-style: solid;
}

.pillOpen {
  background: rgba(59,130,246,0.2);
  border-color: rgba(59,130,246,0.4);
  color: rgba(100,180,255,0.9);
}

.pillLocked {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.35);
  color: rgba(255,120,100,0.9);
}

/* ── Internes Grid (identisch zu Zeitplan sgGrid) ── */
.body {
  display: grid;
  grid-template-columns: 28px 1fr;
  grid-auto-rows: 48px;
  overflow: visible;
}

.lbl {
  grid-column: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 5px;
  font-family: 'Outfit', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  color: rgba(255,255,255,0.28);
  border-right: 1px solid rgba(255,255,255,0.08);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  user-select: none;
}

.half {
  grid-column: 2;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: relative;
  overflow: visible;
  transition: background 0.12s;
  padding: 2px 3px 2px 2px;
}

.halfBot {
  border-bottom: 1px dashed rgba(255,255,255,0.04);
}

.empty {
  display: flex;
  align-items: center;
  padding-left: 6px;
  cursor: default;
  background: rgba(255,255,255,0.008);
  height: 100%;
}

.lockedEmpty {
  opacity: 0.3;
  pointer-events: none;
}

.halfTime {
  font-size: 0.54rem;
  color: rgba(255,255,255,0.07);
  font-family: 'Outfit', sans-serif;
  user-select: none;
}

.consumed {
  display: none;
}
```

- [ ] **Step 2: BlockerCard.jsx erstellen**

```jsx
// src/features/calendar/Blocker/BlockerCard.jsx
import SlotBlock from '../Zeitplan/SlotBlock'
import { formatHour } from './blockerUtils'
import s from './BlockerCard.module.css'

export default function BlockerCard({
  blocker,
  hours,
  slots,
  todos,
  setTodos,
  consumedKeys,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onToggleLock,
  onSetSlot,
  registerHalf,
  startSlotDrag,
  onEdit,
}) {
  const col = blocker.color

  const cardStyle = {
    border:          `1px solid ${col}55`,
    borderLeftColor: `${col}cc`,
    background:      `${col}0d`,
  }
  const headerStyle = {
    background:   `${col}2e`,
    borderBottom: `1px solid ${col}33`,
  }

  return (
    <div className={s.card} style={cardStyle}>
      {/* Header — Tap öffnet Edit */}
      <div className={s.header} style={headerStyle} onClick={onEdit}>
        <div className={s.dot} style={{ background: col }} />
        <span className={s.name}>{blocker.text || 'Zeitfenster'}</span>
        <span className={s.time} style={{ color: col }}>
          {formatHour(blocker.startHour)}–{formatHour(blocker.endHour)}
        </span>
        <span className={[s.pill, blocker.locked ? s.pillLocked : s.pillOpen].join(' ')}>
          {blocker.locked ? 'geblockt' : 'offen'}
        </span>
      </div>

      {/* Body: gleiches Grid wie Zeitplan */}
      <div className={s.body}>
        {hours.map((h, hi) => {
          const rowBase = hi * 2 + 1
          const topKey  = String(h)
          const botKey  = `${h}.5`
          const topSlot = slots[topKey]
          const botSlot = slots[botKey]
          const topConsumed = consumedKeys.has(topKey)
          const botConsumed = consumedKeys.has(botKey)
          const zoneType = blocker.locked ? 'locked' : 'empty'

          const topSpan = topSlot ? Math.ceil((topSlot.duration || 30) / 30) : 1
          const botSpan = botSlot ? Math.ceil((botSlot.duration || 30) / 30) : 1

          return [
            // Stunden-Label
            <div
              key={`lbl-${h}`}
              className={s.lbl}
              style={{ gridRow: `${rowBase} / span 2` }}
            >
              {String(h).padStart(2, '0')}
            </div>,

            // Obere Hälfte (:00)
            topConsumed
              ? <div key={`top-${h}`} className={s.consumed} />
              : topSlot
                ? <div
                    key={`top-${h}`}
                    className={s.half}
                    style={{ gridRow: topSpan > 1 ? `${rowBase} / span ${topSpan}` : String(rowBase) }}
                    ref={el => registerHalf?.(topKey, el, topSlot.locked ? 'locked' : 'occupied')}
                  >
                    <SlotBlock
                      slotKey={topKey}
                      slot={topSlot}
                      todo={todos.find(t => t.id === topSlot.todoId) || null}
                      todos={todos}
                      setTodos={setTodos}
                      onToggleDone={() => onToggleSlotDone?.(topKey)}
                      onEdit={() => {
                        const lt = todos.find(t => t.id === topSlot.todoId)
                        lt ? onEditTodo?.(lt.id) : onEditTodo?.(topKey)
                      }}
                      onRemove={() => onRemoveSlot?.(topKey, topSlot.text)}
                      onDragStart={startSlotDrag && !topSlot.locked ? (e) => startSlotDrag(topKey, e) : undefined}
                      onToggleLock={() => onToggleLock?.(topKey)}
                      onSaveSlot={onSetSlot}
                    />
                  </div>
                : <div
                    key={`top-${h}`}
                    className={[s.half, s.empty, blocker.locked ? s.lockedEmpty : ''].join(' ')}
                    style={{ gridRow: String(rowBase) }}
                    ref={el => registerHalf?.(topKey, el, zoneType)}
                  >
                    <span className={s.halfTime}>:00</span>
                  </div>,

            // Untere Hälfte (:30)
            botConsumed
              ? <div key={`bot-${h}`} className={s.consumed} />
              : botSlot
                ? <div
                    key={`bot-${h}`}
                    className={[s.half, s.halfBot].join(' ')}
                    style={{ gridRow: botSpan > 1 ? `${rowBase + 1} / span ${botSpan}` : String(rowBase + 1) }}
                    ref={el => registerHalf?.(botKey, el, botSlot.locked ? 'locked' : 'occupied')}
                  >
                    <SlotBlock
                      slotKey={botKey}
                      slot={botSlot}
                      todo={todos.find(t => t.id === botSlot.todoId) || null}
                      todos={todos}
                      setTodos={setTodos}
                      onToggleDone={() => onToggleSlotDone?.(botKey)}
                      onEdit={() => {
                        const lt = todos.find(t => t.id === botSlot.todoId)
                        lt ? onEditTodo?.(lt.id) : onEditTodo?.(botKey)
                      }}
                      onRemove={() => onRemoveSlot?.(botKey, botSlot.text)}
                      onDragStart={startSlotDrag && !botSlot.locked ? (e) => startSlotDrag(botKey, e) : undefined}
                      onToggleLock={() => onToggleLock?.(botKey)}
                      onSaveSlot={onSetSlot}
                    />
                  </div>
                : <div
                    key={`bot-${h}`}
                    className={[s.half, s.halfBot, s.empty, blocker.locked ? s.lockedEmpty : ''].join(' ')}
                    style={{ gridRow: String(rowBase + 1) }}
                    ref={el => registerHalf?.(botKey, el, zoneType)}
                  >
                    <span className={s.halfTime}>:30</span>
                  </div>,
          ].filter(Boolean)
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/calendar/Blocker/BlockerCard.jsx src/features/calendar/Blocker/BlockerCard.module.css
git commit -m "feat: add BlockerCard component"
```

---

## Task 5: RepeatDeleteSheet

**Files:**
- Create: `src/features/calendar/Blocker/RepeatDeleteSheet.jsx`
- Create: `src/features/calendar/Blocker/RepeatDeleteSheet.module.css`

- [ ] **Step 1: RepeatDeleteSheet.module.css erstellen**

```css
/* src/features/calendar/Blocker/RepeatDeleteSheet.module.css */

.overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0,0,0,0.62);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet {
  background: rgba(12,12,26,0.97);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px 20px 0 0;
  padding: 20px 16px 32px;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
  animation: slideUp 0.22s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.title {
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin-bottom: 4px;
}

.btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: rgba(255,255,255,0.9);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 13px 16px;
  text-align: left;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.btn:hover { background: rgba(255,255,255,0.1); }

.btnDelete {
  border-color: rgba(251,113,133,0.3);
  color: var(--rose);
}

.btnDelete:hover { background: rgba(251,113,133,0.08); }

.cancel {
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.35);
  padding: 8px;
  text-align: center;
  margin-top: 2px;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 2: RepeatDeleteSheet.jsx erstellen**

```jsx
// src/features/calendar/Blocker/RepeatDeleteSheet.jsx
import s from './RepeatDeleteSheet.module.css'

export default function RepeatDeleteSheet({ onDeleteThis, onDeleteFuture, onClose }) {
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <p className={s.title}>Zeitfenster löschen</p>
        <button className={s.btn} onClick={onDeleteThis}>
          Nur diesen löschen
        </button>
        <button className={[s.btn, s.btnDelete].join(' ')} onClick={onDeleteFuture}>
          Diesen und alle zukünftigen löschen
        </button>
        <button className={s.cancel} onClick={onClose}>Abbrechen</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/calendar/Blocker/RepeatDeleteSheet.jsx src/features/calendar/Blocker/RepeatDeleteSheet.module.css
git commit -m "feat: add RepeatDeleteSheet action sheet"
```

---

## Task 6: BlockerModal

**Files:**
- Create: `src/features/calendar/Blocker/BlockerModal.jsx`
- Create: `src/features/calendar/Blocker/BlockerModal.module.css`

- [ ] **Step 1: BlockerModal.module.css erstellen**

```css
/* src/features/calendar/Blocker/BlockerModal.module.css */

.overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0,0,0,0.62);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal {
  background: rgba(12,12,26,0.98);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px 20px 0 0;
  padding: 20px 16px 36px;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
  animation: slideUp 0.22s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.titleRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.titleInput {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: rgba(255,255,255,0.92);
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 12px;
  outline: none;
  transition: border-color 0.15s;
}

.titleInput:focus { border-color: var(--primary); }
.titleInput::placeholder { color: rgba(255,255,255,0.25); }

/* Farb-Dot neben Titel */
.colorDot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.2);
  cursor: pointer;
}

/* ── Zeile ── */
.row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rowLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
}

/* ── Zeitpicker ── */
.timeRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timeSelect {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: rgba(255,255,255,0.88);
  font-family: 'Orbitron', monospace;
  font-size: 0.9rem;
  padding: 9px 10px;
  outline: none;
  cursor: pointer;
  appearance: none;
  text-align: center;
}

.timeSelect:focus { border-color: var(--primary); }

.timeSep {
  color: rgba(255,255,255,0.3);
  font-size: 1.1rem;
  font-weight: 300;
}

/* ── Modus Toggle ── */
.modeRow {
  display: flex;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  overflow: hidden;
}

.modeBtn {
  flex: 1;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 10px 8px;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.modeBtn + .modeBtn { border-left: 1px solid rgba(255,255,255,0.1); }

.modeBtnOpen.modeActive {
  background: rgba(59,130,246,0.18);
  color: rgba(100,180,255,0.95);
}

.modeBtnLocked.modeActive {
  background: rgba(239,68,68,0.15);
  color: rgba(255,120,100,0.95);
}

/* ── Wiederholung Chips ── */
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 5px 12px;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.chipActive {
  background: rgba(139,92,246,0.18);
  border-color: var(--primary);
  color: var(--primary);
}

/* ── Wochentage ── */
.weekdays {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.dayBtn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.dayBtnActive {
  background: rgba(139,92,246,0.2);
  border-color: var(--primary);
  color: var(--primary);
}

/* ── Farb-Auswahl ── */
.colorGrid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.colorCircle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.12s, border-color 0.12s;
  flex-shrink: 0;
}

.colorCircleActive {
  border-color: rgba(255,255,255,0.8);
  transform: scale(1.18);
}

/* ── Aktions-Buttons ── */
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.saveBtn {
  background: var(--primary);
  border: none;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 13px;
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.saveBtn:disabled { opacity: 0.4; cursor: default; }

.deleteBtn {
  background: rgba(251,113,133,0.1);
  border: 1px solid rgba(251,113,133,0.25);
  border-radius: 12px;
  color: var(--rose);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 11px;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.deleteBtn:hover { background: rgba(251,113,133,0.16); }

.cancelBtn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  padding: 8px;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 2: BlockerModal.jsx erstellen**

```jsx
// src/features/calendar/Blocker/BlockerModal.jsx
import { useState } from 'react'
import { createBlocker, formatHour, parseHourStr } from './blockerUtils'
import { NEON } from '../../../utils'
import s from './BlockerModal.module.css'

// Stunden-Optionen 0..23 in 0.5er Schritten
const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 0.5)

const BLOCKER_COLORS = [
  '#3b82f6', '#8B5CF6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  ...NEON.slice(0, 4),
]

const REPEAT_OPTS = [
  { key: null,        label: 'Nie' },
  { key: 'daily',     label: 'Täglich' },
  { key: 'workdays',  label: 'Werktags' },
  { key: 'weekly',    label: 'Wöchentlich' },
]

const WEEKDAYS = [
  { dow: 1, label: 'Mo' },
  { dow: 2, label: 'Di' },
  { dow: 3, label: 'Mi' },
  { dow: 4, label: 'Do' },
  { dow: 5, label: 'Fr' },
  { dow: 6, label: 'Sa' },
  { dow: 0, label: 'So' },
]

export default function BlockerModal({ blocker = null, date, onSave, onDelete, onClose }) {
  const isNew = !blocker

  const [text,      setText]      = useState(blocker?.text      ?? '')
  const [startHour, setStartHour] = useState(blocker?.startHour ?? 9)
  const [endHour,   setEndHour]   = useState(blocker?.endHour   ?? 17)
  const [color,     setColor]     = useState(blocker?.color     ?? '#3b82f6')
  const [locked,    setLocked]    = useState(blocker?.locked    ?? false)
  const [repeatType, setRepeatType] = useState(blocker?.repeat?.type ?? null)
  const [repeatDays, setRepeatDays] = useState(blocker?.repeat?.days ?? [])

  const toggleDay = (dow) => {
    setRepeatDays(prev =>
      prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]
    )
  }

  const handleSave = () => {
    if (!text.trim()) return
    const repeat = repeatType
      ? { type: repeatType, days: repeatType === 'weekly' ? repeatDays : [] }
      : null
    const data = isNew
      ? createBlocker({ text: text.trim(), startHour, endHour, color, locked, date, repeat })
      : { ...blocker, text: text.trim(), startHour, endHour, color, locked, repeat }
    onSave(data)
    onClose()
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>

        {/* Titel + Farb-Dot */}
        <div className={s.titleRow}>
          <div
            className={s.colorDot}
            style={{ background: color }}
            title="Farbe"
          />
          <input
            className={s.titleInput}
            type="text"
            placeholder="Name des Zeitfensters…"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
            maxLength={40}
          />
        </div>

        {/* Zeitraum */}
        <div className={s.row}>
          <span className={s.rowLabel}>Zeitraum</span>
          <div className={s.timeRow}>
            <select
              className={s.timeSelect}
              value={startHour}
              onChange={e => setStartHour(Number(e.target.value))}
            >
              {HOUR_OPTIONS.filter(h => h < endHour).map(h => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
            <span className={s.timeSep}>→</span>
            <select
              className={s.timeSelect}
              value={endHour}
              onChange={e => setEndHour(Number(e.target.value))}
            >
              {HOUR_OPTIONS.filter(h => h > startHour).map(h => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Modus */}
        <div className={s.row}>
          <span className={s.rowLabel}>Modus</span>
          <div className={s.modeRow}>
            <button
              className={[s.modeBtn, s.modeBtnOpen, !locked ? s.modeActive : ''].join(' ')}
              onClick={() => setLocked(false)}
            >
              Offen
            </button>
            <button
              className={[s.modeBtn, s.modeBtnLocked, locked ? s.modeActive : ''].join(' ')}
              onClick={() => setLocked(true)}
            >
              Geblockt
            </button>
          </div>
        </div>

        {/* Farbe */}
        <div className={s.row}>
          <span className={s.rowLabel}>Farbe</span>
          <div className={s.colorGrid}>
            {BLOCKER_COLORS.map(c => (
              <button
                key={c}
                className={[s.colorCircle, color === c ? s.colorCircleActive : ''].join(' ')}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Wiederholung */}
        <div className={s.row}>
          <span className={s.rowLabel}>Wiederholung</span>
          <div className={s.chips}>
            {REPEAT_OPTS.map(opt => (
              <button
                key={String(opt.key)}
                className={[s.chip, repeatType === opt.key ? s.chipActive : ''].join(' ')}
                onClick={() => setRepeatType(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {repeatType === 'weekly' && (
            <div className={s.weekdays}>
              {WEEKDAYS.map(wd => (
                <button
                  key={wd.dow}
                  className={[s.dayBtn, repeatDays.includes(wd.dow) ? s.dayBtnActive : ''].join(' ')}
                  onClick={() => toggleDay(wd.dow)}
                >
                  {wd.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aktionen */}
        <div className={s.actions}>
          <button className={s.saveBtn} onClick={handleSave} disabled={!text.trim()}>
            {isNew ? 'Zeitfenster erstellen' : 'Speichern'}
          </button>
          {!isNew && (
            <button className={s.deleteBtn} onClick={() => onDelete(blocker)}>
              Zeitfenster löschen
            </button>
          )}
          <button className={s.cancelBtn} onClick={onClose}>Abbrechen</button>
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/calendar/Blocker/BlockerModal.jsx src/features/calendar/Blocker/BlockerModal.module.css
git commit -m "feat: add BlockerModal for create/edit"
```

---

## Task 7: Zeitplan — Blocker-Rendering & + Zeitfenster Button

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`

- [ ] **Step 1: Imports in Zeitplan.jsx anpassen**

Die bestehende React-Importzeile:
```js
import { useState, useCallback, useRef } from 'react'
```
ersetzen durch:
```js
import { useState, useCallback, useRef, useMemo } from 'react'
```

Danach die neuen Modul-Imports einfügen:
```js
import BlockerCard from '../Blocker/BlockerCard'
import { getBlockersForDate, getBlockerForHour } from '../Blocker/blockerUtils'
```

- [ ] **Step 2: Neue Props in Zeitplan-Signatur ergänzen**

```js
export default function Zeitplan({
  slots = {},
  todos = [],
  setTodos,
  visibleStart = 8,
  visibleEnd = 20,
  dateLabel,
  onSetSlot,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onShiftAll,
  onExpandUp,
  onExpandDown,
  onRemoveHour,
  onToggleLock,
  registerHalf,
  startSlotDrag,
  blockers = [],        // NEU
  onCreateBlocker,      // NEU — () => void
  onEditBlocker,        // NEU — (blocker) => void
}) {
```

- [ ] **Step 3: blockersForDate und sections berechnen**

`blockersForDate` muss VOR `hours` stehen (da hours es braucht). Direkt vor der `hours`-Zeile einfügen:

```js
  const blockersForDate = useMemo(
    () => getBlockersForDate(blockers, dateLabel),
    [blockers, dateLabel]
  )
```

`sections` kommt NACH `consumedKeys`. Dort einfügen:

```js
  // Stunden in Sections aufteilen: normal | blocker
  const sections = useMemo(() => {
    const result = []
    let normalBuf = []
    const handled = new Set()

    for (const h of hours) {
      const blocker = getBlockerForHour(h, blockersForDate)
      if (blocker) {
        if (!handled.has(blocker.id)) {
          if (normalBuf.length) {
            result.push({ type: 'normal', hours: normalBuf })
            normalBuf = []
          }
          const blockerHours = hours.filter(bh => bh >= blocker.startHour && bh < blocker.endHour)
          result.push({ type: 'blocker', blocker, hours: blockerHours })
          handled.add(blocker.id)
        }
        // Stunden innerhalb des Blockers überspringen — bereits in der Karte
      } else {
        normalBuf.push(h)
      }
    }
    if (normalBuf.length) result.push({ type: 'normal', hours: normalBuf })
    return result
  }, [hours, blockersForDate])
```

- [ ] **Step 4: hours-Berechnung anpassen (Blocker-Stunden immer einblenden)**

```js
  const hours = hideEmpty
    ? fullHours.filter(h =>
        slots[sk(h, false)] || slots[sk(h, true)] || !!getBlockerForHour(h, blockersForDate)
      )
    : rangeHours
```

- [ ] **Step 5: renderHourRows-Funktion extrahieren**

Die bestehende `hours.map(...)` Logik in eine lokale Hilfsfunktion verschieben die ein `hours`-Array entgegennimmt:

```js
  const renderHourRows = (hourList) => hourList.map((h, hi) => {
    const rowBase = hi * 2 + 1
    const topKey  = sk(h, false)
    const botKey  = sk(h, true)
    const topSlot = slots[topKey]
    const botSlot = slots[botKey]
    const isNowHour   = isNow && now.getHours() === h
    const topConsumed = consumedKeys.has(topKey)
    const botConsumed = consumedKeys.has(botKey)

    const topSpan = topSlot ? Math.ceil((topSlot.duration || 30) / 30) : 1
    const botSpan = botSlot ? Math.ceil((botSlot.duration || 30) / 30) : 1

    return [
      <div
        key={`lbl-${h}`}
        className={[s.sgLabel, isNowHour ? s.sgLabelNow : ''].join(' ')}
        style={{ gridRow: `${rowBase} / span 2` }}
      >
        {String(h).padStart(2, '0')}
      </div>,

      topConsumed
        ? <div key={`top-${h}`} className={s.sgConsumed} />
        : topSlot
          ? <div
              key={`top-${h}`}
              className={s.sgHalf}
              style={{ gridRow: topSpan > 1 ? `${rowBase} / span ${topSpan}` : String(rowBase) }}
              ref={el => registerHalf?.(topKey, el, topSlot.locked ? 'locked' : 'occupied')}
            >
              <SlotBlock
                slotKey={topKey}
                slot={topSlot}
                todo={todos.find(t => t.id === topSlot.todoId) || null}
                todos={todos}
                setTodos={setTodos}
                onToggleDone={() => onToggleSlotDone?.(topKey)}
                onEdit={() => {
                  const lt = todos.find(t => t.id === topSlot.todoId)
                  lt ? onEditTodo?.(lt.id) : onEditTodo?.(topKey)
                }}
                onRemove={() => openRemove(topKey, topSlot.text)}
                onDragStart={startSlotDrag && !topSlot.locked
                  ? (e) => startSlotDrag(topKey, e)
                  : undefined
                }
                onToggleLock={() => onToggleLock?.(topKey)}
                onSaveSlot={onSetSlot}
              />
            </div>
          : <div
              key={`top-${h}`}
              className={[s.sgHalf, s.sgEmpty, isNowHour ? s.sgNow : ''].join(' ')}
              style={{ gridRow: String(rowBase) }}
              ref={el => registerHalf?.(topKey, el, 'empty')}
            >
              <span className={s.halfTime}>:00</span>
            </div>,

      botConsumed
        ? <div key={`bot-${h}`} className={s.sgConsumed} />
        : botSlot
          ? <div
              key={`bot-${h}`}
              className={[s.sgHalf, s.sgHalfBot].join(' ')}
              style={{ gridRow: botSpan > 1 ? `${rowBase + 1} / span ${botSpan}` : String(rowBase + 1) }}
              ref={el => registerHalf?.(botKey, el, botSlot.locked ? 'locked' : 'occupied')}
            >
              <SlotBlock
                slotKey={botKey}
                slot={botSlot}
                todo={todos.find(t => t.id === botSlot.todoId) || null}
                todos={todos}
                setTodos={setTodos}
                onToggleDone={() => onToggleSlotDone?.(botKey)}
                onEdit={() => {
                  const lt = todos.find(t => t.id === botSlot.todoId)
                  lt ? onEditTodo?.(lt.id) : onEditTodo?.(botKey)
                }}
                onRemove={() => openRemove(botKey, botSlot.text)}
                onDragStart={startSlotDrag && !botSlot.locked
                  ? (e) => startSlotDrag(botKey, e)
                  : undefined
                }
                onToggleLock={() => onToggleLock?.(botKey)}
                onSaveSlot={onSetSlot}
              />
            </div>
          : <div
              key={`bot-${h}`}
              className={[s.sgHalf, s.sgHalfBot, s.sgEmpty].join(' ')}
              style={{ gridRow: String(rowBase + 1) }}
              ref={el => registerHalf?.(botKey, el, 'empty')}
            >
              <span className={s.halfTime}>:30</span>
            </div>,
    ].filter(Boolean)
  })
```

- [ ] **Step 6: slotsContainer-Render umbauen**

Den bisherigen `<div className={s.sgGrid}>{hours.map(...)}</div>` ersetzen durch:

```jsx
      <div className={s.slotsContainer}>
        {sections.map((sec, si) =>
          sec.type === 'normal'
            ? (
              <div key={`sec-${si}`} className={s.sgGrid}>
                {renderHourRows(sec.hours)}
              </div>
            )
            : (
              <BlockerCard
                key={sec.blocker.id}
                blocker={sec.blocker}
                hours={sec.hours}
                slots={slots}
                todos={todos}
                setTodos={setTodos}
                consumedKeys={consumedKeys}
                onToggleSlotDone={onToggleSlotDone}
                onEditTodo={onEditTodo}
                onRemoveSlot={(key, text) => openRemove(key, text)}
                onToggleLock={onToggleLock}
                onSetSlot={onSetSlot}
                registerHalf={registerHalf}
                startSlotDrag={startSlotDrag}
                onEdit={() => onEditBlocker?.(sec.blocker)}
              />
            )
        )}
      </div>
```

- [ ] **Step 7: + Zeitfenster Button in Controls hinzufügen**

Im `<div className={s.controls}>` Block nach dem `<div style={{ flex: 1 }} />` und vor dem viewToggle:

```jsx
        {onCreateBlocker && (
          <button className={s.blockerBtn} onClick={onCreateBlocker}>
            + Fenster
          </button>
        )}
```

- [ ] **Step 8: .blockerBtn Style in Zeitplan.module.css hinzufügen**

```css
.blockerBtn {
  padding: 5px 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 0.64rem;
  font-weight: 700;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.25);
  border-radius: 8px;
  color: rgba(100,180,255,0.7);
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.blockerBtn:hover {
  background: rgba(59,130,246,0.18);
  border-color: rgba(59,130,246,0.45);
  color: rgba(100,180,255,0.95);
}
```

- [ ] **Step 9: App starten und prüfen**

```bash
npx vite
```

Prüfen: Zeitplan rendert ohne Fehler, `+ Fenster` Button ist sichtbar (aber ohne Funktion solange TabHeute noch nicht verdrahtet ist).

- [ ] **Step 10: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.jsx src/features/calendar/Zeitplan/Zeitplan.module.css
git commit -m "feat: zeitplan renders blocker cards and has + Fenster button"
```

---

## Task 8: TabHeute verdrahten

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Step 1: Imports ergänzen**

```js
import { useAppStore } from '../../../store'
import BlockerModal      from '../Blocker/BlockerModal'
import RepeatDeleteSheet from '../Blocker/RepeatDeleteSheet'
import { deleteBlockerInstance, deleteBlockerFuture } from '../Blocker/blockerUtils'
```

- [ ] **Step 2: blockers + setBlockers aus Store holen**

In der Destructuring-Zeile:

```js
const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate, blockers, setBlockers } = useAppStore()
```

- [ ] **Step 3: Modal-State hinzufügen**

Nach `const [clockPopup, setClockPopup] = useState(null)`:

```js
const [blockerModal,      setBlockerModal]      = useState(null) // null | { blocker: null|object }
const [repeatDeleteSheet, setRepeatDeleteSheet] = useState(null) // null | { blocker, dateStr }
```

- [ ] **Step 4: Blocker CRUD Handler**

Nach `handleShiftAll`:

```js
  // ─── Blocker CRUD ──────────────────────────────────────
  const handleCreateBlocker = useCallback(() => {
    setBlockerModal({ blocker: null })
  }, [])

  const handleEditBlocker = useCallback((blocker) => {
    setBlockerModal({ blocker })
  }, [])

  const handleSaveBlocker = useCallback((data) => {
    setBlockers(prev =>
      prev.some(b => b.id === data.id)
        ? prev.map(b => b.id === data.id ? data : b)
        : [...prev, data]
    )
    setBlockerModal(null)
  }, [setBlockers])

  const handleDeleteBlocker = useCallback((blocker) => {
    if (blocker.repeat) {
      setRepeatDeleteSheet({ blocker, dateStr: viewDate })
    } else {
      setBlockers(prev => prev.filter(b => b.id !== blocker.id))
      setBlockerModal(null)
    }
  }, [setBlockers, viewDate])

  const handleRepeatDeleteThis = useCallback(() => {
    const { blocker, dateStr } = repeatDeleteSheet
    setBlockers(prev => prev.map(b => b.id === blocker.id ? deleteBlockerInstance(b, dateStr) : b))
    setRepeatDeleteSheet(null)
    setBlockerModal(null)
  }, [repeatDeleteSheet, setBlockers])

  const handleRepeatDeleteFuture = useCallback(() => {
    const { blocker, dateStr } = repeatDeleteSheet
    setBlockers(prev => prev.map(b => b.id === blocker.id ? deleteBlockerFuture(b, dateStr) : b))
    setRepeatDeleteSheet(null)
    setBlockerModal(null)
  }, [repeatDeleteSheet, setBlockers])
```

- [ ] **Step 5: Neue Props an Zeitplan übergeben**

In `<Zeitplan ... />`:

```jsx
      <Zeitplan
        slots={todaySlots}
        todos={todos}
        setTodos={setTodos}
        visibleStart={visStart}
        visibleEnd={visEnd}
        dateLabel={viewDate}
        onSetSlot={handleSetSlot}
        onToggleSlotDone={handleToggleSlotDone}
        onEditTodo={handleEdit}
        onRemoveSlot={handleRemoveSlot}
        onShiftAll={handleShiftAll}
        onExpandUp={handleExpandUp}
        onExpandDown={handleExpandDown}
        onRemoveHour={handleRemoveHour}
        onToggleLock={handleToggleLock}
        registerHalf={registerHalf}
        startSlotDrag={startSlotDrag}
        blockers={blockers}
        onCreateBlocker={handleCreateBlocker}
        onEditBlocker={handleEditBlocker}
      />
```

- [ ] **Step 6: Modals in JSX rendern**

Nach dem `{missedOpen && ...}` Block:

```jsx
      {blockerModal !== null && (
        <BlockerModal
          blocker={blockerModal.blocker}
          date={viewDate}
          onSave={handleSaveBlocker}
          onDelete={handleDeleteBlocker}
          onClose={() => setBlockerModal(null)}
        />
      )}

      {repeatDeleteSheet && (
        <RepeatDeleteSheet
          onDeleteThis={handleRepeatDeleteThis}
          onDeleteFuture={handleRepeatDeleteFuture}
          onClose={() => setRepeatDeleteSheet(null)}
        />
      )}
```

- [ ] **Step 7: App starten und vollständig testen**

```bash
npx vite
```

Folgende Abläufe prüfen:
1. `+ Fenster` Button öffnet BlockerModal
2. Zeitfenster erstellen (Name, Zeit, Farbe, Modus) → erscheint als farbige Karte im Zeitplan
3. Tap auf Karten-Header → BlockerModal mit vorausgefüllten Daten öffnet
4. Zeitfenster bearbeiten → gespeicherte Änderungen sofort sichtbar
5. Modus "Geblockt" → leere Slots innerhalb der Karte können kein Todo empfangen
6. Modus "Offen" → Todos können per Drag in die Slots innerhalb der Karte
7. Wiederholung "Täglich" → Zeitfenster erscheint auf anderen Tagen (DayNav nutzen)
8. Wiederholung "Wöchentlich" + Tage wählen → nur an gewählten Tagen sichtbar
9. Wiederkehrendes Zeitfenster löschen → RepeatDeleteSheet erscheint
10. "Nur diesen" → verschwindet nur heute, morgen noch vorhanden
11. "Diesen und alle zukünftigen" → ab heute weg, gestern noch vorhanden
12. Reload → Blocker überleben (localStorage)

- [ ] **Step 8: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: wire blocker CRUD into TabHeute"
```

---

## Fertig

Alle Blocker-Features sind implementiert. Kein weiterer Schritt nötig.
