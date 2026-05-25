# Design: Erledigt-Umstrukturierung & Zeitbasierte Ereignisse

**Datum:** 2026-05-25  
**Scope:** Feature 1 + Feature 2 — zwei unabhängige, sequenziell umsetzbare Bereiche

---

## Feature 1 — "Heute erledigt" Umstrukturierung

### Ziel

Die "Erledigt heute"-Anzeige verlässt den Pool (Tagesplaner) und lebt ausschließlich im Kalender-DayPanel. Der Pool bekommt nur noch einen minimalen Link dorthin.

### Pool (Tagesplaner)

**Was wegfällt:**
- `DoneChip`-Komponente
- "✓ Erledigt heute"-Sektion (`doneSection` + `doneToday`-Berechnung)

**Was bleibt (unverändert):**
- Abgehakte Todos bleiben über `pendingDoneIds` unten im Pool sichtbar (durchgestrichen), direkt uncheckbar
- "Aufräumen"-Button committed sie (`done=true`, `doneAt=now`) → sie verschwinden aus dem Pool und erscheinen im Kalender-DayPanel

**Neu:**
- Ganz unten im Pool: minimaler Text-Link in echter TodoChip-Optik — nur sichtbar wenn heute bereits Todos erledigt wurden
- Klick → navigiert zu Tab 1 (Kalender) und setzt `dayplanDate` auf heute, sodass das DayPanel für heute aufklappt
- Text: `Erledigte → Kalender` (o.ä., finale Formulierung beim Umsetzen)

### DayPanel (Kalender, Monatsansicht)

**Was bleibt:**
- "Erledigt"-Sektion zeigt `todos.filter(t => t.doneAt?.startsWith(dateKey))` — unverändert
- Doppelklick auf Zeitplan-Einträge navigiert zum Tagesplaner — unverändert

**Neu:**
- Einzelklick auf ein erledigtes Todo → Restore-Modal
- Modal: Item-Name + "Wiederherstellen?" + **Ja** / **Nein**
- Kein Erklärungs-Text — selbsterklärend
- Ja → `done=false`, `doneAt=null`, `date=null`, `time=null` (immer alles clearen — Termin wird als datumsloses Todo wiederhergestellt)
- Nein → Modal schließt

### Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/features/calendar/Pool/Pool.jsx` | `DoneChip` + `doneSection` entfernen; Kalender-Link hinzufügen; `setCurrentTab` + `setDayplanDate` über Callback-Prop von TabHeute |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Callback `onDoneCalendar` an Pool übergeben |
| `src/features/calendar/TabKalender/TabKalender.jsx` | `setTodos` aus Store; Restore-Modal-State in DayPanel; Klick-Handler auf doneTodos |

---

## Feature 2 — Zeitbasierte Ereignisse im Tagesplaner

### Ziel

Abgelaufene Slot-Ereignisse werden nicht mehr in Echtzeit per ClockPopup (einzeln) gemeldet, sondern beim nächsten Öffnen des Tagesplaners als Batch-Modal. Zwei Varianten mit identischer UI, unterschiedlichem Auslöser und leicht unterschiedlicher Semantik.

### Was wegfällt

- `ClockPopup.jsx` — wird gelöscht
- Gesamte ClockPopup-Logik in `TabHeute.jsx` (`promptedRef`, `snoozeRef`, `tickRef`, Clock-Interval, `handleClockDone/Snooze/Shift`)
- `awaitingClockResponse` auf Todos wird nicht mehr gesetzt (Feld kann in Altdaten vorhanden sein — wird ignoriert)
- Globaler "In Pool verschieben"-Button im MissedReviewModal → ersetzt durch Pro-Auswahl-Aktion
- Bestehende `handleMoveToPool`-Globallogik in `useMissedReview.js`

### Neues Slot-Feld

```js
ignored: false  // true = in Variante 1 bewusst ignoriert; taucht in Variante 2 wieder auf
```

**Slot-Zustandsmatrix:**

| `done` | `ignored` | `reviewed` | Erscheint in |
|--------|-----------|------------|-------------|
| false  | false     | false      | Variante 1 + 2 |
| false  | true      | false      | nur Variante 2 |
| true   | —         | —          | nirgends |
| —      | —         | true       | nirgends |

