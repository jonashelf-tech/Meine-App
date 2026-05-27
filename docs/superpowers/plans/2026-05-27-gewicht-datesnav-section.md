# Gewichttracker — Datumsnavigation & Tagesplaner-Widget

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NavPill-style Datumsnavigation im Gewichttracker-Input und neues GewichtSection-Widget im Tagesplaner.

**Architecture:** Shared helpers in `gewichtData.js` (analog `haushaltData.js`). TabGewicht importiert daraus statt inliner Definitionen. GewichtSection nutzt dieselben Helpers + `ToolSection`-Pattern von HaushaltSection. TabHeute bindet GewichtSection via `activeTools` ein.

**Tech Stack:** React 18, Vite, CSS Modules, localStorage (kein Zustand-Store nötig)

---

## File Map

| Aktion | Datei |
|--------|-------|
| Create | `src/features/tools/gewicht/gewichtData.js` |
| Modify | `src/features/tools/gewicht/TabGewicht.jsx` |
| Modify | `src/features/tools/gewicht/TabGewicht.module.css` |
| Create | `src/features/tools/gewicht/GewichtSection.jsx` |
| Create | `src/features/tools/gewicht/GewichtSection.module.css` |
| Modify | `src/features/calendar/TabHeute/TabHeute.jsx` |

---

## Task 1: Shared Data-Helpers (`gewichtData.js`)

**Files:**
- Create: `src/features/tools/gewicht/gewichtData.js`

- [ ] **Schritt 1: Datei anlegen**

```js
export const SK_WEIGHT = 'adhs_health_weight'

export const isoToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const isoAddDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// "27.05" – kurz für Verlauf
export const isoLabel = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

// "So, 27. Mai" – für NavPill
const DAYS   = ['So','Mo','Di','Mi','Do','Fr','Sa']
const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
export const isoNavLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]}, ${d}. ${MONTHS[m - 1]}`
}

export const loadEntries = () => {
  try {
    const r = localStorage.getItem(SK_WEIGHT)
    if (!r) return []
    return JSON.parse(r)
      .map(e => ({ date: e.date, kg: e.kg ?? e.weight ?? null, kcal: e.kcal ?? null }))
      .filter(e => e.date && e.kg != null)
  } catch { return [] }
}

export const saveEntries = entries => {
  try { localStorage.setItem(SK_WEIGHT, JSON.stringify(entries)) } catch {}
}

