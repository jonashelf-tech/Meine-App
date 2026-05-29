# Wochenansicht Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wochenansicht in `TabKalender` visuell modernisieren (größere Slots, Heute-Kreis, Jetzt-Linie) und PillStrip oben/unten einführen, damit Termine außerhalb des sichtbaren Zeitbereichs angezeigt und der Bereich per +/− erweitert werden kann.

**Architecture:** Drei Dateien ändern sich. `storage/index.js` bekommt zwei neue Keys. `TabKalender.module.css` erhält aktualisierte Dimensionen und neue CSS-Klassen. `TabKalender.jsx` ersetzt die hardcodierten Konstanten `GRID_START`/`GRID_END` durch State, fügt eine `WeekPillStrip`-Komponente ein und passt die Zeilen-Reihenfolge an (Header → PillStrip → Ganztags → Grid → PillStrip).

**Tech Stack:** React 18, CSS Modules, localStorage via `lv`/`sv`/`SK` aus `src/storage/index.js`

---

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/storage/index.js` | Modify — 2 neue Keys |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Modify — Dimensionen, neue Klassen |
| `src/features/calendar/TabKalender/TabKalender.jsx` | Modify — State, WeekPillStrip, Rendering |

---

## Task 1: Storage-Keys ergänzen

**Files:**
- Modify: `src/storage/index.js`

- [ ] **Schritt 1: Zwei neue Keys in `SK` eintragen**

In `src/storage/index.js` nach `calView` (Zeile ~46) einfügen:

```js
  weekVisStart:   `${PREFIX}view_week_vis_start`,
  weekVisEnd:     `${PREFIX}view_week_vis_end`,
```

Das `SK`-Objekt sieht dann so aus (Ausschnitt):

```js
  calView:        `${PREFIX}view_cal_view`,
  weekVisStart:   `${PREFIX}view_week_vis_start`,
  weekVisEnd:     `${PREFIX}view_week_vis_end`,
  blockers:       `${PREFIX}blockers`,
```

- [ ] **Schritt 2: Commit**

```bash
git add src/storage/index.js
git commit -m "feat: storage keys for week visible range"
```

---

## Task 2: CSS-Refresh

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

Alle Änderungen in dieser Datei sind rein visuell — kein JSX ändert sich hier.

- [ ] **Schritt 1: Slot-Höhe anpassen**

`.weekTimeLabel` — Höhe und Schrift:
```css
.weekTimeLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 0.52rem;           /* war 0.42rem */
  color: var(--text-ghost);
  text-align: right;
  padding-right: 4px;
  height: 40px;                  /* war 28px — 1 Slot = 40px */
  display: flex;
  align-items: flex-start;
  padding-top: 1px;
  flex-shrink: 0;
}
```

- [ ] **Schritt 2: Spalten-Gitter aktualisieren**

`.weekDayCol` — Höhe wird jetzt per Inline-Style gesetzt (Task 3), daher hier entfernen. Nur `::before` und `::after` aktualisieren:

```css
.weekDayCol {
  flex: 1;
  border-left: 1px solid var(--border-dim);
  position: relative;
  /* height wird per inline style gesetzt */
}

.weekDayCol::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 79px,
    rgba(255,255,255,0.055) 79px,
    rgba(255,255,255,0.055) 80px
  );
  pointer-events: none;
}

.weekDayCol::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 39px,
    rgba(255,255,255,0.025) 39px,
    rgba(255,255,255,0.025) 40px
  );
  pointer-events: none;
}
```

- [ ] **Schritt 3: Slot-Blöcke größer und lesbarer**

```css
.weekSlotBlock {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 5px;           /* war 3px */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 3px 4px;             /* war 1px 3px */
  min-height: 10px;             /* war 8px */
}

