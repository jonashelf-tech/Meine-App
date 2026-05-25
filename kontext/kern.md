# Kern — Datenstrukturen & Store

## Block (einziger Datentyp)

```js
{
  id:                    genId(),   // crypto.randomUUID() oder Fallback-String — KEIN Date.now()
  text:                  "",
  priority:              3,         // 1=Wichtig · 2=Sollte · 3=Kann
  color:                 "#8B5CF6", // Default = Akzentfarbe
  duration:              null,      // Minuten, null = keine Angabe (Default war früher 30 — jetzt null)
  category:              null,
  date:                  null,      // "2024-01-15" — Fälligkeit oder Termin
  time:                  null,      // "14:30" — nur bei Terminen (date+time = Kalender-Termin)
  done:                  false,
  doneAt:                null,
  awaitingClockResponse: false,     // DEPRECATED — nicht mehr setzen; ClockPopup wurde entfernt
  subItems:              [],        // [{ id, text, done }]
  notes:                 null,
  createdAt:             new Date().toISOString(),
}
```

`createBlock(partial?)` in `src/features/todos/Block.js` erzeugt einen vollständigen Block.
Immer `createBlock()` statt manuell `{ id: ..., text: ... }` — sichert createdAt + genId.

**Hilfsfunktionen (Block.js):**
- `isTermin(b)`      — `!!(b.date && b.time)` → Kalender-Termin
- `isFaelligkeit(b)` — `!!(b.date && !b.time)` → nur Datum, kein Slot
- `isTodo(b)`        — `!b.date && !b.time` → reines Pool-Todo

**Routine und Vorlage wurden entfernt.** Block ist der einzige Typ.

---

## Zustand Store (store/index.js)

```js
// Kern
todos,        setTodos
todoOrder,    setTodoOrder
cats,         setCats

// Kalender
days,         setDays       // { "2024-01-15": { "8": SlotEntry, "8.5": SlotEntry } }

// App
settings,     setSettings
theme,        setTheme
accentColor,  setAccentColor
toolColors,   setToolColors  // { [toolId]: "#hexcolor" } — überschreibt TOOL_REGISTRY.color
currentTab,   setCurrentTab
modules,      setModules
activeTools,  toggleTool
```

---

## Slot-Format (days-Store)

```js
// days["2024-01-15"]["8"] =
{
  text:     "Todo-Text",
  color:    "#8B5CF6",
  duration: 30,         // Minuten
  locked:   false,      // true = nicht verschiebbar (ShiftAll überspringt)
  done:     false,
  todoId:   123,        // optional, Referenz auf todos[]
  subItems: [],         // optional, [{ id, text, done }] — nur wenn kein todoId
  reviewed: false,      // true = endgültig behandelt, taucht nie wieder auf
  ignored:  false,      // true = in Variante 1 ignoriert; kommt bei Variante 2 (neuer Tag) wieder
}
```

Slot-Keys: `sk(h)` = ganzeStunde (`"8"`), `sk(h, true)` = halbeStunde (`"8.5"`)

**Lock-Verhalten:**
- Todos mit `time`-Feld werden beim Drop automatisch auf `locked: true` gesetzt
- Per UI (Schloss-Icon am Slot) jederzeit umschaltbar
- `handleShiftAll` überspringt locked Slots

---

## Storage Keys (storage/index.js)

```js
// Todos & Routinen
SK.todos          → 'adhs_todos_list'
SK.routines       → 'adhs_todos_routines'
SK.todoOrder      → 'adhs_todos_order'
SK.cats           → 'adhs_todos_cats'

// Kalender
SK.days           → 'adhs_calendar_days'
SK.doneCounters   → 'adhs_calendar_done'
SK.templates      → 'adhs_calendar_templates'

// App-Config
SK.settings       → 'adhs_app_settings'
SK.theme          → 'adhs_app_theme'
SK.modules        → 'adhs_app_modules'
SK.activeTools    → 'adhs_app_active_tools'
SK.accentColor    → 'adhs_app_accent'
SK.toolColors     → 'adhs_app_tool_colors'

// View-State (kein Reload nötig — wird beim Tab-Wechsel gelesen)
SK.visStart       → 'adhs_view_vis_start'      // Zeitplan sichtbarer Start (Stunde)
SK.visEnd         → 'adhs_view_vis_end'         // Zeitplan sichtbares Ende (Stunde)
SK.lastPoolReturn → 'adhs_view_last_pool_return'
SK.poolSort       → 'adhs_view_pool_sort'       // 'standard'|'az'|'za'|'prio'|'new'|'old'
SK.calView        → 'adhs_view_cal_view'        // 'woche'|'monat'

// Tools
SK.recipes        → 'adhs_recipes_list'
SK.shopping       → 'adhs_recipes_shopping'
SK.shoppingStates → 'adhs_recipes_shopping_states'
SK.selectedDishes → 'adhs_recipes_selected'
SK.weight         → 'adhs_health_weight'
SK.birthdays      → 'adhs_birthdays'
SK.haushalt       → 'adhs_haushalt_v1'
SK.haushaltEnergie→ 'adhs_haushalt_energie'   // lokaler UI-State (Normal/Low Energy)
```

