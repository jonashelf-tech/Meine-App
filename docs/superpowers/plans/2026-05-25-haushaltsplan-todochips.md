# Haushaltsplan TodoChips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fällige Haushaltsaufgaben im Tagesplaner als expandierbare Raum-Chips anzeigen, mit Energie-Toggle, „Alle zur Todoliste"-Button, Haushalt-Counter-Rückkopplung beim Abhaken und Glow-Effekt für Tool-Todos.

**Architecture:** Block bekommt zwei neue Felder (`toolId`, `haushaltTaskIds`). HaushaltSection wird komplett auf Raum-Chips umgebaut. Wenn ein Block mit `haushaltTaskIds` abgehakt wird, setzt `handleToggleDone` (TabHeute) und `handleDone` (useTimeEvents) automatisch `lastDone` in haushaltData. TodoChip liest `toolColors` aus dem Store und zeigt einen Glow-Effekt für Tool-Todos.

**Tech Stack:** React 18, Zustand, CSS Modules, localStorage (via sv/lv/SK)

---

## Datei-Übersicht

| Datei | Änderung |
|---|---|
| `src/features/todos/Block.js` | `toolId` + `haushaltTaskIds` zu `createBlock` |
| `src/features/tools/haushalt/haushaltData.js` | `getDueRooms()` hinzufügen |
| `src/features/calendar/TabHeute/TabHeute.jsx` | `handleToggleDone` erweitern |
| `src/features/calendar/TabHeute/useTimeEvents.js` | `todos` param + `handleDone` erweitern |
| `src/features/tools/haushalt/HaushaltSection.jsx` | Komplett neu |
| `src/features/tools/haushalt/HaushaltSection.module.css` | Komplett neu |
| `src/components/TodoChip/TodoChip.jsx` | Glow-Effekt |

---

## Task 1: Block.js — toolId + haushaltTaskIds

**Files:**
- Modify: `src/features/todos/Block.js`

- [ ] **Schritt 1: createBlock erweitern**

Ersetze in `src/features/todos/Block.js` die `createBlock`-Funktion:

```js
export const createBlock = (partial = {}) => ({
  id:                    genId(),
  text:                  '',
  color:                 '#8B5CF6',
  priority:              3,
  duration:              null,
  done:                  false,
  doneAt:                null,
  date:                  null,
  time:                  null,
  repeat:                null,
  awaitingClockResponse: false,
  subItems:              [],
  category:              null,
  notes:                 null,
  createdAt:             new Date().toISOString(),
  toolId:                null,
  haushaltTaskIds:       [],
  ...partial,
})
```

- [ ] **Schritt 2: Browser-Check**

App auf `localhost:5173` öffnen → Tagesplaner → Pool. Kein Fehler in der Konsole. Bestehende Todos laden korrekt (neue Felder haben Default-Werte, stören nicht).

- [ ] **Schritt 3: Commit**

```bash
git add src/features/todos/Block.js
git commit -m "feat: Block bekommt toolId + haushaltTaskIds Felder"
```

---

## Task 2: haushaltData.js — getDueRooms()

**Files:**
- Modify: `src/features/tools/haushalt/haushaltData.js`

- [ ] **Schritt 1: getDueRooms hinzufügen**

Füge am Ende von `src/features/tools/haushalt/haushaltData.js` hinzu (nach `resetToDefaults`):

```js
// Räume mit mindestens einer wirklich fälligen Task (urgency >= 1.0).
// energie: 'normal' | 'low' — bei 'low' nur lowEnergy-Tasks.
export function getDueRooms(config, energie) {
  return config.rooms
    .map(room => ({
      room,
      dueTasks: room.tasks.filter(t =>
        taskUrgency(t) >= 1.0 &&
        (energie !== 'low' || t.lowEnergy)
      ),
    }))
    .filter(({ dueTasks }) => dueTasks.length > 0)
}
```

- [ ] **Schritt 2: Browser-Check**

App läuft ohne Fehler. Haushalt-Tab öffnen → kein Fehler.

- [ ] **Schritt 3: Commit**

```bash
git add src/features/tools/haushalt/haushaltData.js
git commit -m "feat: getDueRooms() für fällige Raum-Tasks"
```

---

## Task 3: TabHeute — handleToggleDone mit Haushalt-Rückkopplung

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: Import ergänzen**

In `src/features/calendar/TabHeute/TabHeute.jsx` die bestehenden Imports erweitern. Nach dem letzten Import-Block (vor `import s from ...`) einfügen:

```js
import { loadHaushalt, saveHaushalt, markTaskDone as haushaltMarkDone } from '../../tools/haushalt/haushaltData'
```

