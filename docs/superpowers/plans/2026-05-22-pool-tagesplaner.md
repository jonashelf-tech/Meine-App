# Pool & Tagesplaner Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pool zu einer einzigen sortierten Liste umbauen — mit integrierter "Erledigt heute"-Sektion, neuem Done-Verhalten (Flash → Strikethrough → Aufräumen), und max. 10 sichtbare Einträge mit Expand-Option.

**Architecture:** Pool.jsx wird komplett neu geschrieben. Alle neue Logik (pendingDoneIds, Sort, Expand) lebt als lokaler State in Pool — kein Store, kein localStorage. TabHeute.jsx und der Store bleiben unverändert. Die bestehende `done + doneAt`-Mechanik im Store liefert die "Erledigt heute"-Daten auch an den Kalender.

**Tech Stack:** React 18, Zustand, CSS Modules, Vite/PWA

---

## Dateiübersicht

| Datei | Aktion |
|---|---|
| `src/features/calendar/Pool/Pool.jsx` | Kompletter Rewrite |
| `src/features/calendar/Pool/Pool.module.css` | Kompletter Rewrite |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Keine Änderung nötig |
| `src/store/index.js` | Keine Änderung |
| `src/storage/index.js` | Keine Änderung |

---

## Task 1: Pool.module.css neu schreiben

**Files:**
- Modify: `src/features/calendar/Pool/Pool.module.css`

- [ ] **Schritt 1: Gesamte CSS-Datei ersetzen**

Öffne `src/features/calendar/Pool/Pool.module.css` und ersetze den gesamten Inhalt mit:

```css
/* ─── Pool Container ─────────────────────────────────── */
.pool {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

/* ─── Header ─────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.poolLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  flex-shrink: 0;
}

/* ─── Sort chips ─────────────────────────────────────── */
.sortRow {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.sortChip {
  font-family: 'Outfit', sans-serif;
  font-size: 0.58rem;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.sortChip:hover {
  color: rgba(255, 255, 255, 0.55);
  border-color: rgba(255, 255, 255, 0.15);
}

.sortChipActive {
  background: rgba(139, 92, 246, 0.13);
  border-color: rgba(139, 92, 246, 0.3);
  color: rgba(139, 92, 246, 0.9);
}

/* ─── Collapse button ────────────────────────────────── */
.collapseBtn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  padding: 3px 7px;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}

.collapseBtn:hover {
  background: rgba(255, 255, 255, 0.07);
}

.chevron {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.28);
  display: inline-block;
  transition: transform 0.2s ease;
}

.chevronCollapsed {
  transform: rotate(-90deg);
}

/* ─── List area ──────────────────────────────────────── */
.listArea {
  padding: 6px 0 4px;
}

.empty {
  font-size: 0.78rem;
  color: var(--text-dim);
  padding: 8px 14px;
  font-style: italic;
}

/* ─── Drag handle ────────────────────────────────────── */
.handle {
  width: 34px;
  min-width: 34px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.18);
  cursor: grab;
  flex-shrink: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: color 0.15s;
}

.handle:hover  { color: rgba(255, 255, 255, 0.45); }
.handle:active { cursor: grabbing; }

.placedIcon {
  font-size: 0.65rem;
  opacity: 0.5;
  line-height: 1;
}

/* ─── Expand more button ─────────────────────────────── */
.expandMore {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 4px 8px 2px;
  padding: 7px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.32);
  font-family: 'Outfit', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  width: calc(100% - 16px);
}

.expandMore:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
}

.expandCount {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1px 6px;
  font-size: 0.58rem;
}

/* ─── Aufräumen ──────────────────────────────────────── */
.cleanupRow {
  display: flex;
  justify-content: flex-end;
  padding: 4px 10px 2px;
}

.cleanupBtn {
  font-family: 'Outfit', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(16, 185, 129, 0.75);
  background: rgba(16, 185, 129, 0.07);
  border: 1px solid rgba(16, 185, 129, 0.18);
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.cleanupBtn:hover {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
}

.cleanupCount {
  background: rgba(16, 185, 129, 0.18);
  border-radius: 10px;
  padding: 1px 5px;
  font-size: 0.58rem;
}

/* ─── Erledigt heute ─────────────────────────────────── */
.doneSection {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  margin-top: 4px;
}

.doneSectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px 3px;
}

.doneLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(16, 185, 129, 0.65);
}

.doneHint {
  font-family: 'Outfit', sans-serif;
  font-size: 0.56rem;
  color: rgba(255, 255, 255, 0.2);
  font-style: italic;
}

.doneEmpty {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.18);
  padding: 4px 14px 8px;
  font-style: italic;
}

.doneList {
  padding: 0 0 6px;
}

/* ─── Done chip (Erledigt heute) ─────────────────────── */
.doneChip {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0 8px 4px;
  background: rgba(255, 255, 255, 0.018);
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: var(--r);
  overflow: hidden;
  height: 36px;
  cursor: pointer;
  opacity: 0.45;
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.doneChip:hover {
  opacity: 0.7;
}

.doneStripe {
  width: 3px;
  min-width: 3px;
  align-self: stretch;
  background: rgba(16, 185, 129, 0.5);
  flex-shrink: 0;
}

.doneCheck {
  width: 28px;
  min-width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(16, 185, 129, 0.6);
  font-size: 0.65rem;
  flex-shrink: 0;
}

.doneText {
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: line-through;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doneMeta {
  font-family: 'Outfit', sans-serif;
  font-size: 0.56rem;
  color: rgba(255, 255, 255, 0.2);
  padding: 0 10px 0 6px;
  flex-shrink: 0;
}
```

