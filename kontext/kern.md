# Kern — Datenstrukturen & Store

## Block (einziger Datentyp)

```js
{
  id:        genId(),   // crypto.randomUUID() oder Fallback-String — KEIN Date.now()
  text:      "",
  priority:  3,         // 1=Wichtig · 2=Sollte · 3=Kann
  color:     "#8B5CF6", // Default = Akzentfarbe
  duration:  null,      // Minuten, null = keine Angabe
  category:  null,
  date:      null,      // "2024-01-15" — Fälligkeit oder Termin
  time:      null,      // "14:30" — nur bei Terminen (date+time = Kalender-Termin)
  done:      false,
  doneAt:    null,
  subItems:  [],        // [{ id, text, done }]
  notes:     null,
  createdAt: new Date().toISOString(),
}
```

> `awaitingClockResponse` ist **DEPRECATED** — niemals setzen. ClockPopup wurde entfernt.

`createBlock(partial?)` in `src/features/todos/Block.js` erzeugt einen vollständigen Block.
Immer `createBlock()` statt manuell `{ id: ..., text: ... }` — sichert createdAt + genId.

**Hilfsfunktionen (Block.js):**
- `isTermin(b)`      — `!!(b.date && b.time)` → Kalender-Termin
- `isFaelligkeit(b)` — `!!(b.date && !b.time)` → nur Datum, kein Slot
- `isTodo(b)`        — `!b.date && !b.time` → reines Pool-Todo

**Routine und Vorlage wurden entfernt.** Block ist der einzige Typ.

---

## Blocker (Zeitplan-Blocker)

```js
// createBlocker(partial?) in src/features/calendar/Blocker/blockerUtils.js
{
  id:         genId(),
  text:       '',
  color:      '#3b82f6',
  startHour:  9,          // Dezimalstunde: 9 = 09:00, 9.5 = 09:30
  endHour:    17,         // startHour > endHour = tagesübergreifend (z.B. 22→6)
  locked:     false,
  date:       null,       // "2026-05-23" — Anker für Wiederholung + einmalige Blocker
  repeat:     null,       // { type: 'daily'|'weekly'|'monthly'|'custom', every?, unit?, days? }
  endDate:    null,       // "2026-05-23" — Abschneidedatum für wiederkehrende
  exceptions: [],         // ["2026-05-23"] — übersprungene Instanzen
}
```

**Hilfsfunktionen (blockerUtils.js):**
- `createBlocker(partial?)` — Factory
- `getBlockersForDate(allBlockers, dateStr)` — filtert aktive Blocker für einen Tag. Overnight-Blocker (startHour > endHour) liefern zwei normalisierte Objekte: `{ ..., endHour: 24, _overnight: 'start', _origEnd }` für den Starttag und `{ ..., startHour: 0, _overnight: 'end', _origStart }` für den Folgetag.
- `getBlockerForHour(hour, blockersForDate)` — Blocker der eine Stunde enthält
- `deleteBlockerInstance(blocker, dateStr)` — nur diese Instanz (adds to exceptions)
- `deleteBlockerFuture(blocker, dateStr)` — diese + alle zukünftigen (sets endDate)
- `formatHour(h)` — 9.5 → "09:30"
- `parseHourStr(str)` — "09:30" → 9.5

**Blocker-UI:**
- Pill ("offen"/"geblockt") im BlockerCard-Header: Klick toggelt `locked` direkt (kein Modal nötig)
- Slots innerhalb eines gelockten Blockers: Handle-Tap toggelt NICHT die individuelle Slot-Sperre (verhindert versehentliches Einfrieren). Ziehen raus bleibt möglich.

---

## Zustand Store (store/index.js)

