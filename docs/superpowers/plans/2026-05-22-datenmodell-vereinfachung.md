# Datenmodell-Vereinfachung (Gruppe C) — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Routine und Vorlage vollständig entfernen, Block als einzigen Aufgaben-Typ vereinheitlichen, TodoModal auf Tab-loses Formular umstellen, Pool mit awaitingClockResponse-Filterung erweitern, Missed-Termin-Flow in TabHeute einbauen.

**Architecture:** Block bleibt der einzige Datentyp. Neues Feld `awaitingClockResponse` steuert die Pool-Sichtbarkeit für Kalendereinträge (Termine). ClockPopup bekommt einen `isMissed`-Modus für vergangene Termine. TabHeute erkennt beim Start verpasste Termine und zeigt sie als Queue.

**Tech Stack:** React 18, Zustand, CSS Modules, Vite PWA

---

## Dateien-Übersicht

| Aktion | Datei |
|---|---|
| Modify | `src/features/todos/Block.js` |
| Modify | `src/store/index.js` |
| Modify | `src/features/calendar/Zeitplan/ClockPopup.jsx` |
| Modify | `src/components/TodoModal/TodoModal.jsx` |
| Modify | `src/components/TodoModal/TodoModal.module.css` |
| Modify | `src/features/calendar/Pool/Pool.jsx` |
| Modify | `src/features/calendar/TabHeute/TabHeute.jsx` |

---

## Task 1: Block.js — Datenmodell vereinfachen

**Files:**
- Modify: `src/features/todos/Block.js`

**Kontext:** `Block.js` definiert die createBlock-Fabrikfunktion und Hilfsfunktionen. Aktuell hat der Block Felder `isTemplate` und `recurring` die wir entfernen. `duration` default ist 30 (falsch, soll null). Wir fügen `awaitingClockResponse: false` hinzu.

- [ ] **Schritt 1: Block.js vollständig ersetzen**

```js
export const PRIO = {
  1: { label: 'Wichtig', color: '#FF2D78', bg: 'rgba(255,45,120,0.12)' },
  2: { label: 'Sollte',  color: '#00CFFF', bg: 'rgba(0,207,255,0.08)' },
  3: { label: 'Kann',    color: 'rgba(255,255,255,0.2)', bg: 'rgba(255,255,255,0.04)' },
}

export const isTermin      = (b) => !!(b.date && b.time)
export const isFaelligkeit = (b) => !!(b.date && !b.time)
export const isTodo        = (b) => !b.date && !b.time

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

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
  awaitingClockResponse: false,
  subItems:              [],
  category:              null,
  notes:                 null,
  createdAt:             new Date().toISOString(),
  ...partial,
})
```

- [ ] **Schritt 2: Commit**

```bash
git add src/features/todos/Block.js
git commit -m "refactor(block): remove isTemplate/recurring, add awaitingClockResponse, fix duration default"
```

---

## Task 2: Store — Routinen & Vorlagen entfernen

**Files:**
- Modify: `src/store/index.js`

**Kontext:** `store/index.js` enthält `routines`, `setRoutines`, `templates`, `setTemplates`. Diese werden vollständig entfernt. Die SK-Keys in `storage/index.js` bleiben unverändert (alte localStorage-Daten werden einfach ignoriert).

- [ ] **Schritt 1: routines + templates aus Store entfernen**

Datei `src/store/index.js`. Den Block `// ─── Todos` und `// ─── Calendar` so anpassen:

```js
// ─── Todos ─────────────────────────────────────────────
todos:     lv(SK.todos, []),
todoOrder: lv(SK.todoOrder, []),
cats:      lv(SK.cats, []),

setTodos: (todos) => {
  const next = typeof todos === 'function' ? todos(get().todos) : todos
  set({ todos: next })
  sv(SK.todos, next)
},
setTodoOrder: (order) => { set({ todoOrder: order }); sv(SK.todoOrder, order) },
setCats: (cats) => { set({ cats }); sv(SK.cats, cats) },

// ─── Calendar ──────────────────────────────────────────
days:         lv(SK.days, {}),
doneCounters: lv(SK.doneCounters, {}),
```

