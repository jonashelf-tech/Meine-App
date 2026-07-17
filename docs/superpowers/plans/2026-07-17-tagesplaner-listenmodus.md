# Tagesplaner-Listenmodus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Fokusmodus des Tagesplaners wird zum Listenmodus — derselbe Tag, dieselben `TodoChip`s, Pool und Dashboards sichtbar, nur ohne Stundenraster. Todos lassen sich frei zwischen die Termine einsortieren, ohne eine Uhrzeit zu bekommen.

**Architecture:** Ein neues Feld `dayRank` am Block (Sortier-Rang auf der Tagesachse, nie ein Zeitpunkt) trägt die Reihenfolge — kein neuer Storage-Key, kein Misch-Array pro Tag. Die Liste ist kein zweiter Screen, sondern ein Komponententausch im vorhandenen Swipe-Container von `TabHeute` (`heuteModus === 'liste' ? <Tagesliste/> : <Zeitplan/>`); DayNav, CockpitBar, Pool, Dashboards und alle Modals sind geteilt. Die gesamte Sortier-/Band-Logik wohnt rein und getestet in `tagesListeLogic.js`; die Komponente rendert nur, was sie bekommt.

**Tech Stack:** React 19, Vite, Zustand, CSS Modules, Vitest (`npm test` → `vitest run`).

**Spec:** `docs/superpowers/specs/2026-07-17-tagesplaner-listenmodus-design.md`

---

## Datei-Struktur

| Datei | Verantwortung |
|---|---|
| `src/features/todos/Block.js` | **Ändern** — Feld `dayRank` in `createBlock()` |
| `src/dayRankGuard.test.js` | **Neu** — Anti-Drift: `dayRank` bleibt ein Listenmodus-Begriff |
| `src/features/calendar/tagesListeLogic.js` | **Neu** — rein: `rankOf`, `insertRank`, `buildDayEntries` |
| `src/features/calendar/tagesListeLogic.test.js` | **Neu** — Guard für obiges |
| `src/features/calendar/poolLogic.js` | **Ändern** — `getActiveTodos(todos, todaySlots, excludeDate?)` |
| `src/features/calendar/poolLogic.test.js` | **Ändern** (existiert, 12 Tests) — Guard für den neuen Parameter anhängen |
| `src/store/index.js` | **Ändern** — `heuteModus` Werte `'raster'|'liste'` + Lese-Migration |
| `src/features/calendar/TabHeute/CockpitBar.jsx` + `.module.css` | **Ändern** — Segmented statt Fokus-Knopf, modusabhängige Funktionszeile |
| `src/features/calendar/Tagesliste/Tagesliste.jsx` + `.module.css` | **Neu** — rendert die Zeilen/Bänder/Lücken |
| `src/features/calendar/TabHeute/useTagesplanerDrag.js` | **Ändern** — `startListDrag` |
| `src/features/calendar/TabHeute/useSlotMutations.js` | **Ändern** — `dayRank: null` beim `'back'` |
| `src/features/calendar/TabHeute/useTimeEvents.js` | **Ändern** — `dayRank: null` beim „In Pool" |
| `src/features/calendar/TabHeute/TabHeute.jsx` | **Ändern** — Tausch, Verdrahtung, `onToPool` |
| `src/components/TodoChip/TodoChip.jsx` + `.module.css` | **Ändern** — `onToPool`-Prop, Zeile `[+] [Feld] [Pause] [Pool]` |
| `src/components/TodoModal/TodoModal.jsx` | **Ändern** — `dayRank: null` wenn das Todo Termin wird |
| `src/features/calendar/TabHeute/FokusView.jsx` + `.module.css` | **Löschen** |
| `src/features/calendar/fokusLogic.js` + `.test.js` | **Löschen** |
| `src/features/settings/Hilfe/Hilfe.jsx` | **Ändern** — Kern-Karte „Raster oder Liste" |
| `kontext/kern.md`, `kontext/architektur.md` | **Ändern** — Kontext nachziehen |

**Hinweis zur Testform:** Dieses Repo hat **keine Komponententests** — nur reine Logik-Tests und Guards (`styleguide.test.js`, `storage.test.js`, `projektGuard.test.js`, `bandLogic`, `merge.test.js`). Tasks 1–4 laufen deshalb TDD; die UI-Tasks 5–8 werden im Browser-Preview verifiziert. Das ist bewusst und folgt dem Bestand — keine Test-Infrastruktur für Komponenten neu erfinden.

---

## Task 1: `dayRank` am Block + Anti-Drift-Guard

**Files:**
- Modify: `src/features/todos/Block.js:23`
- Create: `src/dayRankGuard.test.js`

- [ ] **Step 1: Guard schreiben (schlägt fehl)**

Create `src/dayRankGuard.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createBlock } from './features/todos/Block'

// Anti-Drift: dayRank ist ein Sortier-Rang des Listenmodus — nie ein Zeitpunkt.
// Er darf sich nicht in Kalender, Zeitplan, Pool, Chip oder Tools ausbreiten;
// sonst fängt jemand an, ihn als Uhrzeit zu lesen.
const SRC = dirname(fileURLToPath(import.meta.url))

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const ALLOWED = [
  'features/todos/Block.js',
  'features/calendar/tagesListeLogic.js',
  'features/calendar/TabHeute/TabHeute.jsx',
  'features/calendar/TabHeute/useTagesplanerDrag.js',
  'features/calendar/TabHeute/useSlotMutations.js',
  'features/calendar/TabHeute/useTimeEvents.js',
  'components/TodoModal/TodoModal.jsx',
]

const files = walk(SRC).filter(f => /\.jsx?$/.test(f) && !/\.test\.jsx?$/.test(f))

describe('dayRank — Anti-Drift', () => {
  it('createBlock() legt dayRank als null an', () => {
    expect(createBlock().dayRank).toBe(null)
  })

  it('dayRank taucht nur in der Allowlist auf', () => {
    const hits = []
    for (const file of files) {
      const rel = file.slice(SRC.length + 1).replace(/\\/g, '/')
      if (ALLOWED.includes(rel)) continue
      if (/\bdayRank\b/.test(readFileSync(file, 'utf8'))) hits.push(rel)
    }
    expect(hits, `dayRank gehört nicht in:\n${hits.join('\n')}`).toEqual([])
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run src/dayRankGuard.test.js`
Expected: FAIL — „createBlock() legt dayRank als null an" schlägt fehl mit `expected undefined to be null`. Der Allowlist-Test ist grün (noch nutzt niemand `dayRank`).

- [ ] **Step 3: Feld ergänzen**

In `src/features/todos/Block.js`, direkt nach `time: null,` (Zeile 23):

```js
  date:                  null,
  time:                  null,
  dayRank:               null,   // Sortier-Rang auf der Tagesachse (Listenmodus) — KEIN Zeitpunkt, wird nie angezeigt
  repeat:                null, // { type: 'daily'|'weekly'|'monthly'|'custom', every?, unit? }
```

- [ ] **Step 4: Test laufen lassen**

