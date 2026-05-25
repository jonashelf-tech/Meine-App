# Tagesplaner + Kalender Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vier UI-Verbesserungen: größere Navigations-Pfeile, bidirektionale Tag-Verlinkung zwischen Tagesplaner und Kalender, Kalender startet immer mit ausgewähltem Tag, Restore-Popup blockiert Tagauswahl.

**Architecture:** Neues flüchtiges Store-Feld `calendarDate` (analog `dayplanDate`) für Tagesplaner→Kalender-Navigation. `restoreTodo`-State aus DayPanel nach TabKalender gehoben damit `handleDayClick` den Popup-Guard implementieren kann. Alle anderen Änderungen sind CSS oder lokaler State.

**Tech Stack:** React 18, Zustand, CSS Modules, Vite/PWA

---

## Betroffene Dateien

| Datei | Art |
|---|---|
| `src/components/NavPill/NavPill.module.css` | Modify — Arrow Touch-Target |
| `src/store/index.js` | Modify — `calendarDate` hinzufügen |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Modify — `setCalendarDate` beim Kalender-Link |
| `src/features/calendar/TabKalender/TabKalender.jsx` | Modify — alle Kalender-Änderungen |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Modify — DayPanel Date-Link Style |

---

### Task 1: NavPill — Pfeil-Buttons größer

**Files:**
- Modify: `src/components/NavPill/NavPill.module.css`

- [ ] **Schritt 1: `.arrow` in NavPill.module.css anpassen**

Ersetze den gesamten `.arrow`-Block:

```css
.arrow {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 1.6rem;
  font-weight: 700;
  min-width: 44px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, text-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Schritt 2: Im Browser prüfen**

`npm run dev` starten, Tagesplaner öffnen. Die `‹` / `›` Pfeile müssen deutlich größer und gut tippbar sein. Gleiches im Kalender (Woche/Monat).

- [ ] **Schritt 3: Committen**

```bash
git add src/components/NavPill/NavPill.module.css
git commit -m "feat: navpill pfeil-buttons größer (44px touch-target)"
```

---

### Task 2: Store — `calendarDate` hinzufügen

**Files:**
- Modify: `src/store/index.js`

- [ ] **Schritt 1: `calendarDate` in den Navigation-Abschnitt einfügen**

In `src/store/index.js`, direkt nach `setDayplanDate`:

```js
  dayplanDate: null,
  setDayplanDate: (dk) => set({ dayplanDate: dk }),
  calendarDate: null,
  setCalendarDate: (dk) => set({ calendarDate: dk }),
```

(Zeile 77–78 wird zu Zeile 77–80.)

- [ ] **Schritt 2: Committen**

```bash
git add src/store/index.js
git commit -m "feat: store calendarDate für tagesplaner→kalender-navigation"
```

---

### Task 3: TabHeute — `calendarDate` beim Kalender-Link setzen

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: `setCalendarDate` aus Store destructuren**

In TabHeute.jsx, Zeile 20 — `useAppStore()`-Destructuring um `setCalendarDate` ergänzen:

```js
const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate, setCalendarDate, blockers, setBlockers } = useAppStore()
```

- [ ] **Schritt 2: `handleDoneCalendar` anpassen**

Zeile 151–153 — `setCalendarDate(viewDate)` vor `setCurrentTab(1)` einfügen:

```js
  const handleDoneCalendar = useCallback(() => {
    setCalendarDate(viewDate)
    setCurrentTab(1)
  }, [setCurrentTab, setCalendarDate, viewDate])
```

- [ ] **Schritt 3: DayNav `onCalendarOpen` anpassen**

Zeile 248 in der JSX — `onCalendarOpen` ebenfalls `setCalendarDate` aufrufen lassen:

```jsx
      <DayNav
        date={viewDate}
        onChange={setViewDate}
        onCalendarOpen={() => { setCalendarDate(viewDate); setCurrentTab(1) }}
      />