```js
// Todos
todos,        setTodos
todoOrder,    setTodoOrder
cats,         setCats

// Kalender
days,         setDays       // { "2024-01-15": { "8": SlotEntry, "8.5": SlotEntry } }
doneCounters, setDoneCounters
blockers,     setBlockers   // Blocker[] — persistiert via SK.blockers

// App
settings,     setSettings
theme,        setTheme
modules,      setModules
activeTools,  toggleTool    // string[] — aktive Tool-IDs
accentColor,  setAccentColor
toolColors,   setToolColors  // { [toolId]: "#hexcolor" }

// Navigation
currentTab,   previousTab,  setCurrentTab
dayplanDate,  setDayplanDate // Flüchtiger Intent-Wert (kein localStorage)
heuteModus,   setHeuteModus  // 'manuell'

// Geburtstage
birthdays,    setBirthdays
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
// Todos
SK.todos          → 'adhs_todos_list'
SK.routines       → 'adhs_todos_routines'
SK.todoOrder      → 'adhs_todos_order'
SK.cats           → 'adhs_todos_cats'

// Kalender
SK.days           → 'adhs_calendar_days'
SK.doneCounters   → 'adhs_calendar_done'
SK.templates      → 'adhs_calendar_templates'
SK.blockers       → 'adhs_blockers'

// App-Config
SK.settings       → 'adhs_app_settings'
SK.theme          → 'adhs_app_theme'
SK.modules        → 'adhs_app_modules'
SK.activeTools    → 'adhs_app_active_tools'
SK.accentColor    → 'adhs_app_accent'
SK.toolColors     → 'adhs_app_tool_colors'

// View-State (kein Reload nötig — wird beim Tab-Wechsel gelesen)
SK.visStart       → 'adhs_view_vis_start'       // Zeitplan sichtbarer Start (Stunde)
SK.visEnd         → 'adhs_view_vis_end'          // Zeitplan sichtbares Ende (Stunde)
SK.lastPoolReturn → 'adhs_view_last_pool_return'
SK.poolSort       → 'adhs_view_pool_sort'        // 'standard'|'kategorie'|'alter'
SK.calView        → 'adhs_view_cal_view'         // 'woche'|'monat'

// Tools
SK.recipes        → 'adhs_recipes_list'
SK.shopping       → 'adhs_recipes_shopping'
SK.shoppingStates → 'adhs_recipes_shopping_states'
SK.selectedDishes → 'adhs_recipes_selected'
SK.weight         → 'adhs_health_weight'
SK.birthdays      → 'adhs_birthdays'
SK.haushalt       → 'adhs_haushalt_v1'
SK.haushaltEnergie→ 'adhs_haushalt_energie'    // lokaler UI-State (Normal/Low Energy)
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
--- Tools (via TOOL_TAB) ---
Tab 4  — Geburtstage    (geburtstage)
Tab 5  — Fokus-Timer    (timer)
Tab 6  — Rezepte        (rezepte)
Tab 7  — Pizza-Rechner  (pizza)
Tab 8  — Elvi           (elvi)
Tab 9  — Gewicht        (gewicht)
Tab 10 — XP & Level     (gamification)
Tab 11 — Zufallsrad     (rad)
Tab 12 — Reminder       (reminder)
Tab 13 — Haushalt       (haushalt)
Tab 14 — Was jetzt?     (wasjetzt)
Tab 15 → nächstes Tool
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

---

## TabHeute — Features

- **DayNav:** Kompakte Pille oben — `‹ Datum ›`. Datum cyan+glow = heute, weiß = anderer Tag. Pfeil Richtung heute leuchtet cyan wenn nicht auf heute. Klick auf Datum → Tab 1 (Kalender).
- **viewDate:** Lokaler State (`useState(() => store.dayplanDate ?? todayKey())`). Mount-Effect liest `store.dayplanDate`, setzt viewDate, löscht es. Tab verlassen → unmount → automatisch Reset auf heute beim nächsten Mount.
- **store.dayplanDate:** Flüchtiger Intent-Wert (kein localStorage). DayPanel setzt ihn vor `setCurrentTab(0)`, TabHeute konsumiert ihn einmalig beim Mount.
- **Pool + Drag & Drop:** Immer sichtbar, funktioniert auf allen Tagen — Slots schreiben auf `viewDate`.
- **Eingebettete Sektionen:** `<ReminderSection />` (wenn reminder aktiv) und `<HaushaltSection />` (wenn haushalt aktiv) erscheinen unter dem Pool.
- **Blocker:** `BlockerModal` + `RepeatDeleteSheet` — Blocker im Zeitplan erstellen/bearbeiten/löschen. Löschen wiederkehrender Blocker: "Nur diese" (exception) oder "Diese und alle zukünftigen" (endDate).

---

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