Entfernen (komplett löschen):
- `routines:  lv(SK.routines, []),`
- `setRoutines: (routines) => { ... },`
- `templates:    lv(SK.templates, []),`
- `setTemplates: (t) => { ... },`

- [ ] **Schritt 2: Commit**

```bash
git add src/store/index.js
git commit -m "refactor(store): remove routines and templates"
```

---

## Task 3: ClockPopup — isMissed-Modus

**Files:**
- Modify: `src/features/calendar/Zeitplan/ClockPopup.jsx`

**Kontext:** ClockPopup zeigt aktuell: "✓ Erledigt", "⏱ Noch 15 min", "⬇ Alles 30 min", "Ignorieren". Für verpasste Termine (past-day) ergeben Snooze und Shift keinen Sinn. Wir fügen einen `isMissed`-Prop hinzu, der die Buttons anpasst.

Props nach der Änderung:
```
ClockPopup({ slotText, onDone, onSnooze, onShift, onDismiss, onToPool, isMissed })
```

- [ ] **Schritt 1: ClockPopup.jsx anpassen**

```jsx
import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import s from './ClockPopup.module.css'

export default function ClockPopup({ slotText, onDone, onSnooze, onShift, onDismiss, onToPool, isMissed }) {
  const keyboardOffset = useKeyboardOffset()
  return (
    <div
      className={s.overlay}
      style={keyboardOffset > 0 ? { alignItems: 'flex-start', paddingTop: 16, paddingBottom: keyboardOffset } : {}}
      onClick={onDismiss}
    >
      <div className={s.popup} onClick={e => e.stopPropagation()}>

        <div className={s.head}>
          <span className={s.icon}>{isMissed ? '📋' : '⏰'}</span>
          <p className={s.label}>{isMissed ? 'Nicht erledigt' : 'Zeit ist um'}</p>
        </div>

        <p className={s.task}>"{slotText}"</p>

        <div className={s.actions}>
          <button className={[s.btn, s.btnDone].join(' ')} onClick={onDone}>
            ✓ Erledigt
          </button>
          {isMissed ? (
            <button className={s.btn} onClick={onToPool}>
              ↩ In Pool übernehmen
            </button>
          ) : (
            <>
              <button className={s.btn} onClick={onSnooze}>
                ⏱ Noch 15 min
              </button>
              <button className={s.btn} onClick={onShift}>
                ⬇ Alles 30 min
              </button>
            </>
          )}
        </div>

        <button className={s.dismiss} onClick={onDismiss}>
          {isMissed ? 'Später' : 'Ignorieren'}
        </button>

      </div>
    </div>
  )
}
```

Hinweis: `onToPool` wird nur bei `isMissed` genutzt. Für normale ClockPopups bleibt alles identisch.

- [ ] **Schritt 2: Commit**

```bash
git add src/features/calendar/Zeitplan/ClockPopup.jsx
git commit -m "feat(clock): isMissed-Modus für vergangene Termine"
```

---

## Task 4: TodoModal — Tabs entfernen, Feldlogik vereinfachen

**Files:**
- Modify: `src/components/TodoModal/TodoModal.jsx`
- Modify: `src/components/TodoModal/TodoModal.module.css`

**Kontext:** TodoModal hat aktuell Typ-Tabs (Todo/Termin/Routine/Vorlage), Routine-Felder (freq, weekday etc.) und komplexe Submit-Logik mit Cross-Array-Migration. Das alles fällt weg. Übrig: ein Formular, Prio nur wenn kein time, awaitingClockResponse beim Erstellen von Terminen setzen.

- [ ] **Schritt 1: TodoModal.jsx vollständig ersetzen**