- [ ] **Schritt 2: handleToggleDone erweitern**

Ersetze `handleToggleDone` (aktuell ab Zeile 56):

```js
const handleToggleDone = useCallback((id) => {
  setTodos(prev => {
    const todo    = prev.find(t => t.id === id)
    const nowDone = !todo?.done
    if (nowDone && todo?.haushaltTaskIds?.length > 0) {
      const cfg     = loadHaushalt()
      const updated = todo.haushaltTaskIds.reduce(
        (c, tid) => haushaltMarkDone(c, tid), cfg
      )
      saveHaushalt(updated)
    }
    return prev.map(t =>
      t.id === id
        ? { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
        : t
    )
  })
}, [setTodos])
```

- [ ] **Schritt 3: Browser-Check**

Pool → Todo abhaken → kein Fehler. Dann ein normales Todo hin und her abhaken — funktioniert.

- [ ] **Schritt 4: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: handleToggleDone triggert Haushalt-Counter-Reset"
```

---

## Task 4: useTimeEvents — handleDone mit Haushalt-Rückkopplung

**Files:**
- Modify: `src/features/calendar/TabHeute/useTimeEvents.js`

- [ ] **Schritt 1: Import ergänzen**

In `src/features/calendar/TabHeute/useTimeEvents.js` nach dem letzten Import einfügen:

```js
import { loadHaushalt, saveHaushalt, markTaskDone as haushaltMarkDone } from '../../tools/haushalt/haushaltData'
```

- [ ] **Schritt 2: todos-Parameter entgegennehmen**

Ändere die Funktionssignatur von:
```js
export function useTimeEvents({ days, setDays, setTodos }) {
```
zu:
```js
export function useTimeEvents({ days, setDays, setTodos, todos = [] }) {
```

- [ ] **Schritt 3: handleDone erweitern**

Ersetze den `handleDone`-Callback (aktuell ab `const handleDone = useCallback`):

```js
const handleDone = useCallback((selectedIds) => {
  const sel     = items.filter(i => selectedIds.has(i.id))
  const todoIds = new Set(sel.filter(i => i.type === 'todo').map(i => i.todoId))

  if (todoIds.size > 0) {
    const haushaltIds = todos
      .filter(t => todoIds.has(t.id) && t.haushaltTaskIds?.length > 0)
      .flatMap(t => t.haushaltTaskIds)
    if (haushaltIds.length > 0) {
      const cfg     = loadHaushalt()
      const updated = haushaltIds.reduce((c, tid) => haushaltMarkDone(c, tid), cfg)
      saveHaushalt(updated)
    }

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
}, [items, todos, setTodos, applyDaysUpdates, finish])
```

- [ ] **Schritt 4: Browser-Check**

App läuft. TimeEvents-Modal (abgelaufene Slots) — kein Fehler in der Konsole.

- [ ] **Schritt 5: Commit**

```bash
git add src/features/calendar/TabHeute/useTimeEvents.js
git commit -m "feat: useTimeEvents handleDone triggert Haushalt-Counter-Reset"
```

---

## Task 5: HaushaltSection — Raum-Chips Redesign

**Files:**
- Modify: `src/features/tools/haushalt/HaushaltSection.jsx` (komplett neu)
- Modify: `src/features/tools/haushalt/HaushaltSection.module.css` (komplett neu)

- [ ] **Schritt 1: HaushaltSection.module.css ersetzen**

Ersetze den gesamten Inhalt von `src/features/tools/haushalt/HaushaltSection.module.css`:

```css
/* ── Energie-Strip ──────────────────────────────────────── */
.energieStrip {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.energieBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.45);
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.energieBtnActive {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.85);
}

/* ── Raum-Chips ─────────────────────────────────────────── */
.rooms {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.roomChip {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.chipHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}

.chipHeader:hover {
  background: rgba(255, 255, 255, 0.03);
}

.roomIcon {
  font-size: 1rem;
  flex-shrink: 0;
}

.roomName {
  flex: 1;
  font-family: 'Outfit', sans-serif;
  font-size: 0.84rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.duration {
  font-family: 'Outfit', sans-serif;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 600;
  flex-shrink: 0;
}

.roomDoneBtn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.06);
  color: rgba(16, 185, 129, 0.7);
  font-size: 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.roomDoneBtn:hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.6);
  color: var(--emerald);
}

.chevron {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

/* ── Task-Liste (expandiert) ────────────────────────────── */
.taskList {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.taskRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  -webkit-tap-highlight-color: transparent;
}

.taskRow:last-child {
  border-bottom: none;
}

.taskText {
  flex: 1;
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.65);
  min-width: 0;
  word-break: break-word;
}

.taskDuration {
  font-family: 'Outfit', sans-serif;
  font-size: 0.64rem;
  color: rgba(255, 255, 255, 0.28);
  flex-shrink: 0;
}

.taskDoneBtn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(16, 185, 129, 0.3);
  background: none;
  color: rgba(16, 185, 129, 0.6);
  font-size: 0.65rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.taskDoneBtn:hover {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.5);
}