```

- [ ] **Schritt 4: Im Browser prüfen**

Auf einen beliebigen Nicht-heute-Tag navigieren, dann auf das Datum-Label tippen → Kalender öffnet. Noch nichts sichtbar, da TabKalender noch nicht angepasst. Kein JS-Fehler in der Konsole.

- [ ] **Schritt 5: Committen**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: tabheute setzt calendarDate beim kalender-öffnen"
```

---

### Task 4: TabKalender — alle Änderungen

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

Dieser Task hat mehrere Schritte, da alles in einer Datei liegt. Reihenfolge ist wichtig.

#### 4a: Store-Felder + selectedDay-Default + Mount-Effect

- [ ] **Schritt 1: `calendarDate` + `setCalendarDate` aus Store destructuren**

Zeile 228 — Store-Destructuring ergänzen:

```js
  const { days, todos, birthdays = [], activeTools = [], toolColors = {}, setCurrentTab, setDayplanDate, setTodos, calendarDate, setCalendarDate } = useAppStore()
```

- [ ] **Schritt 2: `selectedDay` Default auf `todayKey` setzen**

Zeile 240 — Default-Wert ändern:

```js
  const [selectedDay, setSelectedDay] = useState(todayKey)
```

- [ ] **Schritt 3: Mount-Effect für `calendarDate` hinzufügen**

Nach dem bestehenden `useEffect` (Zeile 246–249), neuen Effect einfügen:

```js
  useEffect(() => {
    if (!calendarDate) return
    const [yr, mo] = calendarDate.split('-').map(Number)
    if (view === 'monat') {
      setMonthRef({ year: yr, month: mo - 1 })
    } else {
      const [y, m, d] = calendarDate.split('-').map(Number)
      setWeekStart(getMonday(new Date(y, m - 1, d)))
    }
    setSelectedDay(calendarDate)
    setCalendarDate(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

#### 4b: `restoreTodo` nach TabKalender heben

- [ ] **Schritt 4: `restoreTodo`-State + `handleRestore` in TabKalender anlegen**

Nach den bestehenden `useState`-Deklarationen (nach Zeile 243), einfügen:

```js
  const [restoreTodo, setRestoreTodo] = useState(null)

  const handleRestore = (todo) => {
    setTodos(prev => prev.map(t =>
      t.id === todo.id
        ? { ...t, done: false, doneAt: null, date: null, time: null }
        : t
    ))
    setRestoreTodo(null)
  }
```

- [ ] **Schritt 5: `handleDayClick` — kein Toggle-zu-null, Popup-Block**

Zeile 256–258 — `handleDayClick` ersetzen:

```js
  const handleDayClick = (dateKey) => {
    if (restoreTodo) return
    setSelectedDay(dateKey)
  }
```

- [ ] **Schritt 6: DayPanel-Aufruf — neue Props übergeben**

Zeile 489–499 — DayPanel-Aufruf aktualisieren:

```jsx
          {selectedDay && (
            <DayPanel
              dateKey={selectedDay}
              days={days}
              todos={todos}
              activeTools={activeTools}
              toolColors={toolColors}
              setCurrentTab={setCurrentTab}
              setDayplanDate={setDayplanDate}
              setTodos={setTodos}
              restoreTodo={restoreTodo}
              setRestoreTodo={setRestoreTodo}
              handleRestore={handleRestore}
            />
          )}