```jsx
import { useState } from 'react'
import { useAppStore } from '../../store'
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset'
import { createBlock } from '../../features/todos/Block'
import { parseHHMM, minutesToSk, NEON } from '../../utils'
import s from './TodoModal.module.css'

const DUR_PRESETS = [
  { label: '5',  value: 5  },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '60', value: 60 },
  { label: '90', value: 90 },
  { label: '2h', value: 120 },
]

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
  const keyboardOffset = useKeyboardOffset()
  const { todos, setTodos, days, setDays, cats, setCats, accentColor } = useAppStore()

  const isEdit = existingTodo !== null

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
  const [subInput,    setSubInput]    = useState('')
  const [blinkDate,   setBlinkDate]   = useState(false)
  const [blinkTime,   setBlinkTime]   = useState(false)
  const [catEditMode, setCatEditMode] = useState(false)
  const [catNewInput, setCatNewInput] = useState('')

  const handleAuto = () => {
    if (!text.trim()) return
    const p = parseTodoText(text.trim())
    if (p.text)             setText(p.text)
    if (p.priority !== 3)   setPriority(p.priority)
    if (p.duration != null) setDuration(p.duration)
    if (p.date)             setDate(p.date)
    if (p.time)             setTime(p.time)
  }

  const addSubItem = () => {
    const txt = subInput.trim(); if (!txt) return
    setSubItems(prev => [...prev, { id: crypto.randomUUID(), text: txt, done: false }])
    setSubInput('')
  }
  const removeSubItem = (id) => setSubItems(prev => prev.filter(si => si.id !== id))

  const addCat = () => {
    const name = catNewInput.trim(); if (!name) return
    if (!cats.includes(name)) setCats([...cats, name])
    setCatNewInput('')
  }
  const removeCat = (name) => {
    setCats(cats.filter(c => c !== name))
    if (category === name) setCategory(null)
  }

  const handleDurPreset = (val) => setDuration(prev => prev === val ? null : val)
  const handleDurFree   = (e)   => setDuration(e.target.value ? parseInt(e.target.value) : null)

  const triggerBlink = (field) => {
    if (field === 'date') { setBlinkDate(true); setTimeout(() => setBlinkDate(false), 1200) }
    if (field === 'time') { setBlinkTime(true); setTimeout(() => setBlinkTime(false), 1200) }
  }

  const isTermin = !!(date && time)

  const handleSubmit = () => {
    if (!text.trim()) return
    if (time && !date) { triggerBlink('date'); return }

    if (isEdit) {
      const wasTermin = !!(existingTodo.date && existingTodo.time)
      const nowTermin = isTermin

      const updated = {
        ...existingTodo,
        text:                  text.trim(),
        priority,
        color,
        duration:              duration || null,
        category:              category || null,
        subItems,
        date:                  date || null,
        time:                  time || null,
        awaitingClockResponse: nowTermin
          ? (wasTermin ? existingTodo.awaitingClockResponse : true)
          : false,
      }

      // Slot-Dauer im days-Store synchronisieren
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

      // Neuer Termin-Slot anlegen wenn Zeit neu gesetzt
      if (nowTermin && !wasTermin) {
        const mins    = parseHHMM(time)
        const slotKey = minutesToSk(mins)
        setDays(prev => ({
          ...prev,
          [date]: {
            ...(prev[date] ?? {}),
            [slotKey]: {
              text: updated.text, todoId: updated.id, color: updated.color,
              duration: updated.duration || 30, done: false, locked: true,
            },
          },
        }))
      }

      setTodos(prev => prev.map(t => t.id === existingTodo.id ? updated : t))

    } else {
      if (isTermin) {
        const block = createBlock({
          text: text.trim(), priority, color,
          duration: duration || 30,
          date, time,
          category: category || null,
          subItems,
          awaitingClockResponse: true,
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
      } else {
        setTodos(prev => [...prev, createBlock({
          text: text.trim(), priority, color,
          duration: duration || null,
          date: date || null,
          category: category || null,
          subItems,
        })])
      }
    }

    onClose()
  }

  return (
    <div
      className={s.overlay}
      style={keyboardOffset > 0 ? { alignItems: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset } : {}}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={s.modal}>

        <div className={s.header}>
          <span className={s.title}>{isEdit ? 'Bearbeiten' : 'Hinzufügen'}</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <div className={s.textRow}>
          <input
            className={s.textInput}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Was muss getan werden…"
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          <button className={s.autoBtn} onClick={handleAuto} disabled={!text.trim()}>Auto</button>
        </div>

        {/* Prio — nur wenn kein time */}
        {!time && (
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

        {/* Datum */}
        <div className={s.row}>
          <span className={s.rowLabel}>Datum</span>
          <input
            type="date"
            className={[s.fieldInputSm, blinkDate ? s.blinkField : ''].join(' ')}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Uhrzeit */}
        <div className={s.row}>
          <span className={s.rowLabel}>Uhrzeit</span>
          <input
            type="time"
            className={[s.fieldInputSm, blinkTime ? s.blinkField : ''].join(' ')}
            value={time}
            onChange={e => setTime(e.target.value)}
          />
          {isTermin && (
            <span style={{ fontSize: '0.68rem', color: 'rgba(251,113,133,0.8)' }}>→ Kalendereintrag</span>
          )}
        </div>

        {/* Dauer */}
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

        {/* Farbe */}
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

        {/* Kategorie */}
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

        {/* Schritte */}
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

        <button
          className={s.submitBtn}
          style={{ '--tc': isTermin ? '#FF2D78' : '#00CFFF' }}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          {isEdit ? 'Speichern' : (isTermin ? 'Termin eintragen' : 'Hinzufügen')}
        </button>

      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: TodoModal.module.css — Typ-Tab-Klassen entfernen**

Aus `src/components/TodoModal/TodoModal.module.css` folgende Klassen-Blöcke entfernen:
- `.typeRow { ... }`
- `.typeBtn { ... }`
- `.typeBtn:hover { ... }`
- `.typeBtnActive { ... }`

Alle anderen Klassen bleiben unverändert.

- [ ] **Schritt 3: Commit**

```bash
git add src/components/TodoModal/TodoModal.jsx src/components/TodoModal/TodoModal.module.css
git commit -m "feat(modal): Typ-Tabs entfernen, einheitliches Formular, awaitingClockResponse"
```

---

## Task 5: Pool.jsx — awaitingClockResponse-Filter

**Files:**
- Modify: `src/features/calendar/Pool/Pool.jsx`

**Kontext:** Pool muss Todos mit `awaitingClockResponse: true` ausblenden. Das betrifft Termine (date+time) die noch nicht über ClockPopup beantwortet wurden — sie sollen erst nach Popup-Antwort im Pool erscheinen. Zukunfts-Termine sind bereits durch das `awaitingClockResponse: true`-Flag abgedeckt (wird beim Erstellen gesetzt).

- [ ] **Schritt 1: activePool-Berechnung in Pool.jsx erweitern**

In `src/features/calendar/Pool/Pool.jsx` die `activePool`-useMemo-Berechnung suchen und den `undone`-Filter erweitern:

```js
const activePool = useMemo(() => {
  const undone = todos.filter(t => {
    if (t.done) return false
    if (t.awaitingClockResponse) return false
    return true
  }).filter(t => !isPlaced(t))
  const pending = todos.filter(t => t.done && pendingDoneIds.has(t.id))
  return [...sortTodos(undone, sort), ...pending]
}, [todos, pendingDoneIds, sort, isPlaced])
```

- [ ] **Schritt 2: Commit**

```bash
git add src/features/calendar/Pool/Pool.jsx
git commit -m "feat(pool): awaitingClockResponse-Filter — Termine bis Popup-Antwort versteckt"
```

---

## Task 6: TabHeute — Missed-Termin-Flow

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

**Kontext:** TabHeute muss beim Start vergangene undone Termine mit `awaitingClockResponse: true` erkennen und als Queue durch den ClockPopup (mit `isMissed`-Prop) führen. Außerdem: `handleClockDone` und `handleToggleDone` müssen `awaitingClockResponse` beim Abhaken auf `false` setzen.

**Wichtig:** Der bestehende `clockPopup`-State wird von `{ slotKey, slotText }` zu `{ slotKey, slotText, isMissed?, dateKey?, todoId? }` erweitert. Die existing ClockPopup-Logik für same-day Slots bleibt unverändert.

- [ ] **Schritt 1: useAppStore-Import um todos erweitern**

In TabHeute.jsx, im `useAppStore()`-Destructuring `todos` + `setTodos` hinzufügen (falls nicht schon da):

```js
const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate } = useAppStore()
```

- [ ] **Schritt 2: missedQueueRef hinzufügen**

Nach den bestehenden Refs (`promptedRef`, `snoozeRef`, `daysRef`, `tickRef`) einfügen:

```js
const missedQueueRef = useRef([])
```

- [ ] **Schritt 3: showNextMissed-Funktion hinzufügen**

Nach den bestehenden Handler-Definitionen (vor dem Clock-interval useEffect) einfügen:

```js
const showNextMissed = useCallback(() => {
  const next = missedQueueRef.current.shift()
  if (!next) return
  setClockPopup({
    slotKey:  next.slotKey,
    slotText: next.todo.text,
    isMissed: true,
    dateKey:  next.dateKey,
    todoId:   next.todo.id,
  })
}, [])
```

- [ ] **Schritt 4: Missed-Termin-Erkennung im Auto-Return useEffect**

Im bestehenden Auto-Return `useEffect` (der `SK.lastPoolReturn` prüft), am **Ende** des Effects (vor dem `sv(SK.lastPoolReturn, today)`-Aufruf) einfügen:

```js
// Verpasste Termine: undone, locked Slots aus der Vergangenheit mit awaitingClockResponse
const existingTodosSnap = todos  // snapshot aus dem Effect-Scope
const missedTermine = []
Object.entries(days).forEach(([dk, dayData]) => {
  if (dk >= today || !dayData || typeof dayData !== 'object') return
  Object.entries(dayData).forEach(([slotKey, slot]) => {
    if (!slot || slot.done || !slot.todoId) return
    const todo = existingTodosSnap.find(t => t.id === slot.todoId)
    if (todo && !todo.done && todo.awaitingClockResponse) {
      missedTermine.push({ slotKey, dateKey: dk, todo })
    }
  })
})
if (missedTermine.length > 0) {
  missedQueueRef.current = missedTermine
  // Kurze Verzögerung damit App vollständig geladen ist
  setTimeout(() => showNextMissed(), 800)
}
```

**Hinweis:** Dieser Block kommt direkt vor `sv(SK.lastPoolReturn, today)`. Die Dependency-Array-Kommentare bleiben unverändert.

- [ ] **Schritt 5: handleClockDone — awaitingClockResponse löschen**

Die bestehende `handleClockDone`-Funktion erweitern:

```js
const handleClockDone = useCallback(() => {
  if (!clockPopup) return
  if (clockPopup.isMissed) {
    // Missed Termin: Todo als done markieren + Flag löschen
    setTodos(prev => prev.map(t =>
      t.id === clockPopup.todoId
        ? { ...t, done: true, doneAt: new Date().toISOString(), awaitingClockResponse: false }
        : t
    ))
  } else {
    // Normaler same-day Slot
    handleToggleSlotDone(clockPopup.slotKey)
    // Verlinktes Todo Flag löschen
    const slot = todaySlots[clockPopup.slotKey]
    if (slot?.todoId) {
      setTodos(prev => prev.map(t =>
        t.id === slot.todoId ? { ...t, awaitingClockResponse: false } : t
      ))
    }
  }
  closeClockPopup()
  if (clockPopup.isMissed) setTimeout(() => showNextMissed(), 300)
}, [clockPopup, handleToggleSlotDone, todaySlots, setTodos, closeClockPopup, showNextMissed])
```

- [ ] **Schritt 6: handleMissedToPool hinzufügen**

Neue Funktion nach `handleClockDone`:

```js
const handleMissedToPool = useCallback(() => {
  if (!clockPopup?.isMissed) return
  // awaitingClockResponse: false → Todo erscheint im Pool
  setTodos(prev => prev.map(t =>
    t.id === clockPopup.todoId
      ? { ...t, awaitingClockResponse: false }
      : t
  ))
  closeClockPopup()
  setTimeout(() => showNextMissed(), 300)
}, [clockPopup, setTodos, closeClockPopup, showNextMissed])
```

- [ ] **Schritt 7: handleClockSnooze für isMissed anpassen**

Bestehende `handleClockSnooze`-Funktion erweitern:

```js
const handleClockSnooze = useCallback(() => {
  if (!clockPopup) return
  if (clockPopup.isMissed) {
    // "Später" — awaitingClockResponse bleibt true, nächstes Popup zeigen
    closeClockPopup()
    setTimeout(() => showNextMissed(), 300)
    return
  }
  promptedRef.current.delete(clockPopup.slotKey)
  snoozeRef.current[clockPopup.slotKey] = Date.now() + 15 * 60 * 1000
  closeClockPopup()
}, [clockPopup, closeClockPopup, showNextMissed])
```

- [ ] **Schritt 8: handleToggleDone — awaitingClockResponse löschen**

Bestehende `handleToggleDone`-Funktion erweitern:

```js
const handleToggleDone = useCallback((id) => {
  setTodos(prev =>
    prev.map(t => t.id === id
      ? {
          ...t,
          done:                  !t.done,
          doneAt:                !t.done ? new Date().toISOString() : null,
          awaitingClockResponse: false,
        }
      : t
    )
  )
}, [setTodos])
```

- [ ] **Schritt 9: ClockPopup-Render im JSX anpassen**

Den bestehenden `{clockPopup && <ClockPopup ... />}`-Block im return ersetzen:

```jsx
{clockPopup && (
  <ClockPopup
    slotText={clockPopup.slotText}
    isMissed={clockPopup.isMissed ?? false}
    onDone={handleClockDone}
    onSnooze={handleClockSnooze}
    onShift={handleClockShift}
    onDismiss={closeClockPopup}
    onToPool={handleMissedToPool}
  />
)}
```

- [ ] **Schritt 10: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat(tabheute): Missed-Termin-Flow, awaitingClockResponse in handleToggleDone/handleClockDone"
```

