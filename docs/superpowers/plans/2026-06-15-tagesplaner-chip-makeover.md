# Tagesplaner & TodoChip Makeover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tagesplaner und TodoChip optisch & interaktiv überarbeiten (kein Drag-Stauchen, „frei"-Bänder statt Pillen, neuer Chip, dezente Tiefe) und dabei einen app-weiten Motion-/Elevation-Standard etablieren.

**Architecture:** Fundament zuerst (CSS-Tokens in `vars.css`), dann das Atom (`TodoChip`), dann die Fläche (`Zeitplan`/`TabHeute`), dann die app-weite Tab/Tool-Öffnen-Transition, zuletzt der Prokrastinations-Wording-Sweep. Reines UI/Interaktions-Makeover — **keine Datenmigration**, Slot-/Todo-Datenmodell und Storage-Keys unverändert.

**Tech Stack:** React 19, Vite, Zustand, CSS Modules, Vitest (Guard-Tests). Verifikation visuell über die Live-Preview.

**Spec:** `docs/superpowers/specs/2026-06-15-tagesplaner-chip-makeover-design.md`

---

## Verifikation — generell

- **Logik/Regeln:** Vitest (`npx vitest run <datei>`).
- **Optik/Interaktion:** Live-Preview starten, Tagesplaner öffnen, Screenshot. Prüfen: kein Layout-Sprung beim Draggen, Bänder droppbar, Chip-Zustände, Aufklappen, sanftes Tab-Öffnen.
- **Nach jeder Phase:** `npx vitest run` (alle Guards grün) + `npm run lint` falls vorhanden.
- **Reduced Motion:** ist global in `vars.css` abgefangen — neue Transitions/Keyframes erben das.

---

## File Structure

| Datei | Verantwortung | Phase |
|---|---|---|
| `src/styles/vars.css` | Motion-/Elevation-Tokens + `toolEnter`-Keyframe | 0 |
| `src/styles/motion.test.js` (neu) | Guard: Tokens existieren, kein `dnd-active`-Squish mehr | 0, 2 |
| `src/components/PrioBadge/PrioBadge.module.css` | Punkt-Ampel-Stil | 1 |
| `src/components/TodoChip/TodoChip.jsx` + `.module.css` | Chip-Redesign | 1 |
| `src/features/calendar/Zeitplan/SlotBlock.jsx` | An neuen Chip andocken | 1 |
| `src/features/calendar/Zeitplan/Zeitplan.jsx` + `.module.css` | Schlankes Raster, Zeitspalte, Bänder, All-day, kein Squish | 2 |
| `src/features/calendar/Zeitplan/bandLogic.js` (neu) + `.test.js` | Out-of-Window-Berechnung (rein, getestet) | 2 |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Band-Expand/Drop-Handler, Vis-Window | 2 |
| `src/hooks/useDragDrop.js` | `dnd-active`-Squish raus, Drag-Lift | 2 |
| `src/App.jsx` + `src/App.module.css` | Tab/Tool-Öffnen-Transition | 3 |
| `src/features/tools/klaeren/*` | sichtbare Strings → „Prokrastination" | 4 |
| `kontext/architektur.md`, `kontext/kern.md` | Doku nachziehen | 4 |

---

## Phase 0 — Motion- & Elevation-Tokens

### Task 0.1: Tokens + Keyframe in vars.css

**Files:**
- Modify: `src/styles/vars.css` (`:root`-Block, nach den Glows ~Zeile 49; Keyframes-Block ~Zeile 89)
- Test: `src/styles/motion.test.js` (neu)

- [ ] **Step 1: Guard-Test schreiben**

```js
// src/styles/motion.test.js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const vars = readFileSync(join(here, 'vars.css'), 'utf8')

describe('Motion-Tokens', () => {
  for (const t of ['--dur-fast', '--dur', '--dur-slow', '--ease-out', '--ease-in', '--ease', '--edge-hi', '--elev-1', '--elev-drag']) {
    it(`definiert ${t}`, () => {
      expect(vars).toMatch(new RegExp(`${t}\\s*:`))
    })
  }
  it('hat den toolEnter-Keyframe', () => {
    expect(vars).toMatch(/@keyframes\s+toolEnter/)
  })
})
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/styles/motion.test.js`
Expected: FAIL (Tokens fehlen noch)

