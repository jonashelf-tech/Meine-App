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
  notes:          null,
  haushaltRoomId: null,  // Haushalt-Raum-Zuordnung (string|null)
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

**Sprach-Parser:** `parseTodoText(raw)` in `src/features/todos/parseTodoText.js` — einzige Parser-Quelle
(`!`-Prio, `#Kategorie`, Zeiten/Zeitspannen, Datum, Dauer). Genutzt vom „Auto"-Knopf im TodoModal.

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
dayplanDate,  setDayplanDate   // Flüchtiger Intent-Wert (kein localStorage)
calendarDate, setCalendarDate  // Flüchtiger Intent-Wert (kein localStorage)
heuteModus,   setHeuteModus    // 'voll' | 'fokus' — persistiert (SK.heuteModus), Default 'voll'
backInterceptor, setBackInterceptor  // fn | null — App.jsx ruft vor Tab-Navigation auf (Swipe-Back-Fix)

// Kognitiv
kognitivAutoStart, setKognitivAutoStart  // string | null — moduleId für Auto-Start aus Tagesplaner

// Geburtstage
birthdays,    setBirthdays

// Projekte
projects,     setProjects
```

---

## Geburtstage — Datenmodell

```js
// SK.birthdays → 'adhs_birthdays'
{
  id:          genId(),
  name:        "",
  date:        "MM-DD",        // Monat-Tag (ohne Jahr)
  year:        null,           // Geburtsjahr (optional)
  kalender:    false,          // true → Balken in Monats-/Wochenansicht + DayPanel
  wichtig:     false,          // true → Geburtstags-Chip in BirthdaySection (Tagesplaner)
  wichtigDays: 3,              // Vorlauf-Tage für Geburtstags-Chip
  geschenk:    false,          // true → Geschenk-Chip in BirthdaySection
  geschenkDays:7,              // Vorlauf-Tage für Geschenk-Chip
  notes:       "",
  plannedYear: null,           // Jahr in dem der Geburtstag auf den Zeitplan gezogen wurde → blendet Kalender-Balken aus bis nächstes Jahr
}
```

**birthdayUtils.js** (`src/features/tools/geburtstage/birthdayUtils.js`):
- `getBirthdaysForCalendarDate(birthdays, dateKey)` — gibt Einträge zurück wenn `kalender===true` UND `plannedYear !== currentYear`
- `formatBirthdayDate(date)` — "05-12" → "12. Mai"
- `getActiveChips(birthdays, today)` — fällige Chips (Geburtstag + Geschenk) für heutigen Tag + Vorlauf
- `isBirthdayChipDue(b, today)` / `isGeschenkChipDue(b, today)` — Chip-Logik

**Kalender-Integration (nach Tool-Redesign):**
- Monatsansicht: Geburtstags-Balken ganz oben in Tageskachel (vor Termin/Todo-Balken), Toolfarbe `geburtstage`, **kein Dot**
- Wochenansicht: Geburtstags-Balken im Allday-Streifen (erscheint wenn `showTodos || showTermine`)
- DayPanel: Geburtstags-Einträge als All-day-Zeilen ganz oben in Zeitplan-Sektion (kein eigener Abschnitt)
- `plannedYear` setzen: Geburtstag via `startBirthdayDrag` auf Zeitplan ziehen → setzt `plannedYear = currentYear` → blendet Kalender-Balken bis nächstes Jahr aus

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
SK.heuteModus     → 'adhs_view_heute_modus'      // 'voll'|'fokus' — Default 'voll', letzter Stand bleibt
SK.zeitplanMinimal→ 'adhs_view_zeitplan_minimal' // Alles/Minimal-Toggle — Default Alles, letzter Stand bleibt
SK.weekVisStart   → 'adhs_view_week_vis_start'   // Wochenansicht sichtbarer Start
SK.weekVisEnd     → 'adhs_view_week_vis_end'     // Wochenansicht sichtbares Ende

// Tools — Mealprep (Rezepte)
SK.recipes         → 'adhs_recipes_list'           // Rezepte (Array)
SK.rezepteZutaten  → 'adhs_recipes_ingredients'    // Zutaten/Bausteine
SK.rezepteKoerbe   → 'adhs_recipes_baskets'        // gespeicherte Menüs
SK.rezepteSettings → 'adhs_recipes_settings'
SK.recipesVersion  → 'adhs_recipes_list__v'        // Schema-Marker (seed/migrate) — MUSS im Backup sein!
SK.rezepteKorbAktiv→ 'adhs_recipes_active_basket'  // persistenter Arbeits-Korb inkl. einkaufChecked/kochChecked (Abhak-Stände überleben Reload)
SK.shopping/.shoppingStates/.selectedDishes         // LEGACY (altes Rezepte-Tool, nur Backup-Kompat)

// Tools — sonstige
SK.weight            → 'adhs_health_weight'
SK.weightDash        → 'adhs_wdash'               // Gewicht-Dashboard-Settings
SK.birthdays         → 'adhs_birthdays'
SK.birthdaySort      → 'adhs_bday_sort'
SK.reminder          → 'adhs_reminder_v1'         // { items: [...] }
SK.reminderDismissed → 'adhs_reminder_dismissed'  // { "YYYY-MM-DD": [ids] }
SK.elvi              → 'adhs_elvi_v1'             // { doses, savedDays } — Leser: elvi/elviData.js
SK.haushalt          → 'adhs_haushalt_v1'
SK.haushaltEnergie   → 'adhs_haushalt_energie'    // lokaler UI-State (Normal/Low Energy)
SK.kognitiv          → 'adhs_kognitiv_sessions'   // Session-Archiv (Array)
SK.kognitivCheckin   → 'adhs_kognitiv_checkin'    // { "YYYY-MM-DD": CheckinEntry }
SK.kognitivSchedule  → 'adhs_kognitiv_schedule'   // { [moduleId]: { mode, days, time } }
SK.kognitivPractice  → 'adhs_kognitiv_practice'   // ephemer (Wochen-Gate), NICHT im Backup
SK.klaerenSettings   → 'adhs_klaeren_settings'    // { threshold, ageColor }
SK.wachstum          → 'adhs_wachstum_v1'         // { habits, checks, journal } — Leser: wachstum/growthData.js
SK.garten            → 'adhs_garten_v1'           // { xpFloor, seenMilestones } — Garten-Begleiter (Monotonie-Ratchet)
SK.erfolgeTracking   → 'adhs_erfolge_tracking_v1' // Tagesplaner-Tage; schreibt TabHeute, liest Garten (historischer Name)
SK.erfolge           → LEGACY (altes Erfolge-Tool, nur Backup-Kompat)
```

