# Design: Haushaltsplan – TodoChips im Tagesplaner

**Datum:** 2026-05-25  
**Status:** Approved

---

## Ziel

Die HaushaltSection im Tagesplaner zeigt fällige Haushaltsaufgaben als expandierbare Raum-Chips (Option A: Raum-basiert). Energie-Toggle direkt in der Section. Button „Alle zur Todoliste" erzeugt echte Blocks im Pool mit Rückkopplung zum Haushalt-Counter. Tool-Todos sind visuell durch einen farbigen Border als solche erkennbar.

---

## Datenmodell-Erweiterungen

### Block (src/features/todos/Block.js)

Zwei neue optionale Felder:

```js
{
  // ... bestehende Felder ...
  toolId:         null,   // string | null — "haushalt", etc.
  haushaltTaskIds: [],    // string[] — IDs der Haushalt-Tasks die dieser Block repräsentiert
}
```

`createBlock()` erhält diese Felder als optionale Partials (Default: null / []).

---

## HaushaltSection (Redesign)

**Datei:** `src/features/tools/haushalt/HaushaltSection.jsx`

### Sichtbarkeits-Schwellwert

Nur Räume anzeigen, bei denen **mindestens eine Task urgency ≥ 1.0** hat (wirklich fällig oder überfällig). Bisher war der Schwellwert 0.7 in `getUrgentTasks` — dieser wird für die Section nicht mehr genutzt.

Neue Hilfsfunktion in `haushaltData.js`:
```js
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

### Layout

```
┌─────────────────────────────────┐
│ Haushalt              [→ Tool]  │  ← Section-Header (ToolSection)
│ ⚡ Normal   🪫 Low Energy       │  ← Energie-Toggle
├─────────────────────────────────┤
│ 🛏 Schlafzimmer        20 min ▾ │  ← Raum-Chip (expandiert)
│   └ Saugen · 15 min    [✓]     │
│   └ Bett machen · 5 min [✓]    │
├─────────────────────────────────┤
│ 🚪 Flur                10 min ▸ │  ← Raum-Chip (kollabiert)
├─────────────────────────────────┤
│     [ Alle zur Todoliste ]      │
└─────────────────────────────────┘
```

### Raum-Chip-Verhalten

- **Header:** Icon + Name + Gesamtdauer aller fälligen Tasks + Expand-Pfeil
- **Expand:** zeigt fällige Tasks als Unterzeilen, jede mit individuellem Done-Button
- **Chip-Done:** Häkchen am Chip-Header markiert alle fälligen Tasks des Raums als `lastDone = heute`
- **Sub-Done:** Einzelne Task-Zeile abhaken markiert nur diese Task als `lastDone = heute`
- **Low Energy:** filtert Tasks mit `lowEnergy: false` aus den subItems; Räume ohne verbleibende Tasks werden ausgeblendet
- Energie-State bleibt in `SK.haushaltEnergie` (localStorage), identisch zu TabHaushalt

### „Alle zur Todoliste"-Button

Erscheint nur wenn ≥1 Raum sichtbar ist.

Erstellt pro sichtbarem Raum-Chip einen Block:

```js
createBlock({
  text:            `${room.icon} ${room.name}`,
  duration:        dueTasks.reduce((s, t) => s + (t.duration ?? 0), 0),
  subItems:        dueTasks.map(t => ({ id: genId(), text: t.text, done: false })),
  color:           toolColors['haushalt'] ?? '#8B5CF6',
  toolId:          'haushalt',
  haushaltTaskIds: dueTasks.map(t => t.id),
})
```

**Wichtig:** `lastDone` wird beim Erstellen des Blocks NICHT gesetzt. Der Counter-Reset passiert erst beim Abhaken (siehe nächster Abschnitt).

---

## Counter-Reset bei Todo-Abhaken

Wenn ein Block mit `haushaltTaskIds.length > 0` als `done = true` gesetzt wird, werden alle referenzierten Haushalt-Tasks mit `lastDone = heute` gesetzt.

**Umsetzung:** Die bestehenden Toggle-Handler werden erweitert — keine neue abstrakte Funktion nötig:

`handleToggleDone` in `src/features/calendar/TabHeute/TabHeute.jsx` (Zeile 56):
```js
const handleToggleDone = useCallback((id) => {
  setTodos(prev => prev.map(t => {
    if (t.id !== id) return t
    const nowDone = !t.done
    if (nowDone && t.haushaltTaskIds?.length > 0) {
      const cfg = loadHaushalt()
      const updated = t.haushaltTaskIds.reduce(
        (c, tid) => markTaskDone(c, tid), cfg
      )
      saveHaushalt(updated)
    }
    return { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
  }))
}, [setTodos])
```

Analog: in `src/features/calendar/TabHeute/useTimeEvents.js` — dort wo `todo.done = true` gesetzt wird (Variante 1 + 2: "Erledigt"-Aktion), denselben Haushalt-Update-Block einbauen.

**Slot-Done (Zeitplan):** Wenn ein Slot-Eintrag im Zeitplan direkt als done markiert wird, triggert das keinen Haushalt-Reset — nur der Pool-Todo-Toggle zählt. Das ist akzeptabel, da Haushalt-Blocks typischerweise im Pool abgehakt werden.

**Doppeltes Hinzufügen:** Der „Alle zur Todoliste"-Button hat keinen Duplikat-Schutz. Wird er zweimal gedrückt, entstehen doppelte Blocks im Pool. Das ist bewusst simpel gehalten — der User drückt ihn einmal pro Tag.

---

## TodoChip – visueller Tool-Border

**Datei:** `src/components/TodoChip/TodoChip.jsx` (und `.module.css`)

Wenn `block.toolId` gesetzt ist: der Chip bekommt einen `2px solid` Border in `toolColors[block.toolId]`.

```jsx
const toolBorderColor = block.toolId ? (toolColors[block.toolId] ?? '#8B5CF6') : null
// style auf dem Chip-Container:
border: toolBorderColor ? `2px solid ${toolBorderColor}` : undefined
```

`toolColors` kommt aus dem Zustand-Store (`useAppStore`).

---

## Was sich NICHT ändert

- Das Haushalt-Tab (`TabHaushalt.jsx`) bleibt unverändert
- Die bestehende `getUrgentTasks`-Funktion bleibt (wird weiterhin im alten Code referenziert, falls vorhanden)
- Tool-Deaktivierung: Blocks bleiben als normale Todos erhalten, Rückkopplung zu `haushaltTaskIds` funktioniert weiterhin (unabhängig von `activeTools`)
- Bestehende Blocks ohne `toolId` / `haushaltTaskIds` sind nicht betroffen

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/features/todos/Block.js` | `toolId`, `haushaltTaskIds` zu `createBlock` hinzufügen |
| `src/features/tools/haushalt/haushaltData.js` | `getDueRooms()` hinzufügen |
| `src/features/tools/haushalt/HaushaltSection.jsx` | Komplett umbauen: Energie-Toggle, Raum-Chips, Alle-Button |
| `src/features/tools/haushalt/HaushaltSection.module.css` | Neue Styles für Chips, Energie-Strip, Sub-Zeilen |
| `src/components/TodoChip/TodoChip.jsx` | Tool-Border wenn `toolId` gesetzt |
| `src/components/TodoChip/TodoChip.module.css` | Border-Style |
| Pool / TimeEvents | `handleBlockDone`-Logik für Haushalt-Rückkopplung |

---

## Offen (später)

- Defaults im Haushalt-Tool überarbeiten (separates Thema, explizit von User erwähnt)