- [ ] **Step 3: Tokens ergänzen** (im `:root`, direkt nach dem Glow-Block)

```css
  /* ─── Motion ─────────────────────────────────────────── */
  --dur-fast: 160ms;   /* Mikro: Tap-Feedback, Hover, Toggle */
  --dur:      240ms;   /* Standard: Aufklappen, Ein-/Ausblenden */
  --dur-slow: 320ms;   /* Groß: Tool-/Tab-Öffnen, Sheets */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* Erscheinen */
  --ease-in:  cubic-bezier(0.55, 0, 1, 0.45);    /* Verschwinden */
  --ease:     cubic-bezier(0.40, 0, 0.20, 1);    /* beidseitig / Bewegung */

  /* ─── Elevation (dezente Tiefe) ──────────────────────── */
  --edge-hi:   inset 0 1px 0 rgba(255,255,255,0.08);
  --elev-1:    var(--shadow-sm), var(--edge-hi);
  --elev-drag: 0 12px 30px rgba(139,92,246,0.30), var(--edge-hi);
```

- [ ] **Step 4: Keyframe ergänzen** (im Animations-Block, neben `fadeInUp`)

```css
@keyframes toolEnter {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to   { opacity: 1; transform: none; }
}
```

- [ ] **Step 5: Test grün**

Run: `npx vitest run src/styles/motion.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/styles/vars.css src/styles/motion.test.js
git commit -m "feat(motion): Motion-/Elevation-Tokens + toolEnter-Keyframe als app-weiter Standard"
```

---

## Phase 1 — TodoChip Redesign

### Task 1.1: PrioBadge auf Punkt-Ampel

**Files:**
- Modify: `src/components/PrioBadge/PrioBadge.module.css`

Die JSX (`PrioBadge.jsx`) bleibt — 3 `span.block`. Nur CSS: aus den Balken werden 3 Punkte, vertikal kompakt gestapelt (Ampel-Anmutung).

- [ ] **Step 1:** `.badge` auf `display:flex; flex-direction:column; gap:2px; align-items:center;` setzen.
- [ ] **Step 2:** `.block` auf `width:5px; height:5px; border-radius:50%;` (statt Balken). `.pulse` (Prio 1) behalten.
- [ ] **Step 3:** Visuell prüfen (Preview, ein Chip je Prio 1/2/3) + Commit.

```bash
git add src/components/PrioBadge/PrioBadge.module.css
git commit -m "polish(prio): Prio-Ampel als kompakte Punkte"
```

### Task 1.2: TodoChip — Layout, Tiefe, ✕ raus

**Files:**
- Modify: `src/components/TodoChip/TodoChip.jsx`, `src/components/TodoChip/TodoChip.module.css`

Neuer Aufbau des Chips (Reihenfolge l→r): `stripe` · `body` (Titelzeile mit Zeit/Dauer rechts + Fortschrittsbalken-Zeile darunter) · `actions` (kontextuelle Tool-Icons) · `prioBadgeWrap` · `dragHandle`.

- [ ] **Step 1: ✕ entfernen.** In `TodoChip.jsx` den kompletten `{onRemove && (<button className={s.removeBtn}…>✕</button>)}`-Block löschen. `onRemove`-Prop bleibt vorerst in der Signatur (Pool nutzt es noch für den Lösch-Dialog via Doppeltipp→Modal-Pfad), aber wird im Chip nicht mehr gerendert. *Sauber aufräumen:* wenn nach Phase 1 kein Aufrufer `onRemove` am Chip mehr braucht, Prop + `.removeBtn`-CSS entfernen.

- [ ] **Step 2: Expand-Kreis ersetzen.** Den `expandBtnWrap`/`expandBtn`-Block (Zähler-Kreis links) entfernen. Das Aufklappen läuft künftig über den Fortschrittsbalken (Step 4).