`done: true` ist in beiden Varianten **explizit ausgeschlossen** — bereits abgehakte Todos erscheinen nie im Modal.

### Variante 1 — Beim Öffnen des Tagesplaners (selber Tag)

**Trigger:** Mount von TabHeute, `viewDate === todayKey()`, und es gibt Slots für heute mit:
```
!slot.done && !slot.ignored && !slot.reviewed && endzeit ≤ jetzt
```
(endzeit = `parseFloat(slotKey) * 60 + (slot.duration || 30)` ≤ `nowMins`)

**Verhalten:**
- Modal öffnet mit allen qualifizierten Slots — alle vorausgewählt
- User wählt Subset → führt Aktion aus → wiederholt für nächsten Subset → Modal schließt wenn Liste leer

**Aktionen (wirken auf aktuelle Auswahl):**
- **Erledigt** → `slot.done = true`, `slot.reviewed = true`; Todo (falls todoId): `done=true`, `doneAt=now`
- **Ignorieren** → `slot.ignored = true` *(kommt bei Variante 2 wieder)*
- **Zurück in Pool** → Slot entfernen; text-only: neues Todo via `createBlock`; todo-type: Todo bleibt im Pool (wird nicht gelöscht)

### Variante 2 — Erster Start eines neuen Tages

**Trigger:** Mount von TabHeute + `lv(SK.lastPoolReturn) !== todayKey()`

**Zeigt:** ALLE Slots aus `days[dk < heute]` mit `!slot.done && !slot.reviewed` — **inklusive `ignored: true`** (diese kommen hier nochmal dran)

**Aktionen identisch zu Variante 1**, mit einem Unterschied:
- **Ignorieren** hier → `slot.ignored = false`, `slot.reviewed = true` *(endgültig dismissed)*

Nach vollständigem Abschluss: `sv(SK.lastPoolReturn, todayKey())`

### Reihenfolge beim Mount

Variante 2 hat Priorität. Beim Mount wird geprüft:
1. `SK.lastPoolReturn !== heute` → Variante 2 öffnen
2. Sonst: Heute abgelaufene, nicht-ignorierte Slots vorhanden → Variante 1 öffnen
3. Sonst: nichts

Nie beide gleichzeitig aktiv.

### Modal-UI (beide Varianten — gleiche Komponente)

- Header-Titel unterscheidet sich: Variante 1 "Abgelaufene Ereignisse", Variante 2 "Offene Ereignisse — gestern"
- Liste: alle Items mit Farbbalken, Text, Zeitstempel
- Alle Items standardmäßig angewählt
- "Alle" / "Keine" Toggle-Zeile
- Aktions-Buttons: **Erledigt** · **Ignorieren** · **Zurück in Pool** — alle wirken nur auf aktuelle Auswahl
- Buttons deaktiviert wenn Auswahl leer
- Modal schließt automatisch wenn keine Items mehr übrig

### Zur Auto-Sortier-Logik (Frage 3)

**Nicht mehr nötig.** Die zwei Modals erzwingen explizite Entscheidungen. Es gibt keinen stillen Müll:
- Ignorierte Items tauchen in Variante 2 wieder auf
- In-Pool-verschobene Items sind weg aus dem Zeitplan
- Abgehakte Items bleiben als `done` im Zeitplan und sind im Kalender sichtbar

### Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/features/calendar/Zeitplan/ClockPopup.jsx` | Löschen |
| `src/features/calendar/TabHeute/useMissedReview.js` | Komplett umschreiben → `useTimeEvents.js` (Variante 1 + 2 Logik) |
| `src/features/calendar/Zeitplan/MissedReviewModal.jsx` | Überarbeiten: Pro-Auswahl "Zurück in Pool", Variante-Header, Ignorieren-Semantik-Unterschied |
| `src/features/calendar/TabHeute/TabHeute.jsx` | ClockPopup-Logik entfernen, `useTimeEvents` einbinden |
| `src/features/calendar/Pool/Pool.jsx` | `awaitingClockResponse`-Filter aus `activePool` entfernen |
| `kontext/kern.md` | Slot-Format: `ignored`-Feld dokumentieren, `awaitingClockResponse` als deprecated markieren |
