# Haushalt-Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neurodivergenzfreundliches Haushalts-Tool mit Tagesplaner-Integration und Standalone-Tab — keine Putz-App, sondern ein Regulationssystem.

**Architecture:** Data layer (`haushaltData.js`) hält DEFAULT_ROOMS, Smart Queue Algorithmus und CRUD-Helpers; `ToolSection` ist eine wiederverwendbare Accordion-Komponente für alle Tagesplaner-Tool-Cards; `HaushaltSection` baut darauf auf; `TabHaushalt` ist der Standalone-Tab mit Queue-View und Räume-View.

**Tech Stack:** React 18, Vite, Zustand (`useAppStore`), CSS Modules, `sv/lv/SK` aus `src/storage/index.js`, `createBlock` aus `src/features/todos/Block.js`, `TodoChip` aus `src/components/TodoChip/TodoChip.jsx`

---

## File Structure

| Datei | Aktion | Verantwortlichkeit |
|---|---|---|
| `src/storage/index.js` | Modify | SK.haushalt key hinzufügen |
| `src/features/tools/haushalt/haushaltData.js` | Create | Datenmodell, DEFAULT_ROOMS, Smart Queue, CRUD |
| `src/components/ToolSection/ToolSection.jsx` | Create | Wiederverwendbare Accordion-Card für alle Tool-Sections im Tagesplaner |
| `src/components/ToolSection/ToolSection.module.css` | Create | CSS für ToolSection |
| `src/features/tools/toolRegistry.jsx` | Modify | haushalt ICON + TOOL_REGISTRY Eintrag |
| `src/features/tools/haushalt/HaushaltSection.jsx` | Create | Tagesplaner-Card: Modus wählen → Chips → Transfer |
| `src/features/tools/haushalt/HaushaltSection.module.css` | Create | CSS für HaushaltSection |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Modify | HaushaltSection einbinden |
| `src/features/tools/haushalt/TabHaushalt.jsx` | Create | Standalone Tab: Queue-View + Räume-View |
| `src/features/tools/haushalt/TabHaushalt.module.css` | Create | CSS für TabHaushalt |
| `src/features/tools/toolTabs.js` | Modify | haushalt: 13 |
| `src/App.jsx` | Modify | Import TabHaushalt + Routing |

---

## Task 1: Data Layer

**Files:**
- Modify: `src/storage/index.js`
- Create: `src/features/tools/haushalt/haushaltData.js`

- [ ] **Step 1: SK.haushalt in storage/index.js eintragen**

  In `src/storage/index.js` die Zeile nach `birthdays` einfügen:

  ```js
  // Existing:
  birthdays:      `${PREFIX}birthdays`,
  accentColor:    `${PREFIX}app_accent`,

  // Add before accentColor:
  haushalt:       `${PREFIX}haushalt_v1`,
  ```

  Exakt: In der SK-Objekt-Definition (ca. Zeile 38) einfügen:
  ```js
  haushalt:       `${PREFIX}haushalt_v1`,
  ```

