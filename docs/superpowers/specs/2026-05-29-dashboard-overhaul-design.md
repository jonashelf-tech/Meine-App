# Dashboard-Überarbeitung — Design Spec
**Datum:** 2026-05-29  
**Status:** Approved

---

## Überblick

Sechs Verbesserungen an den Tool-Dashboards im Tagesplaner (TabHeute). Ziel: konsistente Darstellung, weniger Bugs, ein kanonisches Muster für zukünftige Tools.

---

## Item 1 — TodoChip Borderfarbe

**Problem:** `TodoChip.jsx` Zeile 137 fällt bei `toolId` immer auf `#8B5CF6` zurück — egal welche Farbe das Tool hat.

```js
// Aktuell (falsch):
const glowColor = todo.toolId ? (toolColors?.[todo.toolId] ?? '#8B5CF6') : null

// Fix:
import { getToolColor } from '../../utils'
const glowColor = todo.toolId ? getToolColor(todo.toolId, toolColors) : null
```

`getToolColor` kennt alle Registry-Defaults — kein hardcodierter Fallback mehr nötig.

---

## Item 2 — Doppelfarben verhindern

**Problem:** Zwei Tools können dieselbe Farbe haben. `swatchDimmed` zeigt es nur optisch, verhindert es nicht.

**Fix in `TabTools.jsx`:**  
`handleColorChange` prüft vor dem Setzen ob die Farbe bereits von einem anderen Tool belegt ist. Wenn ja → kein Update, kein visuelles Feedback nötig (Swatch ist bereits gedimmt und der User sieht warum).

```js
const handleColorChange = (toolId, hex) => {
  const usedByOthers = getUsedByOthers(toolId)
  if (usedByOthers.includes(hex.toLowerCase())) return  // blockiert
  setToolColors(prev => ({ ...prev, [toolId]: hex }))
}
```

Gilt auch für den Custom-Color-Picker (`colorInputRef onChange`): gleiche Prüfung.

---

## Item 3 — Spacing vereinheitlichen

**Problem:** `ToolSection.module.css` hat `margin-bottom: 8px` UND der Flex-Container in `TabHeute` hat `gap: 8`. Ergibt 16px zwischen Sections statt 8px.

**Fix:**
- `ToolSection.module.css`: `margin-bottom` entfernen (war redundant)
- `TabHeute.jsx` swipeRef-Container: `gap: 8` → `gap: 6` (einheitlich mit Rest der Seite)

---

## Item 4 — Duplikat-Todos verhindern

**Problem:** `BirthdaySection` hat keinen Duplikat-Schutz — man kann dieselben Geburtstags-Todos beliebig oft hinzufügen. Reminder und Haushalt sind bereits geschützt.

**Regel (gilt für alle Sections):**  
*Eine Section darf ein Item nur anzeigen, wenn kein nicht-erledigtes Todo mit gleicher Tool+SourceID im Store existiert.*

**Fix für BirthdaySection:**

1. Beim Erstellen eines Geburtstags-Todos: Feld `birthdayChipId` auf dem Todo stempeln (= `${chip.type}-${chip.birthday.id}`)
2. In `BirthdaySection`: `pendingChipIds` aus todos filtern (identisch zu `pendingReminderIds` in ReminderSection)
3. Chips die bereits im Pool liegen → nicht mehr anzeigen
4. Wenn alle Chips abgedeckt → Section verschwindet (`chips.length === 0 → return null` existiert schon)

**In `startBirthdayDrag` (TabHeute):** `birthdayChipId` auf dem erstellten Todo setzen.

---

## Item 5 — ErfolgeSection nur wenn nötig

**Problem:** `ErfolgeSection` zeigt „Noch keine Erfolge — weiter so!" auch wenn nichts zu tun ist.

**Fix:**
```js
// ErfolgeSection.jsx — vor dem return:
const nothingAtAll = unlocked.length === 0 && recentClaimed.length === 0
if (nothingAtAll) return null
```

Section taucht erst auf wenn mindestens ein Erfolg abholbar oder kürzlich geclaimt wurde.

---

## Item 6 — Unified Dashboard Pattern

### 6a — Neues ToolSection Header-Design (Pill-Gruppe)

**Neue Props auf `ToolSection`:**
```
actionLabel    // string | null  — z.B. "+ 3 hinzufügen"
onAction       // fn() | null
actionDisabled // bool (default false)
```

**Header-Aufbau (Pill-Stil):**
```
[🏠 Name ↗]   [Badge*]   [+ N hinzufügen*]   [▾ SVG]
   Pill          Pill          lila Pill         Pill

* Badge nur wenn kein onAction ODER explizit als Zusatzinfo (z.B. 42%)
* Action-Pill nur wenn onAction gesetzt
```

Reihenfolge: `[Name ↗]` → `[badge wenn vorhanden]` → `[+ N hinzufügen]` → `[▾]`

**CSS in `ToolSection.module.css`:** Header wird zur Pill-Gruppe — alle Segmente `background: var(--surface-low)`, mit `gap: 1px` und `background: rgba(255,255,255,0.06)` auf dem Container als Trennfarbe. Action-Pill bekommt lila Background.

**Chevron:** SVG (Lucide `chevron-down`) statt `▾`/`▸` Text.

### 6b — Bottom-Button entfernen

Alle Sections (`HaushaltSection`, `ReminderSection`, `BirthdaySection`) entfernen ihren `.addAllBtn` am Ende des Bodies. Die Logik (`handleAddSelected`) bleibt — nur `onAction={handleAddSelected}` an ToolSection übergeben.

### 6c — Button-Text Logik (Standard für alle)

```js
const selectedCount = items.filter(i => !deselected.has(i.id)).length
const actionLabel   = `+ ${selectedCount} hinzufügen`
const actionDisabled = selectedCount === 0
```

### 6d — kontext/tool-pattern.md Update

Neuer Abschnitt **"Standard-Dashboard-Muster"** mit vollständigem Template:
- ToolSection mit `actionLabel` / `onAction`
- `deselected`-Set + `toggleSelect`
- `pendingIds` Duplikat-Filter
- `fakeTodo` Aufbau
- CSS-Grundstruktur

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/components/TodoChip/TodoChip.jsx` | Item 1: getToolColor statt Fallback |
| `src/components/ToolSection/ToolSection.jsx` | Item 6a: neue Props + Pill-Header |
| `src/components/ToolSection/ToolSection.module.css` | Item 3+6a: margin-bottom weg, Pill-Styles |
| `src/features/tools/TabTools/TabTools.jsx` | Item 2: handleColorChange blockiert Duplikate |
| `src/features/tools/haushalt/HaushaltSection.jsx` | Item 6b: addAllBtn weg → onAction |
| `src/features/tools/reminder/ReminderSection.jsx` | Item 6b: addAllBtn weg → onAction |
| `src/features/tools/geburtstage/BirthdaySection.jsx` | Item 4+6b: birthdayChipId-Filter + onAction |
| `src/features/tools/erfolge/ErfolgeSection.jsx` | Item 5: return null wenn nothingAtAll |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Item 3+4: gap 6, `startBirthdayDrag` stempelt `birthdayChipId` |
| `kontext/tool-pattern.md` | Item 6d: Standard-Dashboard-Template |

---

## Nicht in Scope

- Visuelle Änderungen an `TodoChip` selbst (Chips bleiben exakt gleich)
- Kognitiv- und GewichtSection (keine Add-Logik)
- Neue Tools