.weekSlotName {
  font-family: 'Outfit', sans-serif;
  font-size: 0.52rem;           /* war 0.42rem */
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.weekSlotTime {
  font-family: 'Outfit', sans-serif;
  font-size: 0.44rem;           /* war 0.36rem */
  color: var(--text-dim);
  line-height: 1;
}
```

- [ ] **Schritt 4: Scroll-Höhe erhöhen**

```css
.weekScrollBody {
  display: flex;
  overflow-y: auto;
  max-height: 600px;            /* war 480px */
}
```

- [ ] **Schritt 5: Heute-Spalte stylen**

Neue Klasse für den Spalten-Body:
```css
.weekDayColToday {
  background: rgba(139,92,246,0.04);
}
```

Heute im Header — Hintergrund-Tönung ergänzen (`.weekDayHeadToday` existiert bereits, erweitern):
```css
.weekDayHeadToday {
  background: rgba(139,92,246,0.08);
}

.weekDayHeadToday .weekDayHeadName { color: rgba(139,92,246,0.8); }

/* Kreis um die Tageszahl */
.weekDayHeadToday .weekDayHeadNum {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 0.72rem;
  line-height: 1;
}
```

(Die bestehenden Regeln `.weekDayHeadToday .weekDayHeadName` und `.weekDayHeadToday .weekDayHeadNum` ersetzen.)

- [ ] **Schritt 6: Jetzt-Linie**

```css
.weekNowLine {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #FB7185;
  z-index: 2;
  pointer-events: none;
}

.weekNowDot {
  position: absolute;
  left: -3px;
  top: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #FB7185;
}
```

- [ ] **Schritt 7: PillStrip-Styles**

```css
/* ─── Week PillStrip ─────────────────────────────────────── */
.weekPillStrip {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(139,92,246,0.07);
  border-bottom: 1px solid rgba(139,92,246,0.15);
  padding: 3px 4px;
  flex-shrink: 0;
}

.weekPillStripBot {
  border-bottom: none;
  border-top: 1px solid rgba(139,92,246,0.15);
}

.weekPillBtn {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(139,92,246,0.18);
  border: 1px solid rgba(139,92,246,0.3);
  color: var(--primary);
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}

.weekPillBtn:active { background: rgba(139,92,246,0.3); }

.weekPillChips {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  overflow: hidden;
}

.weekPillChip {
  background: rgba(139,92,246,0.14);
  border: 1px solid rgba(139,92,246,0.25);
  border-radius: 5px;
  padding: 2px 6px;
  font-family: 'Outfit', sans-serif;
  font-size: 0.52rem;
  font-weight: 600;
  color: rgba(255,255,255,0.75);
  white-space: nowrap;
  cursor: pointer;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.12s;
}

.weekPillChip:active { background: rgba(139,92,246,0.25); }

.weekPillEmpty {
  font-family: 'Outfit', sans-serif;
  font-size: 0.5rem;
  color: rgba(255,255,255,0.2);
  padding: 0 4px;
}
```

- [ ] **Schritt 8: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "style(woche): größere Slots, Heute-Kreis, Jetzt-Linie, PillStrip-Klassen"
```

---

## Task 3: State + WeekPillStrip-Komponente

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: Konstanten ersetzen und SLOT_H aktualisieren**

Am Anfang der Datei (nach den Imports) die bestehenden Konstanten ersetzen:

```js
// ALT — entfernen:
const SLOT_H     = 28
const GRID_START = 7
const GRID_END   = 22

// NEU — ersetzen durch:
const SLOT_H = 40
```

`GRID_START` und `GRID_END` werden zu State (Schritt 3 unten). Überall wo `GRID_START`/`GRID_END` noch als Konstante referenziert werden, wird das in Schritt 3 durch die State-Variablen ersetzt.

- [ ] **Schritt 2: `slotToTop` und `slotToHeight` anpassen**

```js
function slotToTop(slotKey, start) {
  return (parseFloat(slotKey) - start) * 2 * SLOT_H
}

function slotToHeight(duration) {
  return Math.max(10, Math.round(((duration ?? 30) / 30) * SLOT_H))
}
```

- [ ] **Schritt 3: State in `TabKalender` ergänzen**

Im Body der `TabKalender`-Komponente, nach dem bestehenden `const [showTools, ...]`:

```js
const [visibleStart, setVisibleStart] = useState(() => lv(SK.weekVisStart, 7))
const [visibleEnd,   setVisibleEnd]   = useState(() => lv(SK.weekVisEnd,   21))

const expandStart = () => {
  const v = Math.max(0, visibleStart - 1)
  sv(SK.weekVisStart, v); setVisibleStart(v)
}
const shrinkStart = () => {
  const v = Math.min(visibleEnd - 1, visibleStart + 1)
  sv(SK.weekVisStart, v); setVisibleStart(v)
}
const expandEnd = () => {
  const v = Math.min(24, visibleEnd + 1)
  sv(SK.weekVisEnd, v); setVisibleEnd(v)
}
const shrinkEnd = () => {
  const v = Math.max(visibleStart + 1, visibleEnd - 1)
  sv(SK.weekVisEnd, v); setVisibleEnd(v)
}
const expandToStart = (h) => {
  const v = Math.min(visibleStart, h)
  sv(SK.weekVisStart, v); setVisibleStart(v)
}
const expandToEnd = (h) => {
  const v = Math.max(visibleEnd, h + 1)
  sv(SK.weekVisEnd, v); setVisibleEnd(v)
}
```

- [ ] **Schritt 4: `useEffect` für Auto-Scroll aktualisieren**

Den bestehenden `useEffect` (scrollt zum aktuellen Zeitpunkt beim View-Wechsel) anpassen:

```js
useEffect(() => {
  if (view !== 'woche' || !weekScrollRef.current) return
  const scrollTo = Math.max(0, (new Date().getHours() - visibleStart) * 2 * SLOT_H - 80)
  weekScrollRef.current.scrollTop = scrollTo
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [view])
```

- [ ] **Schritt 5: `WeekPillStrip`-Komponente einfügen**

Direkt vor `export default function TabKalender()` einfügen:

```jsx
function WeekPillStrip({ days, weekDays, visibleStart, visibleEnd, isTop, onExpand, onShrink, onExpandTo }) {
  const outSlots = []
  for (const date of weekDays) {
    const dk    = toDateKey(date)
    const slots = days[dk] ?? {}
    for (const [key, slot] of Object.entries(slots)) {
      if (!slot) continue
      const h = Math.floor(parseFloat(key))
      if (isTop ? h < visibleStart : h >= visibleEnd) {
        const hh = String(Math.floor(parseFloat(key))).padStart(2, '0')
        const mm = parseFloat(key) % 1 ? '30' : '00'
        outSlots.push({ key: `${dk}-${key}`, time: `${hh}:${mm}`, text: slot.text, h })
      }
    }
  }
  outSlots.sort((a, b) => a.h - b.h)

  const emptyText = isTop
    ? `Keine Termine vor ${String(visibleStart).padStart(2, '0')}:00`
    : `Keine Termine nach ${String(visibleEnd).padStart(2, '0')}:00`

  return (
    <div className={[s.weekPillStrip, isTop ? '' : s.weekPillStripBot].join(' ')}>
      <button className={s.weekPillBtn} onClick={onShrink}>−</button>
      <div className={s.weekPillChips}>
        {outSlots.length === 0
          ? <span className={s.weekPillEmpty}>{emptyText}</span>
          : outSlots.map(slot => (
              <div key={slot.key} className={s.weekPillChip} onClick={() => onExpandTo(slot.h)}>
                {slot.time} {slot.text}
              </div>
            ))
        }
      </div>
      <button className={s.weekPillBtn} onClick={onExpand}>+</button>
    </div>
  )
}
```

- [ ] **Schritt 6: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat(woche): visibleStart/End State + WeekPillStrip Komponente"
```

---

## Task 4: Grid-Rendering aktualisieren

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: `nowTop` berechnen**

Im Body von `TabKalender`, nach dem `isCurrentWeek`-Ausdruck:

```js
const nowTop = useMemo(() => {
  if (!isCurrentWeek) return null
  const n = new Date()
  const h = n.getHours()
  const m = n.getMinutes()
  if (h < visibleStart || h >= visibleEnd) return null
  return ((h - visibleStart) * 60 + m) / 30 * SLOT_H
}, [isCurrentWeek, visibleStart, visibleEnd])
```

- [ ] **Schritt 2: Zeitachsen-Labels auf `visibleStart`/`visibleEnd` umstellen**

Im JSX des Zeitgitters die Zeitachsen-Schleife anpassen:

```jsx
<div className={s.weekTimeAxis}>
  {Array.from({ length: (visibleEnd - visibleStart) * 2 }, (_, i) => {
    const h      = visibleStart + i * 0.5
    const isHour = h === Math.floor(h)
    if (!isHour) return <div key={i} className={s.weekTimeLabel} />
    return (
      <div key={i} className={s.weekTimeLabel}>
        {String(Math.floor(h)).padStart(2, '0')}:00
      </div>
    )
  })}
</div>
```

- [ ] **Schritt 3: Tagespalten auf `visibleStart`/`visibleEnd` + Inline-Höhe umstellen**

Den Slot-Filter und die Spalten-Höhe im Spalten-Body anpassen. Das `weekDayCol`-Div bekommt `style={{ height: colHeight }}`. Vor dem `return` (aber nach dem `weekDays`-Ausdruck) definieren:

```js
const colHeight = (visibleEnd - visibleStart) * 2 * SLOT_H
```

Dann im JSX:

```jsx
{weekDays.map(date => {
  const dk    = toDateKey(date)
  const slots = days[dk] ?? {}
  const isColToday = dk === todayKey
  const entries = Object.entries(slots).filter(([key]) => {
    const h = parseFloat(key)
    return h >= visibleStart && h < visibleEnd
  })
  return (
    <div
      key={dk}
      className={[s.weekDayCol, isColToday ? s.weekDayColToday : ''].join(' ')}
      style={{ height: colHeight }}
    >
      {/* Jetzt-Linie — nur in heutiger Spalte */}
      {isColToday && nowTop !== null && (
        <div className={s.weekNowLine} style={{ top: nowTop }}>
          <div className={s.weekNowDot} />
        </div>
      )}
      {entries.map(([key, slot]) => {
        const isTodo   = Boolean(slot.todoId)
        if (!showTermine && !isTodo) return null
        if (!showTodos   &&  isTodo) return null
        const slotTodo = slot.todoId ? todos.find(t => t.id === slot.todoId) : null
        if (!showTools && slotTodo?.toolId) return null
        const top    = slotToTop(key, visibleStart)
        const height = slotToHeight(slot.duration)
        const hh     = String(Math.floor(parseFloat(key))).padStart(2, '0')
        const mm     = parseFloat(key) % 1 ? '30' : '00'
        return (
          <div
            key={key}
            className={[s.weekSlotBlock, isTodo ? s.weekSlotTodo : ''].join(' ')}
            style={{ top, height, background: slot.color || 'var(--primary)' }}
          >
            {height >= 20 && <span className={s.weekSlotName}>{slot.text}</span>}
            {height >= 32 && <span className={s.weekSlotTime}>{hh}:{mm}</span>}
          </div>
        )
      })}
    </div>
  )
})}
```

- [ ] **Schritt 4: Zeilen-Reihenfolge im JSX anpassen**

Den `{view === 'woche' && ...}` Block neu ordnen. Die korrekte Reihenfolge:

```jsx
{view === 'woche' && (
  <>
    <div className={s.weekWrapper}>
      {/* 1. Spalten-Header */}
      <div className={s.weekHeaderRow}>
        {/* ...unverändert... */}
      </div>

      {/* 2. PillStrip oben — NEU */}
      <WeekPillStrip
        days={days}
        weekDays={weekDays}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        isTop={true}
        onExpand={expandStart}
        onShrink={shrinkStart}
        onExpandTo={expandToStart}
      />

      {/* 3. Allday-Streifen */}
      {(showTodos || showTermine) && (
        <div className={s.weekAlldayRow}>
          <div className={s.weekAlldayLabel}>Ganzt.</div>
          {/* ...Spalten unverändert... */}
        </div>
      )}

      {/* 4. Scrollbares Zeitgitter */}
      <div className={s.weekScrollBody} ref={weekScrollRef}>
        {/* ...Zeitachse + Spalten aus Schritt 2+3... */}
      </div>

      {/* 5. PillStrip unten — NEU */}
      <WeekPillStrip
        days={days}
        weekDays={weekDays}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        isTop={false}
        onExpand={expandEnd}
        onShrink={shrinkEnd}
        onExpandTo={expandToEnd}
      />
    </div>
  </>
)}
```

- [ ] **Schritt 5: Dev-Server starten und visuell prüfen**

```bash
npm run dev
```

Prüfen:
- [ ] Slots sind größer und lesbarer (40px/Slot)
- [ ] Heute-Spalte hat lila Tönung + Datum als Kreis
- [ ] Rote Jetzt-Linie sichtbar in der heutigen Spalte (sofern aktuelle Uhrzeit im Bereich)
- [ ] PillStrip erscheint zwischen Header und Ganztags-Zeile
- [ ] `−`/`+` Buttons ändern den sichtbaren Bereich
- [ ] Chips für Termine vor/nach dem Bereich erscheinen
- [ ] Klick auf Chip erweitert den Bereich auf diese Stunde
- [ ] Bereich überlebt Seiten-Reload (localStorage)
- [ ] Allday-Label zeigt "Ganzt." statt "All"

- [ ] **Schritt 6: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat(woche): PillStrip, Jetzt-Linie, Heute-Spalte, dynamischer Zeitbereich"
```