- [ ] **Step 3: Titelzeile mit Zeit/Dauer rechts.** Im `.body` die Meta-Logik so umbauen, dass Zeit/Dauer **rechts auf der Titelzeile** steht:

```jsx
<div className={s.body} onClick={tapHandler}>
  <div className={s.titleRow}>
    <span className={s.text}>
      {todo.text || <span className={s.emptyText}>Kein Text</span>}
      {todo.duration && todo.duration <= 2 && <span className={s.quickBadge}>⚡</span>}
    </span>
    {timeLabel && <span className={s.timeLabel}>{timeLabel}</span>}
  </div>
  {/* Fortschrittsbalken-Zeile — nur wenn Subtodos */}
  {!disableExpand && allItems.length > 0 && (
    <button
      className={s.progressRow}
      onClick={(e) => { e.stopPropagation(); toggleExpanded() }}
      aria-label="Unterpunkte anzeigen"
      aria-expanded={expanded}
    >
      <span className={s.progressTrack}>
        <span className={s.progressFill} style={{ width: `${Math.round((doneItems / allItems.length) * 100)}%` }} />
      </span>
      <span className={[s.progressChevron, expanded ? s.progressChevronOpen : ''].join(' ')}>⌄</span>
    </button>
  )}
  {/* Restliche Meta (Kategorie/Fälligkeit/Alter) bleibt darunter, eine Zeile */}
  {(metaParts.length > 0 || ageLabel) && (
    <span className={s.meta}>
      <span className={s.metaLeft}>{metaParts.join(' · ')}</span>
      {ageLabel && <span className={[s.ageTag, isOld ? s.ageTagOld : ''].join(' ')}>{ageLabel}</span>}
    </span>
  )}
</div>
```

`timeLabel` ableiten (oben im Body der Funktion, ersetzt die bisherige Termin-Zeit-Logik in `metaParts`):
```js
const timeLabel = [
  isTermin(todo)      ? todo.time : null,
  todo.duration       ? `${todo.duration}m` : null,
].filter(Boolean).join(' · ')
// isTermin-Datum + Fälligkeit-Datum bleiben in metaParts (ohne die Uhrzeit)
const metaParts = [
  todo.category,
  isTermin(todo)      ? fmtDateShort(todo.date) : null,
  isFaelligkeit(todo) ? fmtDateShort(todo.date) : null,
].filter(Boolean)
```

- [ ] **Step 4: Expand-State entkoppeln.** Den bestehenden `expanded`-State behalten. Neue Helper:
```js
const toggleExpanded = useCallback(() => {
  setExpanded(p => {
    const n = !p
    const extraPx = n ? (28 + allItems.length * 34 + 46) : 0
    onExpandedChange?.(n, extraPx)
    return n
  })
}, [allItems.length, onExpandedChange])
```
Die Sub-Items-Liste (`itemsWrap`) bleibt unverändert (inkl. `floatExpand`-Overlay-Variante für SlotBlock).

- [ ] **Step 5: CSS.** In `TodoChip.module.css`:
  - `.chip`: `box-shadow: var(--elev-1);` ergänzen, `transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);`
  - `.titleRow`: `display:flex; align-items:center; gap:8px;` — `.text{flex:1;…}`, `.timeLabel{font-size:0.7rem; color:var(--text-dim); white-space:nowrap; flex-shrink:0;}`
  - `.progressRow`: `display:flex; align-items:center; gap:6px; background:none; border:none; padding:2px 0 0; cursor:pointer; width:100%;` (Touch-Zone via `padding`/min-height ~16px, sitzt im Body)
  - `.progressTrack`: `flex:1; height:3px; border-radius:2px; background:var(--surface); overflow:hidden;`
  - `.progressFill`: `height:100%; border-radius:2px; background:var(--chip-color,var(--primary)); transition:width var(--dur) var(--ease);`
  - `.progressChevron`: `font-size:0.7rem; color:var(--text-faint); transition:transform var(--dur) var(--ease);` · `.progressChevronOpen{transform:rotate(180deg);}`
  - `.removeBtn`-Regeln entfernen (Step 1).
  - `.expandBtnWrap`/`.expandBtn*`-Regeln entfernen (Step 2).

