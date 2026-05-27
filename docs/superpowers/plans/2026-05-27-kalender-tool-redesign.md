# Kalender Tool-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kalender-Dots und DayPanel so umbauen, dass nur Tools mit tatsächlichen Daten für einen Tag sichtbar werden — Geburtstage als synthetische Balken, Gewicht mit Mini-Sektion, Haushalt/Reminder als reine Dots, generische Tools-Sektion fällt weg.

**Architecture:** Alle Änderungen in `TabKalender.jsx` + `TabKalender.module.css`. `getToolDots` wird neu geschrieben. DayPanel bekommt `birthdays` und `weightEntry` als neue Props. Die Tools-Sektion im DayPanel wird durch eine bedingte Gewicht-Sektion ersetzt. Geburtstags-Balken werden synthetisch aus `birthdays[]` abgeleitet.

**Tech Stack:** React 18, CSS Modules, Zustand. Keine Test-Suite vorhanden — Verifikation via `npm run dev` + visuelle Browser-Prüfung.

---

## Dateien

| Datei | Aktion |
|---|---|
| `src/features/calendar/TabKalender/TabKalender.jsx` | Modify — Hauptdatei |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Modify — Styles |

---

## Task 1: showTools entfernen + getToolDots neu schreiben

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

### Was passiert

- `showTools` State fällt weg
- `getToolDots` wird komplett neu geschrieben: nur noch Gewicht/Haushalt/Reminder, nur wenn Daten vorhanden
- Dot-Rendering wird vereinfacht: solid dots, kein Ring-Stil mehr
- `weightEntries` wird als `useMemo` geladen (einmalig pro Mount)
- Tools-Toggle im Strip fällt weg
- `showTools`-Prop aus DayPanel-Aufruf entfernt

---

- [ ] **Schritt 1: Import `loadEntries` hinzufügen**

In `TabKalender.jsx`, bestehende Imports (oben im File):

```js
// vorher:
import { TOOL_REGISTRY, ToolIcon } from '../../tools/toolRegistry'
import { TOOL_TAB } from '../../tools/toolTabs'

// nachher (TOOL_REGISTRY und ToolIcon bleiben noch — werden in Task 5 entfernt):
import { TOOL_TAB } from '../../tools/toolTabs'
import { loadEntries } from '../../tools/gewicht/gewichtData'
```

---

- [ ] **Schritt 2: `getToolDots` komplett ersetzen**

Aktuelle Funktion (Zeile 43–57) vollständig ersetzen:

```js
function getToolDots(dk, todos, activeTools, weightEntries, days, toolColors) {
  const dots = []

  if (activeTools.includes('gewicht')) {
    if (weightEntries.some(e => e.date === dk))
      dots.push({ id: 'gewicht', color: getToolColor('gewicht', toolColors) })
  }

  if (activeTools.includes('haushalt')) {
    if (todos.some(t => t.toolId === 'haushalt' && t.createdAt?.startsWith(dk)))
      dots.push({ id: 'haushalt', color: getToolColor('haushalt', toolColors) })
  }

  if (activeTools.includes('reminder')) {
    const hasTodo = todos.some(t => t.reminderItemId && t.createdAt?.startsWith(dk))
    const hasSlot = Object.values(days[dk] ?? {}).some(s => s.reminderItemId)
    if (hasTodo || hasSlot)
      dots.push({ id: 'reminder', color: getToolColor('reminder', toolColors) })
  }

  return dots
}
```

---

- [ ] **Schritt 3: `showTools` State entfernen + `weightEntries` hinzufügen**

Im `TabKalender`-Component (Bereich mit den useState-Zeilen):

```js
// Entfernen:
const [showTools, setShowTools] = useState(true)

// Hinzufügen (nach den anderen useState-Zeilen):
const weightEntries = useMemo(() => loadEntries(), [])
```

---

- [ ] **Schritt 4: Dot-Aufruf in Wochenansicht aktualisieren**

