# Kalender Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign TabKalender mit Farbbalken-Monatszellen, Zeitgitter-Wochenansicht und Bottom-Toggle-Strip für Termine/Todos/Tools.

**Architecture:** Alle Änderungen isoliert in TabKalender.jsx + TabKalender.module.css. Monatsansicht bekommt Balken-Zellen statt Dots. Wochenansicht wird zum 7-Spalten-Zeitgitter mit absolut positionierten Slot-Blöcken. 3 lokale useState-Booleans steuern Sichtbarkeit. Keine Store-Änderungen.

**Tech Stack:** React 18, CSS Modules, Zustand (read-only), Vite

---

## Dateien

| Datei | Was ändert sich |
|---|---|
| `src/features/calendar/TabKalender/TabKalender.jsx` | Komplett neu: Helpers, State, beide Views, Toggle-Strip |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Komplett neu: Balken, Zeitgitter, Toggle-Strip CSS |

---

### Task 1: CSS — Monat Balken + Tool-Dots

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

- [ ] **Schritt 1: Altes Monat/Dot/Detail-CSS ersetzen**

Öffne `TabKalender.module.css`. Lösche alles ab `/* ─── Month View */` bis zum Ende der Datei. Ersetze durch:

```css
/* ─── Month View ───────────────────────────────────────── */
.monthGrid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.monthHeader {
  font-family: 'Outfit', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-dim);
  text-align: center;
  padding: 6px 0 4px;
  letter-spacing: 0.04em;
}

.monthCell {
  min-height: 44px;
  background: rgba(255,255,255,0.035);
  border-radius: var(--r-sm);
  border: 1px solid transparent;
  padding: 3px 2px;
  display: flex;
  flex-direction: column;
  gap: 1.5px;
  cursor: pointer;
  transition: border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}

.monthCell:hover { border-color: rgba(255,255,255,0.12); }
.monthCellToday { border-color: var(--primary); box-shadow: 0 0 8px rgba(139,92,246,0.2); }
.monthCellSelected { background: rgba(139,92,246,0.07); }
.monthCellEmpty { background: transparent; cursor: default; border-color: transparent !important; }

.monthDay {
  font-family: 'Outfit', sans-serif;
  font-size: 0.52rem;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  line-height: 1;
  padding: 0 1px;
}

.monthCellToday .monthDay { color: var(--primary); }

.cellBar {
  height: 5px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  padding: 0 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.cellBarText {
  font-family: 'Outfit', sans-serif;
  font-size: 0.33rem;
  font-weight: 600;
  color: rgba(255,255,255,0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.cellBarTodo { opacity: 0.65; }

.cellMore {
  font-family: 'Outfit', sans-serif;
  font-size: 0.32rem;
  color: var(--text-dim);
  padding: 0 1px;
}

.toolDots {
  display: flex;
  gap: 1.5px;
  padding: 0 1px;
  margin-top: auto;
  flex-wrap: wrap;
}

.toolDot {
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.toolDotActive {
  background: transparent !important;
  border: 1px solid currentColor;
  opacity: 0.55;
}

/* ─── Month Detail ───────────────────────────────────────── */
.monthDetailWrap { grid-column: 1 / -1; }

.detail {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
  margin-top: 4px;
  animation: fadeInUp 0.18s ease both;
}

.detailHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.detailDate {
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
}

.detailOpenBtn {
  background: none;
  border: 1px solid var(--primary);
  border-radius: var(--r-sm);
  color: var(--primary);
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.detailOpenBtn:hover { background: rgba(139,92,246,0.1); }

.detailEmpty {
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem;
  color: var(--text-dim);
  text-align: center;
  padding: 8px 0;
}

.detailSlots { display: flex; flex-direction: column; gap: 6px; }

.detailSlot { display: flex; align-items: center; gap: 8px; }

.detailDot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

.detailSlotText {
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem;
  color: var(--text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detailDone { font-size: 0.75rem; color: var(--emerald); }

.detailMore { font-family: 'Outfit', sans-serif; font-size: 0.72rem; color: var(--text-dim); }

/* ─── Week Time Grid ─────────────────────────────────────── */
.weekWrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--r);
}

.weekHeaderRow {
  display: flex;
  background: var(--bg3);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.weekTimeCorner { width: 32px; flex-shrink: 0; }

.weekDayHead {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px 4px;
  gap: 1px;
  border-left: 1px solid var(--border);
}

.weekDayHeadName {
  font-family: 'Outfit', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  text-transform: uppercase;
}

.weekDayHeadNum {
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.weekDayHeadToday .weekDayHeadName,
.weekDayHeadToday .weekDayHeadNum { color: var(--primary); }

.weekDayToolDots {
  display: flex;
  gap: 1.5px;
  justify-content: center;
  flex-wrap: wrap;
  min-height: 5px;
}

.weekAlldayRow {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
  flex-shrink: 0;
  min-height: 18px;
}

.weekAlldayLabel {
  width: 32px;
  flex-shrink: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 0.42rem;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.03em;
}

.weekAlldayCol {
  flex: 1;
  border-left: 1px solid var(--border);
  padding: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  align-items: center;
}

.weekAlldayBar {
  height: 5px;
  border-radius: 2px;
  min-width: 18px;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 2px;
  overflow: hidden;
  opacity: 0.7;
}

.weekAlldayBarText {
  font-family: 'Outfit', sans-serif;
  font-size: 0.32rem;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.weekScrollBody {
  display: flex;
  overflow-y: auto;
  max-height: 480px;
}

.weekTimeAxis {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.weekTimeLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 0.42rem;
  color: rgba(255,255,255,0.2);
  text-align: right;
  padding-right: 4px;
  height: 28px;
  display: flex;
  align-items: flex-start;
  padding-top: 1px;
  flex-shrink: 0;
}

.weekColsBody { flex: 1; display: flex; }

.weekDayCol {
  flex: 1;
  border-left: 1px solid rgba(255,255,255,0.04);
  position: relative;
  height: 840px; /* 30 Slots × 28px (07:00–22:00) */
}

.weekDayCol::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 27px,
    rgba(255,255,255,0.03) 27px,
    rgba(255,255,255,0.03) 28px
  );
  pointer-events: none;
}

.weekSlotBlock {
  position: absolute;
  left: 1px;
  right: 1px;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1px 3px;
  min-height: 8px;
}

.weekSlotTodo { opacity: 0.65; }

.weekSlotName {
  font-family: 'Outfit', sans-serif;
  font-size: 0.42rem;
  font-weight: 600;
  color: rgba(255,255,255,0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.weekSlotTime {
  font-family: 'Outfit', sans-serif;
  font-size: 0.36rem;
  color: rgba(255,255,255,0.6);
  line-height: 1;
}

/* ─── Toggle Strip ───────────────────────────────────────── */
.toggleStrip {
  display: flex;
  gap: 4px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.toggleChip {
  flex: 1;
  text-align: center;
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 6px 4px;
  border-radius: var(--r-sm);
  border: 1px solid transparent;
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.25);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.toggleChipTermine.toggleChipOn {
  color: var(--primary);
  border-color: rgba(139,92,246,0.35);
  background: rgba(139,92,246,0.08);
}

.toggleChipTodos.toggleChipOn {
  color: var(--teal);
  border-color: rgba(20,184,166,0.35);
  background: rgba(20,184,166,0.08);
}

.toggleChipTools.toggleChipOn {
  color: var(--emerald);
  border-color: rgba(16,185,129,0.35);
  background: rgba(16,185,129,0.08);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "style: kalender redesign CSS — bars, time grid, toggle strip"
```