---

## Task 7: Manuell testen + Deploy

**Files:** keine

- [ ] **Schritt 1: App starten und testen**

```bash
npm run dev
```

Prüfen:
- `+`-Button → Modal öffnet ohne Tabs ✓
- Prio sichtbar wenn kein Time, verschwindet wenn Time gesetzt ✓
- Datum+Zeit → Submit-Button zeigt "Termin eintragen" ✓
- Termin erstellen → Slot im Zeitplan, Todo NICHT im Pool ✓
- Pool-Todo abhaken → `awaitingClockResponse` wird false ✓
- Bestehende Todos bearbeiten → funktioniert ✓
- Keine Routinen/Vorlagen mehr im Modal ✓

- [ ] **Schritt 2: Deploy**

```bash
npx vercel --prod
```

---

## Selbst-Review

**Spec-Abdeckung:**
- ✅ Block.js: isTemplate/recurring entfernt, awaitingClockResponse + duration-fix → Task 1
- ✅ Store: routines/templates entfernt → Task 2
- ✅ Modal: Tabs entfernt, Prio-Logik, awaitingClockResponse beim Submit → Task 4
- ✅ Pool: awaitingClockResponse-Filter → Task 5
- ✅ ClockPopup: isMissed-Modus → Task 3
- ✅ TabHeute: Missed-Queue, handleClockDone update, handleToggleDone update → Task 6

**Konsistenz:**
- `awaitingClockResponse` wird immer als Feld-Name verwendet (keine Tippfehler)
- `todoId` im clockPopup-State wird in Task 6 gesetzt und in handleClockDone/handleMissedToPool genutzt
- `showNextMissed` wird in Task 6 Schritt 3 definiert, in Schritten 4–8 genutzt — korrekte Reihenfolge
