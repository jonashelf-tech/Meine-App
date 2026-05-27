# Haushalt Dashboard Fixes

**Date:** 2026-05-27

## Scope

Three connected fixes to the Haushalt dashboard (HaushaltSection in TabHeute):

1. Priority visualization and assignment
2. Drag handle replaces done-button
3. Drag-back from Zeitplan to Pool

---

## 1. Priority on Room Level

### Data Model

Add `priority` field to room objects in `haushaltData.js`.

- Default: `3` (least urgent — household tasks are background work)
- Range: `1` (high), `2` (medium), `3` (low)
- Stored in `haushaltData` alongside existing room fields

### Migration

In `loadHaushalt`: map existing rooms with `priority: r.priority ?? 3`.

### Dashboard (HaushaltSection)

`fakeTodo.priority = room.priority ?? 3` — PrioBadge already renders from `todo.priority`, no other changes needed there.

When creating a pool todo (drag or "zur Todoliste" button): `createBlock({ ..., priority: room.priority ?? 3 })`.

### Tool (TabHaushalt)

In `RaumKarte` edit mode: add a priority selector in the edit header row (alongside the existing edit controls). Simple button group: `P1 / P2 / P3`. Calls `onUpdateRoom({ priority: value })`.

---

## 2. Drag Handle Replaces Done-Button

### Removed

The `doneBtn` (✓ Alle erledigt) passed as `dragHandle` to `TodoChip` in `HaushaltSection` is removed entirely.

### New Drag Handle

A 6-dot handle span (same SVG as Pool's `DragIcon`), passed as `dragHandle` to `TodoChip`.

`onPointerDown` calls a local `handleRoomDragStart(room, dueTasks, e)`.

### Drag Start Logic (HaushaltSection)

```
handleRoomDragStart(room, dueTasks, e):
  1. Find existing undone pool todo: todos.find(t => t.toolId === 'haushalt' && t.haushaltRoomId === room.id && !t.done)
  2. If found: use existing.id, existing.text, existing.color, existing.duration
  3. If not found:
     - uncoveredTasks = dueTasks.filter(t => !poolTaskIds.has(t.id))
     - newTodo = createBlock({ text, duration, subItems, color, toolId, haushaltRoomId, haushaltTaskIds, priority: room.priority ?? 3 })
     - setTodos(prev => [...prev, newTodo])
     - use newTodo.id, newTodo.text, toolColor, newTodo.duration
  4. call onStartDrag(todoId, text, color, duration, e)
```

### Prop Wiring (TabHeute)

`HaushaltSection` receives `onStartDrag` prop. TabHeute passes `startPoolDrag` directly:

```jsx
// In TabHeute render — sections map
const SECTION_PROPS = {
  haushalt: { onStartDrag: startPoolDrag },
}
// ...
<Sec key={id} {...(SECTION_PROPS[id] ?? {})} />
```

### Result

- Dragging a room chip from dashboard creates (or finds) the pool todo and places it in the Zeitplan slot
- The todo is immediately "placed" → hidden from Pool list, removed from dashboard (poolTaskIds covers it)
- Priority is carried through

---

## 3. Drag from Zeitplan back to Pool

### Pool Drop Zone

Pool receives `registerHalf` prop from TabHeute.

Pool registers its container div as a drop target:
```js
ref={el => registerHalf('pool', el, 'empty')}
```

The entire Pool container becomes a valid drop zone. Existing `dnd-half-over` CSS class provides the cyan highlight automatically.

### startSlotDrag Extension (TabHeute)

`canDrop` must return `true` for key `'pool'` (avoids `getDurationKeys` crash on non-slot key):

```js
const canDrop = dur > 30
  ? (key) => {
      if (key === 'pool') return true
      const blocking = getDurationKeys(key, dur).slice(1).filter(k => k !== fromKey && todaySlots[k])
      return blocking.length === 0 ? true : blocking
    }
  : null
```

In the `onDrop` callback:

```js
(toKey) => {
  if (toKey === 'pool') {
    handleRemoveSlot(fromKey)  // removes slot only, todo stays in todos[]
    return
  }
  if (toKey === fromKey) return
  // existing move logic
  setTodaySlots(...)
}
```

`handleRemoveSlot(slotKey)` without `mode: 'delete'` already only removes the slot — the todo remains in `todos[]` and becomes visible in Pool again (no longer "placed").

### Pool Prop

```jsx
<Pool
  ...
  registerHalf={registerHalf}
/>
```

Pool passes `registerHalf` to its container div via callback ref.

---

## Files Changed

| File | Change |
|---|---|
| `haushaltData.js` | Add `priority: 3` to DEFAULT_ROOMS, migrate in `loadHaushalt` |
| `HaushaltSection.jsx` | fakeTodo priority, drag handle, drag start logic, onStartDrag prop |
| `TabHaushalt.jsx` | Priority selector in RaumKarte edit mode, onUpdateRoom |
| `TabHeute.jsx` | Pass `onStartDrag={startPoolDrag}` to HaushaltSection, `registerHalf` to Pool, handle `toKey === 'pool'` in startSlotDrag |
| `Pool.jsx` | Accept and use `registerHalf` prop on container div |

No changes to `useDragDrop.js`, `TodoChip.jsx`, or CSS needed (drop zone highlight comes from existing `dnd-half-over` global class).