- [ ] **Step 2: Verzeichnis anlegen und haushaltData.js erstellen**

  Datei: `src/features/tools/haushalt/haushaltData.js`

  ```js
  import { sv, lv, SK } from '../../../storage'

  // ─── Mode levels ─────────────────────────────────────────
  // Lower number = appears in more modes.
  // survival(0) shows in all 3 modes. boost(2) only in boost.
  export const MODE_LEVEL = { survival: 0, maintain: 1, boost: 2 }

  export const MODE_META = {
    survival: { label: '🛡 Survival', color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
    maintain: { label: '🔄 Maintain', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
    boost:    { label: '✨ Boost',    color: '#10B981', bg: 'rgba(16,185,129,0.12)'   },
  }

  // ─── Frequency labels ─────────────────────────────────────
  export const FREQ_LABELS = {
    daily:    'täglich',
    biweekly: '2× pro Woche',
    weekly:   'wöchentlich',
    monthly:  'monatlich',
    custom:   'individuell',
  }

  // ─── Frequency → days mapping ─────────────────────────────
  const FREQ_DAYS = {
    daily:    1,
    biweekly: 3,   // 2-3× per week ≈ every 3 days
    weekly:   7,
    monthly:  30,
  }

  function freqToDays(task) {
    if (task.freq === 'custom') return task.customDays ?? 7
    return FREQ_DAYS[task.freq] ?? 7
  }

  // Returns how many days ago isoDate was. 999 if never done.
  function daysSince(isoDate) {
    if (!isoDate) return 999
    const d = new Date(isoDate + 'T00:00:00')
    return Math.floor((Date.now() - d.getTime()) / 86_400_000)
  }

  // ─── Default rooms ────────────────────────────────────────
  export const DEFAULT_ROOMS = [
    {
      id: 'kueche',
      name: 'Küche',
      icon: '🍳',
      tasks: [
        {
          id: 'kueche-1', text: 'Abwasch / Spülmaschine', duration: 15,
          freq: 'daily', customDays: null, minMode: 'survival', lastDone: null, subItems: [],
        },
        {
          id: 'kueche-2', text: 'Müll rausbringen', duration: 10,
          freq: 'biweekly', customDays: null, minMode: 'survival', lastDone: null, subItems: [],
        },
        {
          id: 'kueche-3', text: 'Herd abwischen', duration: 10,
          freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
        },
        {
          id: 'kueche-4', text: 'Kühlschrank ausräumen', duration: 30,
          freq: 'monthly', customDays: null, minMode: 'boost', lastDone: null, subItems: [],
        },
      ],
    },
    {
      id: 'bad',
      name: 'Bad',
      icon: '🚿',
      tasks: [
        {
          id: 'bad-1', text: 'WC reinigen', duration: 10,
          freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
        },
        {
          id: 'bad-2', text: 'Waschbecken', duration: 5,
          freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
        },
        {
          id: 'bad-3', text: 'Dusche / Wanne', duration: 15,
          freq: 'weekly', customDays: null, minMode: 'boost', lastDone: null, subItems: [],
        },
      ],
    },
    {
      id: 'wohnzimmer',
      name: 'Wohnzimmer',
      icon: '🛋',
      tasks: [
        {
          id: 'wz-1', text: 'Aufräumen', duration: 15,
          freq: 'weekly', customDays: null, minMode: 'survival', lastDone: null, subItems: [],
        },
        {
          id: 'wz-2', text: 'Fenster putzen', duration: 20,
          freq: 'monthly', customDays: null, minMode: 'boost', lastDone: null, subItems: [],
        },
      ],
    },
    {
      id: 'schlafzimmer',
      name: 'Schlafzimmer',
      icon: '🛏',
      tasks: [
        {
          id: 'sz-1', text: 'Bett machen', duration: 5,
          freq: 'daily', customDays: null, minMode: 'survival', lastDone: null, subItems: [],
        },
        {
          id: 'sz-2', text: 'Staubsaugen', duration: 15,
          freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
        },
      ],
    },
    {
      id: 'flur',
      name: 'Flur',
      icon: '🚪',
      tasks: [
        {
          id: 'flur-1', text: 'Staubsaugen', duration: 10,
          freq: 'weekly', customDays: null, minMode: 'maintain', lastDone: null, subItems: [],
        },
        {
          id: 'flur-2', text: 'Boden wischen', duration: 15,
          freq: 'biweekly', customDays: null, minMode: 'boost', lastDone: null, subItems: [],
        },
      ],
    },
  ]

  // ─── Storage helpers ──────────────────────────────────────
  export function loadHaushalt() {
    return lv(SK.haushalt, { rooms: DEFAULT_ROOMS, selectedMode: 'maintain' })
  }

  export function saveHaushalt(config) {
    sv(SK.haushalt, config)
  }

  // ─── Smart Queue ──────────────────────────────────────────
  // Builds a filtered, sorted, time-budgeted task list.
  // Urgency is internal — NEVER shown to user.
  // Tasks just "appear when they're due" without any "X days overdue" text.
  export function buildQueue(config, modus, zeitBudgetMinuten) {
    const level = MODE_LEVEL[modus] ?? 1

    const candidates = []
    for (const room of config.rooms) {
      for (const task of room.tasks) {
        // Skip tasks that require a higher mode than currently selected
        if (MODE_LEVEL[task.minMode] > level) continue
        const since    = daysSince(task.lastDone)
        const freqDays = freqToDays(task)
        const urgency  = since / freqDays  // >= 1.0 means due
        candidates.push({ task, room, urgency })
      }
    }

    // Due tasks first, then by urgency descending
    candidates.sort((a, b) => b.urgency - a.urgency)

    // Greedy fit: accumulate tasks until time budget is consumed
    let remaining = zeitBudgetMinuten
    const result = []
    for (const c of candidates) {
      if (remaining <= 0) break
      const dur = c.task.duration ?? 15
      if (dur <= remaining) {
        result.push({ task: c.task, room: c.room })
        remaining -= dur
      }
    }

    return result
  }

  // ─── Mark task done ───────────────────────────────────────
  export function markTaskDone(config, taskId) {
    const today = new Date().toISOString().slice(0, 10)
    return {
      ...config,
      rooms: config.rooms.map(r => ({
        ...r,
        tasks: r.tasks.map(t =>
          t.id === taskId ? { ...t, lastDone: today } : t
        ),
      })),
    }
  }

  // ─── Room status badge ────────────────────────────────────
  // Returns 'now' | 'soon' | 'ok' — used for colored status badge in Räume view.
  export function roomStatus(room) {
    if (room.tasks.length === 0) return 'ok'
    const urgencies = room.tasks.map(t => daysSince(t.lastDone) / freqToDays(t))
    const max = Math.max(...urgencies)
    if (max >= 1.0) return 'now'
    if (max >= 0.7) return 'soon'
    return 'ok'
  }

  // ─── CRUD helpers ─────────────────────────────────────────
  export function addRoom(config, room) {
    return { ...config, rooms: [...config.rooms, room] }
  }

  export function updateRoom(config, roomId, patch) {
    return {
      ...config,
      rooms: config.rooms.map(r => r.id === roomId ? { ...r, ...patch } : r),
    }
  }

  export function deleteRoom(config, roomId) {
    return { ...config, rooms: config.rooms.filter(r => r.id !== roomId) }
  }

  export function addTask(config, roomId, task) {
    return {
      ...config,
      rooms: config.rooms.map(r =>
        r.id === roomId ? { ...r, tasks: [...r.tasks, task] } : r
      ),
    }
  }

  export function updateTask(config, roomId, taskId, patch) {
    return {
      ...config,
      rooms: config.rooms.map(r =>
        r.id === roomId
          ? { ...r, tasks: r.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t) }
          : r
      ),
    }
  }

  export function deleteTask(config, roomId, taskId) {
    return {
      ...config,
      rooms: config.rooms.map(r =>
        r.id === roomId
          ? { ...r, tasks: r.tasks.filter(t => t.id !== taskId) }
          : r
      ),
    }
  }

  export function resetToDefaults(config) {
    return { ...config, rooms: DEFAULT_ROOMS }
  }
  ```

- [ ] **Step 3: Im Browser prüfen**

  Dev-Server starten (`npm run dev`), in Devtools `localStorage.getItem('adhs_haushalt_v1')` aufrufen → sollte `null` sein (noch kein Wert). Kein Fehler in der Konsole.

- [ ] **Step 4: Commit**

  ```bash
  git add src/storage/index.js src/features/tools/haushalt/haushaltData.js
  git commit -m "feat(haushalt): add SK.haushalt + full data layer with Smart Queue"
  ```

---

## Task 2: ToolSection-Komponente + haushalt-Icon

**Files:**
- Create: `src/components/ToolSection/ToolSection.jsx`
- Create: `src/components/ToolSection/ToolSection.module.css`
- Modify: `src/features/tools/toolRegistry.jsx` (haushalt-Icon + Registry-Eintrag)

- [ ] **Step 1: haushalt-Icon und Registry-Eintrag in toolRegistry.jsx einfügen**

  In `src/features/tools/toolRegistry.jsx`, im ICONS-Objekt nach `reminder` einfügen:

  ```js
  // Add after the reminder entry:
  haushalt: { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  ```

  Im TOOL_REGISTRY-Array am Ende (nach dem reminder-Eintrag) einfügen:

  ```js
  {
    id: 'haushalt',
    name: 'Haushalt',
    icon: '🏠',
    color: '#8B5CF6',
    description: 'Neurodivergenzfreundliche Haushaltsroutinen',
    standalone: true,
    integrated: true,
  },
  ```