Im Wochenansicht-Header (Zeile ~328–349), Abschnitt der `toolDots`-Berechnung:

```js
// Entfernen:
const toolDots = showTools ? getToolDots(dk, todos, activeTools, birthdays) : []

// Ersetzen mit:
const toolDots = getToolDots(dk, todos, activeTools, weightEntries, days, toolColors)
```

Und das Dot-Rendering im Week-Header (bisher `toolDot` + `toolDotActive`):

```jsx
{toolDots.length > 0 && (
  <div className={s.weekDayToolDots}>
    {toolDots.map(dot => (
      <span
        key={dot.id}
        className={s.toolDot}
        style={{ background: dot.color }}
      />
    ))}
  </div>
)}
```

---

- [ ] **Schritt 5: Dot-Aufruf in Monatsansicht aktualisieren**

Im `monthCells.map()` (Zeile ~465):

```js
// Entfernen:
const toolDots = showTools ? getToolDots(dk, todos, activeTools, birthdays) : []

// Ersetzen mit:
const toolDots = getToolDots(dk, todos, activeTools, weightEntries, days, toolColors)
```

Dot-Rendering im Month-Cell (bisher mit `toolDotActive`):

```jsx
{toolDots.length > 0 && (
  <div className={s.toolDots}>
    {toolDots.map(dot => (
      <span
        key={dot.id}
        className={s.toolDot}
        style={{ background: dot.color }}
      />
    ))}
  </div>
)}
```

---

- [ ] **Schritt 6: Tools-Toggle im Strip entfernen**

Im Toggle-Strip (Ende der JSX, Zeile ~526–545):

```jsx
// Entfernen (die gesamte dritte button-Zeile):
<button
  className={[s.toggleChip, s.toggleChipTools, showTools ? s.toggleChipOn : ''].join(' ')}
  onClick={() => setShowTools(v => !v)}
>
  Tools {showTools ? '●' : '○'}
</button>
```

---

- [ ] **Schritt 7: `showTools`-Prop aus DayPanel-Aufruf entfernen**

Im DayPanel-Aufruf (Ende der Monatsansicht-JSX):

```jsx
// showTools prop entfernen — DayPanel benötigt sie nicht mehr
<DayPanel
  dateKey={selectedDay}
  todayKey={todayKey}
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
```

---

- [ ] **Schritt 8: Visuell prüfen**

```bash
npm run dev
```

Öffne Kalender → Monatsansicht:
- Kein "Tools"-Toggle mehr im Strip ✓
- Keine Dot-Ringe mehr für alle Tools ✓
- Dot erscheint nur wenn Gewicht/Haushalt/Reminder Daten vorhanden ✓

---

- [ ] **Schritt 9: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat(kalender): rewrite getToolDots — data-driven dots only, remove Tools toggle"
```

---

## Task 2: Monatsansicht — Geburtstags-Balken + CSS

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

### Was passiert

- `getBirthdaysForCalendarDate` wird importiert
- In der Monatskachel erscheinen Geburtstags-Balken ganz oben (synthetisch, vor Terminen/Todos)
- Nur wenn `activeTools.includes('geburtstage')` und `birthday.kalender === true` (wird von `getBirthdaysForCalendarDate` sichergestellt)

---

- [ ] **Schritt 1: Import hinzufügen**

```js
// Hinzufügen nach dem loadEntries-Import:
import { getBirthdaysForCalendarDate } from '../../tools/geburtstage/birthdayUtils'
```

---

- [ ] **Schritt 2: Birthday-Balken in `monthCells.map()` berechnen**

Im `monthCells.map()`, direkt nach `const toolDots = ...` einfügen:

```js
const birthdayBars = activeTools.includes('geburtstage')
  ? getBirthdaysForCalendarDate(birthdays, dk).map(b => ({
      text:       `⭐ ${b.name}`,
      color:      getToolColor('geburtstage', toolColors),
      isBirthday: true,
    }))
  : []

