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
(`!`-Prio, `#Kategorie`, Zeiten/Zeitspannen, Datum, Dauer). Genutzt vom „Auto"-Toggle im TodoModal:
persistiert (`SK.autoParse`), an = Live-Chips („erkannt: …") + Übernahme beim Hinzufügen,
**manuell gesetzte Felder gewinnen immer**. Nur beim Erstellen aktiv, nicht beim Bearbeiten.
Zeitspanne (`10-12` / `10:00-12:00`, optional „uhr" mit beliebigem Leerzeichen davor) → `time` + `duration`.

**Zeitspanne im TodoModal (Details → Uhrzeit):** zweites `type="time"`-Feld „Ende" neben dem
Start — kein eigener State, reine Ableitung aus `time`+`duration` (`minsToHHMM(parseHHMM(time)+duration)`).
Eintippen von Ende schreibt direkt auf `duration` (Ende−Start, nur wenn > 0). Datenmodell unverändert —
Block speichert weiterhin nur `duration` in Minuten, kein `endTime`-Feld.

---

## Notiz (eigener Capture-Typ)

```js
// createNote(partial?) in src/features/notes/Note.js
{
  id, text, color,           // text mehrzeilig — erste nicht-leere Zeile = Titel
  pinned: false,
  createdAt, updatedAt,
}
```

Eigener Store (`notes` / `SK.notes`), **bewusst nicht** in `todos[]` — Notizen haben keinen
done/Termin/Kalender-Lebenszyklus und sollen nicht im Pool/Kalender/Missed-Review auftauchen.
`noteTitle(n)` / `notePreview(n)` / `formatNoteTime(n)` (Note.js) liefern Titel, Vorschau + relative Zeit.

**Zwei Einstiege:** (1) Tool „Notizen" (Tab 19) — Karten-Übersicht (angepinnt + alle, Suche,
Farbe, Pin) via `NoteEditor`. (2) Globaler „+" → Umschalter `Aufgabe | Notiz` (`SK.addMode`,
letzter Modus gemerkt). Notiz-Modus = persistentes Feld (`SK.noteDraft`, **ephemer**): Text
bleibt bis „Speichern", Schließen ohne Speichern lässt ihn stehen. Umschalter nur beim reinen
Erfassen — nicht bei Bearbeiten/Slot-Anlegen (prefill mit Datum/Zeit). Unter dem Speichern-Button
zeigt der Notiz-Modus die **letzten 2 Notizen** (Vorschau) + „Alle Notizen" — Tippen springt ins
Notizen-Tool (`setCurrentTab(TOOL_TAB.notizen)`, Entwurf bleibt via `SK.noteDraft` erhalten).

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
notes,        setNotes

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

// Timer
timerAutoStart, setTimerAutoStart  // { todoId, text, color, duration, date, slotKey, returnTab? } | null — flüchtig; Play am Slot → TabTimer konsumiert beim Mount; returnTab (z.B. Growth-Timer-Karte) → nach Ablauf zurück zum Tool statt Erledigt-Dialog
growthOpenDate, setGrowthOpenDate  // string | null — flüchtig; Kalender-DayPanel „→ Öffnen" setzt Zieltag, TabGrowth konsumiert beim Mount

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
SK.notes          → 'adhs_notes_v1'           // eigener Notiz-Store (in BACKUP_CATS.tools)
SK.noteDraft      → 'adhs_notes_draft'        // ephemer — +-Modal Notiz-Entwurf
SK.addMode        → 'adhs_view_add_mode'      // 'aufgabe'|'notiz' — letzter +-Modus

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
SK.toolUsage      → 'adhs_app_tool_usage'    // { [toolId]: "YYYY-MM-DD" } letztes Öffnen — Dachboden-Regel
SK.accentColor    → 'adhs_app_accent'
SK.toolColors     → 'adhs_app_tool_colors'

// View-State (kein Reload nötig — wird beim Tab-Wechsel gelesen)
SK.visStart       → 'adhs_view_vis_start'       // Zeitplan sichtbarer Start (Stunde)
SK.visEnd         → 'adhs_view_vis_end'          // Zeitplan sichtbares Ende (Stunde)
SK.lastPoolReturn → 'adhs_view_last_pool_return'
SK.poolSort       → 'adhs_view_pool_sort'        // 'standard'|'kategorie'|'alter'
SK.autoParse      → 'adhs_view_auto_parse'       // Auto-Parser-Toggle im TodoModal (bool)
SK.calView        → 'adhs_view_cal_view'         // 'woche'|'monat'
SK.heuteModus     → 'adhs_view_heute_modus'      // 'voll'|'fokus' — Default 'voll', letzter Stand bleibt
SK.weekVisStart   → 'adhs_view_week_vis_start'   // Wochenansicht sichtbarer Start
SK.weekVisEnd     → 'adhs_view_week_vis_end'     // Wochenansicht sichtbares Ende