Lesen/Schreiben:
```js
import { sv, lv, SK } from '../../../storage'
sv(SK.todos, nextTodos)
lv(SK.todos, [])
```

**Registry-Regel (wichtig):** Jeder neue Daten-Key gehört in `SK` **und** in `BACKUP_CATS`
(storage/index.js) — sonst geht er beim Restore auf ein neues Gerät verloren. Der Test
„Backup-Abdeckung — Anti-Drift" (storage.test.js) erzwingt das: jeder SK-Key muss gesichert
**oder** explizit ephemer (`EPHEMERAL`) sein. Reset-Keys gehören zusätzlich in `TOOL_RESETS`
(toolReset.js). Roh-`localStorage` in Komponenten vermeiden — immer `sv`/`lv` (Quota-Schutz +
Korrupt-Rettung). Cross-Tool-Lesen über ein Datenmodul des Tools, nicht roh (z.B. elviData.js).

**Datum:** Tages-Keys immer lokal über `dateKey`/`todayKey` (utils), nie
`new Date().toISOString().slice(0,10)` (UTC → an der Mitternachts-Grenze falscher Tag).
Ausnahme: echte ISO-Kalenderwoche.

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
Tab 2  — Tools          (TabTools: Meine Tools default; "+ Alle Tools" Toggle-Button oben öffnet Alle-Tools-Liste)
Tab 3  — Einstellungen
--- Tools (via TOOL_TAB) ---
Tab 4  — Geburtstage    (geburtstage)
Tab 5  — Fokus-Timer    (timer)
Tab 6  — Rezepte        (rezepte)
Tab 7  — Pizza-Rechner  (pizza)
Tab 8  — Elvi           (elvi)
Tab 9  — Gewicht        (gewicht)
Tab 10 — Garten         (garten)
Tab 11 — Zufallsrad     (rad)
Tab 12 — Reminder       (reminder)
Tab 13 — Haushalt       (haushalt)
Tab 14 — Was jetzt?     (wasjetzt)
Tab 15 → nächstes Tool
```

Tool-Navigation: `setCurrentTab(TOOL_TAB[toolId])` — TOOL_TAB-Mapping **ausschließlich** in `src/features/tools/toolTabs.js` (Single Source of Truth). Alle Consumer importieren von dort.

---

## TabKalender — Features

> Code seit 2026-06-11 gesplittet: `TabKalender.jsx` (Orchestrator) · `WocheView.jsx` (Drag + Modals) ·
> `MonatView.jsx` (Kacheln + DayPanel) · `DayPanel.jsx` · `kalenderShared.js` (Konstanten + pure Helfer).

- **Ansichten:** Woche (Zeitgitter 07–22 Uhr) · Monat (Kacheln mit Farbbalken)
- **Layout:** NavPill ganz oben (Monat/Woche Navigation), Woche/Monat-Segmented direkt darunter, dann das Grid
- **Toggle-Strip:** Termine + Todos + Tools (je ein lokaler Boolean). `showTools` (default false) filtert tool-erstellte Items (`toolId != null`) aus Monats-Balken und Wochen-Slots. DayPanel zeigt immer alle Items unabhängig von showTools.
- **Tool-Dots:** Datengesteuert — nur wenn tatsächlich Daten vorhanden:
  - Gewicht-Dot: `loadEntries().some(e => e.date === dk)` (aus `gewichtData.js`)
  - Haushalt-Dot: `todos.some(t => t.toolId === 'haushalt' && t.createdAt?.startsWith(dk))`
  - Reminder-Dot: `todos.some(t => t.reminderItemId && t.createdAt?.startsWith(dk))` ODER `Object.values(days[dk] ?? {}).some(s => s.reminderItemId)`
  - Dots immer solid (kein Ring-Stil). Farbe via `getToolColor(id, toolColors)`.
  - Keine Dots für: Elvi, Fokus-Timer, Pizza, Prokrastination, Rezepte, Was jetzt?, Zufallsrad, Garten
- **Geburtstags-Balken:** synthetisch aus `birthdays[]` abgeleitet (kein `days`-Store), erscheinen vor Termin/Todo-Balken in Tageskachel. Nur wenn `kalender===true` AND `plannedYear !== currentYear`.
- **DayPanel:** erscheint unterhalb des Grids wenn Monatskachel angeklickt
  - Sektionen: Zeitplan · Erledigt · Gewicht (nur wenn Eintrag für diesen Tag)
  - Zeitplan: Geburtstags-All-day-Einträge ganz oben (pinker Akzentstreifen), darunter normale Slots
  - Erledigt: `todos.filter(t => t.doneAt?.startsWith(dk))` — Einzelklick → Restore-Modal. **Default: eingeklappt** (`done: false` in useState)
  - Gewicht: nur sichtbar wenn `loadEntries().find(e => e.date === dk)` — zeigt kg + kcal + Link-Button → Tab Gewicht
  - Klick auf Datum-Header → setzt `store.dayplanDate(dk)` + Tab 0 → Tagesplaner öffnet auf dem Tag
- **Wochenansicht Allday-Streifen:** zeigt Geburtstags-Balken + Todos ohne Uhrzeit. Erscheint wenn `showTodos || showTermine`.
- **Wochenansicht Drag & Drop:** Blöcke per Pointer verschiebbar über Zeit **und** Tag (colRefs für Spalten-Trefferflächen). Unified Pointer-Handler unterscheidet tap / dblTap / drag-start. Block-Redesign: SLOT_H 28px, top-aligned, Verlauf in Item-Farbe, Done-Badge mit Farberhalt, Zeit-Label nur auf hohen Blöcken.

---

## Swipe-Back / Back-Interceptor

`backInterceptor` im Store (`store/index.js`) — `fn | null`.

`App.jsx` fängt den Browser-Popstate-Event ab. Bevor der Tab-Wechsel ausgeführt wird, wird geprüft ob ein Interceptor gesetzt ist → wird aufgerufen statt zurück zu navigieren.

**Nutzung in Tools:**
```js
const { setBackInterceptor } = useAppStore()

