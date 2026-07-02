# Pause-Mechanik — Design (2026-07-02)

## Ziel

Todos, die man angefangen hat, aber auf etwas warten muss, sollen aus dem präsenten
Vordergrund verschwinden — **ohne** verloren zu gehen. „Pausiert" = sichtbar abgetrennt,
mit optional sichtbarem Grund („woran hängt's"), jederzeit fortsetzbar.

**ADHS-Nutzen:** weniger Rauschen im Pool + kein Grübeln beim Wiederauftauchen (der Grund
steht am Chip).

## Leitentscheidungen (Brainstorm 2026-07-02)

1. **Minimaler additiver Eingriff**, kein neues Subsystem. Die bestehende Subtodo-Logik
   bleibt unberührt — Pause ist ein Layer obendrauf (Jonas' „Idee C").
2. **Datenmodell:** zwei additive Felder am Block, sync-sicher (alte Todos = falsy, keine
   Migration): `paused: false`, `pauseReason: null`.
3. **Trigger im aufgeklappten Chip:** Die Add-Row (`itemAddRow`) wird zu `[⏸] [Eingabefeld] [+]`.
   Ein Feld, zwei Aktionen: Text + „+" → Subtodo (bestehend); Text + „⏸" → pausiert mit Text
   als Grund; leeres Feld + „⏸" → pausiert ohne Grund.
4. **Fortsetzen über den Aufklapp-Pfeil:** Bei `paused` wird der linke Chevron-Button
   (`expandBtn`) zum ▶-Button — ein Klick setzt fort. Nicht pausiert bleibt er der Auf-/Zuklapp-Pfeil.
5. **Grund-Anzeige kompakt:** pausierte Chips zeigen den Grund als **eine** dezente Marker-Zeile
   oben („⏸ {Grund}"), nicht als aufgeklapptes Subtodo (Übersichtlichkeit). Ohne Grund: nur
   Dimmung + ⏸-Symbol.
6. **Pool-Ende:** pausierte Todos rutschen ans Ende der Pool-Liste, **unabhängig** vom aktiven
   Sort (`poolSort`), und werden gedimmt.
7. **Fähigkeit in `TodoChip`, per Prop gesteuert:** Pause lebt in der geteilten Chip-Komponente,
   Prop `pausable` (default false). Nur der **Pool** setzt `pausable` für echte Todos. Zeitplan-
   Slots (`SlotBlock`) und Tool-Dashboard-fakeTodos (Reminder/Haushalt/Geburtstage) setzen es
   nicht → kein Pause-Button dort. Muster wie `onKlaeren`/`onPlay`.
8. **Onboarding:** Die Pause-Mechanik wird im Onboarding-Kür-Teil erklärt (eigener Schritt,
   `data-onboarding`-Anker am ⏸-Button) — siehe [[project-adhs-app]] Onboarding-Plan Teil D.

## Verhalten im Detail

**Pausieren** (nur wenn `pausable` und Todo nicht `done`):
- Aufklappen → in der Add-Row „⏸" tippen.
- `updateTodo({ ...todo, paused: true, pauseReason: itemInput.trim() || null })`, dann
  `itemInput` leeren und Chip einklappen.

**Fortsetzen:**
- `expandBtn` zeigt bei `paused` ein ▶-Icon; Klick → `updateTodo({ ...todo, paused: false, pauseReason: null })`.
- Grund wird beim Fortsetzen gelöscht (gehört zur Pause).

**Anzeige (paused):**
- Chip-Klasse `chipPaused` (Dimmung, wie `chipDone` gedimmt aber eigener Look).
- Marker-Zeile oben im Body (über dem Titel), nur wenn `pauseReason`: „⏸ {pauseReason}".
- Sub-items nicht sichtbar (Chevron ist Fortsetzen-Button) — Grund via Marker sichtbar.

**Pool-Sortierung** (`Pool.jsx`):
- Nach der bestehenden `poolSort`-Sortierung ein stabiler Zweit-Sort: `paused`-Todos ans Ende
  (offene zuerst, pausierte danach). `done`-Verhalten unverändert.

**Geltungsbereich (`pausable`):**
- `Pool.jsx` → `<TodoChip pausable ... />` für echte Todos.
- `SlotBlock.jsx`, `ReminderSection`/`HaushaltSection`/`BirthdaySection` (fakeTodos) → kein `pausable`.

## Architektur / Dateien

**Geändert:**
- `src/features/todos/Block.js` — `paused: false`, `pauseReason: null` in `createBlock()` Defaults.
- `src/components/TodoChip/TodoChip.jsx` — Prop `pausable`; ⏸-Button in Add-Row; Chevron→▶ bei
  `paused`; Marker-Zeile; `chipPaused`-Klasse. Mutation via bestehendes `updateTodo`.
- `src/components/TodoChip/TodoChip.module.css` — `.chipPaused`, `.pauseMarker`, `.pauseBtn`,
  ▶-State des `expandBtn`. Farben nur über vars.css.
- `src/features/calendar/Pool/Pool.jsx` — pausierte ans Listen-Ende (Zweit-Sort).

**Kein neuer Storage-Key** — `paused`/`pauseReason` reisen im bestehenden `SK.todos`
(schon in `BACKUP_CATS.kalender`). Keine BACKUP_CATS-Änderung, kein neuer Guard nötig.

## Tests

- **`Block.test.js`** (falls vorhanden, sonst neu): `createBlock()` liefert `paused === false`,
  `pauseReason === null`.
- **Pool-Sort pur** (falls testbare Sort-Funktion extrahierbar): pausierte landen hinter offenen.
  Wenn Sort inline in Pool.jsx, stattdessen Preview-Verifikation.
- **Preview-Verifikation:** Pool-Todo aufklappen → mit/ohne Grund pausieren → rutscht ans Ende,
  gedimmt, Marker sichtbar → Chevron ▶ → fortsetzen → zurück an alter Stelle. Zeitplan-Slot +
  Haushalt-Dashboard: **kein** ⏸-Button.

## Bewusst weggelassen

- Pause für verplante/Termin-Todos (Zwitterzustand „pausiert + fester Slot" → unnötige Regeln).
- Eigene „Pausiert"-Schublade/Sektion im Pool (ans-Ende + Dimmung reicht, weniger UI).
- Pause-Historie / Dauer-Tracking / Erinnerung „schon lange pausiert" (nachrüstbar, YAGNI).
- Grund bearbeiten ohne Fortsetzen (erst fortsetzen, neu pausieren — hält die Mechanik simpel).
