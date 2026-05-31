# Wochenplaner — freies horizontales Scrollen — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Wochenansicht in TabKalender von einem festen 7-Spalten-Gitter auf einen frei horizontal scrollbaren, einrastenden Zeitstrahl umbauen, dessen Spaltenbreite (sichtbare Tage) in den Einstellungen konfigurierbar ist.

**Architecture:** Ein einziger `overflow: auto`-Container (beide Richtungen) ersetzt die drei bisherigen Blöcke (Header, Allday, Scroll-Body). Der Tag-Header wird `position: sticky; top: 0`, die Zeitachse `position: sticky; left: 0` — beide im selben Scroll-Container, sodass sie automatisch synchron scrollen. CSS `scroll-snap-type: x mandatory` rastet auf Tagesgrenzen ein. Ein `ResizeObserver` berechnet die Spaltenbreite aus `(containerWidth - 32) / weekVisibleDays` und schreibt sie als CSS-Variable `--week-col-w`.

**Tech Stack:** React 19, CSS Modules, `ResizeObserver`, CSS scroll-snap

---

## Konstanten

Alle nachfolgenden Tasks beziehen sich auf diese Dateipfade:

- `src/storage/index.js`
- `src/features/calendar/TabKalender/TabKalender.jsx`
- `src/features/calendar/TabKalender/TabKalender.module.css`
- `src/features/settings/TabSettings/TabSettings.jsx`

Der Storage-Key lautet `adhs_view_week_visible_days`.  
Der JS-Constant-Name lautet `SK.weekVisibleDays`.  
Die CSS-Variable lautet `--week-col-w`.  
Die Zeitachsen-Breite bleibt `32px` (Konstante `TIME_AXIS_W = 32`).

---

## Task 1: Storage-Key hinzufügen

**Files:**
- Modify: `src/storage/index.js`

- [ ] **Schritt 1: `SK.weekVisibleDays` nach `SK.weekVisEnd` einfügen**

In `src/storage/index.js`, die Zeile mit `weekVisEnd` suchen und danach einfügen:

```js
weekVisibleDays: `${PREFIX}view_week_visible_days`,
```

Das Ergebnis sieht so aus:

```js
weekVisStart:      `${PREFIX}view_week_vis_start`,
weekVisEnd:        `${PREFIX}view_week_vis_end`,
weekVisibleDays:   `${PREFIX}view_week_visible_days`,
```

- [ ] **Schritt 2: Key zu `BACKUP_CATS.kalender` hinzufügen**

In der `BACKUP_CATS`-Definition die `kalender`-Liste um `SK.weekVisibleDays` erweitern. Die Zeile mit `SK.weekVisEnd` suchen und `SK.weekVisibleDays` direkt dahinter anhängen:

```js
SK.weekVisStart, SK.weekVisEnd, SK.weekVisibleDays, SK.calView, SK.heuteModus,
```

- [ ] **Schritt 3: App starten und prüfen, dass keine Fehler in der Konsole erscheinen**

```
npm run dev
```

Erwartet: App lädt, Kalender-Tab öffnet sich fehlerfrei.

- [ ] **Schritt 4: Commit**

```bash
git add src/storage/index.js
git commit -m "feat: add SK.weekVisibleDays storage key"
```

---

## Task 2: Einstellungs-UI für sichtbare Tage

**Files:**
- Modify: `src/features/settings/TabSettings/TabSettings.jsx`

- [ ] **Schritt 1: weekVisibleDays-State am Anfang der Komponente einfügen**

In `TabSettings.jsx`, direkt nach den bestehenden `useState`-Aufrufen am Anfang von `TabSettings()` hinzufügen:

```js
const [weekVisibleDays, setWeekVisibleDays] = useState(() => lv(SK.weekVisibleDays, 7))

const handleSetWeekVisibleDays = (n) => {
  sv(SK.weekVisibleDays, n)
  setWeekVisibleDays(n)
}
```

- [ ] **Schritt 2: `SK` in den lv/sv-Import aufnehmen (falls noch nicht vorhanden)**

Der Import-Kopf muss `lv, sv, SK` enthalten:

```js
import { lv, sv, SK, ... } from '../../../storage'
```

(In `TabSettings.jsx` wird `SK` bereits für `CAT_LABELS` etc. verwendet; nur `lv` und `sv` prüfen, ob sie importiert sind.)

- [ ] **Schritt 3: Neue `<section className={s.card}>` nach der Erscheinungsbild-Sektion einfügen**

