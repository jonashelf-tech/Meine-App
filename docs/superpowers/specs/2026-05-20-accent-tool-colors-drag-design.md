# Design: Akzentfarbe + Tool-Farb-System + Drag & Drop Reihenfolge

**Datum:** 2026-05-20  
**Status:** Approved

---

## Übersicht

Drei zusammenhängende Features rund um Farben und Tool-Organisation:

1. **Akzentfarbe fix + freier Color-Picker** — `--primary` CSS-Variable wird tatsächlich gesetzt; freie Farbwahl statt 4 Presets
2. **Tool-Reihenfolge drag & drop** — "Meine Tools" sortierbar per Drag; "Alle Tools" alphabetisch
3. **Tool-Farb-System** — persistente Tool-Farben, editierbar per Color-Picker; Farbe fließt in Tool-Interna und App-Einträge

---

## Feature 1: Akzentfarbe

### Root Cause
`accentColor` im Store speichert einen String-ID (`'cyan'`), aber kein Code in der App setzt jemals eine CSS-Variable daraus. Die gespeicherte Farbe ist dead state.

### Lösung

**Store (`store/index.js`):**
- `accentColor` speichert ab sofort Hex-String: `lv(SK.accentColor, '#8B5CF6')`
- Migration: beim Lesen alte IDs (`'cyan'`, `'pink'`, `'purple'`, `'green'`) → Hex konvertieren

**App.jsx:**
```js
useEffect(() => {
  document.documentElement.style.setProperty('--primary', accentColor)
  // --glow-primary wird aus der Farbe abgeleitet (via hex→rgba)
}, [accentColor])
```

**UI (TabSettings):**
- 5–6 Preset-Swatches als Schnellauswahl (Violet, Cyan, Pink, Green, Orange, Teal)
- Nativer `<input type="color">` direkt daneben für freie Wahl
- Aktuell aktive Farbe hat weißen Ring (wie heute)

**Abgeleitete Vars:**
- `--glow-primary` wird dynamisch aus dem gewählten Hex berechnet: `0 0 18px <hex>33, 0 0 40px <hex>14`
- Kein Glow für weitere aliased Vars nötig

---

## Feature 2: Drag & Drop Tool-Reihenfolge

### Nebenbug
`TOOL_REGISTRY.filter(t => activeTools.includes(t.id))` liefert Registry-Reihenfolge, nicht `activeTools`-Array-Reihenfolge. Fix: `activeTools.map(id => TOOL_REGISTRY.find(t => t.id === id)).filter(Boolean)`.

### Design

**"Alle Tools":**
- Alphabetisch sortiert nach `tool.name`
- Kein Drag

**"Meine Tools":**
- Reihenfolge = `activeTools` Array
- Drag-Handle (≡) links auf jeder Card
- `draggable="true"` + `onDragStart` / `onDragOver` / `onDrop`
- Touch-Support via `onPointerDown/Move/Up` (falls HTML5 drag auf Mobile nicht ausreicht)
- Drop-Indikator: dünne violette Linie zwischen Cards
- On Drop: neues `activeTools` Array → `setActiveTools()` → persistiert automatisch

**State während Drag:**
```js
const [dragId, setDragId] = useState(null)
const [dragOverId, setDragOverId] = useState(null)
```

---

## Feature 3: Tool-Farb-System

### 3a) Farbe speichern & editieren

**Neuer Store-Slice:**
```js
toolColors: lv(SK.toolColors, {}),  // { [toolId]: '#hexcolor' }
setToolColors: (colors) => { set({ toolColors: colors }); sv(SK.toolColors, colors) }
```

**Storage Key:** `SK.toolColors = 'adhs_app_tool_colors'` (in `storage/index.js`)

**Hilfsfunktion (`utils/index.js`):**
```js
export function getToolColor(toolId, toolColors) {
  return toolColors[toolId] ?? TOOL_REGISTRY.find(t => t.id === toolId)?.color ?? '#8B5CF6'
}
```

**Edit-UI:**
- In "Alle Tools"-Ansicht: Farbiger Dot (●) auf jeder Card (oben rechts)
- Tap auf Dot → natives `<input type="color">` öffnet (per `.click()`)
- Änderung → `setToolColors({ ...toolColors, [tool.id]: newHex })`
- In "Meine Tools"-Ansicht: kein Edit-UI (nur öffnen)

### 3b) Farbe im Tool selbst

**Jede Tool-View** bekommt `--tool-color` via `style` am Root-Element:
```jsx
<div className={s.page} style={{ '--tool-color': toolColor }}>
```

Tool-Farbe wird in App.jsx als Prop übergeben oder die Tool-Komponente liest sie selbst aus Store+Registry:
```js
const toolColor = getToolColor('timer', toolColors)
```

**CSS-Pattern in Tool-Modulen:**
- Statt hardcoded `var(--primary)` → `var(--tool-color, var(--primary))`
- Betrifft: Eyebrow-Text, aktive Button-Borders, Toggle-Farbe
- Header-Eyebrow: `color: color-mix(in srgb, var(--tool-color, var(--primary)) 50%, transparent)`

### 3c) Farbe im Rest der App

**Activation Gate:**
Integrierte Tool-Abschnitte prüfen `activeTools.includes(toolId)` vor dem Rendern:
- `ReminderSection` → nur rendern wenn `activeTools.includes('reminder')`
- Geburtstags-Hinweise im Kalender → nur wenn `activeTools.includes('geburtstage')`
- Gamification-Overlay → nur wenn `activeTools.includes('gamification')`

**Calendar-Slots & Todo-Chips:**
- Bestehende `color`-Felder auf `Block` und `SlotEntry` tragen die Tool-Farbe bereits
- Sicherstellung: alle Pfade wo ein Tool in den Kalender schreibt, nutzen `getToolColor(toolId, toolColors)` als Farb-Quelle
- Kein neues Datenfeld nötig — Farbe als impliziter Identifier reicht

**Bewusst ausgelassen:**
- Keine Kalender-Logik-Überarbeitung (kommt separat)
- Kein `toolId`-Feld auf `Block` (Over-Engineering)
- Keine externe Color-Picker-Library

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/store/index.js` | `accentColor` Hex-Migration; neuer `toolColors` Slice |
| `src/storage/index.js` | `SK.toolColors` Key; `SK.accentColor` Hex-Default |
| `src/utils/index.js` | `getToolColor()` Funktion |
| `src/App.jsx` | `useEffect` für `--primary` CSS-Variable |
| `src/features/settings/TabSettings/TabSettings.jsx` | Color-Picker UI für Akzent |
| `src/features/settings/TabSettings/TabSettings.module.css` | Accent Picker Styles |
| `src/features/tools/TabTools/TabTools.jsx` | Alphabetisch sortiert; Drag & Drop; Farb-Dot Edit |
| `src/features/tools/TabTools/TabTools.module.css` | Drag-Handle Styles, Farb-Dot Styles |
| `src/features/tools/*/Tab*.jsx` (alle Tools) | `--tool-color` CSS-Var am Root; `getToolColor()` |
| `src/features/tools/reminder/ReminderSection.jsx` | Activation Gate |
| Kalender-Komponenten (Geburtstag, Gamification) | Activation Gate |

---

## Nicht-Ziele

- Keine Kalender-Integrations-Überarbeitung
- Keine neue Tool-Datenstruktur
- Kein `toolId`-Feld auf Todos
- Keine externen Libraries