const allBars  = [...birthdayBars, ...filtered]
const visible  = allBars.slice(0, 3)
const overflow = allBars.length - visible.length
```

Achtung: Die bisherigen `const visible` und `const overflow` Zeilen entfernen (die werden durch obige ersetzt).

---

- [ ] **Schritt 3: Balken-Rendering in Monatskachel anpassen**

Das bestehende `visible.map(...)` im Month-Cell ersetzen:

```jsx
{visible.map((bar, i) => (
  <div
    key={i}
    className={[
      s.cellBar,
      bar.isBirthday ? s.cellBarBirthday : bar.isTodo ? s.cellBarTodo : '',
    ].join(' ')}
    style={{ background: bar.color }}
  >
    <span className={s.cellBarText}>{bar.text}</span>
  </div>
))}
```

---

- [ ] **Schritt 4: CSS für Birthday-Balken hinzufügen**

In `TabKalender.module.css` nach `.cellBarTodo` einfügen:

```css
.cellBarBirthday {
  opacity: 0.9;
}
```

(Der Balken bekommt seine Farbe via inline `style={{ background: ... }}` — die Klasse braucht nur minimale Ergänzungen wenn nötig.)

---

- [ ] **Schritt 5: Visuell prüfen**

```bash
npm run dev
```

Öffne Kalender → Monatsansicht. Navigiere zu einem Monat mit gespeicherten Geburtstagen (`kalender: true`):
- Geburtstags-Balken (pink/Toolfarbe) erscheint als erster Balken in der Kachel ✓
- Kein Geburtstags-Balken wenn `kalender: false` ✓
- Overflow (`+N`) zählt korrekt inkl. Birthday-Balken ✓

---

- [ ] **Schritt 6: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "feat(kalender): birthday bars in month cells (synthetisch, kalender=true)"
```

---

## Task 3: DayPanel — Geburtstag All-day + Gewicht-Sektion + Tools weg

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

### Was passiert

- DayPanel bekommt `birthdays` und `weightEntry` als neue Props
- `open`-State: `tools` → `gewicht`
- Geburtstags-Einträge erscheinen als All-day-Zeilen ganz oben in der Zeitplan-Sektion (kein Zeitstempel, Stern-Icon, Name, Datum)
- Tools-Sektion komplett entfernt
- Gewicht-Sektion hinzugefügt (nur sichtbar wenn `weightEntry !== null` und `activeTools.includes('gewicht')`)
- Link in Gewicht-Sektion navigiert zu Tab Gewicht (`TOOL_TAB.gewicht`)

---

- [ ] **Schritt 1: `formatBirthdayDate` importieren**

```js
// Ergänzen im bestehenden birthdayUtils-Import:
import { getBirthdaysForCalendarDate, formatBirthdayDate } from '../../tools/geburtstage/birthdayUtils'
```

---

- [ ] **Schritt 2: DayPanel-Signatur aktualisieren**

```js
// Vorher:
function DayPanel({ dateKey, todayKey, days, todos, activeTools, toolColors, setCurrentTab, setDayplanDate, setTodos, restoreTodo, setRestoreTodo, handleRestore }) {

// Nachher:
function DayPanel({ dateKey, todayKey, days, todos, activeTools, toolColors, setCurrentTab, setDayplanDate, setTodos, restoreTodo, setRestoreTodo, handleRestore, birthdays, weightEntry }) {
```

---

- [ ] **Schritt 3: `open`-State anpassen**

```js
// Vorher:
const [open, setOpen] = useState({ zeitplan: true, done: true, tools: false })

// Nachher:
const [open, setOpen] = useState({ zeitplan: true, done: true, gewicht: true })
```

---

- [ ] **Schritt 4: Birthday-Einträge im DayPanel berechnen**

Direkt nach der `doneTodos`-Zeile einfügen:

```js
const birthdayEntries = getBirthdaysForCalendarDate(birthdays ?? [], dateKey)
const zeitplanCount   = sortedSlots.length + birthdayEntries.length
```

---

- [ ] **Schritt 5: Zeitplan-Sektion — Birthday All-day-Einträge + Count**

