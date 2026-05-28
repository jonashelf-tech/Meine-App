# Projekte Tool — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Baue das "Projekte" Tool — Kategorien werden zu Projekten aufgewertet mit Fortschrittsbalken, geplanten Todos (showFromDate) und Abschluss-Flow.

**Architecture:** `cats[]` bleibt ein `string[]` (unveränderter Bestand). Ein neues `projects[]` im Store speichert Projekt-Metadaten (`catName`, `hidden`, `autoDelete`). Blocks bekommen `showFromDate: null`. Der Pool filtert Todos mit `showFromDate > heute` aus. Vier neue Dateien: `projektUtils.js`, `ProjektQuickAdd`, `ProjektKarte`, `TabProjekte`.

**Tech Stack:** React 18, Zustand, CSS Modules, localStorage via `sv`/`lv`/`SK` aus `src/storage/index.js`.

---

## Datei-Übersicht

**Neue Dateien:**
- `src/features/tools/projekte/projektUtils.js`
- `src/features/tools/projekte/ProjektQuickAdd.jsx` + `.module.css`
- `src/features/tools/projekte/ProjektKarte.jsx` + `.module.css`
- `src/features/tools/projekte/TabProjekte.jsx` + `.module.css`

**Geänderte Dateien:**
- `src/features/todos/Block.js` — `showFromDate: null` in `createBlock`
- `src/features/calendar/Pool/Pool.jsx` — Filter für `showFromDate`
- `src/storage/index.js` — `SK.projects`
- `src/store/index.js` — `projects` + `setProjects`
- `src/features/tools/toolRegistry.jsx` — Projekte-Eintrag
- `src/features/tools/toolTabs.js` — `projekte: 17`
- `src/App.jsx` — Import + Render von TabProjekte

---

## Task 1: showFromDate in createBlock + Pool-Filter

**Files:**
- Modify: `src/features/todos/Block.js`
- Modify: `src/features/calendar/Pool/Pool.jsx`

- [ ] **Schritt 1: showFromDate zu createBlock hinzufügen**

In `src/features/todos/Block.js` die gesamte `createBlock`-Funktion ersetzen:

```js
export const createBlock = (partial = {}) => ({
  id:                    genId(),
  text:                  '',
  color:                 '#8B5CF6',
  priority:              3,
  duration:              null,
  done:                  false,
  doneAt:                null,
  date:                  null,
  time:                  null,
  repeat:                null,
  awaitingClockResponse: false,
  subItems:              [],
  category:              null,
  notes:                 null,
  showFromDate:          null,   // "2026-06-15" — Todo erst ab diesem Datum im Pool sichtbar
  createdAt:             new Date().toISOString(),
  toolId:                null,
  haushaltTaskIds:       [],
  haushaltRoomId:        null,
  ...partial,
})
```

- [ ] **Schritt 2: Pool-Filter für showFromDate**

In `src/features/calendar/Pool/Pool.jsx` die `activePool` `useMemo`-Berechnung (aktuell ca. Zeile 143–147) ersetzen:

```js
const activePool = useMemo(() => {
  const today  = todayKey()
  const undone = todos
    .filter(t => !t.done)
    .filter(t => !isTermin(t))
    .filter(t => !t.showFromDate || t.showFromDate <= today)
    .filter(t => !isPlaced(t))
  const pending = todos.filter(t => t.done && pendingDoneIds.has(t.id))
  return [...sortTodos(undone, sort), ...pending]
}, [todos, pendingDoneIds, sort, isPlaced])
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/todos/Block.js src/features/calendar/Pool/Pool.jsx
git commit -m "feat: Block.showFromDate + Pool-Filter für geplante Todos"
```

---

## Task 2: Storage Key + Store

**Files:**
- Modify: `src/storage/index.js`
- Modify: `src/store/index.js`

- [ ] **Schritt 1: SK.projects hinzufügen**

In `src/storage/index.js`, im `SK`-Objekt nach `lastAutoBackup` die neue Zeile einfügen:

```js
  lastAutoBackup:  `${PREFIX}last_auto_backup`,
  projects:        `${PREFIX}projects`,
```

- [ ] **Schritt 2: projects-Slice in den Store**

In `src/store/index.js` nach der Zeile `cats: lv(SK.cats, []),` einfügen:

