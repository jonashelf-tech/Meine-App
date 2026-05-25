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
Tab 15 → nächstes Tool
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

## Tagesplaner-Widget (HaushaltSection / ReminderSection Pattern)

Tools können als eingebettete Sektion im Tagesplaner erscheinen (unter dem Pool).
Bedingung: `activeTools.includes('toolid')` in `TabHeute.jsx`.

```jsx
// In TabHeute.jsx ergänzen:
import ToolnameSection from '../../tools/toolname/ToolnameSection'
// Im JSX:
{activeTools.includes('toolname') && <ToolnameSection />}
```