useEffect(() => {
  setBackInterceptor(nav !== null ? () => setNav(null) : null)
  return () => setBackInterceptor(null)
}, [nav, setBackInterceptor])
```

Damit geht Swipe-Back innerhalb eines Tools eine Ebene zurück (statt das Tool zu schließen). Immer `return () => setBackInterceptor(null)` im Cleanup.

---

## TabHeute — Features

- **DayNav:** Kompakte Pille oben — `‹ Datum ›`. Datum cyan+glow = heute, weiß = anderer Tag. Pfeil Richtung heute leuchtet cyan wenn nicht auf heute. Klick auf Datum → Tab 1 (Kalender).
- **viewDate:** Lokaler State (`useState(() => store.dayplanDate ?? todayKey())`). Mount-Effect liest `store.dayplanDate`, setzt viewDate, löscht es. Tab verlassen → unmount → automatisch Reset auf heute beim nächsten Mount.
- **store.dayplanDate:** Flüchtiger Intent-Wert (kein localStorage). DayPanel setzt ihn vor `setCurrentTab(0)`, TabHeute konsumiert ihn einmalig beim Mount.
- **Pool + Drag & Drop:** Immer sichtbar, funktioniert auf allen Tagen — Slots schreiben auf `viewDate`. Pool-Container ist als Drop-Zone registriert (`registerHalf('pool', el, 'empty')`): Zeitplan-Slot in den Pool ziehen löscht den Slot, das Todo bleibt im Pool.
- **Eingebettete Sektionen:** `<ReminderSection />` und `<HaushaltSection />` erscheinen unter dem Pool wenn aktiv. Beide nutzen das **fakeTodo-Pattern**: Items werden als `fakeTodo`-Objekte in `<TodoChip>` gerendert (disableExpand, 6-Punkte-Drag-Handle, Auswahl-Checkbox, Masse-Add-Button). Todo-Erstellung passiert erst **beim Drop** (atomar mit dem Slot) — kein Flackern im Pool. TabHeute liefert `startHaushaltDrag` / `startReminderDrag` via `onStartDrag`-Prop. Siehe `kontext/tool-pattern.md` für das vollständige Muster.
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
