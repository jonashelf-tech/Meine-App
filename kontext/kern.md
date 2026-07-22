# Kern — Datenstrukturen & Store

## Block (einziger Datentyp)

```js
{
  id:        genId(),   // crypto.randomUUID() oder Fallback-String — KEIN Date.now()
  text:      "",
  priority:  3,         // 1=Wichtig · 2=Sollte · 3=Kann
  color:     null,      // null = Standard: rendert überall als var(--primary), wandert live mit der Akzentfarbe. NIE einen Hex-Default persistieren (2026-07-12). Wählbare Palette: NEON in utils (12 Farbfamilien inkl. Grün/Gelb)
  duration:  null,      // Minuten, null = keine Angabe
  projectId: null,      // Projekt-Referenz (UUID) — siehe Abschnitt „Projekte (Kernfunktion)"
  date:      null,      // "2024-01-15" — Fälligkeit oder Termin
  time:      null,      // "14:30" — nur bei Terminen (date+time = Kalender-Termin)
  dayRank:   null,      // Sortier-Rang auf der Tagesachse (Listenmodus) — KEIN Zeitpunkt, nie angezeigt, nie ein Slot. Gilt nur bei date && !time. Guard: dayRankGuard.test.js
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
- `bumpPostpone(b, now?)` — pur: zählt `postponeCount` hoch + stempelt `postponedAt`, **max. 1×/Tag** (Entprellung). Legacy-Blöcke ohne die Felder crashen nicht.

**Verschoben-Signal (Stufe 2, für den Buddy):** `postponeCount` + `postponedAt` am Block zählen, wie oft ein Todo weggeschoben wurde — das ADHS-Signal. Hochgezählt an drei Stellen: Missed-Review „Ignorieren" **und** „In Pool" (`useTimeEvents`, nur Items mit `todoId`) sowie Datum-nach-hinten-Schieben im TodoModal-Edit. Fließt gekappt ins `contextPacket` (Feld `verschoben`, nur bei >0) und speist den Briefkasten-Trigger `verschoben` in `buddyImpuls.js`.

**Tagesliste (Listenmodus):** Ein Todo mit `date` + ohne `time` ist weiterhin `isFaelligkeit` — es entsteht **kein** neuer Typ. `dayRank` ist nur die Reihenfolge obendrauf: `null` = ans Tagesende (Rang 24). Sortierlogik rein in `src/features/calendar/tagesListeLogic.js` (`rankOf`, `insertRank`, `buildDayEntries`; Guard `tagesListeLogic.test.js`).

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

## Projekte (Kernfunktion)

Todos gehören optional zu einem Projekt (`todo.projectId`, UUID) statt zu einer freien
Kategorie-Zeichenkette. Datenmodell (`createProject(partial?)` in `src/features/projekte/projektModel.js`):

```js
{
  id:         genId(),
  name:       "",
  color:      "#4D9EFF",    // aus PROJEKT_COLORS[]
  hidden:     false,
  autoDelete: false,
  createdAt:  new Date().toISOString(),
}
```

- **`PROJEKT_COLORS`** — feste Farbpalette (Daten in JS, `projektModel.js`), bewusst **ohne**
  Akzent-Violett `#8B5CF6` (das bleibt reserviert für „Todo ohne Projekt"). `nextFreeColor()`
  vergibt neuen Projekten die am wenigsten genutzte Farbe.
- **Sweep-Modell:** Die Projektfarbe wird nicht zur Render-Zeit aufgelöst, sondern beim
  Zuweisen/Umfärben direkt auf `todo.color` **und** alle referenzierenden Slots geschrieben
  (`recolorProject()` in projektModel.js). Kalender/Zeitplan brauchen deshalb keine
  Projekt-Lookups beim Rendern — sie zeigen einfach `todo.color`/`slot.color`.
- **Boot-Migration** (`src/features/projekte/projektMigration.js`): marker-los und idempotent
  (Shape entscheidet, nicht ein Versions-Flag) — wandelt altes `todo.category` + `cats`-Strings
  in Projekte um, läuft in `store/index.js` VOR den `lv()`-Reads der Store-Initialisierung
  (heilt damit auch Restores alter Backups beim nächsten Boot).
