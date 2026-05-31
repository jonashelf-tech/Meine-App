# Fokus-Kernschleife Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dem Tagesplaner einen ruhigen `fokus`-Modus geben, der nur „Heute steht fest" + „Deine 3 freien" zeigt, umschaltbar zum vollen `voll`-Modus — ohne ein Tool zu entfernen.

**Architecture:** Ein neuer Dichte-Modus am bestehenden Tab 0. `heuteModus` (`'fokus' | 'voll'`, persistiert) entscheidet, ob `TabHeute` die neue `FokusView` oder den unveränderten vollen Tagesplaner rendert. Die „3 freien" werden aus der **vorhandenen** Pool-Sortierung abgeleitet (in ein gemeinsames Modul extrahiert, damit Pool und FokusView dieselbe Wahrheit nutzen). Die „festen" Einträge sind die belegten Slots des Tages. Kein automatisches Nachrücken: die 3 IDs werden pro Tag eingefroren.

**Tech Stack:** React 19, Zustand, CSS Modules, Vitest (nur reine Funktionen; UI manuell verifiziert).

---

## File Structure

- `src/storage/index.js` — neuer Key `SK.heuteModus`; in `BACKUP_CATS.kalender` aufnehmen.
- `src/store/index.js` — `heuteModus` aus Storage laden (default `'fokus'`), `setHeuteModus` persistiert.
- `src/features/calendar/poolLogic.js` — **neu**: `sortTodos`, `getActiveTodos` (aus `Pool.jsx` extrahiert, eine Quelle der Wahrheit).
- `src/features/calendar/poolLogic.test.js` — **neu**: Tests für `sortTodos` + `getActiveTodos`.
- `src/features/calendar/Pool/Pool.jsx` — nutzt `poolLogic` statt lokaler Kopien.
- `src/features/calendar/fokusLogic.js` — **neu**: `getFixedEntries`, `isDayComplete`.
- `src/features/calendar/fokusLogic.test.js` — **neu**: Tests dafür.
- `src/features/calendar/TabHeute/FokusView.jsx` + `FokusView.module.css` — **neu**: die zwei Zonen + „Tag geschafft" + Umschalter.
- `src/features/calendar/TabHeute/TabHeute.jsx` — rendert je nach `heuteModus` FokusView oder vollen Tag; Umschalt-Buttons.
- `src/features/tools/TabTools/TabTools.jsx` — öffnet direkt auf „Alle Tools".

---

## Task 1: `heuteModus` persistieren

**Files:**
- Modify: `src/storage/index.js` (SK-Block + BACKUP_CATS.kalender)
- Modify: `src/store/index.js:76-77`

- [ ] **Step 1: Storage-Key anlegen**

In `src/storage/index.js`, im `SK`-Objekt nach `calView` ergänzen:

```js
  calView:        `${PREFIX}view_cal_view`,
  heuteModus:     `${PREFIX}view_heute_modus`,
```

- [ ] **Step 2: In Backup-Kategorie aufnehmen**

In `BACKUP_CATS.kalender` (gleiche Datei) die Liste ergänzen — `SK.heuteModus` hinten an die View-Prefs:

```js
  kalender: [
    SK.todos, SK.routines, SK.todoOrder, SK.cats, SK.projects,
    SK.days, SK.doneCounters, SK.templates, SK.blockers,
    SK.lastPoolReturn, SK.poolSort, SK.visStart, SK.visEnd,
    SK.weekVisStart, SK.weekVisEnd, SK.calView, SK.heuteModus,
  ],
```

- [ ] **Step 3: Store laden + persistieren**

In `src/store/index.js` die beiden Zeilen 76–77 ersetzen:

```js
  heuteModus: lv(SK.heuteModus, 'fokus'),
  setHeuteModus: (modus) => { set({ heuteModus: modus }); sv(SK.heuteModus, modus) },
```

(`sv`, `lv`, `SK` sind oben in der Datei bereits importiert.)

- [ ] **Step 4: Lint prüfen**

