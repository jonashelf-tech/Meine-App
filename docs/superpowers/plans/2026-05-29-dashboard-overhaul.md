# Dashboard-Überarbeitung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Tool-Dashboards im Tagesplaner vereinheitlichen: korrekte Borderfarben, kein Duplikat-Chaos, Pill-Header statt Bottom-Button, kanonisches Muster für zukünftige Tools.

**Architecture:** Kleinstmögliche Eingriffe — jeder Task ändert genau eine Datei oder ein klar abgegrenztes Problem. ToolSection bekommt neue optionale Props `actionLabel/onAction/actionDisabled` und ein Pill-Header-Design. Alle bestehenden Section-Komponenten geben ihren Bottom-Button auf und reichen stattdessen `onAction` durch. Keine Änderungen an TodoChip-Darstellung oder Drag-Logik.

**Tech Stack:** React 18, Vite, Zustand, CSS Modules

**Dev-Server starten:** `npm run dev` im Projektordner → `http://localhost:5173`

**Spec:** `docs/superpowers/specs/2026-05-29-dashboard-overhaul-design.md`

---

## Datei-Übersicht

| Datei | Was ändert sich |
|---|---|
| `src/components/TodoChip/TodoChip.jsx` | glowColor nutzt getToolColor statt hardcoded Fallback |
| `src/features/tools/TabTools/TabTools.jsx` | handleColorChange blockiert Duplikate |
| `src/components/ToolSection/ToolSection.jsx` | Pill-Header + neue Props |
| `src/components/ToolSection/ToolSection.module.css` | margin-bottom weg, Pill-CSS |
| `src/features/calendar/TabHeute/TabHeute.jsx` | gap 6, birthdayChipId stempeln |
| `src/features/tools/erfolge/ErfolgeSection.jsx` | return null wenn nichts zu tun |
| `src/features/tools/geburtstage/BirthdaySection.jsx` | pendingChipIds-Filter + onAction |
| `src/features/tools/haushalt/HaushaltSection.jsx` | onAction statt addAllBtn |
| `src/features/tools/reminder/ReminderSection.jsx` | onAction statt addAllBtn |
| `kontext/tool-pattern.md` | Standard-Dashboard-Template ergänzen |

---

## Task 1: TodoChip — Borderfarbe per Tool

**Datei:** `src/components/TodoChip/TodoChip.jsx`

**Problem:** Fallback `?? '#8B5CF6'` ignoriert die Registry-Farbe des Tools — alle Tool-Todos leuchten violett statt in der richtigen Tool-Farbe.

- [ ] **Import ergänzen** — `getToolColor` wird bereits in utils exportiert, muss nur importiert werden. Zeile 6 (nach den bestehenden Imports):

```jsx
import { getToolColor } from '../../utils'
```

- [ ] **glowColor-Zeile ändern** (~Zeile 137):

```jsx
// Vorher:
const glowColor = todo.toolId ? (toolColors?.[todo.toolId] ?? '#8B5CF6') : null

// Nachher:
const glowColor = todo.toolId ? getToolColor(todo.toolId, toolColors) : null
```

- [ ] **Manuell prüfen:** Dev-Server starten, im Tagesplaner ein Haushalt-Todo in den Pool ziehen → Border leuchtet in Haushalt-Farbe (lila `#8B5CF6` standardmäßig — also visuell gleich). Ein Reminder-Todo → leuchtet in Reminder-Farbe (`#00FF94`). Korrekt wenn die Farbe zum Tool passt.

- [ ] **Commit:**

```bash
git add src/components/TodoChip/TodoChip.jsx
git commit -m "fix: TodoChip glowColor nutzt getToolColor statt hardcoded Fallback"
```

---

## Task 2: TabTools — Doppelfarben blockieren

**Datei:** `src/features/tools/TabTools/TabTools.jsx`

**Problem:** Zwei Tools können identische Farben haben. `swatchDimmed` zeigt es nur — verhindert es nicht.

- [ ] **`handleColorChange` anpassen** (~Zeile 40):

```jsx
const handleColorChange = (toolId, hex) => {
  if (getUsedByOthers(toolId).includes(hex.toLowerCase())) return
  setToolColors(prev => ({ ...prev, [toolId]: hex }))
}
```

