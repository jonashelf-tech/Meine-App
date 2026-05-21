# Tagesplaner DayNav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tab "Heute" → "Tagesplaner" mit kompakter DayNav-Pille, Tageswechsel, Heute-Highlight, Kalender-Link und DayPanel-Navigation.

**Architecture:** `viewDate` als lokaler State in TabHeute (init: `store.dayplanDate ?? todayKey()`). Mount-Effect liest `dayplanDate` und löscht es. DayNav ist eine eigene Komponente. DayPanel setzt `store.dayplanDate` vor `setCurrentTab(0)`.

**Tech Stack:** React 18, Zustand, CSS Modules, kein Test-Runner (manuelle Verifikation im Dev Server)

---

## File Map

| Aktion | Pfad |
|---|---|
| Modify | `src/store/index.js` |
| Create | `src/components/DayNav/DayNav.jsx` |
| Create | `src/components/DayNav/DayNav.module.css` |
| Modify | `src/features/calendar/TabHeute/TabHeute.jsx` |
| Modify | `src/features/calendar/TabKalender/TabKalender.jsx` |
| Modify | `src/App.jsx` |
| Modify | `kontext/kern.md` |

---

## Task 1: Store — dayplanDate

**Files:**
- Modify: `src/store/index.js:72-75`

- [ ] **Schritt 1: Navigation-Sektion erweitern**

In `src/store/index.js`, den Block `// ─── Navigation` (Zeile 72) wie folgt erweitern:

```js
  // ─── Navigation ────────────────────────────────────────
  currentTab:  0,
  setCurrentTab: (tab) => set({ currentTab: tab }),
  heuteModus: 'manuell',
  setHeuteModus: (modus) => set({ heuteModus: modus }),
  dayplanDate: null,
  setDayplanDate: (dk) => set({ dayplanDate: dk }),
```

- [ ] **Schritt 2: Verifikation**

Dev Server starten (`npm run dev`) und prüfen, dass kein Fehler in der Konsole erscheint.

- [ ] **Schritt 3: Commit**

```bash
git add src/store/index.js
git commit -m "feat: store — dayplanDate für DayPanel→Tagesplaner Navigation"
```

---

## Task 2: DayNav Komponente

**Files:**
- Create: `src/components/DayNav/DayNav.jsx`
- Create: `src/components/DayNav/DayNav.module.css`

- [ ] **Schritt 1: CSS erstellen**

Datei `src/components/DayNav/DayNav.module.css`:

```css
.pill {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 999px;
  padding: 6px 4px;
  gap: 0;
  user-select: none;
}

.arrow {
  background: none;
  border: none;
  color: rgba(255,255,255,0.28);
  font-size: 1rem;
  padding: 2px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, text-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
  line-height: 1;
}

.arrow:hover {
  color: rgba(255,255,255,0.7);
}

.arrowToday {
  color: var(--primary);
  text-shadow: 0 0 10px var(--glow-primary);
}

.arrowToday:hover {
  color: var(--primary);
  text-shadow: 0 0 16px var(--glow-primary);
}

.label {
  flex: 1;
  text-align: center;
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: rgba(255,255,255,0.75);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
  transition: color 0.15s, text-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.labelToday {
  color: var(--primary);
  text-shadow: 0 0 12px var(--glow-primary);
}

.label:hover {
  color: rgba(255,255,255,0.95);
}

.labelToday:hover {
  color: var(--primary);
}
```

- [ ] **Schritt 2: JSX erstellen**

Datei `src/components/DayNav/DayNav.jsx`:

```jsx
import { todayKey, dateKey } from '../../utils'
import s from './DayNav.module.css'

const DAY_SHORT   = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function shiftDay(dk, n) {
  const [y, m, d] = dk.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return dateKey(date)
}

function formatDate(dk) {
  const [y, m, d] = dk.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAY_SHORT[date.getDay()]}, ${d}. ${MONTH_NAMES[m - 1]}`
}