Run: `npm run lint`
Expected: keine neuen Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/storage/index.js src/store/index.js
git commit -m "feat: heuteModus persistieren (fokus/voll), default fokus"
```

---

## Task 2: Pool-Sortierung in gemeinsames Modul extrahieren

Ziel: `sortTodos` + die „aktive Pool"-Filterung (undone, kein Termin, showFromDate, nicht verplant) leben an **einer** Stelle, die Pool und FokusView teilen.

**Files:**
- Create: `src/features/calendar/poolLogic.js`
- Create: `src/features/calendar/poolLogic.test.js`
- Modify: `src/features/calendar/Pool/Pool.jsx`

- [ ] **Step 1: Failing test schreiben**

`src/features/calendar/poolLogic.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { sortTodos, getActiveTodos } from './poolLogic'

const todayKey = () => new Date().toISOString().slice(0, 10)

describe('sortTodos — standard', () => {
  it('fällige (date <= heute, keine Uhrzeit) zuerst, dann nach Prio', () => {
    const heute = todayKey()
    const list = [
      { id: 'a', priority: 3, createdAt: '2020-01-01' },
      { id: 'b', priority: 1, createdAt: '2020-01-01' },
      { id: 'c', priority: 2, date: heute, createdAt: '2020-01-01' },
    ]
    const out = sortTodos(list, 'standard').map(t => t.id)
    expect(out).toEqual(['c', 'b', 'a'])
  })
})

describe('getActiveTodos', () => {
  it('filtert erledigte, Termine und verplante Todos raus', () => {
    const heute = todayKey()
    const todos = [
      { id: 'open',  priority: 1, createdAt: '2020-01-01' },
      { id: 'done',  priority: 1, done: true, createdAt: '2020-01-01' },
      { id: 'termin', priority: 1, date: heute, time: '14:00', createdAt: '2020-01-01' },
      { id: 'placed', priority: 1, createdAt: '2020-01-01' },
    ]
    const todaySlots = { '9': { todoId: 'placed', text: 'x' } }
    const out = getActiveTodos(todos, todaySlots).map(t => t.id)
    expect(out).toEqual(['open'])
  })

  it('erkennt textbasiert verplante Slots (ohne todoId) nur bei eindeutigem Text', () => {
    const todos = [{ id: 'x', text: 'Einkaufen', priority: 1, createdAt: '2020-01-01' }]
    const todaySlots = { '9': { text: 'Einkaufen' } }
    expect(getActiveTodos(todos, todaySlots)).toEqual([])
  })
})
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npx vitest run src/features/calendar/poolLogic.test.js`
Expected: FAIL — „Failed to resolve import './poolLogic'".

- [ ] **Step 3: Modul implementieren**

`src/features/calendar/poolLogic.js`:

```js
import { isFaelligkeit, isTermin } from '../todos/Block'
import { todayKey } from '../../utils'

// Sortierung wie im Pool: standard (fällig → prio → alter), kategorie, alter.
export function sortTodos(list, sort) {
  if (sort === 'alter') {
    return [...list].sort((a, b) =>
      new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    )
  }
  if (sort === 'kategorie') {
    return [...list].sort((a, b) => {
      const ca = a.category || '￿'
      const cb = b.category || '￿'
      return ca.localeCompare(cb) || (a.priority - b.priority)
    })
  }
  const today = todayKey()
  return [...list].sort((a, b) => {
    const fa = isFaelligkeit(a) && a.date <= today ? 0 : 1
    const fb = isFaelligkeit(b) && b.date <= today ? 0 : 1
    if (fa !== fb) return fa - fb
    if (a.priority !== b.priority) return a.priority - b.priority
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })
}

