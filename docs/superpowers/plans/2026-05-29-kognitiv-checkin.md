# Kognitiv Check-in, Section & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily pre-session check-in (sleep/energy/meds/note), a KognitivSection card in the Tagesplaner, and per-module scheduling with automatic slot generation.

**Architecture:** `checkinStore.js` owns all check-in persistence; `CheckinModal` is injected into TabKognitiv's nav flow before the first module; `KognitivSection` follows the GewichtSection/ToolSection pattern for TabHeute; schedule slots are generated via a `useEffect` on `viewDate` changes in TabHeute.

**Tech Stack:** React 18, Zustand, CSS Modules, localStorage via `sv`/`lv` from `src/storage/index.js`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/storage/index.js` | Modify | Add `kognitivCheckin`, `kognitivSchedule` to SK + BACKUP_CATS |
| `src/features/tools/kognitiv/checkinStore.js` | Create | All check-in persistence (load/save/query) |
| `src/features/tools/kognitiv/CheckinModal.jsx` | Create | Overlay modal: sliders, medi fields, note, save/skip |
| `src/features/tools/kognitiv/CheckinModal.module.css` | Create | Styles for modal |
| `src/features/tools/kognitiv/KognitivSection.jsx` | Create | ToolSection card for TabHeute: check-in summary + session list |
| `src/features/tools/kognitiv/KognitivSection.module.css` | Create | Styles for section |
| `src/features/tools/kognitiv/KognitivSettings.jsx` | Create | Settings tab: per-module free/scheduled toggle + time/days config |
| `src/features/tools/kognitiv/KognitivSettings.module.css` | Create | Styles for settings |
| `src/features/tools/kognitiv/sessionStore.js` | Modify | `createSession` adds `checkinId` from today's check-in |
| `src/features/tools/kognitiv/TabKognitiv.jsx` | Modify | Add 'checkin' nav screen, import CheckinModal + KognitivSettings, third tab |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Modify | Add KognitivSection to SECTIONS map, schedule useEffect |

---

## Task 1: Storage keys

**Files:**
- Modify: `src/storage/index.js`

- [ ] **Add two new keys to SK and BACKUP_CATS**

In `src/storage/index.js`, add inside the `SK` object after `kognitiv`:

```js
kognitiv:        `${PREFIX}kognitiv_sessions`,
kognitivCheckin:  `${PREFIX}kognitiv_checkin`,
kognitivSchedule: `${PREFIX}kognitiv_schedule`,
```

And in `BACKUP_CATS.tools` array, add the two new keys:

```js
tools: [
  SK.recipes, SK.shopping, SK.shoppingStates, SK.selectedDishes,
  SK.weight, `${PREFIX}wdash`,
  SK.birthdays, SK.haushalt, SK.haushaltEnergie,
  SK.erfolge, SK.erfolgeTracking, SK.klaerenSettings,
  SK.kognitivCheckin, SK.kognitivSchedule,
],
```

- [ ] **Commit**

```bash
git add src/storage/index.js
git commit -m "feat: add kognitivCheckin and kognitivSchedule storage keys"
```

---

## Task 2: checkinStore.js

**Files:**
- Create: `src/features/tools/kognitiv/checkinStore.js`

- [ ] **Create the file with all persistence functions**

```js
import { sv, lv, SK } from '../../../storage'

const todayISO = () => new Date().toISOString().slice(0, 10)
const genId    = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export function loadCheckins() {
  return lv(SK.kognitivCheckin, {})
}

export function loadCheckin(date) {
  return loadCheckins()[date] ?? null
}

export function getTodayCheckin() {
  return loadCheckin(todayISO())
}

export function isCheckinDoneToday() {
  return getTodayCheckin() !== null
}

export function getLastCheckin() {
  const all   = loadCheckins()
  const dates = Object.keys(all).sort()
  return dates.length > 0 ? all[dates[dates.length - 1]] : null
}