Lesen/Schreiben:
```js
import { sv, lv, SK } from '../../../storage'
sv(SK.todos, nextTodos)
lv(SK.todos, [])
```

---

## Hilfsfunktionen (utils/index.js)

```js
dateKey(date)        // Date → "2024-01-15"
todayKey()           // heute als dateKey
sk(h, half?)         // Slot-Key: sk(8) = "8", sk(8, true) = "8.5"
skLabel(key)         // "8" → "08:00", "8.5" → "08:30"
parseHHMM(str)       // "08:30" → 8.5
ALL_SLOT_KEYS        // alle gültigen Slot-Keys 0–23.5
```

---

## Tab-Routing (Kern)

```
Tab 0  — Tagesplaner    (TabHeute: DayNav + Zeitplan + Pool)
Tab 1  — Kalender       (TabKalender: Woche/Monat + DayPanel)
Tab 2  — Tools          (TabTools: Meine Tools / Alle Tools)
Tab 3  — Einstellungen
Tab 4  — Geburtstage
Tab 5  — Fokus-Timer
Tab 6  — Rezepte
Tab 7  — Pizza-Rechner
Tab 8  — Elvi
Tab 9  — Gewicht
Tab 10 — XP & Level
Tab 11 — Zufallsrad
Tab 12 — Reminder
```

Tool-Navigation: `setCurrentTab(TOOL_TAB[toolId])` — TOOL_TAB-Mapping **ausschließlich** in `src/features/tools/toolTabs.js` (Single Source of Truth). Alle Consumer importieren von dort.

---

## TabKalender — Features

- **Ansichten:** Woche (Zeitgitter 07–22 Uhr) · Monat (Kacheln mit Farbbalken)
- **Toggle-Strip:** Termine / Todos / Tools ein-/ausblendbar (3 lokale Booleans)
- **Tool-Dots:** ein Dot pro aktivem Tool in Tool-Farbe; ausgefüllt = Todo an dem Tag abgehakt, Ring = offen
- **DayPanel:** erscheint unterhalb des Grids wenn Monatskachel angeklickt
  - Sektionen: Zeitplan · Erledigt · Tools — alle einzeln klappbar
  - Daten: `days[dk]` · `todos.filter(t => t.doneAt?.startsWith(dk))` · `activeTools`
  - Doppelklick Zeitplan-Eintrag → setzt `store.dayplanDate(dk)` + Tab 0 → Tagesplaner öffnet auf dem Tag
  - Einzelklick erledigtes Todo → Restore-Modal ("Wiederherstellen?" Ja/Nein) → stellt als datumsloses Todo wieder her
  - Doppelklick Tool-Chip → direkt ins Tool

## TabHeute — Features

- **DayNav:** Kompakte Pille oben — `‹ Datum ›`. Datum cyan+glow = heute, weiß = anderer Tag. Pfeil Richtung heute leuchtet cyan wenn nicht auf heute. Klick auf Datum → Tab 1 (Kalender).
- **viewDate:** Lokaler State (`useState(() => store.dayplanDate ?? todayKey())`). Mount-Effect liest `store.dayplanDate`, setzt viewDate, löscht es. Tab verlassen → unmount → automatisch Reset auf heute beim nächsten Mount.
- **store.dayplanDate:** Flüchtiger Intent-Wert (kein localStorage). DayPanel setzt ihn vor `setCurrentTab(0)`, TabHeute konsumiert ihn einmalig beim Mount.
- **Pool + Drag & Drop:** Immer sichtbar, funktioniert auf allen Tagen — Slots schreiben auf `viewDate`.

## TimeEvents — Logik

Läuft beim Mount von TabHeute (`useTimeEvents`-Hook in `TabHeute/useTimeEvents.js`).
Variante 2 hat Priorität — nie beide gleichzeitig aktiv.

**Variante 1 — selber Tag (abgelaufene Slots):**
- Trigger: `viewDate === today` UND Slots heute mit `endzeit ≤ jetzt` + `!done && !ignored && !reviewed`
- Aktionen (jeweils auf aktuelle Auswahl):
  - **Erledigt** → `slot.done = true, slot.reviewed = true`; Todo: `done=true, doneAt=now`
  - **Ignorieren** → `slot.ignored = true` *(kommt bei Variante 2 wieder)*
  - **In Pool** → Slot löschen; text-only: neues Todo via `createBlock`; todo-type: bleibt im Pool

**Variante 2 — neuer Tag:**
- Trigger: `SK.lastPoolReturn !== todayKey()`
- Zeigt: alle Slots aus `days[dk < heute]` mit `!done && !reviewed` — **inkl. `ignored: true`**
- Aktionen identisch, aber **Ignorieren** → `slot.reviewed = true` *(endgültig weg)*
- Abschluss: `sv(SK.lastPoolReturn, today)`

**Item-Typen:** `type: 'text'` (Slot ohne todoId) · `type: 'todo'` (Slot mit todoId)
**Auto-close:** Modal schließt wenn Liste leer. Alle Items sind beim Öffnen vorausgewählt.