// Offene, nicht-terminierte, noch nicht verplante Todos (ungeordnet).
export function getActiveTodos(todos, todaySlots = {}) {
  const today = todayKey()
  const slotValues = Object.values(todaySlots).filter(Boolean)
  const placedIds   = new Set(slotValues.map(sl => sl.todoId).filter(Boolean))
  const placedTexts = new Set(slotValues.filter(sl => !sl.todoId).map(sl => sl.text).filter(Boolean))

  const counts = {}
  todos.forEach(t => { counts[t.text] = (counts[t.text] || 0) + 1 })
  const uniqueTexts = new Set(Object.keys(counts).filter(txt => counts[txt] === 1))

  const isPlaced = (t) =>
    placedIds.has(t.id) || (uniqueTexts.has(t.text) && placedTexts.has(t.text))

  return todos
    .filter(t => !t.done)
    .filter(t => !isTermin(t))
    .filter(t => !t.showFromDate || t.showFromDate <= today)
    .filter(t => !isPlaced(t))
}
```

- [ ] **Step 4: Test laufen lassen (muss bestehen)**

Run: `npx vitest run src/features/calendar/poolLogic.test.js`
Expected: PASS (alle 4).

- [ ] **Step 5: Pool.jsx auf das Modul umstellen**

In `src/features/calendar/Pool/Pool.jsx`:

1. Den lokalen `sortTodos`-Block (Zeilen 38–61) **löschen**.
2. Importe oben anpassen — `isFaelligkeit, isTermin` werden nicht mehr direkt gebraucht; stattdessen:

```js
import { sortTodos, getActiveTodos } from '../poolLogic'
```
(Den bestehenden Import `import { isFaelligkeit, isTermin } from '../../todos/Block'` entfernen, falsls sonst ungenutzt — `npm run lint` sagt es dir.)

3. Den `useMemo`-Block für `placedIds/placedTexts/uniqueTexts/isPlaced/activePool` (Zeilen 121–152) ersetzen durch:

```js
  // ─── Derived lists ──────────────────────────────────────
  const activePool = useMemo(() => {
    const undone  = sortTodos(getActiveTodos(todos, todaySlots), sort)
    const pending = todos.filter(t => t.done && pendingDoneIds.has(t.id))
    return [...undone, ...pending]
  }, [todos, todaySlots, pendingDoneIds, sort])
```

4. `isPlaced` wird im Render noch für das `PlacedIcon` gebraucht (`isPlaced={isPlaced(t)}`). Dafür eine schlanke lokale Variante behalten — direkt vor `activePool` einsetzen:

```js
  const isPlaced = useMemo(() => {
    const slotValues  = Object.values(todaySlots).filter(Boolean)
    const placedIds   = new Set(slotValues.map(sl => sl.todoId).filter(Boolean))
    const placedTexts = new Set(slotValues.filter(sl => !sl.todoId).map(sl => sl.text).filter(Boolean))
    const counts = {}
    todos.forEach(t => { counts[t.text] = (counts[t.text] || 0) + 1 })
    const uniqueTexts = new Set(Object.keys(counts).filter(txt => counts[txt] === 1))
    return (t) => placedIds.has(t.id) || (uniqueTexts.has(t.text) && placedTexts.has(t.text))
  }, [todos, todaySlots])
```

- [ ] **Step 6: Lint + alle Tests**

Run: `npm run lint && npx vitest run`
Expected: keine Fehler, alle Tests grün.

- [ ] **Step 7: Manuell prüfen, dass Pool unverändert wirkt**

Run: `npm run dev` → Tab 0 → Pool sortiert/filtert wie vorher (Standard/Kategorie/Alter, „verplant"-Icon, „Weitere anzeigen").

- [ ] **Step 8: Commit**

```bash
git add src/features/calendar/poolLogic.js src/features/calendar/poolLogic.test.js src/features/calendar/Pool/Pool.jsx
git commit -m "refactor: Pool-Sortierung in poolLogic extrahieren (Wiederverwendung für Fokus)"
```

---

## Task 3: Fokus-Helfer (feste Einträge + Abschluss)

**Files:**
- Create: `src/features/calendar/fokusLogic.js`
- Create: `src/features/calendar/fokusLogic.test.js`

- [ ] **Step 1: Failing test schreiben**

`src/features/calendar/fokusLogic.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { getFixedEntries, isDayComplete } from './fokusLogic'

