# Design Spec: Datenmodell-Vereinfachung (Gruppe C)

**Datum:** 2026-05-22  
**Status:** Approved  
**Scope:** Routine + Vorlage entfernen, einheitlicher Block-Typ, smarte Modal-UX, Missed-Termin-Flow

---

## Ziel

Das Aufgaben-Modell wird auf einen einzigen Typ reduziert: **Aufgabe** (Block). Routine und Vorlage fliegen raus — sie waren nicht aktiv in Gebrauch und können durch Reminder-Tool bzw. wiederkehrende Kalendereinträge ersetzt werden. Das Modal verliert seine Typ-Tabs und bekommt stattdessen intelligente Feldlogik.

---

## 1 — Datenmodell: Block

### Entfernte Felder

| Feld | Grund |
|---|---|
| `isTemplate` | Vorlage-Konzept entfernt |
| `recurring` | Routine-Konzept entfernt |

### Neues Feld

| Feld | Typ | Bedeutung |
|---|---|---|
| `awaitingClockResponse` | `boolean` | `true` wenn Termin-Zeit abgelaufen, ClockPopup noch nicht beantwortet — Block wird im Pool ausgeblendet |

### Default-Korrektur

`duration` Default in `createBlock` wird von `30` auf `null` geändert (war immer ungewollter Wert).

### Aktualisierte Block-Struktur

```js
{
  id:                    genId(),
  text:                  '',
  color:                 '#8B5CF6',
  priority:              3,
  duration:              null,          // war: 30
  done:                  false,
  doneAt:                null,
  date:                  null,
  time:                  null,
  awaitingClockResponse: false,         // neu
  subItems:              [],
  category:              null,
  notes:                 null,
  createdAt:             new Date().toISOString(),
}
```

### Hilfsfunktionen in Block.js

```js
// Entfernen:
export const isRoutine       = (b) => !!b.recurring
export const isBlockTemplate = (b) => !!b.isTemplate

// Behalten + anpassen:
export const isTermin      = (b) => !!(b.date && b.time)
export const isFaelligkeit = (b) => !!(b.date && !b.time)
export const isTodo        = (b) => !b.date   // ohne Zeit = reines Pool-Todo
```

---

## 2 — Store & Storage

### Store (store/index.js)

Entfernen:
- `routines`, `setRoutines`
- `templates`, `setTemplates`
- Initialisierungen (`lv(SK.routines, [])`, `lv(SK.templates, [])`)

### Storage (storage/index.js)

`SK.routines` und `SK.templates` bleiben als Keys definiert (für eventuelle Migration), werden aber nicht mehr beschrieben. Bestehende localStorage-Daten unter diesen Keys werden schlicht ignoriert.

---

## 3 — Modal-UX: Einheitliches Aufgaben-Formular

### Keine Typ-Tabs mehr

Das TodoModal zeigt ein einziges Formular. Titel: `"Hinzufügen"` / `"Bearbeiten"`. Der Submit-Button heißt immer `"Speichern"` (Edit) oder `"Hinzufügen"` (Neu).

### Intelligente Feldlogik

| Feld | Sichtbar wenn |
|---|---|
| Text + Auto-Button | immer |
| Prio (Wichtig / Sollte / Kann) | `time` ist leer — verschwindet reaktiv wenn Uhrzeit gesetzt wird |
| Datum (Fälligkeit / Termin-Datum) | immer optional |
| Uhrzeit | immer optional |
| Dauer | immer |
| Farbe | immer |
| Kategorie | immer |
| Schritte | immer |

### Submit-Logik

**Erstellen:**
- Kein Datum/Zeit → `createBlock(...)` → `setTodos`
- Datum aber keine Zeit → `createBlock({ date })` → `setTodos` (Fälligkeits-Todo im Pool)
- Datum + Zeit → `createBlock({ date, time, awaitingClockResponse: true })` → `setTodos` + locked Slot in `setDays`

**Bearbeiten:**
- Nur `setTodos(map update)` — kein Array-Wechsel mehr nötig (keine Routinen/Vorlagen)
- Wenn Datum+Zeit neu gesetzt wird: `awaitingClockResponse: true` setzen, Slot anlegen
- Wenn Zeit entfernt wird: `awaitingClockResponse: false`, bestehende Slots für diesen Block bleiben (keine automatische Bereinigung)

### Entfernte Teile des Modals

