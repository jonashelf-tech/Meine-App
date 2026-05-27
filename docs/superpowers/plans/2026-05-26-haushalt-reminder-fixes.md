# Haushalt + Reminder Fixes & Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix zwei Haushalt-Bugs (stale config), Reminder-Counter erst beim Todo-Done zurücksetzen, ToolSection Glow-Optik, und auswählbare Todos bei Reminder + Haushalt.

**Architecture:** Vier unabhängige Änderungsbereiche. HaushaltSection und ReminderSection haben jeweils lokalen State der nicht mit dem Zustand Store synct — ein `useEffect` mit einem stabilen Dependency-Key löst das sauber. Reminder bekommt `reminderItemId` auf erzeugten Todos/Slots, TabHeute schreibt `lastAdded` beim Done-Toggle. ToolSection bekommt einen `color`-Prop für Glow analog zu TodoChip. Selektion über `deselected`-Set (invertiertes Selection-Pattern: leer = alle selektiert).

**Tech Stack:** React 18, Zustand, CSS Modules, localStorage

---

## Task 1: Fix HaushaltSection stale config (Bugs 1 + 2)

**Files:**
- Modify: `src/features/tools/haushalt/HaushaltSection.jsx`

- [ ] **Step 1: useEffect zum Re-sync hinzufügen**

In `HaushaltSection.jsx`, nach dem `const [config, setConfig] = useState(...)`:

```js
// Re-sync wenn Haushalt-Pool-Todos ihren done-State ändern (TabHeute schreibt direkt in localStorage)
const haushaltDoneKey = todos
  .filter(t => t.toolId === 'haushalt')
  .map(t => `${t.id}:${t.done}`)
  .join(',')

useEffect(() => { setConfig(loadHaushalt()) }, [haushaltDoneKey])
```

Import `useEffect` zum bestehenden React-Import hinzufügen (ist `useState` bereits dabei).

- [ ] **Step 2: Manuell verifizieren**

Haushalt-Todo im Pool abhaken → Raum verschwindet sofort aus Section, % ändert sich sofort.

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/haushalt/HaushaltSection.jsx
git commit -m "fix: HaushaltSection re-syncs config when pool todo is checked off"
```

---

## Task 2: Reminder-Counter erst beim Todo-Done zurücksetzen

**Files:**
- Modify: `src/features/tools/reminder/reminderData.js`
- Modify: `src/features/tools/reminder/ReminderSection.jsx`
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

### 2a: Helper in reminderData.js

- [ ] **Step 1: `setReminderLastAdded` exportieren**

Am Ende von `reminderData.js` hinzufügen:

```js
export function setReminderLastAdded(itemId, date) {
  try {
    const stored = JSON.parse(localStorage.getItem(REMINDER_KEY)) ?? { items: [] }
    const items = (stored.items ?? []).map(i =>
      i.id === itemId ? { ...i, lastAdded: date } : i
    )
    localStorage.setItem(REMINDER_KEY, JSON.stringify({ ...stored, items }))
  } catch {}
}
```

### 2b: ReminderSection — Verhalten ändern

Neues Prinzip:
- Klick auf + → erstellt Todo/Slot **mit `reminderItemId`**, setzt kein `lastAdded`, kein `dismiss`
- Item wird versteckt weil es in `pendingReminderIds` ist (Todos mit `reminderItemId` + `!done`)
- Klick auf × → nur für heute dismissen (bleibt, setzt kein `lastAdded`)
- Wenn Todo done → TabHeute setzt `lastAdded` → `isDueToday` = false → Item verschwindet

- [ ] **Step 2: ReminderSection komplett ersetzen**

```jsx
import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, minutesToSk, parseHHMM, ALL_SLOT_KEYS, sk } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { createBlock } from '../../todos/Block'
import {
  isDueToday, mergeWithCurated,
  loadReminderItems, saveReminderItems,
  loadDismissed, saveDismissed,
} from './reminderData'
import s from './ReminderSection.module.css'

