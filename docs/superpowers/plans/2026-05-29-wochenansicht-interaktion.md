# Wochenansicht Interaktion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doppelklick auf Wochenansicht-Slots zum Bearbeiten + Klick auf leere Zellen zum Erstellen neuer Termine mit vorausgefüllter Uhrzeit.

**Architecture:** Drei unabhängige Änderungen: (1) `TodoModal` bekommt einen `prefill`-Prop für Neuanlage mit vorausgefülltem Datum/Uhrzeit; (2) eine lokale `WeekTerminEditModal`-Komponente in `TabKalender` für reine Termin-Slots; (3) Event-Handler auf `weekSlotBlock` (Doppelklick) und `weekDayCol` (Klick) in `TabKalender`.

**Tech Stack:** React 18, CSS Modules, Zustand (`useAppStore` → `days`, `setDays`, `todos`, `setTodos`)

---

## File Map

| Datei | Änderung |
|---|---|
| `src/components/TodoModal/TodoModal.jsx` | `prefill`-Prop ergänzen (date/time vorausfüllen, detailsOpen auto-aufklappen) |
| `src/features/calendar/TabKalender/TabKalender.jsx` | `WeekTerminEditModal`-Komponente + 3 neue States + onDoubleClick + onClick |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Styles für WeekTerminEditModal + Cursor-Styles |

---

## Task 1: TodoModal — `prefill`-Prop

**Files:**
- Modify: `src/components/TodoModal/TodoModal.jsx:102-126`

Dieser Task ergänzt den `prefill`-Prop in TodoModal, damit die Wochenansicht das Modal mit vorausgefülltem Datum und Uhrzeit öffnen kann, ohne `isEdit = true` zu setzen.

- [ ] **Schritt 1: Signatur-Zeile ändern** (Z. 102)

  Alt:
  ```js
  export default function TodoModal({ onClose, existingTodo = null }) {
  ```
  Neu:
  ```js
  export default function TodoModal({ onClose, existingTodo = null, prefill = null }) {
  ```

- [ ] **Schritt 2: `date`- und `time`-State um `prefill` erweitern** (Z. 113–114)

  Alt:
  ```js
  const [date,     setDate]     = useState(existingTodo?.date     ?? '')
  const [time,     setTime]     = useState(existingTodo?.time     ?? '')
  ```
  Neu:
  ```js
  const [date,     setDate]     = useState(existingTodo?.date ?? prefill?.date ?? '')
  const [time,     setTime]     = useState(existingTodo?.time ?? prefill?.time ?? '')
  ```

- [ ] **Schritt 3: `detailsOpen` auto-aufklappen wenn `prefill` vorhanden** (Z. 124–126)

  Alt:
  ```js
  const [detailsOpen, setDetailsOpen] = useState(() =>
    isEdit && !!(existingTodo.date || existingTodo.time || existingTodo.category)
  )
  ```
  Neu:
  ```js
  const [detailsOpen, setDetailsOpen] = useState(() =>
    (isEdit && !!(existingTodo.date || existingTodo.time || existingTodo.category))
    || !!(prefill?.date || prefill?.time)
  )
  ```

- [ ] **Schritt 4: Manuell testen**

  App starten (`npm run dev`). Im Tagesplaner ein bestehendes Todo bearbeiten (TodoModal öffnet sich im Edit-Mode, kein Fehler). Confirm: bestehende Funktionalität unverändert.

- [ ] **Schritt 5: Commit**

  ```bash
  git add src/components/TodoModal/TodoModal.jsx
  git commit -m "feat(TodoModal): prefill-Prop für vorausgefülltes Datum/Uhrzeit"
  ```

---

## Task 2: CSS — WeekTerminEditModal + Cursors

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

Styles für das Inline-Edit-Modal bei reinen Termin-Slots und Cursor-Hinweise für klickbare Bereiche.

- [ ] **Schritt 1: Cursor-Styles bei `.weekDayCol` und `.weekSlotBlock` ergänzen**

  In `.weekDayCol` (ab Z. 337) `cursor: crosshair;` ergänzen:
  ```css
  .weekDayCol {
    flex: 1;
    border-left: 1px solid var(--border-dim);
    position: relative;
    cursor: crosshair;
    /* height wird per inline style gesetzt */
  }
  ```

  Nach `.weekSlotBlock` (Z. 376) `cursor: pointer;` ergänzen:
  ```css
  .weekSlotBlock {
    position: absolute;
    left: 2px;
    right: 2px;
    border-radius: 5px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 3px 4px;
    min-height: 10px;
    cursor: pointer;
  }
  ```