// Returns the saved entry
export function saveCheckin({ sleep, energy, medi, note }) {
  const date  = todayISO()
  const entry = {
    id:      genId(),
    date,
    savedAt: new Date().toISOString(),
    sleep:   sleep  ?? null,
    energy:  energy ?? null,
    medi:    medi   ?? null,
    note:    note   ?? '',
  }
  sv(SK.kognitivCheckin, { ...loadCheckins(), [date]: entry })
  return entry
}
```

- [ ] **Commit**

```bash
git add src/features/tools/kognitiv/checkinStore.js
git commit -m "feat: add kognitiv checkinStore"
```

---

## Task 3: CheckinModal

**Files:**
- Create: `src/features/tools/kognitiv/CheckinModal.jsx`
- Create: `src/features/tools/kognitiv/CheckinModal.module.css`

- [ ] **Create CheckinModal.jsx**

```jsx
import { useState } from 'react'
import { getLastCheckin, saveCheckin } from './checkinStore'
import s from './CheckinModal.module.css'

function DotSlider({ value, onChange }) {
  return (
    <div className={s.dots}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={[s.dot, value >= n ? s.dotOn : ''].join(' ')}
          onClick={() => onChange(n)}
          aria-label={`${n} von 5`}
        />
      ))}
    </div>
  )
}