```js
  projects:  lv(SK.projects, []),
```

Nach der Zeile `setCats: (cats) => { set({ cats }); sv(SK.cats, cats) },` einfügen:

```js
  setProjects: (projects) => { set({ projects }); sv(SK.projects, projects) },
```

- [ ] **Schritt 3: Commit**

```bash
git add src/storage/index.js src/store/index.js
git commit -m "feat: SK.projects + Store-Slice für Projekte"
```

---

## Task 3: projektUtils.js

**Files:**
- Create: `src/features/tools/projekte/projektUtils.js`

- [ ] **Schritt 1: Datei erstellen**

```js
// src/features/tools/projekte/projektUtils.js
import { todayKey } from '../../../utils'

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/** Neues Projekt-Objekt erzeugen */
export function createProject(catName) {
  return { id: genId(), catName, hidden: false, autoDelete: false }
}

/** Alle Todos einer Kategorie */
export function getProjectTodos(todos, catName) {
  return todos.filter(t => t.category === catName)
}

/** Fortschritt: { done, total } — inkl. geplante Todos */
export function getProgress(projectTodos) {
  return {
    done:  projectTodos.filter(t => t.done).length,
    total: projectTodos.length,
  }
}

/** True wenn Todo heute aktiv ist (showFromDate erreicht oder nicht gesetzt) */
export function isTodoActive(block) {
  return !block.showFromDate || block.showFromDate <= todayKey()
}

/**
 * Projekt abschließen:
 * - category → null auf allen Projekt-Todos
 * - catName aus cats entfernen
 * - Projekt aus projects entfernen
 */
export function closeProject({ catName, cats, projects, setTodos, setCats, setProjects }) {
  setTodos(prev => prev.map(t => t.category === catName ? { ...t, category: null } : t))
  setCats(cats.filter(c => c !== catName))
  setProjects(projects.filter(p => p.catName !== catName))
}

/**
 * Aus Projekten entfernen (Todos + Kategorie bleiben erhalten):
 */
export function deleteProject({ catName, projects, setProjects }) {
  setProjects(projects.filter(p => p.catName !== catName))
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/features/tools/projekte/projektUtils.js
git commit -m "feat: projektUtils — Hilfsfunktionen für Projekte-Tool"
```

---

## Task 4: ProjektQuickAdd

**Files:**
- Create: `src/features/tools/projekte/ProjektQuickAdd.jsx`
- Create: `src/features/tools/projekte/ProjektQuickAdd.module.css`

- [ ] **Schritt 1: ProjektQuickAdd.jsx**

```jsx
// src/features/tools/projekte/ProjektQuickAdd.jsx
import { useState } from 'react'
import { createBlock } from '../../todos/Block'
import s from './ProjektQuickAdd.module.css'

const PlusIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

export default function ProjektQuickAdd({ catName, onAdd }) {
  const [text,         setText]         = useState('')
  const [showDate,     setShowDate]     = useState(false)
  const [showFromDate, setShowFromDate] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(createBlock({
      text:         trimmed,
      category:     catName,
      showFromDate: showDate && showFromDate ? showFromDate : null,
    }))
    setText('')
    setShowFromDate('')
    setShowDate(false)
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.row}>
        <input
          className={s.input}
          placeholder="Todo hinzufügen…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button type="submit" className={s.addBtn} aria-label="Hinzufügen">
          <PlusIcon />
        </button>
      </div>

      <button
        type="button"
        className={[s.dateToggle, showDate ? s.dateToggleActive : ''].join(' ')}
        onClick={() => setShowDate(v => !v)}
      >
        {showDate ? 'Datum entfernen' : 'Erst ab Datum anzeigen'}
      </button>

      {showDate && (
        <input
          type="date"
          className={s.dateInput}
          value={showFromDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={e => setShowFromDate(e.target.value)}
        />
      )}
    </form>
  )
}
```

- [ ] **Schritt 2: ProjektQuickAdd.module.css**