Im Section-Header des Zeitplans den Count anpassen:

```jsx
{zeitplanCount > 0 && (
  <span className={s.dayPanelSectionCount}>{zeitplanCount}</span>
)}
```

Im aufgeklappten Zeitplan-Body, Birthday-Einträge VOR den Slots einfügen:

```jsx
{open.zeitplan && (
  <div className={s.dayPanelList}>
    {birthdayEntries.map(b => (
      <div key={b.id} className={s.dayPanelAlldayEntry}>
        <span className={s.dayPanelAlldayStar}>⭐</span>
        <span className={s.dayPanelAlldayName}>{b.name} Geburtstag</span>
        <span className={s.dayPanelAlldayDate}>{formatBirthdayDate(b.date)}</span>
      </div>
    ))}
    {sortedSlots.length === 0 && birthdayEntries.length === 0 ? (
      <p className={s.dayPanelEmpty}>Keine Termine</p>
    ) : sortedSlots.map(([key, slot]) => {
      const hh     = String(Math.floor(parseFloat(key))).padStart(2, '0')
      const mm     = parseFloat(key) % 1 ? '30' : '00'
      const isTodo = Boolean(slot.todoId)
      const color  = slot.color || 'var(--primary)'
      return (
        <div
          key={key}
          className={[s.dayPanelEntry, isTodo ? s.dayPanelEntryTodo : ''].join(' ')}
          style={{ borderLeftColor: color }}
        >
          <span className={s.dayPanelEntryTime} style={{ color }}>{hh}:{mm}</span>
          <span className={s.dayPanelEntryText}>{slot.text}</span>
          {isTodo && <span className={s.dayPanelBadge}>Todo</span>}
        </div>
      )
    })}
  </div>
)}
```

---

- [ ] **Schritt 6: Tools-Sektion entfernen**

Den gesamten `{/* Tools */}`-Block (Zeilen ~166–198 im Original) entfernen:

```jsx
// Diesen gesamten Block löschen:
{/* Tools */}
<div className={s.dayPanelSection}>
  <button className={s.dayPanelSectionHead} onClick={() => toggle('tools')}>
    ...
  </button>
  {open.tools && (
    <div className={s.dayPanelToolGrid}>
      ...
    </div>
  )}
</div>
```

---

- [ ] **Schritt 7: Gewicht-Sektion hinzufügen**

Nach der Erledigt-Sektion (vor dem Restore-Modal) einfügen:

```jsx
{/* Gewicht — nur wenn Eintrag vorhanden */}
{activeTools.includes('gewicht') && weightEntry && (
  <div className={s.dayPanelSection}>
    <button className={s.dayPanelSectionHead} onClick={() => toggle('gewicht')}>
      <span className={s.dayPanelSectionLabel}>Gewicht</span>
      <span className={s.dayPanelArrow}>{open.gewicht ? '▾' : '▸'}</span>
    </button>
    {open.gewicht && (
      <div className={s.dayPanelGewichtRow}>
        <span className={s.dayPanelGewichtIcon}>⚖️</span>
        <span className={s.dayPanelGewichtVal}>{weightEntry.kg} kg</span>
        {weightEntry.kcal && (
          <span className={s.dayPanelGewichtKcal}>
            {weightEntry.kcal.toLocaleString('de-DE')} kcal
          </span>
        )}
        <button
          className={s.dayPanelGewichtLink}
          onClick={() => setCurrentTab(TOOL_TAB.gewicht)}
        >
          → Gewicht
        </button>
      </div>
    )}
  </div>
)}
```

---

- [ ] **Schritt 8: Neue Props an DayPanel übergeben**

Im DayPanel-Aufruf in `TabKalender` (Ende der Monatsansicht):

```jsx
<DayPanel
  dateKey={selectedDay}
  todayKey={todayKey}
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
  birthdays={birthdays}
  weightEntry={weightEntries.find(e => e.date === selectedDay) ?? null}
/>
```

---