- [ ] **Custom-Color-Picker `onChange` anpassen** (~Zeile 211 im `<input type="color">`):

```jsx
onChange={e => {
  if (!colorPickerTool) return
  if (getUsedByOthers(colorPickerTool).includes(e.target.value.toLowerCase())) return
  handleColorChange(colorPickerTool, e.target.value)
}}
```

- [ ] **Manuell prüfen:** Tab Tools öffnen → zwei Tools auf die gleiche Farbe setzen versuchen → zweiter Klick hat keine Wirkung. Gedimmte Swatches bleiben unklickbar.

- [ ] **Commit:**

```bash
git add src/features/tools/TabTools/TabTools.jsx
git commit -m "fix: doppelte Tool-Farben blockieren"
```

---

## Task 3: Spacing vereinheitlichen

**Dateien:** `src/components/ToolSection/ToolSection.module.css`, `src/features/calendar/TabHeute/TabHeute.jsx`

**Problem:** `margin-bottom: 8px` in ToolSection + `gap: 8` im TabHeute-Flex-Container ergeben 16px zwischen Sections statt 8px.

- [ ] **`ToolSection.module.css` — `margin-bottom` entfernen** aus `.section`:

```css
.section {
  border: 1px solid var(--border-dim);
  border-radius: var(--r);
  background: var(--surface-low);
  overflow: hidden;
}
```

- [ ] **`TabHeute.jsx` — gap auf 6 setzen** (~Zeile 468, der `swipeRef`-div):

```jsx
<div ref={swipeRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
```

- [ ] **Manuell prüfen:** Tagesplaner mit mehreren aktiven Dashboards öffnen → gleichmäßiger Abstand zwischen allen Elementen (Zeitplan, Pool, Sections).

- [ ] **Commit:**

```bash
git add src/components/ToolSection/ToolSection.module.css src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "fix: Spacing zwischen Dashboards vereinheitlicht"
```

---

## Task 4: ErfolgeSection — nur anzeigen wenn nötig

**Datei:** `src/features/tools/erfolge/ErfolgeSection.jsx`

**Problem:** Section zeigt „Noch keine Erfolge — weiter so!" auch wenn nichts zu tun ist.

- [ ] **Early return ergänzen** — nach den `const`-Deklarationen (~Zeile 77, direkt vor `return`):

```jsx
const nothingAtAll = unlocked.length === 0 && recentClaimed.length === 0
if (nothingAtAll) return null
```

Die bestehende Zeile `const nothingAtAll = ...` weiter unten (~Zeile 77) ersetzen durch die beiden Zeilen oben. Das heißt: die alte `nothingAtAll`-Konstante entfernen und die Early-Return-Version an gleicher Stelle einfügen.

Konkret: Der Block der ersetzt wird ist:

```jsx
// Vorher (~Zeile 77):
const nothingAtAll = unlocked.length === 0 && recentClaimed.length === 0

return (
  <>
    {toast && ...}
    <ToolSection ...>
      ...
      {nothingAtAll ? (
        <div className={s.empty}>Noch keine Erfolge — weiter so!</div>
      ) : (
        ...
      )}
```

```jsx
// Nachher:
const nothingAtAll = unlocked.length === 0 && recentClaimed.length === 0
if (nothingAtAll) return null

return (
  <>
    {toast && ...}
    <ToolSection ...>
      <div style={{ '--tool-color': toolColor }}>
        {/* nothingAtAll-Branch komplett entfernen, da return null bereits greift */}
        {top3.map(a => ( ... ))}
        ...
      </div>
    </ToolSection>
  </>
)
```

Der `nothingAtAll`-Zweig im JSX (der "Noch keine Erfolge" Text) wird entfernt — er ist durch den early return nie mehr erreichbar.

- [ ] **Manuell prüfen:** Tagesplaner öffnen wenn keine Erfolge verfügbar → Erfolge-Section taucht nicht auf. Wenn Erfolge vorhanden → Section erscheint normal.

- [ ] **Commit:**