export default function DayNav({ date, onChange, onCalendarOpen }) {
  const today      = todayKey()
  const isToday    = date === today
  const leftGlows  = date > today   // heute liegt in der Vergangenheit → ‹ bringt zu heute
  const rightGlows = date < today   // heute liegt in der Zukunft → › bringt zu heute

  return (
    <div className={s.pill}>
      <button
        className={[s.arrow, leftGlows ? s.arrowToday : ''].join(' ')}
        onClick={() => onChange(shiftDay(date, -1))}
        aria-label="Vorheriger Tag"
      >
        ‹
      </button>
      <span
        className={[s.label, isToday ? s.labelToday : ''].join(' ')}
        onClick={onCalendarOpen}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onCalendarOpen?.()}
      >
        {formatDate(date)}
      </span>
      <button
        className={[s.arrow, rightGlows ? s.arrowToday : ''].join(' ')}
        onClick={() => onChange(shiftDay(date, 1))}
        aria-label="Nächster Tag"
      >
        ›
      </button>
    </div>
  )
}
```

- [ ] **Schritt 3: Verifikation**

Dev Server prüfen — noch kein Render, aber kein Import-Fehler.

- [ ] **Schritt 4: Commit**

```bash
git add src/components/DayNav/DayNav.jsx src/components/DayNav/DayNav.module.css
git commit -m "feat: DayNav Komponente — Tagesnavigation Pille"
```

---

## Task 3: TabHeute — viewDate State & DayNav einbinden

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: Imports + Store-Feld ergänzen**

Zeile 1–11 in `TabHeute.jsx`:

```jsx
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, sk, parseHHMM, ALL_SLOT_KEYS } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { useDragDrop } from '../../../hooks/useDragDrop'
import Zeitplan         from '../Zeitplan/Zeitplan'
import Pool             from '../Pool/Pool'
import EditModal        from '../../../components/EditModal/EditModal'
import ReminderSection  from '../../tools/reminder/ReminderSection'
import ClockPopup       from '../Zeitplan/ClockPopup'
import DayNav           from '../../../components/DayNav/DayNav'
import s from './TabHeute.module.css'
```

- [ ] **Schritt 2: Store destructuring + viewDate State**

Den Beginn der Komponente (Zeile 13–29) wie folgt anpassen:

```jsx
export default function TabHeute() {
  const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate } = useAppStore()

  const [viewDate, setViewDate] = useState(() => dayplanDate ?? todayKey())
  const [visStart, setVisStart] = useState(() => lv(SK.visStart, 8))
  const [visEnd,   setVisEnd]   = useState(() => lv(SK.visEnd,   20))
  const [editingTodo, setEditingTodo] = useState(null)
  const [clockPopup,  setClockPopup]  = useState(null)

  const { registerHalf, startDrag } = useDragDrop()

  const promptedRef = useRef(new Set())
  const snoozeRef   = useRef({})
  const daysRef     = useRef(days)
  const tickRef     = useRef(null)
