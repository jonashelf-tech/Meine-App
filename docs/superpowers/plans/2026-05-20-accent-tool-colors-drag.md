# Akzentfarbe + Tool-Farb-System + Drag & Drop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Akzentfarben-Bug fixen + freier Color-Picker; Tool-Reihenfolge per Drag sortierbar; Tool-Farb-System mit persistenten, editierbaren Farben die in der ganzen App sichtbar sind.

**Architecture:** Neuer `toolColors` Store-Slice (Overrides über Registry-Defaults), `getToolColor()` Utility, `useEffect` in App.jsx setzt `--primary` und `--glow-primary` CSS-Variablen dynamisch. Alle Tool-Views setzen `--tool-color` auf ihrem Root-Element. Integrierte Tools rendern nur wenn aktiviert.

**Tech Stack:** React 18, Zustand, CSS Modules, native `<input type="color">`, HTML5 Drag API

---

## Datei-Übersicht

| Datei | Was sich ändert |
|---|---|
| `src/storage/index.js` | `SK.toolColors` Key hinzufügen |
| `src/store/index.js` | `accentColor` Hex-Migration; `toolColors` Slice |
| `src/utils/index.js` | `getToolColor()` + `hexToGlow()` |
| `src/App.jsx` | `useEffect` → `--primary` + `--glow-primary` |
| `src/features/settings/TabSettings/TabSettings.jsx` | Color-Picker UI |
| `src/features/settings/TabSettings/TabSettings.module.css` | Picker Styles |
| `src/features/tools/TabTools/TabTools.jsx` | Alphabetisch, Drag & Drop, Farb-Dot Edit |
| `src/features/tools/TabTools/TabTools.module.css` | Drag + Dot Styles |
| `src/features/tools/*/Tab*.jsx` (alle 9) | `--tool-color` + `getToolColor` |
| `src/features/tools/reminder/ReminderSection.jsx` | Activation Gate |

---

## Task 1: Storage-Key + Store-Foundation

**Files:**
- Modify: `src/storage/index.js`
- Modify: `src/store/index.js`

- [ ] **Step 1: SK.toolColors Key hinzufügen**

In `src/storage/index.js`, `accentColor` Zeile nach:
```js
  accentColor:    `${PREFIX}app_accent`,
  toolColors:     `${PREFIX}app_tool_colors`,
```

- [ ] **Step 2: accentColor Hex-Migration in store/index.js**

Oben in `src/store/index.js` vor dem `create()`-Aufruf einfügen:
```js
const ACCENT_LEGACY = {
  cyan:   '#00CFFF',
  pink:   '#FF2D78',
  purple: '#BF00FF',
  green:  '#00FF94',
}

function migrateAccent(stored) {
  if (!stored) return '#8B5CF6'
  if (stored.startsWith('#')) return stored
  return ACCENT_LEGACY[stored] ?? '#8B5CF6'
}
```

- [ ] **Step 3: accentColor + toolColors Slice im Store anpassen**

Im `create()`-Block den `// ─── Accent` Abschnitt ersetzen:
```js
  // ─── Accent ────────────────────────────────────────────
  accentColor: migrateAccent(lv(SK.accentColor, null)),
  setAccentColor: (color) => { set({ accentColor: color }); sv(SK.accentColor, color) },

  // ─── Tool Colors ───────────────────────────────────────
  toolColors: lv(SK.toolColors, {}),
  setToolColors: (colors) => {
    const next = typeof colors === 'function' ? colors(get().toolColors) : colors
    set({ toolColors: next })
    sv(SK.toolColors, next)
  },
```

- [ ] **Step 4: Visuell prüfen — App startet, keine Konsolenfehler**

```bash
npm run dev
```
Browser öffnen, Einstellungen-Tab anschauen. Keine roten Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/storage/index.js src/store/index.js
git commit -m "feat: add toolColors store slice and accentColor hex migration"
```

---

## Task 2: Utility-Funktionen

**Files:**
- Modify: `src/utils/index.js`

- [ ] **Step 1: hexToGlow und getToolColor ans Ende von utils/index.js anhängen**

```js
// ─── Tool color helpers ──────────────────────────────────
export function hexToGlow(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `0 0 18px rgba(${r},${g},${b},0.2), 0 0 40px rgba(${r},${g},${b},0.08)`
}