Direkt nach dem schließenden `</section>` der `Erscheinungsbild`-Karte einfügen:

```jsx
<section className={s.card}>
  <h3 className={s.cardTitle}>Kalender</h3>
  <div className={s.rowLabel}>Wochentage sichtbar</div>
  <div className={s.segmented}>
    {[3, 4, 5, 6, 7].map(n => (
      <button
        key={n}
        className={[s.seg, weekVisibleDays === n ? s.segActive : ''].join(' ')}
        onClick={() => handleSetWeekVisibleDays(n)}
      >
        {n}
      </button>
    ))}
  </div>
</section>
```

Die CSS-Klassen `s.card`, `s.cardTitle`, `s.rowLabel`, `s.segmented`, `s.seg`, `s.segActive` sind bereits in `TabSettings.module.css` vorhanden und passen ohne neue Klassen.

- [ ] **Schritt 4: Verify**

App öffnen → Einstellungen-Tab → neue Karte „Kalender" mit fünf Buttons `3 4 5 6 7` ist sichtbar. Klick auf eine Zahl markiert sie. Nach Tab-Wechsel und Rückkehr bleibt die Auswahl erhalten (localStorage).

- [ ] **Schritt 5: Commit**

```bash
git add src/features/settings/TabSettings/TabSettings.jsx
git commit -m "feat: add weekVisibleDays setting to Einstellungen"
```

---

## Task 3: CSS — Neues Scroll-Layout

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

Dieser Task ändert nur CSS. Die bestehenden Klassen werden an Ort und Stelle angepasst — kein JSX-Eingriff hier.

- [ ] **Schritt 1: `.weekWrapper` — `overflow: hidden` entfernen**

Aktuelle Regel:
```css
.weekWrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--r);
}
```

Ersetzen durch:
```css
.weekWrapper {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden; /* behalten: clippt rounded corners */
}
```

(Bleibt inhaltlich gleich — `overflow: hidden` zusammen mit `border-radius` sorgt für abgeschnittene Ecken ohne Probleme für den inneren Scroll-Container.)

- [ ] **Schritt 2: `.weekScrollBody` entfernen und durch `.weekScrollContainer` ersetzen**

Die aktuelle Regel:
```css
.weekScrollBody {
  display: flex;
  overflow-y: auto;
  max-height: 600px;
}
```

Ersetzen durch:
```css
/* Unified scroll container (ersetzt weekScrollBody) */
.weekScrollContainer {
  overflow: auto;
  max-height: 65vh;
  scroll-snap-type: x mandatory;
  scroll-padding-left: 32px; /* Offset für sticky Zeitachse */
  -webkit-overflow-scrolling: touch;
}
```

- [ ] **Schritt 3: `.weekHeaderRow` — sticky top hinzufügen**

Aktuelle Regel:
```css
.weekHeaderRow {
  display: flex;
  background: var(--bg3);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
```

Ersetzen durch:
```css
.weekHeaderRow {
  display: flex;
  background: var(--bg3);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 20;
}
```

- [ ] **Schritt 4: `.weekTimeCorner` durch `.weekCorner` ersetzen**

Aktuelle Regel:
```css
.weekTimeCorner { width: 32px; flex-shrink: 0; }
```

Ersetzen durch:
```css
.weekCorner {
  width: 32px;
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: 30;
  background: var(--bg3);
}
```

- [ ] **Schritt 5: `.weekDayHead` — von `flex: 1` auf feste Breite umstellen**

Aktuelle Regel:
```css
.weekDayHead {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px 4px;
  gap: 1px;
  border-left: 1px solid var(--border);
}
```

Ersetzen durch:
```css
.weekDayHead {
  width: var(--week-col-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px 4px;
  gap: 1px;
  border-left: 1px solid var(--border);
}
```

- [ ] **Schritt 6: `.weekAlldayRow` — `weekAlldayLabel` sticky machen**

`.weekAlldayLabel` existiert bereits. Diese Regel ergänzen:

Aktuelle Regel:
```css
.weekAlldayLabel {
  width: 32px;
  flex-shrink: 0;
  font-family: var(--font);
  font-size: 0.58rem;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.03em;
}
```

Ersetzen durch:
```css
.weekAlldayLabel {
  width: 32px;
  flex-shrink: 0;
  font-family: var(--font);
  font-size: 0.58rem;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.03em;
  position: sticky;
  left: 0;
  z-index: 10;
  background: var(--surface-low);
}
```

- [ ] **Schritt 7: `.weekAlldayCol` — von `flex: 1` auf feste Breite umstellen**

