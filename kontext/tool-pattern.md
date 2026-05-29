# Tool — Integration (Claude Code)

## Bestehende Tools & Tab-Nummern

```
Tab 4  — Geburtstage   (geburtstage)
Tab 5  — Fokus-Timer   (timer)
Tab 6  — Rezepte       (rezepte)
Tab 7  — Pizza         (pizza)
Tab 8  — Elvi          (elvi)
Tab 9  — Gewicht       (gewicht)
Tab 10 — XP & Level    (gamification)
Tab 11 — Zufallsrad    (rad)
Tab 12 — Reminder      (reminder)
Tab 13 — Haushalt      (haushalt)
Tab 14 — Was jetzt?    (wasjetzt)
Tab 15 — Klar+Sehen   (klaeren)
Tab 16 — Kognitiv      (kognitiv)
Tab 17 → nächstes Tool
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
.addAllBtn { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); font-family: 'Outfit',sans-serif; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; text-align: center; }
```