- Routine-Felder (Takt, Wochentag, Monatstag, Eigener Takt)
- Vorlage-Felder (waren identisch mit Todo)
- Typ-Tabs (`TYPES`-Array, `typeRow`, `typeBtn`-Klassen)
- `type`-State, `handleTypeChange`, `detectType`
- Store-Zugriffe auf `routines/setRoutines`, `templates/setTemplates`

---

## 4 — Pool-Filterlogik

Pool zeigt ein Todo **nicht** wenn:
1. `done: true`
2. `awaitingClockResponse: true` — wartet auf ClockPopup-Antwort
3. Datum + Zeit **in der Zukunft** — noch nicht fällig, im Zeitplan verplant

Pool zeigt ein Todo **mit ↩-Icon** wenn:
- Das Todo einen aktiven Slot im aktuellen `viewDate` hat (bestehende "placed"-Logik)

Pool zeigt ein Todo **mit Fälligkeits-Badge** wenn:
- `isFaelligkeit(t)` — nur Datum, keine Zeit, Datum ≤ heute

### Umsetzung: "Zukunft"-Filter

In `Pool.jsx`, in der `activePool`-Berechnung:

```js
const now = new Date()
const todayStr = todayKey()

const activePool = useMemo(() => {
  const undone = todos.filter(t => {
    if (t.done) return false
    if (t.awaitingClockResponse) return false
    // Zukunfts-Termin: Datum+Zeit noch nicht erreicht
    if (t.date && t.time) {
      const terminDt = new Date(`${t.date}T${t.time}`)
      if (terminDt > now) return false
    }
    return true
  }).filter(t => !isPlaced(t))
  const pending = todos.filter(t => t.done && pendingDoneIds.has(t.id))
  return [...sortTodos(undone, sort), ...pending]
}, [todos, pendingDoneIds, sort, isPlaced])
```

---

## 5 — Missed-Termin-Flow

### Erkennung beim App-Start

In `TabHeute`, im bestehenden `useEffect` der bereits Auto-Return macht:

```js
// Vergangene undone locked Slots mit awaitingClockResponse: true
const missedTermine = []
Object.entries(days).forEach(([dk, dayData]) => {
  if (dk >= todayKey() || !dayData) return
  Object.entries(dayData).forEach(([slotKey, slot]) => {
    if (!slot || slot.done || !slot.todoId) return
    const todo = todos.find(t => t.id === slot.todoId)
    if (todo && !todo.done && todo.awaitingClockResponse) {
      missedTermine.push({ slotKey, dateKey: dk, todo })
    }
  })
})
```

### ClockPopup-Queue für verpasste Einträge

Verpasste Termine werden als ClockPopup-Queue behandelt:
- Ein Popup nach dem anderen (nicht alle auf einmal)
- `clockPopup` State in TabHeute hält das aktuelle Popup
- Nach Antwort: nächstes aus der Queue

**ClockPopup-Antworten für Missed-Termine:**

| Antwort | Aktion |
|---|---|
| "Erledigt" | `done: true`, `awaitingClockResponse: false`, Slot in `days` bleibt |
| "In Pool" / Dismiss | `awaitingClockResponse: false` → Todo erscheint im Pool |
| "Verschieben" | `awaitingClockResponse` bleibt `true`, Popup erscheint beim nächsten App-Start erneut |

### Termin-Erstellung setzt Flag

Beim Erstellen eines Termins (Datum+Zeit) wird `awaitingClockResponse: true` gesetzt. Das Flag wird auf `false` gesetzt durch:
1. ClockPopup "Erledigt"
2. ClockPopup "In Pool" / Dismiss
3. Manuelles Abhaken des Todos im Pool

---

## 6 — Betroffene Dateien

| Datei | Aktion |
|---|---|
| `src/features/todos/Block.js` | Felder entfernen, Defaults korrigieren, Helpers updaten |
| `src/store/index.js` | `routines` + `templates` + Setter entfernen |
| `src/storage/index.js` | SK-Keys behalten, nicht mehr beschreiben |
| `src/components/TodoModal/TodoModal.jsx` | Tabs entfernen, Feldlogik vereinfachen |
| `src/components/TodoModal/TodoModal.module.css` | Routine/Vorlage-Styles entfernen |
| `src/features/calendar/Pool/Pool.jsx` | Filterlogik erweitern (awaitingClockResponse, Zukunft) |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Missed-Termin-Erkennung + ClockPopup-Queue |

---

## Nicht in Scope

- D: Tagesplan als modularer Tool-Container (separater Chat)
- Migration bestehender Routinen/Vorlagen ins neue Format (werden still ignoriert)
- Reminder-Tool-Integration als Ersatz für Routinen