---

### Task 2: JSX — Helpers + Toggle-State + Monatsansicht

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: React-Import erweitern + TOOL_REGISTRY importieren**

Zeile 1 ersetzen:
```js
import { useState, useMemo, useRef, useEffect } from 'react'
```

Nach dem bestehenden `import s from './TabKalender.module.css'` einfügen:
```js
import { TOOL_REGISTRY } from '../../tools/toolRegistry'
```

- [ ] **Schritt 2: `getDots` ersetzen durch `getToolDots` + `getCellBars` hinzufügen**

Die gesamte bestehende `getDots`-Funktion löschen und ersetzen durch:

```js
function getToolDots(dk, todos, activeTools, birthdays = []) {
  const hasDoneTodo = todos.some(t => t.doneAt?.startsWith(dk))
  const [, mm, dd]  = dk.split('-')
  return TOOL_REGISTRY
    .filter(t => {
      if (!activeTools.includes(t.id)) return false
      if (t.id === 'geburtstage') return birthdays.some(b => b.date === `${mm}-${dd}`)
      return true
    })
    .map(t => ({ id: t.id, color: t.color, done: hasDoneTodo }))
}

function getCellBars(dk, days) {
  const slots = days[dk] ?? {}
  return Object.entries(slots)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([, slot]) => ({
      text: slot.text,
      color: slot.color || 'var(--primary)',
      isTodo: Boolean(slot.todoId),
    }))
}
```

