# Pool UX + Einheitliches Todo-Modal — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pool-Header UX verbessern (Label, Collapse, Auto-Scroll beim Drag) und AddTodoModal + EditModal zu einem einheitlichen TodoModal zusammenführen.

**Architecture:** Pool.jsx und useDragDrop.js werden direkt erweitert. Das neue `TodoModal` ersetzt beide alten Modals vollständig — gleiche Props-Schnittstelle, ein einziger Einstiegspunkt. Kategorien werden global aus dem bereits existierenden `cats`-Store gelesen/geschrieben.

**Tech Stack:** React 18, Zustand, CSS Modules, Vite PWA

---

## Dateien-Übersicht

| Aktion | Datei |
|---|---|
| Modify | `src/features/calendar/Pool/Pool.jsx` |
| Modify | `src/features/calendar/Pool/Pool.module.css` |
| Modify | `src/hooks/useDragDrop.js` |
| **Create** | `src/components/TodoModal/TodoModal.jsx` |
| **Create** | `src/components/TodoModal/TodoModal.module.css` |
| Modify | `src/App.jsx` |
| Modify | `src/features/calendar/TabHeute/TabHeute.jsx` |
| Delete | `src/components/AddTodoModal/AddTodoModal.jsx` |
| Delete | `src/components/AddTodoModal/AddTodoModal.module.css` |
| Delete | `src/components/EditModal/EditModal.jsx` |
| Delete | `src/components/EditModal/EditModal.module.css` |

---

## Task 1: Pool — Label + Collapse UX (B1 + B3)

**Files:**
- Modify: `src/features/calendar/Pool/Pool.jsx`
- Modify: `src/features/calendar/Pool/Pool.module.css`

- [ ] **Schritt 1: Header-Div tippbar machen und Label umbenennen**

In `Pool.jsx`, den gesamten `<div className={s.header}>` durch folgendes ersetzen:

```jsx
<div
  className={s.header}
  onClick={() => setCollapsed(v => !v)}
  role="button"
  aria-expanded={!collapsed}
>
  <span className={s.poolLabel}>Todos</span>

  {collapsed && activePool.length > 0 && (
    <span className={s.countBadge}>{activePool.length} offen</span>
  )}

  {!collapsed && (
    <div className={s.sortRow} onClick={e => e.stopPropagation()}>
      {[
        { key: 'standard',  label: 'Standard'  },
        { key: 'kategorie', label: 'Kategorie' },
        { key: 'alter',     label: 'Alter'     },
      ].map(({ key, label }) => (
        <button
          key={key}
          className={[s.sortChip, sort === key ? s.sortChipActive : ''].join(' ')}
          onClick={() => handleSort(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )}

  <span className={[s.chevron, collapsed ? s.chevronCollapsed : ''].join(' ')}>▾</span>
</div>
```

Hinweis: Der alte `<button className={s.collapseBtn}>` und sein `<span>` werden entfernt — der Chevron ist jetzt ein einfaches `<span>` direkt im Header.

- [ ] **Schritt 2: CSS anpassen in `Pool.module.css`**

Folgende Klassen hinzufügen/ersetzen:

```css
.header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
  /* bestehende border-bottom etc. beibehalten */
}

.countBadge {
  background: rgba(139, 92, 246, 0.18);
  color: #8B5CF6;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 9px;
  flex-shrink: 0;
}

/* collapseBtn-Klasse kann entfernt werden — wird nicht mehr verwendet */
```

Den `.chevron` und `.chevronCollapsed` im CSS so lassen wie sie sind (Transform-Rotation).

- [ ] **Schritt 3: Manuell testen**

App starten (`npm run dev`). Im Tagesplaner-Tab:
- Tap auf den Header-Bereich → Pool klappt ein/aus ✓
- Sort-Chips tippbar ohne Collapse zu triggern ✓
- Wenn collapsed: Badge "X offen" erscheint ✓
- Label zeigt "Todos" statt "Pool" ✓

- [ ] **Schritt 4: Commit**

```bash
git add src/features/calendar/Pool/Pool.jsx src/features/calendar/Pool/Pool.module.css
git commit -m "feat(pool): label Todos, header-collapse, count badge"
```

---

## Task 2: Auto-Scroll beim Drag (B2)

**Files:**
- Modify: `src/hooks/useDragDrop.js`

- [ ] **Schritt 1: Scroll-Konstanten und Ref hinzufügen**

Am Anfang von `startDrag`, direkt nach `e.preventDefault()`:

```js
const SCROLL_ZONE = 80  // px vom Viewport-Rand
const MAX_SPEED   = 10  // px pro Frame
let scrollRafId   = null

const stopScroll = () => {
  if (scrollRafId !== null) {
    cancelAnimationFrame(scrollRafId)
    scrollRafId = null
  }
}

const scrollStep = (speed) => {
  window.scrollBy(0, speed)
  scrollRafId = requestAnimationFrame(() => scrollStep(speed))
}
```