```

- [ ] **Schritt 3: Mount-Effect für dayplanDate**

Direkt nach dem `daysRef`-Effect (nach Zeile ~33) einfügen:

```jsx
  // ─── Consume dayplanDate on mount ─────────────────────
  useEffect(() => {
    if (dayplanDate) {
      setViewDate(dayplanDate)
      setDayplanDate(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

- [ ] **Schritt 4: viewDate statt todayKey() in Slot-Zugriffen**

Die Zeile `const viewDate = todayKey()` (aktuell Zeile 28) **entfernen** — viewDate kommt jetzt aus dem State.

Die Zeile `const todaySlots = days[viewDate] ?? {}` bleibt unverändert — sie verwendet bereits `viewDate`.

- [ ] **Schritt 5: Clock-Tick-Effect auf viewDate zeigen**

Im Clock-Interval-Effect (ca. Zeile 78) ist `viewDate` bereits im Dependency-Array. Keine Änderung nötig.

- [ ] **Schritt 6: DayNav in JSX einbinden**

Den return-Block (`<div className={s.page}>`) am Anfang ergänzen:

```jsx
  return (
    <div className={s.page}>
      <DayNav
        date={viewDate}
        onChange={setViewDate}
        onCalendarOpen={() => setCurrentTab(1)}
      />
      <Zeitplan
        slots={todaySlots}
        /* ... alle anderen Props bleiben gleich ... */
```

> Hinweis: Alle anderen Props von `<Zeitplan>` und `<Pool>` bleiben unverändert. Nur `<DayNav>` wird oben eingefügt.

- [ ] **Schritt 7: Verifikation im Browser**

- Dev Server öffnen, Tab "Tagesplaner" (noch "Heute") aufrufen
- DayNav-Pille erscheint oben
- Heute: Datum leuchtet cyan
- Pfeil klicken: Datum wechselt, Datum wird weiß, Pfeil Richtung heute leuchtet
- Klick auf Datum: Kalender-Tab öffnet sich
- Pool und Zeitplan zeigen Daten des gewählten Tags

- [ ] **Schritt 8: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: TabHeute — viewDate State, DayNav eingebunden"
```

---

## Task 4: TabKalender — DayPanel navigiert mit Datum

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx:69,198,472-479`

- [ ] **Schritt 1: setDayplanDate aus Store holen**

In `TabKalender` (Zeile 198), `setDayplanDate` zum destructuring ergänzen:

```jsx
export default function TabKalender() {
  const { days, todos, birthdays = [], activeTools = [], toolColors = {}, setCurrentTab, setDayplanDate } = useAppStore()
```

- [ ] **Schritt 2: setDayplanDate an DayPanel übergeben**

Im JSX von `TabKalender`, wo `<DayPanel>` gerendert wird, die Prop ergänzen:

```jsx
<DayPanel
  dateKey={selectedDay}
  days={days}
  todos={todos}
  activeTools={activeTools}
  toolColors={toolColors}
  setCurrentTab={setCurrentTab}
  setDayplanDate={setDayplanDate}
/>
```

> Hinweis: Den genauen Render-Aufruf von DayPanel im JSX des TabKalender suchen (im unteren Teil der Datei) und dort die neue Prop hinzufügen.

- [ ] **Schritt 3: DayPanel Signatur + Handler erweitern**

In der `DayPanel`-Funktion (Zeile 69):

```jsx
function DayPanel({ dateKey, days, todos, activeTools, toolColors, setCurrentTab, setDayplanDate }) {
```

Die beiden `onDoubleClick`-Handler für Zeitplan-Einträge und erledigte Todos anpassen:

**Zeitplan-Einträge** (Zeile 118):
```jsx
onDoubleClick={() => {
  setDayplanDate(dateKey)
  setCurrentTab(0)
}}
```

**Erledigte Todos** (Zeile 148):
```jsx
onDoubleClick={() => {
  setDayplanDate(dateKey)
  setCurrentTab(0)
}}
```

> Tool-Chips bleiben unverändert (`onDoubleClick={() => tab != null && setCurrentTab(tab)}`).

- [ ] **Schritt 4: Verifikation**

- Kalender öffnen, Monatskachel klicken → DayPanel erscheint
- Doppelklick auf Zeitplan-Eintrag → Tagesplaner öffnet auf dem richtigen Datum
- Datum in DayNav stimmt mit dem angeklickten Tag überein
- Doppelklick auf Tool-Chip → Tool öffnet wie bisher (kein Datum-Sprung)

- [ ] **Schritt 5: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: DayPanel navigiert Tagesplaner auf korrekten Tag"
```

---

## Task 5: App.jsx — Tab umbenennen

**Files:**
- Modify: `src/App.jsx:21`

- [ ] **Schritt 1: Label ändern**

In `src/App.jsx`, das TABS-Array (Zeile 20–25):

```jsx
const TABS = [
  { id: 0, label: 'Tagesplaner', icon: '◈' },
  { id: 1, label: 'Kalender',    icon: '⊞' },
  { id: 2, label: 'Tools',       icon: '⚙' },
  { id: 3, label: 'Einstellungen', icon: '≡' },
]
```

- [ ] **Schritt 2: Verifikation**

Tab-Bar zeigt "Tagesplaner" statt "Heute".

- [ ] **Schritt 3: Commit**

```bash
git add src/App.jsx
git commit -m "style: tab 'Heute' → 'Tagesplaner'"
```

---

## Task 6: Kontext updaten

**Files:**
- Modify: `kontext/kern.md`

- [ ] **Schritt 1: Tab-Routing aktualisieren**

Den Tab-Routing-Block in `kontext/kern.md`:

```
Tab 0  — Tagesplaner    (TabHeute: DayNav + Pool + Zeitplan)
```

Und unter `## TabHeute — Features` ergänzen:

```
- **DayNav:** Kompakte Pille oben — ‹ Datum ›. Datum cyan+glow = heute, weiß = anderer Tag. Pfeil Richtung heute leuchtet wenn nicht auf heute. Klick auf Datum → Tab 1. viewDate als lokaler State (init: store.dayplanDate ?? todayKey()). Reset auf heute beim Tab-Wechsel (unmount).
- **Store.dayplanDate:** DayPanel setzt dieses Feld vor setCurrentTab(0) → TabHeute init liest es einmalig und löscht es.
```

- [ ] **Schritt 2: Commit**

```bash
git add kontext/kern.md
git commit -m "docs: kontext — Tagesplaner DayNav dokumentiert"
```