- [ ] **Schritt 2: App im Browser prüfen**

`npm run dev` (falls noch nicht läuft). Pool sollte noch funktionieren — CSS-Änderungen brechen ggf. Klassen die noch auf alte Namen zeigen. Das ist erwartet bis Task 2 fertig ist.

- [ ] **Schritt 3: Committen**

```bash
git add src/features/calendar/Pool/Pool.module.css
git commit -m "style(pool): rewrite CSS for merged list, sort chips, done section"
```

---

## Task 2: Pool.jsx neu schreiben

**Files:**
- Modify: `src/features/calendar/Pool/Pool.jsx`

**Vorher lesen:** Aktuelle Chip-Optik im Zeitplan prüfen (`src/features/calendar/Zeitplan/Zeitplan.jsx` + `Zeitplan.module.css`) — insbesondere `chipStyle` das an `TodoChip` übergeben wird, um sicherzustellen dass Pool-Chips dieselbe Optik haben.

- [ ] **Schritt 1: Pool.jsx vollständig ersetzen**

Ersetze den gesamten Inhalt von `src/features/calendar/Pool/Pool.jsx`:

```jsx
import { useState, useCallback, useMemo } from 'react'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { isFaelligkeit } from '../../todos/Block'
import { todayKey } from '../../../utils'
import s from './Pool.module.css'

// ─── Icons ────────────────────────────────────────────
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

// ─── Sort ──────────────────────────────────────────────
function sortTodos(list, sort) {
  if (sort === 'alter') {
    return [...list].sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )
  }
  if (sort === 'kategorie') {
    return [...list].sort((a, b) => {
      const ca = a.category || '￿'
      const cb = b.category || '￿'
      return ca.localeCompare(cb) || (a.priority - b.priority)
    })
  }
  // Standard: fällig (heute/vergangen) zuerst → prio → alter
  const today = todayKey()
  return [...list].sort((a, b) => {
    const fa = isFaelligkeit(a) && a.date <= today ? 0 : 1
    const fb = isFaelligkeit(b) && b.date <= today ? 0 : 1
    if (fa !== fb) return fa - fb
    if (a.priority !== b.priority) return a.priority - b.priority
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })
}

// ─── PoolChip ──────────────────────────────────────────
function PoolChip({ todo, todos, setTodos, onToggleDone, onEdit, onRemove, startDrag, isPlaced }) {
  const color = todo.color || '#00CFFF'

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    startDrag?.(todo.id, todo.text, color, todo.duration, e)
  }, [todo, color, startDrag])

  const handle = (
    <span
      className={s.handle}
      onPointerDown={handlePointerDown}
      aria-label="Ziehen"
    >
      {isPlaced
        ? <span className={s.placedIcon}>↩</span>
        : DragIcon
      }
    </span>
  )

  return (
    <TodoChip
      todo={todo}
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onRemove={onRemove}
      todos={todos}
      saveTodos={setTodos}
      dragHandle={handle}
    />
  )
}

// ─── DoneChip ──────────────────────────────────────────
function DoneChip({ todo, onUndo }) {
  const time = todo.doneAt
    ? new Date(todo.doneAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div
      className={s.doneChip}
      onClick={onUndo}
      aria-label={`${todo.text} rückgängig machen`}
      role="button"
    >
      <span className={s.doneStripe} style={{ background: todo.color || 'rgba(16,185,129,0.5)' }} />
      <span className={s.doneCheck}>✓</span>
      <span className={s.doneText}>{todo.text || <em>Kein Text</em>}</span>
      {time && <span className={s.doneMeta}>{time}</span>}
    </div>
  )
}

// ─── Pool ──────────────────────────────────────────────
export default function Pool({
  todos = [],
  setTodos,
  todaySlots = {},
  onToggleDone,
  onEdit,
  onRemove,
  startDrag,
}) {
  const [collapsed,       setCollapsed]       = useState(false)
  const [sort,            setSort]            = useState('standard')
  const [showAll,         setShowAll]         = useState(false)
  const [pendingDoneIds,  setPendingDoneIds]  = useState(() => new Set())

  // ─── Placed detection ────────────────────────────────
  const { placedIds, placedTexts } = useMemo(() => {
    const slotValues = Object.values(todaySlots).filter(Boolean)
    return {
      placedIds:   new Set(slotValues.map(sl => sl.todoId).filter(Boolean)),
      placedTexts: new Set(slotValues.filter(sl => !sl.todoId).map(sl => sl.text).filter(Boolean)),
    }
  }, [todaySlots])

  const isPlaced = useCallback(
    (t) => placedIds.has(t.id) || placedTexts.has(t.text),
    [placedIds, placedTexts]
  )

  // ─── Derived lists ───────────────────────────────────
  const activePool = useMemo(() => {
    const undone  = todos.filter(t => !t.done && !isPlaced(t))
    const pending = todos.filter(t => t.done && pendingDoneIds.has(t.id))
    return [...sortTodos(undone, sort), ...pending]
  }, [todos, pendingDoneIds, sort, isPlaced])

  const doneToday = useMemo(() => {
    const today = todayKey()
    return todos.filter(t =>
      t.done &&
      t.doneAt?.startsWith(today) &&
      !pendingDoneIds.has(t.id)
    )
  }, [todos, pendingDoneIds])

  const visiblePool = showAll ? activePool : activePool.slice(0, 10)
  const hasMore     = !showAll && activePool.length > 10

  // ─── Handlers ────────────────────────────────────────
  const handleToggle = useCallback((id) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    // Wird jetzt abgehakt → zu pendingDoneIds hinzufügen
    if (!todo.done) {
      setPendingDoneIds(prev => new Set([...prev, id]))
    }
    onToggleDone?.(id)
  }, [todos, onToggleDone])

  const handleUndo = useCallback((id) => {
    setPendingDoneIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    onToggleDone?.(id)
  }, [onToggleDone])

  const handleCleanup = useCallback(() => {
    setPendingDoneIds(new Set())
  }, [])

  // ─── Render chip ─────────────────────────────────────
  const renderChip = (t) => (
    <PoolChip
      key={t.id}
      todo={t}
      todos={todos}
      setTodos={setTodos}
      onToggleDone={() => handleToggle(t.id)}
      onEdit={() => onEdit?.(t.id)}
      onRemove={() => onRemove?.(t.id)}
      startDrag={startDrag}
      isPlaced={isPlaced(t)}
    />
  )

  return (
    <div className={s.pool}>

      {/* ── Header ──────────────────────────────── */}
      <div className={s.header}>
        <span className={s.poolLabel}>Pool</span>

        {!collapsed && (
          <div className={s.sortRow}>
            {[
              { key: 'standard',  label: 'Standard'  },
              { key: 'kategorie', label: 'Kategorie' },
              { key: 'alter',     label: 'Alter'     },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={[s.sortChip, sort === key ? s.sortChipActive : ''].join(' ')}
                onClick={() => setSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <button
          className={s.collapseBtn}
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Pool aufklappen' : 'Pool zuklappen'}
        >
          <span className={[s.chevron, collapsed ? s.chevronCollapsed : ''].join(' ')}>▾</span>
        </button>
      </div>

      {!collapsed && (
        <>
          {/* ── Aktive Liste ────────────────────── */}
          <div className={s.listArea}>
            {activePool.length === 0 && doneToday.length === 0 && (
              <p className={s.empty}>Alle Todos verplant ✓</p>
            )}

            {visiblePool.map(renderChip)}

            {hasMore && (
              <button className={s.expandMore} onClick={() => setShowAll(true)}>
                Weitere anzeigen
                <span className={s.expandCount}>+{activePool.length - 10}</span>
                ▾
              </button>
            )}

            {pendingDoneIds.size > 0 && (
              <div className={s.cleanupRow}>
                <button className={s.cleanupBtn} onClick={handleCleanup}>
                  ✓ Aufräumen
                  <span className={s.cleanupCount}>{pendingDoneIds.size}</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Erledigt heute ──────────────────── */}
          <div className={s.doneSection}>
            <div className={s.doneSectionHead}>
              <span className={s.doneLabel}>✓ Erledigt heute</span>
              {doneToday.length > 0 && (
                <span className={s.doneHint}>Antippen = rückgängig</span>
              )}
            </div>

            {doneToday.length === 0 ? (
              <p className={s.doneEmpty}>Noch nichts erledigt</p>
            ) : (
              <div className={s.doneList}>
                {doneToday.map(t => (
                  <DoneChip
                    key={t.id}
                    todo={t}
                    onUndo={() => handleUndo(t.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Schritt 2: Import prüfen**

Sicherstellen dass `todayKey` in `utils/index.js` exportiert wird (bereits der Fall laut kern.md). Kein neuer Import nötig.

- [ ] **Schritt 3: Im Browser testen**

Tagesplaner-Tab öffnen und manuell prüfen:

- [ ] Pool ist standardmäßig aufgeklappt
- [ ] Eine Liste statt zwei Gruppen
- [ ] Sort-Chips wechseln die Reihenfolge (Standard/Kategorie/Alter)
- [ ] Todo antippen → grüner Flash → bleibt mit Strikethrough stehen
- [ ] "Aufräumen" Button erscheint nach dem Abhaken — klicken lässt das Todo verschwinden
- [ ] Das abgehakte Todo erscheint danach in "Erledigt heute"
- [ ] "Antippen" in "Erledigt heute" → Todo kommt zurück in aktive Liste
- [ ] Kalender-Tab → Tag des Tests → Sektion "Erledigt" zeigt das Todo

- [ ] **Schritt 4: Edge Cases prüfen**

- [ ] Pool mit 0 Todos: zeigt "Alle Todos verplant ✓"
- [ ] Pool mit >10 Todos: "Weitere anzeigen +N" Button erscheint, Klick zeigt alle
- [ ] Pool zuklappen → Sort-Chips verschwinden, Inhalt hidden
- [ ] Pool wieder aufklappen → Inhalt da, Sort-Zustand erhalten
- [ ] Drag & Drop aus Pool in Zeitplan weiterhin funktionsfähig
- [ ] Platziertes Todo (↩ Icon) erscheint weiterhin korrekt

- [ ] **Schritt 5: Committen**

```bash
git add src/features/calendar/Pool/Pool.jsx
git commit -m "feat(pool): merged list, sort, done-flash, Aufräumen, Erledigt-heute section"
```

---

## Task 3: Verifikation & Abschluss

**Files:** Keine Änderung — nur Tests

- [ ] **Schritt 1: Kalender-Verknüpfung verifizieren**

1. Todo im Pool abhaken
2. Aufräumen drücken
3. Kalender-Tab öffnen → aktuellen Tag anklicken → DayPanel → "Erledigt" Sektion
4. Das abgehakte Todo muss dort erscheinen (Filter: `t.doneAt?.startsWith(dateKey)`)

- [ ] **Schritt 2: Rückgängig-Flow verifizieren**

1. Todo erledigen + aufräumen (→ erscheint in "Erledigt heute")
2. In "Erledigt heute" antippen
3. Todo muss zurück in aktiver Liste erscheinen
4. Kalender → Tag → "Erledigt" Sektion → Todo darf dort NICHT mehr stehen

- [ ] **Schritt 3: Verschiedene Tage prüfen**

1. In DayNav auf einen anderen Tag wechseln
2. "Erledigt heute" zeigt nur Todos für den angezeigten Tag
   - Hinweis: `todayKey()` gibt immer HEUTE zurück, nicht den `viewDate`
   - Falls "Erledigt heute" nur heutige Todos zeigen soll (unabhängig vom viewDate) → korrekt so
   - Falls es den viewDate spiegeln soll → `onToggleDone` in TabHeute anpassen und `viewDate` als Prop an Pool übergeben
   - **Entscheidung:** Beim Testen prüfen was sinnvoller ist. Empfehlung: immer HEUTE (todayKey) da Aufräumen nur für heute relevant.

- [ ] **Schritt 4: Final committen**

```bash
git add .
git commit -m "feat(pool): redesign complete — merged list, sort, done flow, erledigt-heute"
```

---

## Optik-Hinweis für Implementierung

Bei der Umsetzung: wenn TodoChip-Chips im Pool anders aussehen als im Zeitplan, `chipStyle` Prop prüfen. Der Zeitplan übergibt:
```js
const chipStyle = {
  height: '100%',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.09)',
  margin: 0,
  flexShrink: 0
}
```
Pool-Chips brauchen das normalerweise nicht — aber falls die Optik abweicht, `chipStyle` anpassen.

---

## Nicht in Scope

- Zeitplan, QuickAdd, DayNav — keine Änderungen
- Store, Storage — keine Änderungen
- TabKalender — keine Änderungen
- Drag & Drop Logik — bleibt unverändert