// Tools — Mealprep (Rezepte)
SK.recipes         → 'adhs_recipes_list'           // Rezepte (Array)
SK.rezepteZutaten  → 'adhs_recipes_ingredients'    // Zutaten/Bausteine
SK.rezepteKoerbe   → 'adhs_recipes_baskets'        // gespeicherte Menüs
SK.rezepteSettings → 'adhs_recipes_settings'
SK.recipesVersion  → 'adhs_recipes_list__v'        // Schema-Marker (seed/migrate) — MUSS im Backup sein!
SK.rezepteKorbAktiv→ 'adhs_recipes_active_basket'  // persistenter Arbeits-Korb inkl. einkaufChecked/kochChecked (Abhak-Stände überleben Reload)
SK.rezepteFroster  → 'adhs_recipes_freezer'        // { rezeptId: bloecke } — TK-Blockbestand (BACKUP_CATS.tools)
SK.rezepteIntroSeen→ 'adhs_recipes_intro_seen'     // bool — Erst-Briefing gesehen (BACKUP_CATS.einstellungen)
SK.rezepteScreen   → 'adhs_recipes_screen'         // ephemer — letzter Mealprep-Screen (Reload kehrt dorthin zurück)
SK.shopping/.shoppingStates/.selectedDishes         // LEGACY (altes Rezepte-Tool, nur Backup-Kompat)

// Tools — sonstige
SK.weight            → 'adhs_health_weight'
SK.weightDash        → 'adhs_wdash'               // Gewicht-Dashboard-Settings
SK.birthdays         → 'adhs_birthdays'
SK.birthdaySort      → 'adhs_bday_sort'
SK.reminder          → 'adhs_reminder_v1'         // { items: [...] }
SK.reminderDismissed → 'adhs_reminder_dismissed'  // { "YYYY-MM-DD": [ids] }
SK.elvi              → 'adhs_elvi_v1'             // { doses (mg = freie Zahl, dezimal), savedDays } — Leser: elvi/elviData.js
//                                                  Dosis-Empfehlung: elvi/elviLogic.js (rein/getestet) korreliert Dosis-Stufen
//                                                  mit kognitiver Tagesform (liest kognitiv/sessionStore cross-tool) + Ratings
SK.timerStart        → 'adhs_timer_startTs'       // ephemer (laufender Timer), NICHT im Backup
SK.timerTotal        → 'adhs_timer_totalSecs'     // ephemer (laufender Timer), NICHT im Backup
SK.timerRunning      → 'adhs_timer_running'       // ephemer (laufender Timer), NICHT im Backup
SK.haushalt          → 'adhs_haushalt_v1'
SK.haushaltEnergie   → 'adhs_haushalt_energie'    // lokaler UI-State (Normal/Low Energy)
SK.kognitiv          → 'adhs_kognitiv_sessions'   // Session-Archiv (Array)
SK.kognitivCheckin   → 'adhs_kognitiv_checkin'    // { "YYYY-MM-DD": CheckinEntry }
SK.kognitivSchedule  → 'adhs_kognitiv_schedule'   // { [moduleId]: { mode, days, time } }
SK.kognitivPractice  → 'adhs_kognitiv_practice'   // ephemer (Wochen-Gate), NICHT im Backup
SK.kognitivIntroSeen → 'adhs_kognitiv_intro_seen' // bool — Erst-Briefing gesehen (Backup: einstellungen)
SK.klaerenSettings   → 'adhs_klaeren_settings'    // { threshold, ageColor }
SK.wachstum          → 'adhs_wachstum_v1'         // LEGACY (altes Wachstum-Tool; Habit-Checks zählt Garten weiter, Journal → growth migriert)
SK.growth            → 'adhs_growth_v1'           // { days{ tageskarteId, skipVerwendet, karten[], freitext, stateTouched, timerKarteId }, queuedCard, openerShownFor, settings } — Leser: growth/growthStore.js
SK.dailyState        → 'adhs_daily_state_v1'      // { "YYYY-MM-DD": { sleep, energy, mood } } — geteilt Kognitiv↔Growth — Leser: daily/dailyState.js
SK.garten            → 'adhs_garten_v1'           // { xpFloor, seenMilestones } — Garten-Begleiter (Monotonie-Ratchet)
SK.erfolgeTracking   → 'adhs_erfolge_tracking_v1' // Tagesplaner-Tage; schreibt TabHeute, liest Garten (historischer Name)
SK.erfolge           → LEGACY (altes Erfolge-Tool, nur Backup-Kompat)