describe('getFixedEntries', () => {
  it('liefert belegte Slots chronologisch nach Slot-Zeit', () => {
    const slots = {
      '14':  { text: 'Zahnarzt', done: false },
      '9.5': { text: 'Doku',     done: false },
    }
    const out = getFixedEntries(slots).map(e => e.slotKey)
    expect(out).toEqual(['9.5', '14'])
  })

  it('ignoriert leere Slot-Werte', () => {
    const slots = { '9': null, '10': { text: 'X', done: false } }
    expect(getFixedEntries(slots).map(e => e.slotKey)).toEqual(['10'])
  })
})

describe('isDayComplete', () => {
  it('true wenn alle festen + alle freien erledigt und mindestens eins existiert', () => {
    const fixed = [{ slotKey: '9', slot: { done: true } }]
    const free  = [{ id: 'a', done: true }]
    expect(isDayComplete(fixed, free)).toBe(true)
  })

  it('false wenn noch etwas offen ist', () => {
    const fixed = [{ slotKey: '9', slot: { done: false } }]
    expect(isDayComplete(fixed, [])).toBe(false)
  })

  it('false wenn gar nichts da ist (kein falscher Jubel bei leerem Tag)', () => {
    expect(isDayComplete([], [])).toBe(false)
  })
})
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npx vitest run src/features/calendar/fokusLogic.test.js`
Expected: FAIL — Import nicht auflösbar.

- [ ] **Step 3: Modul implementieren**

`src/features/calendar/fokusLogic.js`:

```js
// Belegte Slots des Tages als „Heute steht fest" — chronologisch.
export function getFixedEntries(todaySlots = {}) {
  return Object.entries(todaySlots)
    .filter(([, slot]) => slot)
    .map(([slotKey, slot]) => ({ slotKey, slot }))
    .sort((a, b) => parseFloat(a.slotKey) - parseFloat(b.slotKey))
}

// Tag „geschafft": alles Feste + alle freien erledigt, und es gab überhaupt etwas.
export function isDayComplete(fixedEntries, freeTodos) {
  const total = fixedEntries.length + freeTodos.length
  if (total === 0) return false
  const fixedDone = fixedEntries.every(e => e.slot.done)
  const freeDone  = freeTodos.every(t => t.done)
  return fixedDone && freeDone
}
```

- [ ] **Step 4: Test laufen lassen (muss bestehen)**

Run: `npx vitest run src/features/calendar/fokusLogic.test.js`
Expected: PASS (alle 5).

- [ ] **Step 5: Commit**

```bash
git add src/features/calendar/fokusLogic.js src/features/calendar/fokusLogic.test.js
git commit -m "feat: fokusLogic — feste Einträge + Tag-Abschluss-Erkennung"
```

---

## Task 4: FokusView-Komponente + Verdrahtung in TabHeute

**Files:**
- Create: `src/features/calendar/TabHeute/FokusView.jsx`
- Create: `src/features/calendar/TabHeute/FokusView.module.css`
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Step 1: FokusView-Komponente schreiben**

`src/features/calendar/TabHeute/FokusView.jsx` — die 3 freien werden pro `viewDate` **eingefroren** (kein Nachrücken). Slot-Zeit-Label via `skLabel`.

```jsx
import { useMemo, useRef } from 'react'
import { skLabel } from '../../../utils'
import { sortTodos, getActiveTodos } from '../poolLogic'
import { getFixedEntries, isDayComplete } from '../fokusLogic'
import s from './FokusView.module.css'

const CheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="M5 12l5 5L20 6" /></svg>
)
const CalIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
  </svg>
)