- [ ] **Step 2: ToolSection.jsx erstellen**

  Datei: `src/components/ToolSection/ToolSection.jsx`

  ```jsx
  import { useState } from 'react'
  import { ToolIcon } from '../../features/tools/toolRegistry'
  import s from './ToolSection.module.css'

  /**
   * Wiederverwendbare Accordion-Card für Tool-Sections im Tagesplaner.
   *
   * Props:
   *   toolId       – ID für das SVG-Icon aus toolRegistry
   *   title        – Angezeigter Name
   *   badge        – Text im Badge-Pill (null = kein Badge)
   *   badgeBg      – Hintergrundfarbe für Badge (optional, CSS color string)
   *   defaultOpen  – Startet aufgeklappt (default false)
   *   onTitleClick – fn() — beim Klick auf den Titel-Text (Direktlink ↗ ins Tool)
   *   children     – Inhalt im aufgeklappten Bereich
   */
  export default function ToolSection({
    toolId,
    title,
    badge = null,
    badgeBg,
    defaultOpen = false,
    onTitleClick,
    children,
  }) {
    const [open, setOpen] = useState(defaultOpen)

    return (
      <div className={s.section}>
        <button className={s.header} onClick={() => setOpen(v => !v)}>
          <span className={s.iconWrap}>
            <ToolIcon id={toolId} size={16} />
          </span>

          <span
            className={s.title}
            onClick={e => {
              if (onTitleClick) {
                e.stopPropagation()
                onTitleClick()
              }
            }}
          >
            {title}
            {onTitleClick && <span className={s.linkArr}>↗</span>}
          </span>

          {badge != null && (
            <span
              className={s.badge}
              style={badgeBg ? { background: badgeBg } : undefined}
            >
              {badge}
            </span>
          )}

          <span className={s.chevron}>{open ? '▾' : '▸'}</span>
        </button>

        {open && <div className={s.body}>{children}</div>}
      </div>
    )
  }
  ```

- [ ] **Step 3: ToolSection.module.css erstellen**

  Datei: `src/components/ToolSection/ToolSection.module.css`

  ```css
  .section {
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: var(--r);
    background: rgba(255, 255, 255, 0.018);
    overflow: hidden;
    margin-bottom: 8px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 11px 14px;
    background: none;
    border: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
    transition: background 0.12s;
  }

  .header:hover {
    background: rgba(255, 255, 255, 0.025);
  }

  .iconWrap {
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.35);
    flex-shrink: 0;
  }

  .title {
    flex: 1;
    font-family: 'Outfit', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.75);
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  .linkArr {
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.25);
    pointer-events: none;
    flex-shrink: 0;
  }

  .badge {
    font-size: 0.6rem;
    font-weight: 700;
    font-family: 'Outfit', sans-serif;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.55);
    border-radius: 20px;
    padding: 2px 8px;
    white-space: nowrap;
    letter-spacing: 0.03em;
    flex-shrink: 0;
  }

  .chevron {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.22);
    flex-shrink: 0;
  }

  .body {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  ```