// Cloud-Backup + Geräte-Sync (src/sync/ — siehe Dateien/output/sync-architektur.md)
SK.cloudCreds        → 'adhs_cloud_creds'       // { serverUrl, token, key, activatedAt, syncOn } — E2E-Schlüssel bleibt clientseitig (BACKUP_CATS.einstellungen)
SK.cloudMeta         → 'adhs_cloud_meta'        // { lastPushAt, lastPushBytes, lastError } — gerätelokal, EPHEMERAL
SK.syncMeta          → 'adhs_sync_meta'         // { cursor, keys:{[key]:{v,h,sub,del,changedAt,dirty}} } — EPHEMERAL (frisches Gerät = Erst-Kopplung)
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
parseHHMM(str)       // "08:30" → 510 (Minuten seit Mitternacht, NICHT Dezimalstunde)
minsToHHMM(mins)     // 510 → "08:30"
ALL_SLOT_KEYS        // alle gültigen Slot-Keys 0–23.5
```

---

## Tab-Routing (Kern)

```
Tab 0  — Tagesplaner    (TabHeute: DayNav + Zeitplan + Pool)
Tab 1  — Kalender       (TabKalender: Woche/Monat + DayPanel)
Tab 2  — Tools          (TabTools: Meine Tools default; "+ Alle Tools" Toggle-Button oben öffnet Alle-Tools-Liste)
                        Dachboden-Regel: App.jsx trackt letztes Öffnen pro Tool (toolUsage.js);
                        ≥60 Tage ungenutzt → Amber-Badge + „Deaktivieren"-Button in Meine Tools (nichts automatisch)
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
  - Growth-Dot: `growthDoneDates.includes(dk)` (aus `growthStore.getDoneDates()` — Tag mit State-Check/Freitext/beantworteter Karte)
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
  - **Drag-Ghost (2026-06-22):** wird per `createPortal` an `document.body` gerendert. Grund: der `position:fixed`-Ghost rechnet mit viewport-`getBoundingClientRect`; läge er im Swipe-Container und der hätte ein `transform`, würde der Ghost um den Container-Offset daneben sitzen. Ghost-Look folgt Item (Termin = Vollfläche, Todo = getönt+Kontur via `.weekDragChipTodo`).
  - **`usePageSwipe`-Hygiene (2026-06-22):** der Hook entfernt sein `transform` am Ruhepunkt (transitionend → `''`) statt `translateX(0)` stehenzulassen — ein zurückbleibendes Transform macht den Container zum containing-block für `position:fixed` darin (Ghost **und** Modals wie SlotSheet/WeekTerminEditModal würden sonst nach einem Swipe verrutschen). Gilt für Tagesplaner + Kalender.