- [ ] **Schritt 2: WeekTerminEditModal-Styles ans Ende der Datei anhängen**

  Nach dem letzten CSS-Block anfügen:
  ```css
  /* ─── WeekTerminEditModal ────────────────────────────────── */
  .terminOverlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .terminCard {
    background: var(--surface, #1e1e2e);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 20px 18px 16px;
    width: 100%;
    max-width: 300px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .terminTitle {
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .terminInput {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 10px 12px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.9rem;
    color: var(--text);
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  .terminInput:focus {
    border-color: var(--primary);
  }

  .terminLabel {
    font-family: 'Outfit', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-dim);
    margin-bottom: 6px;
    display: block;
  }

  .terminDurRow {
    display: flex;
    gap: 6px;
  }

  .terminDurBtn {
    flex: 1;
    padding: 6px 4px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: var(--text-dim);
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s;
    text-align: center;
  }

  .terminDurBtnActive {
    background: rgba(139,92,246,0.2);
    border-color: rgba(139,92,246,0.4);
    color: var(--primary);
  }

  .terminColorRow {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .terminColorDot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.12s, transform 0.12s;
  }

  .terminColorDotActive {
    border-color: rgba(255,255,255,0.7);
    transform: scale(1.2);
  }

  .terminActions {
    display: flex;
    gap: 8px;
    margin-top: 2px;
  }

  .terminBtnSave {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: none;
    background: var(--primary);
    color: #fff;
    font-family: 'Outfit', sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.12s;
  }

  .terminBtnSave:active { opacity: 0.8; }

  .terminBtnCancel {
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: transparent;
    color: var(--text-dim);
    font-family: 'Outfit', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s;
  }

  .terminBtnCancel:active { background: rgba(255,255,255,0.06); }
  ```

- [ ] **Schritt 3: Manuell testen (visuell)**

  Noch keine Funktionalität — nur sicherstellen dass keine CSS-Syntaxfehler auftreten (App kompiliert ohne Fehler).

- [ ] **Schritt 4: Commit**

  ```bash
  git add src/features/calendar/TabKalender/TabKalender.module.css
  git commit -m "style(woche): WeekTerminEditModal CSS + Cursor-Styles"
  ```

---

## Task 3: WeekTerminEditModal-Komponente + States in TabKalender

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

Dieser Task fügt die lokale `WeekTerminEditModal`-Komponente ein und verdrahtet die drei neuen States (`editingTodo`, `editingTermin`, `quickCreate`). Die Event-Handler kommen erst in Task 4.

- [ ] **Schritt 1: TodoModal importieren**

  In `TabKalender.jsx` (aktuell keine TodoModal-Import-Zeile) nach den bestehenden Imports ergänzen:
  ```js
  import TodoModal from '../../../components/TodoModal/TodoModal'
  ```
  Einzufügen nach der Zeile `import s from './TabKalender.module.css'` (aktuell letzte Import-Zeile).