```bash
git add src/features/tools/erfolge/ErfolgeSection.jsx
git commit -m "fix: ErfolgeSection nur anzeigen wenn Erfolge abholbar oder geclaimt"
```

---

## Task 5: BirthdaySection — Duplikat-Schutz

**Dateien:** `src/features/calendar/TabHeute/TabHeute.jsx`, `src/features/tools/geburtstage/BirthdaySection.jsx`

**Problem:** Geburtstags-Todos können beliebig oft hinzugefügt werden — kein Schutz gegen bereits vorhandene Pool-Todos.

### 5a — `startBirthdayDrag` stempelt `birthdayChipId`

- [ ] **Bulk-Add-Pfad anpassen** (~Zeile 389 in TabHeute.jsx):

```jsx
// Vorher:
const newTodos = bulkChips.map(c =>
  createBlock({ text: c.text, priority: c.type === 'birthday' ? 2 : 3, color: c.color, toolId: 'geburtstage' })
)

// Nachher:
const newTodos = bulkChips.map(c =>
  createBlock({
    text:           c.text,
    priority:       c.type === 'birthday' ? 2 : 3,
    color:          c.color,
    toolId:         'geburtstage',
    birthdayChipId: `${c.type}-${c.birthday.id}`,
  })
)
```

- [ ] **Single-Drag-Pfad anpassen** (~Zeile 407 in TabHeute.jsx):

```jsx
// Vorher:
const newTodo = createBlock({
  text:     chip.text,
  priority: chip.type === 'birthday' ? 2 : 3,
  color:    chipColor,
  toolId:   'geburtstage',
  duration,
})

// Nachher:
const newTodo = createBlock({
  text:           chip.text,
  priority:       chip.type === 'birthday' ? 2 : 3,
  color:          chipColor,
  toolId:         'geburtstage',
  duration,
  birthdayChipId: `${chip.type}-${chip.birthday.id}`,
})
```

### 5b — BirthdaySection filtert bereits vorhandene Todos

- [ ] **`todos` aus Store holen** (~Zeile 29 in BirthdaySection.jsx):

```jsx
// Vorher:
const { birthdays, setCurrentTab, toolColors } = useAppStore()

// Nachher:
const { birthdays, setCurrentTab, toolColors, todos } = useAppStore()
```

- [ ] **`pendingChipIds` berechnen und chips filtern** — direkt nach `const chips = getActiveChips(...)` (~Zeile 32):

```jsx
const chips = getActiveChips(birthdays, toolColor).filter(chip => {
  const chipId = `${chip.type}-${chip.birthday.id}`
  return !todos.some(t => t.birthdayChipId === chipId && !t.done)
})
```

- [ ] **Manuell prüfen:** Geburtstags-Todos hinzufügen → Dashboard-Chips verschwinden. Nochmals auf "+ hinzufügen" klicken nicht mehr möglich da Chips weg. Todos als done markieren → Chips tauchen wieder auf.

- [ ] **Commit:**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx src/features/tools/geburtstage/BirthdaySection.jsx
git commit -m "fix: BirthdaySection verhindert doppelte Todos via birthdayChipId"
```

---

## Task 6: ToolSection — Pill-Header

**Dateien:** `src/components/ToolSection/ToolSection.jsx`, `src/components/ToolSection/ToolSection.module.css`

**Neue optionale Props:** `actionLabel`, `onAction`, `actionDisabled`

**Header-Aufbau:** `[Name ↗ Pill]` · `[Badge Pill*]` · `[+ N hinzufügen Pill*]` · `[Chevron Pill]`
— `*` nur wenn übergeben

### 6a — ToolSection.jsx komplett ersetzen

- [ ] **`ToolSection.jsx` neu schreiben:**

```jsx
import { useState } from 'react'
import { ToolIcon } from '../../features/tools/toolRegistry'
import s from './ToolSection.module.css'