- **Wochenansicht Slot-Tap-Sheet:** Tap auf freie Fläche öffnet `SlotSheet` (mit `dateLabel` „Do 11.6.") statt direkt das TodoModal — „+ Neues Todo/Termin" führt zum bisherigen QuickCreate (TodoModal mit date+time vorbefüllt), Pool-Todos lassen sich per Tap auf den Zieltag platzieren (schreibt `days[dk][slotKey]` + todo.date/time).
- **Wochenansicht Scroll-Modell (2026-06-22):** Kopf (Wochentage) + Ganztägig + „früher/später"-PillStrips sind die **fixe Kopfzone**, **nur `.weekScrollBody` scrollt** (`max-height: calc(100dvh - 320px)`, `overflow-y:auto`, `overscroll-behavior:contain`). Ersetzt das frühere `position:sticky` auf `.weekStickyTop`, das an der Bildschirmkante klebte (Ursache: `.weekWrapper` hatte `overflow:clip`). Beim Öffnen der aktuellen Woche Auto-Scroll grob zur Jetzt-Zeit (`scrollBodyRef`). `max-height`-Subtrahend ist auf Viewport getunt — bei Bedarf nachziehen.
- **Wochenansicht Look (2026-06-22):** Eine ruhige Stundenlinie (Spalten-`::before`, alle 56px) statt Doppel-Raster; keine gestrichelten Kästen mehr (PillStrips = Haarlinie); Jetzt-Linie violett (`--primary`, wie Tagesplaner) statt rose; Zeitachse nur Stundenzahl; Ganztags-Chips lesbar (`--bar-color` → getönter Fill + Akzentstreifen); Todo-Slots getönt+Kontur statt Vollfläche (klar von Terminen unterscheidbar); Karte mit `--elev-1`-Tiefe.

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
- **Drag blockiert Page-Swipe (2026-07-01):** `useDragDrop` liefert `draggingRef` (true während `startDrag`…`pointerup`). TabHeute's `usePageSwipe`-`disabled` ist dafür eine **Funktion** (nicht mehr ein am Render eingefrorener Boolean) und prüft `draggingRef.current` live — sonst bliebe der Ref-Wert vom letzten Render hängen. Gleiches Muster wie `weekDraggingRef` in TabKalender/WocheView.
- **Löschen ausschließlich über TodoModal / Drag-in-Pool (2026-07-01):** Swipe-to-delete im TodoChip (translate + `.deleteReveal`) + der Zeitplan-`RemoveDialog` ("Zurück in Pool"/"Löschen") sind entfernt — die Geste kollidierte mit dem Drag-Handle (löste beim Wischen sofort ein Drag statt Löschen aus) und wackelte bei jedem Scroll mit. Ersatz: Doppeltipp → TodoModal → „Löschen" (2-Schritt-Bestätigung, entfernt Todo + räumt referenzierende Slots auf) für alles mit `onEdit`; Ziehen-in-Pool bleibt der Weg für „Slot loswerden ohne Todo zu löschen" (funktioniert auch bei reinen Text-Slots ohne `todoId` — dann verschwindet der Slot komplett, da nichts „zurückzulegen" ist). `onRemove`/„✕"-Button existiert nur noch für fakeTodo-Chips ohne `onEdit` (Reminder/Haushalt/Geburtstage-Widgets).
- **Endzeit-Projektion (Pool):** dezente Zeile unter dem Pool-Header — Summe der Dauern offener Todos + „fertig ~HH:MM" (wenn jetzt gestartet) + „+N ohne Dauer". Tickt minütlich, erscheint nur wenn mind. ein offenes Todo eine Dauer hat.
- **Eingebettete Sektionen:** `<ReminderSection />` und `<HaushaltSection />` erscheinen unter dem Pool wenn aktiv. Beide nutzen das **fakeTodo-Pattern**: Items werden als `fakeTodo`-Objekte in `<TodoChip>` gerendert (disableExpand, 6-Punkte-Drag-Handle, Auswahl-Checkbox, Masse-Add-Button). Todo-Erstellung passiert erst **beim Drop** (atomar mit dem Slot) — kein Flackern im Pool. TabHeute liefert `startHaushaltDrag` / `startReminderDrag` via `onStartDrag`-Prop. Siehe `kontext/tool-pattern.md` für das vollständige Muster.
- **Blocker:** `BlockerModal` + `RepeatDeleteSheet` — Blocker im Zeitplan erstellen/bearbeiten/löschen. Löschen wiederkehrender Blocker: "Nur diese" (exception) oder "Diese und alle zukünftigen" (endDate).
- **Play am Slot:** ▶-Button an nicht-erledigten Slots (TodoChip `onPlay`-Prop) → `setTimerAutoStart({todoId,text,color,duration,date,slotKey})` + Tab-Wechsel zum Fokus-Timer. Timer startet sofort, „✓ Fertig"-Button beendet vorzeitig; Abschluss-Dialog zeigt **geplant X min · gebraucht Y min** und hakt Todo **und** Slot ab.
- **Slot-Tap-Modal (`SlotSheet.jsx`):** Tap auf leeren Slot (leere Halften hatten keine Tap-Funktion) → zentriertes Modal: „+ Neues Todo/Termin" (öffnet TodoModal mit `prefill={date,time}` des Slots) + Pool-Todos zum Tap-Platzieren (gleicher Schreibpfad wie Drag: Slot + todo.date/time). Überlange Todos, deren Folge-Slots belegt sind, sind ausgegraut („passt nicht") — gleiche Regel wie `canDrop`. Drag&Drop bleibt unverändert.
- **Zeitplan-Raster (`Zeitplan.jsx`):** stabiles, schlankes 30-Min-Raster (kein Stauchen mehr beim Draggen, `body.dnd-active`-Squish entfernt). Leere Randzeiten außerhalb des Kernfensters (`visStart`/`visEnd`) werden zu vollwertigen, droppbaren „frei"-Bändern (`bandLogic.js` → `computeBands()`) statt der alten `PillStrip`-Pillen — Tap aufs Band erweitert das Fenster, Drop aufs Band platziert + erweitert. Geburtstage erscheinen als All-day-Streifen ganz oben im Zeitplan.
- **Motion/Elevation-Tokens (`styles/vars.css`):** app-weiter Standard — `--dur-fast/--dur/--dur-slow` + `--ease-out/--ease-in/--ease` für Animationen, `--elev-1`/`--elev-drag` für dezente Tiefe (Chip-Schatten, Drag-Lift), `toolEnter`-Keyframe für sanftes Tab-/Tool-Öffnen (`App.jsx`).

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