- [ ] **Schritt 9: CSS hinzufügen**

In `TabKalender.module.css` am Ende hinzufügen:

```css
/* ─── DayPanel — All-day Entry (Geburtstag) ──────────────── */
.dayPanelAlldayEntry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  margin: 2px 8px 4px;
  border-left: 2.5px solid #FF2D78;
  border-radius: 0 8px 8px 0;
  background: rgba(255, 45, 120, 0.06);
}

.dayPanelAlldayStar {
  font-size: 12px;
  flex-shrink: 0;
}

.dayPanelAlldayName {
  font-size: 13px;
  font-weight: 500;
}

.dayPanelAlldayDate {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted, #6b6b80);
}

/* ─── DayPanel — Gewicht ─────────────────────────────────── */
.dayPanelGewichtRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 12px;
}

.dayPanelGewichtIcon {
  font-size: 15px;
}

.dayPanelGewichtVal {
  font-size: 15px;
  font-weight: 700;
  color: #00FF94;
}

.dayPanelGewichtKcal {
  font-size: 12px;
  color: var(--text-muted, #6b6b80);
}

.dayPanelGewichtLink {
  margin-left: auto;
  font-size: 11px;
  color: #00FF94;
  opacity: 0.75;
  border: 1px solid rgba(0, 255, 148, 0.2);
  border-radius: 6px;
  padding: 4px 10px;
  background: transparent;
  cursor: pointer;
}

.dayPanelGewichtLink:hover {
  opacity: 1;
}
```

---

- [ ] **Schritt 10: DayPanel-Einträge abrunden**

In `TabKalender.module.css` die bestehende `.dayPanelEntry`-Regel so anpassen dass `border-radius` vollständig gerundet ist:

```css
/* bestehende .dayPanelEntry Regel finden und border-radius anpassen: */
.dayPanelEntry {
  /* ... bestehende Eigenschaften beibehalten ... */
  border-radius: 0 8px 8px 0;  /* war: 0 oder kleiner */
}
```

---

- [ ] **Schritt 11: Visuell prüfen**

```bash
npm run dev
```

Öffne Kalender → Monat → Tag mit Geburtstag anklicken:
- DayPanel Zeitplan zeigt `⭐ [Name] Geburtstag · [Datum]` als erste Zeile ✓
- Keine "Tools"-Sektion mehr ✓
- Öffne Tag an dem Gewicht eingetragen wurde: Gewicht-Sektion erscheint mit kg + kcal + Link ✓
- Link "→ Gewicht" navigiert zum Gewicht-Tab ✓
- Kein Gewicht-Eintrag vorhanden: Gewicht-Sektion erscheint nicht ✓

---