export default function CheckinModal({ onSave, onSkip }) {
  const last = getLastCheckin()

  const [sleep,    setSleep]    = useState(last?.sleep            ?? 3)
  const [energy,   setEnergy]   = useState(last?.energy           ?? 3)
  const [mediName, setMediName] = useState(last?.medi?.name       ?? '')
  const [mediDos,  setMediDos]  = useState(last?.medi?.dosierung  ?? '')
  const [mediTime, setMediTime] = useState('')   // never pre-filled
  const [note,     setNote]     = useState('')

  const handleSave = () => {
    const medi = mediName.trim()
      ? { name: mediName.trim(), dosierung: mediDos.trim(), uhrzeit: mediTime || null }
      : null
    const entry = saveCheckin({ sleep, energy, medi, note: note.trim() })
    onSave(entry)
  }

  return (
    <div className={s.backdrop}>
      <div className={s.modal}>
        <div className={s.header}>
          <div className={s.title}>Wie geht's dir heute?</div>
          <div className={s.sub}>Hilft dabei, die Ergebnisse einzuordnen</div>
        </div>

        <div className={s.body}>
          <div className={s.row}>
            <span className={s.label}>Schlaf</span>
            <DotSlider value={sleep} onChange={setSleep} />
          </div>
          <div className={s.row}>
            <span className={s.label}>Energie</span>
            <DotSlider value={energy} onChange={setEnergy} />
          </div>

          <div className={s.mediSection}>
            <div className={s.mediLabel}>Medikament</div>
            <input
              className={s.input}
              placeholder="Name (z.B. Ritalin)"
              value={mediName}
              onChange={e => setMediName(e.target.value)}
            />
            <div className={s.mediRow}>
              <input
                className={s.input}
                placeholder="Dosierung (z.B. 20mg)"
                value={mediDos}
                onChange={e => setMediDos(e.target.value)}
              />
              <input
                className={[s.input, s.timeInput].join(' ')}
                type="time"
                value={mediTime}
                onChange={e => setMediTime(e.target.value)}
              />
            </div>
          </div>

          <textarea
            className={s.textarea}
            placeholder="Notiz (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
          />
        </div>

        <div className={s.actions}>
          <button className={s.skipBtn} onClick={onSkip}>Überspringen</button>
          <button className={s.saveBtn} onClick={handleSave}>Fertig →</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Create CheckinModal.module.css**

```css
.backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.72);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 200; backdrop-filter: blur(4px);
}
.modal {
  background: #0f0f1a; border-radius: 20px 20px 0 0;
  border: 1.5px solid rgba(139,92,246,0.2); border-bottom: none;
  width: 100%; max-width: 480px; padding: 24px 20px 32px;
  display: flex; flex-direction: column; gap: 16px;
  max-height: 90vh; overflow-y: auto;
}
.header { display: flex; flex-direction: column; gap: 4px; }
.title { font-family: 'Outfit', sans-serif; font-size: 1.05rem; font-weight: 700; color: var(--text); }
.sub { font-size: 0.72rem; color: var(--text-dim); }
.body { display: flex; flex-direction: column; gap: 14px; }
.row { display: flex; align-items: center; gap: 12px; }
.label { font-size: 0.75rem; color: var(--text-dim); width: 52px; flex-shrink: 0; }
.dots { display: flex; gap: 8px; }
.dot {
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1);
  cursor: pointer; transition: all 0.15s; flex-shrink: 0;
}
.dotOn { background: rgba(139,92,246,0.5); border-color: var(--primary); box-shadow: 0 0 8px rgba(139,92,246,0.4); }
.mediSection { display: flex; flex-direction: column; gap: 8px; }
.mediLabel { font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; }
.mediRow { display: flex; gap: 8px; }
.input {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: var(--text); font-family: 'Outfit', sans-serif;
  font-size: 0.82rem; padding: 8px 10px; width: 100%; outline: none;
}
.input:focus { border-color: rgba(139,92,246,0.4); }
.timeInput { width: 110px; flex-shrink: 0; }
.textarea {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: var(--text); font-family: 'Outfit', sans-serif;
  font-size: 0.82rem; padding: 8px 10px; width: 100%; resize: none; outline: none;
}
.textarea:focus { border-color: rgba(139,92,246,0.4); }
.actions { display: flex; gap: 10px; margin-top: 4px; }
.skipBtn {
  flex: 1; padding: 11px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  color: var(--text-dim); font-family: 'Outfit', sans-serif; font-size: 0.82rem; cursor: pointer;
}
.saveBtn {
  flex: 2; padding: 11px; background: rgba(139,92,246,0.18);
  border: 1.5px solid rgba(139,92,246,0.5); border-radius: 10px;
  color: var(--primary); font-family: 'Outfit', sans-serif;
  font-size: 0.82rem; font-weight: 700; cursor: pointer;
}
```

- [ ] **Commit**

```bash
git add src/features/tools/kognitiv/CheckinModal.jsx src/features/tools/kognitiv/CheckinModal.module.css
git commit -m "feat: add kognitiv CheckinModal"
```

---

## Task 4: KognitivSection

**Files:**
- Create: `src/features/tools/kognitiv/KognitivSection.jsx`
- Create: `src/features/tools/kognitiv/KognitivSection.module.css`

- [ ] **Create KognitivSection.jsx**

```jsx
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { MODULE_CONFIG } from './moduleConfig'
import { loadSessions } from './sessionStore'
import { getTodayCheckin } from './checkinStore'
import s from './KognitivSection.module.css'

function DotDisplay({ value }) {
  if (value == null) return null
  return (
    <span className={s.dotDisp}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={[s.dotD, value >= n ? s.dotDOn : ''].join(' ')} />
      ))}
    </span>
  )
}

export default function KognitivSection() {
  const { setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('kognitiv', toolColors)
  const today     = new Date().toISOString().slice(0, 10)

  const checkin      = getTodayCheckin()
  const todaySessions = loadSessions().filter(sess => sess.date === today)
  const doneCount    = todaySessions.length

  const badgeText  = doneCount > 0 ? String(doneCount) : '○'
  const badgeBg    = doneCount > 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)'
  const badgeColor = doneCount > 0 ? 'var(--primary)' : 'var(--text-dim)'

  return (
    <ToolSection
      toolId="kognitiv"
      title="Kognitiv"
      badge={<span style={{ color: badgeColor }}>{badgeText}</span>}
      badgeBg={badgeBg}
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.kognitiv)}
    >
      <div className={s.body}>
        {checkin && (
          <div className={s.checkinRow}>
            {checkin.sleep != null && (
              <span className={s.checkinItem}>
                <span className={s.lbl}>Schlaf</span>
                <DotDisplay value={checkin.sleep} />
              </span>
            )}
            {checkin.energy != null && (
              <span className={s.checkinItem}>
                <span className={s.lbl}>Energie</span>
                <DotDisplay value={checkin.energy} />
              </span>
            )}
            {checkin.medi?.name && (
              <span className={s.checkinItem}>
                <span className={s.lbl}>💊</span>
                <span className={s.mediInfo}>
                  {checkin.medi.name}
                  {checkin.medi.dosierung ? ` ${checkin.medi.dosierung}` : ''}
                  {checkin.medi.uhrzeit   ? ` · ${checkin.medi.uhrzeit}` : ''}
                </span>
              </span>
            )}
            {checkin.note && <div className={s.note}>{checkin.note}</div>}
          </div>
        )}

        {todaySessions.length === 0 ? (
          <div className={s.empty}>Noch keine Session heute</div>
        ) : (
          <div className={s.sessions}>
            {todaySessions.map(sess => {
              const m    = MODULE_CONFIG[sess.moduleId]
              const time = new Date(sess.startedAt).toLocaleTimeString('de-DE', {
                hour: '2-digit', minute: '2-digit',
              })
              return (
                <div key={sess.id} className={s.sessRow}>
                  <span className={s.sessName}>{m?.name ?? sess.moduleId}</span>
                  <span className={s.sessVal}>{sess.mainMetric}{m?.mainMetricUnit}</span>
                  <span className={s.sessTime}>{time} Uhr</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ToolSection>
  )
}
```

- [ ] **Create KognitivSection.module.css**

```css
.body { padding: 12px 14px 10px; display: flex; flex-direction: column; gap: 10px; }
.checkinRow {
  display: flex; flex-wrap: wrap; gap: 8px 16px;
  padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.checkinItem { display: flex; align-items: center; gap: 6px; }
.lbl { font-size: 0.68rem; color: var(--text-dim); }
.dotDisp { display: flex; gap: 3px; align-items: center; }
.dotD { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.1); }
.dotDOn { background: var(--primary); }
.mediInfo { font-size: 0.72rem; color: var(--text-dim); }
.note { font-size: 0.72rem; color: var(--text-dim); font-style: italic; width: 100%; }
.empty { font-size: 0.75rem; color: var(--text-faint); padding: 2px 0; }
.sessions { display: flex; flex-direction: column; gap: 6px; }
.sessRow { display: flex; align-items: center; gap: 8px; }
.sessName { font-size: 0.75rem; color: var(--text-dim); flex: 1; }
.sessVal { font-family: 'Orbitron', sans-serif; font-size: 0.68rem; color: var(--primary); }
.sessTime { font-size: 0.65rem; color: var(--text-faint); }
```

- [ ] **Commit**

```bash
git add src/features/tools/kognitiv/KognitivSection.jsx src/features/tools/kognitiv/KognitivSection.module.css
git commit -m "feat: add KognitivSection for Tagesplaner"
```

---

## Task 5: KognitivSettings

**Files:**
- Create: `src/features/tools/kognitiv/KognitivSettings.jsx`
- Create: `src/features/tools/kognitiv/KognitivSettings.module.css`

- [ ] **Create KognitivSettings.jsx**

```jsx
import { useState } from 'react'
import { sv, lv, SK } from '../../../storage'
import { MODULE_CONFIG, MODULE_ORDER } from './moduleConfig'
import s from './KognitivSettings.module.css'

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export default function KognitivSettings() {
  const [schedule, setSchedule] = useState(() => lv(SK.kognitivSchedule, {}))

  const update = (moduleId, patch) => {
    const current = schedule[moduleId] ?? { mode: 'free' }
    const next    = { ...schedule, [moduleId]: { ...current, ...patch } }
    setSchedule(next)
    sv(SK.kognitivSchedule, next)
  }

  return (
    <div className={s.root}>
      {MODULE_ORDER.map(id => {
        const m           = MODULE_CONFIG[id]
        const cfg         = schedule[id] ?? { mode: 'free' }
        const isScheduled = cfg.mode === 'scheduled'

        return (
          <div key={id} className={s.card}>
            <div className={s.cardTop}>
              <span className={s.name}>{m.name}</span>
              <div className={s.modeToggle}>
                <button
                  className={[s.modeBtn, !isScheduled ? s.modeBtnOn : ''].join(' ')}
                  onClick={() => update(id, { mode: 'free' })}
                >
                  Frei
                </button>
                <button
                  className={[s.modeBtn, isScheduled ? s.modeBtnOn : ''].join(' ')}
                  onClick={() => update(id, {
                    mode: 'scheduled',
                    time: cfg.time ?? '09:00',
                    days: cfg.days ?? [1, 2, 3, 4, 5],
                  })}
                >
                  Termin
                </button>
              </div>
            </div>

            {isScheduled && (
              <div className={s.scheduleConfig}>
                <div className={s.timeRow}>
                  <span className={s.timeLabel}>Uhrzeit</span>
                  <input
                    type="time"
                    className={s.timeInput}
                    value={cfg.time ?? '09:00'}
                    onChange={e => update(id, { time: e.target.value })}
                  />
                </div>
                <div className={s.dayChips}>
                  {DAY_LABELS.map((lbl, idx) => {
                    const days = cfg.days ?? []
                    const on   = days.includes(idx)
                    return (
                      <button
                        key={idx}
                        className={[s.dayChip, on ? s.dayChipOn : ''].join(' ')}
                        onClick={() => {
                          const next = on
                            ? days.filter(d => d !== idx)
                            : [...days, idx].sort((a, b) => a - b)
                          update(id, { days: next })
                        }}
                      >
                        {lbl}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Create KognitivSettings.module.css**

```css
.root { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px;
}
.cardTop { display: flex; align-items: center; justify-content: space-between; }
.name { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.modeToggle {
  display: flex; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; overflow: hidden;
}
.modeBtn {
  background: none; border: none; color: var(--text-dim);
  font-family: 'Outfit', sans-serif; font-size: 0.72rem;
  padding: 5px 14px; cursor: pointer; transition: all 0.15s;
}
.modeBtnOn { background: rgba(139,92,246,0.2); color: var(--primary); }
.scheduleConfig { display: flex; flex-direction: column; gap: 10px; }
.timeRow { display: flex; align-items: center; gap: 10px; }
.timeLabel { font-size: 0.72rem; color: var(--text-dim); }
.timeInput {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: var(--text); font-family: 'Outfit', sans-serif;
  font-size: 0.85rem; padding: 6px 10px; outline: none; width: 108px;
}
.timeInput:focus { border-color: rgba(139,92,246,0.4); }
.dayChips { display: flex; gap: 6px; flex-wrap: wrap; }
.dayChip {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px; color: var(--text-dim); font-size: 0.68rem;
  font-family: 'Outfit', sans-serif; padding: 4px 10px; cursor: pointer; transition: all 0.15s;
}
.dayChipOn {
  background: rgba(139,92,246,0.2); border-color: rgba(139,92,246,0.5); color: var(--primary);
}
```

- [ ] **Commit**

```bash
git add src/features/tools/kognitiv/KognitivSettings.jsx src/features/tools/kognitiv/KognitivSettings.module.css
git commit -m "feat: add KognitivSettings component"
```

---

## Task 6: sessionStore — add checkinId

**Files:**
- Modify: `src/features/tools/kognitiv/sessionStore.js`

- [ ] **Add import of getTodayCheckin and checkinId to createSession**

At the top of `sessionStore.js`, add the import (after existing imports):

```js
import { getTodayCheckin } from './checkinStore'
```

Then update `createSession`:

```js
export function createSession({ moduleId, variant, startedAt, duration, score, mainMetric, taps }) {
  return {
    id:        genId(),
    moduleId,
    variant,
    date:      startedAt.slice(0, 10),
    startedAt,
    duration,
    score,
    mainMetric,
    taps,
    checkinId: getTodayCheckin()?.id ?? null,
  }
}
```

- [ ] **Commit**

```bash
git add src/features/tools/kognitiv/sessionStore.js
git commit -m "feat: attach checkinId to kognitiv sessions"
```

---

## Task 7: TabKognitiv — check-in screen + settings tab

**Files:**
- Modify: `src/features/tools/kognitiv/TabKognitiv.jsx`

- [ ] **Add imports**

At the top of `TabKognitiv.jsx`, add after existing imports:

```js
import { isCheckinDoneToday } from './checkinStore'
import CheckinModal    from './CheckinModal'
import KognitivSettings from './KognitivSettings'
```

- [ ] **Update handleSelectModule to show check-in first**

Replace the existing `handleSelectModule` function:

```js
const handleSelectModule = (moduleId) => {
  if (isDoneToday(moduleId)) {
    setNav({ screen: 'done-today', moduleId })
  } else if (!isCheckinDoneToday()) {
    setNav({ screen: 'checkin', moduleId })
  } else {
    setNav({ screen: 'briefing', moduleId })
  }
}
```

- [ ] **Add check-in nav screen** — insert before the `if (nav?.screen === 'briefing')` block:

```jsx
if (nav?.screen === 'checkin') {
  return (
    <CheckinModal
      onSave={() => setNav({ screen: 'briefing', moduleId: nav.moduleId })}
      onSkip={() => setNav({ screen: 'briefing', moduleId: nav.moduleId })}
    />
  )
}
```

- [ ] **Add Einstellungen tab button** — in the tab bar section, add a third button:

```jsx
<div className={s.tabBar}>
  <button className={[s.tabBtn, tab === 'modules'    ? s.tabOn : ''].join(' ')} onClick={() => setTab('modules')}>Module</button>
  <button className={[s.tabBtn, tab === 'dashboard'  ? s.tabOn : ''].join(' ')} onClick={() => setTab('dashboard')}>Dashboard</button>
  <button className={[s.tabBtn, tab === 'settings'   ? s.tabOn : ''].join(' ')} onClick={() => setTab('settings')}>Einstellungen</button>
</div>
```

- [ ] **Update content rendering to handle settings tab**

Replace the current `{tab === 'modules' ? ... : ...}` expression:

```jsx
<div className={s.content}>
  {tab === 'modules'
    ? <ModuleList onSelectModule={handleSelectModule} />
    : tab === 'dashboard'
    ? <Dashboard onSelectModule={(id) => setNav({ screen: 'module-detail', moduleId: id })} />
    : <KognitivSettings />
  }
</div>
```

- [ ] **Commit**

```bash
git add src/features/tools/kognitiv/TabKognitiv.jsx
git commit -m "feat: integrate check-in modal and settings tab into TabKognitiv"
```

---

## Task 8: TabHeute — KognitivSection + schedule slots

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Add imports** at the top of `TabHeute.jsx` (after existing imports):

```js
import KognitivSection from '../../tools/kognitiv/KognitivSection'
import { MODULE_CONFIG } from '../../tools/kognitiv/moduleConfig'
```

- [ ] **Add KognitivSection to SECTIONS map**

Find this line:
```js
const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, erfolge: ErfolgeSection, gewicht: GewichtSection, geburtstage: BirthdaySection }
```

Replace with:
```js
const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, erfolge: ErfolgeSection, gewicht: GewichtSection, geburtstage: BirthdaySection, kognitiv: KognitivSection }
```

- [ ] **Add schedule slot useEffect** — add this after the existing `useEffect` blocks (before the handlers), near line 82:

```js
// ─── Kognitiv schedule slots ──────────────────────────────
useEffect(() => {
  const schedule = lv(SK.kognitivSchedule, {})
  if (Object.keys(schedule).length === 0) return

  const dayOfWeek    = new Date(viewDate + 'T12:00:00').getDay() // 0=So…6=Sa
  const currentSlots = lv(SK.days, {})[viewDate] ?? {}
  const newSlots     = {}

  Object.entries(schedule).forEach(([moduleId, cfg]) => {
    if (cfg.mode !== 'scheduled') return
    if (!(cfg.days ?? []).includes(dayOfWeek)) return

    const alreadyExists = Object.values(currentSlots).some(
      slot => slot?.toolId === 'kognitiv' && slot?.moduleId === moduleId
    )
    if (alreadyExists) return

    const [h]    = (cfg.time ?? '09:00').split(':').map(Number)
    const slotKey = String(h)
    if (currentSlots[slotKey]) return

    const m = MODULE_CONFIG[moduleId]
    newSlots[slotKey] = {
      text:     `🧠 ${m.name}`,
      color:    '#8B5CF6',
      duration: 30,
      locked:   true,
      done:     false,
      toolId:   'kognitiv',
      moduleId,
    }
  })

  if (Object.keys(newSlots).length > 0) {
    setDays(prev => ({
      ...prev,
      [viewDate]: { ...(prev[viewDate] ?? {}), ...newSlots },
    }))
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [viewDate])
```

- [ ] **Verify** — open app in browser, navigate to Tools → Kognitiv. Confirm:
  - Three tabs appear: Module / Dashboard / Einstellungen
  - On first module selection today: CheckinModal appears with pre-filled Schlaf/Energie sliders
  - Skipping goes straight to Briefing
  - Saving goes straight to Briefing
  - After doing a session: KognitivSection in Tagesplaner shows the session with time
  - Setting a module to "Termin" with a weekday: tomorrow (or force-navigate to that day) shows the 🧠 slot

- [ ] **Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: add KognitivSection and schedule slots to TabHeute"
```