- [ ] **Step 6: Verifizieren** (Preview): Chip mit/ohne Subtodos, mit Zeit, Done-State; Aufklappen über den Balken testen; ✕ ist weg. Screenshot.

- [ ] **Step 7: Commit**
```bash
git add src/components/TodoChip/
git commit -m "feat(chip): B-Look — Zeit rechts, Subtodos als Fortschrittsbalken, dezente Tiefe, ✕ entfernt"
```

### Task 1.3: Kontextuelle Tool-Aktionen + Prokrastination

**Files:**
- Modify: `src/components/TodoChip/TodoChip.jsx`, `.module.css`

- [ ] **Step 1: Play als kompaktes Icon.** Den bestehenden `playBtn` beibehalten, aber neu stylen (Icon-Button ohne Trennlinie, `--dur-fast`-Transition, Teal-Hover). Bedingung unverändert: `onPlay && !todo.done`.

- [ ] **Step 2: Prokrastination immer bei aktivem Tool.** Den großen `klaerenCircle`-Block ersetzen durch ein **kleines Icon** in der Aktions-Reihe, sichtbar wenn `onKlaeren && !todo.done` (nicht mehr an `ageDays >= threshold` gebunden):
```jsx
{onKlaeren && !todo.done && (
  <button
    className={[s.toolAct, isOld ? s.toolActHot : ''].join(' ')}
    style={isOld ? { '--hot': ageColor } : undefined}
    onClick={e => { e.stopPropagation(); onKlaeren(todo) }}
    aria-label="Prokrastination"
  >
    {/* Schnecken-/Sanduhr-SVG (inline, 14px) — siehe TabKlaeren KlaerenIcon als Vorlage */}
  </button>
)}
```
`isOld` (= `ageDays >= threshold`) steuert nur noch das **Highlight** (`--hot`/ageColor), nicht die Sichtbarkeit.

- [ ] **Step 3: Aktions-Reihe gruppieren.** Play + Prokrastination in einen `.actions`-Wrapper (`display:flex; align-items:center;`) zwischen `body` und `prioBadgeWrap`. Keine vertikalen Trennlinien mehr.

- [ ] **Step 4: CSS.** `.toolAct{background:none;border:none;display:flex;align-items:center;justify-content:center;min-width:30px;align-self:stretch;color:var(--text-faint);cursor:pointer;transition:color var(--dur-fast) var(--ease);}` · `.toolAct:hover{color:var(--primary);}` · `.toolActHot{color:var(--hot);}` — alte `.klaerenCircle*`-Regeln entfernen (Kontext-Card `.klaerenContext` im aufgeklappten Bereich bleibt).

- [ ] **Step 5: Aufrufer prüfen.** `Pool.jsx` übergibt `onKlaeren` immer (gut). `TabHeute.jsx` rendert `Pool` mit `onKlaeren={(todo)=>setKlaerenTodo(todo)}`. Sicherstellen, dass das Prokrastinations-Icon nur erscheint, wenn das Tool aktiv ist → `onKlaeren` nur durchreichen wenn `activeTools.includes('klaeren')`. In `TabHeute.jsx`:
```jsx
onKlaeren={activeTools.includes('klaeren') ? (todo) => setKlaerenTodo(todo) : undefined}
```

- [ ] **Step 6: Verifizieren** (Preview): Tool aktiv → Icon immer da; altes Todo → Highlight; Tool inaktiv → kein Icon. Screenshot.

- [ ] **Step 7: Commit**
```bash
git add src/components/TodoChip/ src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat(chip): kontextuelle Tool-Aktionen — Prokrastination immer anwählbar bei aktivem Tool"
```

### Task 1.4: SlotBlock andocken + Drag-Lift am Ghost

**Files:**
- Modify: `src/features/calendar/Zeitplan/SlotBlock.jsx`

- [ ] **Step 1:** Prüfen, dass `SlotBlock` weiter über `TodoChip` mit `floatExpand` rendert. Da der Zähler-Kreis weg ist und das Aufklappen über den Balken läuft, im Slot sicherstellen, dass der Balken/Chevron auch im `floatExpand`-Modus klickbar ist (z-index/pointer). Visuell testen.
- [ ] **Step 2:** Commit (falls Änderungen).
```bash
git add src/features/calendar/Zeitplan/SlotBlock.jsx
git commit -m "fix(slot): SlotBlock an neuen Chip angepasst"
```