```

#### 4c: DayPanel — lokalen restoreTodo-State entfernen, Header klickbar, DoubleClick weg

- [ ] **Schritt 7: DayPanel-Signatur erweitern**

Zeile 71 — Props ergänzen:

```js
function DayPanel({ dateKey, days, todos, activeTools, toolColors, setCurrentTab, setDayplanDate, setTodos, restoreTodo, setRestoreTodo, handleRestore }) {
```

- [ ] **Schritt 8: Lokalen State + lokale `handleRestore`-Funktion aus DayPanel entfernen**

Zeilen 72–80 — diese Zeilen vollständig löschen:

```js
  // LÖSCHEN:
  const [restoreTodo, setRestoreTodo] = useState(null)

  const handleRestore = (todo) => {
    setTodos(prev => prev.map(t =>
      t.id === todo.id
        ? { ...t, done: false, doneAt: null, date: null, time: null }
        : t
    ))
    setRestoreTodo(null)
  }
```

DayPanel nutzt `useState` weiterhin für `open` — der Import bleibt unverändert.

- [ ] **Schritt 9: DayPanel-Header — Datum klickbar machen**

Zeile 104–106 — `dayPanelDate`-Span anpassen:

```jsx
      <div className={s.dayPanelHeader}>
        <span
          className={[s.dayPanelDate, s.dayPanelDateLink].join(' ')}
          onClick={() => { setDayplanDate(dateKey); setCurrentTab(0) }}
        >
          {label}
        </span>
      </div>
```

- [ ] **Schritt 10: `onDoubleClick` von Zeitplan-Einträgen entfernen**

Im Zeitplan-Block (ca. Zeile 126–134) — `onDoubleClick` aus dem Entry-div entfernen:

```jsx
                <div
                  key={key}
                  className={[s.dayPanelEntry, isTodo ? s.dayPanelEntryTodo : ''].join(' ')}
                  style={{ borderLeftColor: color }}
                >
                  <span className={s.dayPanelEntryTime} style={{ color }}>{hh}:{mm}</span>
                  <span className={s.dayPanelEntryText}>{slot.text}</span>
                  {isTodo && <span className={s.dayPanelBadge}>Todo</span>}
                </div>
```

#### 4d: CSS für DayPanel-Date-Link

- [ ] **Schritt 11: `.dayPanelDateLink` in TabKalender.module.css hinzufügen**

Am Ende der Datei `src/features/calendar/TabKalender/TabKalender.module.css` einfügen:

```css
.dayPanelDateLink {
  cursor: pointer;
  transition: color 0.15s;
}

.dayPanelDateLink:hover {
  color: var(--teal);
}
```

#### 4e: Verifizieren + Committen

- [ ] **Schritt 12: Im Browser vollständig testen**

Folgende Szenarien prüfen:

1. **Tagesplaner → Kalender:** Auf einen anderen Tag (z.B. morgen) navigieren, Datum-Label antippen → Kalender öffnet, der richtige Tag ist im DayPanel ausgewählt (Monat) bzw. die richtige Woche ist sichtbar (Woche).

2. **Kalender → Tagesplaner:** Im Kalender einen Tag anklicken → DayPanel öffnet. Auf das Datum-Label im DayPanel tippen → Tagesplaner öffnet auf genau diesem Tag.

3. **Kalender öffnen ohne Link:** Kalender direkt über Tab-Bar öffnen → Heute ist automatisch ausgewählt (DayPanel für heute sichtbar).

4. **Anderen Tag anklicken:** Im Monat auf einen anderen Tag klicken → selectedDay wechselt sofort, kein Toggle zurück zu null.

5. **Restore-Popup blockiert:** Erledigtes Todo im DayPanel anklicken → Popup erscheint. Anderen Tag antippen → Popup bleibt, selectedDay ändert sich nicht. Popup schließen → Navigation wieder möglich.

- [ ] **Schritt 13: Committen**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git add src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "feat: kalender navigation — selectedDay-default, bidirektionale verlinkung, popup-block"
```

---

## Zusammenfassung der Commits

1. `feat: navpill pfeil-buttons größer (44px touch-target)`
2. `feat: store calendarDate für tagesplaner→kalender-navigation`
3. `feat: tabheute setzt calendarDate beim kalender-öffnen`
4. `feat: kalender navigation — selectedDay-default, bidirektionale verlinkung, popup-block`