```css
/* src/features/tools/projekte/ProjektQuickAdd.module.css */
.form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0 2px;
  border-top: 1px solid var(--border);
  margin-top: 8px;
}

.row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  padding: 8px 10px;
  outline: none;
  min-width: 0;
}
.input:focus { border-color: var(--primary); }
.input::placeholder { color: var(--text-dim); }

.addBtn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  border: none;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dateToggle {
  background: none;
  border: 1px dashed var(--border);
  border-radius: var(--r-sm);
  color: var(--text-dim);
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  padding: 5px 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, color 0.15s;
}
.dateToggleActive { border-color: var(--primary); color: var(--primary); }

.dateInput {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  padding: 8px 10px;
  width: 100%;
  box-sizing: border-box;
  outline: none;
}
.dateInput:focus { border-color: var(--primary); }
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/tools/projekte/ProjektQuickAdd.jsx src/features/tools/projekte/ProjektQuickAdd.module.css
git commit -m "feat: ProjektQuickAdd — Inline Todo-Erstellung mit showFromDate"
```

---

## Task 5: ProjektKarte

**Files:**
- Create: `src/features/tools/projekte/ProjektKarte.jsx`
- Create: `src/features/tools/projekte/ProjektKarte.module.css`

- [ ] **Schritt 1: ProjektKarte.jsx**

