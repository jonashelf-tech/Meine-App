# Tool — Integration (Claude Code)

## Bestehende Tools & Tab-Nummern

```
Tab 4  — Geburtstage
Tab 5  — Timer
Tab 6  — Rezepte
Tab 7  — Pizza
Tab 8  — Elvi
Tab 9  — Gewicht
Tab 10 — Gamification
Tab 11 — Zufallsrad
Tab 12 — Reminder       (src/features/tools/reminder/)
Tab 13 → nächstes Tool
```

---

## toolRegistry.js — Eintrag

```js
// src/features/tools/toolRegistry.js
{ id: 'toolname', name: 'Anzeigename', icon: '🔧', color: '#8B5CF6', standalone: true, integrated: false }

// integrated: true → Tool-Daten erscheinen im Kalender
```

---

## App.jsx — Routing

```jsx
// Import oben
import TabToolname from './features/tools/toolname/TabToolname'

// In der Tab-Liste
{currentTab === 13 && <TabToolname onBack={goBack} />}
```

---

## TabTools.jsx — TOOL_TAB Mapping

```js
const TOOL_TAB = {
  // ... bestehende ...
  toolname: 13,
}
```

---

## Header-Pattern (CSS Modules)

```jsx
<div className={s.header}>
  <button className={s.back} onClick={onBack}>← Tools</button>
  <div className={s.titleBlock}>
    <div className={s.eyebrow}>Tool</div>
    <div className={s.title}>Tool<em>name</em></div>
  </div>
</div>

/* CSS:
.header { display:flex; align-items:center; gap:12px; padding:16px 16px 0; }
.back { background:none; border:none; color:var(--text-dim); font-size:0.82rem; cursor:pointer; font-family:'Outfit',sans-serif; }
.titleBlock { display:flex; flex-direction:column; }
.eyebrow { font-size:0.52rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(139,92,246,0.5); font-family:'Outfit',sans-serif; }
.title { font-size:1.1rem; font-weight:700; font-family:'Outfit',sans-serif; font-weight:700; color:var(--text); }
.title em { color:var(--primary); font-style:normal; }
*/
```

---

## Storage-Konvention

```js
// Direkt localStorage, kein SK, eigener Prefix
const KEY = 'adhs_toolname_v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? DEFAULT } catch { return DEFAULT } }
const save = (data) => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {} }
```

---

## Unterwegs-Tool integrieren

```
1. JSX liegt in: adhs-app/_incoming/ToolName.jsx
2. Ordner anlegen: src/features/tools/toolname/
3. JSX → TabToolname.jsx (Inline Styles → CSS Module umschreiben)
4. TabToolname.module.css anlegen
5. toolRegistry.js: Eintrag hinzufügen
6. TabTools.jsx: TOOL_TAB[toolname] = nächste Nummer
7. App.jsx: import + Tab-Zeile
```

---

## Kalender-Integration

Tool-Daten im Kalender sichtbar machen:

```js
import { useAppStore } from '../../../store'
const { days, setDays } = useAppStore()

const writeToCalendar = (date, slotKey, entry) => {
  setDays(prev => ({
    ...prev,
    [date]: { ...(prev[date] ?? {}), [slotKey]: entry }
  }))
}

// entry Format:
{ text: 'Session: Toolname', color: '#8B5CF6', duration: 30, locked: true }
```