- **ProjekteView** (`src/features/projekte/ProjekteView.jsx` + `ProjektKarte.jsx` +
  `ProjektMenuSheet.jsx`): Vollbild-Subview **im Tagesplaner** (kein eigener Tab) — Einstieg
  über den Projekte-Button im Pool-Header (`onOpenProjekte`-Prop, TabHeute), `backInterceptor`
  schließt sie vor dem restlichen Tagesplaner (Swipe-Back, Browser-Back **oder** Tap auf den
  aktiven Tagesplaner-Reiter). Zurück-Button in der Kopfzeile = dieselbe „← Zurück"-Pille wie
  `ToolHeader` (nicht mehr der runde Icon-Button).
- **Guard:** `src/projektGuard.test.js` verhindert, dass das tote Todo-Feld `category`/`catName`
  zurücksickert (nur `projektMigration.js` darf es lesen).

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
letzter Modus gemerkt). **Beide Felder (Aufgabe + Notiz) teilen sich EINEN Erfassungs-Entwurf**
(`SK.noteDraft`, **ephemer**): der getippte Text wandert beim Moduswechsel mit und bleibt über
Schließen erhalten — geleert wird er nur, wenn er echt als Todo *oder* Notiz gespeichert wird.
Gemeinsamer Entwurf + Umschalter nur beim reinen Erfassen — nicht bei Bearbeiten/Slot-Anlegen
(prefill mit Datum/Zeit), dort kommt der Text aus dem Todo/prefill. Unter dem Speichern-Button
zeigt der Notiz-Modus die **letzten 2 Notizen** (Vorschau) + „Alle Notizen" — Tippen auf eine
Notiz springt ins Notizen-Tool und schlägt sie direkt auf (`setNotizenOpenId` +
`setCurrentTab(TOOL_TAB.notizen)`), „Alle Notizen" nur ins Tool; Entwurf bleibt via `SK.noteDraft` erhalten.

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
heuteModus,   setHeuteModus    // 'raster' | 'liste' — persistiert (SK.heuteModus), Default 'raster'
backInterceptor, setBackInterceptor  // fn | null — App.jsx ruft ihn bei Browser-Back UND bei Tap auf den schon aktiven Reiter auf (poppt offene Subview statt Tab-Wechsel)

// Kognitiv
kognitivAutoStart, setKognitivAutoStart  // string | null — moduleId für Auto-Start aus Tagesplaner

// Timer
timerAutoStart, setTimerAutoStart  // { todoId, text, color, duration, date, slotKey, returnTab? } | null — flüchtig; Play am Slot → TabTimer konsumiert beim Mount; returnTab (z.B. Growth-Timer-Karte) → nach Ablauf zurück zum Tool statt Erledigt-Dialog
growthOpenDate, setGrowthOpenDate  // string | null — flüchtig; Kalender-DayPanel „→ Öffnen" setzt Zieltag, TabGrowth konsumiert beim Mount

// Geburtstage
birthdays,    setBirthdays

// Projekte
projects,     setProjects

// Buddy (KI-Begleiter)
buddySettings, setBuddySettings   // persistiert (SK.buddySettings)
buddyMemory,   setBuddyMemory     // persistiert (SK.buddyMemory)
buddyThread,   setBuddyThread     // flüchtig — Gesprächsfaden, stirbt beim Reload
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
  wichtigDays: 7,              // Vorlauf-Tage für Geburtstags-Chip
  geschenk:    false,          // true → Geschenk-Chip in BirthdaySection
  geschenkDays:14,             // Vorlauf-Tage für Geschenk-Chip
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
- `handleShiftAll` überspringt locked Slots und zieht `todo.time` verschobener Slots nach (wie startSlotDrag)

**Done-Semantik (Invariante seit 2026-07-07):** Ein Done-Toggle auf einem Slot mit `todoId`
setzt IMMER beide Flags synchron — `slot.done` UND `todo.done`/`doneAt` (Tagesplaner:
`useSlotMutations.handleToggleSlotDone`, Woche: `WocheView.handleToggleSlotDone`, Timer +
Missed-Review taten es schon). Grund: Missed-Review liest `slot.done`, DayPanel-Erledigt +
Garten-XP lesen `todo.done`/`doneAt` — einseitige Writes lassen die Ansichten divergieren.

---