- [ ] **Schritt 2: Auto-Scroll in pointermove einhängen**

In der `mv`-Funktion, nach dem Ghost-Positionieren und Highlight-Logik, am Ende des Funktionskörpers hinzufügen:

```js
const vh = window.innerHeight
if (cy < SCROLL_ZONE) {
  stopScroll()
  const speed = -Math.round(((SCROLL_ZONE - cy) / SCROLL_ZONE) * MAX_SPEED)
  scrollStep(speed)
} else if (cy > vh - SCROLL_ZONE) {
  stopScroll()
  const speed = Math.round(((cy - (vh - SCROLL_ZONE)) / SCROLL_ZONE) * MAX_SPEED)
  scrollStep(speed)
} else {
  stopScroll()
}
```

- [ ] **Schritt 3: Scroll stoppen bei pointerup**

In der `up`-Funktion, als erste Zeile nach dem Öffnen:

```js
stopScroll()
```

Der vollständige Diff für `useDragDrop.js` — die `startDrag`-Funktion sieht danach so aus:

```js
const startDrag = (text, color, onDrop, e) => {
  e.preventDefault()

  const SCROLL_ZONE = 80
  const MAX_SPEED   = 10
  let scrollRafId   = null

  const stopScroll = () => {
    if (scrollRafId !== null) {
      cancelAnimationFrame(scrollRafId)
      scrollRafId = null
    }
  }

  const scrollStep = (speed) => {
    window.scrollBy(0, speed)
    scrollRafId = requestAnimationFrame(() => scrollStep(speed))
  }

  // Ghost-Element das dem Finger folgt
  const ghost = document.createElement('div')
  ghost.innerHTML =
    `<div style="width:3px;min-width:3px;align-self:stretch;background:${color};flex-shrink:0;"></div>` +
    `<span style="flex:1;padding:6px 10px;font-size:0.8rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">${text}</span>`
  ghost.style.cssText =
    'position:fixed;z-index:9999;display:flex;align-items:center;' +
    `border-radius:8px;background:rgba(7,7,14,0.97);border:1px solid ${color}55;` +
    `color:#fff;font-family:'Outfit',sans-serif;pointer-events:none;opacity:0.96;` +
    `box-shadow:0 4px 20px ${color}44;overflow:hidden;`
  document.body.appendChild(ghost)

  const mv = ev => {
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
    ghost.style.left = `${cx + 10}px`
    ghost.style.top  = `${cy - 14}px`
    Object.values(halfRefs.current).forEach(({ el, type }) => {
      if (!el) return
      const rc   = el.getBoundingClientRect()
      const over = cx >= rc.left && cx <= rc.right && cy >= rc.top && cy <= rc.bottom
      el.classList.remove('dnd-half-over', 'dnd-half-locked')
      if (over) el.classList.add(type === 'locked' || type === 'occupied' ? 'dnd-half-locked' : 'dnd-half-over')
    })

    const vh = window.innerHeight
    if (cy < SCROLL_ZONE) {
      stopScroll()
      const speed = -Math.round(((SCROLL_ZONE - cy) / SCROLL_ZONE) * MAX_SPEED)
      scrollStep(speed)
    } else if (cy > vh - SCROLL_ZONE) {
      stopScroll()
      const speed = Math.round(((cy - (vh - SCROLL_ZONE)) / SCROLL_ZONE) * MAX_SPEED)
      scrollStep(speed)
    } else {
      stopScroll()
    }
  }

  const up = ev => {
    stopScroll()
    const cx = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX
    const cy = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY
    document.removeEventListener('pointermove', mv)
    document.removeEventListener('pointerup', up)
    ghost.remove()
    let dropped = false
    for (const [key, { el, type }] of Object.entries(halfRefs.current)) {
      if (!el) continue
      el.classList.remove('dnd-half-over', 'dnd-half-locked')
      if (dropped || type !== 'empty') continue
      const rc = el.getBoundingClientRect()
      if (cx >= rc.left && cx <= rc.right && cy >= rc.top && cy <= rc.bottom) {
        onDrop(key)
        dropped = true
      }
    }
  }

  document.addEventListener('pointermove', mv, { passive: false })
  document.addEventListener('pointerup', up)
}
```

- [ ] **Schritt 4: Manuell testen**

App starten. Viele Todos erstellen damit die Liste lang wird. Ein Todo aus dem Pool ziehen und Finger an den oberen Bildschirmrand bewegen → Seite scrollt nach oben zu den Zeitplan-Slots ✓. Finger in Mitte → Scroll stoppt ✓. Loslassen → Ghost verschwindet, Scroll stoppt ✓.

- [ ] **Schritt 5: Commit**

```bash
git add src/hooks/useDragDrop.js
git commit -m "feat(drag): auto-scroll near viewport edges during drag"
```

---

## Task 3: TodoModal — Grundstruktur

**Files:**
- Create: `src/components/TodoModal/TodoModal.jsx`
- Create: `src/components/TodoModal/TodoModal.module.css`

- [ ] **Schritt 1: CSS-Datei anlegen**

`src/components/TodoModal/TodoModal.module.css` — als Basis den Inhalt von `AddTodoModal.module.css` kopieren. Zusätzlich diese Klassen ergänzen:

```css
/* Count Badge im Pool-Header — wird hier nicht gebraucht */