- [ ] **Schritt 3: Hilfskonstanten für Zeitgitter + Scroll-Ref hinzufügen**

Nach `getDots`/`getCellBars` (vor der Komponentenfunktion) einfügen:

```js
const SLOT_H    = 28
const GRID_START = 7
const GRID_END   = 22

function slotToTop(slotKey) {
  return (parseFloat(slotKey) - GRID_START) * 2 * SLOT_H
}

function slotToHeight(duration) {
  return Math.max(8, Math.round(((duration ?? 30) / 30) * SLOT_H))
}
```

- [ ] **Schritt 4: Toggle-State in Komponente einfügen**

In `TabKalender()`, nach den bestehenden `useState`-Aufrufen, einfügen:

```js
const [showTermine, setShowTermine] = useState(true)
const [showTodos,   setShowTodos]   = useState(true)
const [showTools,   setShowTools]   = useState(true)
const weekScrollRef = useRef(null)

useEffect(() => {
  if (view !== 'woche' || !weekScrollRef.current) return
  const scrollTo = Math.max(0, (new Date().getHours() - GRID_START) * 2 * SLOT_H - 80)
  weekScrollRef.current.scrollTop = scrollTo
}, [view])
```

- [ ] **Schritt 5: Monatsansicht-Rendering ersetzen**

Das `monthCells.map(...)` im `{view === 'monat' && ...}` Block komplett ersetzen:

```jsx
{monthCells.map((day, idx) => {
  if (!day) return <div key={`empty-${idx}`} className={[s.monthCell, s.monthCellEmpty].join(' ')} />
  const dk = `${monthRef.year}-${String(monthRef.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const isToday    = dk === todayKey
  const isSelected = selectedDay === dk
  const bars       = getCellBars(dk, days)
  const filtered   = [
    ...(showTermine ? bars.filter(b => !b.isTodo) : []),
    ...(showTodos   ? bars.filter(b =>  b.isTodo) : []),
  ]
  const visible    = filtered.slice(0, 3)
  const overflow   = filtered.length - visible.length
  const toolDots   = showTools ? getToolDots(dk, todos, activeTools, birthdays) : []

  return (
    <div key={dk}>
      <button
        className={[
          s.monthCell,
          isToday    ? s.monthCellToday    : '',
          isSelected ? s.monthCellSelected : '',
        ].join(' ')}
        onClick={() => handleDayClick(dk)}
      >
        <span className={s.monthDay}>{day}</span>
        {visible.map((bar, i) => (
          <div
            key={i}
            className={[s.cellBar, bar.isTodo ? s.cellBarTodo : ''].join(' ')}
            style={{ background: bar.color }}
          >
            <span className={s.cellBarText}>{bar.text}</span>
          </div>
        ))}
        {overflow > 0 && <span className={s.cellMore}>+{overflow}</span>}
        {toolDots.length > 0 && (
          <div className={s.toolDots}>
            {toolDots.map(dot => (
              <span
                key={dot.id}
                className={[s.toolDot, dot.done ? '' : s.toolDotActive].join(' ')}
                style={dot.done
                  ? { background: dot.color }
                  : { color: dot.color, borderColor: dot.color }}
              />
            ))}
          </div>
        )}
      </button>
      {isSelected && (
        <div className={s.monthDetailWrap}>
          <DayDetail dateKey={dk} days={days} todos={todos} onNavigate={navigateToDay} />
        </div>
      )}
    </div>
  )
})}
```

- [ ] **Schritt 6: Toggle-Strip am Ende des JSX einfügen**

Im returned JSX, direkt vor dem schließenden `</div>` der gesamten `.page`-Div, einfügen:

```jsx
<div className={s.toggleStrip}>
  <button
    className={[s.toggleChip, s.toggleChipTermine, showTermine ? s.toggleChipOn : ''].join(' ')}
    onClick={() => setShowTermine(v => !v)}
  >
    Termine {showTermine ? '●' : '○'}
  </button>
  <button
    className={[s.toggleChip, s.toggleChipTodos, showTodos ? s.toggleChipOn : ''].join(' ')}
    onClick={() => setShowTodos(v => !v)}
  >
    Todos {showTodos ? '●' : '○'}
  </button>
  <button
    className={[s.toggleChip, s.toggleChipTools, showTools ? s.toggleChipOn : ''].join(' ')}
    onClick={() => setShowTools(v => !v)}
  >
    Tools {showTools ? '●' : '○'}
  </button>