export default function ReminderSection() {
  const { todos, setTodos, days, setDays, setCurrentTab, toolColors } = useAppStore()
  const today      = todayKey()
  const todaySlots = days[today] ?? {}
  const toolColor  = toolColors?.['reminder'] ?? '#00FF94'

  const [items,     setItems]     = useState(() => mergeWithCurated(loadReminderItems()))
  const [dismissed, setDismissed] = useState(() => loadDismissed())

  // Re-sync items wenn ein Reminder-Todo abgehakt wird (TabHeute setzt lastAdded in localStorage)
  const reminderDoneKey = todos
    .filter(t => t.reminderItemId)
    .map(t => `${t.id}:${t.done}`)
    .join(',')
  useEffect(() => { setItems(mergeWithCurated(loadReminderItems())) }, [reminderDoneKey])

  const todayDismissed = dismissed[today] ?? []

  // Items die schon ein offenes Todo haben (pendingReminderIds) nicht mehr zeigen
  const pendingReminderIds = new Set(
    todos.filter(t => t.reminderItemId && !t.done).map(t => t.reminderItemId)
  )

  const dueItems = items.filter(item =>
    isDueToday(item) &&
    !todayDismissed.includes(item.id) &&
    !pendingReminderIds.has(item.id)
  )

  const dismiss = useCallback((id) => {
    const next = { ...dismissed, [today]: [...todayDismissed, id] }
    setDismissed(next)
    saveDismissed(next)
  }, [dismissed, today, todayDismissed])

  const buildResult = useCallback((item, currentSlots) => {
    if (item.actionType === 'slot') {
      let slotKey = item.time
        ? minutesToSk(parseHHMM(item.time))
        : ALL_SLOT_KEYS.find(k => !currentSlots[k]) ?? sk(9)
      if (currentSlots[slotKey]) {
        const free = ALL_SLOT_KEYS.find(k => !currentSlots[k])
        if (free) slotKey = free
      }
      return {
        type: 'slot',
        slotKey,
        data: { text: item.text, color: item.color, duration: 30, locked: false, done: false, reminderItemId: item.id },
      }
    }
    return {
      type: 'todo',
      block: createBlock({ text: item.text, priority: 2, color: item.color, category: 'Selfcare', reminderItemId: item.id }),
    }
  }, [])

  // Kein lastAdded-Update hier — passiert erst wenn Todo abgehakt wird (in TabHeute)
  const handleAddSingle = useCallback((item) => {
    const result = buildResult(item, todaySlots)
    if (result.type === 'slot') {
      setDays(prev => ({ ...prev, [today]: { ...(prev[today] ?? {}), [result.slotKey]: result.data } }))
    } else {
      setTodos(prev => [...prev, result.block])
    }
    // pendingReminderIds versteckt das Item jetzt automatisch — kein dismiss nötig
  }, [today, todaySlots, buildResult, setDays, setTodos])

  const handleAddAll = useCallback(() => {
    let slotsAccum = { ...todaySlots }
    const newTodos = []
    dueItems.forEach(item => {
      const result = buildResult(item, slotsAccum)
      if (result.type === 'slot') {
        slotsAccum = { ...slotsAccum, [result.slotKey]: result.data }
      } else {
        newTodos.push(result.block)
      }
    })
    if (Object.keys(slotsAccum).length > Object.keys(todaySlots).length) {
      setDays(prev => ({ ...prev, [today]: slotsAccum }))
    }
    if (newTodos.length > 0) setTodos(prev => [...prev, ...newTodos])
  }, [dueItems, today, todaySlots, buildResult, setDays, setTodos])

  if (dueItems.length === 0) return null

  return (
    <ToolSection
      toolId="reminder"
      title="Reminder"
      badge={dueItems.length}
      onTitleClick={() => setCurrentTab(TOOL_TAB.reminder)}
    >
      <div className={s.items}>
        {dueItems.map(item => (
          <div key={item.id} className={s.chip} style={{ '--chip-color': item.color ?? '#00FF94' }}>
            <span className={s.stripe} />
            <span className={s.chipIcon}>{item.icon || '🔔'}</span>
            <div className={s.chipBody}>
              <span className={s.chipText}>{item.text}</span>
              {item.time && <span className={s.chipTime}>{item.time}</span>}
            </div>
            <button className={s.addBtn} onClick={() => handleAddSingle(item)} title="Hinzufügen">+</button>
            <button className={s.dismissBtn} onClick={() => dismiss(item.id)} title="Für heute ignorieren">✕</button>
          </div>
        ))}
        <button className={s.addAllBtn} onClick={handleAddAll}>+ Alle hinzufügen</button>
      </div>
    </ToolSection>
  )
}
```

### 2c: TabHeute — lastAdded setzen wenn Reminder-Todo done

- [ ] **Step 3: Imports in TabHeute.jsx ergänzen**

```js
import { loadReminderItems, saveReminderItems, setReminderLastAdded } from '../../tools/reminder/reminderData'
```

- [ ] **Step 4: handleToggleDone um Reminder-Block erweitern**

Nach dem bestehenden haushalt-Block in `handleToggleDone`:

```js
if (nowDone && todo?.reminderItemId) {
  setReminderLastAdded(todo.reminderItemId, new Date().toISOString().slice(0, 10))
}
```

Vollständiges handleToggleDone:

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
    if (nowDone && todo?.reminderItemId) {
      setReminderLastAdded(todo.reminderItemId, new Date().toISOString().slice(0, 10))
    }
    return prev.map(t =>
      t.id === id
        ? { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
        : t
    )
  })
}, [setTodos])
```

