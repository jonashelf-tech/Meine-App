# Tool — Integration (Claude Code)

## Bestehende Tools & Tab-Nummern

```
Tab 4  — Geburtstage   (geburtstage)
Tab 5  — Fokus-Timer   (timer)
Tab 6  — Rezepte       (rezepte)
Tab 7  — Pizza         (pizza)
Tab 8  — Elvi          (elvi)
Tab 9  — Fitness       (fitness)
Tab 10 — Garten        (garten)
Tab 11 — Zufallsrad    (rad)
Tab 12 — Reminder      (reminder)
Tab 13 — Haushalt      (haushalt)
Tab 14 — Was jetzt?    (wasjetzt)
Tab 15 — Klar+Sehen   (klaeren)
Tab 16 — Kognitiv      (kognitiv)
Tab 17 — Projekte      (projekte)
Tab 18 — Growth        (growth)   ← ersetzt Wachstum (Journaling-Tool)
Tab 19 → nächstes Tool
```

---

## Schritt-für-Schritt Integration

```
1. Ordner anlegen:         src/features/tools/toolname/
2. JSX erstellen:          TabToolname.jsx  (CSS Modules, kein Inline-CSS für statische Werte)
3. CSS erstellen:          TabToolname.module.css
4. toolRegistry.jsx:       Eintrag + SVG-Icon in ICONS ergänzen (kein Emoji)
5. toolTabs.js:            toolname: 15  ← EINZIGE Stelle für Tab-Nummern
6. App.jsx:                import + {currentTab === TOOL_TAB.toolname && <TabToolname onBack={goBack} />}
7. storage/index.js:       SK.toolname: `${PREFIX}toolname_data`  (falls eigener Storage)
```

> **TOOL_TAB ausschließlich in `src/features/tools/toolTabs.js` definieren.**
> Alle anderen Dateien importieren von dort. Nie lokal redefinieren.

---

## toolTabs.js — Eintrag

```js
// src/features/tools/toolTabs.js
export const TOOL_TAB = {
  // ... bestehende ...
  toolname: 15,   // ← hier ergänzen
}
```

---

## toolRegistry.jsx — Eintrag

```js
// In ICONS ergänzen:
toolname: { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="..."/></svg> },

// In TOOL_REGISTRY ergänzen:
{
  id:          'toolname',
  name:        'Anzeigename',
  icon:        '🔧',        // Emoji-Fallback (wird in UI nicht gezeigt — ToolIcon nutzt SVG)
  color:       '#8B5CF6',
  description: 'Kurze Beschreibung',
  standalone:  true,        // true → öffnet als eigener Tab
  integrated:  false,       // true → Tool-Daten erscheinen im Kalender (Tool-Dots)
},
```

---

## App.jsx — Routing

```jsx
import TabToolname from './features/tools/toolname/TabToolname'
import { TOOL_TAB } from './features/tools/toolTabs'

// Im JSX-Block:
{currentTab === TOOL_TAB.toolname && <TabToolname onBack={goBack} />}
```

---

## Header-Pattern (ToolHeader-Komponente)

```jsx
import ToolHeader from '../../../components/ToolHeader/ToolHeader'

<ToolHeader onBack={onBack} icon={<MyIcon />} eyebrow="Tool" title="Toolname" />
```

---

## Storage-Konvention

```js
// SK-Eintrag in storage/index.js:
toolname: `${PREFIX}toolname_data`,

// Im Tool:
import { sv, lv, SK } from '../../../storage'
const [data, setData] = useState(() => lv(SK.toolname, DEFAULT))
const save = (next) => { setData(next); sv(SK.toolname, next) }
```

---

## Standalone SessionStore (Muster: kognitiv)

Für Tools die eine eigene Session-Historie brauchen (kein Teil des globalen Stores):

```js
// src/features/tools/toolname/sessionStore.js
import { sv, lv, SK } from '../../../storage'

export function loadSessions()           { return lv(SK.toolname, []) }
export function saveSession(session)     { sv(SK.toolname, [...loadSessions(), session]) }

// Session-Objekt:
export function createSession({ moduleId, score, mainMetric, duration, startedAt }) {
  return { id: crypto.randomUUID(), moduleId, date: startedAt.slice(0,10), startedAt, score, mainMetric, duration }
}

// Tages-Throttle: War heute schon eine Session für dieses Modul?
export function isDoneToday(moduleId) {
  const today = new Date().toISOString().slice(0,10)
  return loadSessions().some(s => s.moduleId === moduleId && s.date === today)
}

// Wochen-Throttle: War diese KW schon belegt?
function currentISOWeek() { /* ... */ }
const PRACTICE_KEY = 'adhs_toolname_practice'
export function isPracticeAvailable(moduleId) { return lv(PRACTICE_KEY)?.[moduleId] !== currentISOWeek() }
export function markPracticeUsed(moduleId)    { sv(PRACTICE_KEY, { ...lv(PRACTICE_KEY)??{}, [moduleId]: currentISOWeek() }) }
```