- [ ] **Schritt 12: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "feat(kalender): DayPanel — birthday all-day entries, Gewicht section, remove Tools section"
```

---

## Task 4: Wochenansicht — Geburtstags-Balken im All-day-Streifen

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

### Was passiert

- Im `weekAlldayRow` erscheinen Birthday-Einträge als erste Balken (vor den Todos)
- Birthday-Balken folgen dem `showTermine`-Toggle
- All-day-Streifen wird auch gezeigt wenn Termine aktiv sind (bisher nur bei `showTodos`)

---

- [ ] **Schritt 1: `weekAlldayRow` anpassen**

Den bestehenden `{showTodos && (<div className={s.weekAlldayRow}>...)}` Block ersetzen:

```jsx
{(showTodos || showTermine) && (
  <div className={s.weekAlldayRow}>
    <div className={s.weekAlldayLabel}>All</div>
    {weekDays.map(date => {
      const dk = toDateKey(date)
      const alldayTodos = showTodos ? todos.filter(t => t.date === dk && !t.time) : []
      const bdayEntries = showTermine && activeTools.includes('geburtstage')
        ? getBirthdaysForCalendarDate(birthdays, dk)
        : []
      return (
        <div key={dk} className={s.weekAlldayCol}>
          {bdayEntries.map(b => (
            <div
              key={b.id}
              className={[s.weekAlldayBar, s.weekAlldayBarBirthday].join(' ')}
              style={{ background: getToolColor('geburtstage', toolColors) }}
            >
              <span className={s.weekAlldayBarText}>⭐ {b.name}</span>
            </div>
          ))}
          {alldayTodos.map(t => (
            <div
              key={t.id}
              className={s.weekAlldayBar}
              style={{ background: t.color || 'var(--primary)' }}
            >
              <span className={s.weekAlldayBarText}>{t.text}</span>
            </div>
          ))}
        </div>
      )
    })}
  </div>
)}
```

---

- [ ] **Schritt 2: CSS für Birthday-Balken in Wochenansicht**

In `TabKalender.module.css` nach `.weekAlldayBar` einfügen:

```css
.weekAlldayBarBirthday {
  opacity: 0.9;
}
```

---

- [ ] **Schritt 3: Visuell prüfen**

```bash
npm run dev
```

Öffne Kalender → Wochenansicht. Navigiere zu einer Woche mit Geburtstag:
- Geburtstags-Balken erscheint im All-day-Streifen ganz oben (vor Todos) ✓
- Termine-Toggle aus → Geburtstags-Balken verschwindet ✓
- Todos-Toggle aus → Todos im All-day-Streifen weg, Geburtstags-Balken bleibt (wenn Termine an) ✓

---

- [ ] **Schritt 4: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "feat(kalender): birthday bars in week view allday strip"
```

---

## Task 5: Cleanup — unbenutzte Imports entfernen

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

### Was passiert

`TOOL_REGISTRY` und `ToolIcon` werden nach den Änderungen nirgends mehr in TabKalender.jsx verwendet und können entfernt werden.

---

- [ ] **Schritt 1: Import prüfen und entfernen**

Prüfen: Gibt es noch irgendwo in TabKalender.jsx eine Verwendung von `TOOL_REGISTRY` oder `ToolIcon`?

```bash
grep -n "TOOL_REGISTRY\|ToolIcon" src/features/calendar/TabKalender/TabKalender.jsx
```

Erwartete Ausgabe: keine Treffer.

Falls keine Treffer: Import-Zeile entfernen:

```js
// Diese Zeile löschen:
import { TOOL_REGISTRY, ToolIcon } from '../../tools/toolRegistry'
```

---

- [ ] **Schritt 2: `toolDotActive` CSS-Klasse prüfen**

```bash
grep -n "toolDotActive" src/features/calendar/TabKalender/TabKalender.jsx src/features/calendar/TabKalender/TabKalender.module.css
```

Falls nur noch in der CSS-Datei vorhanden (nicht im JSX): CSS-Klasse `.toolDotActive` und `.toolDot` (Ring-Stil) aus `TabKalender.module.css` entfernen und `.toolDot` zu einem solid Dot vereinfachen:

```css
.toolDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
```

---

- [ ] **Schritt 3: Abschliessende Gesamtprüfung**

```bash
npm run dev
```

Alle vier Szenarien prüfen:

1. **Monat, Tag ohne Daten** → keine Dots, keine Birthday-Balken ✓
2. **Monat, Tag mit Geburtstag (kalender=true)** → pinker Balken, DayPanel zeigt ⭐ oben im Zeitplan ✓
3. **Monat, Tag mit Gewicht-Eintrag** → grüner Dot, DayPanel Gewicht-Sektion ausgeklappt ✓
4. **Monat, Tag mit Haushalt/Reminder abgeholt** → Dot, kein DayPanel-Eintrag ✓
5. **Woche, Tag mit Geburtstag** → pinker Balken im All-day-Streifen ✓
6. **DayPanel, Tools-Sektion** → nicht mehr vorhanden ✓
7. **Toggle-Strip** → nur noch "Termine" und "Todos", kein "Tools" ✓

---

- [ ] **Schritt 4: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "chore(kalender): remove unused TOOL_REGISTRY/ToolIcon imports, clean up toolDotActive"
```