---

## Phase 2 — Zeitplan: stabiles, schlankes Raster + Bänder

### Task 2.1: Drag-Stauchen entfernen + Drag-Lift

**Files:**
- Modify: `src/hooks/useDragDrop.js`, `src/features/calendar/Zeitplan/Zeitplan.module.css`
- Test: `src/styles/motion.test.js` (erweitern)

- [ ] **Step 1: Guard-Test erweitern** — kein Squish mehr:
```js
// in motion.test.js ergänzen:
import { readFileSync as rf } from 'node:fs'
const zp = rf(join(here, '../features/calendar/Zeitplan/Zeitplan.module.css'), 'utf8')
it('hat keine dnd-active Grid-Kompaktion mehr', () => {
  expect(zp).not.toMatch(/dnd-active[\s\S]*grid-auto-rows/)
})
```

- [ ] **Step 2: Test ausführen** → FAIL (Regel existiert noch).

- [ ] **Step 3: CSS entfernen.** In `Zeitplan.module.css` die beiden `:global(body.dnd-active) .sgGrid …`-Blöcke löschen.

- [ ] **Step 4: Klassen-Toggle entfernen.** In `useDragDrop.js` `document.body.classList.add('dnd-active')` und `…remove('dnd-active')` entfernen (Kommentare mit). Die `.dnd-half-over`/`.dnd-half-locked`-Logik (Trefferzonen-Highlight) **bleibt**.

- [ ] **Step 5: Drag-Lift am Ghost.** Im Ghost-Styling: `ghost.style.transform = 'scale(1.03)'` (statt 0.97) und `ghost.style.boxShadow = var—` → konkret `ghost.style.boxShadow = '0 12px 30px rgba(139,92,246,0.30), inset 0 1px 0 rgba(255,255,255,0.08)'`.

- [ ] **Step 6: Test grün** + Preview: Todo ziehen → Raster bleibt ruhig stehen, Ghost hebt sich an.

- [ ] **Step 7: Commit**
```bash
git add src/hooks/useDragDrop.js src/features/calendar/Zeitplan/Zeitplan.module.css src/styles/motion.test.js
git commit -m "fix(zeitplan): kein Stauchen beim Draggen — stabiles Raster + Drag-Lift"
```

### Task 2.2: bandLogic — reine Berechnung (getestet)

**Files:**
- Create: `src/features/calendar/Zeitplan/bandLogic.js`, `…/bandLogic.test.js`

Reine Funktion: welche Stunden zeigt das Raster (Kernfenster + alle belegten Stunden außerhalb), und welche leeren Randbereiche werden zu Bändern.

- [ ] **Step 1: Test schreiben**
```js
import { describe, it, expect } from 'vitest'
import { computeBands } from './bandLogic'

describe('computeBands', () => {
  it('leeres oberes/unteres Band wenn nur Kernfenster belegt', () => {
    const r = computeBands({ slots: {}, visStart: 8, visEnd: 18 })
    expect(r.topBand).toEqual({ from: 0, to: 8 })
    expect(r.bottomBand).toEqual({ from: 19, to: 24 })
    expect(r.hours).toEqual([8,9,10,11,12,13,14,15,16,17,18])
  })
  it('belegte Stunde über dem Fenster wird sichtbar, Band schrumpft', () => {
    const r = computeBands({ slots: { '6': { text: 'x' } }, visStart: 8, visEnd: 18 })
    expect(r.hours).toContain(6)
    expect(r.topBand).toEqual({ from: 0, to: 6 })
  })
  it('kein Band wenn Fenster bis Tagesrand', () => {
    const r = computeBands({ slots: {}, visStart: 0, visEnd: 23 })
    expect(r.topBand).toBeNull()
    expect(r.bottomBand).toBeNull()
  })
})
```

- [ ] **Step 2: Test ausführen** → FAIL.