export default function FokusView({ viewDate, todaySlots, todos, onToggleSlotDone, onToggleTodoDone, onShowFull }) {
  const fixed = useMemo(() => getFixedEntries(todaySlots), [todaySlots])

  // Top-3 freie IDs pro Tag einfrieren → erledigte rücken NICHT nach.
  const frozen = useRef({ date: null, ids: [] })
  if (frozen.current.date !== viewDate) {
    const ranked = sortTodos(getActiveTodos(todos, todaySlots), 'standard')
    frozen.current = { date: viewDate, ids: ranked.slice(0, 3).map(t => t.id) }
  }
  const free = frozen.current.ids
    .map(id => todos.find(t => t.id === id))
    .filter(Boolean)

  const complete = isDayComplete(fixed, free)
  const doneCount = fixed.filter(e => e.slot.done).length + free.filter(t => t.done).length
  const total = fixed.length + free.length

  return (
    <div className={s.fokus}>
      {fixed.length > 0 && (
        <>
          <div className={s.zlabel}>Heute steht fest</div>
          <div className={s.fixed}>
            {fixed.map(({ slotKey, slot }) => (
              <button
                key={slotKey}
                className={[s.frow, slot.done ? s.done : ''].join(' ')}
                onClick={() => onToggleSlotDone(slotKey)}
              >
                <span className={s.time}>{skLabel(slotKey)}</span>
                <span className={s.ftext}>{slot.text}</span>
                <span className={s.ftick}>{CheckIcon}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className={s.zlabel}>Deine {free.length === 1 ? 'Aufgabe' : `${free.length} freien`}</div>
      <div className={s.cards}>
        {free.length === 0 && <p className={s.empty}>Nichts Freies offen — alles verplant ✓</p>}
        {free.map(t => (
          <button
            key={t.id}
            className={[s.card, t.done ? s.done : ''].join(' ')}
            style={{ '--accent': t.color || '#8B5CF6' }}
            onClick={() => onToggleTodoDone(t.id)}
          >
            <span className={s.tick}>{CheckIcon}</span>
            <span className={s.ctext}>{t.text}</span>
          </button>
        ))}
      </div>

      <div className={s.footer}>
        <div className={s.progress}>{doneCount} / {total} erledigt</div>
        <button className={s.daybtn} onClick={onShowFull}>{CalIcon} Ganzen Tag anzeigen</button>
      </div>

      {complete && (
        <div className={s.victory}>
          <div className={s.ring}>{CheckIcon}</div>
          <h2>Tag geschafft.</h2>
          <p>Alles erledigt. Du darfst jetzt fertig sein.</p>
          <button className={s.vbtn} onClick={onShowFull}>Ganzen Tag anzeigen</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: CSS schreiben**

`src/features/calendar/TabHeute/FokusView.module.css` (nur Variablen aus `vars.css`, keine neuen Hex-Werte außer den vorhandenen Akzenten):

```css
.fokus { display: flex; flex-direction: column; padding: 4px 2px; min-height: 70vh; }

.zlabel { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-dim); margin: 22px 0 10px; }

.fixed { display: flex; flex-direction: column; gap: 7px; }
.frow {
  display: flex; align-items: center; gap: 11px; padding: 10px 12px; width: 100%;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  color: var(--text); font-family: 'Outfit', sans-serif; cursor: pointer; text-align: left;
}
.time { font-family: 'Orbitron', sans-serif; font-size: 12px; color: var(--text-dim); flex: 0 0 46px; }
.ftext { flex: 1; font-size: 14px; }
.ftick {
  width: 22px; height: 22px; flex: 0 0 22px; border-radius: 50%; border: 1.5px solid var(--text-dim);
  display: flex; align-items: center; justify-content: center;
}
.ftick svg { width: 12px; height: 12px; opacity: 0; stroke: var(--bg); transition: opacity .25s; }

.cards { display: flex; flex-direction: column; gap: 9px; }
.card {
  display: flex; align-items: center; gap: 12px; padding: 14px; width: 100%; position: relative; overflow: hidden;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  color: var(--text); font-family: 'Outfit', sans-serif; cursor: pointer; text-align: left;
}
.card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent, var(--primary)); opacity: .85; }
.tick {
  width: 25px; height: 25px; flex: 0 0 25px; border-radius: 50%; border: 2px solid var(--text-dim);
  display: flex; align-items: center; justify-content: center; z-index: 2;
}
.tick svg { width: 14px; height: 14px; opacity: 0; stroke: var(--bg); transition: opacity .25s; }
.ctext { flex: 1; font-size: 14.5px; font-weight: 500; }

.done { opacity: .5; }
.done .ftext, .done .ctext { text-decoration: line-through; text-decoration-color: var(--text-dim); }
.done .ftick, .done .tick { background: var(--emerald); border-color: var(--emerald); }
.done .ftick svg, .done .tick svg { opacity: 1; }

.empty { color: var(--text-dim); font-size: 13px; padding: 8px 2px; }

.footer { margin-top: auto; padding-top: 18px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.progress { font-family: 'Orbitron', sans-serif; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-dim); }
.daybtn {
  width: 100%; padding: 14px; border-radius: var(--r); background: transparent; border: 1px solid var(--border);
  color: var(--text-dim); font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 500;
  display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
}

.victory {
  position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; text-align: center; padding: 40px;
  background: radial-gradient(120% 90% at 50% 30%, rgba(16,185,129,0.14), var(--bg) 60%);
  animation: fadeInUp .5s ease;
}
.ring {
  width: 92px; height: 92px; border-radius: 50%; border: 3px solid var(--emerald);
  display: flex; align-items: center; justify-content: center; box-shadow: var(--glow-emerald);
}
.ring svg { width: 44px; height: 44px; stroke: var(--emerald); }
.victory h2 { font-size: 25px; font-weight: 600; color: var(--text); }
.victory p { font-size: 13.5px; color: var(--text-dim); max-width: 240px; line-height: 1.6; }
.vbtn { margin-top: 6px; font-size: 13px; color: var(--teal); background: none; border: none; cursor: pointer; text-decoration: underline; }
```

- [ ] **Step 3: TabHeute verdrahten — Import + Store**

In `src/features/calendar/TabHeute/TabHeute.jsx`:

1. Import ergänzen (bei den anderen Imports):
```js
import FokusView from './FokusView'
```
2. `heuteModus` + `setHeuteModus` aus dem Store in der bestehenden Destrukturierung (Zeile 30) ergänzen:
```js
  const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate, setCalendarDate, blockers, setBlockers, birthdays, setBirthdays, heuteModus, setHeuteModus } = useAppStore()
```

- [ ] **Step 4: TabHeute — bedingtes Rendern**

In `TabHeute.jsx` den `return (...)` so anpassen, dass bei `heuteModus === 'fokus'` die FokusView statt Zeitplan/Pool/Sections erscheint. DayNav bleibt immer oben. Den bestehenden `<div ref={swipeRef} …>`-Block (Zeilen 475–526) in einen Zweig packen:

```jsx
      {heuteModus === 'fokus' ? (
        <FokusView
          viewDate={viewDate}
          todaySlots={todaySlots}
          todos={todos}
          onToggleSlotDone={handleToggleSlotDone}
          onToggleTodoDone={handleToggleDone}
          onShowFull={() => setHeuteModus('voll')}
        />
      ) : (
        <>
          <button className={s.fokusBackBtn} onClick={() => setHeuteModus('fokus')}>
            ← Fokus
          </button>
          <div ref={swipeRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* ... bestehender Zeitplan + Pool + Sections-Block UNVERÄNDERT ... */}
          </div>
        </>
      )}
```

(Die Modals/Sheets darunter — `editingTodo`, `klaerenTodo`, `teOpen`, `blockerModal`, `repeatDeleteSheet` — bleiben **außerhalb** dieses Zweigs, unverändert am Ende des `return`.)

- [ ] **Step 5: Umschalt-Button-Style ergänzen**

In `src/features/calendar/TabHeute/TabHeute.module.css` ans Ende anfügen:

```css
.fokusBackBtn {
  align-self: flex-start;
  margin: 2px 0 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-dim);
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  cursor: pointer;
}
```

- [ ] **Step 6: Lint + Tests**

Run: `npm run lint && npx vitest run`
Expected: keine Fehler, alle Tests grün.

- [ ] **Step 7: Manuell verifizieren**

Run: `npm run dev`
- Tab 0 öffnet im **Fokus**-Modus: oben „Heute steht fest" (belegte Slots), darunter „Deine 3 freien", unten „Ganzen Tag anzeigen".
- Slot/Karte antippen → hakt ab, durchgestrichen.
- Alles abhaken → „Tag geschafft"-Overlay.
- „Ganzen Tag anzeigen" → voller Tagesplaner (unverändert) + „← Fokus".
- Reload → Modus bleibt erhalten (persistiert).
- Erledigtes Todo in den 3 rückt **nicht** nach (kein neues erscheint).

- [ ] **Step 8: Commit**

```bash
git add src/features/calendar/TabHeute/FokusView.jsx src/features/calendar/TabHeute/FokusView.module.css src/features/calendar/TabHeute/TabHeute.jsx src/features/calendar/TabHeute/TabHeute.module.css
git commit -m "feat: Fokus-Modus im Tagesplaner (zwei Zonen + Tag-geschafft, umschaltbar)"
```

---

## Task 5: Tools-Tab öffnet direkt auf „Alle Tools"

**Files:**
- Modify: `src/features/tools/TabTools/TabTools.jsx:20`

- [ ] **Step 1: Default umstellen**

In `src/features/tools/TabTools/TabTools.jsx` die Zeile

```js
  const [showAll, setShowAll] = useState(false)
```
ersetzen durch:
```js
  const [showAll, setShowAll] = useState(true)
```

- [ ] **Step 2: Manuell verifizieren**

Run: `npm run dev` → Tab „Tools" zeigt direkt die alphabetische „Alle Tools"-Liste. „✕ Schließen" zeigt weiterhin „Meine Tools". Kein Tool verschwunden, alle aktivierbar.

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/TabTools/TabTools.jsx
git commit -m "feat: Tools-Tab öffnet direkt auf Alle Tools (kein Stöber-Schnellzugriff)"
```

---

## Task 6: Gesamt-Abnahme

- [ ] **Step 1: Voller Testlauf + Lint + Build**

Run: `npm run lint && npx vitest run && npm run build`
Expected: alles grün, Build ohne Fehler.

- [ ] **Step 2: Screenshot Fokus-Modus**

Run: `npm run dev`, Tab 0 öffnen, Screenshot des ruhigen Fokus-Screens für die Abnahme.

---

## Self-Review (gegen die Spec)

- **Zwei Dichte-Modi, persistiert, default fokus** → Task 1 (Store/SK), Task 4 (Rendern). ✓
- **Zone „Heute steht fest", abhakbar** → `getFixedEntries` (Task 3) + FokusView `onToggleSlotDone` (Task 4, nutzt bestehendes `handleToggleSlotDone`). ✓
- **Zone „Deine 3 freien" aus vorhandener Pool-Sortierung, abhakbar, kein Nachrücken** → `poolLogic` (Task 2) + eingefrorene IDs in FokusView (Task 4). ✓
- **Tauschen = im Pool hochheben** → die 3 spiegeln die Pool-Reihenfolge beim Tag-/Mount-Wechsel; keine neue Persistenz nötig. (Hinweis: Reorder wirkt sich beim nächsten Öffnen aus, nicht live — bewusst, um Nachrücken zu vermeiden.) ✓
- **„Tag geschafft" ohne Nachrücken** → `isDayComplete` (Task 3) + Overlay (Task 4). ✓
- **Voller Tagesplaner unverändert** → bestehender Block bleibt 1:1, nur in einen Zweig verschoben (Task 4). ✓
- **Tools hinter „Alle Tools", Tab bleibt, nichts gelöscht** → Task 5. ✓

**Offen / bewusst nicht im v1 (aus Spec „offene Detailpunkte"):**
- „+ N weitere im Pool"-Zeile im Fokus: **weggelassen** (ruhiger). Kann später ergänzt werden.
- Genaue Optik/Platzierung des Umschalters: schlichter Text-Button, beim Bauen finalisieren.
- Reine, nicht-verplante `date+time`-Termine erscheinen in Zone 1 nur, wenn sie als Slot im Tag liegen (das ist die heutige Datenrealität). Falls unplatzierte Termine auch oben auftauchen sollen → eigener Folgeschritt.