export function getToolColor(toolId, toolColors) {
  if (toolColors[toolId]) return toolColors[toolId]
  // TOOL_REGISTRY import vermeiden (circular) — inline Registry-Fallbacks
  const DEFAULTS = {
    rad:          '#BF00FF',
    timer:        '#00CFFF',
    rezepte:      '#FF9F43',
    pizza:        '#FF6B6B',
    elvi:         '#00E5FF',
    gewicht:      '#00FF94',
    geburtstage:  '#FF2D78',
    gamification: '#FFD700',
    reminder:     '#00FF94',
  }
  return DEFAULTS[toolId] ?? '#8B5CF6'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/index.js
git commit -m "feat: add getToolColor and hexToGlow utilities"
```

---

## Task 3: CSS-Variable-Anwendung in App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: useEffect für --primary und --glow-primary einfügen**

In `src/App.jsx` den Import ergänzen:
```js
import { useEffect } from 'react'
```
(Falls `useState` bereits importiert ist: `import { useState, useEffect } from 'react'`)

Im `App()`-Funktionskörper, direkt nach den Store-Destructuring-Zeilen, einfügen:
```js
const { currentTab, setCurrentTab, accentColor } = useAppStore()
```
(Bestehende `useAppStore()`-Zeile um `accentColor` erweitern.)

Dann direkt darunter:
```js
import { hexToGlow } from './utils'

// In der Komponente:
useEffect(() => {
  document.documentElement.style.setProperty('--primary', accentColor)
  document.documentElement.style.setProperty('--glow-primary', hexToGlow(accentColor))
}, [accentColor])
```

Vollständige neue App.jsx-Imports-Sektion (Zeilen 1-2 ersetzen):
```js
import { useState, useEffect } from 'react'
import { useAppStore } from './store'
import { hexToGlow } from './utils'
import styles from './App.module.css'
```

Vollständige neue `App()`-Einstiegszeilen (nach `export default function App() {`):
```js
  const { currentTab, setCurrentTab, accentColor } = useAppStore()
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', accentColor)
    document.documentElement.style.setProperty('--glow-primary', hexToGlow(accentColor))
  }, [accentColor])
```

- [ ] **Step 2: Prüfen — Akzentfarbe ändert tatsächlich was**

App starten (`npm run dev`), Einstellungen öffnen, eine der 4 bestehenden Preset-Buttons klicken. Die Farbe aller `var(--primary)`-Elemente (aktive Tab-Buttons, Borders, etc.) muss sich ändern. Falls nicht: Konsole auf Fehler prüfen.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "fix: apply accentColor to --primary CSS variable on change"
```

---

## Task 4: Accent Color Picker UI in TabSettings

**Files:**
- Modify: `src/features/settings/TabSettings/TabSettings.jsx`
- Modify: `src/features/settings/TabSettings/TabSettings.module.css`

- [ ] **Step 1: ACCENTS Presets und UI-Ref in TabSettings.jsx ersetzen**

Den bestehenden `ACCENTS`-Block und die `accentRow` JSX ersetzen.

Neuer `ACCENTS`-Block (ersetzt die 4 alten Einträge):
```js
const ACCENTS = [
  { color: '#8B5CF6', label: 'Violet' },
  { color: '#00CFFF', label: 'Cyan'   },
  { color: '#FF2D78', label: 'Pink'   },
  { color: '#00FF94', label: 'Green'  },
  { color: '#FF9F43', label: 'Orange' },
  { color: '#14B8A6', label: 'Teal'   },
]
```

In der Komponente einen `useRef` für den versteckten Color-Input hinzufügen:
```js
const accentInputRef = useRef(null)
```
(Der `fileRef` ist bereits da, also `useRef` ist schon importiert.)