Aktuelle Regel:
```css
.weekAlldayCol {
  flex: 1;
  border-left: 1px solid var(--border);
  padding: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  align-items: center;
}
```

Ersetzen durch:
```css
.weekAlldayCol {
  width: var(--week-col-w);
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  padding: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  align-items: center;
}
```

- [ ] **Schritt 8: `.weekTimeAxis` — sticky left hinzufügen**

Aktuelle Regel:
```css
.weekTimeAxis {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
```

Ersetzen durch:
```css
.weekTimeAxis {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: sticky;
  left: 0;
  z-index: 10;
  background: var(--bg2);
}
```

- [ ] **Schritt 9: `.weekDayCol` — feste Breite + scroll-snap-align**

Aktuelle Regel:
```css
.weekDayCol {
  flex: 1;
  border-left: 1px solid var(--border-dim);
  position: relative;
  cursor: crosshair;
  /* height wird per inline style gesetzt */
}
```

Ersetzen durch:
```css
.weekDayCol {
  width: var(--week-col-w);
  flex-shrink: 0;
  border-left: 1px solid var(--border-dim);
  position: relative;
  cursor: crosshair;
  scroll-snap-align: start;
  /* height wird per inline style gesetzt */
}
```

- [ ] **Schritt 10: `.weekGridBody` neu hinzufügen** (nach `.weekTimeAxis`)

```css
.weekGridBody {
  display: flex;
}
```

- [ ] **Schritt 11: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "feat: add sticky scroll-container CSS for week view"
```

---

## Task 4: TabKalender — State, Logik & Hilfsfunktionen

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

Dieser Task ändert nur den JS-Teil (State, Refs, Effekte, Handler). Das JSX bleibt zunächst unverändert — die App sieht nach diesem Task noch gleich aus, aber alle neuen States/Handler sind bereit.

- [ ] **Schritt 1: `TIME_AXIS_W`-Konstante und `daysBetween`-Hilfsfunktion oben in der Datei hinzufügen**

Direkt nach den bestehenden Konstanten `SLOT_H = 28` und `getMonday`/`addDays` einfügen:

```js
const TIME_AXIS_W = 32

function daysBetween(a, b) {
  // Ganzzahl-Differenz in Tagen zwischen zwei Date-Objekten (b - a)
  return Math.round((b - a) / 86400000)
}
```

- [ ] **Schritt 2: `weekStart`-State durch `rangeStart`/`rangeDays` ersetzen und neue States ergänzen**

Den bestehenden `weekStart`-State:
```js
const [weekStart, setWeekStart] = useState(() => getMonday(today))
```

Ersetzen durch:
```js
const [rangeStart, _setRangeStart] = useState(() => addDays(getMonday(today), -42))
const [rangeDays,  _setRangeDays]  = useState(84)
const [weekVisibleDays, setWeekVisibleDays] = useState(() => lv(SK.weekVisibleDays, 7))
const [colW, _setColW]             = useState(0)
const [visibleLabel, setVisibleLabel]       = useState('')
const [visibleIsCurrent, setVisibleIsCurrent] = useState(true)

// Refs für den onScroll-Handler (vermeidet stale closures)
const rangeStartRef      = useRef(addDays(getMonday(today), -42))
const rangeDaysRef       = useRef(84)
const colWRef            = useRef(0)
const weekVisibleRef     = useRef(lv(SK.weekVisibleDays, 7))
const scrollContainerRef = useRef(null)
const rafRef             = useRef(null)