export const upsertEntry = (entries, rec) => {
  const idx = entries.findIndex(e => e.date === rec.date)
  const next = idx >= 0
    ? entries.map((e, i) => i === idx ? rec : e)
    : [...entries, rec].sort((a, b) => a.date.localeCompare(b.date))
  saveEntries(next)
  return next
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/features/tools/gewicht/gewichtData.js
git commit -m "feat(gewicht): extract shared data helpers to gewichtData.js"
```

---

## Task 2: TabGewicht — Helpers importieren + NavPill-Datumsnavigation

**Files:**
- Modify: `src/features/tools/gewicht/TabGewicht.jsx`
- Modify: `src/features/tools/gewicht/TabGewicht.module.css`

### 2a: TabGewicht.jsx

- [ ] **Schritt 1: Import-Block oben ersetzen**

Alten Block (Zeilen 1–13, alle lokalen Helpers + SK) **komplett entfernen** und durch diesen ersetzen:

```jsx
import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import {
  SK_WEIGHT, isoToday, isoAddDays, isoLabel, isoNavLabel,
  loadEntries, saveEntries, upsertEntry,
} from './gewichtData'
import s from './TabGewicht.module.css'

const SK_DASH = 'adhs_wdash'
```

- [ ] **Schritt 2: Alle lokalen Helper-Funktionen löschen**

In TabGewicht.jsx die folgenden Blöcke entfernen (sie leben jetzt in gewichtData.js):
- `const isoToday = ...`
- `const isoAddDays = ...`
- `const isoLabel = ...`
- `const SK = 'adhs_health_weight'`
- `const loadEntries = ...`
- `const saveEntries = ...`

Die Stats-Funktionen (`wAvg`, `kcalAvg`, `estimatedMaintenance`, `weeklyChangeTrend`) bleiben — sie sind nur intern.

- [ ] **Schritt 3: `useRef` für das versteckte Date-Input hinzufügen**

Im Component direkt nach den bestehenden `useRef(null)` für `chartRef` ergänzen:

```jsx
const dateInputRef = useRef(null)
```

- [ ] **Schritt 4: `submitEntry` auf `upsertEntry` umstellen**

Alte `submitEntry` Funktion:
```jsx
const submitEntry = () => {
  const kg   = parseFloat(inputKg.replace(',','.'))
  const kcal = parseInt(inputKcal) || null
  if (!inputKg.trim()||isNaN(kg)||kg<20||kg>300) return
  const rec  = { date:inputDate, kg:Math.round(kg*10)/10, kcal:kcal&&kcal>0?kcal:null }
  const idx  = entries.findIndex(e=>e.date===inputDate)
  setEntries(idx>=0 ? entries.map((e,i)=>i===idx?rec:e) : [...entries,rec].sort((a,b)=>a.date.localeCompare(b.date)))
}
```

Ersetzen durch:
```jsx
const submitEntry = () => {
  const kg   = parseFloat(inputKg.replace(',', '.'))
  const kcal = parseInt(inputKcal) || null
  if (!inputKg.trim() || isNaN(kg) || kg < 20 || kg > 300) return
  const rec  = { date: inputDate, kg: Math.round(kg * 10) / 10, kcal: kcal && kcal > 0 ? kcal : null }
  setEntriesRaw(upsertEntry(entries, rec))
}
```

- [ ] **Schritt 5: `setEntries`-Hilfsfunktion entfernen**

Die Zeile `const setEntries = e => { setEntriesRaw(e); saveEntries(e) }` entfernen (upsertEntry speichert jetzt selbst).

- [ ] **Schritt 6: `deleteEntry` anpassen**

```jsx
const deleteEntry = date => {
  const next = entries.filter(e => e.date !== date)
  saveEntries(next)
  setEntriesRaw(next)
}
```

- [ ] **Schritt 7: `inputDateRow` im JSX ersetzen**

Alten Block:
```jsx
<div className={s.inputDateRow}>
  <input type="date" className={s.dateInput} value={inputDate} onChange={e=>setInputDate(e.target.value)} />
  {isEditing && <span className={s.editBadge}>bearbeiten</span>}
</div>
```

Ersetzen durch:
```jsx
<div className={s.inputDateRow}>
  <div className={s.dateNav}>
    <button className={s.dateArrow} onClick={() => setInputDate(isoAddDays(inputDate, -1))} aria-label="Vorheriger Tag">‹</button>
    <button
      className={[s.dateNavLabel, inputDate === today ? s.dateNavLabelToday : ''].join(' ')}
      onClick={() => {
        try { dateInputRef.current?.showPicker() } catch { dateInputRef.current?.click() }
      }}
    >
      {isoNavLabel(inputDate)}
    </button>
    <button className={s.dateArrow} onClick={() => setInputDate(isoAddDays(inputDate, 1))} aria-label="Nächster Tag">›</button>
  </div>
  <input
    ref={dateInputRef}
    type="date"
    className={s.dateInputHidden}
    value={inputDate}
    onChange={e => setInputDate(e.target.value)}
    tabIndex={-1}
    aria-hidden="true"
  />
  {isEditing && <span className={s.editBadge}>bearbeiten</span>}
</div>
```

### 2b: TabGewicht.module.css

- [ ] **Schritt 8: `.dateInput` ersetzen durch neue Klassen**

`.dateInput`-Regel entfernen. Folgende neue Regeln einfügen (nach `.inputDateRow`):

```css
.dateNav {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px;
  gap: 0;
  flex: 1;
}

.dateArrow {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 1.4rem;
  font-weight: 700;
  min-width: 40px;
  min-height: 40px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.dateArrow:hover { color: var(--text); }

.dateNavLabel {
  flex: 1;
  text-align: center;
  font-family: 'Outfit', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
}

.dateNavLabelToday {
  color: var(--tool-color, var(--primary));
}

.dateInputHidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
  overflow: hidden;
}
```

- [ ] **Schritt 9: Im Browser prüfen**
  - Gewichttracker öffnen
  - Datumsnavigation zeigt `Mo, 27. Mai` (o.ä.)
  - `‹`/`›` navigieren tagesweise
  - Klick auf Label öffnet nativen Datepicker
  - "bearbeiten"-Badge erscheint wenn Eintrag vorhanden
  - Heute-Datum leuchtet in Tool-Farbe

- [ ] **Schritt 10: Commit**

```bash
git add src/features/tools/gewicht/TabGewicht.jsx src/features/tools/gewicht/TabGewicht.module.css
git commit -m "feat(gewicht): NavPill-style Datumsnavigation im Input-Bereich"
```

---

## Task 3: GewichtSection — Widget für Tagesplaner

**Files:**
- Create: `src/features/tools/gewicht/GewichtSection.jsx`
- Create: `src/features/tools/gewicht/GewichtSection.module.css`

### 3a: GewichtSection.jsx

- [ ] **Schritt 1: Datei erstellen**

```jsx
import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import {
  isoToday, isoAddDays, isoNavLabel,
  loadEntries, upsertEntry,
} from './gewichtData'
import s from './GewichtSection.module.css'

export default function GewichtSection() {
  const { setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('gewicht', toolColors)
  const today = isoToday()

  const [entries, setEntries] = useState(loadEntries)
  const [date,    setDate]    = useState(today)
  const [inputKg,   setInputKg]   = useState('')
  const [inputKcal, setInputKcal] = useState('')
  const dateInputRef = useRef(null)

  // Felder befüllen wenn Datum wechselt
  useEffect(() => {
    const ex = entries.find(e => e.date === date)
    setInputKg  (ex?.kg   != null ? String(ex.kg)   : '')
    setInputKcal(ex?.kcal != null ? String(ex.kcal) : '')
  }, [date, entries])

  const hasToday = entries.some(e => e.date === today)

  const handleSave = () => {
    const kg   = parseFloat(inputKg.replace(',', '.'))
    const kcal = parseInt(inputKcal) || null
    if (!inputKg.trim() || isNaN(kg) || kg < 20 || kg > 300) return
    const rec  = { date, kg: Math.round(kg * 10) / 10, kcal: kcal && kcal > 0 ? kcal : null }
    setEntries(upsertEntry(entries, rec))
  }

  const openPicker = () => {
    try { dateInputRef.current?.showPicker() } catch { dateInputRef.current?.click() }
  }

  const badgeText   = hasToday ? '✓' : '○'
  const badgeBg     = hasToday
    ? 'rgba(16,185,129,0.12)'
    : 'rgba(255,255,255,0.06)'
  const badgeColor  = hasToday ? 'var(--emerald)' : 'var(--text-dim)'
  const isEditing   = !!entries.find(e => e.date === date)

  return (
    <ToolSection
      toolId="gewicht"
      title="Gewicht"
      badge={<span style={{ color: badgeColor }}>{badgeText}</span>}
      badgeBg={badgeBg}
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.gewicht)}
    >
      <div className={s.body}>
        {/* Datum-Nav */}
        <div className={s.dateNav}>
          <button className={s.dateArrow} onClick={() => setDate(isoAddDays(date, -1))} aria-label="Vorheriger Tag">‹</button>
          <button
            className={[s.dateLabel, date === today ? s.dateLabelToday : ''].join(' ')}
            onClick={openPicker}
          >
            {isoNavLabel(date)}
          </button>
          <button className={s.dateArrow} onClick={() => setDate(isoAddDays(date, 1))} aria-label="Nächster Tag">›</button>
          <input
            ref={dateInputRef}
            type="date"
            className={s.dateInputHidden}
            value={date}
            onChange={e => setDate(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
          />
          {isEditing && <span className={s.editBadge}>bearbeiten</span>}
        </div>

        {/* Eingabefelder */}
        <div className={s.inputRow}>
          <div className={s.field}>
            <span className={s.unit}>kg</span>
            <input
              className={s.numInput}
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="—"
              value={inputKg}
              onChange={e => setInputKg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className={s.field}>
            <span className={s.unit}>kcal</span>
            <input
              className={s.numInput}
              type="number"
              step="10"
              min="0"
              max="20000"
              placeholder="—"
              value={inputKcal}
              onChange={e => setInputKcal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <button className={s.saveBtn} onClick={handleSave} disabled={!inputKg.trim()}>✓</button>
        </div>
      </div>
    </ToolSection>
  )
}
```

### 3b: GewichtSection.module.css

- [ ] **Schritt 2: CSS-Datei erstellen**

```css
.body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0 2px;
}

/* ─── Datum-Navigation ──────────────────────────────────── */
.dateNav {
  display: flex;
  align-items: center;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px;
  position: relative;
}

.dateArrow {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 1.3rem;
  font-weight: 700;
  min-width: 38px;
  min-height: 38px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.dateArrow:hover { color: var(--text); }

.dateLabel {
  flex: 1;
  background: none;
  border: none;
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  padding: 2px;
  border-radius: 6px;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
}

.dateLabelToday {
  color: var(--primary);
}

.dateInputHidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
  overflow: hidden;
}

.editBadge {
  font-family: 'Outfit', sans-serif;
  font-size: 0.62rem;
  color: var(--primary);
  background: rgba(139,92,246,0.1);
  border: 1px solid rgba(139,92,246,0.2);
  border-radius: 4px;
  padding: 2px 5px;
  flex-shrink: 0;
  margin-right: 4px;
}

/* ─── Eingabe ────────────────────────────────────────────── */
.inputRow {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.unit {
  font-family: 'Outfit', sans-serif;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.numInput {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: 'Orbitron', monospace;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 7px 8px;
  outline: none;
  width: 100%;
  text-align: center;
}
.numInput:focus { border-color: var(--primary); }

.saveBtn {
  background: rgba(139,92,246,0.12);
  border: 1.5px solid rgba(139,92,246,0.3);
  border-radius: var(--r-sm);
  color: var(--primary);
  font-size: 1rem;
  font-weight: 700;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}
.saveBtn:hover { background: rgba(139,92,246,0.22); }
.saveBtn:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/tools/gewicht/GewichtSection.jsx src/features/tools/gewicht/GewichtSection.module.css
git commit -m "feat(gewicht): GewichtSection-Widget für Tagesplaner"
```

---

## Task 4: GewichtSection in TabHeute einbinden

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: Import hinzufügen**

In `TabHeute.jsx` nach dem `ErfolgeSection`-Import einfügen:

```jsx
import GewichtSection from '../../tools/gewicht/GewichtSection'
```

- [ ] **Schritt 2: SECTIONS-Map erweitern**

Bestehende SECTIONS-Zuweisung (ca. Zeile 399):
```jsx
const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, erfolge: ErfolgeSection }
```

Ersetzen durch:
```jsx
const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, erfolge: ErfolgeSection, gewicht: GewichtSection }
```

- [ ] **Schritt 3: Im Browser prüfen**
  - Gewicht-Tool als aktives Tool einstellen (falls nicht schon der Fall)
  - Im Tagesplaner scrollt GewichtSection unten auf
  - Badge zeigt `○` (grau) wenn kein heutiger Eintrag, `✓` (grün) wenn vorhanden
  - Klick auf Titel → navigiert zu TabGewicht (Tab 9)
  - Datum-Navigation funktioniert
  - Eingabe speichert korrekt (nach Speichern im Tool bestätigen)

- [ ] **Schritt 4: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat(tagesplaner): GewichtSection ins Tagesplaner-Widget-System einbinden"
```

---

## Self-Review

**Spec-Abdeckung:**
- ✅ NavPill-style Datumsnav im Gewichttracker (Task 2)
- ✅ Default: heute (Task 2, `useState(today)`)
- ✅ Klick auf Datum öffnet Minikalender (Task 2+3, `showPicker()` via ref)
- ✅ GewichtSection im Tagesplaner (Task 3)
- ✅ Indikator wenn heute kein Eintrag (Task 3, Badge `○`/`✓`)
- ✅ Gewicht + kcal Eingabe (Task 3)
- ✅ Datumspfeile auch im Widget (Task 3)
- ✅ Verlinkung zu TabGewicht (Task 3, `onTitleClick`)
- ✅ Optik/Verhalten wie Haushalt (`ToolSection`-Pattern)

**Typen-Konsistenz:**
- `upsertEntry(entries, rec)` — definiert Task 1, genutzt Task 2 + 3 ✅
- `isoNavLabel(iso)` — definiert Task 1, genutzt Task 2 + 3 ✅
- `loadEntries()` / `saveEntries(entries)` — definiert Task 1, genutzt Task 2 + 3 ✅

**Kein Placeholder, kein TODO in Plantext** ✅