- [ ] **Step 3: Implementieren**
```js
// bandLogic.js
export function computeBands({ slots, visStart, visEnd }) {
  const occupied = Object.keys(slots).filter(k => slots[k]).map(k => Math.floor(parseFloat(k)))
  const minOcc = occupied.length ? Math.min(...occupied) : visStart
  const maxOcc = occupied.length ? Math.max(...occupied) : visEnd
  const lo = Math.min(visStart, minOcc)
  const hi = Math.max(visEnd, maxOcc)
  const hours = []
  for (let h = lo; h <= hi; h++) hours.push(h)
  const topBand    = lo > 0  ? { from: 0,      to: lo }    : null
  const bottomBand = hi < 23 ? { from: hi + 1, to: 24 }    : null
  return { hours, topBand, bottomBand }
}
```

- [ ] **Step 4: Test grün.**

- [ ] **Step 5: Commit**
```bash
git add src/features/calendar/Zeitplan/bandLogic.js src/features/calendar/Zeitplan/bandLogic.test.js
git commit -m "feat(zeitplan): bandLogic — Out-of-Window-Berechnung (rein, getestet)"
```

### Task 2.3: Zeitplan-Render — Bänder, schlanke Zeilen, neue Zeitspalte

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`, `.module.css`

- [ ] **Step 1: PillStrip + Controls-Toggle entfernen.** `SlotChipPreview`, `PillStrip` und deren Verwendung löschen. In `.controls` den `viewToggle` (Alles/Minimal) entfernen; **Fokus-Button + Blocker-Button bleiben**. Shift-±-Buttons bleiben (verschieben Slots, nicht Fenster).

- [ ] **Step 2: hours via bandLogic.** `hideEmpty`-State + zugehörige Logik entfernen. Stattdessen `const { hours, topBand, bottomBand } = computeBands({ slots, visStart, visEnd })`. Die `sections`-Logik (normal/blocker-Split) auf diese `hours` anwenden (unverändert übernehmen).

- [ ] **Step 3: Band-Komponente** rendern (oben `topBand`, unten `bottomBand`), wenn nicht null:
```jsx
function FreeBand({ band, dir, onTapExpand, registerHalf }) {
  const label = dir === 'top' ? `bis ${String(band.to).padStart(2,'0')}:00 · frei` : `ab ${String(band.from).padStart(2,'0')}:00 · frei`
  // Drop-Ziel: erste Stunde des angrenzenden Randes
  const dropKey = dir === 'top' ? String(band.to - 1) : String(band.from)
  return (
    <div className={s.freeBand} ref={el => registerHalf?.(dropKey, el, 'empty')} onClick={() => onTapExpand(dir)}>
      <span className={s.freeBandLabel}>{label}</span>
      <span className={s.freeBandPlus}>+</span>
    </div>
  )
}
```
*Hinweis Drop:* Das Band registriert sich als Drop-Ziel auf den Randslot (`dropKey`). Fällt ein Todo aufs Band, landet es dort; das Fenster wird beim nächsten Render durch `computeBands` ohnehin erweitert (Slot ist dann belegt → sichtbar).

- [ ] **Step 4: Tap-Expand-Handler** (Prop `onTapExpand`): ruft je Richtung `onExpandUpTo(band.to - 3)` bzw. `onExpandDownTo(band.from + 2)` auf (3 h aufdecken; bestehende Handler in TabHeute, siehe Task 2.4). Clamp passiert dort.

- [ ] **Step 5: Schlanke Zeilen + Zeitspalte (CSS).**
  - `.sgGrid`: `grid-template-columns: 24px minmax(0,1fr); grid-auto-rows: minmax(33px, auto);`
  - `.sgHalf:not(.sgEmpty)`: `min-height: 44px;` (belegte Chips komfortabel).
  - `.sgLabel`: schmaler, `font-size:0.6rem`, volle-Stunde-Linie kräftiger (`border-bottom:1px solid var(--border)`), halbe Stunde nur am `.sgHalfBot` zart. Aktuelle Stunde `.sgLabelNow` lila (bereits vorhanden) — beibehalten/verfeinern.
  - Die `:00`/`:30`-Hints in leeren Zellen können entfallen (Entrümpelung) — `halfTime` ausblenden oder dezenter.
  - `.freeBand`: `display:flex; align-items:center; justify-content:space-between; padding:7px 10px; margin:6px 0; border:1px dashed var(--border-dim); border-radius:var(--r-sm); color:var(--text-faint); font-size:0.72rem; cursor:pointer; transition:background var(--dur-fast) var(--ease);` · Hover: `background:var(--surface-low)`. `.freeBandPlus{color:var(--primary); font-size:1rem;}`

- [ ] **Step 6: All-day-Streifen (Geburtstage).** Die bisher in `PillStrip` gezeigten `activeBirthdayPills` als schlanke All-day-Zeile **oben im `slotsContainer`** rendern (vor den Sections), lila Akzent, nicht-ziehbar (wie heute, `cursor:default`). Logik (`getBirthdaysForCalendarDate(...).filter(b=>!b.wichtig)`) übernehmen.

- [ ] **Step 7: Verifizieren** (Preview): Tag mit Slots im Kernfenster + ein belegter Slot um 6 Uhr (immer sichtbar) + Bänder oben/unten; Band antippen → Fenster wächst; Todo aufs Band ziehen → landet + Fenster wächst; Geburtstag oben sichtbar; spürbar mehr Stunden pro Screen. Screenshot.

- [ ] **Step 8: Commit**
```bash
git add src/features/calendar/Zeitplan/
git commit -m "feat(zeitplan): frei-Bänder statt Pillen, schlankes Raster + neue Zeitspalte, All-day-Streifen"
```

### Task 2.4: TabHeute — Band-Handler & Aufräumen

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Step 1: onTapExpand durchreichen.** Neuen Handler bauen und an `Zeitplan` geben:
```js
const handleBandExpand = useCallback((dir) => {
  if (dir === 'top')  setVisStart(v => { const n = Math.max(0, v - 3);  saveVis(n, visEnd); return n })
  else                setVisEnd(v   => { const n = Math.min(23, v + 3); saveVis(visStart, n); return n })
}, [visStart, visEnd])
```
Als `onTapExpand={handleBandExpand}` an `Zeitplan`. Die bisherigen `onExpandUp/Down`, `onExpandUpTo/DownTo`, `onRemoveHour`-Props werden von `Zeitplan` nicht mehr gebraucht → aus dem JSX entfernen, und die jetzt verwaisten Handler in `TabHeute` löschen (aufräumen).

- [ ] **Step 2: Verifizieren** Preview + `npx vitest run`.

- [ ] **Step 3: Commit**
```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat(zeitplan): Band-Expand-Handler, verwaiste Fenster-Handler aufgeräumt"
```

---

## Phase 3 — Tab/Tool-Öffnen-Transition

### Task 3.1: Sanftes Einblenden beim Tab-Wechsel

**Files:**
- Modify: `src/App.jsx`, `src/App.module.css`

Der Tab-Content wird in `App.jsx` bereits mit `key={currentTab}` (ErrorBoundary) gemountet. Wir hängen die `toolEnter`-Animation an genau diesen Wrapper — der Key-Wechsel löst sie bei jedem Tab/Tool-Wechsel neu aus.

- [ ] **Step 1:** Den Tab-Content-Wrapper (der mit `key={currentTab}`) eine Klasse `s.tabEnter` geben.
- [ ] **Step 2: CSS** in `App.module.css`:
```css
.tabEnter { animation: toolEnter var(--dur-slow) var(--ease-out) both; }
```
- [ ] **Step 3: Verifizieren** (Preview): Tab/Tool wechseln → Inhalt gleitet sanft ein; bei `prefers-reduced-motion` sofort da (global). Screenshot/Beobachtung.
- [ ] **Step 4: Commit**
```bash
git add src/App.jsx src/App.module.css
git commit -m "feat(motion): Tab-/Tool-Wechsel blendet sanft ein (toolEnter)"
```

---

## Phase 4 — Prokrastination-Sweep + Doku

### Task 4.1: Sichtbare Strings → „Prokrastination"

**Files:**
- Modify: `src/features/tools/klaeren/*` (nur sichtbarer Text)

- [ ] **Step 1:** `grep -rn "[Kk]lär"` über `src/` (ohne docs). Jeden **sichtbaren** Treffer (Button-Labels, Überschriften, Platzhalter) auf „Prokrastination" ändern. **Code-Identifier, Dateinamen, CSS-Kommentare, Storage-Key NICHT anfassen.** Bekannt: Tool-Titel ist bereits korrekt; Kandidat ist das „Beliebiges Todo …"-Button-Label in `TabKlaeren.jsx`.
- [ ] **Step 2: Verifizieren:** App nach „klär" durchsuchen → keine sichtbaren Vorkommen mehr. Preview: Prokrastinations-Tab + Modal lesen.
- [ ] **Step 3: Commit**
```bash
git add src/features/tools/klaeren/
git commit -m "fix(prokrastination): alle sichtbaren Texte sagen Prokrastination"
```

### Task 4.2: Kontext-Doku nachziehen

**Files:**
- Modify: `kontext/architektur.md`, `kontext/kern.md`

- [ ] **Step 1: architektur.md** — die tote `glowColor`-Notiz bei `TodoChip` (Zeile ~15) entfernen/korrigieren (Farbe = Streifen + Border). PillStrip-Erwähnungen im Tagesplaner-Kontext durch „frei-Bänder" ersetzen.
- [ ] **Step 2: kern.md** — TabHeute-Abschnitt: PillStrip/Alles-Minimal-Toggle raus, „frei-Bänder + stabiles Raster + All-day-Streifen" rein. Motion-/Elevation-Tokens kurz erwähnen.
- [ ] **Step 3: Commit**
```bash
git add kontext/architektur.md kontext/kern.md
git commit -m "docs: Kontext nachgezogen — Bänder, Chip-Indikatoren, Motion-Tokens"
```

---

## Self-Review (gegen die Spec)

**Spec-Abdeckung:**
- Motion/Elevation-Standard → Phase 0 ✓ · app-weite Anwendung Tab-Open → Phase 3 ✓
- Chip: Farbe=Streifen+Border ✓ (bereits Realität, keine Änderung nötig) · Zeit rechts ✓ (1.2) · Fortschrittsbalken + Aufklappen ✓ (1.2) · Prio-Punkt-Ampel ✓ (1.1) · Slim-Griff ✓ (bereits vorhanden, bleibt) · Tiefe + Lift ✓ (1.2/2.1) · ✕ raus ✓ (1.2) · Tool-Aktionen + Prokrastination-immer ✓ (1.3)
- Tagesplaner: kein Stauchen ✓ (2.1) · Bänder statt Pillen ✓ (2.2/2.3) · schlankes Raster + Zeitspalte ✓ (2.3) · Touch ≥44 belegt ✓ (2.3) · All-day-Streifen ✓ (2.3) · PillStrip/±/Toggle raus ✓ (2.3/2.4) · 30-Min bleibt ✓ (keine Datenänderung)
- Prokrastination-Sweep ✓ (4.1) · Doku ✓ (4.2)
- Erhalten: SlotSheet, Blocker, useTimeEvents, Endzeit-Projektion, „verplant"-Icon, Alter — unangetastet ✓

**Platzhalter-Scan:** keine TBD/TODO; Code in jedem Code-Step vorhanden (Token-/Logik-Steps vollständig; reine CSS-Politur ist strukturell spezifiziert + per Preview verifiziert — bewusste Entscheidung für ein visuelles Makeover statt jede Deklaration vorzuschreiben).

**Typ-Konsistenz:** `computeBands({slots,visStart,visEnd}) → {hours, topBand, bottomBand}` konsistent in 2.2/2.3 verwendet; `handleBandExpand(dir)`/`onTapExpand(dir)` mit `'top'|'bottom'` konsistent (2.3/2.4); `toggleExpanded`/`expanded`/`onExpandedChange` konsistent (1.2).

**Reihenfolge:** Tokens → Chip → Zeitplan → Tab-Open → Sweep. Jede Phase landet lauffähig.