## Storage Keys (storage/index.js)

```js
// Todos
SK.todos          → 'adhs_todos_list'
SK.routines       → 'adhs_todos_routines'
SK.todoOrder      → 'adhs_todos_order'
SK.cats           → 'adhs_todos_cats'    // LEGACY (nur Alt-Backup + Boot-Migration; kein Store-Slice mehr) — Todo-Gruppierung läuft über Projekte
SK.notes          → 'adhs_notes_v1'           // eigener Notiz-Store (in BACKUP_CATS.tools)
SK.noteDraft      → 'adhs_notes_draft'        // ephemer — +-Modal Erfassungs-Entwurf (Aufgabe+Notiz gemeinsam)
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
SK.poolSort       → 'adhs_view_pool_sort'        // 'standard'|'projekt'|'alter' ('kategorie' = Alt-Wert, wird beim Lesen zu 'projekt' migriert)
SK.autoParse      → 'adhs_view_auto_parse'       // Auto-Parser-Toggle im TodoModal (bool)
SK.calView        → 'adhs_view_cal_view'         // 'woche'|'monat'
SK.heuteModus     → 'adhs_view_heute_modus'      // 'raster'|'liste' — Default 'raster'; Alt-Werte 'voll'|'fokus' werden beim Store-Init gelesen und migriert
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

// Buddy (KI-Begleiter, src/features/buddy/ — Konzept: Dateien/output/ki-buddy-konzept.md)
SK.buddySettings     → 'adhs_buddy_settings'   // { enabled, name, userName, ton, calScopes:{privat,cals} } — calScopes = was der Buddy lesen darf (geteilte Kalender default AUS)
SK.buddyMemory       → 'adhs_buddy_memory'     // [{ id, text, createdAt }] — NUR vom Nutzer bestätigte Merk-Notizen, Cap 30

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

- **Ansichten:** Woche (Zeitgitter 07–22 Uhr) · Monat (Kacheln mit Chip-Balken)
- **Monats-Chip-Balken (Redesign 2026-07-12):** 15px hoch, getönter Grund (`color-mix(--bar-c 22%, var(--bg2))` — theme-sicher) + 2.5px-Farbkante + 0.62rem-Text fett; Balkentext via `firstWord()` aufs erste Wort gekürzt (Ellipsis-Reste lesen sich schlechter). Heute-Kachel = Violett-Tint + Border statt Glow. Balken kommen aus `days[dk]`-Slots (`getCellBars`) — eigene Termin-Todos ohne Slot erzeugen keinen Balken (Bestandsverhalten). **Ausnahme seit A9:** geteilte Termine ohne eigenen Slot kommen additiv dazu (s. „Geteilte Kalender im Lesepfad").
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
- **Wochenansicht Allday-Streifen:** zeigt Geburtstags-Balken + eigene Todos ohne Uhrzeit (`showTodos`) + geteilte Termine ohne Uhrzeit (Emoji-Kennung). Erscheint nur, wenn mindestens einer davon vorhanden ist.
- **Geteilte Kalender im Lesepfad (A9):** Kalender-Ansichten rendern eigene Einträge weiterhin aus `days`. Geteilte Termine anderer Mitglieder liegen NUR in `todos` (`cal != null`) und kommen **additiv** dazu — `getUnplacedCalItems()` (in `kalenderShared.js`) liefert sie pro Tag, entdoppelt gegen platzierte Slots über `todoId` und ohne erledigte. Der globale `calFilter` gilt überall: `isEntryShown(calFilter, calId)` — Eintrag ohne `cal` folgt dem Privat-Chip, mit `cal` dem Kalender-Chip. Kennung ist das Kalender-Emoji (`calEmoji()`, Default `👥`): am Wochen-Block als Ecke oben rechts, am Monatsbalken/DayPanel-Eintrag vor dem Text. **Kein optischer Unterschied zwischen eigenen und geteilten Terminen** (Jonas 2026-07-19: „es soll kein Unterschied gemacht werden") — das Emoji ist die einzige Kennung, wer den Eintrag angelegt hat steht nirgends (dafür ist die Aktivitäts-Sammlung da). Termine ohne eigenen Slot sind derzeit nur nicht ziehbar (`.weekSlotNoDrag`). **Kollision** (geteilter Termin überlappt einen eigenen Slot, `rangeBlocked`): eingerückt + rote Kante (`.weekSlotClash`), damit Parallelplanung sichtbar bleibt statt sich zu verdecken. Geteilte Termine folgen allein den Kalender-Chips, nicht dem Termine/Todos/Tools-Toggle-Strip.
- **`reconcileDaySlots(days, todos)`** (kalenderShared.js, aufgerufen zentral in `App.jsx` bei jeder `todos`-Änderung, unabhängig vom offenen Tab): materialisiert freie geteilte Termine automatisch als echten `days`-Slot — ab da normal zieh-/abhak-/editierbar, ohne dass Woche/DayPanel Sonder-Interaktionscode brauchen (bestätigt Jonas 2026-07-19: „beide müssen bearbeiten können"). Kollidiert der Zielslot, bleibt der Termin im additiven Lesepfad (rote Kante). Räumt außerdem jeden Slot weg, dessen `todoId` keinen Todo mehr hat (Termin von anderswo gelöscht/Kalender verlassen — gilt generell, nicht nur für geteilte, da ein Slot ohne zugehörigen Todo so oder so ein Ghost ist). `days` bleibt dabei rein lokal (kein Sync-Feld) — reine Client-Reaktion auf `todos`.
- **`sharedEditBadge(todo, calList, calCreds)`**: „✏️ Paula · vor 4 Min" an Wochen-Block/DayPanel-Zeile, wenn ein geteilter Termin frisch (<60 Min) von jemand ANDEREM geändert wurde — rein informativ, blockiert nichts (Variante B aus dem A9-Mockup, Jonas hat gegen echte Bearbeiten-Sperre entschieden: der Sync läuft über calTick Pull/Push, kein Live-Kanal für „X ist gerade drin"). Nutzt die schon vorhandenen `updatedAt`/`by`-Felder (`stampCal`, `src/features/cal/calStamp.js`) — kein neues Datenfeld nötig.
- **Tagesplaner-Raster kennt Emoji + calFilter (A9, Nachtrag):** `Zeitplan.jsx`/`Tagesliste.jsx` lösen pro Slot `todo.cal` auf und behandeln geteilte Termine wie Woche/Monat/DayPanel — Kennung ist das Kalender-Emoji (`calEmoji()`, Ecke oben rechts am `SlotBlock`-Wrapper bzw. am Chip in der Liste, nicht in `TodoChip` selbst). Ein ausgeblendeter Kalender-Chip (`isCalShown()`) blendet den Inhalt aus (`.sgHidden` im Raster, `HiddenSlotRow` in der Liste — Zeile bleibt reserviert, Label „ausgeblendet"). Bewusst NUR der Kalender-Chip, nicht der Privat-Chip: der Tagesplaner ist die Ausführungs-Ansicht, eigene Todos sollen nicht durch den Deko-Filter der Kalenderübersicht verschwinden. Kollision/Band-Mathematik (`bandLogic.js`, `consumedKeys`/`computePauseRuns` in Zeitplan.jsx, Rang/Lücken in `tagesListeLogic.js`) bleibt unangetastet auf den rohen `slots` — Ausblenden ist reine Anzeige, keine Verfügbarkeits-Änderung (ein ausgeblendeter Slot bleibt für Drag/Drop `'occupied'`, kein Doppelbuchungs-Risiko). Unplatzierte/kollidierende geteilte Termine (additiver Lesepfad wie in Woche/DayPanel) zeigt der Tagesplaner weiterhin nicht — dafür gibt es `SharedDayStrip` oberhalb des Rasters, das war nicht Teil der Lücke.
- **Assign-Picker + 🕶-Geheim-Flag (A9):** In der TodoModal (Details-Bereich, `s.catChip`-Chips wie Projekt, aktiv `s.calChipActive`) weist man einen Eintrag genau **einem** Kalender zu — `🔒 Privat` (Default, `cal:null`) oder ein geteilter Kalender (Emoji+Name aus `calList`), Einzelwahl. Die Zeile rendert nur, wenn es Kalender gibt. Bei **bestehenden** Einträgen läuft der Wechsel über `moveToCal()` (calStore) — Tombstone im alten Kalender + `projectId`-Abgleich, nie das `cal`-Feld naiv setzen. **Neue** Einträge kriegen `cal`/`secret` direkt via `createBlock` (beide sparse). Sobald ein geteilter Kalender gewählt ist, erscheint der `🕶`-Schalter → Feld `secret:true` am Block: der Eintrag wird **gesichert** (Cloud-Backup + JSON-Export nehmen `SK.todos` roh), reist aber **NIE an die Mitglieder**. Umsetzung als G6-Verwandter in `syncEngine.js`: `calPushSlice()` filtert `secret` **nur** aus dem `c:<calId>`-Push; `localCalSlice` bleibt volle Merge-Basis → die Merge-Engine (G5 „ohne Tombstone verschwindet nie etwas") hält den Geheim-Eintrag beim Pull ohne Sonderpfad — kein Re-Attach nötig. `secret` hat `cal!=null` → der persönliche Sync (`privateOnly`) schließt ihn ohnehin aus: **gerätelokal für Live-Sync, via Backup wiederherstellbar.** Guard-Tests in `calEngine.test.js` (secret nie im Push · überlebt Pull). Nachträgliches 🕶 auf einen schon geteilten Eintrag holt ihn NICHT aktiv zurück (Jonas 2026-07-21: die anderen behalten ihre Kopie).
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

Zusätzlich prüft die **Tab-Leiste**: Tap auf den *bereits aktiven* Reiter ruft den Interceptor auf (statt `setCurrentTab` mit gleichem Wert, was nichts täte). Damit schließt z.B. ein Tap auf „Tagesplaner" die offene `ProjekteView`, ein Tap auf „Einstellungen" die offene Hilfe — gleicher Effekt wie Swipe-/Browser-Back.

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
- **CockpitBar (`TabHeute/CockpitBar.jsx`, Redesign 2026-07-12):** Statuskarte zwischen DayNav und Zeitplan (im Swipe-Container, wandert mit dem Tag): Uhr (`--font-num`, 60s-Tick) · heute „Jetzt läuft: X · noch Y min" / „Nächster Slot: X · HH:MM · in Y" / „Alles erledigt", an fremden Tagen „N Slots · X h verplant" · Bilanz done/total (im Listenmodus zählt sie Slots **plus** zeitlose Tages-Todos — sonst zeigt sie einen Tag, den man gerade nicht sieht). Unten angedockt die Zeitplan-Funktionen: ↑30m/↓30m (ShiftAll, **nur im Rastermodus**) · +Fenster (Blocker, in beiden Modi) · Segmented Raster|Liste (ersetzt den alten Fokus-Knopf, **ohne** die frühere `total > 0`-Sperre — der leere Tag ist gerade der Grund für den Listenmodus) — die alte Controls-Zeile in Zeitplan.jsx ist damit weg (Props onShiftAll/onCreateBlocker/onModus wohnen jetzt an der CockpitBar). Karte trägt dezenten Primary-Außenglow (wie Pool-Container).
- **viewDate:** Lokaler State (`useState(() => store.dayplanDate ?? todayKey())`). Mount-Effect liest `store.dayplanDate`, setzt viewDate, löscht es. Tab verlassen → unmount → automatisch Reset auf heute beim nächsten Mount.
- **store.dayplanDate:** Flüchtiger Intent-Wert (kein localStorage). DayPanel setzt ihn vor `setCurrentTab(0)`, TabHeute konsumiert ihn einmalig beim Mount.
- **Pool + Drag & Drop:** Immer sichtbar, funktioniert auf allen Tagen — Slots schreiben auf `viewDate`. Pool-Container ist als Drop-Zone registriert (`registerHalf('pool', el, 'empty')`): Zeitplan-Slot in den Pool ziehen löscht den Slot, das Todo bleibt im Pool.
- **Drag blockiert Page-Swipe (2026-07-01):** `useDragDrop` liefert `draggingRef` (true während `startDrag`…`pointerup`). TabHeute's `usePageSwipe`-`disabled` ist dafür eine **Funktion** (nicht mehr ein am Render eingefrorener Boolean) und prüft `draggingRef.current` live — sonst bliebe der Ref-Wert vom letzten Render hängen. Gleiches Muster wie `weekDraggingRef` in TabKalender/WocheView.
- **Löschen ausschließlich über TodoModal / Drag-in-Pool (2026-07-01):** Swipe-to-delete im TodoChip (translate + `.deleteReveal`) + der Zeitplan-`RemoveDialog` ("Zurück in Pool"/"Löschen") sind entfernt — die Geste kollidierte mit dem Drag-Handle (löste beim Wischen sofort ein Drag statt Löschen aus) und wackelte bei jedem Scroll mit. Ersatz: Doppeltipp → TodoModal → „Löschen" (2-Schritt-Bestätigung, entfernt Todo + räumt referenzierende Slots auf) für alles mit `onEdit`; Ziehen-in-Pool bleibt der Weg für „Slot loswerden ohne Todo zu löschen" (funktioniert auch bei reinen Text-Slots ohne `todoId` — dann verschwindet der Slot komplett, da nichts „zurückzulegen" ist). `onRemove`/„✕"-Button existiert nur noch für fakeTodo-Chips ohne `onEdit` (Reminder/Haushalt/Geburtstage-Widgets). Zusätzlicher Weg seit dem Listenmodus: das Aufklapp-Panel des Chips trägt einen Zurück-in-Pool-Knopf (Zeile `[+] [Feld] [Pause] [Pool]`, Prop `onToPool` am `TodoChip`) — im Zeitplan und in der Tagesliste gesetzt, im Pool selbst nicht (dort sinnlos, weil der Chip schon da ist).
- **Endzeit-Projektion (Pool):** dezente Zeile unter dem Pool-Header — Summe der Dauern offener Todos + „fertig ~HH:MM" (wenn jetzt gestartet) + „+N ohne Dauer". Tickt minütlich, erscheint nur wenn mind. ein offenes Todo eine Dauer hat.
- **Pool-Sortierung „Projekt" (`poolLogic.js` → `sortTodos(list, sort, projects)`):** gruppiert nach Projekt-Name (`localeCompare`, dann `priority`). Todos ohne `projectId` sowie mit dangling `projectId` (Projekt existiert nicht mehr) bilden gemeinsam die letzte Gruppe „Ohne Projekt" (Sentinel `'￿'`). Farbige Gruppen-Header (`Pool.module.css` → `.groupHead`/`.groupDot`, Farbe per Inline-Style aus `project.color`) zeigen Name + Anzahl der **sichtbaren** Todos der Gruppe. Alt-Wert `'kategorie'` aus `SK.poolSort` (vor der Projekte-Migration) verhält sich identisch und wird beim Laden auf `'projekt'` migriert. **Projekte-Button** im Pool-Header (Ordner-Icon + Anzahl nicht versteckter Projekte) ruft `onOpenProjekte` auf — TabHeute öffnet darüber die `ProjekteView` als Vollbild-Subview (siehe Abschnitt „Projekte (Kernfunktion)").
- **Eingebettete Sektionen:** `<ReminderSection />` und `<HaushaltSection />` erscheinen unter dem Pool wenn aktiv. Beide nutzen das **fakeTodo-Pattern**: Items werden als `fakeTodo`-Objekte in `<TodoChip>` gerendert (disableExpand, 6-Punkte-Drag-Handle, Auswahl-Checkbox, Masse-Add-Button). Todo-Erstellung passiert erst **beim Drop** (atomar mit dem Slot) — kein Flackern im Pool. TabHeute liefert `startHaushaltDrag` / `startReminderDrag` via `onStartDrag`-Prop. Siehe `kontext/tool-pattern.md` für das vollständige Muster.
- **Blocker:** `BlockerModal` + `RepeatDeleteSheet` — Blocker im Zeitplan erstellen/bearbeiten/löschen. Löschen wiederkehrender Blocker: "Nur diese" (exception) oder "Diese und alle zukünftigen" (endDate).
- **Play am Slot:** ▶-Button an nicht-erledigten Slots (TodoChip `onPlay`-Prop) → `setTimerAutoStart({todoId,text,color,duration,date,slotKey})` + Tab-Wechsel zum Fokus-Timer. Timer startet sofort, „✓ Fertig"-Button beendet vorzeitig; Abschluss-Dialog zeigt **geplant X min · gebraucht Y min** und hakt Todo **und** Slot ab.
- **Pausieren/Fortsetzen im Tagesplaner (2026-07-12):** SlotBlock reicht `pausable={!!todo}` an TodoChip — Pause funktioniert im Plan **wie im Pool, aber nur für echte Todos** (mit `todoId`); Text-Slots ohne Todo bekommen keinen Pausen-Button, weil ihr `saveItem` nur `subItems` persistiert (Pause = Todo-Zustand, kein Slot-Feld). Pausieren via Aufklapp-Panel (Feldtext = Grund), Fortsetzen über den ▶-Button, der bei `paused` den Aufklapp-Chevron ersetzt (`resumeTodo` → `todo.paused=false`). Ein pausiertes Todo im Jetzt-Fenster zählt bewusst **nicht** als „läuft" (kein `chipNow`/Countdown, `isActive` prüft `!displayTodo.paused`); solange pausiert ist zusätzlich der Fokus-Timer-▶ ausgeblendet (kein doppeltes Play-Dreieck).
- **Slot-Tap-Modal (`SlotSheet.jsx`):** Tap auf leeren Slot (leere Halften hatten keine Tap-Funktion) → zentriertes Modal: „+ Neues Todo/Termin" (öffnet TodoModal mit `prefill={date,time}` des Slots) + Pool-Todos zum Tap-Platzieren (gleicher Schreibpfad wie Drag: Slot + todo.date/time). Überlange Todos, deren Folge-Slots belegt sind, sind ausgegraut („passt nicht") — gleiche Regel wie `canDrop`. Drag&Drop bleibt unverändert.
- **Zeitplan-Raster (`Zeitplan.jsx`, Redesign 2026-07-12 „Dauer = Höhe"):** `grid-auto-rows: minmax(34px, auto)` (BlockerCard-Grid gleicher Maßstab) — **leere Zeilen kompakt 34px, belegte wachsen auf den Einheits-Chip**: SlotBlock gibt dem Chip die Höhe explizit aus der Dauer (`spanSlots*48 − 4` → 30 min = 44px, 90 min = 140px) und treibt damit die überspannten Zeilen auf 48px. **Der TodoChip ist überall exakt gleich hoch** (`.chip { height: 44px }` — Pool, 30-min-Slot, Tool-Sections); Dauer > 30 min macht ihn nur im Planer höher (proportional) — im Pool steht die Dauer nur als Text. SlotBlock reicht `timeSpan` an TodoChip („HH:MM–HH:MM · Xm" in der Meta-Zeile; 30-min-Blöcke inline nur „Xm"; laufender Slot „bis HH:MM · noch X min" + `active`-Kontur). **Pausen**: zusammenhängende leere Halbstunden ZWISCHEN belegten Slots einer normal-Section bekommen ein stilles Overlay („Pause · X" bzw. „30 min", ab 60 min mit tappbarem + → SlotSheet) — `pointer-events: none`, die Zellen darunter bleiben einzeln tapp-/dropbar; Lücken über Blocker-Grenzen zählen bewusst nicht. **Vergangenheit** (nur heute): leere Zellen + Stundenlabels gedimmt, offene vergangene Slots bewusst NICHT (Missed-Kandidaten). Jetzt-Linie minutengenau (ohne Zeit-Badge — Uhrzeit steht in der CockpitBar). Leere Randzeiten außerhalb des Kernfensters (`visStart`/`visEnd`) bleiben droppbare „frei"-Bänder (`bandLogic.js` → `computeBands()`) — Tap aufs Band erweitert das Fenster, Drop aufs Band platziert + erweitert. Geburtstage erscheinen als All-day-Streifen ganz oben im Zeitplan. Kein Stauchen beim Draggen (`body.dnd-active`-Squish bleibt entfernt).
- **Listenmodus (`heuteModus === 'liste'`, 2026-07-17):** tauscht **nur** den Zeitplan gegen `Tagesliste/Tagesliste.jsx` — DayNav, CockpitBar, Pool, Dashboards und alle Modals bleiben. Einträge = Slots + Todos mit `date === viewDate && !time && !done`, sortiert über `rankOf` (Slot → `parseFloat(slotKey)`, Blocker → `startHour`, Todo → `dayRank ?? 24`; Gleichstand: Anker vor Todo, dann `createdAt`). Blocker rendern als Bänder, Zuordnung über dieselbe Erst-Treffer-Regel wie das Raster. Drop-Ziele sind die Lücken zwischen den Zeilen (`registerHalf('gap|<scope>|<prev>|<next>', …)`); der `scope` hält die Keys eindeutig (zwei Fenster mit gleichen Stunden erzeugten sonst denselben Key und eine Lücke wäre still tot), Lücken **innerhalb** eines Bandes tragen dessen Kanten als Nachbarn, sonst landet ein Drop außerhalb des Bandes. Ziehen läuft über `startListDrag` (schreibt **nie** eine Uhrzeit); Termine sind Anker und tragen eine Anker-Glyphe statt eines Griffs. `handleSetSlot` nimmt nur noch echte Slot-Keys (`ALL_SLOT_KEYS`) — die Dashboard-Drags rufen es ungeprüft mit dem Drop-Key auf und hätten sonst `days['gap|…']` geschrieben. Der Pool bekommt `excludeDate={viewDate}`, damit Tages-Todos nicht doppelt stehen. **Im Raster bleibt alles wie gehabt** — zeitlose Tages-Todos erscheinen dort oben im Pool mit Datums-Label (`sortTodos` zieht fällig-heute nach vorn); **bewusst keine Ganztagsleiste**. Chips überall 44px, kein Dauer=Höhe (die Liste hat kein Raster, das eine Höhe deuten könnte). Spec: `docs/superpowers/specs/2026-07-17-tagesplaner-listenmodus-design.md`.
- **Motion/Elevation-Tokens (`styles/vars.css`):** app-weiter Standard — `--dur-fast/--dur/--dur-slow` + `--ease-out/--ease-in/--ease` für Animationen, `--elev-1`/`--elev-drag` für dezente Tiefe (Chip-Schatten, Drag-Lift), `toolEnter`-Keyframe für sanftes Tab-/Tool-Öffnen (`App.jsx`).

---

## TimeEvents — Logik

Check läuft beim Mount von TabHeute **und** bei jedem `visibilitychange`→`visible`
(`useTimeEvents`-Hook in `TabHeute/useTimeEvents.js`) — App-Resume aus dem Hintergrund
mountet TabHeute nicht neu, ohne den zweiten Trigger würde der Check dann nie wieder
laufen. Läuft nicht neu, solange das Modal schon offen ist (kein Reset der Auswahl
mitten in der Prüfung). Variante 2 hat Priorität — nie beide gleichzeitig aktiv.

**Variante 1 — selber Tag (abgelaufene Slots):**
- Trigger: `viewDate === today` UND Slots heute mit `endzeit ≤ jetzt` + `!done && !ignored && !reviewed`
- Aktionen (jeweils auf aktuelle Auswahl):
  - **Erledigt** → `slot.done = true, slot.reviewed = true`; Todo: `done=true, doneAt=now`
  - **Ignorieren** → `slot.ignored = true` *(kommt bei Variante 2 wieder)*
  - **In Pool** → Slot löschen; text-only: neues Todo via `createBlock`; todo-type: bleibt im Pool
  - **Verschoben-Bump (Stufe 2):** „Ignorieren" und „In Pool" zählen bei Items mit `todoId` zusätzlich `postponeCount` hoch (`bumpPostpone`, 1×/Tag) — Buddy-Signal, siehe Block-Modell oben

**Variante 2 — neuer Tag:**
- Trigger: `SK.lastPoolReturn !== todayKey()`
- Zeigt: alle Slots aus `days[dk < heute]` mit `!done && !reviewed` — **inkl. `ignored: true`**
- Aktionen identisch, aber **Ignorieren** → `slot.reviewed = true` *(endgültig weg)*
- Abschluss: `sv(SK.lastPoolReturn, today)`

**✕ Schließen:** bricht ohne State-Änderung ab (keine Items markiert, `lastPoolReturn`
unangetastet) — der nächste Trigger (Tab-Wechsel oder App-Resume) zeigt dieselben
(oder inzwischen neue) offenen Punkte erneut. Für „ich will gerade nur kurz was nachschauen".

**Item-Typen:** `type: 'text'` (Slot ohne todoId) · `type: 'todo'` (Slot mit todoId)
**Auto-close:** Modal schließt wenn Liste leer. Alle Items sind beim Öffnen vorausgewählt.