</div>
```

- [ ] **Schritt 7: Visuell prüfen**

`npm run dev` → Kalender → Monat:
- Zellen zeigen Farbbalken mit kurzem Text
- Keine alten Dots mehr
- Heute-Zelle hat violetten Border + Glow
- Toggle-Strip unten sichtbar, Klick verändert Sichtbarkeit

- [ ] **Schritt 8: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: month view bars + tool dots + toggle strip"
```

---

### Task 3: JSX — Wochenansicht als Zeitgitter

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: Alten Agenda-Block komplett ersetzen**

Den gesamten `{view === 'woche' && ( <> ... </> )}` Block ersetzen durch:

```jsx
{view === 'woche' && (
  <>
    <div className={s.navRow}>
      <button className={s.navBtn} onClick={() => setWeekStart(d => addDays(d, -7))}>◀</button>
      <span className={s.navLabel}>
        {addDays(weekStart, 0).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} –{' '}
        {addDays(weekStart, 6).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
      <button className={s.navBtn} onClick={() => setWeekStart(d => addDays(d, 7))}>▶</button>
      {!isCurrentWeek && (
        <button className={s.navTodayBtn} onClick={() => setWeekStart(getMonday(today))}>Heute</button>
      )}
    </div>

    <div className={s.weekWrapper}>
      {/* Spalten-Header */}
      <div className={s.weekHeaderRow}>
        <div className={s.weekTimeCorner} />
        {weekDays.map(date => {
          const dk = toDateKey(date)
          const isToday  = dk === todayKey
          const toolDots = showTools ? getToolDots(dk, todos, activeTools, birthdays) : []
          return (
            <div
              key={dk}
              className={[s.weekDayHead, isToday ? s.weekDayHeadToday : ''].join(' ')}
            >
              <span className={s.weekDayHeadName}>
                {DAY_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1]}
              </span>
              <span className={s.weekDayHeadNum}>{date.getDate()}</span>
              {toolDots.length > 0 && (
                <div className={s.weekDayToolDots}>
                  {toolDots.map(dot => (
                    <span
                      key={dot.id}
                      className={[s.toolDot, dot.done ? '' : s.toolDotActive].join(' ')}
                      style={dot.done
                        ? { background: dot.color }
                        : { color: dot.color, borderColor: dot.color }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Allday-Streifen — Todos ohne Uhrzeit */}
      {showTodos && (
        <div className={s.weekAlldayRow}>
          <div className={s.weekAlldayLabel}>All</div>
          {weekDays.map(date => {
            const dk          = toDateKey(date)
            const alldayTodos = todos.filter(t => t.date === dk && !t.time)
            return (
              <div key={dk} className={s.weekAlldayCol}>
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

      {/* Scrollbares Zeitgitter */}
      <div className={s.weekScrollBody} ref={weekScrollRef}>
        <div className={s.weekTimeAxis}>
          {Array.from({ length: (GRID_END - GRID_START) * 2 }, (_, i) => {
            const h      = GRID_START + i * 0.5
            const isHour = h === Math.floor(h)
            if (!isHour) return <div key={i} className={s.weekTimeLabel} />
            return (
              <div key={i} className={s.weekTimeLabel}>
                {String(Math.floor(h)).padStart(2, '0')}:00
              </div>
            )
          })}
        </div>
        <div className={s.weekColsBody}>
          {weekDays.map(date => {
            const dk      = toDateKey(date)
            const slots   = days[dk] ?? {}
            const entries = Object.entries(slots).filter(([key]) => {
              const h = parseFloat(key)
              return h >= GRID_START && h < GRID_END
            })
            return (
              <div key={dk} className={s.weekDayCol}>
                {entries.map(([key, slot]) => {
                  const isTodo = Boolean(slot.todoId)
                  if (!showTermine && !isTodo) return null
                  if (!showTodos   &&  isTodo) return null
                  const top    = slotToTop(key)
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
        </div>
      </div>
    </div>
  </>
)}
```

- [ ] **Schritt 2: Visuell prüfen**

`npm run dev` → Kalender → Woche:
- 7 Spalten sichtbar, Zeitachse 07:00–21:30
- Heutige Spalte in `var(--primary)`
- Allday-Strip erscheint wenn Todos ohne Zeit vorhanden
- Slots sitzen an ihrer Zeitposition
- Scrollt beim Öffnen automatisch zur aktuellen Stunde
- Toggle-Strip unten funktioniert für beide Views

- [ ] **Schritt 3: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: week time grid — allday strip, tool dots, auto-scroll"
```