```jsx
// src/features/tools/projekte/ProjektKarte.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getProjectTodos, getProgress, isTodoActive, closeProject, deleteProject } from './projektUtils'
import ProjektQuickAdd from './ProjektQuickAdd'
import s from './ProjektKarte.module.css'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  return `${parseInt(day)}. ${months[parseInt(month) - 1]}`
}

const MenuIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
)

const CheckIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const ChevronIcon = ({ up }) => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

export default function ProjektKarte({ project, todos, setTodos, cats, setCats, projects, setProjects }) {
  const { id: projectId, catName, autoDelete } = project

  const [menuOpen,      setMenuOpen]      = useState(false)
  const [doneCollapsed, setDoneCollapsed] = useState(true)
  const [closing,       setClosing]       = useState(false)

  // Ref für aktuelle Werte in setTimeout (vermeidet stale closures)
  const latestRef = useRef({})
  latestRef.current = { catName, cats, projects, setTodos, setCats, setProjects }

  const projectTodos = useMemo(() => getProjectTodos(todos, catName), [todos, catName])
  const activeTodos  = useMemo(() => projectTodos.filter(t => !t.done &&  isTodoActive(t)), [projectTodos])
  const futureTodos  = useMemo(() => projectTodos.filter(t => !t.done && !isTodoActive(t)), [projectTodos])
  const doneTodos    = useMemo(() => projectTodos.filter(t => t.done),                      [projectTodos])

  const { done, total } = useMemo(() => getProgress(projectTodos), [projectTodos])
  const allDone = total > 0 && activeTodos.length === 0 && futureTodos.length === 0
  const pct     = total === 0 ? 0 : Math.round((done / total) * 100)

  // Auto-delete wenn alle Todos erledigt
  useEffect(() => {
    if (!allDone || !autoDelete || closing) return
    setClosing(true)
    const timer = setTimeout(() => {
      const r = latestRef.current
      closeProject({ catName: r.catName, cats: r.cats, projects: r.projects, setTodos: r.setTodos, setCats: r.setCats, setProjects: r.setProjects })
    }, 1200)
    return () => clearTimeout(timer)
  }, [allDone, autoDelete, closing])

  const handleToggle = useCallback((todoId) => {
    setTodos(prev => prev.map(t =>
      t.id === todoId
        ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null }
        : t
    ))
  }, [setTodos])

  const handleAdd = useCallback((block) => {
    setTodos(prev => [...prev, block])
  }, [setTodos])

  const handleHide = useCallback(() => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, hidden: !p.hidden } : p))
    setMenuOpen(false)
  }, [projects, projectId, setProjects])

  const handleAutoDeleteToggle = useCallback(() => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, autoDelete: !p.autoDelete } : p))
    setMenuOpen(false)
  }, [projects, projectId, setProjects])

  const handleClose = useCallback(() => {
    setMenuOpen(false)
    closeProject({ catName, cats, projects, setTodos, setCats, setProjects })
  }, [catName, cats, projects, setTodos, setCats, setProjects])

  const handleDelete = useCallback(() => {
    setMenuOpen(false)
    deleteProject({ catName, projects, setProjects })
  }, [catName, projects, setProjects])

  return (
    <div className={[s.card, closing ? s.cardClosing : ''].join(' ')}>

      {/* Header */}
      <div className={s.header}>
        <span className={s.title}>{catName}</span>
        <button className={s.menuBtn} onClick={() => setMenuOpen(v => !v)} aria-label="Menü">
          <MenuIcon />
        </button>
      </div>

      {/* Kontextmenü */}
      {menuOpen && (
        <>
          <div className={s.menuOverlay} onClick={() => setMenuOpen(false)} />
          <div className={s.menu}>
            <button className={s.menuItem} onClick={handleHide}>
              {project.hidden ? 'Einblenden' : 'Ausblenden'}
            </button>
            <button className={s.menuItem} onClick={handleAutoDeleteToggle}>
              Auto-Abschluss: {autoDelete ? 'An ✓' : 'Aus'}
            </button>
            <button className={s.menuItem} onClick={handleClose}>
              Projekt abschließen
            </button>
            <button className={[s.menuItem, s.menuItemDanger].join(' ')} onClick={handleDelete}>
              Aus Projekten entfernen
            </button>
          </div>
        </>
      )}

      {/* Fortschrittsbalken */}
      <div className={s.progressRow}>
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={s.progressLabel}>{done}/{total}</span>
      </div>

      {/* Abschluss-Banner */}
      {allDone && !autoDelete && !closing && (
        <div className={s.doneBanner}>
          <span>Alle Todos erledigt!</span>
          <button className={s.closeProjBtn} onClick={handleClose}>Abschließen</button>
        </div>
      )}
      {closing && (
        <div className={s.doneBanner}>
          <span>Wird abgeschlossen…</span>
        </div>
      )}

      {/* Todo-Liste */}
      <div className={s.todoList}>

        {/* Aktive Todos */}
        {activeTodos.map(t => (
          <button key={t.id} className={s.todoRow} onClick={() => handleToggle(t.id)}>
            <span className={s.checkbox} />
            <span className={s.todoText}>{t.text}</span>
          </button>
        ))}

        {/* Geplante Todos (ausgegraut) */}
        {futureTodos.map(t => (
          <div key={t.id} className={s.todoRowFuture}>
            <span className={s.checkbox} />
            <span className={s.todoTextFuture}>{t.text}</span>
            <span className={s.futureBadge}>ab {formatDate(t.showFromDate)}</span>
          </div>
        ))}

        {/* Erledigte Todos (eingeklappt) */}
        {doneTodos.length > 0 && (
          <div className={s.doneSection}>
            <button
              className={s.doneSectionBtn}
              onClick={() => setDoneCollapsed(v => !v)}
            >
              <ChevronIcon up={!doneCollapsed} />
              {doneTodos.length} erledigt
            </button>
            {!doneCollapsed && doneTodos.map(t => (
              <button key={t.id} className={s.todoRow} onClick={() => handleToggle(t.id)}>
                <span className={[s.checkbox, s.checkboxDone].join(' ')}>
                  <CheckIcon />
                </span>
                <span className={[s.todoText, s.todoTextDone].join(' ')}>{t.text}</span>
              </button>
            ))}
          </div>
        )}

        {projectTodos.length === 0 && (
          <p className={s.emptyHint}>Noch keine Todos — füge welche hinzu</p>
        )}
      </div>

      {/* QuickAdd */}
      <ProjektQuickAdd catName={catName} onAdd={handleAdd} />
    </div>
  )
}
```

- [ ] **Schritt 2: ProjektKarte.module.css**