Das JSX der `accentRow` ersetzen (im `return`, Abschnitt Akzentfarbe):
```jsx
<div className={s.rowLabel} style={{ marginTop: 16 }}>Akzentfarbe</div>
<div className={s.accentRow}>
  {ACCENTS.map(a => (
    <button
      key={a.color}
      className={[s.accentBtn, accentColor === a.color ? s.accentBtnActive : ''].join(' ')}
      style={{ '--ac': a.color }}
      onClick={() => setAccentColor(a.color)}
      title={a.label}
    />
  ))}
  <button
    className={s.accentPickerBtn}
    style={{ '--ac': accentColor }}
    onClick={() => accentInputRef.current?.click()}
    title="Eigene Farbe"
  >
    ＋
  </button>
  <input
    ref={accentInputRef}
    type="color"
    value={accentColor}
    onChange={e => setAccentColor(e.target.value)}
    className={s.hidden}
  />
</div>
```

- [ ] **Step 2: CSS für accentPickerBtn in TabSettings.module.css einfügen**

Nach dem `.accentBtnActive`-Block einfügen:
```css
.accentPickerBtn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 2px dashed rgba(255,255,255,0.25);
  color: var(--text-dim);
  font-size: 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}

.accentPickerBtn:hover {
  border-color: rgba(255,255,255,0.5);
  color: var(--text);
}
```

- [ ] **Step 3: Prüfen — Picker öffnet, Farbe wird übernommen**

Einstellungen → Akzentfarbe → `＋` tippen → nativer Color-Picker erscheint → Farbe wählen → gesamte App-Akzentfarbe ändert sich sofort. Presets funktionieren auch noch.

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/TabSettings/TabSettings.jsx src/features/settings/TabSettings/TabSettings.module.css
git commit -m "feat: accent color free picker with presets"
```

---

## Task 5: TabTools — Alphabetisch + Reihenfolge-Bug + Drag & Drop

**Files:**
- Modify: `src/features/tools/TabTools/TabTools.jsx`
- Modify: `src/features/tools/TabTools/TabTools.module.css`

- [ ] **Step 1: Komplettes TabTools.jsx ersetzen**

Den gesamten Inhalt von `src/features/tools/TabTools/TabTools.jsx` ersetzen:

```jsx
import { useState, useRef } from 'react'
import { useAppStore } from '../../../store'
import { TOOL_REGISTRY } from '../toolRegistry'
import { getToolColor } from '../../../utils'
import s from './TabTools.module.css'

const VIEWS = [
  { id: 'mine', label: 'Meine Tools' },
  { id: 'all',  label: 'Alle Tools' },
]

const TOOL_TAB = {
  rad:          11,
  timer:        5,
  rezepte:      6,
  pizza:        7,
  elvi:         8,
  gewicht:      9,
  gamification: 10,
  geburtstage:  4,
  reminder:     12,
}

const allToolsSorted = [...TOOL_REGISTRY].sort((a, b) => a.name.localeCompare(b.name, 'de'))