Run: `npx vitest run src/dayRankGuard.test.js`
Expected: PASS (2 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/todos/Block.js src/dayRankGuard.test.js
git commit -m "feat(todos): Feld dayRank am Block + Anti-Drift-Guard

Sortier-Rang für den Listenmodus. Der Guard hält ihn aus Kalender,
Zeitplan, Pool, Chip und Tools raus, damit ihn niemand als Uhrzeit liest.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `rankOf` + `insertRank`

**Files:**
- Create: `src/features/calendar/tagesListeLogic.js`
- Create: `src/features/calendar/tagesListeLogic.test.js`

- [ ] **Step 1: Failing tests schreiben**

Create `src/features/calendar/tagesListeLogic.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { rankOf, insertRank } from './tagesListeLogic'

describe('rankOf', () => {
  it('Slot: Rang ist die Dezimalstunde des Slot-Keys', () => {
    expect(rankOf({ kind: 'slot', slotKey: '9.5' })).toBe(9.5)
  })

  it('Blocker: Rang ist die Startstunde', () => {
    expect(rankOf({ kind: 'band', blocker: { startHour: 9, endHour: 17 } })).toBe(9)
  })

  it('Todo: Rang ist dayRank', () => {
    expect(rankOf({ kind: 'todo', todo: { dayRank: 12 } })).toBe(12)
  })

  it('Todo ohne dayRank landet am Tagesende (24), nicht bei 0', () => {
    expect(rankOf({ kind: 'todo', todo: { dayRank: null } })).toBe(24)
  })
})

describe('insertRank', () => {
  it('zwischen zwei Nachbarn: die Mitte', () => {
    expect(insertRank(10, 14)).toBe(12)
  })

  it('ganz oben (kein Vorgänger): vor den ersten', () => {
    expect(insertRank(null, 9)).toBe(8.5)
  })

  it('ganz unten (kein Nachfolger): hinter den letzten', () => {
    expect(insertRank(17, null)).toBe(17.5)
  })

  it('leere Liste: Tagesmitte', () => {
    expect(insertRank(null, null)).toBe(12)
  })

  it('darf über 24 hinaus — der Rang sortiert nur, er ist keine Uhrzeit', () => {
    expect(insertRank(24, null)).toBe(24.5)
  })
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run src/features/calendar/tagesListeLogic.test.js`
Expected: FAIL — „Failed to resolve import ./tagesListeLogic"

- [ ] **Step 3: Minimale Implementierung**

Create `src/features/calendar/tagesListeLogic.js`:

```js
// Reihenfolge der Tagesliste. Alle Einträge liegen auf EINER Achse: der
// Dezimalstunde. Termine und Blocker bekommen ihren Rang aus der echten Zeit,
// zeitlose Tages-Todos aus `dayRank`. Deshalb lässt sich beides mischen.
//
// `dayRank` ist ausdrücklich KEIN Zeitpunkt: er wird nie angezeigt, erzeugt nie
// einen Slot und darf über 24 oder unter 0 liegen (etwas ganz unten/oben
// einfügen). Er sortiert, mehr nicht.

const RANK_END = 24   // Todo ohne Rang → ans Tagesende

export function rankOf(row) {
  if (row.kind === 'slot') return parseFloat(row.slotKey)
  if (row.kind === 'band') return row.blocker.startHour
  return row.todo.dayRank ?? RANK_END
}

// Rang für einen Drop zwischen zwei Nachbarn. Fehlt ein Nachbar, wird um eine
// halbe Stunde davor/dahinter gegriffen. Der Aufrufer setzt bei einem Drop
// INNERHALB eines Blockers dessen Kanten als Nachbarn ein — insertRank selbst
// weiß von Bändern nichts.
export function insertRank(prev, next) {
  if (prev != null && next != null) return (prev + next) / 2
  if (next != null) return next - 0.5
  if (prev != null) return prev + 0.5
  return 12
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/features/calendar/tagesListeLogic.test.js`
Expected: PASS (9 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/calendar/tagesListeLogic.js src/features/calendar/tagesListeLogic.test.js
git commit -m "feat(tagesliste): rankOf + insertRank

Termine, Blocker und zeitlose Tages-Todos auf eine Sortierachse bringen,
damit sich Todos zwischen Termine einsortieren lassen.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `buildDayEntries`

Baut die fertige Zeilenliste: Einträge, Bänder und die Lücken dazwischen (= Drop-Ziele). Die Komponente rendert danach nur noch stumpf.

**Files:**
- Modify: `src/features/calendar/tagesListeLogic.js`
- Modify: `src/features/calendar/tagesListeLogic.test.js`

- [ ] **Step 1: Failing tests ergänzen**

Die Import-Zeile oben erweitern (ESLint erlaubt keinen zweiten Import mitten in der Datei):

```js
import { rankOf, insertRank, buildDayEntries } from './tagesListeLogic'
```

Dann an `src/features/calendar/tagesListeLogic.test.js` anhängen:

```js
const T = (id, dayRank, extra = {}) => ({
  id, text: id, date: '2026-07-17', time: null, done: false,
  dayRank, createdAt: '2026-07-01T10:00:00.000Z', ...extra,
})

// Nur die Zeilen ohne Lücken — macht die Erwartungen lesbar.
const shape = (rows) => rows
  .filter(r => r.type !== 'gap')
  .map(r => r.type === 'band' ? { band: r.blocker.id, rows: shape(r.rows) } : r.key)

describe('buildDayEntries', () => {
  it('mischt Slots und Todos nach Rang', () => {
    const { rows } = buildDayEntries({
      slots:  { '10': { text: 'Zahnarzt' }, '14': { text: 'Meeting' } },
      todos:  [T('steuer', 12), T('waesche', 15)],
      blockers: [],
      viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual(['slot|10', 'todo|steuer', 'slot|14', 'todo|waesche'])
  })

  it('Todo ohne dayRank hängt hinten, hinter allem mit Rang', () => {
    const { rows } = buildDayEntries({
      slots: { '14': { text: 'Meeting' } },
      todos: [T('offen', null), T('steuer', 12)],
      blockers: [], viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual(['todo|steuer', 'slot|14', 'todo|offen'])
  })

  it('Gleichstand: der Anker gewinnt, das Todo rutscht dahinter', () => {
    const { rows } = buildDayEntries({
      slots: { '10': { text: 'Zahnarzt' } },
      todos: [T('steuer', 10)],
      blockers: [], viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual(['slot|10', 'todo|steuer'])
  })

  it('Gleichstand unter Todos: das ältere zuerst', () => {
    const { rows } = buildDayEntries({
      slots: {}, blockers: [], viewDate: '2026-07-17',
      todos: [
        T('neu',  12, { createdAt: '2026-07-05T00:00:00.000Z' }),
        T('alt',  12, { createdAt: '2026-07-01T00:00:00.000Z' }),
      ],
    })
    expect(shape(rows)).toEqual(['todo|alt', 'todo|neu'])
  })

  it('nimmt nur Todos dieses Tages, ohne Uhrzeit, offen', () => {
    const { rows } = buildDayEntries({
      slots: {}, blockers: [], viewDate: '2026-07-17',
      todos: [
        T('passt',   12),
        T('morgen',  12, { date: '2026-07-18' }),
        T('termin',  12, { time: '10:00' }),
        T('erledigt',12, { done: true }),
        T('poollos', 12, { date: null }),
      ],
    })
    expect(shape(rows)).toEqual(['todo|passt'])
  })

  it('steckt Einträge im Blocker-Bereich in dessen Band', () => {
    const { rows } = buildDayEntries({
      slots: { '10': { text: 'Standup' }, '19': { text: 'Sport' } },
      todos: [T('steuer', 12)],
      blockers: [{ id: 'b1', text: 'Arbeit', startHour: 9, endHour: 17, locked: false, date: '2026-07-17' }],
      viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual([
      { band: 'b1', rows: ['slot|10', 'todo|steuer'] },
      'slot|19',
    ])
  })

  it('leeres Band rendert trotzdem — es ist ein Drop-Ziel', () => {
    const { rows } = buildDayEntries({
      slots: {}, todos: [],
      blockers: [{ id: 'b1', text: 'Arbeit', startHour: 9, endHour: 17, locked: false, date: '2026-07-17' }],
      viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual([{ band: 'b1', rows: [] }])
  })

  it('Lücke in einem leeren Band greift die Bandkanten, nicht null', () => {
    const { rows } = buildDayEntries({
      slots: {}, todos: [],
      blockers: [{ id: 'b1', text: 'Abend', startHour: 18, endHour: 22, locked: false, date: '2026-07-17' }],
      viewDate: '2026-07-17',
    })
    const band = rows.find(r => r.type === 'band')
    const gap  = band.rows.find(r => r.type === 'gap')
    expect([gap.prev, gap.next]).toEqual([18, 22])
    // Der Drop muss INNERHALB des Bandes landen, sonst springt der Eintrag
    // beim nächsten Rendern raus.
    const dropped = insertRank(gap.prev, gap.next)
    expect(dropped).toBeGreaterThanOrEqual(18)
    expect(dropped).toBeLessThan(22)
  })

  it('gesperrtes Band: seine Lücken sind keine Drop-Ziele', () => {
    const { rows } = buildDayEntries({
      slots: {}, todos: [],
      blockers: [{ id: 'b1', text: 'Schlaf', startHour: 22, endHour: 23, locked: true, date: '2026-07-17' }],
      viewDate: '2026-07-17',
    })
    const band = rows.find(r => r.type === 'band')
    expect(band.rows.every(r => r.type !== 'gap' || r.locked)).toBe(true)
  })

  // getBlockersForDate normalisiert Overnight-Blocker bereits in zwei Stücke und
  // gibt pro Tag nur das passende zurück — die Liste erbt das, ohne es zu wissen.
  const nacht = { id: 'b1', text: 'Nacht', startHour: 22, endHour: 6, locked: false, date: '2026-07-17' }

  it('tagesübergreifender Blocker: am Starttag das Stück bis Mitternacht', () => {
    const { rows } = buildDayEntries({ slots: {}, todos: [], blockers: [nacht], viewDate: '2026-07-17' })
    const bands = rows.filter(r => r.type === 'band')
    expect(bands.map(b => [b.blocker.startHour, b.blocker.endHour])).toEqual([[22, 24]])
  })

  it('tagesübergreifender Blocker: am Folgetag das Stück ab Mitternacht', () => {
    const { rows } = buildDayEntries({ slots: {}, todos: [], blockers: [nacht], viewDate: '2026-07-18' })
    const bands = rows.filter(r => r.type === 'band')
    expect(bands.map(b => [b.blocker.startHour, b.blocker.endHour])).toEqual([[0, 6]])
  })

  it('Lücken sitzen vor, zwischen und nach den Einträgen', () => {
    const { rows } = buildDayEntries({
      slots: { '10': { text: 'A' } }, todos: [], blockers: [], viewDate: '2026-07-17',
    })
    expect(rows.map(r => r.type)).toEqual(['gap', 'slot', 'gap'])
    expect([rows[0].prev, rows[0].next]).toEqual([null, 10])
    expect([rows[2].prev, rows[2].next]).toEqual([10, null])
  })
})
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run src/features/calendar/tagesListeLogic.test.js`
Expected: FAIL — `buildDayEntries is not a function`

- [ ] **Step 3: Implementierung ergänzen**

An `src/features/calendar/tagesListeLogic.js` anhängen:

```js
import { getBlockersForDate } from './Blocker/blockerUtils'

const byRank = (a, b) => {
  const d = rankOf(a) - rankOf(b)
  if (d !== 0) return d
  // Gleichstand: Anker vor Todo (ein Termin um 10:00 schlägt dayRank 10),
  // unter Todos das ältere zuerst.
  const anchor = (r) => (r.kind === 'todo' ? 1 : 0)
  if (anchor(a) !== anchor(b)) return anchor(a) - anchor(b)
  if (a.kind === 'todo' && b.kind === 'todo') {
    return new Date(a.todo.createdAt || 0) - new Date(b.todo.createdAt || 0)
  }
  return 0
}

// Lücken zwischen die Zeilen legen — jede Lücke ist ein Drop-Ziel und kennt
// ihre Nachbar-Ränge. `lo`/`hi` sind die Bandkanten: innerhalb eines Blockers
// darf ein Drop nicht außerhalb des Bandes landen, sonst springt der Eintrag
// beim nächsten Rendern wieder raus.
//
// `scope` hält die Keys eindeutig: aus den Nachbar-Rängen allein lässt sich kein
// eindeutiger Key bauen — zwei Fenster mit gleichen Stunden erzeugen sonst
// beide `gap|9|17`. useDragDrop führt die Ziele in einer Map über den Key; ein
// Duplikat überschreibt still das andere und macht eine Drop-Zone tot.
function withGaps(items, { lo = null, hi = null, locked = false, scope = 'root' } = {}) {
  const out = []
  const gap = (prev, next) => ({
    type: 'gap',
    key: `gap|${scope}|${prev ?? ''}|${next ?? ''}`,
    prev, next, locked,
  })
  out.push(gap(lo, items.length ? rankOf(items[0]) : hi))
  items.forEach((item, i) => {
    out.push(item)
    const next = i + 1 < items.length ? rankOf(items[i + 1]) : hi
    out.push(gap(trailingRankOf(item), next))
  })
  return out
}

// Woran eine nachfolgende Lücke andockt: ein Band endet erst an seiner Endstunde.
function trailingRankOf(row) {
  return row.kind === 'band' ? row.blocker.endHour : rankOf(row)
}

export function buildDayEntries({ slots = {}, todos = [], blockers = [], viewDate }) {
  const dayBlockers = getBlockersForDate(blockers, viewDate)

  const items = [
    ...Object.entries(slots)
      .filter(([, slot]) => slot)
      .map(([slotKey, slot]) => ({
        type: 'slot', kind: 'slot', key: `slot|${slotKey}`, slotKey, slot,
      })),
    ...todos
      .filter(t => t.date === viewDate && !t.time && !t.done)
      .map(todo => ({ type: 'todo', kind: 'todo', key: `todo|${todo.id}`, todo })),
  ]

  // Zuordnung über getBlockerForHour-Semantik: der erste Blocker, der die
  // Stunde enthält, gewinnt — dieselbe Überlappungsauflösung wie im Raster.
  const bandOf = (row) => {
    const h = Math.floor(rankOf(row))
    return dayBlockers.find(b => h >= b.startHour && h < b.endHour) ?? null
  }

  const loose = []
  const inBand = new Map(dayBlockers.map(b => [b.id + b.startHour, []]))
  for (const item of items) {
    const b = bandOf(item)
    if (b) inBand.get(b.id + b.startHour).push(item)
    else loose.push(item)
  }

  const bands = dayBlockers.map(blocker => ({
    type: 'band', kind: 'band', key: `band|${blocker.id}|${blocker.startHour}`,
    blocker,
    rows: withGaps(
      inBand.get(blocker.id + blocker.startHour).sort(byRank),
      {
        lo: blocker.startHour, hi: blocker.endHour, locked: !!blocker.locked,
        scope: `b${blocker.id}${blocker.startHour}`,
      },
    ),
  }))

  return { rows: withGaps([...loose, ...bands].sort(byRank)) }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/features/calendar/tagesListeLogic.test.js`
Expected: PASS (21 Tests — 9 aus Task 2, 12 neue)

- [ ] **Step 5: Commit**

```bash
git add src/features/calendar/tagesListeLogic.js src/features/calendar/tagesListeLogic.test.js
git commit -m "feat(tagesliste): buildDayEntries — Zeilen, Bänder, Drop-Lücken

Baut die fertige Tagesliste inklusive Blocker-Bändern und der Lücken
dazwischen. Blocker-Zuordnung folgt der Raster-Semantik (erster Treffer
gewinnt); Lücken in einem Band tragen dessen Kanten, damit ein Drop nicht
außerhalb landet.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Pool filtert die Tages-Todos aus (nur im Listenmodus)

**Files:**
- Modify: `src/features/calendar/poolLogic.js:39-57`
- Modify: `src/features/calendar/poolLogic.test.js`

- [ ] **Step 1: Failing test schreiben**

⚠️ **`poolLogic.test.js` existiert bereits** (12 Tests für `sortTodos` und `getActiveTodos`). Den folgenden Block **anhängen**, die Datei nicht überschreiben:

```js
import { describe, it, expect } from 'vitest'
import { getActiveTodos } from './poolLogic'

const T = (id, extra = {}) => ({
  id, text: id, date: null, time: null, done: false,
  createdAt: '2026-07-01T10:00:00.000Z', ...extra,
})

describe('getActiveTodos — excludeDate', () => {
  it('ohne excludeDate bleibt alles wie bisher: Tages-Todos stehen im Pool', () => {
    const todos = [T('pool'), T('heute', { date: '2026-07-17' })]
    expect(getActiveTodos(todos, {}).map(t => t.id)).toEqual(['pool', 'heute'])
  })

  it('mit excludeDate fallen die zeitlosen Todos dieses Tages raus', () => {
    const todos = [T('pool'), T('heute', { date: '2026-07-17' })]
    expect(getActiveTodos(todos, {}, '2026-07-17').map(t => t.id)).toEqual(['pool'])
  })

  it('Todos anderer Tage bleiben im Pool', () => {
    const todos = [T('morgen', { date: '2026-07-18' })]
    expect(getActiveTodos(todos, {}, '2026-07-17').map(t => t.id)).toEqual(['morgen'])
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run src/features/calendar/poolLogic.test.js`
Expected: FAIL — „mit excludeDate fallen die zeitlosen Todos dieses Tages raus" liefert `['pool', 'heute']`

- [ ] **Step 3: Parameter ergänzen**

In `src/features/calendar/poolLogic.js` die Signatur und den letzten Filter ändern:

```js
// Offene, nicht-terminierte, noch nicht verplante Todos (ungeordnet).
// `excludeDate` (nur Listenmodus): zeitlose Todos DIESES Tages stehen dort oben
// in der Tagesliste und gehören deshalb nicht zusätzlich in den Pool. Ohne den
// Parameter bleibt das Rasterverhalten unverändert.
export function getActiveTodos(todos, todaySlots = {}, excludeDate = null) {
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
    .filter(t => !(excludeDate && t.date === excludeDate))
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/features/calendar/poolLogic.test.js`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/calendar/poolLogic.js src/features/calendar/poolLogic.test.js
git commit -m "feat(pool): getActiveTodos nimmt optionales excludeDate

Im Listenmodus stehen die zeitlosen Todos des Tages oben in der Tagesliste
und dürfen nicht doppelt im Pool erscheinen. Ohne den Parameter bleibt das
Rasterverhalten exakt wie bisher.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `heuteModus` → `'raster' | 'liste'` + Umschalter in der CockpitBar

**Files:**
- Modify: `src/store/index.js` (`heuteModus`-Zeile)
- Modify: `src/features/calendar/TabHeute/CockpitBar.jsx:28,116-121`
- Modify: `src/features/calendar/TabHeute/CockpitBar.module.css`
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx:192-211`

- [ ] **Step 1: Store — Werte umbenennen + Lese-Migration**

In `src/store/index.js` die `heuteModus`-Zeile suchen (`heuteModus: lv(SK.heuteModus, 'voll'),`) und ersetzen:

```js
  // Alt-Werte aus persistiertem View-State migrieren (Vorbild: poolSort
  // 'kategorie'→'projekt'). 'fokus' hieß der Modus, bevor er zur Liste wurde.
  heuteModus: (() => {
    const v = lv(SK.heuteModus, 'raster')
    if (v === 'voll')  return 'raster'
    if (v === 'fokus') return 'liste'
    return v
  })(),
```

- [ ] **Step 2: CockpitBar — Segmented statt Fokus-Knopf**

In `src/features/calendar/TabHeute/CockpitBar.jsx` die Props erweitern (Zeile 28):

```js
export default function CockpitBar({ viewDate, slots = {}, modus = 'raster', onModus, onShiftAll, onCreateBlocker }) {
```

Das `FokusIcon` (Zeilen 14–16) löschen und stattdessen ergänzen:

```js
const RasterIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16"/></svg>
)
const ListeIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"/></svg>
)
```

Die Funktionszeile (Zeilen 98–122) ersetzen:

```js
      <div className={s.fnRow}>
        {modus === 'raster' && (
          <>
            <button
              className={s.fnBtn}
              onClick={() => onShiftAll?.(-1)}
              aria-label="Alle Slots 30 Minuten früher"
              title="Alle Slots 30 Minuten früher"
            >{ChevronUp}<span>30m</span></button>
            <button
              className={s.fnBtn}
              onClick={() => onShiftAll?.(1)}
              aria-label="Alle Slots 30 Minuten später"
              title="Alle Slots 30 Minuten später"
            >{ChevronDown}<span>30m</span></button>
          </>
        )}
        {onCreateBlocker && (
          <button className={[s.fnBtn, s.fnBtnBlue, s.fnBtnGrow].join(' ')} onClick={onCreateBlocker}>
            {WindowIcon}<span>Fenster</span>
          </button>
        )}
        {/* Bewusst ohne Slot-Sperre: der leere Tag ist der Grund für die Liste. */}
        <div className={s.seg} role="group" aria-label="Ansicht">
          <button
            className={[s.segBtn, modus === 'raster' ? s.segBtnActive : ''].join(' ')}
            onClick={() => onModus?.('raster')}
            aria-pressed={modus === 'raster'}
          >{RasterIcon}<span>Raster</span></button>
          <button
            className={[s.segBtn, modus === 'liste' ? s.segBtnActive : ''].join(' ')}
            onClick={() => onModus?.('liste')}
            aria-pressed={modus === 'liste'}
          >{ListeIcon}<span>Liste</span></button>
        </div>
      </div>
```

Die Bilanz muss im Listenmodus die zeitlosen Tages-Todos mitzählen — sonst zeigt sie einen Tag, den man gerade nicht sieht. Dafür nimmt CockpitBar zusätzlich `dayTodos`:

```js
export default function CockpitBar({ viewDate, slots = {}, dayTodos = [], modus = 'raster', onModus, onShiftAll, onCreateBlocker }) {
```

und im `useMemo` (Zeilen 40–46) die beiden Zähler erweitern:

```js
    const total = entries.length + dayTodos.length
    const done = entries.filter(e => e.slot.done).length + dayTodos.filter(t => t.done).length
```

`dayTodos` in die `useMemo`-Deps aufnehmen: `}, [slots, dayTodos, isToday, nowMin])`

- [ ] **Step 3: CSS für das Segmented**

An `src/features/calendar/TabHeute/CockpitBar.module.css` anhängen:

```css
.seg {
  display: flex;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border-radius: var(--r-sm);
  background: var(--surface-low);
  border: 1px solid var(--border);
}

.segBtn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-dim);
  font-family: var(--font);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  -webkit-tap-highlight-color: transparent;
}

.segBtnActive {
  background: color-mix(in srgb, var(--primary) 20%, transparent);
  color: var(--text);
}
```

- [ ] **Step 4: TabHeute verdrahten**

In `src/features/calendar/TabHeute/TabHeute.jsx` den ganzen Block von Zeile 192 (`{heuteModus === 'fokus' ? (`) bis Zeile 266 (`)}`) ersetzen. `FokusView` bleibt vorerst importiert (Task 9 räumt auf), wird aber nicht mehr gerendert:

```jsx
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Nur die Tagesansicht swipt beim Tageswechsel — Pool + Dashboards sind
            datumsunabhängig und bleiben stehen (sonst wandert Unverändertes mit). */}
        <div ref={swipeRef}>
        <CockpitBar
          viewDate={viewDate}
          slots={todaySlots}
          dayTodos={dayTodos}
          modus={heuteModus}
          onModus={setHeuteModus}
          onShiftAll={handleShiftAll}
          onCreateBlocker={handleCreateBlocker}
        />
        {heuteModus === 'liste' ? (
          <Tagesliste
            viewDate={viewDate}
            slots={todaySlots}
            todos={todos}
            setTodos={setTodos}
            blockers={blockers}
            onToggleSlotDone={handleToggleSlotDone}
            onToggleTodoDone={handleToggleDone}
            onEditTodo={handleEdit}
            onPlaySlot={handlePlaySlot}
            onSaveSlot={handleSetSlot}
            onToPool={handleToPool}
            onEditBlocker={handleEditBlocker}
            onToggleBlockerLocked={handleToggleBlockerLocked}
            registerHalf={registerHalf}
            startDrag={startListDrag}
          />
        ) : (
          <Zeitplan
            slots={todaySlots}
            todos={todos}
            setTodos={setTodos}
            visibleStart={visStart}
            visibleEnd={visEnd}
            dateLabel={viewDate}
            onSetSlot={handleSetSlot}
            onToggleSlotDone={handleToggleSlotDone}
            onEditTodo={handleEdit}
            onTapExpand={handleBandExpand}
            onTapShrink={handleBandShrink}
            onToggleLock={handleToggleLock}
            onPlaySlot={handlePlaySlot}
            onToPool={handleToPool}
            onEmptyTap={setSlotSheet}
            registerHalf={registerHalf}
            startSlotDrag={startSlotDrag}
            blockers={blockers}
            onEditBlocker={handleEditBlocker}
            onToggleBlockerLocked={handleToggleBlockerLocked}
            birthdayPills={birthdays}
            birthdayPillsDate={viewDate}
          />
        )}
        </div>
        <Pool
          todos={todos}
          setTodos={setTodos}
          todaySlots={todaySlots}
          viewDate={viewDate}
          excludeDate={heuteModus === 'liste' ? viewDate : null}
          onToggleDone={handleToggleDone}
          onEdit={handleEdit}
          startDrag={heuteModus === 'liste' ? startListDrag : startPoolDrag}
          onDoneCalendar={handleDoneCalendar}
          onKlaeren={activeTools.includes('klaeren') ? (todo) => setKlaerenTodo(todo) : undefined}
          registerHalf={registerHalf}
          projects={projects}
          onOpenProjekte={() => setProjekteOpen(true)}
        />
        {(() => {
          const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, garten: GartenSection, fitness: FitnessSection, geburtstage: BirthdaySection, kognitiv: KognitivSection, growth: GrowthSection, rezepte: MealprepSection }
          const SECTION_PROPS = {
            haushalt:    { onStartDrag: startHaushaltDrag },
            reminder:    { onStartDrag: startReminderDrag },
            geburtstage: { onStartDrag: startBirthdayDrag },
          }
          const secs = activeTools
            .filter(id => SECTIONS[id])
            .map(id => { const Sec = SECTIONS[id]; return <Sec key={id} {...(SECTION_PROPS[id] ?? {})} /> })
          return secs.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{secs}</div>
            : null
        })()}
        </div>
```

Direkt über dem `return` (nach `handleSheetPlace`, Zeile 179) ergänzen:

```jsx
  // Zeitlose Todos dieses Tages — Grundlage für Liste, Bilanz und Pool-Filter.
  const dayTodos = useMemo(
    () => todos.filter(t => t.date === viewDate && !t.time && !t.done),
    [todos, viewDate]
  )

  // Zurück in den Pool — für Slot-Chips und für Tages-Todos derselbe Knopf.
  const handleToPool = useCallback((target) => {
    if (target.slotKey) { handleRemoveSlot(target.slotKey, 'back'); return }
    setTodos(prev => prev.map(t =>
      t.id === target.todoId ? { ...t, date: null, time: null, dayRank: null } : t
    ))
  }, [handleRemoveSlot, setTodos])
```

`useMemo` zum React-Import in Zeile 1 hinzufügen und `Tagesliste` importieren:

```js
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
...
import Tagesliste from '../Tagesliste/Tagesliste'
```

`startListDrag` aus dem `useTagesplanerDrag`-Destructuring holen (Zeile 63) — wird in Task 7 gebaut, bis dahin ist es `undefined` und das Ziehen in die Liste tut nichts:

```js
  const { startPoolDrag, startListDrag, startHaushaltDrag, startReminderDrag, startBirthdayDrag, startSlotDrag } =
```

- [ ] **Step 5: Pool nimmt `excludeDate` durch**

In `src/features/calendar/Pool/Pool.jsx` die Prop ergänzen (Zeile 92, nach `viewDate,`):

```js
  viewDate,
  excludeDate = null,
```

und in `activePool` (Zeile 127) durchreichen:

```js
    const undone  = sortTodos(getActiveTodos(todos, todaySlots, excludeDate), sort, projects)
```

Deps ergänzen: `}, [todos, todaySlots, excludeDate, pendingDoneIds, sort, projects])`

Dasselbe im `isPlaced`-Memo ist **nicht** nötig — das betrifft nur das Icon, nicht die Liste.

- [ ] **Step 6: Kein Regress in der Testsuite**

Run: `npm test`
Expected: PASS bis auf `fokusLogic.test.js` (läuft weiter, wird in Task 9 gelöscht). Kein neuer Fehler.

- [ ] **Step 7: Commit**

```bash
git add src/store/index.js src/features/calendar/TabHeute/CockpitBar.jsx src/features/calendar/TabHeute/CockpitBar.module.css src/features/calendar/TabHeute/TabHeute.jsx src/features/calendar/Pool/Pool.jsx
git commit -m "feat(tagesplaner): Umschalter Raster|Liste in der CockpitBar

heuteModus heißt jetzt 'raster'|'liste' (Lese-Migration von 'voll'|'fokus').
Der Umschalter ersetzt den Fokus-Knopf und ist bewusst NICHT mehr an
vorhandene Slots gebunden — der leere Tag ist der Grund für die Liste.
Die Liste tauscht nur den Zeitplan; DayNav, CockpitBar, Pool, Dashboards
und alle Modals bleiben stehen.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Die Tagesliste-Komponente

**Files:**
- Create: `src/features/calendar/Tagesliste/Tagesliste.jsx`
- Create: `src/features/calendar/Tagesliste/Tagesliste.module.css`

- [ ] **Step 1: Komponente schreiben**

Create `src/features/calendar/Tagesliste/Tagesliste.jsx`:

```jsx
import { useMemo } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { buildDayEntries } from '../tagesListeLogic'
import { minsToHHMM } from '../../../utils'
import { formatHour } from '../Blocker/blockerUtils'
import s from './Tagesliste.module.css'

const DragIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

// Termine sind Anker, kein Griff. Eine Reihenfolge kann keine Uhrzeit erzeugen —
// und ein Drag, der die Uhrzeit still löscht, wäre eine Falle. Aus dem Tag nehmen
// geht über den Pool-Knopf im Aufklapp-Panel.
const AnchorIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 13.5"/>
  </svg>
)

// Ein Slot in der Liste: derselbe TodoChip wie überall, feste Höhe. Dauer wird
// hier NICHT zur Höhe — die Liste hat kein Raster, in dem eine Höhe etwas
// bedeuten könnte; sie würde nur lügen. Die Dauer steht als Text.
function SlotRow({ slotKey, slot, todos, setTodos, onToggleDone, onEdit, onPlay, onSaveSlot, onToPool }) {
  const todo = todos.find(t => t.id === slot.todoId) || null
  const startMin = Math.round(parseFloat(slotKey) * 60)
  const dur      = slot.duration || 30
  const displayTodo = {
    ...(todo ?? {
      id: null, text: slot.text || '', color: slot.color || 'var(--primary)',
      priority: slot.priority ?? 3, subItems: slot.subItems || [],
      projectId: null, duration: dur,
    }),
    done: !!slot.done,
    date: null, time: null, toolId: null,
  }

  return (
    <TodoChip
      todo={displayTodo}
      todos={todos}
      saveTodos={setTodos}
      saveItem={!todo ? (upd) => onSaveSlot?.(slotKey, { ...slot, subItems: upd.subItems }) : undefined}
      floatExpand
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onPlay={displayTodo.paused ? undefined : onPlay}
      onToPool={onToPool}
      pausable={!!todo}
      timeSpan={`${minsToHHMM(startMin)}–${minsToHHMM(startMin + dur)} · ${dur}m`}
      dragHandle={
        <span className={s.anchor} aria-label="Fester Termin — Uhrzeit änderst du im Raster">
          {AnchorIcon}
        </span>
      }
    />
  )
}

// Ein zeitloses Tages-Todo: derselbe Chip, nur ohne Uhrzeit-Label.
function TodoRow({ todo, todos, setTodos, onToggleDone, onEdit, onToPool, onDragStart }) {
  return (
    <TodoChip
      todo={todo}
      todos={todos}
      saveTodos={setTodos}
      floatExpand
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onToPool={onToPool}
      pausable
      dragHandle={
        <span className={s.handle} data-drag-handle="true" onPointerDown={onDragStart} aria-label="Ziehen">
          {DragIcon}
        </span>
      }
    />
  )
}

export default function Tagesliste({
  viewDate, slots, todos, setTodos, blockers,
  onToggleSlotDone, onToggleTodoDone, onEditTodo, onPlaySlot, onSaveSlot, onToPool,
  onEditBlocker, onToggleBlockerLocked, registerHalf, startDrag,
}) {
  const { rows } = useMemo(
    () => buildDayEntries({ slots, todos, blockers, viewDate }),
    [slots, todos, blockers, viewDate]
  )

  const renderRow = (row) => {
    if (row.type === 'gap') {
      return (
        <div
          key={row.key}
          className={s.gap}
          ref={el => registerHalf?.(row.key, el, row.locked ? 'locked' : 'empty')}
        />
      )
    }
    if (row.type === 'slot') {
      return (
        <SlotRow
          key={row.key}
          slotKey={row.slotKey}
          slot={row.slot}
          todos={todos}
          setTodos={setTodos}
          onToggleDone={() => onToggleSlotDone?.(row.slotKey)}
          onEdit={() => {
            const lt = todos.find(t => t.id === row.slot.todoId)
            lt ? onEditTodo?.(lt.id) : onEditTodo?.(row.slotKey)
          }}
          onPlay={() => onPlaySlot?.(row.slotKey, row.slot)}
          onSaveSlot={onSaveSlot}
          onToPool={() => onToPool?.({ slotKey: row.slotKey })}
        />
      )
    }
    if (row.type === 'todo') {
      return (
        <TodoRow
          key={row.key}
          todo={row.todo}
          todos={todos}
          setTodos={setTodos}
          onToggleDone={() => onToggleTodoDone?.(row.todo.id)}
          onEdit={() => onEditTodo?.(row.todo.id)}
          onToPool={() => onToPool?.({ todoId: row.todo.id })}
          onDragStart={(e) => startDrag?.(row.todo.id, row.todo.text, row.todo.color ?? null, row.todo.duration, e)}
        />
      )
    }
    // Band
    const col = row.blocker.color
    const displayStart = row.blocker._overnight === 'end'   ? row.blocker._origStart : row.blocker.startHour
    const displayEnd   = row.blocker._overnight === 'start' ? row.blocker._origEnd   : row.blocker.endHour
    return (
      <div
        key={row.key}
        className={s.band}
        style={{ border: `1px solid ${col}55`, borderLeftColor: `${col}cc`, background: `${col}0d` }}
      >
        <div
          className={s.bandHead}
          style={{ background: `${col}2e`, borderBottom: `1px solid ${col}33` }}
          onClick={onEditBlocker ? () => onEditBlocker(row.blocker) : undefined}
        >
          <span className={s.bandDot} style={{ background: col }} />
          <span className={s.bandName}>{row.blocker.text || 'Zeitfenster'}</span>
          <span className={s.bandTime} style={{ color: col }}>
            {row.blocker._overnight === 'end' ? '↩ ' : ''}
            {formatHour(displayStart)}–{formatHour(displayEnd)}
            {row.blocker._overnight === 'start' ? ' +1' : ''}
          </span>
          <span
            className={[s.pill, row.blocker.locked ? s.pillLocked : s.pillOpen].join(' ')}
            onClick={e => { e.stopPropagation(); onToggleBlockerLocked?.(row.blocker) }}
          >{row.blocker.locked ? 'geblockt' : 'offen'}</span>
        </div>
        <div className={s.bandBody}>{row.rows.map(renderRow)}</div>
      </div>
    )
  }

  const hasContent = rows.some(r => r.type !== 'gap')

  return (
    <div className={s.liste}>
      {!hasContent && (
        <p className={s.empty}>
          Zieh ein Todo aus dem Pool hierher — es landet auf diesem Tag, ohne Uhrzeit.
        </p>
      )}
      {rows.map(renderRow)}
    </div>
  )
}
```

- [ ] **Step 2: CSS schreiben**

Create `src/features/calendar/Tagesliste/Tagesliste.module.css`:

```css
.liste {
  display: flex;
  flex-direction: column;
  padding: 4px 8px;
}

/* Drop-Lücke: ruhig und schmal, wächst beim Drag (dnd-half-over kommt aus useDragDrop) */
.gap {
  height: 8px;
  border-radius: 4px;
  transition: height var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}

.empty {
  color: var(--text-dim);
  font-size: 13px;
  padding: 18px 4px;
  line-height: 1.6;
}

.handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  align-self: stretch;
  color: var(--text-faint);
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

/* Termine: Anker-Glyphe an der Griff-Stelle — sichtbar unbeweglich */
.anchor {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  align-self: stretch;
  color: var(--text-faint);
}

.band {
  border-radius: var(--r);
  border-left-width: 3px;
  overflow: hidden;
  margin: 2px 0;
}

.bandHead {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.bandDot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 7px; }
.bandName { font-size: 0.78rem; font-weight: 700; color: var(--text); }
.bandTime { font-family: var(--font-num); font-size: 0.66rem; font-variant-numeric: tabular-nums; }

.pill {
  margin-left: auto;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pillOpen   { background: var(--surface-low); color: var(--text-dim); border: 1px solid var(--border); }
.pillLocked { background: color-mix(in srgb, var(--amber) 18%, transparent); color: var(--amber); border: 1px solid color-mix(in srgb, var(--amber) 35%, transparent); }

.bandBody {
  display: flex;
  flex-direction: column;
  padding: 4px 6px 6px;
}
```

- [ ] **Step 3: Im Browser prüfen**

Preview über `preview_start` mit `{name: "dev"}` starten — **nicht** über Bash. Falls `.claude/launch.json` fehlt, vorher anlegen:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

Dann Tagesplaner öffnen und in der CockpitBar auf „Liste" tippen.

Erwartet:
- Termine des Tages erscheinen als Chips mit Uhrzeit-Label, chronologisch.
- Ein Blocker erscheint als Band mit Kopfzeile und Pille.
- Pool und Dashboards stehen weiter darunter.
- Auf einem leeren Tag: der Umschalter funktioniert und der Leertext steht da.
- Konsole ohne Fehler (`read_console_messages`).

Ziehen tut noch nichts — das ist Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/features/calendar/Tagesliste/
git commit -m "feat(tagesliste): Komponente — Zeilen, Blocker-Bänder, Drop-Lücken

Rendert stumpf, was buildDayEntries liefert. Überall der echte TodoChip:
gleiche Optik wie Pool und Raster. Dauer wird bewusst nicht zur Höhe — die
Liste hat kein Raster, in dem eine Höhe etwas bedeuten könnte.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Ziehen — `startListDrag`

**Files:**
- Modify: `src/features/calendar/TabHeute/useTagesplanerDrag.js`
- Modify: `src/features/calendar/TabHeute/useSlotMutations.js:60-66`
- Modify: `src/features/calendar/TabHeute/useTimeEvents.js:194`
- Modify: `src/components/TodoModal/TodoModal.jsx:255-257`

- [ ] **Step 1: `startListDrag` bauen**

In `src/features/calendar/TabHeute/useTagesplanerDrag.js` den Import erweitern und die Funktion nach `startPoolDrag` (Zeile 63) einfügen:

```js
import { insertRank } from '../tagesListeLogic'
```

```js
  // Ziehen im Listenmodus — nur Todos, nie Termine (die sind Anker). Anders als
  // startPoolDrag gibt es hier kein Raster: Drop-Ziele sind die Lücken zwischen
  // den Zeilen (Key `gap|<prev>|<next>`), und nichts kann kollidieren — deshalb
  // kein canDrop. Der Drop schreibt nur Datum und Rang, nie eine Uhrzeit.
  const startListDrag = useCallback((todoId, text, color, duration, e) => {
    if (!todoId) return
    startDrag(text, color ?? null, (dropKey) => {
      if (dropKey === 'pool') {
        setTodos(prev => prev.map(t =>
          t.id === todoId ? { ...t, date: null, time: null, dayRank: null } : t
        ))
        return
      }
      if (!dropKey.startsWith('gap|')) return

      // Key-Form: gap|<scope>|<prev>|<next> — der scope hält die Keys eindeutig
      // (zwei Fenster mit gleichen Stunden), für den Rang zählen nur die Ränder.
      const [, , p, n] = dropKey.split('|')
      const rank = insertRank(p === '' ? null : Number(p), n === '' ? null : Number(n))

      setTodos(prev => prev.map(t =>
        t.id === todoId ? { ...t, date: viewDate, time: null, dayRank: rank } : t
      ))
    }, e, null, duration || 30)
  }, [startDrag, setTodos, viewDate])
```

und in den Rückgabewert aufnehmen (Zeile 193):

```js
  return { startPoolDrag, startListDrag, startHaushaltDrag, startReminderDrag, startBirthdayDrag, startSlotDrag }
```

- [ ] **Step 2: `handleRemoveSlot` nullt `dayRank` mit**

In `src/features/calendar/TabHeute/useSlotMutations.js` die Funktion (Zeilen 49–67) ersetzen:

```js
  // mode: 'delete' → Todo mit weg · 'back' → zurück in den Pool (Tag + Zeit weg)
  const handleRemoveSlot = useCallback((slotKey, mode) => {
    const slot = todaySlots[slotKey]
    setTodaySlots(prev => {
      const next = { ...prev }
      delete next[slotKey]
      return next
    })
    if (mode === 'delete') {
      if (slot?.todoId) {
        setTodos(prev => prev.filter(t => t.id !== slot.todoId))
      }
    } else if (mode === 'back') {
      if (slot?.todoId) {
        setTodos(prev => prev.map(t =>
          t.id === slot.todoId ? { ...t, date: null, time: null, dayRank: null } : t
        ))
      }
    }
  }, [setTodaySlots, todaySlots, setTodos])
```

- [ ] **Step 3: `dayRank` an den übrigen Schreibern nullen**

`src/features/calendar/TabHeute/useTimeEvents.js`, Zeile 194:

```js
        clearIds.has(t.id) ? { ...t, date: null, time: null, dayRank: null } : t
```

`src/components/TodoModal/TodoModal.jsx`, Zeilen 255–257 — wird ein Todo zum Termin, ist sein Listen-Rang gegenstandslos:

```js
        date:      eff.date || null,
        time:      eff.time || null,
        dayRank:   eff.time ? null : existingTodo.dayRank ?? null,
```

`src/features/calendar/TabHeute/useTagesplanerDrag.js` — in `startPoolDrag` beide `setTodos`-Stellen (Zeilen 44 und 58), die eine Uhrzeit setzen:

```js
            t.id === todoId ? { ...t, date: viewDate, time: `${hh}:${mm}`, dayRank: null } : t
```

`src/features/calendar/TabHeute/TabHeute.jsx` in `handleSheetPlace` (Zeile 176):

```js
      t.id === todo.id ? { ...t, date: viewDate, time: `${hh}:${mm}`, dayRank: null } : t
```

- [ ] **Step 4: Guard laufen lassen**

Run: `npx vitest run src/dayRankGuard.test.js`
Expected: PASS — alle Schreiber stehen in der Allowlist.

- [ ] **Step 5: Im Browser prüfen**

Erwartet:
- Pool-Todo am Griff in eine Lücke zwischen zwei Termine ziehen → es sitzt dort, **ohne Uhrzeit** am Chip, und ist aus dem Pool verschwunden.
- Dasselbe Todo innerhalb der Liste an eine andere Stelle ziehen → es bleibt dort, auch nach Reload.
- Todo aus der Liste in den Pool ziehen → zurück im Pool, ohne Datum.
- In ein Band „geblockt" ziehen → roter Glow, kein Drop.
- In ein leeres Band „Abend 18–22" ziehen → landet im Band und bleibt nach Reload dort.
- Auf „Raster" umschalten: dasselbe Todo steht **oben im Pool** mit Datums-Label, **kein Slot** entstanden.

- [ ] **Step 6: Commit**

```bash
git add src/features/calendar/TabHeute/useTagesplanerDrag.js src/features/calendar/TabHeute/useSlotMutations.js src/features/calendar/TabHeute/useTimeEvents.js src/features/calendar/TabHeute/TabHeute.jsx src/components/TodoModal/TodoModal.jsx
git commit -m "feat(tagesliste): Ziehen zwischen Termine ohne Uhrzeit

startListDrag schreibt nur Datum + dayRank, nie eine Uhrzeit. Drop-Ziele
sind die Lücken zwischen den Zeilen; gesperrte Bänder blocken über den
vorhandenen zoneType. Alle Schreiber, die eine Uhrzeit setzen, nullen den
Rang mit — Sauberkeit, kein Verlass: buildDayEntries ignoriert ohnehin
alles mit time.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: „Zurück in Pool"-Knopf am Chip

**Files:**
- Modify: `src/components/TodoChip/TodoChip.jsx:63-84,464-492`
- Modify: `src/components/TodoChip/TodoChip.module.css:550-605`
- Modify: `src/features/calendar/Zeitplan/SlotBlock.jsx`
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`
- Modify: `src/features/calendar/Blocker/BlockerCard.jsx`

- [ ] **Step 1: `TodoChip` — Prop, Icon, neue Zeilenordnung**

In `src/components/TodoChip/TodoChip.jsx` bei den Icons ergänzen:

```jsx
const ToPoolGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4"/>
    <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
  </svg>
)
```

Die Props-Liste erweitern (nach `pausable,`):

```js
  pausable,           // true = Pause-Steuerung anzeigen
  onToPool,           // fn() — Eintrag zurück in den Pool (Zeitplan + Tagesliste; im Pool selbst sinnlos)
```

Die Add-Zeile (Zeilen 464–492) ersetzen — `+` wandert nach links, rechts stehen Pause und Pool:

```jsx
          {/* Add row — links + (Subtodo), rechts Pause und Zurück-in-Pool */}
          <div className={s.itemAddRow}>
            <button
              className={s.itemAddBtn}
              onClick={e => { e.stopPropagation(); addItem() }}
              aria-label="Unterpunkt hinzufügen"
            >+</button>
            <input
              ref={itemRef}
              className={s.itemInput}
              placeholder="Punkt hinzufügen…"
              value={itemInput}
              onChange={e => setItemInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  addItem()
                if (e.key === 'Escape') setExpanded(false)
              }}
              onClick={e => e.stopPropagation()}
            />
            {showPause && (
              <button
                className={s.rowAct}
                onClick={e => { e.stopPropagation(); pauseTodo() }}
                aria-label="Pausieren"
                title="Pausieren — Text im Feld wird zum Grund"
              >
                <PauseGlyph />
              </button>
            )}
            {onToPool && (
              <button
                className={s.rowAct}
                onClick={e => { e.stopPropagation(); closeExpand(); onToPool() }}
                aria-label="Zurück in den Pool"
                title="Zurück in den Pool"
              >
                <ToPoolGlyph />
              </button>
            )}
          </div>
```

- [ ] **Step 2: CSS — `.pauseBtn` wird `.rowAct`, `+` bekommt links Luft**

In `src/components/TodoChip/TodoChip.module.css` `.itemAddRow` (Zeile 550) und den `.pauseBtn`-Block (Zeilen 590–605) ersetzen:

```css
.itemAddRow {
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--surface-low);
}

/* Aktionen rechts in der Add-Row (Pause, Zurück in Pool) */
.rowAct {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  transition: opacity 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.rowAct:hover {
  opacity: 0.7;
}
```

`.itemAddBtn` (Zeile 573) bekommt Innenabstand nach rechts statt links:

```css
.itemAddBtn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  padding: 6px 10px 6px 4px;
  transition: color 0.12s;
  line-height: 1;
}
```

- [ ] **Step 3: `onToPool` bis zum Slot durchreichen**

`src/features/calendar/Zeitplan/SlotBlock.jsx` — Prop in die Signatur (Zeile 29) und an `TodoChip` (Zeile 104ff):

```js
export default function SlotBlock({ slotKey, slot, todo, todos, setTodos, onToggleDone, onEdit, onDragStart, onToggleLock, onSaveSlot, onPlay, onToPool, nowMin = null }) {
```

```jsx
      onPlay={displayTodo.paused ? undefined : onPlay}
      onToPool={onToPool}
      pausable={!!todo}
```

`src/features/calendar/Zeitplan/Zeitplan.jsx` — `onToPool` in die Komponenten-Props aufnehmen. In der Datei gibt es **zwei** `SlotBlock`-Verwendungen (obere und untere Halbstunde); beide bekommen ihre eigene Zeile, die den jeweiligen Slot-Key einschließt:

Bei der oberen Halbstunde (`topKey`):
```jsx
  onToPool={() => onToPool?.({ slotKey: topKey })}
```

Bei der unteren Halbstunde (`botKey`):
```jsx
  onToPool={() => onToPool?.({ slotKey: botKey })}
```

Und an `BlockerCard` unverändert weitergeben (die Karte baut die Keys selbst):
```jsx
  onToPool={onToPool}
```

`src/features/calendar/Blocker/BlockerCard.jsx` — `onToPool` in die Props-Liste (Zeile 5ff) aufnehmen und an beide `SlotBlock`-Verwendungen durchreichen.

Bei der oberen Halbstunde (Zeile 88ff):
```jsx
  onToPool={() => onToPool?.({ slotKey: topKey })}
```

Bei der unteren Halbstunde (Zeile 123ff):
```jsx
  onToPool={() => onToPool?.({ slotKey: botKey })}
```

- [ ] **Step 4: Im Browser prüfen**

Erwartet:
- Chip im Pool aufklappen: `[+] [Feld] [Pause]` — **kein** Pool-Knopf (wäre sinnlos).
- Chip im Raster aufklappen: `[+] [Feld] [Pause] [Pool]`. Pool-Knopf → Slot verschwindet, Todo steht im Pool.
- Chip in der Liste aufklappen: dasselbe. Pool-Knopf → Todo verlässt den Tag.
- Text-Slot ohne Todo (kein `todoId`): kein Pause-Knopf (unverändert), Pool-Knopf löst den Slot auf.

- [ ] **Step 5: Testsuite**

Run: `npm test`
Expected: PASS (außer `fokusLogic.test.js`, Task 9)

- [ ] **Step 6: Commit**

```bash
git add src/components/TodoChip/ src/features/calendar/Zeitplan/SlotBlock.jsx src/features/calendar/Zeitplan/Zeitplan.jsx src/features/calendar/Blocker/BlockerCard.jsx
git commit -m "feat(chip): Zurück-in-Pool im Aufklapp-Panel

Die Funktion gab es längst (handleRemoveSlot 'back'), sie hing aber nur am
Ziehen-in-den-Pool. Zeile jetzt [+] [Feld] [Pause] [Pool]: + links, die
Aktionen rechts.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Fokusmodus abräumen

`getFixedEntries()` und `isDayComplete()` haben nach Task 5 keinen Aufrufer mehr — verwaist durch diesen Umbau, also hier mit weg. `todoOrder` wird **nicht** angefasst (eigener Change, siehe Spec).

**Files:**
- Delete: `src/features/calendar/TabHeute/FokusView.jsx`
- Delete: `src/features/calendar/TabHeute/FokusView.module.css`
- Delete: `src/features/calendar/fokusLogic.js`
- Delete: `src/features/calendar/fokusLogic.test.js`
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx:33`

- [ ] **Step 1: Prüfen, dass wirklich niemand mehr dranhängt**

Run: `npx vitest run --reporter=verbose 2>&1 | head -5` und zusätzlich per Grep-Tool nach `FokusView`, `fokusLogic`, `getFixedEntries`, `isDayComplete` über `src/` suchen.
Expected: Treffer nur noch in den zu löschenden Dateien und im Import in `TabHeute.jsx:33`.

- [ ] **Step 2: Import entfernen**

In `src/features/calendar/TabHeute/TabHeute.jsx` Zeile 33 löschen:

```js
import FokusView from './FokusView'
```

- [ ] **Step 3: Dateien löschen**

```bash
git rm src/features/calendar/TabHeute/FokusView.jsx src/features/calendar/TabHeute/FokusView.module.css src/features/calendar/fokusLogic.js src/features/calendar/fokusLogic.test.js
```

- [ ] **Step 4: Testsuite + Lint + Build**

Run: `npm test && npm run lint && npm run build`
Expected: alles grün, keine verwaisten Imports.

- [ ] **Step 5: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "refactor(tagesplaner): Fokusmodus abräumen

FokusView und fokusLogic (getFixedEntries/isDayComplete) verwaisen durch
den Listenmodus — Top-3-Freeze und der Tag-geschafft-Screen sind ersatzlos
weg. Kehrt 2026-05-31-fokus-kernschleife-design.md bewusst um; Begründung
in 2026-07-17-tagesplaner-listenmodus-design.md.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Hilfe-Karte + Kontext-Dateien

**Files:**
- Modify: `src/features/settings/Hilfe/Hilfe.jsx:8-33`
- Modify: `kontext/kern.md`
- Modify: `kontext/architektur.md`

- [ ] **Step 1: Hilfe-Karte ergänzen**

In `src/features/settings/Hilfe/Hilfe.jsx` in das `CARDS`-Array direkt **nach** der Karte „Der Kern" (Zeile 12) einfügen:

```js
  {
    title: 'Raster oder Liste',
    body: 'Der Tagesplaner kann deinen Tag auf zwei Arten zeigen — der Umschalter sitzt unten in der Statuskarte. Im Raster hängt jede Aufgabe an einer Uhrzeit. In der Liste behalten nur deine Termine ihre Uhrzeit; alles andere ziehst du einfach dazwischen, ohne dich auf eine Zeit festzulegen. Es ist derselbe Tag — nur anders angesehen. Aufgaben, die du in der Liste ohne Uhrzeit einplanst, findest du im Raster oben im Pool wieder.',
  },
```

- [ ] **Step 2: `kontext/kern.md` nachziehen**

Im Block-Datentyp (nach `time:`) ergänzen:

```js
  dayRank:   null,      // Sortier-Rang auf der Tagesachse (Listenmodus) — KEIN Zeitpunkt, nie angezeigt, nie ein Slot. Gilt nur bei date && !time. Guard: dayRankGuard.test.js
```

Bei den Hilfsfunktionen nach `isTodo(b)` ergänzen:

> **Tagesliste (Listenmodus):** Ein Todo mit `date` + ohne `time` ist weiterhin `isFaelligkeit` — es entsteht **kein** neuer Typ. `dayRank` ist nur die Reihenfolge obendrauf: `null` = ans Tagesende. Sortierlogik rein in `src/features/calendar/tagesListeLogic.js` (`rankOf`, `insertRank`, `buildDayEntries`; Guard `tagesListeLogic.test.js`).

Bei den Storage Keys den `SK.heuteModus`-Kommentar ersetzen:

```
SK.heuteModus     → 'adhs_view_heute_modus'      // 'raster'|'liste' — Default 'raster'; Alt-Werte 'voll'|'fokus' werden beim Store-Init gelesen und migriert
```

Im Store-Abschnitt:

```js
heuteModus,   setHeuteModus    // 'raster' | 'liste' — persistiert (SK.heuteModus), Default 'raster'
```

Im Abschnitt „TabHeute — Features" den CockpitBar-Punkt anpassen (Fokus-Knopf → Segmented, keine `total > 0`-Sperre mehr) und einen Punkt ergänzen:

> - **Listenmodus (`heuteModus === 'liste'`, 2026-07-17):** tauscht **nur** den Zeitplan gegen `Tagesliste/Tagesliste.jsx` — DayNav, CockpitBar, Pool, Dashboards und alle Modals bleiben. Einträge = Slots + Todos mit `date === viewDate && !time`, sortiert über `rankOf` (Slot → `parseFloat(slotKey)`, Blocker → `startHour`, Todo → `dayRank ?? 24`; Gleichstand: Anker vor Todo, dann `createdAt`). Blocker rendern als Bänder, Zuordnung über dieselbe Erst-Treffer-Regel wie das Raster. Drop-Ziele sind die Lücken zwischen den Zeilen (`registerHalf('gap|<prev>|<next>', …)`); Lücken **innerhalb** eines Bandes tragen dessen Kanten als Nachbarn, sonst landet ein Drop außerhalb des Bandes. Ziehen läuft über `startListDrag` (schreibt **nie** eine Uhrzeit). Der Pool bekommt `excludeDate={viewDate}`, damit Tages-Todos nicht doppelt stehen. **Im Raster bleibt alles wie gehabt** — zeitlose Tages-Todos erscheinen dort oben im Pool mit Datums-Label (`sortTodos` zieht fällig-heute nach vorn); **bewusst keine Ganztagsleiste**. Chips überall 44px, kein Dauer=Höhe (die Liste hat kein Raster, das eine Höhe deuten könnte). Spec: `docs/superpowers/specs/2026-07-17-tagesplaner-listenmodus-design.md`.

- [ ] **Step 3: `kontext/architektur.md` nachziehen**

In der Ordnerstruktur unter `calendar/` ergänzen und `TabHeute`-Zeile anpassen:

```
      Tagesliste/
        Tagesliste.jsx + .module.css — Listenmodus: Slots + zeitlose Tages-Todos + Blocker-Bänder, Drop-Lücken statt Raster
      tagesListeLogic.js      — rein+getestet: rankOf / insertRank / buildDayEntries
```

Bei `TabHeute/TabHeute.jsx`: „(DayNav + CockpitBar + Zeitplan **oder Tagesliste** + Pool + Sections)".
Bei `CockpitBar.jsx`: Funktionszeile „↑30m/↓30m (nur Raster) / +Fenster / Segmented Raster|Liste".
`TodoChip`-Zeile: Add-Row-Ordnung `[+] [Feld] [Pause] [Pool]`, Prop `onToPool`.

- [ ] **Step 4: Guard für die Hilfe**

Run: `npm test`
Expected: PASS — `toolRegistry.test.js` bleibt grün (Kern-Karten sind handgeschrieben, keine Registry-Pflicht).

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/Hilfe/Hilfe.jsx kontext/kern.md kontext/architektur.md
git commit -m "docs: Hilfe-Karte für den Listenmodus + Kontext nachgezogen

Listenmodus ist Kern-Mechanik, also gehört eine Karte ins Hilfe-Sheet
(CLAUDE.md-Regel). kern.md/architektur.md beschreiben jetzt dayRank,
tagesListeLogic und die neuen heuteModus-Werte.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Abschluss

- [ ] **Volle Verifikation**

Run: `npm test && npm run lint && npm run build`
Expected: alles grün.

- [ ] **Erfolg gegen die Spec prüfen** (im Browser, Liste für Liste)

- [ ] Auf einem **leeren** Tag ist der Listenmodus erreichbar.
- [ ] Pool-Todo zwischen zwei Termine ziehen → sitzt dort, **ohne Uhrzeit**, aus dem Pool weg.
- [ ] Wechsel auf Raster → dasselbe Todo **oben im Pool** mit Datums-Label, **kein Slot** entstanden, Kalender-Woche zeigt es im Ganztags-Streifen.
- [ ] Chip sieht in Liste, Pool und Raster identisch aus (44 px).
- [ ] Blocker „Arbeit 09–17": Todo hineinziehen landet im Band; auf „geblockt" stellen → Drop wird rot geblockt.
- [ ] Aufklapp-Panel zeigt `[+] [Feld] [Pause] [Pool]`; Pool-Knopf am Slot löst den Slot und legt das Todo zurück.
- [ ] Reload → Modus und Reihenfolge stehen noch.

- [ ] **Push** (nach grünen Tests/Lint/Build)

```bash
git push
```

Deploy (`npx vercel --prod`) **nicht** automatisch — die App läuft auf Jonas' Handy, das entscheidet er.