```css
/* src/features/tools/projekte/ProjektKarte.module.css */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  animation: fadeInUp 0.2s ease both;
}

.cardClosing {
  opacity: 0;
  transform: scale(0.96);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.title {
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menuBtn {
  width: 32px;
  height: 32px;
  border-radius: var(--r-sm);
  border: none;
  background: none;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.menuBtn:hover { background: rgba(255,255,255,0.06); }

/* ── Kontextmenü ── */
.menuOverlay {
  position: fixed;
  inset: 0;
  z-index: 10;
}

.menu {
  position: absolute;
  top: 40px;
  right: 14px;
  z-index: 11;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  min-width: 200px;
}

.menuItem {
  display: block;
  width: 100%;
  padding: 11px 14px;
  background: none;
  border: none;
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}
.menuItem:hover { background: rgba(255,255,255,0.05); }

.menuItemDanger { color: var(--rose); }

/* ── Fortschrittsbalken ── */
.progressRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progressBar {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 99px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--primary);
  border-radius: 99px;
  transition: width 0.4s ease;
}

.progressLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Abschluss-Banner ── */
.doneBanner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(16,185,129,0.12);
  border: 1px solid rgba(16,185,129,0.3);
  border-radius: var(--r-sm);
  padding: 8px 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  color: var(--emerald);
}

.closeProjBtn {
  background: var(--emerald);
  color: #000;
  border: none;
  border-radius: var(--r-sm);
  padding: 4px 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

/* ── Todo-Liste ── */
.todoList {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.todoRow {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 4px;
  background: none;
  border: none;
  border-radius: var(--r-sm);
  cursor: pointer;
  text-align: left;
}
.todoRow:hover { background: rgba(255,255,255,0.04); }

.todoRowFuture {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 4px;
}

.checkbox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkboxDone {
  background: var(--emerald);
  border-color: var(--emerald);
  color: #fff;
}

.todoText {
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--text);
  flex: 1;
  min-width: 0;
}

.todoTextDone {
  color: var(--text-dim);
  text-decoration: line-through;
}

.todoTextFuture {
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--text-dim);
  flex: 1;
  min-width: 0;
}

.futureBadge {
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  color: var(--text-dim);
  background: rgba(255,255,255,0.06);
  border-radius: 99px;
  padding: 2px 7px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Erledigte Section ── */
.doneSection {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid var(--border);
  padding-top: 6px;
  margin-top: 4px;
}

.doneSectionBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-dim);
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 4px;
  text-align: left;
}

.emptyHint {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  color: var(--text-dim);
  text-align: center;
  padding: 8px 0 4px;
  margin: 0;
}
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/tools/projekte/ProjektKarte.jsx src/features/tools/projekte/ProjektKarte.module.css
git commit -m "feat: ProjektKarte — Projektkarte mit Fortschritt, Todos und Menü"
```

---

## Task 6: TabProjekte

**Files:**
- Create: `src/features/tools/projekte/TabProjekte.jsx`
- Create: `src/features/tools/projekte/TabProjekte.module.css`

- [ ] **Schritt 1: TabProjekte.jsx**

```jsx
// src/features/tools/projekte/TabProjekte.jsx
import { useState } from 'react'
import { useAppStore } from '../../../store'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import ProjektKarte from './ProjektKarte'
import { createProject } from './projektUtils'
import s from './TabProjekte.module.css'

const ProjektIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
  </svg>
)

export default function TabProjekte({ onBack }) {
  const { todos, setTodos, cats, setCats, projects, setProjects } = useAppStore()
  const [creating,   setCreating]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const visibleProjects = projects.filter(p => !p.hidden)
  const hiddenProjects  = projects.filter(p => p.hidden)

  const handleCreate = (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (!cats.includes(name)) setCats([...cats, name])
    setProjects([...projects, createProject(name)])
    setNewName('')
    setCreating(false)
  }

  const sharedProps = { todos, setTodos, cats, setCats, projects, setProjects }

  return (
    <div className={s.wrap}>
      <ToolHeader onBack={onBack} icon={<ProjektIcon />} eyebrow="Tool" title="Projekte" />

      <div className={s.content}>

        {/* Neues Projekt erstellen */}
        {!creating ? (
          <button className={s.createBtn} onClick={() => setCreating(true)}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neues Projekt
          </button>
        ) : (
          <form className={s.createForm} onSubmit={handleCreate}>
            <input
              className={s.createInput}
              placeholder="Projektname…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
            <div className={s.createActions}>
              <button type="submit" className={s.createSubmit}>Erstellen</button>
              <button type="button" className={s.createCancel} onClick={() => { setCreating(false); setNewName('') }}>
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {/* Sichtbare Projekte */}
        {visibleProjects.length === 0 && !creating && (
          <p className={s.empty}>Noch keine Projekte.<br />Erstelle dein erstes!</p>
        )}
        {visibleProjects.map(project => (
          <ProjektKarte key={project.id} project={project} {...sharedProps} />
        ))}

        {/* Ausgeblendete Projekte */}
        {hiddenProjects.length > 0 && (
          <div className={s.hiddenSection}>
            <button
              className={s.hiddenToggle}
              onClick={() => setShowHidden(v => !v)}
            >
              Ausgeblendet ({hiddenProjects.length})
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showHidden ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showHidden && hiddenProjects.map(project => (
              <ProjektKarte key={project.id} project={project} {...sharedProps} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: TabProjekte.module.css**

```css
/* src/features/tools/projekte/TabProjekte.module.css */
.wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Erstellen ── */
.createBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  background: rgba(139,92,246,0.1);
  border: 1px dashed rgba(139,92,246,0.4);
  border-radius: var(--r);
  color: var(--primary);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.createBtn:hover { background: rgba(139,92,246,0.16); }