**Wann nutzen:** Tool trackt Übungs-Sessions mit Zeitstempel, Score, Modul-ID — aber braucht keinen globalen Store-Reaktivität. Kalender-Integration nur über `loadSessions()` direkt in TabKalender (für Dots).

---

## Kalender-Integration

Tool-Daten im Kalender sichtbar machen (`integrated: true` in Registry):

```js
import { useAppStore } from '../../../store'
const { days, setDays } = useAppStore()

const writeToCalendar = (date, slotKey, entry) => {
  setDays(prev => ({
    ...prev,
    [date]: { ...(prev[date] ?? {}), [slotKey]: entry }
  }))
}

// entry-Format:
{ text: 'Session: Toolname', color: '#8B5CF6', duration: 30, locked: true }
```

---

## Tagesplaner-Widget — Standard-Muster (HaushaltSection / ReminderSection)

Tools können als eingebettete Sektion im Tagesplaner erscheinen (unter dem Pool).
Bedingung: `activeTools.includes('toolid')` in `TabHeute.jsx`.

```jsx
// In TabHeute.jsx ergänzen (Imports):
import ToolnameSection from '../../tools/toolname/ToolnameSection'

// Im JSX (SECTION_PROPS + Render-Block):
const SECTION_PROPS = {
  haushalt: { onStartDrag: startHaushaltDrag },
  reminder: { onStartDrag: startReminderDrag },
  toolname: { onStartDrag: startToolnameDrag },  // ← neu ergänzen
}
const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, toolname: ToolnameSection }
return activeTools
  .filter(id => SECTIONS[id])
  .map(id => { const Sec = SECTIONS[id]; return <Sec key={id} {...(SECTION_PROPS[id] ?? {})} /> })
```

### fakeTodo-Pattern (Standard für alle Dashboard-Widgets)

Items werden **nicht** als echte Todos im Store angelegt — nur als `fakeTodo` zur Anzeige in `<TodoChip>`.
Das echte Todo entsteht erst **beim Drop** (atomar mit dem Slot). Kein Flackern im Pool.

```jsx
// ToolnameSection.jsx
export default function ToolnameSection({ onStartDrag }) {
  const { todos, setTodos, toolColors } = useAppStore()
  const toolColor = getToolColor('toolname', toolColors)

  const fakeTodo = {
    id:       item.id,
    text:     item.text,
    color:    item.color ?? toolColor,
    done:     false,
    priority: 3,        // Default Prio für Tool-Items
    duration: null,     // kein "Xmin" in Meta
    subItems: [],
    category: null,     // optional: Zusatzinfo (z.B. item.time)
    date:     null,
    time:     null,
    toolId:   'toolname',
  }

  const dragHandle = (
    <span
      className={s.dragHandle}
      onPointerDown={e => { e.stopPropagation(); onStartDrag?.(item, toolColor, e) }}
      aria-label="Ziehen"
    >
      <DragIcon />
    </span>
  )

  return (
    <div className={s.row}>
      <button className={[s.selectBtn, isSelected ? s.selectBtnOn : ''].join(' ')} onClick={() => toggleSelect(item.id)}>
        {isSelected ? '✓' : '○'}
      </button>
      <div className={s.chipWrap}>
        <TodoChip
          todo={fakeTodo}
          onRemove={() => handleRemoveOrDismiss(item.id)}
          disableExpand
          dragHandle={dragHandle}
        />
      </div>
    </div>
  )
}
```

### startXxxDrag in TabHeute (Standard-Callback)

```js
const startToolnameDrag = useCallback((item, itemColor, e) => {
  const text     = item.text
  const duration = 30
  startDrag(text, itemColor, (dropKey) => {
    const newTodo = createBlock({ text, priority: 3, color: itemColor, toolId: 'toolname', duration })
    setTodos(prev => [...prev, newTodo])
    if (dropKey !== 'pool') {
      handleSetSlot(dropKey, { text, todoId: newTodo.id, color: itemColor, duration, locked: false, done: false })
    }
  }, e, null)
}, [startDrag, setTodos, handleSetSlot])
```

- **Drop auf Zeitplan-Slot** → Todo + Slot atomar erstellt
- **Drop auf Pool** → nur Todo erstellt (kein Slot), erscheint im Pool
- **Drag aus Zeitplan zurück in Pool** → Slot gelöscht, Todo bleibt (via `pool`-Drop-Zone in Pool.jsx)