// State + Ref zusammen setzen
const setRangeStart = (val) => {
  const v = typeof val === 'function' ? val(rangeStartRef.current) : val
  rangeStartRef.current = v
  _setRangeStart(v)
}
const setRangeDays = (val) => {
  const v = typeof val === 'function' ? val(rangeDaysRef.current) : val
  rangeDaysRef.current = v
  _setRangeDays(v)
}
const setColW = (val) => {
  colWRef.current = val
  _setColW(val)
}
```

- [ ] **Schritt 3: `allDays`-Array (abgeleitet) hinzufügen**

Direkt nach den neuen States, am Anfang der Komponente:

```js
const allDays = useMemo(
  () => Array.from({ length: rangeDays }, (_, i) => addDays(rangeStart, i)),
  [rangeStart, rangeDays]
)
```

- [ ] **Schritt 4: `visibleDays`-Array für PillStrips ableiten**

```js
const visibleDays = useMemo(() => {
  if (colW === 0 || !scrollContainerRef.current) return allDays.slice(0, weekVisibleDays)
  const el = scrollContainerRef.current
  const firstIdx = Math.floor(el.scrollLeft / colW)
  return allDays.slice(firstIdx, firstIdx + weekVisibleDays)
}, [allDays, colW, weekVisibleDays])
```

Hinweis: `visibleDays` wird im JSX für die PillStrips verwendet statt `weekDays`.

- [ ] **Schritt 5: `weekDays`-Alias entfernen**

Die bestehende Zeile:
```js
const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
```
löschen. Sie wird durch `allDays` ersetzt.

- [ ] **Schritt 6: `isCurrentWeek` und `nowTop` anpassen**

Die bestehende Zeile:
```js
const isCurrentWeek  = weekDays.some(d => toDateKey(d) === todayKey)
```
ersetzen durch — heute ist immer im gerenderten Bereich, daher:
```js
const isCurrentWeek = true // allDays enthält immer heute
```

`nowTop` bleibt unverändert (liest nur `visibleStart`/`visibleEnd`/`isCurrentWeek`).

- [ ] **Schritt 7: `ResizeObserver`-Effekt hinzufügen**

Direkt nach den Ref-Definitionen:

```js
useEffect(() => {
  const el = scrollContainerRef.current
  if (!el) return
  const update = () => {
    const cw = Math.floor((el.clientWidth - TIME_AXIS_W) / weekVisibleRef.current)
    setColW(cw)
  }
  update()
  const ro = new ResizeObserver(update)
  ro.observe(el)
  return () => ro.disconnect()
}, []) // einmalig; weekVisibleRef ist ein Ref, kein State
```

Wenn `weekVisibleDays` aus den Einstellungen geändert wird, muss `colW` neu berechnet werden. Dafür einen separaten Effekt:

```js
useEffect(() => {
  weekVisibleRef.current = weekVisibleDays
  const el = scrollContainerRef.current
  if (!el) return
  const cw = Math.floor((el.clientWidth - TIME_AXIS_W) / weekVisibleDays)
  setColW(cw)
}, [weekVisibleDays])
```

- [ ] **Schritt 8: Mount-Scroll-Effekt (scroll zu heute + vertikale Zeit)**

Den bestehenden Effekt:
```js
useEffect(() => {
  if (view !== 'woche' || !weekScrollRef.current) return
  const scrollTo = Math.max(0, (new Date().getHours() - visibleStart) * 2 * SLOT_H - 80)
  weekScrollRef.current.scrollTop = scrollTo
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [view])
```

Ersetzen durch:
```js
useEffect(() => {
  if (view !== 'woche') return
  const el = scrollContainerRef.current
  if (!el || colWRef.current === 0) return
  // Horizontal: scroll zu heute
  const todayIdx = daysBetween(rangeStartRef.current, today)
  el.scrollLeft = todayIdx * colWRef.current
  // Vertikal: scroll zur aktuellen Uhrzeit
  const scrollTop = Math.max(0, (new Date().getHours() - visibleStart) * 2 * SLOT_H - 80)
  el.scrollTop = scrollTop
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [view, colW]) // colW als Trigger: erst wenn colW bekannt ist, scrollen
```

- [ ] **Schritt 9: `handleScroll`-Funktion hinzufügen**

Direkt nach dem Mount-Effekt:

```js
const handleScroll = () => {
  const el = scrollContainerRef.current
  if (!el) return
  const sl = el.scrollLeft
  const cw = colWRef.current
  if (cw === 0) return

  // Bereich links erweitern (< 2 Spalten vom linken Rand)
  if (sl < 2 * cw) {
    const add = 28
    setRangeStart(d => addDays(d, -add))
    setRangeDays(n => n + add)
    // kein sichtbarer Sprung: scrollLeft korrigieren
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = sl + add * cw
      }
    })
  }

  // Bereich rechts erweitern (< 2 Spalten vom rechten Rand)
  const totalW = rangeDaysRef.current * cw
  if (sl > totalW - el.clientWidth - 2 * cw) {
    setRangeDays(n => n + 28)
  }

  // NavPill: Label und isCurrent aktualisieren (via RAF gedrosselt)
  if (rafRef.current) return
  rafRef.current = requestAnimationFrame(() => {
    rafRef.current = null
    const el2 = scrollContainerRef.current
    if (!el2) return
    const firstIdx = Math.round(el2.scrollLeft / colWRef.current)
    const lastIdx  = firstIdx + weekVisibleRef.current - 1
    const firstDay = addDays(rangeStartRef.current, firstIdx)
    const lastDay  = addDays(rangeStartRef.current, lastIdx)
    const todayIdx = daysBetween(rangeStartRef.current, today)
    setVisibleIsCurrent(todayIdx >= firstIdx && todayIdx <= lastIdx)
    const fmt = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    const fmtY = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
    setVisibleLabel(`${fmt(firstDay)} – ${fmtY(lastDay)}`)
  })
}
```

- [ ] **Schritt 10: `scrollToToday`-Hilfsfunktion für NavPill-Doppelklick**

```js
const scrollToToday = () => {
  const el = scrollContainerRef.current
  if (!el || colWRef.current === 0) return
  const todayIdx = daysBetween(rangeStartRef.current, today)
  el.scrollTo({ left: todayIdx * colWRef.current, behavior: 'smooth' })
}