export default function ToolSection({
  toolId,
  title,
  badge     = null,
  badgeBg,
  color,
  defaultOpen  = false,
  onTitleClick,
  actionLabel,
  onAction,
  actionDisabled = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)

  const sectionStyle = color ? {
    border:    `1.5px solid ${color}55`,
    boxShadow: `0 0 10px ${color}22`,
  } : undefined

  return (
    <div className={s.section} style={sectionStyle}>
      <div className={s.header}>

        {/* Name-Pill — togglet Accordion */}
        <button className={s.namePill} onClick={() => setOpen(v => !v)}>
          <span className={s.iconWrap}><ToolIcon id={toolId} size={15} /></span>
          <span
            className={[s.title, onTitleClick ? s.titleLink : ''].join(' ')}
            onClick={e => { if (onTitleClick) { e.stopPropagation(); onTitleClick() } }}
          >
            {title}
            {onTitleClick && <span className={s.linkArr}>↗</span>}
          </span>
        </button>

        {/* Badge-Pill — optional (z.B. "42%" bei Haushalt) */}
        {badge != null && (
          <span
            className={s.badge}
            style={badgeBg ? { background: badgeBg } : undefined}
          >
            {badge}
          </span>
        )}

        {/* Action-Pill — "+ N hinzufügen" */}
        {onAction && (
          <button
            className={s.actionPill}
            onClick={e => { e.stopPropagation(); onAction() }}
            disabled={actionDisabled}
          >
            {actionLabel}
          </button>
        )}

        {/* Chevron-Pill */}
        <button className={s.chevronPill} onClick={() => setOpen(v => !v)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {open
              ? <polyline points="18 15 12 9 6 15" />
              : <polyline points="6 9 12 15 18 9" />}
          </svg>
        </button>
      </div>

      {open && <div className={s.body}>{children}</div>}
    </div>
  )
}
```

### 6b — ToolSection.module.css komplett ersetzen

- [ ] **`ToolSection.module.css` neu schreiben:**

```css
/* ── Section-Wrapper ──────────────────────────────── */
.section {
  border: 1px solid var(--border-dim);
  border-radius: var(--r);
  background: var(--surface-low);
  overflow: hidden;
}

/* ── Pill-Header ─────────────────────────────────── */
/* Lücken zwischen Pills = sichtbarer Hintergrund des Headers */
.header {
  display: flex;
  align-items: stretch;
  gap: 1px;
  background: rgba(255, 255, 255, 0.06);
}

/* Name-Pill (flex: 1, nimmt restlichen Platz) */
.namePill {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  background: var(--surface-low);
  border: none;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}
.namePill:hover { background: var(--surface); }

.iconWrap {
  display: flex;
  align-items: center;
  color: var(--text-faint);
  flex-shrink: 0;
}

.title {
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.titleLink { cursor: pointer; }

.linkArr {
  font-size: 0.62rem;
  color: var(--text-ghost);
  pointer-events: none;
}

/* Badge-Pill (z.B. "42%" oder Session-Count) */
.badge {
  display: flex;
  align-items: center;
  padding: 0 9px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.62rem;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  color: var(--text-dim);
  letter-spacing: 0.03em;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Action-Pill (lila, "+ N hinzufügen") */
.actionPill {
  display: flex;
  align-items: center;
  padding: 0 11px;
  background: rgba(139, 92, 246, 0.14);
  border: none;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: #a78bfa;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.actionPill:hover:not(:disabled) { background: rgba(139, 92, 246, 0.24); }
.actionPill:disabled {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

/* Chevron-Pill */
.chevronPill {
  display: flex;
  align-items: center;
  padding: 0 10px;
  background: var(--surface-low);
  border: none;
  cursor: pointer;
  color: var(--text-faint);
  flex-shrink: 0;
  transition: background 0.12s;
  -webkit-tap-highlight-color: transparent;
}
.chevronPill:hover { background: var(--surface); }

/* ── Body ────────────────────────────────────────── */
.body {
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
```

- [ ] **Manuell prüfen:** Alle Dashboards im Tagesplaner öffnen — jedes zeigt Pill-Header. Accordion klappt beim Klick auf Name-Pill oder Chevron auf/zu. Kein Bottom-Button sichtbar (noch nicht — kommt in Tasks 7–9). Kognitiv + Erfolge + Gewicht funktionieren unverändert (keine `onAction`-Props → kein Action-Button).

- [ ] **Commit:**

```bash
git add src/components/ToolSection/ToolSection.jsx src/components/ToolSection/ToolSection.module.css
git commit -m "feat: ToolSection Pill-Header mit actionLabel/onAction Props"
```

---

## Task 7: HaushaltSection — onAction

**Datei:** `src/features/tools/haushalt/HaushaltSection.jsx`

- [ ] **`selectedCount` vor dem return berechnen** — direkt vor dem `return` (~Zeile 149):

```jsx
const selectedCount = visibleDueRooms.filter(({ room }) => !deselected.has(room.id)).length
```

- [ ] **ToolSection-Aufruf anpassen** — `actionLabel`, `onAction`, `actionDisabled` ergänzen:

```jsx
<ToolSection
  toolId="haushalt"
  title="Haushalt"
  badge={`${score}%`}
  badgeBg={badgeBg}
  color={toolColor}
  onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
  actionLabel={`+ ${selectedCount} hinzufügen`}
  onAction={handleAddSelected}
  actionDisabled={selectedCount === 0 || visibleDueRooms.length === 0}
>
```

- [ ] **Bottom-Button entfernen** — den gesamten `{(() => { const selectedCount = ... return (<button className={s.addAllBtn} ...) })()} ` Block löschen (~Zeile 222–234).

- [ ] **`.addAllBtn` aus `HaushaltSection.module.css` entfernen** (nicht mehr benötigt).

- [ ] **Manuell prüfen:** Haushalt-Dashboard im Tagesplaner → „+ N hinzufügen" erscheint im Header, kein Button mehr am Ende. Klick fügt Todos hinzu.

- [ ] **Commit:**

```bash
git add src/features/tools/haushalt/HaushaltSection.jsx src/features/tools/haushalt/HaushaltSection.module.css
git commit -m "feat: HaushaltSection nutzt ToolSection onAction statt Bottom-Button"
```

---

## Task 8: ReminderSection — onAction

**Datei:** `src/features/tools/reminder/ReminderSection.jsx`

- [ ] **`selectedCount` vor dem return berechnen** — direkt vor dem `return` (~Zeile 117):

```jsx
const selectedCount = dueItems.filter(i => !deselected.has(i.id)).length
```

- [ ] **ToolSection-Aufruf anpassen:**

```jsx
<ToolSection
  toolId="reminder"
  title="Reminder"
  color={toolColor}
  onTitleClick={() => setCurrentTab(TOOL_TAB.reminder)}
  actionLabel={`+ ${selectedCount} hinzufügen`}
  onAction={handleAddSelected}
  actionDisabled={selectedCount === 0}
>
```

- [ ] **Bottom-Button entfernen** — den `{(() => { const selectedCount = ... return (<button className={s.addAllBtn} ...) })()} ` Block aus dem JSX löschen (~Zeile 171–180).

- [ ] **`.addAllBtn` aus `ReminderSection.module.css` entfernen** (nicht mehr benötigt).

- [ ] **Manuell prüfen:** Reminder-Dashboard → Header zeigt „+ N hinzufügen", kein unterer Button. Klick fügt hinzu.

- [ ] **Commit:**

```bash
git add src/features/tools/reminder/ReminderSection.jsx src/features/tools/reminder/ReminderSection.module.css
git commit -m "feat: ReminderSection nutzt ToolSection onAction statt Bottom-Button"
```

---

## Task 9: BirthdaySection — onAction

**Datei:** `src/features/tools/geburtstage/BirthdaySection.jsx`

- [ ] **`selectedCount` und `selectedChips` berechnen** — direkt vor dem `return` (~nach Zeile 43):

```jsx
const selectedChips = chips.filter(c => !deselected.has(`${c.type}-${c.birthday.id}`))
const selectedCount = selectedChips.length
```

- [ ] **ToolSection-Aufruf anpassen** — `badge` entfernen (Zahl steckt jetzt im Action-Button), `actionLabel/onAction/actionDisabled` ergänzen:

```jsx
<ToolSection
  toolId="geburtstage"
  title="Geburtstage"
  color={toolColor}
  defaultOpen
  onTitleClick={() => setCurrentTab(TOOL_TAB.geburtstage)}
  actionLabel={`+ ${selectedCount} hinzufügen`}
  onAction={() => onStartDrag?.(null, null, null, selectedChips)}
  actionDisabled={selectedCount === 0}
>
```

- [ ] **Bottom-Button entfernen** — den `{(() => { const count = ... return (<button className={s.addAllBtn} ...) })()} ` Block löschen (~Zeile 103–113).

- [ ] **`.addAllBtn` aus `BirthdaySection.module.css` entfernen**.

- [ ] **Manuell prüfen:** Geburtstags-Dashboard → Header zeigt „+ N hinzufügen", kein unterer Button. Klick fügt hinzu. Nach Hinzufügen verschwinden Chips (Task 5 greift).

- [ ] **Commit:**

```bash
git add src/features/tools/geburtstage/BirthdaySection.jsx src/features/tools/geburtstage/BirthdaySection.module.css
git commit -m "feat: BirthdaySection nutzt ToolSection onAction statt Bottom-Button"
```

---

## Task 10: kontext/tool-pattern.md — Standard-Dashboard-Template

**Datei:** `kontext/tool-pattern.md`

- [ ] **Neuen Abschnitt am Ende der Datei ergänzen:**

```markdown
---

## Standard-Dashboard-Muster (ToolSection + Section)

Jedes Tool-Dashboard im Tagesplaner folgt diesem Muster. Immer zuerst dieses Template verwenden — nicht neu erfinden.

### Aufbau

```jsx
// ToolnameSection.jsx
import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import TodoChip from '../../../components/TodoChip/TodoChip'
import s from './ToolnameSection.module.css'

export default function ToolnameSection({ onStartDrag }) {
  const { todos, setTodos, setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('toolname', toolColors)

  // ── Items laden ─────────────────────────────────────────
  const items = /* Tool-spezifische Items hier */

  // ── Duplikat-Schutz ──────────────────────────────────────
  // Items die bereits als nicht-erledigte Todos existieren ausblenden
  const pendingIds = new Set(
    todos.filter(t => t.toolnameItemId && !t.done).map(t => t.toolnameItemId)
  )
  const visibleItems = items.filter(item => !pendingIds.has(item.id))

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

1. **Duplikat-Schutz:** Jede Section filtert `visibleItems` gegen `todos` mit eigenem `toolnameItemId`-Feld.
2. **Kein Bottom-Button:** `onAction` an ToolSection übergeben — kein `addAllBtn` im Body.
3. **Button-Text:** `+ ${selectedCount} hinzufügen` — count = aktuell angewählte Items.
4. **fakeTodo:** Immer mit `toolId` stempeln damit `glowColor` in TodoChip greift.
5. **Section verschwindet** wenn `visibleItems.length === 0` (`return null`).
6. **Extra-Badge** (z.B. Prozentwert): `badge`-Prop an ToolSection — erscheint links vom Action-Button.
7. **Beim Todo-Erstellen** immer `toolnameItemId` setzen (Duplikat-Schutz-Key).
```

- [ ] **Manuell prüfen:** `kontext/tool-pattern.md` im Editor öffnen → neuer Abschnitt am Ende sichtbar.

- [ ] **Commit:**

```bash
git add kontext/tool-pattern.md
git commit -m "docs: Standard-Dashboard-Template in tool-pattern.md"
```

---

## Abschluss-Check

- [ ] Dev-Server neu starten, alle aktiven Tools im Tagesplaner durchklicken
- [ ] Haushalt: Pill-Header mit `42%` + `+ N hinzufügen`, Chips exakt wie vorher
- [ ] Reminder: Pill-Header mit `+ N hinzufügen`, Chips exakt wie vorher
- [ ] Geburtstage: Pill-Header, nach Hinzufügen verschwinden Chips
- [ ] Erfolge: Section fehlt wenn keine Erfolge vorhanden
- [ ] Kognitiv/Gewicht: Pill-Header ohne Action-Button, Badge normal
- [ ] Tool-Todos im Pool: Border-Farbe passend zum Tool
- [ ] Zwei Tools auf gleiche Farbe setzen → blockiert
- [ ] Abstände zwischen Dashboards einheitlich kleiner
