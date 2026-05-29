# Wochenansicht — Interaktion (Doppelklick + Klick auf leere Zelle)

**Datum:** 2026-05-29  
**Status:** Approved

---

## Ziel

Zwei Interaktionen in der Wochenansicht ergänzen:
1. **Doppelklick auf bestehenden Slot** → Bearbeitungs-Dialog
2. **Klick auf leere Zeitgitter-Zelle** → Todo-Eingabe mit vorausgefüllter Uhrzeit und Datum

---

## Feature 1: Doppelklick → Bearbeiten

### Todo-Slot (hat `todoId`)
- `onDoubleClick` auf `.weekSlotBlock`
- Sucht das Todo via `todos.find(t => t.id === slot.todoId)`
- Öffnet `<TodoModal existingTodo={todo} onClose={...} />`
- Bestehende TodoModal-Logik: aktualisiert Todo + verschiebt Slot in `days` bei Zeitänderung

### Reiner Termin-Slot (kein `todoId`)
- `onDoubleClick` auf `.weekSlotBlock`
- Öffnet `WeekTerminEditModal` (inline-Komponente in TabKalender):
  - Textfeld (vorausgefüllt mit `slot.text`)
  - Dauer-Presets: 15 / 30 / 60 / 90 min (aktiver Wert hervorgehoben)
  - Farbauswahl: 5 Farb-Kreise (primary, rose, amber, emerald, cyan)
  - Speichern → `setDays(prev => ({ ...prev, [dk]: { ...prev[dk], [slotKey]: { ...slot, text, duration, color } } }))`
  - Abbrechen → schließt Modal ohne Änderung

---

## Feature 2: Klick auf leere Zelle → Erstellen

- `onClick` auf `.weekDayCol` Background-Div
- Handler prüft: Ziel-Element ist `.weekDayCol` selbst oder ein leerer Bereich (kein `.weekSlotBlock` im Pfad)
- Y-Position → Slot berechnen: `Math.floor(e.nativeEvent.offsetY / SLOT_H) * 0.5 + visibleStart`  
  → auf nächste 0.5-Stunde runden → `HH:MM`-String
- Öffnet `<TodoModal prefill={{ date: dk, time: 'HH:MM' }} onClose={...} />`
- TodoModal mit `prefill`: füllt Datum und Uhrzeit vor, `isEdit = false`
- Beim Speichern (TodoModal-Logik bereits vorhanden): erstellt atomisch Todo + Slot in `days`

---

## Technische Änderungen

### `src/components/TodoModal/TodoModal.jsx`
- Neuer Prop: `prefill = null` (Shape: `{ date?: string, time?: string }`)
- State-Initialisierung:
  ```js
  const [date, setDate] = useState(existingTodo?.date ?? prefill?.date ?? '')
  const [time, setTime] = useState(existingTodo?.time ?? prefill?.time ?? '')
  ```
- `detailsOpen` auto-aufklappen wenn `prefill?.date || prefill?.time`

### `src/features/calendar/TabKalender/TabKalender.jsx`
- Imports: `TodoModal`
- Neue States:
  - `editingTodo` — Todo-Objekt oder `null` → TodoModal für Todo-Slots
  - `editingTermin` — `{ dk, slotKey, slot }` oder `null` → WeekTerminEditModal
  - `quickCreate` — `{ date, time }` oder `null` → TodoModal mit prefill
- `WeekTerminEditModal`-Komponente (lokal, vor `export default`):
  - Props: `dk`, `slotKey`, `slot`, `onSave`, `onClose`
  - Lokaler State: `text`, `duration`, `color`
  - Overlay + Card, volle Breite zentriert
- `onDoubleClick` auf `weekSlotBlock`:
  ```js
  onDoubleClick={(e) => {
    e.stopPropagation()
    if (slot.todoId) {
      const t = todos.find(t => t.id === slot.todoId)
      if (t) setEditingTodo(t)
    } else {
      setEditingTermin({ dk, slotKey: key, slot })
    }
  }}
  ```
- `onClick` auf `.weekDayCol`:
  ```js
  onClick={(e) => {
    if (e.target !== e.currentTarget) return  // Klick auf Slot-Block ignorieren
    const slotIndex = Math.floor(e.nativeEvent.offsetY / SLOT_H)
    const h = visibleStart + slotIndex * 0.5
    const hh = String(Math.floor(h)).padStart(2, '0')
    const mm = h % 1 ? '30' : '00'
    setQuickCreate({ date: dk, time: `${hh}:${mm}` })
  }}
  ```
- Render am Ende: `editingTodo` → TodoModal, `editingTermin` → WeekTerminEditModal, `quickCreate` → TodoModal mit prefill

### `src/features/calendar/TabKalender/TabKalender.module.css`
- Styles für WeekTerminEditModal: Overlay, Card, Input, Dauer-Presets, Farbkreise, Buttons
- Cursor: `.weekDayCol { cursor: crosshair }` (zeigt an: klickbar)
- `.weekSlotBlock { cursor: pointer }` (Doppelklick angedeutet)

---

## Edge Cases

- **Klick auf Slot-Block** soll **keinen** Quick-Create öffnen → `e.target !== e.currentTarget` Check
- **Doppelklick auf leere Zelle** würde zwei Single-Click-Events feuern → Quick-Create öffnet sich beim ersten Click. Akzeptabler Tradeoff; alternativ: `onDoubleClick` auf leere Zelle ignorieren (kein Handler).
- **Slot zu kurz zum Klicken** (< 10px Höhe): `onDoubleClick` funktioniert trotzdem (Event auf kleinem Element).
- **Modal-Überlagerung**: Nur ein Modal gleichzeitig offen (`editingTodo`, `editingTermin`, `quickCreate` exklusiv). States werden einzeln gesetzt, nicht kombiniert.