const scrollWeekBy = (weeks) => {
  const el = scrollContainerRef.current
  if (!el || colWRef.current === 0) return
  el.scrollBy({ left: weeks * 7 * colWRef.current, behavior: 'smooth' })
}
```

- [ ] **Schritt 11: `usePageSwipe` für Woche deaktivieren**

Den bestehenden `usePageSwipe`-Aufruf:
```js
usePageSwipe(kalenderSwipeRef, {
  onPrev: view === 'woche'
    ? () => setWeekStart(d => addDays(d, -7))
    : () => setMonthRef(r => { ... }),
  onNext: view === 'woche'
    ? () => setWeekStart(d => addDays(d, 7))
    : () => setMonthRef(r => { ... }),
  disabled: restoreTodo !== null,
})
```

Ersetzen durch:
```js
usePageSwipe(kalenderSwipeRef, {
  onPrev: view === 'monat' ? () => setMonthRef(r => {
    const m = r.month === 0 ? 11 : r.month - 1
    const y = r.month === 0 ? r.year - 1 : r.year
    return { year: y, month: m }
  }) : undefined,
  onNext: view === 'monat' ? () => setMonthRef(r => {
    const m = r.month === 11 ? 0 : r.month + 1
    const y = r.month === 11 ? r.year + 1 : r.year
    return { year: y, month: m }
  }) : undefined,
  disabled: restoreTodo !== null,
})
```

- [ ] **Schritt 12: `calendarDate`-Effekt anpassen**

Den bestehenden Effekt (der `setWeekStart` aufruft) suchen:
```js
useEffect(() => {
  if (!calendarDate) return
  const [yr, mo, d] = calendarDate.split('-').map(Number)
  if (view === 'monat') {
    setMonthRef({ year: yr, month: mo - 1 })
  } else {
    setWeekStart(getMonday(new Date(yr, mo - 1, d)))
  }
  setSelectedDay(calendarDate)
  setCalendarDate(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

Ersetzen durch:
```js
useEffect(() => {
  if (!calendarDate) return
  const [yr, mo, d] = calendarDate.split('-').map(Number)
  if (view === 'monat') {
    setMonthRef({ year: yr, month: mo - 1 })
  } else {
    // Zur Zieldatum scrollen (nach kurzem Delay, damit colW gesetzt ist)
    const targetDate = new Date(yr, mo - 1, d)
    setTimeout(() => {
      const el = scrollContainerRef.current
      if (!el || colWRef.current === 0) return
      const idx = daysBetween(rangeStartRef.current, targetDate)
      el.scrollTo({ left: idx * colWRef.current, behavior: 'smooth' })
    }, 50)
  }
  setSelectedDay(calendarDate)
  setCalendarDate(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Schritt 13: `weekScrollRef` umbenennen auf `scrollContainerRef` (bereits oben als Ref definiert)**

Den alten `weekScrollRef`-Ref entfernen (die Zeile `const weekScrollRef = useRef(null)`). Er heißt jetzt `scrollContainerRef` (in Schritt 2 definiert).

- [ ] **Schritt 14: Commit (nur State/Logik, JSX noch nicht geändert)**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat(week): add scroll state, handlers, ResizeObserver"
```

---

## Task 5: TabKalender — Neues JSX-Layout

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

Das `{view === 'woche' && (...)}` JSX-Block komplett ersetzen.

- [ ] **Schritt 1: NavPill für Wochenansicht anpassen**

Den bestehenden NavPill-Block für die Wochenansicht:
```jsx
{view === 'woche' ? (
  <NavPill
    label={`${addDays(weekStart, 0).toLocaleDateString(...)} – ${...}`}
    onPrev={() => setWeekStart(d => addDays(d, -7))}
    onNext={() => setWeekStart(d => addDays(d, 7))}
    isCurrent={isCurrentWeek}
    leftGlows={!isCurrentWeek && toDateKey(weekStart) > toDateKey(getMonday(today))}
    rightGlows={!isCurrentWeek && toDateKey(weekStart) < toDateKey(getMonday(today))}
    onLabelDoubleClick={isCurrentWeek ? undefined : () => setWeekStart(getMonday(today))}
  />
) : (
```

Ersetzen durch:
```jsx
{view === 'woche' ? (
  <NavPill
    label={visibleLabel || `${today.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} – …`}
    onPrev={() => scrollWeekBy(-1)}
    onNext={() => scrollWeekBy(1)}
    isCurrent={visibleIsCurrent}
    leftGlows={!visibleIsCurrent}
    rightGlows={false}
    onLabelDoubleClick={visibleIsCurrent ? undefined : scrollToToday}
  />
) : (
```

Hinweis: `leftGlows`/`rightGlows` nur `leftGlows={!visibleIsCurrent}` setzen — da wir frei scrollen, ist die Richtung nicht eindeutig aus dem Label ableitbar. Das Leuchten signalisiert nur „heute ist nicht sichtbar". Das kann später verfeinert werden.

- [ ] **Schritt 2: Den kompletten Woche-JSX-Block (`{view === 'woche' && (...)}`) ersetzen**

Den gesamten Block suchen (beginnt mit `{view === 'woche' && (`) und durch folgendes ersetzen:

```jsx
{view === 'woche' && (
  <>
    <div className={s.weekWrapper}>
      <div
        ref={scrollContainerRef}
        className={s.weekScrollContainer}
        style={{ '--week-col-w': colW > 0 ? `${colW}px` : `${Math.floor((window.innerWidth - TIME_AXIS_W) / weekVisibleDays)}px` }}
        onScroll={handleScroll}
      >
        {/* ─── Sticky Header-Zeile ─── */}
        <div className={s.weekHeaderRow}>
          <div className={s.weekCorner} />
          {allDays.map(date => {
            const dk      = toDateKey(date)
            const isToday = dk === todayKey
            const toolDots = getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions)
            return (
              <div key={dk} className={[s.weekDayHead, isToday ? s.weekDayHeadToday : ''].join(' ')}>
                <span className={s.weekDayHeadName}>
                  {DAY_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                </span>
                <span className={s.weekDayHeadNum}>{date.getDate()}</span>
                {toolDots.length > 0 && (
                  <div className={s.weekDayToolDots}>
                    {toolDots.map(dot => (
                      <span key={dot.id} className={s.toolDot} style={{ background: dot.color }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ─── Allday-Streifen ─── */}
        {(showTodos || showTermine) && (
          <div className={s.weekAlldayRow}>
            <div className={s.weekAlldayLabel}>Ganzt.</div>
            {allDays.map(date => {
              const dk          = toDateKey(date)
              const bdays       = getBirthdaysForCalendarDate(birthdays, dk)
              const alldayTodos = showTodos ? todos.filter(t => t.date === dk && !t.time) : []
              return (
                <div key={dk} className={s.weekAlldayCol}>
                  {bdays.map(b => (
                    <div
                      key={b.id}
                      className={s.weekAlldayBar}
                      style={{ background: getToolColor('geburtstage', toolColors) }}
                    >
                      <span className={s.weekAlldayBarText}>{b.name}</span>
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

        {/* ─── PillStrip oben ─── */}
        <WeekPillStrip
          days={days}
          weekDays={visibleDays}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          isTop={true}
          onExpand={expandStart}
          onShrink={shrinkStart}
          onExpandTo={expandToStart}
        />

        {/* ─── Gitter: Zeitachse + Spalten ─── */}
        <div className={s.weekGridBody}>
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
          <div className={s.weekColsBody}>
            {allDays.map(date => {
              const dk         = toDateKey(date)
              const slots      = days[dk] ?? {}
              const isColToday = dk === todayKey
              const entries    = Object.entries(slots).filter(([key]) => {
                const h = parseFloat(key)
                return h >= visibleStart && h < visibleEnd
              })
              return (
                <div
                  key={dk}
                  className={[s.weekDayCol, isColToday ? s.weekDayColToday : ''].join(' ')}
                  style={{ height: colHeight }}
                  ref={el => { if (el) colRefs.current[dk] = el; else delete colRefs.current[dk] }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return
                    if (dragJustEnded.current) return
                    const slotIndex = Math.floor(e.nativeEvent.offsetY / SLOT_H)
                    const h  = visibleStart + slotIndex * 0.5
                    const hh = String(Math.floor(h)).padStart(2, '0')
                    const mm = h % 1 ? '30' : '00'
                    const rect = e.currentTarget.getBoundingClientRect()
                    const rx = e.clientX - rect.left
                    const ry = e.clientY - rect.top
                    const rid = Date.now()
                    setClickRipple({ dk, x: rx, y: ry, id: rid })
                    setTimeout(() => setClickRipple(r => r?.id === rid ? null : r), 420)
                    setQuickCreate({ date: dk, time: `${hh}:${mm}` })
                  }}
                >
                  {isColToday && nowTop !== null && (
                    <div className={s.weekNowLine} style={{ top: nowTop }}>
                      <div className={s.weekNowDot} />
                    </div>
                  )}
                  {clickRipple?.dk === dk && (
                    <div
                      className={s.weekClickRipple}
                      style={{ left: clickRipple.x, top: clickRipple.y }}
                    />
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
                        className={[
                          s.weekSlotBlock,
                          isTodo ? s.weekSlotTodo : '',
                          (slot.done || slotTodo?.done) ? s.weekSlotDone : '',
                          flashingSlotKey === `${dk}-${key}` ? s.weekSlotDoneFlash : '',
                          (dragging?.dk === dk && dragging?.key === key) ? s.weekSlotDragging : '',
                        ].join(' ')}
                        style={{ top, height, '--slot-color': slot.color || '#8B5CF6' }}
                        onPointerDown={(e) => {
                          e.stopPropagation()
                          if (e.button !== 0 && e.pointerType === 'mouse') return
                          const startX = e.clientX
                          const startY = e.clientY
                          let dragStarted = false

                          const onMove = (me) => {
                            if (dragStarted) {
                              updateDragTarget(me.clientX, me.clientY)
                              return
                            }
                            if (Math.hypot(me.clientX - startX, me.clientY - startY) > 4) {
                              dragStarted = true
                              const ck = `${dk}-${key}`
                              if (clickTimers.current[ck]) {
                                clearTimeout(clickTimers.current[ck])
                                delete clickTimers.current[ck]
                              }
                              draggingRef.current = { dk, key, slot }
                              setDragging({ dk, key, slot })
                            }
                          }

                          const finish = (commit) => {
                            document.removeEventListener('pointermove', onMove)
                            document.removeEventListener('pointerup', onUp)
                            document.removeEventListener('pointercancel', onCancel)
                            if (dragStarted) {
                              if (commit && dragTargetRef.current) {
                                handleDrop(
                                  draggingRef.current.dk,
                                  draggingRef.current.key,
                                  draggingRef.current.slot,
                                  dragTargetRef.current.dk,
                                  dragTargetRef.current.key,
                                )
                              }
                              draggingRef.current = null
                              dragTargetRef.current = null
                              setDragging(null)
                              setDragTarget(null)
                              dragJustEnded.current = true
                              setTimeout(() => { dragJustEnded.current = false }, 50)
                            } else if (commit) {
                              handleSlotTap(dk, key, slot, slotTodo)
                            }
                          }
                          const onUp     = () => finish(true)
                          const onCancel = () => finish(false)

                          document.addEventListener('pointermove', onMove)
                          document.addEventListener('pointerup', onUp)
                          document.addEventListener('pointercancel', onCancel)
                        }}
                      >
                        {height >= 14 && <span className={s.weekSlotName}>{slot.text}</span>}
                        {height >= 34 && <span className={s.weekSlotTime}>{hh}:{mm}</span>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── PillStrip unten ─── */}
        <WeekPillStrip
          days={days}
          weekDays={visibleDays}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          isTop={false}
          onExpand={expandEnd}
          onShrink={shrinkEnd}
          onExpandTo={expandToEnd}
        />
      </div>
    </div>
  </>
)}
```

- [ ] **Schritt 3: Drag-Chip anpassen**

Der Drag-Chip am Ende des Returns benutzt bisher `colRefs`. Die Berechnung bleibt gleich — nur prüfen ob `colEl` im aktuellen Scroll-Container sichtbar ist. Keine Änderung notwendig, da `colRefs` weiter per `ref`-Callback befüllt wird.

- [ ] **Schritt 4: Alte Klasse `weekTimeCorner` im JSX suchen und auf `weekCorner` umbenennen**

Im JSX-Block die Klasse `.weekTimeCorner` (der bisherige leere Eck-Div im Header) ist jetzt `weekCorner`. Sicherstellen, dass kein `s.weekTimeCorner`-Verweis mehr existiert.

```bash
grep -n "weekTimeCorner" src/features/calendar/TabKalender/TabKalender.jsx
```

Erwartet: keine Treffer. Falls doch, umbenennen auf `s.weekCorner`.

- [ ] **Schritt 5: Verify im Browser**

1. Wochenansicht öffnen → sollte sofort die aktuelle Woche zentriert zeigen
2. Horizontal scrollen → fließt frei, Tages-Header bleibt oben gepinnt, Zeitachse bleibt links gepinnt
3. Loslassen → Snap auf Tagesgrenze
4. NavPill zeigt sichtbaren Datumsbereich an, `‹` / `›` scrollen eine Woche
5. Heute-Button (Doppeltipp auf Datum) springt zu heute
6. Vertikales Scrollen → Header + Zeitachse bleiben fixiert
7. Slot-Tap öffnet Abhaken, Doppel-Tap öffnet Edit, Drag & Drop funktioniert

- [ ] **Schritt 6: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat(week): free horizontal scroll with sticky header and time axis"
```

---

## Task 6: Setting aus TabSettings in TabKalender einlesen

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

`weekVisibleDays` wird in TabKalender bereits per `lv(SK.weekVisibleDays, 7)` initialisiert. Damit eine Änderung in den Einstellungen sofort wirkt (ohne App-Reload), muss TabKalender auf Änderungen reagieren.

Da die Settings in einem anderen Tab liegen und kein gemeinsamer Store-State existiert, ist der einfachste Weg ein `storage`-Event-Listener:

- [ ] **Schritt 1: `storage`-Event-Listener hinzufügen**

Direkt nach dem `weekVisibleDays`-State in `TabKalender`:

```js
useEffect(() => {
  const onStorage = (e) => {
    if (e.key === SK.weekVisibleDays && e.newValue !== null) {
      const n = parseInt(e.newValue, 10)
      if (n >= 3 && n <= 7) {
        setWeekVisibleDays(n)
      }
    }
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}, [])
```

Hinweis: `window.storage`-Events feuern nur bei Änderungen aus anderen Tabs. Für die einfache Use-Case (Einstellungen-Tab → Kalender-Tab) reicht das. Wer die Einstellung ändert, muss danach in den Kalender-Tab wechseln, wo die Neuerung beim nächsten Mount via `lv()` gegriffen hätte — aber mit dem Listener reagiert der Tab auch ohne Reload.

- [ ] **Schritt 2: Verify**

1. Einstellungen → Kalender → auf „4" klicken
2. Kalender-Tab öffnen → 4 Spalten sichtbar (breitere Spalten)
3. Zurück auf „7" → 7 Spalten sichtbar

- [ ] **Schritt 3: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat(week): react to weekVisibleDays setting change"
```

---

## Self-Review

**Spec-Coverage:**

| Spec-Anforderung | Task |
|---|---|
| Freies horizontales Scrollen | Task 5 |
| Sticky Header (Tag-Namen) | Task 3 + 5 |
| Sticky Zeitachse | Task 3 + 5 |
| Sticky Ecke (Corner) | Task 3 + 5 |
| Scroll-Snap auf Tage | Task 3 (CSS) |
| `weekVisibleDays` Setting (3–7) | Task 1 + 2 |
| `--week-col-w` CSS-Variable | Task 3 + 4 |
| ResizeObserver für colW | Task 4 |
| Dynamische Bereichserweiterung am Rand | Task 4 (handleScroll) |
| NavPill: Label, scroll-basiert, heute | Task 4 + 5 |
| `usePageSwipe` für Woche deaktivieren | Task 4 |
| `calendarDate`-Effect → scroll statt setWeekStart | Task 4 |
| PillStrips auf sichtbare Tage beschränkt | Task 4 + 5 |
| Storage-Key + BACKUP_CATS | Task 1 |
| Drag&Drop funktioniert weiter | Task 5 (unveränderte Logik) |
| Now-Linie funktioniert weiter | Task 5 (unveränderte Logik) |

**Placeholder-Scan:** Keine TBDs, alle Code-Blöcke vollständig.

**Type-Consistency:** `scrollContainerRef` durchgängig, `rangeStartRef`/`rangeDaysRef`/`colWRef` durchgängig, `allDays`/`visibleDays` durchgängig.