export default function TabTools() {
  const [view, setView] = useState('mine')
  const { activeTools, toggleTool, setCurrentTab, setToolColors, toolColors } = useAppStore()

  const [dragId,     setDragId]     = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const colorInputRefs = useRef({})

  const myTools = activeTools
    .map(id => TOOL_REGISTRY.find(t => t.id === id))
    .filter(Boolean)

  const openTool = (tool) => {
    const tab = TOOL_TAB[tool.id]
    if (tab != null) setCurrentTab(tab)
  }

  const handleDragStart = (e, id) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragId) setDragOverId(id)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDragOverId(null)
      return
    }
    const order = [...activeTools]
    const from  = order.indexOf(dragId)
    const to    = order.indexOf(targetId)
    order.splice(from, 1)
    order.splice(to, 0, dragId)
    useAppStore.getState().setActiveTools(order)
    setDragId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  const handleColorChange = (toolId, hex) => {
    setToolColors(prev => ({ ...prev, [toolId]: hex }))
  }

  return (
    <div className={s.page}>
      <div className={s.segmented}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            className={[s.seg, view === v.id ? s.segActive : ''].join(' ')}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'all' && (
        <div className={s.grid}>
          {allToolsSorted.map(tool => {
            const isActive   = activeTools.includes(tool.id)
            const toolColor  = getToolColor(tool.id, toolColors)
            return (
              <div
                key={tool.id}
                className={[s.card, isActive ? s.cardActive : s.cardInactive].join(' ')}
                style={isActive ? { '--tool-color': toolColor } : {}}
                onClick={() => isActive && openTool(tool)}
              >
                <button
                  className={s.colorDot}
                  style={{ background: toolColor }}
                  onClick={e => { e.stopPropagation(); colorInputRefs.current[tool.id]?.click() }}
                  title="Farbe ändern"
                />
                <input
                  ref={el => colorInputRefs.current[tool.id] = el}
                  type="color"
                  value={toolColor}
                  onChange={e => handleColorChange(tool.id, e.target.value)}
                  className={s.hidden}
                />
                <span className={s.cardIcon}>{tool.icon}</span>
                <span className={s.cardName}>{tool.name}</span>
                <span className={s.cardDesc}>{tool.description}</span>
                <div className={s.cardFooter}>
                  <div
                    className={[s.toggle, isActive ? s.toggleOn : ''].join(' ')}
                    onClick={e => { e.stopPropagation(); toggleTool(tool.id) }}
                    style={isActive ? { '--tool-color': toolColor } : {}}
                  >
                    <div className={s.toggleThumb} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'mine' && (
        <div className={s.list}>
          {myTools.length === 0 ? (
            <p className={s.empty}>Noch keine Tools aktiviert.<br />Wechsle zu "Alle Tools".</p>
          ) : (
            myTools.map(tool => {
              const toolColor = getToolColor(tool.id, toolColors)
              const isDragging = dragId === tool.id
              const isOver    = dragOverId === tool.id
              return (
                <div
                  key={tool.id}
                  className={[
                    s.listCard,
                    isDragging ? s.listCardDragging : '',
                    isOver     ? s.listCardOver    : '',
                  ].join(' ')}
                  style={{ '--tool-color': toolColor }}
                  draggable
                  onDragStart={e => handleDragStart(e, tool.id)}
                  onDragOver={e  => handleDragOver(e, tool.id)}
                  onDrop={e      => handleDrop(e, tool.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => openTool(tool)}
                >
                  <span
                    className={s.dragHandle}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    ≡
                  </span>
                  <span className={s.listIcon}>{tool.icon}</span>
                  <div className={s.listText}>
                    <span className={s.cardName}>{tool.name}</span>
                    <span className={s.cardDesc}>{tool.description}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TabTools.module.css um neue Klassen erweitern**

Ans Ende der Datei `src/features/tools/TabTools/TabTools.module.css` anhängen:

```css
/* ─── Color Dot (Alle Tools) ────────────────────────────── */
.colorDot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: transform 0.15s;
  flex-shrink: 0;
}

.colorDot:hover { transform: scale(1.25); }

/* ─── List View (Meine Tools) ───────────────────────────── */
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.listCard {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.2s, opacity 0.2s, transform 0.15s;
  border-left: 3px solid var(--tool-color, var(--primary));
  -webkit-tap-highlight-color: transparent;
  position: relative;
}

.listCard:active { transform: scale(0.98); }

.listCardDragging {
  opacity: 0.4;
}

.listCardOver {
  border-color: var(--tool-color, var(--primary));
  box-shadow: 0 0 12px color-mix(in srgb, var(--tool-color, var(--primary)) 25%, transparent);
}

.dragHandle {
  color: var(--text-dim);
  font-size: 1.1rem;
  cursor: grab;
  flex-shrink: 0;
  user-select: none;
}

.dragHandle:active { cursor: grabbing; }

.listIcon {
  font-size: 1.6rem;
  line-height: 1;
  flex-shrink: 0;
}

.listText {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.hidden { display: none; }
```

Außerdem: `.card` in der bestehenden CSS-Datei um `position: relative` ergänzen, damit `.colorDot` absolut positioniert werden kann:
```css
.card {
  /* ... bestehende Styles ... */
  position: relative;
}
```

- [ ] **Step 3: Prüfen**

- "Alle Tools" ist jetzt alphabetisch
- "Meine Tools" ist eine Liste (nicht Grid)
- Drag-Handle (≡) ist sichtbar
- Karten lassen sich umsortieren (drag & drop)
- Farb-Dot (●) oben rechts auf jeder Card in "Alle Tools"
- Farb-Dot klicken → nativer Color-Picker öffnet

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/TabTools/TabTools.jsx src/features/tools/TabTools/TabTools.module.css
git commit -m "feat: tool ordering drag & drop, alphabetical all-tools, color dot editor"
```

---

## Task 6: --tool-color in allen Tool-Views

**Files:**  
Modify je 1 Zeile JSX in allen 9 Tool-Komponenten. Gleiches Pattern für alle.

**Pattern (einmal zeigen, dann pro Datei anwenden):**

In jeder `Tab*.jsx`:
1. `getToolColor` und `useAppStore` importieren (falls noch nicht)
2. `toolColors` aus Store holen
3. `toolColor` berechnen
4. `--tool-color` auf Root-Div setzen

- [ ] **Step 1: TabTimer.jsx**

```js
// Imports ergänzen:
import { getToolColor } from '../../../utils'
// (useAppStore ist schon da)

// In der Komponente, nach den bestehenden store-Zeilen:
const { toolColors } = useAppStore()
const toolColor = getToolColor('timer', toolColors)

// Root-Div (derzeit: <div className={s.page}>):
<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 2: TabRad.jsx**

```js
import { getToolColor } from '../../../utils'

const { toolColors } = useAppStore()
const toolColor = getToolColor('rad', toolColors)

// Root-Div:
<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 3: TabRezepte.jsx**

```js
import { getToolColor } from '../../../utils'

const { toolColors } = useAppStore()
const toolColor = getToolColor('rezepte', toolColors)

<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 4: TabPizza.jsx**

```js
import { getToolColor } from '../../../utils'

const { toolColors } = useAppStore()
const toolColor = getToolColor('pizza', toolColors)

<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 5: TabElvi.jsx**

```js
import { getToolColor } from '../../../utils'

const { toolColors } = useAppStore()
const toolColor = getToolColor('elvi', toolColors)

<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 6: TabGewicht.jsx**

```js
import { getToolColor } from '../../../utils'

const { toolColors } = useAppStore()
const toolColor = getToolColor('gewicht', toolColors)

<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 7: TabGamification.jsx**

```js
import { getToolColor } from '../../../utils'

const { toolColors } = useAppStore()
const toolColor = getToolColor('gamification', toolColors)

<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 8: TabGeburtstage.jsx**

```js
import { getToolColor } from '../../../utils'

const { toolColors } = useAppStore()
const toolColor = getToolColor('geburtstage', toolColors)

<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 9: TabReminder.jsx**

```js
import { getToolColor } from '../../../utils'

const { toolColors } = useAppStore()
const toolColor = getToolColor('reminder', toolColors)

<div className={s.page} style={{ '--tool-color': toolColor }}>
```

- [ ] **Step 10: CSS in allen Tool-Modulen — Eyebrow-Farbe**

In jedem `*.module.css` der Tools: den Eyebrow-Farbwert `rgba(139,92,246,0.5)` ersetzen durch:
```css
color: color-mix(in srgb, var(--tool-color, var(--primary)) 50%, transparent);
```

Suche in allen Tool-CSS-Dateien nach `rgba(139,92,246` — jeder Treffer der `.eyebrow` betrifft, so ersetzen.

Außerdem: überall wo ein Tool-Modul `.segActive`, `.toggleOn`, oder ähnliche "aktiv"-Klassen mit `var(--primary)` (oder alten Hex wie `#00CFFF`, `#BF00FF` etc.) coloriert → auf `var(--tool-color, var(--primary))` umstellen.

Grep-Befehl zum Finden:
```bash
grep -r "var(--primary)\|var(--cyan)\|139,92,246" src/features/tools/ --include="*.module.css" -l
```

- [ ] **Step 11: Prüfen**

Timer öffnen → Farbe ändern in "Alle Tools" → Timer wieder öffnen → Header-Eyebrow und aktive Elemente zeigen neue Farbe.

- [ ] **Step 12: Commit**

```bash
git add src/features/tools/
git commit -m "feat: --tool-color CSS variable in all tool views"
```

---

## Task 7: Activation Gates für integrierte Tools

**Files:**
- Modify: `src/features/tools/reminder/ReminderSection.jsx`
- Identify + Modify: Kalender-Komponenten die Geburtstags- und Gamification-Content einbinden

- [ ] **Step 1: ReminderSection Activation Gate**

In `src/features/tools/reminder/ReminderSection.jsx`, nach den bestehenden Imports:

```js
import { useAppStore } from '../../../store'
```
(Falls schon vorhanden, überspringen.)

Im Komponenten-Body vor dem ersten `return`:
```js
const { activeTools } = useAppStore()
if (!activeTools.includes('reminder')) return null
```

- [ ] **Step 2: Geburtstage + Gamification Activation Gates finden**

Finde alle Stellen, wo `ReminderSection`, Geburtstags-Abschnitte, oder Gamification im Kalender/Heute-Tab eingebunden werden:

```bash
grep -r "ReminderSection\|Geburtstag\|Gamification\|gamification\|geburtstage" src/features/calendar/ --include="*.jsx" -l
```

In jeder gefundenen Datei: den Import-Abschnitt des jeweiligen Tools mit einer `activeTools.includes('...')` Prüfung wrappen:

```jsx
// Beispiel-Pattern:
{activeTools.includes('geburtstage') && <BirthdaySection />}
{activeTools.includes('gamification') && <GamificationOverlay />}
```

`activeTools` dazu aus dem Store lesen:
```js
const { activeTools } = useAppStore()
```

- [ ] **Step 3: Prüfen**

1. Reminder in "Alle Tools" deaktivieren → ReminderSection verschwindet aus dem Heute-Tab
2. Reminder wieder aktivieren → erscheint wieder
3. Geburtstage deaktivieren → Geburtstags-Hinweise im Kalender verschwinden

- [ ] **Step 4: Commit**

```bash
git add src/features/
git commit -m "feat: activation gates for integrated tools (reminder, geburtstage, gamification)"
```

---

## Self-Review

**Spec-Coverage:**
- [x] Feature 1 (Akzentfarbe Bug): Task 1 (Store), Task 3 (CSS-Var), Task 4 (UI)
- [x] Feature 1 (Freier Picker): Task 4 (accentPickerBtn + input type=color)
- [x] Feature 2 (Alphabetisch): Task 5 (allToolsSorted)
- [x] Feature 2 (Reihenfolge-Bug): Task 5 (myTools per activeTools map)
- [x] Feature 2 (Drag & Drop): Task 5 (drag handlers + listCard)
- [x] Feature 3a (toolColors Store): Task 1
- [x] Feature 3a (getToolColor utility): Task 2
- [x] Feature 3a (Farb-Dot Edit): Task 5 (colorDot + input type=color)
- [x] Feature 3b (--tool-color in Tools): Task 6
- [x] Feature 3c (Activation Gates): Task 7
- [x] Migration alter Accent-IDs: Task 1 (migrateAccent)

**Placeholder-Check:** Keine TBDs, keine "ähnlich wie Task N"-Referenzen.

**Type-Konsistenz:**
- `getToolColor(toolId, toolColors)` — Signatur konsistent in Task 2, 5, 6
- `toolColors` — Store-Key konsistent in Task 1 und überall
- `setToolColors(prev => ...)` — Callback-Pattern konsistent mit anderen Settern
- `activeTools` ist `string[]` — `.includes(id)` und `.map(id => ...)` konsistent