### CSS-Grundstruktur (ToolnameSection.module.css)

```css
.items { display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; align-items: stretch; gap: 4px; }
.chipWrap { flex: 1; min-width: 0; }
.rowDeselected { opacity: 0.4; }
.selectBtn { width: 28px; min-width: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: none; color: rgba(255,255,255,0.2); font-size: 0.72rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
.selectBtnOn { color: var(--emerald); border-color: rgba(16,185,129,0.3); }
.dragHandle { width: 30px; min-width: 30px; align-self: stretch; border-left: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: rgba(255,255,255,0.25); cursor: grab; touch-action: none; transition: color 0.15s; }
.dragHandle:hover { color: rgba(255,255,255,0.55); }
```

---

## Standard-Dashboard-Muster (ToolSection + Section)

Jedes Tool-Dashboard im Tagesplaner folgt diesem Muster. **Immer zuerst dieses Template verwenden — nicht neu erfinden.**

### Aufbau

```jsx
// ToolnameSection.jsx
import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { createBlock } from '../../todos/Block'
import s from './ToolnameSection.module.css'

const DragIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

export default function ToolnameSection({ onStartDrag }) {
  const { todos, setTodos, setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('toolname', toolColors)

  // ── Items laden ─────────────────────────────────────────
  const items = /* Tool-spezifische Items hier */

  // ── Duplikat-Schutz ──────────────────────────────────────
  // Items die bereits als nicht-erledigte Todos existieren ausblenden
  const visibleItems = items.filter(item =>
    !todos.some(t => t.toolnameItemId === item.id && !t.done)
  )

  if (visibleItems.length === 0) return null

  // ── Auswahl ──────────────────────────────────────────────
  const [deselected, setDeselected] = useState(() => new Set())
  const toggleSelect = useCallback((id) => {
    setDeselected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  // ── Hinzufügen ───────────────────────────────────────────
  const handleAddSelected = useCallback(() => {
    const toAdd = visibleItems.filter(i => !deselected.has(i.id))
    setTodos(prev => [
      ...prev,
      ...toAdd.map(item => createBlock({
        text:           item.text,
        color:          toolColor,
        priority:       3,
        toolId:         'toolname',
        toolnameItemId: item.id,   // ← Duplikat-Schutz-Key
      }))
    ])
  }, [visibleItems, deselected, toolColor, setTodos])

  const selectedCount = visibleItems.filter(i => !deselected.has(i.id)).length

  // ── Render ───────────────────────────────────────────────
  return (
    <ToolSection
      toolId="toolname"
      title="Toolname"
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.toolname)}
      actionLabel={`+ ${selectedCount} hinzufügen`}
      onAction={handleAddSelected}
      actionDisabled={selectedCount === 0}
    >
      <div className={s.items}>
        {visibleItems.map(item => {
          const isSelected = !deselected.has(item.id)
          const fakeTodo = {
            id:       item.id,
            text:     item.text,
            color:    toolColor,
            done:     false,
            priority: 3,
            duration: null,
            subItems: [],
            category: null,
            date:     null,
            time:     null,
            toolId:   'toolname',
          }
          const dragHandle = (
            <span
              className={s.dragHandle}
              onPointerDown={e => { e.stopPropagation(); onStartDrag?.(item, toolColor, e) }}
              aria-label="Ziehen"
            >
              <DragIcon />
            </span>
          )
          return (
            <div key={item.id} className={[s.row, !isSelected ? s.rowDeselected : ''].join(' ')}>
              <button
                className={[s.selectBtn, isSelected ? s.selectBtnOn : ''].join(' ')}
                onClick={() => toggleSelect(item.id)}
              >
                {isSelected ? '✓' : '○'}
              </button>
              <div className={s.chipWrap}>
                <TodoChip todo={fakeTodo} dragHandle={dragHandle} disableExpand />
              </div>
            </div>
          )
        })}
      </div>
    </ToolSection>
  )
}
```

### Regeln