- [ ] **Step 4: Im Browser prüfen**

  Dev-Server neu laden. Keine Konsolen-Fehler. Die Datei ist noch nicht in die App eingebunden — das ist okay.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/ToolSection/ src/features/tools/toolRegistry.jsx
  git commit -m "feat(haushalt): add ToolSection component + haushalt icon in registry"
  ```

---

## Task 3: HaushaltSection (Tagesplaner-Integration)

**Files:**
- Create: `src/features/tools/haushalt/HaushaltSection.jsx`
- Create: `src/features/tools/haushalt/HaushaltSection.module.css`
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Step 1: HaushaltSection.jsx erstellen**

  Datei: `src/features/tools/haushalt/HaushaltSection.jsx`

  ```jsx
  import { useState, useCallback } from 'react'
  import { useAppStore } from '../../../store'
  import { todayKey } from '../../../utils'
  import { createBlock } from '../../todos/Block'
  import { TOOL_TAB } from '../toolTabs'
  import ToolSection from '../../../components/ToolSection/ToolSection'
  import TodoChip from '../../../components/TodoChip/TodoChip'
  import {
    loadHaushalt, saveHaushalt, buildQueue,
    MODE_META,
  } from './haushaltData'
  import s from './HaushaltSection.module.css'

  export default function HaushaltSection() {
    const { setTodos, setCurrentTab } = useAppStore()

    const [config, setConfig]         = useState(() => loadHaushalt())
    const [chipTodos, setChipTodos]   = useState([])
    const [transferred, setTransferred] = useState(false)

    const selectedMode = config.selectedMode ?? 'maintain'
    const hasModeSelected = chipTodos.length > 0

    // Badge text + background
    let badge   = 'Modus wählen'
    let badgeBg = undefined
    if (transferred) {
      badge   = '✓ übertragen'
      badgeBg = 'rgba(16,185,129,0.15)'
    } else if (hasModeSelected) {
      badge   = `${MODE_META[selectedMode].label} · ${chipTodos.length}`
      badgeBg = MODE_META[selectedMode].bg
    }

    // Selecting a mode generates the task chips (60 min budget for the card preview)
    const handleModeSelect = useCallback((modus) => {
      const nextConfig = { ...config, selectedMode: modus }
      setConfig(nextConfig)
      saveHaushalt(nextConfig)
      setTransferred(false)

      const q = buildQueue(nextConfig, modus, 60)
      setChipTodos(
        q.map(({ task, room }) =>
          createBlock({
            text:     task.text,
            color:    MODE_META[modus].color,
            priority: 3,
            duration: task.duration,
            category: room.name,
            subItems: (task.subItems ?? []).map(si => ({ ...si })),
          })
        )
      )
    }, [config])

    // Transfer writes all non-done chips to the global todo pool
    const handleTransfer = useCallback(() => {
      if (chipTodos.length === 0 || transferred) return
      const toAdd = chipTodos.filter(c => !c.done)
      if (toAdd.length > 0) {
        setTodos(prev => [...prev, ...toAdd])
      }
      setTransferred(true)
      setChipTodos(prev => prev.map(c => ({ ...c, done: true })))
    }, [chipTodos, transferred, setTodos])

    // Toggle a chip's done state locally
    const handleToggle = useCallback((id) => {
      setChipTodos(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
    }, [])

    // Remove a chip from the section
    const handleRemove = useCallback((id) => {
      setChipTodos(prev => prev.filter(c => c.id !== id))
    }, [])

    return (
      <ToolSection
        toolId="haushalt"
        title="Haushalt"
        badge={badge}
        badgeBg={badgeBg}
        onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
      >
        {/* Mode selector chips */}
        <div className={s.modeRow}>
          {Object.entries(MODE_META).map(([key, meta]) => (
            <button
              key={key}
              className={[
                s.modeChip,
                selectedMode === key && hasModeSelected && !transferred
                  ? s.modeChipActive
                  : '',
              ].join(' ')}
              style={{ '--mode-color': meta.color }}
              onClick={() => { if (!transferred) handleModeSelect(key) }}
            >
              {meta.label}
            </button>
          ))}
        </div>

        {/* Task list as proper TodoChips */}
        {chipTodos.length > 0 && (
          <div className={s.chips}>
            {chipTodos.map(todo => (
              <TodoChip
                key={todo.id}
                todo={todo}
                todos={chipTodos}
                saveTodos={setChipTodos}
                onToggleDone={() => handleToggle(todo.id)}
                onRemove={transferred ? undefined : () => handleRemove(todo.id)}
                disableExpand={!todo.subItems?.length}
              />
            ))}
          </div>
        )}

        {/* Transfer button — only before transfer */}
        {chipTodos.length > 0 && !transferred && (
          <button className={s.transferBtn} onClick={handleTransfer}>
            Zur Todoliste übertragen
          </button>
        )}
      </ToolSection>
    )
  }
  ```

- [ ] **Step 2: HaushaltSection.module.css erstellen**

  Datei: `src/features/tools/haushalt/HaushaltSection.module.css`

  ```css
  .modeRow {
    display: flex;
    gap: 6px;
  }

  .modeChip {
    flex: 1;
    padding: 7px 6px;
    border-radius: var(--r-lg);
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    background: none;
    font-family: 'Outfit', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: all 0.14s;
    white-space: nowrap;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
  }

  .modeChip:hover {
    border-color: rgba(255, 255, 255, 0.22);
    color: rgba(255, 255, 255, 0.65);
  }

  .modeChipActive {
    border-color: var(--mode-color);
    color: var(--mode-color);
    background: rgba(255, 255, 255, 0.04);
  }

  .chips {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .transferBtn {
    width: 100%;
    padding: 9px;
    border-radius: var(--r);
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Outfit', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.14s;
    -webkit-tap-highlight-color: transparent;
  }

  .transferBtn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
  }
  ```

- [ ] **Step 3: HaushaltSection in TabHeute.jsx einbinden**

  In `src/features/calendar/TabHeute/TabHeute.jsx`:

  Import einfügen (nach ReminderSection-Import):
  ```jsx
  import ReminderSection  from '../../tools/reminder/ReminderSection'
  import HaushaltSection  from '../../tools/haushalt/HaushaltSection'
  ```

  Im JSX nach `{activeTools.includes('reminder') && <ReminderSection />}` einfügen:
  ```jsx
  {activeTools.includes('reminder') && <ReminderSection />}
  {activeTools.includes('haushalt') && <HaushaltSection />}
  ```

- [ ] **Step 4: Haushalt-Tool in den aktiven Tools aktivieren (zum Testen)**

  Temporär in der Browser-Konsole ausführen:
  ```js
  const key = 'adhs_app_active_tools'
  const cur = JSON.parse(localStorage.getItem(key) || '[]')
  localStorage.setItem(key, JSON.stringify([...cur, 'haushalt']))
  location.reload()
  ```

  Danach im Tagesplaner erscheint die Haushalt-Card. Modus auswählen → Chips erscheinen → "Zur Todoliste übertragen" → Chips in der Todoliste prüfen.

- [ ] **Step 5: Commit**

  ```bash
  git add src/features/tools/haushalt/HaushaltSection.jsx src/features/tools/haushalt/HaushaltSection.module.css src/features/calendar/TabHeute/TabHeute.jsx
  git commit -m "feat(haushalt): add HaushaltSection in Tagesplaner with mode chips + TodoChips"
  ```

---

## Task 4: Standalone TabHaushalt — Queue-View

**Files:**
- Create: `src/features/tools/haushalt/TabHaushalt.jsx`
- Create: `src/features/tools/haushalt/TabHaushalt.module.css`
- Modify: `src/features/tools/toolTabs.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: toolTabs.js — haushalt: 13 eintragen**

  In `src/features/tools/toolTabs.js`:
  ```js
  export const TOOL_TAB = {
    geburtstage:  4,
    timer:        5,
    rezepte:      6,
    pizza:        7,
    elvi:         8,
    gewicht:      9,
    gamification: 10,
    rad:          11,
    reminder:     12,
    haushalt:     13,  // ← add this line
  }
  ```

- [ ] **Step 2: TabHaushalt.jsx erstellen**

  Datei: `src/features/tools/haushalt/TabHaushalt.jsx`

  ```jsx
  import { useState, useCallback } from 'react'
  import { useAppStore } from '../../../store'
  import { todayKey } from '../../../utils'
  import { createBlock } from '../../todos/Block'
  import ToolHeader from '../../../components/ToolHeader/ToolHeader'
  import TodoChip from '../../../components/TodoChip/TodoChip'
  import {
    loadHaushalt, saveHaushalt, buildQueue, markTaskDone,
    roomStatus, addRoom, updateRoom, deleteRoom,
    addTask, updateTask, deleteTask, resetToDefaults,
    MODE_META, FREQ_LABELS, DEFAULT_ROOMS,
  } from './haushaltData'
  import s from './TabHaushalt.module.css'

  // ─── SVG Icon (house) ────────────────────────────────────
  const HausIcon = () => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )

  // ─── Zeit-Budget-Optionen ────────────────────────────────
  const ZEIT_OPTIONS = [
    { label: '5 min',  mins: 5  },
    { label: '15 min', mins: 15 },
    { label: '30 min', mins: 30 },
    { label: '1h+',    mins: 90 },
  ]

  // ─── Status badge colors ─────────────────────────────────
  const STATUS_META = {
    now:  { label: 'jetzt dran', color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
    soon: { label: 'bald dran',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
    ok:   { label: 'ok',         color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  }

  // ─── FREQ options for selects ────────────────────────────
  const FREQ_OPTIONS = ['daily', 'biweekly', 'weekly', 'monthly', 'custom']
  const MODE_OPTIONS = ['survival', 'maintain', 'boost']

  // ═══════════════════════════════════════════════════════════
  // RäumeView — separate internal component
  // ═══════════════════════════════════════════════════════════
  function RäumeView({ config, updateConfig }) {
    const [openRooms, setOpenRooms]   = useState({})
    const [editRooms, setEditRooms]   = useState({})   // roomId → true/false
    const [newTaskText, setNewTaskText] = useState({}) // roomId → string
    const [showAddRoom, setShowAddRoom] = useState(false)
    const [newRoomName, setNewRoomName] = useState('')
    const [newRoomIcon, setNewRoomIcon] = useState('🏠')
    const [confirmReset, setConfirmReset] = useState(false)

    const toggleRoom = (id) => setOpenRooms(p => ({ ...p, [id]: !p[id] }))
    const toggleEdit = (id) => setEditRooms(p => ({ ...p, [id]: !p[id] }))

    const handleUpdateRoomName = (roomId, name) => {
      updateConfig(updateRoom(config, roomId, { name }))
    }

    const handleDeleteRoom = (roomId) => {
      updateConfig(deleteRoom(config, roomId))
    }

    const handleAddTask = (roomId) => {
      const text = (newTaskText[roomId] ?? '').trim()
      if (!text) return
      const task = {
        id:         crypto.randomUUID(),
        text,
        duration:   15,
        freq:       'weekly',
        customDays: null,
        minMode:    'maintain',
        lastDone:   null,
        subItems:   [],
      }
      updateConfig(addTask(config, roomId, task))
      setNewTaskText(p => ({ ...p, [roomId]: '' }))
    }

    const handleDeleteTask = (roomId, taskId) => {
      updateConfig(deleteTask(config, roomId, taskId))
    }

    const handleTaskFreq = (roomId, taskId, freq) => {
      updateConfig(updateTask(config, roomId, taskId, { freq }))
    }

    const handleTaskMinMode = (roomId, taskId, minMode) => {
      updateConfig(updateTask(config, roomId, taskId, { minMode }))
    }

    const handleAddRoom = () => {
      const name = newRoomName.trim()
      if (!name) return
      const room = {
        id:    crypto.randomUUID(),
        name,
        icon:  newRoomIcon,
        tasks: [],
      }
      updateConfig(addRoom(config, room))
      setNewRoomName('')
      setNewRoomIcon('🏠')
      setShowAddRoom(false)
    }

    const handleReset = () => {
      if (!confirmReset) { setConfirmReset(true); return }
      updateConfig(resetToDefaults(config))
      setConfirmReset(false)
    }

    return (
      <div className={s.roomsView}>
        {config.rooms.map(room => {
          const isOpen = !!openRooms[room.id]
          const isEditing = !!editRooms[room.id]
          const status = roomStatus(room)
          const sm = STATUS_META[status]
          return (
            <div key={room.id} className={s.roomCard}>
              {/* Room header */}
              <div className={s.roomHeader} onClick={() => toggleRoom(room.id)}>
                <span className={s.roomIcon}>{room.icon}</span>
                {isEditing ? (
                  <input
                    className={s.roomNameInput}
                    value={room.name}
                    onChange={e => handleUpdateRoomName(room.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className={s.roomName}>{room.name}</span>
                )}
                <span
                  className={s.statusBadge}
                  style={{ color: sm.color, background: sm.bg }}
                >
                  {sm.label}
                </span>
                <button
                  className={s.editRoomBtn}
                  onClick={e => { e.stopPropagation(); toggleEdit(room.id) }}
                >
                  {isEditing ? '✓' : '✎'}
                </button>
                <span className={s.roomChevron}>{isOpen ? '▾' : '▸'}</span>
              </div>

              {/* Room body */}
              {isOpen && (
                <div className={s.roomBody}>
                  {/* Task list */}
                  {room.tasks.map(task => (
                    <div key={task.id} className={s.taskRow}>
                      <div className={s.taskInfo}>
                        <span className={s.taskText}>{task.text}</span>
                        <span className={s.taskMeta}>
                          {FREQ_LABELS[task.freq] ?? task.freq}
                          {' · '}
                          {task.duration}min
                          {' · '}
                          {task.minMode}
                        </span>
                      </div>
                      {isEditing && (
                        <div className={s.taskEditRow}>
                          <select
                            className={s.taskSelect}
                            value={task.freq}
                            onChange={e => handleTaskFreq(room.id, task.id, e.target.value)}
                          >
                            {FREQ_OPTIONS.map(f => (
                              <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                            ))}
                          </select>
                          <select
                            className={s.taskSelect}
                            value={task.minMode}
                            onChange={e => handleTaskMinMode(room.id, task.id, e.target.value)}
                          >
                            {MODE_OPTIONS.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <button
                            className={s.deleteTaskBtn}
                            onClick={() => handleDeleteTask(room.id, task.id)}
                          >✕</button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add task input (only in edit mode) */}
                  {isEditing && (
                    <div className={s.addTaskRow}>
                      <input
                        className={s.addTaskInput}
                        placeholder="Neue Aufgabe…"
                        value={newTaskText[room.id] ?? ''}
                        onChange={e => setNewTaskText(p => ({ ...p, [room.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddTask(room.id)}
                      />
                      <button
                        className={s.addTaskBtn}
                        onClick={() => handleAddTask(room.id)}
                      >+</button>
                    </div>
                  )}

                  {/* Delete room (only in edit mode) */}
                  {isEditing && (
                    <button
                      className={s.deleteRoomBtn}
                      onClick={() => handleDeleteRoom(room.id)}
                    >
                      Raum löschen
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Add room */}
        {showAddRoom ? (
          <div className={s.addRoomForm}>
            <input
              className={s.addRoomInput}
              placeholder="Raum-Name"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
            />
            <input
              className={s.addRoomIcon}
              placeholder="🏠"
              value={newRoomIcon}
              onChange={e => setNewRoomIcon(e.target.value)}
              maxLength={2}
            />
            <button className={s.addRoomConfirmBtn} onClick={handleAddRoom}>
              Hinzufügen
            </button>
            <button
              className={s.cancelBtn}
              onClick={() => setShowAddRoom(false)}
            >Abbrechen</button>
          </div>
        ) : (
          <button className={s.addRoomBtn} onClick={() => setShowAddRoom(true)}>
            + Raum hinzufügen
          </button>
        )}

        {/* Global reset */}
        <button
          className={[s.resetBtn, confirmReset ? s.resetBtnConfirm : ''].join(' ')}
          onClick={handleReset}
        >
          {confirmReset ? 'Wirklich zurücksetzen?' : 'Auf Standard zurücksetzen'}
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // TabHaushalt — main component
  // ═══════════════════════════════════════════════════════════
  export default function TabHaushalt({ onBack }) {
    const { setTodos } = useAppStore()

    const [config, setConfig]           = useState(() => loadHaushalt())
    const [view, setView]               = useState('queue')
    const [modus, setModus]             = useState(config.selectedMode ?? 'maintain')
    const [zeitBudget, setZeitBudget]   = useState(30)
    const [chipTodos, setChipTodos]     = useState(() => genChips(config, config.selectedMode ?? 'maintain', 30))
    const [queueMeta, setQueueMeta]     = useState(() => buildQueue(config, config.selectedMode ?? 'maintain', 30))
    const [transferred, setTransferred] = useState(false)

    // Persists config changes
    const updateConfig = useCallback((next) => {
      setConfig(next)
      saveHaushalt(next)
    }, [])

    // Regenerates chip list from current config + mode + zeit
    function genChips(cfg, mod, zeit) {
      const q = buildQueue(cfg, mod, zeit)
      return q.map(({ task, room }) =>
        createBlock({
          text:     task.text,
          color:    MODE_META[mod].color,
          priority: 3,
          duration: task.duration,
          category: room.name,
          subItems: (task.subItems ?? []).map(si => ({ ...si })),
        })
      )
    }

    const regenQueue = useCallback((cfg, mod, zeit) => {
      const q = buildQueue(cfg, mod, zeit)
      setQueueMeta(q)
      setChipTodos(
        q.map(({ task, room }) =>
          createBlock({
            text:     task.text,
            color:    MODE_META[mod].color,
            priority: 3,
            duration: task.duration,
            category: room.name,
            subItems: (task.subItems ?? []).map(si => ({ ...si })),
          })
        )
      )
      setTransferred(false)
    }, [])

    const handleModusChange = useCallback((mod) => {
      setModus(mod)
      const nextConfig = { ...config, selectedMode: mod }
      updateConfig(nextConfig)
      regenQueue(nextConfig, mod, zeitBudget)
    }, [config, zeitBudget, updateConfig, regenQueue])

    const handleZeitChange = useCallback((mins) => {
      setZeitBudget(mins)
      regenQueue(config, modus, mins)
    }, [config, modus, regenQueue])

    // Toggle a chip's done state and mark underlying task as done in config
    const handleChipToggle = useCallback((id) => {
      setChipTodos(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
      const chipIdx = chipTodos.findIndex(c => c.id === id)
      if (chipIdx >= 0 && queueMeta[chipIdx]) {
        const nextConfig = markTaskDone(config, queueMeta[chipIdx].task.id)
        updateConfig(nextConfig)
      }
    }, [chipTodos, queueMeta, config, updateConfig])

    const handleChipRemove = useCallback((id) => {
      const idx = chipTodos.findIndex(c => c.id === id)
      setChipTodos(prev => prev.filter(c => c.id !== id))
      setQueueMeta(prev => prev.filter((_, i) => i !== idx))
    }, [chipTodos])

    // Transfer all non-done chips to the global todo pool
    const handleTransfer = useCallback(() => {
      if (transferred) return
      const toAdd = chipTodos.filter(c => !c.done)
      if (toAdd.length > 0) {
        setTodos(prev => [...prev, ...toAdd])
      }
      setTransferred(true)
      setChipTodos(prev => prev.map(c => ({ ...c, done: true })))
    }, [chipTodos, transferred, setTodos])

    return (
      <div className={s.page}>
        <ToolHeader
          onBack={onBack}
          icon={<HausIcon />}
          eyebrow="Tool"
          title="Haushalt"
        />

        {/* View tab strip */}
        <div className={s.tabStrip}>
          <button
            className={[s.tabBtn, view === 'queue' ? s.tabBtnActive : ''].join(' ')}
            onClick={() => setView('queue')}
          >
            Queue
          </button>
          <button
            className={[s.tabBtn, view === 'rooms' ? s.tabBtnActive : ''].join(' ')}
            onClick={() => setView('rooms')}
          >
            Räume
          </button>
        </div>

        {/* ── Queue View ── */}
        {view === 'queue' && (
          <div className={s.queueView}>

            {/* Mode strip */}
            <div className={s.modeStrip}>
              {Object.entries(MODE_META).map(([key, meta]) => (
                <button
                  key={key}
                  className={[s.modeBtn, modus === key ? s.modeBtnActive : ''].join(' ')}
                  style={{ '--mode-color': meta.color }}
                  onClick={() => handleModusChange(key)}
                >
                  {meta.label}
                </button>
              ))}
            </div>

            {/* Zeit-Schnellwahl */}
            <div className={s.zeitSection}>
              <span className={s.zeitLabel}>Ich hab gerade…</span>
              <div className={s.zeitBtns}>
                {ZEIT_OPTIONS.map(opt => (
                  <button
                    key={opt.mins}
                    className={[s.zeitBtn, zeitBudget === opt.mins ? s.zeitBtnActive : ''].join(' ')}
                    onClick={() => handleZeitChange(opt.mins)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task chip list */}
            <div className={s.chipList}>
              {chipTodos.length === 0 ? (
                <div className={s.emptyState}>
                  <span className={s.emptyEmoji}>✨</span>
                  <span className={s.emptyText}>Alles erledigt!</span>
                </div>
              ) : (
                chipTodos.map(todo => (
                  <TodoChip
                    key={todo.id}
                    todo={todo}
                    todos={chipTodos}
                    saveTodos={setChipTodos}
                    onToggleDone={() => handleChipToggle(todo.id)}
                    onRemove={() => handleChipRemove(todo.id)}
                    disableExpand={!todo.subItems?.length}
                  />
                ))
              )}
            </div>

            {/* Transfer button */}
            {chipTodos.length > 0 && (
              <button
                className={[s.transferBtn, transferred ? s.transferBtnDone : ''].join(' ')}
                onClick={handleTransfer}
                disabled={transferred}
              >
                {transferred ? '✓ Zur Todoliste übertragen' : 'Zur Todoliste übertragen'}
              </button>
            )}
          </div>
        )}

        {/* ── Räume View ── */}
        {view === 'rooms' && (
          <RäumeView config={config} updateConfig={updateConfig} />
        )}
      </div>
    )
  }
  ```

- [ ] **Step 3: TabHaushalt.module.css erstellen**

  Datei: `src/features/tools/haushalt/TabHaushalt.module.css`

  ```css
  /* ── Page ─────────────────────────────────────────────────── */
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    background: var(--bg, #080810);
  }

  /* ── View tab strip ──────────────────────────────────────── */
  .tabStrip {
    display: flex;
    gap: 0;
    margin: 0 16px 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--r);
    overflow: hidden;
  }

  .tabBtn {
    flex: 1;
    padding: 9px;
    background: none;
    border: none;
    font-family: 'Outfit', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.35);
    cursor: pointer;
    transition: all 0.14s;
    -webkit-tap-highlight-color: transparent;
  }

  .tabBtn + .tabBtn {
    border-left: 1px solid rgba(255, 255, 255, 0.08);
  }

  .tabBtnActive {
    background: rgba(139, 92, 246, 0.12);
    color: var(--primary);
  }

  /* ── Queue View ──────────────────────────────────────────── */
  .queueView {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 16px 16px;
  }

  /* Mode strip — 3 large buttons */
  .modeStrip {
    display: flex;
    gap: 8px;
  }

  .modeBtn {
    flex: 1;
    padding: 10px 6px;
    border-radius: var(--r);
    border: 1.5px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.018);
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.35);
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
  }

  .modeBtn:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.6);
  }

  .modeBtnActive {
    border-color: var(--mode-color);
    color: var(--mode-color);
    background: rgba(255, 255, 255, 0.04);
  }

  /* Zeit-Schnellwahl */
  .zeitSection {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .zeitLabel {
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.04em;
  }

  .zeitBtns {
    display: flex;
    gap: 6px;
  }

  .zeitBtn {
    flex: 1;
    padding: 7px 4px;
    border-radius: var(--r-sm);
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: none;
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.35);
    cursor: pointer;
    transition: all 0.12s;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
  }

  .zeitBtn:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.6);
  }

  .zeitBtnActive {
    background: rgba(139, 92, 246, 0.12);
    border-color: var(--primary);
    color: var(--primary);
  }

  /* Chip list */
  .chipList {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  /* Empty state */
  .emptyState {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 20px;
  }

  .emptyEmoji {
    font-size: 2rem;
  }

  .emptyText {
    font-family: 'Outfit', sans-serif;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.3);
    font-weight: 600;
  }

  /* Transfer button */
  .transferBtn {
    width: 100%;
    padding: 11px;
    border-radius: var(--r);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Outfit', sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.14s;
    -webkit-tap-highlight-color: transparent;
  }

  .transferBtn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.9);
  }

  .transferBtnDone {
    color: var(--emerald);
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.06);
    cursor: default;
  }

  /* ── Räume View ──────────────────────────────────────────── */
  .roomsView {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 16px 80px;
  }

  /* Room card */
  .roomCard {
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: var(--r);
    background: rgba(255, 255, 255, 0.018);
    overflow: hidden;
  }

  .roomHeader {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .roomIcon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .roomName {
    flex: 1;
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.82);
  }

  .roomNameInput {
    flex: 1;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--r-sm);
    color: rgba(255, 255, 255, 0.9);
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    padding: 4px 8px;
    outline: none;
  }

  .statusBadge {
    font-size: 0.58rem;
    font-weight: 700;
    font-family: 'Outfit', sans-serif;
    border-radius: 20px;
    padding: 2px 7px;
    white-space: nowrap;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .editRoomBtn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.28);
    cursor: pointer;
    font-size: 0.8rem;
    padding: 4px 6px;
    flex-shrink: 0;
    transition: color 0.12s;
  }

  .editRoomBtn:hover {
    color: rgba(255, 255, 255, 0.65);
  }

  .roomChevron {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.22);
    flex-shrink: 0;
  }

  /* Room body */
  .roomBody {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding: 8px 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Task row */
  .taskRow {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .taskRow:last-of-type {
    border-bottom: none;
  }

  .taskInfo {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .taskText {
    font-family: 'Outfit', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.75);
  }

  .taskMeta {
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.28);
    font-family: 'Outfit', sans-serif;
  }

  .taskEditRow {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .taskSelect {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--r-sm);
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Outfit', sans-serif;
    font-size: 0.68rem;
    padding: 4px 6px;
    cursor: pointer;
  }

  .deleteTaskBtn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.2);
    font-size: 0.7rem;
    cursor: pointer;
    padding: 4px 6px;
    transition: color 0.12s;
    margin-left: auto;
  }

  .deleteTaskBtn:hover {
    color: var(--rose);
  }

  /* Add task row */
  .addTaskRow {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .addTaskInput {
    flex: 1;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--r-sm);
    color: rgba(255, 255, 255, 0.8);
    font-family: 'Outfit', sans-serif;
    font-size: 0.78rem;
    padding: 7px 10px;
    outline: none;
    caret-color: var(--primary);
  }

  .addTaskInput:focus {
    border-color: rgba(139, 92, 246, 0.4);
  }

  .addTaskInput::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }

  .addTaskBtn {
    background: rgba(139, 92, 246, 0.15);
    border: none;
    border-radius: var(--r-sm);
    color: var(--primary);
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    padding: 7px 12px;
    transition: background 0.12s;
  }

  .addTaskBtn:hover {
    background: rgba(139, 92, 246, 0.25);
  }

  /* Delete room button */
  .deleteRoomBtn {
    margin-top: 8px;
    padding: 7px;
    border-radius: var(--r-sm);
    border: 1px solid rgba(251, 113, 133, 0.3);
    background: rgba(251, 113, 133, 0.06);
    color: var(--rose);
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: background 0.12s;
  }

  .deleteRoomBtn:hover {
    background: rgba(251, 113, 133, 0.12);
  }

  /* Add room button */
  .addRoomBtn {
    padding: 11px;
    border-radius: var(--r);
    border: 1px dashed rgba(255, 255, 255, 0.12);
    background: none;
    color: rgba(255, 255, 255, 0.35);
    font-family: 'Outfit', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    text-align: center;
    transition: all 0.14s;
    -webkit-tap-highlight-color: transparent;
  }

  .addRoomBtn:hover {
    border-color: rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.6);
  }

  /* Add room form */
  .addRoomForm {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--r);
    background: rgba(255, 255, 255, 0.025);
  }

  .addRoomInput {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--r-sm);
    color: rgba(255, 255, 255, 0.9);
    font-family: 'Outfit', sans-serif;
    font-size: 0.82rem;
    padding: 8px 12px;
    outline: none;
    caret-color: var(--primary);
  }

  .addRoomInput:focus {
    border-color: rgba(139, 92, 246, 0.4);
  }

  .addRoomInput::placeholder {
    color: rgba(255, 255, 255, 0.22);
  }

  .addRoomIcon {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--r-sm);
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.2rem;
    padding: 6px 12px;
    outline: none;
    width: 60px;
    text-align: center;
  }

  .addRoomConfirmBtn {
    padding: 8px;
    border-radius: var(--r-sm);
    border: none;
    background: rgba(139, 92, 246, 0.18);
    color: var(--primary);
    font-family: 'Outfit', sans-serif;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.12s;
  }

  .addRoomConfirmBtn:hover {
    background: rgba(139, 92, 246, 0.28);
  }

  .cancelBtn {
    padding: 7px;
    border-radius: var(--r-sm);
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: none;
    color: rgba(255, 255, 255, 0.35);
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    cursor: pointer;
    transition: all 0.12s;
  }

  .cancelBtn:hover {
    color: rgba(255, 255, 255, 0.6);
  }

  /* Global reset */
  .resetBtn {
    margin-top: 16px;
    padding: 9px;
    border-radius: var(--r-sm);
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: none;
    color: rgba(255, 255, 255, 0.22);
    font-family: 'Outfit', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: all 0.14s;
    -webkit-tap-highlight-color: transparent;
  }

  .resetBtn:hover {
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .resetBtnConfirm {
    border-color: rgba(251, 113, 133, 0.4);
    color: var(--rose);
    background: rgba(251, 113, 133, 0.06);
  }
  ```

- [ ] **Step 4: TabHaushalt in App.jsx einbinden**

  In `src/App.jsx`:

  Import hinzufügen (nach TabReminder):
  ```jsx
  import TabReminder     from './features/tools/reminder/TabReminder'
  import TabHaushalt     from './features/tools/haushalt/TabHaushalt'
  ```

  Routing-Zeile hinzufügen (nach dem reminder-Eintrag):
  ```jsx
  {currentTab === TOOL_TAB.reminder     && <TabReminder     onBack={goBack} />}
  {currentTab === TOOL_TAB.haushalt     && <TabHaushalt     onBack={goBack} />}
  ```

- [ ] **Step 5: Im Browser testen**

  1. Dev-Server läuft (`npm run dev`).
  2. Konsole: `JSON.parse(localStorage.getItem('adhs_app_active_tools'))` → array prüfen.
  3. Im Tab „Tools" erscheint „Haushalt" als neues Tool-Item (dank Registry-Eintrag aus Task 2).
  4. Auf Haushalt tippen → TabHaushalt öffnet sich.
  5. Modus-Strip zeigt 3 Buttons.
  6. Zeit-Buttons (5 min / 15 min / 30 min / 1h+) wählen → Queue verändert sich.
  7. Chip markieren → Done-Flash ✓.
  8. „Zur Todoliste übertragen" → Chips erscheinen in Pool auf Tagesplaner-Tab.
  9. „Räume"-Tab → Räume-Karten mit Status-Badges sichtbar.
  10. Edit-Modus (✎-Button) öffnen → Task löschen, Freq ändern → bleibt nach Reload erhalten.

- [ ] **Step 6: Commit**

  ```bash
  git add src/features/tools/haushalt/TabHaushalt.jsx src/features/tools/haushalt/TabHaushalt.module.css src/features/tools/toolTabs.js src/App.jsx
  git commit -m "feat(haushalt): add TabHaushalt with Queue view + Räume view + full CRUD"
  ```

---

## Self-Review

### Spec-Coverage-Check

| Spec-Anforderung | Abgedeckt in |
|---|---|
| 3 Modi (Survival/Maintain/Boost) | Task 1 (MODE_META), Task 3 (HaushaltSection), Task 4 (TabHaushalt) |
| minMode-Schwellenwert-Logik | Task 1 (buildQueue, MODE_LEVEL) |
| Smart Queue: Urgency-Sort + Greedy-Fit | Task 1 (buildQueue) |
| Nie "X Tage überfällig" anzeigen | buildQueue gibt nur Urgency intern weiter, nirgends im UI angezeigt |
| Tagesplaner-Card: Badge + 3 Modus-Chips | Task 3 (HaushaltSection) |
| TodoChips in der Card (identische Optik) | Task 3 (TodoChip direkt verwendet) |
| „Zur Todoliste übertragen" | Task 3 + Task 4 (handleTransfer → setTodos) |
| Badge-Updates nach Transfer: „✓ übertragen" | Task 3 (transferred state → badge) |
| Standalone Tab 13 | Task 4 (TOOL_TAB.haushalt = 13, TabHaushalt) |
| Zeit-Schnellwahl (5/15/30/1h+) | Task 4 (ZEIT_OPTIONS + handleZeitChange) |
| Räume-View mit Status-Badges | Task 4 (RäumeView + roomStatus) |
| Status: jetzt dran (rose) / bald dran (violet) / ok (emerald) | Task 4 (STATUS_META) |
| Räume/Tasks CRUD | Task 4 (RäumeView handlers) |
| Globaler Reset auf Standard | Task 4 (resetToDefaults + confirm flow) |
| DEFAULT_ROOMS als Code-Konstante (nicht in Storage) | Task 1 (DEFAULT_ROOMS exported const) |
| SK.haushalt in Storage | Task 1 (storage/index.js) |
| Tool in toolRegistry + toolTabs | Task 2 + Task 4 |
| activeTools-Guard (wie reminder) | Task 3 (TabHeute: activeTools.includes('haushalt')) |

### Kein Placeholder vorhanden ✓

Alle Steps haben vollständigen Code. Keine "TBD" oder "add validation" Floskeln.

### Typ-Konsistenz ✓

- `buildQueue()` → `[{ task, room }]` — konsistent in Task 1, 3, 4
- `createBlock({ text, color, priority, duration, category, subItems })` — konsistent in Task 3 + 4
- `MODE_META[key].color` / `MODE_META[key].bg` / `MODE_META[key].label` — konsistent überall
- `markTaskDone(config, taskId)` — Task 1 definiert, Task 4 verwendet
- `updateConfig(nextConfig)` — kapselt saveHaushalt() konsistent in Task 4