/* Kategorie */
.catWrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.catChips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.catChip {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  color: rgba(255,255,255,0.45);
  font-size: 0.75rem;
  padding: 4px 10px;
  cursor: pointer;
  font-family: inherit;
}
.catChipActive {
  background: rgba(139,92,246,0.2);
  border-color: rgba(139,92,246,0.4);
  color: #8B5CF6;
  font-weight: 600;
}
.catChipDel {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 20px;
  color: rgba(255,255,255,0.5);
  font-size: 0.75rem;
  padding: 4px 6px 4px 10px;
  font-family: inherit;
}
.catChipRm {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(251,113,133,0.2);
  border: 1px solid rgba(251,113,133,0.35);
  color: #FB7185;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.catEditBtn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.3);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  font-family: inherit;
}
.catEditBtnActive {
  background: rgba(139,92,246,0.2);
  border-color: rgba(139,92,246,0.4);
  color: #8B5CF6;
}
.catManageRow {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 0 0 2px;
}
.catNewInput {
  flex: 1;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(139,92,246,0.3);
  border-radius: 8px;
  color: rgba(255,255,255,0.85);
  font-size: 0.82rem;
  font-family: inherit;
  padding: 5px 10px;
}
.catAddBtn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(139,92,246,0.2);
  border: 1px solid rgba(139,92,246,0.4);
  color: #8B5CF6;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  font-family: inherit;
}
.catEmpty {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.2);
  font-style: italic;
}

/* Dauer-Buttons */
.durBtnRow {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.durBtn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: rgba(255,255,255,0.4);
  font-size: 0.72rem;
  font-family: inherit;
  padding: 4px 7px;
  cursor: pointer;
}
.durBtnActive {
  background: rgba(139,92,246,0.2);
  border-color: rgba(139,92,246,0.4);
  color: #8B5CF6;
}
.durFreeInput {
  width: 48px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: rgba(255,255,255,0.6);
  font-size: 0.72rem;
  font-family: inherit;
  padding: 4px 6px;
  text-align: center;
}
.durUnit {
  font-size: 0.68rem;
  color: rgba(255,255,255,0.25);
}
```

- [ ] **Schritt 2: TodoModal.jsx — Grundgerüst anlegen**

```jsx
import { useState } from 'react'
import { useAppStore } from '../../store'
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset'
import { createBlock } from '../../features/todos/Block'
import { parseHHMM, minutesToSk, NEON } from '../../utils'
import s from './TodoModal.module.css'

// ─── Konstanten ──────────────────────────────────────────────
const DUR_PRESETS = [
  { label: '5',  value: 5  },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '60', value: 60 },
  { label: '90', value: 90 },
  { label: '2h', value: 120 },
]

const WDAYS = ['So','Mo','Di','Mi','Do','Fr','Sa']
const ROUTINE_HOURS = Array.from({ length: 19 }, (_, i) => i + 5)

const TYPES = [
  { id: 'todo',    label: 'Todo',    color: '#00CFFF' },
  { id: 'termin',  label: 'Termin',  color: '#FF2D78' },
  { id: 'routine', label: 'Routine', color: '#BF00FF' },
  { id: 'vorlage', label: 'Vorlage', color: '#00FF94' },
]

// ─── Typ aus bestehendem Todo ableiten ───────────────────────
function detectType(todo) {
  if (!todo) return 'todo'
  if (todo.isTemplate) return 'vorlage'
  if (todo.time)       return 'termin'
  return 'todo'
}