/* ── Alle-Button ────────────────────────────────────────── */
.addAllBtn {
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.addAllBtn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.85);
}

/* ── Empty ──────────────────────────────────────────────── */
.empty {
  text-align: center;
  padding: 12px 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.35);
  font-family: 'Outfit', sans-serif;
}
```

- [ ] **Schritt 2: HaushaltSection.jsx ersetzen**

Ersetze den gesamten Inhalt von `src/features/tools/haushalt/HaushaltSection.jsx`:

```jsx
import { useState } from 'react'
import { useAppStore } from '../../../store'
import { sv, lv, SK } from '../../../storage'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { createBlock } from '../../todos/Block'
import {
  loadHaushalt, saveHaushalt,
  markTaskDone, getDueRooms, calcRingScore,
} from './haushaltData'
import s from './HaushaltSection.module.css'

const BoltIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const BatteryLowIcon = () => (
  <svg width={14} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="16" height="10" rx="2"/>
    <line x1="22" y1="11" x2="22" y2="13"/>
    <line x1="6" y1="12" x2="8" y2="12" strokeWidth={3}/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg
    width={10} height={10} viewBox="0 0 10 10"
    fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}
  >
    <polyline points="2 3 5 7 8 3"/>
  </svg>
)

export default function HaushaltSection() {
  const { setCurrentTab, setTodos, toolColors } = useAppStore()
  const [config,   setConfig]   = useState(() => loadHaushalt())
  const [energie,  setEnergie]  = useState(() => lv(SK.haushaltEnergie, 'normal'))
  const [expanded, setExpanded] = useState({})

  const updateConfig = (next) => { setConfig(next); saveHaushalt(next) }

  const handleEnergieChange = (val) => {
    setEnergie(val)
    sv(SK.haushaltEnergie, val)
  }

  const dueRooms = getDueRooms(config, energie)
  const score    = calcRingScore(config.rooms)
  const badgeBg  = score >= 70
    ? 'rgba(16,185,129,0.12)'
    : score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(251,113,133,0.12)'

  const handleTaskDone = (taskId) => updateConfig(markTaskDone(config, taskId))

  const handleRoomDone = (roomId) => {
    const entry = dueRooms.find(e => e.room.id === roomId)
    if (!entry) return
    const next = entry.dueTasks.reduce(
      (cfg, t) => markTaskDone(cfg, t.id), config
    )
    updateConfig(next)
  }

  const handleAddAll = () => {
    const toolColor = toolColors?.['haushalt'] ?? '#10B981'
    const blocks = dueRooms.map(({ room, dueTasks }) =>
      createBlock({
        text:            `${room.icon} ${room.name}`,
        duration:        dueTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
        subItems:        dueTasks.map(t => ({ id: crypto.randomUUID(), text: t.text, done: false })),
        color:           toolColor,
        toolId:          'haushalt',
        haushaltTaskIds: dueTasks.map(t => t.id),
      })
    )
    setTodos(prev => [...prev, ...blocks])
  }

  const toggleExpand = (roomId) =>
    setExpanded(p => ({ ...p, [roomId]: !p[roomId] }))

  return (
    <ToolSection
      toolId="haushalt"
      title="Haushalt"
      badge={`${score}%`}
      badgeBg={badgeBg}
      onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
    >
      {/* Energie-Toggle */}
      <div className={s.energieStrip}>
        <button
          className={[s.energieBtn, energie === 'normal' ? s.energieBtnActive : ''].join(' ')}
          onClick={() => handleEnergieChange('normal')}
        >
          <BoltIcon /> Normal
        </button>
        <button
          className={[s.energieBtn, energie === 'low' ? s.energieBtnActive : ''].join(' ')}
          onClick={() => handleEnergieChange('low')}
        >
          <BatteryLowIcon /> Low Energy
        </button>
      </div>

      {dueRooms.length === 0 ? (
        <div className={s.empty}>✨ Alles im Griff</div>
      ) : (
        <>
          <div className={s.rooms}>
            {dueRooms.map(({ room, dueTasks }) => {
              const totalMin = dueTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0)
              const isOpen   = !!expanded[room.id]
              return (
                <div key={room.id} className={s.roomChip}>
                  <div className={s.chipHeader} onClick={() => toggleExpand(room.id)}>
                    <span className={s.roomIcon}>{room.icon}</span>
                    <span className={s.roomName}>{room.name}</span>
                    {totalMin > 0 && (
                      <span className={s.duration}>{totalMin} min</span>
                    )}
                    <button
                      className={s.roomDoneBtn}
                      onClick={e => { e.stopPropagation(); handleRoomDone(room.id) }}
                      title="Alle erledigt"
                    >✓</button>
                    <span className={s.chevron}><ChevronIcon open={isOpen} /></span>
                  </div>

                  {isOpen && (
                    <div className={s.taskList}>
                      {dueTasks.map(task => (
                        <div key={task.id} className={s.taskRow}>
                          <span className={s.taskText}>{task.text}</span>
                          {task.duration > 0 && (
                            <span className={s.taskDuration}>{task.duration}min</span>
                          )}
                          <button
                            className={s.taskDoneBtn}
                            onClick={() => handleTaskDone(task.id)}
                            title="Erledigt"
                          >✓</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button className={s.addAllBtn} onClick={handleAddAll}>
            + Alle zur Todoliste
          </button>
        </>
      )}
    </ToolSection>
  )
}
```

- [ ] **Schritt 3: Browser-Check**

1. Tagesplaner öffnen → HaushaltSection ausklappen
2. Energie-Toggle wechseln → Chips aktualisieren sich
3. Raum-Chip antippen → expandiert → Tasks sichtbar
4. Task ✓ tippen → verschwindet aus der Liste
5. Raum-✓ tippen → alle Tasks des Raums weg → Chip verschwindet
6. „+ Alle zur Todoliste" → im Pool erscheinen neue Todos

- [ ] **Schritt 4: Commit**

```bash
git add src/features/tools/haushalt/HaushaltSection.jsx src/features/tools/haushalt/HaushaltSection.module.css
git commit -m "feat: HaushaltSection als Raum-Chips mit Energie-Toggle + Todoliste-Button"
```

---

## Task 6: TodoChip — Glow-Effekt für Tool-Todos

**Files:**
- Modify: `src/components/TodoChip/TodoChip.jsx`

- [ ] **Schritt 1: useAppStore import ergänzen**

In `src/components/TodoChip/TodoChip.jsx` nach den bestehenden Imports einfügen:

```js
import { useAppStore } from '../../store'
```

- [ ] **Schritt 2: toolColors aus Store lesen + Glow anwenden**

In der `TodoChip`-Komponente, nach `const color = todo.color || '#8B5CF6'` (Zeile 128), einfügen:

```js
const { toolColors } = useAppStore()
const glowColor = todo.toolId ? (toolColors?.[todo.toolId] ?? '#8B5CF6') : null
```

Dann das `<div className={...} style={...}>` des Chips (ab Zeile 151) so ändern:

```jsx
<div
  className={[
    s.chip,
    flashing  ? s.doneFlash : '',
    todo.done ? s.chipDone  : '',
    className || ''
  ].join(' ').trim()}
  style={{
    '--chip-color': todo.done ? 'rgba(0,255,148,0.15)' : color,
    ...(glowColor && !todo.done ? {
      boxShadow: `0 0 0 1.5px ${glowColor}, 0 0 14px ${glowColor}44`,
    } : {}),
    ...(chipStyle || {}),
  }}
>
```

- [ ] **Schritt 3: Browser-Check**

1. „+ Alle zur Todoliste" in HaushaltSection klicken
2. Im Pool erscheinen die Raum-Todos mit Glow in der Haushalt-Tool-Farbe
3. Normales Todo daneben → kein Glow
4. Haushalt-Todo abhaken → Glow verschwindet (done state, `!todo.done` greift)

- [ ] **Schritt 4: Commit**

```bash
git add src/components/TodoChip/TodoChip.jsx
git commit -m "feat: TodoChip Glow-Effekt für Tool-Todos"
```

---

## Abschluss-Check

- [ ] Haushalt-Task abhaken (Raum-Done-Button) → im Haushalt-Tab ändert sich die Urgency des Tasks (Segment-Bar füllt sich neu: heute erledigt)
- [ ] Pool-Haushalt-Todo abhaken → `lastDone` im Haushalt-Tool gesetzt (Tab öffnen, Segment-Bar zeigt „heute erledigt")
- [ ] Energie auf Low Energy → nur lowEnergy-Tasks sichtbar; Räume ohne lowEnergy-Tasks verschwinden
- [ ] Haushalt-Tool deaktivieren (Einstellungen → aktive Tools) → HaushaltSection weg, Pool-Todos bleiben als normale Todos erhalten