- [ ] **Step 5: handleToggleSlotDone um Reminder-Block erweitern**

```js
const handleToggleSlotDone = useCallback((slotKey) => {
  setTodaySlots(prev => {
    const slot = prev[slotKey]
    if (!slot) return prev
    const nowDone = !slot.done
    if (nowDone && slot.reminderItemId) {
      setReminderLastAdded(slot.reminderItemId, new Date().toISOString().slice(0, 10))
    }
    return { ...prev, [slotKey]: { ...slot, done: nowDone } }
  })
}, [setTodaySlots])
```

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/reminder/reminderData.js src/features/tools/reminder/ReminderSection.jsx src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: reminder lastAdded resets when todo/slot is marked done"
```

---

## Task 3: ToolSection Glow-Optik (Feature 4)

**Files:**
- Modify: `src/components/ToolSection/ToolSection.jsx`
- Modify: `src/features/tools/haushalt/HaushaltSection.jsx`
- Modify: `src/features/tools/reminder/ReminderSection.jsx`

- [ ] **Step 1: ToolSection.jsx — color-Prop + Glow**

```jsx
export default function ToolSection({
  toolId,
  title,
  badge = null,
  badgeBg,
  color,           // NEU: Tool-Farbe für Glow-Border
  defaultOpen = false,
  onTitleClick,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)

  const sectionStyle = color ? {
    border: `1.5px solid ${color}55`,
    boxShadow: `0 0 10px ${color}22`,
  } : undefined

  return (
    <div className={s.section} style={sectionStyle}>
      {/* rest unchanged */}
```

- [ ] **Step 2: HaushaltSection.jsx — color übergeben**

```jsx
<ToolSection
  toolId="haushalt"
  title="Haushalt"
  badge={`${score}%`}
  badgeBg={badgeBg}
  color={toolColor}
  onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
>
```

- [ ] **Step 3: ReminderSection.jsx — color übergeben**

```jsx
<ToolSection
  toolId="reminder"
  title="Reminder"
  badge={dueItems.length}
  color={toolColor}
  onTitleClick={() => setCurrentTab(TOOL_TAB.reminder)}
>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ToolSection/ToolSection.jsx src/features/tools/haushalt/HaushaltSection.jsx src/features/tools/reminder/ReminderSection.jsx
git commit -m "feat: ToolSection glow border using tool color"
```

---

## Task 4: Auswählbare Todos — ReminderSection (Feature 5)

**Files:**
- Modify: `src/features/tools/reminder/ReminderSection.jsx`
- Modify: `src/features/tools/reminder/ReminderSection.module.css`

- [ ] **Step 1: deselected-State + handleAddSelected in ReminderSection**

`deselected` ist ein Set von Item-IDs die der User abgewählt hat. Leer = alle selektiert.

State hinzufügen (nach `dismissed`-State):
```js
const [deselected, setDeselected] = useState(() => new Set())

const toggleSelect = useCallback((id) => {
  setDeselected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
}, [])
```

`handleAddAll` umbenennen zu `handleAddSelected` und auf selektierte Items begrenzen:
```js
const handleAddSelected = useCallback(() => {
  const toAdd = dueItems.filter(i => !deselected.has(i.id))
  let slotsAccum = { ...todaySlots }
  const newTodos = []
  toAdd.forEach(item => {
    const result = buildResult(item, slotsAccum)
    if (result.type === 'slot') {
      slotsAccum = { ...slotsAccum, [result.slotKey]: result.data }
    } else {
      newTodos.push(result.block)
    }
  })
  if (Object.keys(slotsAccum).length > Object.keys(todaySlots).length) {
    setDays(prev => ({ ...prev, [today]: slotsAccum }))
  }
  if (newTodos.length > 0) setTodos(prev => [...prev, ...newTodos])
}, [dueItems, deselected, today, todaySlots, buildResult, setDays, setTodos])
```

- [ ] **Step 2: UI mit Toggle-Checkboxen**

Chip-Row mit Selektion — jedes Chip bekommt einen Klick-Toggle links:

```jsx
{dueItems.map(item => {
  const isSelected = !deselected.has(item.id)
  return (
    <div
      key={item.id}
      className={[s.chip, !isSelected ? s.chipDeselected : ''].join(' ')}
      style={{ '--chip-color': item.color ?? '#00FF94' }}
    >
      <button
        className={[s.selectBtn, isSelected ? s.selectBtnOn : ''].join(' ')}
        onClick={() => toggleSelect(item.id)}
        title={isSelected ? 'Abwählen' : 'Auswählen'}
      >
        {isSelected ? '✓' : '○'}
      </button>
      <span className={s.stripe} />
      <span className={s.chipIcon}>{item.icon || '🔔'}</span>
      <div className={s.chipBody}>
        <span className={s.chipText}>{item.text}</span>
        {item.time && <span className={s.chipTime}>{item.time}</span>}
      </div>
      <button className={s.addBtn} onClick={() => handleAddSingle(item)} title="Einzeln hinzufügen">+</button>
      <button className={s.dismissBtn} onClick={() => dismiss(item.id)} title="Für heute ignorieren">✕</button>
    </div>
  )
})}
```

Button-Label dynamisch:
```jsx
const selectedCount = dueItems.length - deselected.size
<button
  className={s.addAllBtn}
  onClick={handleAddSelected}
  disabled={selectedCount === 0}
>
  + {selectedCount === dueItems.length ? 'Alle hinzufügen' : `${selectedCount} hinzufügen`}
</button>
```

- [ ] **Step 3: CSS für selectBtn und chipDeselected**

In `ReminderSection.module.css` hinzufügen:

```css
.selectBtn {
  width: 28px;
  min-width: 28px;
  align-self: stretch;
  background: none;
  border: none;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.72rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.selectBtnOn {
  color: var(--chip-color, var(--primary));
}

.chipDeselected {
  opacity: 0.4;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/reminder/ReminderSection.jsx src/features/tools/reminder/ReminderSection.module.css
git commit -m "feat: selectable reminder items before adding to pool"
```

---

## Task 5: Auswählbare Todos — HaushaltSection (Feature 5)

**Files:**
- Modify: `src/features/tools/haushalt/HaushaltSection.jsx`
- Modify: `src/features/tools/haushalt/HaushaltSection.module.css`

- [ ] **Step 1: deselected-State + handleAddSelected**

State nach `energie` hinzufügen:
```js
const [deselected, setDeselected] = useState(() => new Set())

const toggleSelectRoom = useCallback((roomId) => {
  setDeselected(prev => {
    const next = new Set(prev)
    if (next.has(roomId)) next.delete(roomId); else next.add(roomId)
    return next
  })
}, [])
```

`handleAddAll` ersetzen durch `handleAddSelected`:
```js
const handleAddSelected = () => {
  const roomsToAdd = visibleDueRooms.filter(({ room }) => !deselected.has(room.id))
  setTodos(prev => {
    const updated = [...prev]
    roomsToAdd.forEach(({ room, dueTasks }) => {
      const newTasks = dueTasks.filter(t => !poolTaskIds.has(t.id))
      if (newTasks.length === 0) return
      const existingIdx = updated.findIndex(t =>
        t.toolId === 'haushalt' && t.haushaltRoomId === room.id && !t.done
      )
      if (existingIdx >= 0) {
        const existing = updated[existingIdx]
        updated[existingIdx] = {
          ...existing,
          duration:        (existing.duration || 0) + newTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
          haushaltTaskIds: [...existing.haushaltTaskIds, ...newTasks.map(t => t.id)],
          subItems:        [...(existing.subItems || []), ...newTasks.map(t => ({ id: crypto.randomUUID(), text: t.text, done: false }))],
        }
      } else {
        updated.push(createBlock({
          text:            `${room.icon} ${room.name}`,
          duration:        newTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
          subItems:        newTasks.map(t => ({ id: crypto.randomUUID(), text: t.text, done: false })),
          color:           toolColor,
          toolId:          'haushalt',
          haushaltRoomId:  room.id,
          haushaltTaskIds: newTasks.map(t => t.id),
        }))
      }
    })
    return updated
  })
}
```

- [ ] **Step 2: UI — Selektion pro Raum-Chip**

Im render, `visibleDueRooms.map(...)` um Selektion erweitern. Vor `TodoChip` einen Wrapper mit Toggle-Button:

```jsx
<div className={s.rooms}>
  {visibleDueRooms.map(({ room, dueTasks }) => {
    const uncoveredTasks = dueTasks.filter(t => !poolTaskIds.has(t.id))
    const isSelected = !deselected.has(room.id)
    const fakeTodo = {
      id:       room.id,
      text:     `${room.icon} ${room.name}`,
      color:    toolColor,
      toolId:   'haushalt',
      done:     false,
      priority: null,
      duration: uncoveredTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
      subItems: uncoveredTasks.map(t => ({ id: t.id, text: t.text, done: false })),
      category: null,
      date:     null,
      time:     null,
    }
    const doneBtn = (
      <button
        className={s.roomDoneBtn}
        onClick={e => { e.stopPropagation(); handleRoomDone(room.id) }}
        title="Alle erledigt"
      >✓</button>
    )
    return (
      <div key={room.id} className={[s.roomRow, !isSelected ? s.roomRowDeselected : ''].join(' ')}>
        <button
          className={[s.roomSelectBtn, isSelected ? s.roomSelectBtnOn : ''].join(' ')}
          onClick={() => toggleSelectRoom(room.id)}
          title={isSelected ? 'Abwählen' : 'Auswählen'}
        >
          {isSelected ? '✓' : '○'}
        </button>
        <div className={s.roomChipWrap}>
          <TodoChip
            todo={fakeTodo}
            saveItem={makeSaveItem(uncoveredTasks)}
            dragHandle={doneBtn}
          />
        </div>
      </div>
    )
  })}
</div>
```

Button-Label dynamisch:
```jsx
const selectedRoomCount = visibleDueRooms.length - deselected.size
<button className={s.addAllBtn} onClick={handleAddSelected} disabled={selectedRoomCount === 0}>
  + {selectedRoomCount === visibleDueRooms.length ? 'Alle zur Todoliste' : `${selectedRoomCount} zur Todoliste`}
</button>
```

- [ ] **Step 3: CSS hinzufügen**

In `HaushaltSection.module.css`:

```css
.roomRow {
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.roomChipWrap {
  flex: 1;
  min-width: 0;
}

.roomSelectBtn {
  width: 28px;
  min-width: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: none;
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.72rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.roomSelectBtnOn {
  color: var(--emerald);
  border-color: rgba(16, 185, 129, 0.3);
}

.roomRowDeselected {
  opacity: 0.4;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/haushalt/HaushaltSection.jsx src/features/tools/haushalt/HaushaltSection.module.css
git commit -m "feat: selectable haushalt rooms before adding to pool"
```

---

## Gesamtreihenfolge

1. Task 1 (Bug-Fix Haushalt sync)
2. Task 2 (Reminder auf done-Reset)
3. Task 3 (ToolSection Glow)
4. Task 4 (Reminder Selektion)
5. Task 5 (Haushalt Selektion)