// ─── Auto-Parser (aus AddTodoModal übernommen) ───────────────
const _dk = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function parseTodoText(raw) {
  let text = raw.trim()
  let date = null, time = null, duration = null, priority = 3
  const today = new Date()

  if (/\b(dringend|wichtig|asap|sofort|urgent)\b/i.test(text)) priority = 1
  else if (/\b(sollte|bald|soon)\b/i.test(text)) priority = 2
  text = text.replace(/\b(dringend|wichtig|asap|sofort|urgent|sollte|bald|soon)\b/gi, '')

  if (/\bmorgen\b/i.test(text)) { const d = new Date(today); d.setDate(d.getDate()+1); date = _dk(d) }
  else if (/\bübermorgen\b/i.test(text)) { const d = new Date(today); d.setDate(d.getDate()+2); date = _dk(d) }
  else if (/\bheute\b/i.test(text)) { date = _dk(today) }

  const WD = ['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag']
  WD.forEach((w, i) => {
    if (new RegExp('\\b'+w+'\\b','i').test(text)) {
      const d = new Date(today); const diff = (i - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + diff); date = _dk(d)
    }
  })

  const dm = text.match(/(\d{1,2})\.(\d{1,2})\.?/)
  if (dm) { const d = new Date(today.getFullYear(), parseInt(dm[2])-1, parseInt(dm[1])); date = _dk(d) }

  text = text.replace(/\b(morgen|übermorgen|heute|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
  text = text.replace(/\d{1,2}\.\d{1,2}\.?/g, '')

  const tm = text.match(/(\d{1,2})[:\.](\d{2})\s*(?:uhr)?/i) || text.match(/(\d{1,2})\s*uhr/i)
  if (tm) {
    const h = parseInt(tm[1]), m = tm[2] ? parseInt(tm[2]) : 0
    time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
    text = text.replace(tm[0], '')
  }

  const dr = text.match(/(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|min|minuten?)/i)
  if (dr) {
    const v = parseFloat(dr[1].replace(',','.')); const u = dr[2].toLowerCase()
    duration = u.startsWith('h') || u.startsWith('s') ? Math.round(v*60) : Math.round(v)
    text = text.replace(dr[0], '')
  }

  return { text: text.trim().replace(/\s+/g, ' '), date, time, duration, priority }
}

export default function TodoModal({ onClose, existingTodo = null }) {
  // wird in Task 4-7 befüllt
  return null
}
```

- [ ] **Schritt 3: Commit Skeleton**

```bash
git add src/components/TodoModal/
git commit -m "feat(modal): TodoModal skeleton + CSS"
```

---

## Task 4: TodoModal — State + Render-Grundstruktur

**Files:**
- Modify: `src/components/TodoModal/TodoModal.jsx`

- [ ] **Schritt 1: State und Store verdrahten**

Den `export default function TodoModal` durch folgendes ersetzen:

```jsx
export default function TodoModal({ onClose, existingTodo = null }) {
  const keyboardOffset = useKeyboardOffset()
  const {
    todos, setTodos,
    routines, setRoutines,
    templates, setTemplates,
    days, setDays,
    cats, setCats,
    accentColor,
  } = useAppStore()

  const isEdit = existingTodo !== null

  // ─── Type ──────────────────────────────────────────────────
  const [type, setType] = useState(() => detectType(existingTodo))

  // ─── Common ────────────────────────────────────────────────
  const [text,     setText]     = useState(existingTodo?.text     ?? '')
  const [priority, setPriority] = useState(existingTodo?.priority ?? 3)
  const [duration, setDuration] = useState(existingTodo?.duration ?? null)
  const [color,    setColor]    = useState(existingTodo?.color    ?? accentColor ?? '#8B5CF6')
  const [category, setCategory] = useState(existingTodo?.category ?? null)
  const [date,     setDate]     = useState(existingTodo?.date     ?? '')
  const [time,     setTime]     = useState(existingTodo?.time     ?? '')
  const [subItems, setSubItems] = useState(() =>
    (existingTodo?.subItems ?? []).map(si => ({ ...si }))
  )
  const [subInput, setSubInput] = useState('')

  // ─── Routine-spezifisch ────────────────────────────────────
  const [freq,        setFreq]       = useState('daily')
  const [routineHour, setRoutineHour] = useState(8)
  const [weekday,     setWeekday]    = useState(1)
  const [monthday,    setMonthday]   = useState(1)
  const [customEvery, setCustomEvery] = useState(2)
  const [customUnit,  setCustomUnit]  = useState('days')

  // ─── Termin-Validierung ────────────────────────────────────
  const [blinkDate, setBlinkDate] = useState(false)
  const [blinkTime, setBlinkTime] = useState(false)

  // ─── Kategorie Edit-Modus ──────────────────────────────────
  const [catEditMode, setCatEditMode] = useState(false)
  const [catNewInput, setCatNewInput] = useState('')

  // ─── Typ-Wechsel ───────────────────────────────────────────
  const handleTypeChange = (newType) => {
    setType(newType)
    if (newType === 'termin') {
      setTimeout(() => {
        if (!date) { setBlinkDate(true); setTimeout(() => setBlinkDate(false), 1200) }
        if (!time) { setBlinkTime(true); setTimeout(() => setBlinkTime(false), 1200) }
      }, 60)
    }
  }

  // ─── Auto-Parser ───────────────────────────────────────────
  const handleAuto = () => {
    if (!text.trim()) return
    const p = parseTodoText(text.trim())
    if (p.text)            setText(p.text)
    if (p.priority !== 3)  setPriority(p.priority)
    if (p.duration != null) setDuration(p.duration)
    if (p.date)            setDate(p.date)
    if (p.time)            setTime(p.time)
    if (p.date && p.time && type === 'todo') setType('termin')
  }

  // ─── Sub-Items ─────────────────────────────────────────────
  const addSubItem = () => {
    const txt = subInput.trim(); if (!txt) return
    setSubItems(prev => [...prev, { id: crypto.randomUUID(), text: txt, done: false }])
    setSubInput('')
  }
  const removeSubItem = (id) => setSubItems(prev => prev.filter(si => si.id !== id))

  // ─── Kategorien ────────────────────────────────────────────
  const addCat = () => {
    const name = catNewInput.trim(); if (!name) return
    if (!cats.includes(name)) setCats([...cats, name])
    setCatNewInput('')
  }
  const removeCat = (name) => {
    setCats(cats.filter(c => c !== name))
    if (category === name) setCategory(null)
  }

  // ─── Dauer ─────────────────────────────────────────────────
  const handleDurPreset = (val) => setDuration(prev => prev === val ? null : val)
  const handleDurFree   = (e)   => setDuration(e.target.value ? parseInt(e.target.value) : null)

  // Termin-Blink
  const triggerBlink = (field) => {
    if (field === 'date') { setBlinkDate(true); setTimeout(() => setBlinkDate(false), 1200) }
    if (field === 'time') { setBlinkTime(true); setTimeout(() => setBlinkTime(false), 1200) }
  }

  // Submit kommt in Task 7
  const handleSubmit = () => {}

  const activeTypeColor = TYPES.find(t => t.id === type)?.color ?? '#00CFFF'
  const submitLabel = isEdit ? 'Speichern' : {
    todo:    'Todo hinzufügen',
    termin:  'Termin eintragen',
    routine: 'Routine erstellen',
    vorlage: 'Vorlage speichern',
  }[type]

  return (
    <div
      className={s.overlay}
      style={keyboardOffset > 0 ? { alignItems: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset } : {}}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={s.modal}>

        {/* Header */}
        <div className={s.header}>
          <span className={s.title}>{isEdit ? 'Bearbeiten' : 'Hinzufügen'}</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Typ-Tabs */}
        <div className={s.typeRow}>
          {TYPES.map(({ id, label, color: tc }) => (
            <button
              key={id}
              className={[s.typeBtn, type === id ? s.typeBtnActive : ''].join(' ')}
              style={type === id ? { '--tc': tc } : {}}
              onClick={() => handleTypeChange(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Text + Auto */}
        <div className={s.textRow}>
          <input
            className={s.textInput}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder={
              type === 'routine' ? 'z.B. Morgenroutine, Sport…' :
              type === 'vorlage' ? 'z.B. Deep Work Block…' :
              type === 'termin'  ? 'z.B. Zahnarzt, Meeting…' :
              'Was muss getan werden…'
            }
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          <button className={s.autoBtn} onClick={handleAuto} disabled={!text.trim()}>Auto</button>
        </div>

        {/* Felder — kommen in Task 5 */}

        {/* Submit */}
        <button
          className={s.submitBtn}
          style={{ '--tc': activeTypeColor }}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          {submitLabel}
        </button>

      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/components/TodoModal/TodoModal.jsx
git commit -m "feat(modal): state, type-switching, auto-parser skeleton"
```

---

## Task 5: TodoModal — Typ-spezifische Felder

**Files:**
- Modify: `src/components/TodoModal/TodoModal.jsx`

Den Bereich `{/* Felder — kommen in Task 5 */}` ersetzen durch:

- [ ] **Schritt 1: Prio + Dauer + Datums-Felder einfügen**

```jsx
{/* ── Prio (nur Todo) ─────────────────────────────── */}
{type === 'todo' && (
  <div className={s.row}>
    <span className={s.rowLabel}>Prio</span>
    <div className={s.segControl}>
      {[[1,'! Wichtig'],[2,'· Sollte'],[3,'Kann']].map(([v, l]) => (
        <button
          key={v}
          className={[s.segBtn, priority === v ? s.segBtnActive : ''].join(' ')}
          onClick={() => setPriority(v)}
        >{l}</button>
      ))}
    </div>
  </div>
)}

{/* ── Termin: Datum + Uhrzeit ──────────────────────── */}
{type === 'termin' && (
  <div className={s.terminBlock}>
    <div className={s.terminField}>
      <span className={s.rowLabel}>Datum</span>
      <input
        type="date"
        className={[s.fieldInputSm, blinkDate ? s.blinkField : ''].join(' ')}
        value={date}
        onChange={e => setDate(e.target.value)}
      />
    </div>
    <div className={s.terminField}>
      <span className={s.rowLabel}>Uhrzeit</span>
      <input
        type="time"
        className={[s.fieldInputSm, blinkTime ? s.blinkField : ''].join(' ')}
        value={time}
        onChange={e => setTime(e.target.value)}
      />
    </div>
  </div>
)}

{/* ── Todo: optionales Datum (Fälligkeit) ─────────── */}
{type === 'todo' && (
  <div className={s.row}>
    <span className={s.rowLabel}>Fälligkeit</span>
    <input
      type="date" className={s.fieldInputSm}
      value={date} onChange={e => setDate(e.target.value)}
    />
  </div>
)}

{/* ── Routine: Takt ────────────────────────────────── */}
{type === 'routine' && (
  <>
    <div className={s.row}>
      <span className={s.rowLabel}>Takt</span>
      <div className={s.segControl}>
        {[['daily','Täglich'],['weekly','Wöchentlich'],['monthly','Monatlich'],['custom','Eigener']].map(([v, l]) => (
          <button
            key={v}
            className={[s.segBtn, freq === v ? s.segBtnActive : ''].join(' ')}
            style={freq === v ? { '--tc': '#BF00FF' } : {}}
            onClick={() => setFreq(v)}
          >{l}</button>
        ))}
      </div>
    </div>

    {freq === 'custom' && (
      <div className={s.row}>
        <span className={s.rowLabel}>Alle</span>
        <input
          type="number" min={1} max={999} className={s.durInput}
          value={customEvery}
          onChange={e => setCustomEvery(Math.max(1, parseInt(e.target.value) || 1))}
        />
        <select
          className={s.fieldSelect} value={customUnit}
          onChange={e => setCustomUnit(e.target.value)}
        >
          <option value="days">Tage</option>
          <option value="weeks">Wochen</option>
          <option value="months">Monate</option>
        </select>
      </div>
    )}

    {freq === 'weekly' && (
      <div className={s.row}>
        <span className={s.rowLabel}>Tag</span>
        <div className={s.wdayRow}>
          {WDAYS.map((d, i) => (
            <button
              key={i}
              className={[s.wdayBtn, weekday === i ? s.wdayBtnActive : ''].join(' ')}
              onClick={() => setWeekday(i)}
            >{d}</button>
          ))}
        </div>
      </div>
    )}

    {freq === 'monthly' && (
      <div className={s.row}>
        <span className={s.rowLabel}>Am Tag</span>
        <input
          type="number" className={s.durInput} min={1} max={31}
          value={monthday} onChange={e => setMonthday(Number(e.target.value))}
        />
        <span className={s.rowLabel}>des Monats</span>
      </div>
    )}

    <div className={s.row}>
      <span className={s.rowLabel}>Uhrzeit <span style={{opacity:0.4,fontWeight:400}}>(opt.)</span></span>
      <select className={s.fieldSelect} value={routineHour} onChange={e => setRoutineHour(Number(e.target.value))}>
        <option value="">—</option>
        {ROUTINE_HOURS.map(h => (
          <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
        ))}
      </select>
    </div>
  </>
)}

{/* ── Dauer (alle Typen) ───────────────────────────── */}
<div className={s.row}>
  <span className={s.rowLabel}>Dauer</span>
  <div className={s.durBtnRow}>
    {DUR_PRESETS.map(({ label, value }) => (
      <button
        key={value}
        className={[s.durBtn, duration === value ? s.durBtnActive : ''].join(' ')}
        onClick={() => handleDurPreset(value)}
      >
        {label}
      </button>
    ))}
    <input
      type="number" className={s.durFreeInput} min={1} max={480}
      value={duration && !DUR_PRESETS.some(p => p.value === duration) ? duration : ''}
      placeholder="—"
      onChange={handleDurFree}
    />
    <span className={s.durUnit}>min</span>
  </div>
</div>
```

- [ ] **Schritt 2: Farbe + Kategorie + Schritte einfügen**

Direkt nach dem Dauer-Block:

```jsx
{/* ── Farbe ────────────────────────────────────────── */}
<div className={s.row}>
  <span className={s.rowLabel}>Farbe</span>
  <div className={s.colorRow}>
    {NEON.map(c => (
      <button
        key={c}
        className={[s.colorCircle, color === c ? s.colorCircleActive : ''].join(' ')}
        style={{ background: c }}
        onClick={() => setColor(c)}
      />
    ))}
  </div>
</div>

{/* ── Kategorie ────────────────────────────────────── */}
<div className={s.row} style={{ alignItems: 'flex-start' }}>
  <span className={s.rowLabel} style={{ marginTop: 6 }}>Kategorie</span>
  <div className={s.catWrap}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <div className={s.catChips}>
        {cats.length === 0 && !catEditMode && (
          <span className={s.catEmpty}>Noch keine Kategorien</span>
        )}
        {catEditMode
          ? cats.map(name => (
              <span key={name} className={s.catChipDel}>
                {name}
                <button className={s.catChipRm} onClick={() => removeCat(name)}>✕</button>
              </span>
            ))
          : cats.map(name => (
              <button
                key={name}
                className={[s.catChip, category === name ? s.catChipActive : ''].join(' ')}
                onClick={() => setCategory(prev => prev === name ? null : name)}
              >{name}</button>
            ))
        }
      </div>
      <button
        className={[s.catEditBtn, catEditMode ? s.catEditBtnActive : ''].join(' ')}
        onClick={() => { setCatEditMode(v => !v); setCatNewInput('') }}
      >✏</button>
    </div>
    {catEditMode && (
      <div className={s.catManageRow}>
        <input
          className={s.catNewInput}
          placeholder={cats.length === 0 ? 'Erste Kategorie anlegen…' : 'Neue Kategorie…'}
          value={catNewInput}
          onChange={e => setCatNewInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCat() } }}
        />
        <button className={s.catAddBtn} onClick={addCat}>+</button>
      </div>
    )}
  </div>
</div>

{/* ── Schritte (alle Typen) ────────────────────────── */}
<div className={s.row} style={{ alignItems: 'flex-start' }}>
  <span className={s.rowLabel} style={{ marginTop: 6 }}>Schritte</span>
  <div className={s.subSection}>
    {subItems.map(si => (
      <div key={si.id} className={s.subRow}>
        <span className={s.subText}>{si.text}</span>
        <button className={s.subRm} onClick={() => removeSubItem(si.id)}>✕</button>
      </div>
    ))}
    <div className={s.subAddRow}>
      <input
        className={s.subInput}
        placeholder="Schritt hinzufügen…"
        value={subInput}
        onChange={e => setSubInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubItem() } }}
      />
      <button className={s.subAddBtn} onClick={addSubItem}>+</button>
    </div>
  </div>
</div>
```

- [ ] **Schritt 3: Commit**

```bash
git add src/components/TodoModal/TodoModal.jsx
git commit -m "feat(modal): alle Felder (Prio, Dauer, Farbe, Kategorie, Schritte, Routine)"
```

---

## Task 6: TodoModal — Submit-Logik

**Files:**
- Modify: `src/components/TodoModal/TodoModal.jsx`

- [ ] **Schritt 1: `handleSubmit` implementieren**

Die leere `handleSubmit`-Funktion durch folgendes ersetzen:

```js
const handleSubmit = () => {
  if (!text.trim()) return

  if (type === 'termin') {
    let ok = true
    if (!date) { triggerBlink('date'); ok = false }
    if (!time) { triggerBlink('time'); ok = false }
    if (!ok) return
  }

  if (isEdit) {
    // ── Bearbeiten ──────────────────────────────────────────
    const wasTemplate = existingTodo.isTemplate

    if (type === 'routine') {
      // Cross-Array-Migration: Block → Routine
      // Original aus todos[] oder templates[] entfernen
      if (wasTemplate) setTemplates(prev => prev.filter(t => t.id !== existingTodo.id))
      else             setTodos(prev => prev.filter(t => t.id !== existingTodo.id))
      // Neue Routine anlegen
      setRoutines(prev => [...prev, {
        id:          Date.now(),
        text:        text.trim(),
        freq,
        customEvery: freq === 'custom' ? customEvery : null,
        customUnit:  freq === 'custom' ? customUnit  : null,
        hour:        routineHour || null,
        weekday,
        monthday,
        color,
        duration:    duration || null,
        category:    category || null,
        subItems,
      }])
    } else {
      // Gleicher Typ oder Wechsel innerhalb Block-Typen (todo/termin/vorlage)
      const updated = {
        ...existingTodo,
        text:       text.trim(),
        priority:   type === 'todo' ? priority : existingTodo.priority,
        color,
        duration:   duration || null,
        category:   category || null,
        subItems,
        date:       (type === 'todo' || type === 'termin') ? (date || null) : null,
        time:       type === 'termin' ? (time || null) : null,
        isTemplate: type === 'vorlage',
      }
      // Slot-Dauer synchronisieren falls Termin
      setDays(prev => {
        const result = { ...prev }
        Object.keys(result).forEach(dk => {
          const newDay = { ...result[dk] }
          let changed = false
          Object.keys(newDay).forEach(slotK => {
            const slot = newDay[slotK]
            if (slot?.todoId === existingTodo.id && slot.duration !== updated.duration) {
              newDay[slotK] = { ...slot, duration: updated.duration }
              changed = true
            }
          })
          if (changed) result[dk] = newDay
        })
        return result
      })
      // Vorlage ↔ Todo/Termin Wechsel: in korrektes Array schreiben
      if (wasTemplate && type !== 'vorlage') {
        setTemplates(prev => prev.filter(t => t.id !== existingTodo.id))
        setTodos(prev => [...prev, updated])
      } else if (!wasTemplate && type === 'vorlage') {
        setTodos(prev => prev.filter(t => t.id !== existingTodo.id))
        setTemplates(prev => [...prev, updated])
      } else if (wasTemplate) {
        setTemplates(prev => prev.map(t => t.id === existingTodo.id ? updated : t))
      } else {
        setTodos(prev => prev.map(t => t.id === existingTodo.id ? updated : t))
      }
    }

  } else {
    // ── Erstellen ───────────────────────────────────────────
    if (type === 'todo') {
      setTodos(prev => [...prev, createBlock({
        text: text.trim(), priority, color,
        duration: duration || null,
        date: date || null, time: null,
        category: category || null,
        subItems,
      })])

    } else if (type === 'termin') {
      const block = createBlock({
        text: text.trim(), priority, color,
        duration: duration || 30,
        date, time,
        category: category || null,
        subItems,
      })
      const mins    = parseHHMM(time)
      const slotKey = minutesToSk(mins)
      setDays(prev => ({
        ...prev,
        [date]: {
          ...(prev[date] ?? {}),
          [slotKey]: {
            text: block.text, todoId: block.id, color: block.color,
            duration: block.duration, done: false, locked: true,
          },
        },
      }))
      setTodos(prev => [...prev, block])

    } else if (type === 'routine') {
      setRoutines(prev => [...prev, {
        id:          Date.now(),
        text:        text.trim(),
        freq,
        customEvery: freq === 'custom' ? customEvery : null,
        customUnit:  freq === 'custom' ? customUnit  : null,
        hour:        routineHour || null,
        weekday,
        monthday,
        color,
        duration:    duration || null,
        category:    category || null,
        subItems,
      }])

    } else if (type === 'vorlage') {
      setTemplates(prev => [...prev, createBlock({
        text:       text.trim(),
        color,
        duration:   duration || null,
        isTemplate: true,
        subItems,
        category:   category || null,
      })])
    }
  }

  onClose()
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/components/TodoModal/TodoModal.jsx
git commit -m "feat(modal): submit-logic für alle Typen (erstellen + bearbeiten)"
```

---

## Task 7: Integration — Konsumenten umstellen

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`
- Delete: `src/components/AddTodoModal/` (Ordner)
- Delete: `src/components/EditModal/` (Ordner)

- [ ] **Schritt 1: App.jsx umstellen**

Import ersetzen:
```jsx
// Entfernen:
import AddTodoModal from './components/AddTodoModal/AddTodoModal'

// Hinzufügen:
import TodoModal from './components/TodoModal/TodoModal'
```

Verwendung im JSX ersetzen:
```jsx
// Entfernen:
{addOpen && <AddTodoModal onClose={() => setAddOpen(false)} />}

// Hinzufügen:
{addOpen && <TodoModal onClose={() => setAddOpen(false)} />}
```

- [ ] **Schritt 2: TabHeute.jsx umstellen**

Import ersetzen:
```jsx
// Entfernen:
import EditModal from '../../../components/EditModal/EditModal'

// Hinzufügen:
import TodoModal from '../../../components/TodoModal/TodoModal'
```

Verwendung im JSX ersetzen:
```jsx
// Entfernen:
{editingTodo && (
  <EditModal
    todo={editingTodo}
    onSave={handleEditSave}
    onDelete={handleEditDelete}
    onClose={() => setEditingTodo(null)}
  />
)}

// Hinzufügen:
{editingTodo && (
  <TodoModal
    existingTodo={editingTodo}
    onClose={() => setEditingTodo(null)}
  />
)}
```

Hinweis: `handleEditSave` und `handleEditDelete` werden nicht mehr als Props übergeben. Die Submit-Logik ist jetzt im TodoModal selbst. Die `handleEditSave`- und `handleEditDelete`-Funktionen in `TabHeute.jsx` können entfernt werden — das Modal greift direkt auf den Store zu.

- [ ] **Schritt 3: Alte Dateien löschen**

```bash
rm -rf src/components/AddTodoModal
rm -rf src/components/EditModal
```

- [ ] **Schritt 4: Manuell testen**

- App starten: `npm run dev`
- "+" Button antippen → TodoModal öffnet sich (Erstellen-Modus) ✓
- Todo erstellen → erscheint im Pool ✓
- Todo im Pool doppeltippen → TodoModal öffnet sich (Bearbeiten-Modus) mit vorausgefüllten Feldern ✓
- Bearbeiten und Speichern → Änderungen sichtbar ✓
- Termin erstellen → erscheint im Zeitplan ✓
- Routine erstellen → erscheint in den Routinen ✓
- Kategorie anlegen, auswählen, löschen ✓
- Dauer-Buttons und Freitextfeld ✓
- Auto-Parser ✓

- [ ] **Schritt 5: Final Commit**

```bash
git add src/App.jsx src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat(modal): Integration TodoModal, remove AddTodoModal + EditModal"
```

---

## Zusammenfassung der Tasks

| Task | Beschreibung | Commit |
|---|---|---|
| 1 | Pool Label + Collapse UX | `feat(pool): label Todos, header-collapse, count badge` |
| 2 | Auto-Scroll beim Drag | `feat(drag): auto-scroll near viewport edges during drag` |
| 3 | TodoModal Skeleton | `feat(modal): TodoModal skeleton + CSS` |
| 4 | State + Render-Grundstruktur | `feat(modal): state, type-switching, auto-parser skeleton` |
| 5 | Alle Felder | `feat(modal): alle Felder` |
| 6 | Submit-Logik | `feat(modal): submit-logic für alle Typen` |
| 7 | Integration + alte Dateien löschen | `feat(modal): Integration TodoModal, remove AddTodoModal + EditModal` |
