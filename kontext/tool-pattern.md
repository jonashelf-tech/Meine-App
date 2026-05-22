# Tool — Integration (Claude Code)

## Bestehende Tools & Tab-Nummern

```
Tab 4  — Geburtstage   (geburtstage)
Tab 5  — Timer         (timer)
Tab 6  — Rezepte       (rezepte)
Tab 7  — Pizza         (pizza)
Tab 8  — Elvi          (elvi)
Tab 9  — Gewicht       (gewicht)
Tab 10 — Gamification  (gamification)
Tab 11 — Zufallsrad    (rad)
Tab 12 — Reminder      (reminder)
Tab 13 → nächstes Tool
```

---

## Schritt-für-Schritt Integration

```
1. Ordner anlegen:         src/features/tools/toolname/
2. JSX erstellen:          TabToolname.jsx  (CSS Modules, kein Inline-CSS für statische Werte)
3. CSS erstellen:          TabToolname.module.css
4. toolRegistry.js:        Eintrag + SVG-Icon ergänzen (kein Emoji)
5. toolTabs.js:            toolname: 13  ← EINZIGE Stelle für Tab-Nummern
6. App.jsx:                import + {currentTab === TOOL_TAB.toolname && <TabToolname onBack={goBack} />}
```

> **TOOL_TAB ausschließlich in `src/features/tools/toolTabs.js` definieren.**  
> Alle anderen Dateien importieren von dort. Nie lokal redefinieren.

---

## toolTabs.js — Eintrag

```js
// src/features/tools/toolTabs.js
export const TOOL_TAB = {
  // ... bestehende ...
  toolname: 13,   // ← hier ergänzen
}
```

---

## toolRegistry.js — Eintrag

```js
// src/features/tools/toolRegistry.js
{
  id:         'toolname',
  name:       'Anzeigename',
  icon:       '🔧',        // Emoji-Fallback (wird in UI nicht gezeigt — ToolIcon nutzt SVG)
  color:      '#8B5CF6',
  standalone: true,
  integrated: false,       // true → Tool-Daten erscheinen im Kalender
}
```

SVG-Icon für das Tool in `ICONS` in `toolRegistry.js` ergänzen — `ToolIcon` nutzt dieses automatisch.

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

<ToolHeader title="Tool" sub="name" onBack={onBack} />
```

Oder manuell mit CSS Modules:

```jsx
<div className={s.header}>
  <button className={s.back} onClick={onBack}>← Tools</button>
  <div className={s.titleBlock}>
    <div className={s.eyebrow}>Tool</div>
    <div className={s.title}>Tool<em>name</em></div>
  </div>
</div>
```

```css
.header     { display:flex; align-items:center; gap:12px; padding:16px 16px 0; }
.back       { background:none; border:none; color:var(--text-dim); font-size:0.82rem; cursor:pointer; font-family:'Outfit',sans-serif; }
.titleBlock { display:flex; flex-direction:column; }
.eyebrow    { font-size:0.52rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(139,92,246,0.5); font-family:'Outfit',sans-serif; }
.title      { font-size:1.1rem; font-weight:700; font-family:'Outfit',sans-serif; color:var(--text); }
.title em   { color:var(--primary); font-style:normal; }
```

---

## Storage-Konvention

```js
// Immer sv/lv/SK — nie localStorage direkt
import { sv, lv, SK } from '../../../storage'

// SK-Eintrag in storage/index.js ergänzen:
//   toolname: `${PREFIX}toolname_data`,

const [data, setData] = useState(() => lv(SK.toolname, DEFAULT))
const save = (next) => { setData(next); sv(SK.toolname, next) }
```

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