.createForm {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.createInput {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  padding: 10px 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.createInput:focus { border-color: var(--primary); }
.createInput::placeholder { color: var(--text-dim); }

.createActions {
  display: flex;
  gap: 8px;
}

.createSubmit {
  flex: 1;
  padding: 10px;
  background: var(--primary);
  border: none;
  border-radius: var(--r-sm);
  color: #fff;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.createCancel {
  flex: 1;
  padding: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-dim);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  cursor: pointer;
}

/* ── Leer-State ── */
.empty {
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--text-dim);
  text-align: center;
  line-height: 1.6;
  padding: 24px 0;
  margin: 0;
}

/* ── Ausgeblendete Projekte ── */
.hiddenSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.hiddenToggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-dim);
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/tools/projekte/TabProjekte.jsx src/features/tools/projekte/TabProjekte.module.css
git commit -m "feat: TabProjekte — Hauptansicht des Projekte-Tools"
```

---

## Task 7: Tool-Registration

**Files:**
- Modify: `src/features/tools/toolRegistry.jsx`
- Modify: `src/features/tools/toolTabs.js`
- Modify: `src/App.jsx`

- [ ] **Schritt 1: Icon + Eintrag in toolRegistry.jsx**

In `src/features/tools/toolRegistry.jsx` im `ICONS`-Objekt nach dem letzten Eintrag (`kognitiv`) hinzufügen:

```js
  projekte: { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="12" y1="11" x2="12" y2="17"/></svg> },
```

Im `TOOL_REGISTRY`-Array nach dem letzten Eintrag (`kognitiv`) hinzufügen:

```js
  {
    id:          'projekte',
    name:        'Projekte',
    icon:        '📁',
    color:       '#8B5CF6',
    description: 'Kategorien als Projekte mit Fortschritt und geplanten Todos',
    standalone:  true,
    integrated:  false,
  },
```

- [ ] **Schritt 2: TOOL_TAB erweitern**

In `src/features/tools/toolTabs.js` nach `kognitiv: 16,` hinzufügen:

```js
  projekte: 17,
```

- [ ] **Schritt 3: Import und Render in App.jsx**

Nach der letzten Import-Zeile (`import TabKognitiv`) folgende Zeile hinzufügen:

```js
import TabProjekte     from './features/tools/projekte/TabProjekte'
```

Nach der letzten Render-Zeile (`{currentTab === TOOL_TAB.kognitiv && <TabKognitiv onBack={goBack} />}`) hinzufügen:

```jsx
        {currentTab === TOOL_TAB.projekte     && <TabProjekte     onBack={goBack} />}
```

- [ ] **Schritt 4: App starten und testen**

```bash
npm run dev
```

Folgendes prüfen:
1. Unter Tools → "Projekte" erscheint und lässt sich aktivieren
2. Projekte-Tab öffnet sich mit leerem State und "Neues Projekt"-Button
3. Neues Projekt erstellen → erscheint als Karte
4. Todo im Projekt hinzufügen → erscheint in der Karte
5. Todo mit `showFromDate` morgen → ausgegraut mit "ab X. Mon"
6. Todo ohne showFromDate → erscheint im normalen Pool
7. Todo mit showFromDate → erscheint NICHT im normalen Pool
8. Todo abhaken → Fortschrittsbalken aktualisiert sich
9. Projekt abschließen → verschwindet aus Projekten, Todos bleiben im Pool (ohne Kategorie)

- [ ] **Schritt 5: Commit**

```bash
git add src/features/tools/toolRegistry.jsx src/features/tools/toolTabs.js src/App.jsx
git commit -m "feat: Projekte-Tool registrieren + in App verdrahten"
```