- [ ] **Schritt 2: `WeekTerminEditModal`-Komponente einfügen**

  Direkt vor der Zeile `export default function TabKalender()` (Z. 275) die neue Komponente einfügen:

  ```jsx
  const TERMIN_COLORS = [
    { value: '#8B5CF6', label: 'Lila'    },
    { value: '#FB7185', label: 'Rot'     },
    { value: '#F59E0B', label: 'Gelb'    },
    { value: '#10B981', label: 'Grün'    },
    { value: '#06B6D4', label: 'Cyan'    },
  ]

  function WeekTerminEditModal({ dk, slotKey, slot, onSave, onClose }) {
    const [text,     setText]     = useState(slot.text     ?? '')
    const [duration, setDuration] = useState(slot.duration ?? 30)
    const [color,    setColor]    = useState(slot.color    ?? '#8B5CF6')

    const handleSave = () => {
      if (!text.trim()) return
      onSave(dk, slotKey, { ...slot, text: text.trim(), duration, color })
    }

    return (
      <div className={s.terminOverlay} onClick={onClose}>
        <div className={s.terminCard} onClick={e => e.stopPropagation()}>
          <p className={s.terminTitle}>Termin bearbeiten</p>

          <input
            className={s.terminInput}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Bezeichnung"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          />

          <div>
            <span className={s.terminLabel}>Dauer</span>
            <div className={s.terminDurRow}>
              {[15, 30, 60, 90].map(v => (
                <button
                  key={v}
                  className={[s.terminDurBtn, duration === v ? s.terminDurBtnActive : ''].join(' ')}
                  onClick={() => setDuration(v)}
                >
                  {v < 60 ? `${v}m` : `${v / 60}h`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={s.terminLabel}>Farbe</span>
            <div className={s.terminColorRow}>
              {TERMIN_COLORS.map(c => (
                <button
                  key={c.value}
                  className={[s.terminColorDot, color === c.value ? s.terminColorDotActive : ''].join(' ')}
                  style={{ background: c.value }}
                  onClick={() => setColor(c.value)}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>

          <div className={s.terminActions}>
            <button className={s.terminBtnSave} onClick={handleSave}>Speichern</button>
            <button className={s.terminBtnCancel} onClick={onClose}>Abbrechen</button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Schritt 3: Drei neue States in `TabKalender` ergänzen**

  In der Funktion `TabKalender` (nach dem bestehenden `const [visibleEnd, setVisibleEnd]`-State, Z. ~293) ergänzen:
  ```js
  const [editingTodo,   setEditingTodo]   = useState(null)
  const [editingTermin, setEditingTermin] = useState(null)
  const [quickCreate,   setQuickCreate]   = useState(null)
  ```

- [ ] **Schritt 4: `handleSaveTermin`-Callback ergänzen**

  Direkt nach den neuen States:
  ```js
  const handleSaveTermin = (dk, slotKey, updatedSlot) => {
    setDays(prev => ({
      ...prev,
      [dk]: { ...prev[dk], [slotKey]: updatedSlot },
    }))
    setEditingTermin(null)
  }
  ```

- [ ] **Schritt 5: Modals am Ende des Returns rendern**

  Direkt vor dem letzten `</div>` (schließendes Tag von `<div className={s.page}>`) die drei Modal-Renders einfügen:
  ```jsx
  {editingTodo && (
    <TodoModal
      existingTodo={editingTodo}
      onClose={() => setEditingTodo(null)}
    />
  )}
  {editingTermin && (
    <WeekTerminEditModal
      dk={editingTermin.dk}
      slotKey={editingTermin.slotKey}
      slot={editingTermin.slot}
      onSave={handleSaveTermin}
      onClose={() => setEditingTermin(null)}
    />
  )}
  {quickCreate && (
    <TodoModal
      prefill={quickCreate}
      onClose={() => setQuickCreate(null)}
    />
  )}
  ```

- [ ] **Schritt 6: Manuell testen**

  App kompiliert und läuft ohne Fehler. Noch keine Interaktion auslösbar — das folgt in Task 4.

- [ ] **Schritt 7: Commit**

  ```bash
  git add src/features/calendar/TabKalender/TabKalender.jsx
  git commit -m "feat(woche): WeekTerminEditModal + States editingTodo/editingTermin/quickCreate"
  ```

---

## Task 4: Event-Handler — Doppelklick + Klick

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

Dieser Task verdrahtet die fertigen States mit den Event-Handlern im Rendering-Block.

- [ ] **Schritt 1: `onDoubleClick` auf `weekSlotBlock` ergänzen**

  Im Rendering der Slots (im `entries.map`-Block, Bereich Z. ~563–585) den `weekSlotBlock`-div um `onDoubleClick` erweitern.

  Alt:
  ```jsx
  <div
    key={key}
    className={[s.weekSlotBlock, isTodo ? s.weekSlotTodo : ''].join(' ')}
    style={{ top, height, background: slot.color || 'var(--primary)' }}
  >
  ```
  Neu:
  ```jsx
  <div
    key={key}
    className={[s.weekSlotBlock, isTodo ? s.weekSlotTodo : ''].join(' ')}
    style={{ top, height, background: slot.color || 'var(--primary)' }}
    onDoubleClick={(e) => {
      e.stopPropagation()
      if (slot.todoId) {
        const t = todos.find(td => td.id === slot.todoId)
        if (t) setEditingTodo(t)
      } else {
        setEditingTermin({ dk, slotKey: key, slot })
      }
    }}
  >
  ```

- [ ] **Schritt 2: `onClick` auf `weekDayCol` ergänzen**

  Den äußeren `weekDayCol`-div (Bereich Z. ~553–558) um `onClick` erweitern.

  Alt:
  ```jsx
  <div
    key={dk}
    className={[s.weekDayCol, isColToday ? s.weekDayColToday : ''].join(' ')}
    style={{ height: colHeight }}
  >
  ```
  Neu:
  ```jsx
  <div
    key={dk}
    className={[s.weekDayCol, isColToday ? s.weekDayColToday : ''].join(' ')}
    style={{ height: colHeight }}
    onClick={(e) => {
      if (e.target !== e.currentTarget) return
      const slotIndex = Math.floor(e.nativeEvent.offsetY / SLOT_H)
      const h  = visibleStart + slotIndex * 0.5
      const hh = String(Math.floor(h)).padStart(2, '0')
      const mm = h % 1 ? '30' : '00'
      setQuickCreate({ date: dk, time: `${hh}:${mm}` })
    }}
  >
  ```

- [ ] **Schritt 3: Manuell testen — Doppelklick auf Todo-Slot**

  1. Wochenansicht öffnen
  2. Einen Todo-Slot doppelklicken (blauer/lila Block)
  3. TodoModal öffnet sich mit den vorhandenen Daten vorausgefüllt
  4. Text ändern → Speichern → Block zeigt neuen Text in der Wochenansicht

- [ ] **Schritt 4: Manuell testen — Doppelklick auf reinen Termin-Slot**

  1. Einen reinen Termin-Slot doppelklicken (Termin ohne Todo-Markierung)
  2. WeekTerminEditModal öffnet sich mit aktuellem Text, Dauer, Farbe
  3. Text oder Farbe ändern → Speichern → Block aktualisiert sich
  4. Abbrechen → keine Änderung

- [ ] **Schritt 5: Manuell testen — Klick auf leere Zelle**

  1. Auf eine leere Stelle in einer Tagesspalte klicken
  2. TodoModal öffnet sich, Details-Sektion ist offen, Datum und Uhrzeit sind vorausgefüllt
  3. Text eingeben → Speichern → neuer Block erscheint in der Wochenansicht an der geklickten Uhrzeit
  4. Klick auf einen bestehenden Slot → kein Modal öffnet sich (nur Doppelklick)

- [ ] **Schritt 6: Edge Cases prüfen**

  - Klick auf `.weekNowLine` (Jetzt-Linie) → target ≠ currentTarget → kein quickCreate ✓
  - Klick in `.weekTimeAxis` (Zeitachse links) → eigenes Element, kein weekDayCol ✓
  - Doppelklick auf PillStrip-Chips → betrifft nicht weekDayCol ✓

- [ ] **Schritt 7: Commit**

  ```bash
  git add src/features/calendar/TabKalender/TabKalender.jsx
  git commit -m "feat(woche): Doppelklick zum Bearbeiten + Klick auf leere Zelle zum Erstellen"
  ```

---

## Self-Review

**Spec-Coverage:**
- ✅ Feature 1 Todo-Slot: Task 3 (States/Modal) + Task 4 (onDoubleClick)
- ✅ Feature 1 Termin-Slot: Task 2 (CSS) + Task 3 (WeekTerminEditModal) + Task 4 (onDoubleClick)
- ✅ Feature 2 Klick auf leere Zelle: Task 1 (prefill) + Task 3 (quickCreate State) + Task 4 (onClick)
- ✅ `prefill`-Prop in TodoModal: Task 1
- ✅ detailsOpen auto-aufklappen: Task 1
- ✅ Nur ein Modal gleichzeitig (exklusive States): Task 3 + 4 (States unabhängig voneinander)
- ✅ Edge Case e.target check: Task 4, Schritt 2
- ✅ Cursor-Styles: Task 2, Schritt 1