1. **Duplikat-Schutz:** Jede Section filtert `visibleItems` gegen `todos` mit eigenem `toolnameItemId`-Feld. Beim Todo-Erstellen immer dieses Feld setzen.
2. **Kein Bottom-Button:** `onAction` an ToolSection übergeben — kein `addAllBtn` im Body.
3. **Button-Text:** `` `+ ${selectedCount} hinzufügen` `` — count = aktuell angewählte Items. Bei 0 → `actionDisabled`.
4. **fakeTodo:** Immer mit `toolId` stempeln damit `glowColor` in TodoChip die richtige Farbe nutzt.
5. **Section verschwindet** wenn `visibleItems.length === 0` (`return null`).
6. **Extra-Badge** (z.B. Prozentwert): `badge`-Prop an ToolSection — erscheint links vom Action-Button.
7. **Header-Reihenfolge:** `[Name ↗]` → `[badge wenn vorhanden]` → `[+ N hinzufügen]` → `[▾]`
8. **Sub-Items:** Wenn Items Unter-Aufgaben haben → `subItems` im fakeTodo befüllen, `disableExpand` weglassen.

---

## Kognitiv-Tool — Struktur (Muster für mehr-Modul-Tools)

Tool mit mehreren eigenständigen Übungs-Modulen + Session-Historie. Referenz für ähnliche Tools.

**`moduleConfig.js` — Single Source of Truth pro Modul:**
```js
MODULE_CONFIG[id] = {
  id, name, color, domain,        // color = Modulfarbe, domain = Kategorie-Label
  desc, duration,                 // Anzeige im Vorbildschirm
  steps?,                         // optional: Schritt-Liste (nur geteilt)
  measured, notMeasured,          // string[] — was gemessen wird / nicht
  mainMetricLabel, mainMetricUnit,// Hauptkennzahl in Results/Dashboard
  higherIsBetter,                 // Metrik-Richtung
}
MODULE_ORDER  // Reihenfolge der Module
```
7 Module: alertness · zahlensuche · gedaechtnis · gonogo · nback · taskswitching · geteilt.
**Keine Schwierigkeitsvarianten** — alle Module laufen fest auf „Normal" (variant/defaultVariant 2026-06 entfernt: aus Config, Start-Fluss, allen 7 Übungen + Datenmodell `createSession`).

**Färbung:** Modul-Screens (ModuleList/Briefing/ModuleDemo/Results/Dashboard/ModuleDetail/Settings) setzen `style={{ '--accent': m.color }}` und leiten Töne via `color-mix()` ab. Tool-Chrome (Tab-Leiste/Statistik-Kacheln/Erst-Briefing) nutzt `--tool-color` (= `--primary`, am TabKognitiv-Root gesetzt). Grün/Rot bleiben **semantisch** (Erfolg/Fehler).

**`ModuleIcon.jsx`:** distinktes Linien-SVG pro Modul-ID. `currentColor` folgt der Modulfarbe. Fallback = Kreis.

**`ModuleDemo.jsx` (+ .module.css):** kleine Endlos-Demo des Kern-Mechanismus je Modul — reine CSS/SVG-Loops in der Bildsprache der echten Übung, **kein** Timer/Scoring/sessionStore-Import. Erbt `var(--accent)`, `prefers-reduced-motion` friert ein. Sitzt im Vorbildschirm als „So läuft's"-Bühne.

**`Briefing.jsx` (Vorbildschirm):** Hero (Icon-Glow, Titel, Meta-Pills) + `ModuleDemo` + aufklappbare Details (steps/Gemessen/Nicht relevant) + Gradient-CTA. Startet via `onStart()` (kein variant-Argument mehr).

**`KognitivBriefing.jsx`:** einmaliges Erst-Briefing (4 Screens, Muster wie `GrowthBriefing`). Gate in `TabKognitiv` via `SK.kognitivIntroSeen` (liegt in `BACKUP_CATS.einstellungen`).

**`exercises/ExerciseShell.jsx`:** gemeinsame Chrome für alle 7 Übungen — immersive Bühne + dünne Fortschrittsleiste in Modulfarbe + dezenter SVG-Abbrechen-Button.
```jsx
<ExerciseShell moduleId={id} progress={n} total={N} durationMs={ms} onAbort={...} onTap={...}>{stimuli}</ExerciseShell>
```
Stimuli nutzen `var(--accent)`. Übungs-CSS hat **kein** eigenes `.root`/`.closeBtn` (kommt aus der Shell).

**Dashboard (Statistik):** Leerzustand wenn nichts trainiert; sonst 3 Summen-Kacheln + Modul-Karten (nur Module mit Sessions).

**Einstellungen:** je Modul Frei/Erinnerung/Termin (Segmented). „Termin"/„Erinnerung" → Modul erscheint oben in `ModuleList` unter „Heute dran" (`getScheduledToday`, blendet heute schon Erledigte aus).

**Session-Historie:** via `sessionStore.js` (kein globaler Store) — siehe Abschnitt "Standalone SessionStore" oben. **Wichtig:** Session-Key `SK.kognitiv` gehört in `BACKUP_CATS.tools`, sonst geht die Historie bei Teil-Restore verloren.
