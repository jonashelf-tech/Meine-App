# Tagesplaner — Listenmodus (ersetzt den Fokusmodus) — Design

**Datum:** 2026-07-17
**Status:** Entwurf, vor Implementierung
**Typ:** Umbau eines bestehenden Modus + ein neues Feld am Block

## Problem

Der Fokusmodus (`heuteModus === 'fokus'`) fällt aus der App heraus:

- Er baut eigene Zeilen und Karten (`FokusView.module.css` → `.frow` / `.card`) statt des
  `TodoChip`, den Pool, Zeitplan und Tool-Sektionen benutzen. Andere Höhe, andere Sprache,
  andere Interaktion.
- Er ersetzt den ganzen Tab: kein Pool, keine Dashboards, kein Drag & Drop, nichts
  hinzufügbar. Man kann darin nur abhaken.
- Er ist auf leeren Tagen nicht erreichbar (`total > 0`-Sperre an der CockpitBar) —
  ausgerechnet an dem Tag, an dem man ohne Uhrzeiten planen wollen würde.

Dahinter liegt ein echtes Bedürfnis, das die App bisher gar nicht bedient: **einen Tag
planen, ohne jedem Todo eine feste Uhrzeit zu geben.** Heute kennt der Tagesplaner nur
zwei Zustände — „im Pool" (kein Tag) oder „im Slot" (Tag + Uhrzeit). Dazwischen ist
nichts. Uhrzeiten zu vergeben stresst aber manchmal, und dann bleibt der Tag leer.

## Ziel

Der Fokusmodus wird zum **Listenmodus**: derselbe Tag, dieselben Chips, dasselbe Drumherum
— nur ohne Stundenraster. Termine behalten ihre Uhrzeit und werden zu Ankern; Todos lassen
sich frei dazwischen einsortieren, ohne eine Uhrzeit zu bekommen. Pool und Dashboards
bleiben sichtbar, weil man aus ihnen heraus plant.

Das Raster bleibt dabei **unangetastet**.

---

## Entschiedene Fragen (2026-07-17, mit Jonas)

| Frage | Entscheidung |
|---|---|
| Top-3-Einfrieren + „Tag geschafft"-Vollbild | **Fallen ersatzlos weg.** Kehrt `2026-05-31-fokus-kernschleife-design.md` um (dort ADHS-begründet: „Abschlussgefühl wichtiger als Momentum"). Bewusst: mit sichtbarem Pool ist „alles erledigt" keine erreichbare Aussage mehr, und die Reduktion auf 3 widerspricht dem Wunsch, im Listenmodus zu planen. |
| Tagesbezug der Liste | **Ja** — Todos gehören einem Tag, ohne Uhrzeit. |
| Todos zwischen Termine schieben | **Ja** (Variante B). |
| Ganztagsleiste im Raster | **Nein.** Nicht nötig: zeitlose Tages-Todos stehen im Raster oben im Pool mit Datums-Label — das macht `sortTodos` heute schon. |
| Termine/Blocker in der Liste umsortierbar | **Nein**, sie sind Anker. Eine Reihenfolge kann keine Uhrzeit erzeugen; Uhrzeit ändert man im Raster oder im TodoModal. |
| Blocker in der Liste | **Ja**, inkl. „+ Fenster" zum Anlegen. |
| ↑30m / ↓30m im Listenmodus | **Nein**, reine Raster-Verschieber. |
| Ort des „Zurück in Pool"-Knopfs | Aufklapp-Panel des Chips, Zeile wird `[+] [Feld] [Pause] [Pool]`. |

---

## Design

### 1. Struktur — ein Tausch, kein zweiter Screen

Heute ersetzt `heuteModus === 'fokus'` den kompletten Tab-Inhalt (`TabHeute.jsx:192`).
Stattdessen wird **eine Komponente im vorhandenen Swipe-Container getauscht**:

```
DayNav
└ swipeRef ─ CockpitBar
           └ heuteModus === 'liste' ? <Tagesliste/> : <Zeitplan/>
Pool
Dashboards (ReminderSection, HaushaltSection, …)
Modals (TodoModal, SlotSheet, BlockerModal, MissedReviewModal, …)
```

Alles außer der getauschten Komponente ist geteilt. „Pool + Dashboards sichtbar" und
„gleiche Chips" sind damit kein Feature, sondern Nebenprodukt der Struktur. Der Swipe-Split
bleibt wie heute: die Tagesansicht wischt, Pool und Dashboards stehen still — nur ist die
Liste jetzt zu Recht datumsabhängig.

### 2. Datenmodell — ein Feld, kein neuer Key

```js
// createBlock() in src/features/todos/Block.js
dayRank: null,   // number | null — Sortier-Rang auf der Tagesachse (Listenmodus)
```

**Bedeutung:** `dayRank` ordnet ein zeitloses Tages-Todo relativ zu den Ankern des Tages
ein. Er lebt auf derselben Achse wie die Slot-Keys (Dezimalstunde, `parseFloat('9.5')`),
damit Interleaving überhaupt vergleichbar ist — er ist aber **kein Zeitpunkt**:

- Er wird **nie angezeigt**, nie zu einer Uhrzeit formatiert.
- Er erzeugt **nie** einen Slot und **nie** einen Kalender-Eintrag.
- Er darf über 24 oder unter 0 liegen (etwas ganz unten/oben einfügen). Das ist zulässig
  und folgenlos, weil er nur sortiert.

Deshalb `dayRank` und nicht `dayPos`/`dayTime` — der Name muss die Verwechslung mit `time`
aktiv verhindern.

**Zustandsraum (unverändertes `date`/`time`, neu nur die dritte Zeile):**

| `date` | `time` | `dayRank` | Bedeutung |
|---|---|---|---|
| `null` | `null` | `null` | Pool-Todo (`isTodo`) |
| gesetzt | gesetzt | **immer `null`** | Termin (`isTermin`) → Slot im Raster |
| gesetzt | `null` | `null` | Tages-Todo ohne Position → ans Ende der Liste (`isFaelligkeit`) |
| gesetzt | `null` | Zahl | Tages-Todo an fester Stelle der Liste |

Die letzten beiden Zeilen sind **beide `isFaelligkeit`** — es entsteht also kein neuer
Todo-Typ. Ein Todo, das über das Datumsfeld im TodoModal einen Tag bekommt, landet
automatisch in Zeile 3 und damit unten in der Liste. Der Missed-Review sammelt es bei
Überfälligkeit schon heute ein (`useTimeEvents.js:57`) — nichts daran zu bauen.

**Warum ein Feld und kein Misch-Array pro Tag** (`['slot:10','todo:a','slot:14']`):

- Kein neuer Storage-Key. `dayRank` reist in `SK.todos` mit → Backup-Kategorie und
  Sync-Policy (`by-id`) greifen automatisch.
- Nichts kann verwaisen. Es gibt keine Termin-Anker, die ins Leere zeigen; ein gelöschter
  Termin lässt die übrigen Ränge unberührt.
- Sync-tauglich. Ein Array wäre `lww` — zwei Geräte sortieren, eins verliert die ganze
  Tagesordnung. Ein Feld pro Todo merged pro Todo.

### 3. Die Tagesliste

**Einträge** für `viewDate`:

- **Slots** — `days[viewDate]` (Termine und ins Raster gezogene Todos)
- **Tages-Todos** — `todos.filter(t => t.date === viewDate && !t.time && !t.done)`
- **Blocker** — `getBlockersForDate(blockers, viewDate)`

**Rang und Sortierung** (rein, in `tagesListeLogic.js`):

```
rankOf(slot)    = parseFloat(slotKey)
rankOf(blocker) = blocker.startHour
rankOf(todo)    = todo.dayRank ?? 24        // ohne Rang → ans Tagesende
```

**Gleichstand** (ein Todo mit `dayRank = 10` und ein Slot um 10:00 haben denselben Rang):
Anker gewinnen — Slot vor Todo. Unter Todos entscheidet `createdAt`. Blocker konkurrieren
nie mit ihrem Inhalt, weil sie ihn enthalten statt neben ihm zu stehen.

**Chips:** überall der echte `TodoChip` auf festen 44 px. **Kein Dauer=Höhe** — die Liste
hat kein Raster, in dem eine Höhe eine Dauer bedeuten könnte; sie würde nur lügen. Termine
tragen ihr Uhrzeit-Label (`timeSpan`, wie `SlotBlock` es baut), Tages-Todos tragen keins.
Das ist die ganze Antwort auf „Optik der Chips soll gleich sein".

**Kein Sichtfenster.** `visStart`/`visEnd`, `computeBands()` und die „frei"-Bänder sind
Raster-Begriffe und kommen in der Liste nicht vor. Die Liste zeigt, was da ist.

### 4. Blocker in der Liste

Ein Blocker rendert als **Band**: Kopfzeile wie `BlockerCard` (Farbpunkt, Name,
`09:00–17:00`, Pille „offen"/„geblockt"), darunter die Einträge, deren Rang in
`[startHour, endHour)` fällt.

- **Zuordnung** über das vorhandene `getBlockerForHour(Math.floor(rank), blockersForDate)`
  → identische Überlappungsauflösung wie im Raster, keine zweite Regel.
- **Leeres Band rendert trotzdem** — es ist ein Drop-Ziel (wie die leeren Halbstunden im
  Raster).
- **Tagesübergreifende Blocker** brauchen nichts Neues: `getBlockersForDate` liefert bereits
  zwei normalisierte Objekte (`_overnight: 'start'|'end'`).
- **Kopfzeile:** Tap auf die Pille toggelt `locked`, Tap auf den Rest öffnet das
  `BlockerModal` — beides über die vorhandenen Handler aus `useBlockerActions`.

### 5. Drag & Drop

Wiederverwendung von `useDragDrop` — die **Lücken zwischen den Zeilen** werden als
Drop-Ziele registriert (`registerHalf(gapKey, el, zoneType)`). Damit funktionieren
Ghost, Page-Swipe-Sperre (`draggingRef`) und die Pool-Dropzone unverändert weiter.

| Geste | Wirkung |
|---|---|
| Pool → Lücke | `date = viewDate`, `time = null`, `dayRank = insertRank(prev, next)` |
| Liste → Lücke | nur `dayRank` neu |
| Liste → Pool | `date = null`, `time = null`, `dayRank = null` |
| Termin/Blocker ziehen | **nicht möglich** — Anker |

**`insertRank(prevRank, nextRank)`** (rein, getestet):

- beide → `(prev + next) / 2`
- nur `next` (ganz oben) → `next - 0.5`
- nur `prev` (ganz unten) → `prev + 0.5`
- keins (leere Liste) → `12`

**Innerhalb eines Bandes** liefert die Lücke nicht `null` als fehlenden Nachbarn, sondern
die **Bandkante**: `prev ?? blocker.startHour`, `next ?? blocker.endHour`. Sonst bekäme ein
Drop in ein leeres Fenster „Arbeit 09–17" den Rang `12` nur durch Zufall — und in ein leeres
Fenster „Abend 18–22" einen Rang, der außerhalb des eigenen Bandes liegt und den Eintrag
beim nächsten Rendern woanders einsortiert. Die Lücke kennt ihr Band; `insertRank` bleibt
rein und ahnungslos.

**Gesperrte Bänder:** Lücken innerhalb eines Blockers mit `locked: true` registrieren als
`'locked'` statt `'empty'` → `useDragDrop` blockt den Drop und zeigt den roten Glow. Exakt
das Verhalten, das `BlockerCard` über `zoneType` schon hat.

### 6. Umschalter und CockpitBar

`heuteModus: 'voll' | 'fokus'` → **`'raster' | 'liste'`**, mit Lese-Migration beim Store-Init
(`'voll'→'raster'`, `'fokus'→'liste'`). Vorbild: die `poolSort`-Migration `'kategorie'→'projekt'`
in `Pool.jsx:102`. Default bleibt `'raster'`.

Der Umschalter wird ein Segmented in der CockpitBar-Funktionszeile — **ohne die heutige
`total > 0`-Sperre** (`CockpitBar.jsx:117`). Der leere Tag ist der Grund für den Modus.

| Funktionszeile | Raster | Liste |
|---|---|---|
| ↑30m / ↓30m | ja | **nein** |
| + Fenster | ja | ja |
| Raster \| Liste | ja | ja |

Die Kopfzeile der CockpitBar (Uhr, „Jetzt läuft", Bilanz) bleibt in beiden Modi. Im
Listenmodus zählt die Bilanz `done/total` über **Slots + zeitlose Tages-Todos** — sonst
zeigt sie einen Tag, den man gerade nicht sieht.

### 7. „Zurück in Pool"

`TodoChip` bekommt eine optionale Prop `onToPool`. Die Zeile im Aufklapp-Panel
(`.itemAddRow`) wird umsortiert:

```
vorher:  [Pause] [Feld] [+]
nachher: [+] [Feld] [Pause] [Pool]
```

Aufrufer:

- **Slot-Chip** (Raster + Liste) → `handleRemoveSlot(slotKey, 'back')` — existiert bereits
  (`useSlotMutations.js:60`) und macht exakt das Richtige: Slot weg, `date`/`time` genullt.
  Ergänzt um `dayRank: null`.
- **Tages-Todo in der Liste** → `date = null`, `dayRank = null`.
- **Pool-Chip** → keine Prop, kein Knopf (ist ja schon da).

Damit wird eine Funktion erreichbar, die es längst gibt, aber bisher nur am
Ziehen-in-den-Pool hing.

### 8. Pool im Listenmodus

`getActiveTodos(todos, todaySlots)` bekommt einen optionalen dritten Parameter
`excludeDate`. Im Raster nicht übergeben → **Bestandsverhalten unverändert**. Im
Listenmodus `viewDate` → die zeitlosen Tages-Todos verschwinden aus dem Pool, weil sie
oben in der Liste stehen. Kein zweiter Filter, kein Modus-Zustand in der Logik — nur ein
Argument.

### 9. Was das Raster davon merkt: nichts

Ein Todo mit `date = heute, time = null` steht im Rastermodus **oben im Pool** (`sortTodos`
zieht fällig-heute nach vorn) mit Datums-Label am Chip. Genau wie heute. Kein
Ganztagsstreifen, keine neue Zone, keine Änderung an `Zeitplan.jsx`.

---

## Was stirbt

- `TabHeute/FokusView.jsx` + `FokusView.module.css`
- `fokusLogic.js` + `fokusLogic.test.js` — `getFixedEntries()` und `isDayComplete()`
  verwaisen durch diesen Change (Top-3-Freeze und Victory-Screen), also werden sie hier
  mit abgeräumt.

## Was neu entsteht

- `features/calendar/Tagesliste/Tagesliste.jsx` + `.module.css`
- `features/calendar/tagesListeLogic.js` — rein: `buildDayEntries()`, `rankOf()`,
  `insertRank()`
- `features/calendar/tagesListeLogic.test.js`
- `dayRankGuard.test.js` (Anti-Drift, Vorbild `projektGuard.test.js`)
- Eine Hilfe-Karte in `features/settings/Hilfe/` — Listenmodus ist Kern-Mechanik, damit
  laut CLAUDE.md im selben Change fällig.

## Guards

1. **`tagesListeLogic.test.js`** — Rang je Typ; Sortierung; Gleichstand Slot-vor-Todo und
   `createdAt` unter Todos; `insertRank` in allen vier Fällen; Drop in ein **leeres Band**
   landet innerhalb der Bandgrenzen (und bleibt beim nächsten Rendern dort);
   Band-Zuordnung inkl. Überlappung und tagesübergreifendem Blocker; `dayRank ?? 24`.
2. **`dayRankGuard.test.js`** — die grep-baren Regeln:
   - `createBlock()` setzt `dayRank: null`.
   - `dayRank` erscheint nur in einer Allowlist von Dateien — insbesondere nirgends in
     `TabKalender/*`, `Zeitplan/*`, `Pool/*`, `TodoChip/*`, `tools/*`. Der Rang ist ein
     Begriff des Listenmodus und darf sich nicht ausbreiten.

   **Kein Guard auf „`time` gesetzt ⇒ `dayRank === null`".** Beim Ausformulieren fiel auf,
   dass das keine Korrektheits-, sondern eine Hygiene-Regel ist: `buildDayEntries` nimmt
   ohnehin nur Todos mit `!t.time` auf, ein stehengebliebener Rang an einem Termin ist also
   wirkungslos. Statt jeden Schreiber zu überwachen, macht der **Leser** es unmöglich, dass
   es zählt. Die Schreiber nullen ihn trotzdem, wo sie das Todo sowieso anfassen — aber als
   Sauberkeit, nicht als Verlass.
3. `storage.test.js` braucht nichts — kein neuer `SK`-Key.

## Kontext-Dateien (gleicher Change)

- `kontext/kern.md` — `dayRank` am Block, Zustandstabelle, `heuteModus`-Werte,
  TabHeute-Features, `SK.heuteModus`-Kommentar
- `kontext/architektur.md` — Ordnerstruktur (`Tagesliste/` rein, `FokusView` raus)

## Erfolg erkennbar an

- Auf einem **leeren** Tag ist der Listenmodus erreichbar (Umschalter nicht gesperrt).
- Pool-Todo per Drag zwischen zwei Termine → steht dort, trägt **keine Uhrzeit**, ist aus
  dem Pool verschwunden.
- Wechsel auf Raster: dasselbe Todo steht **oben im Pool** mit Datums-Label, es ist **kein
  Slot** entstanden, die Kalender-Woche zeigt es im Ganztags-Streifen.
- Der Chip sieht in Liste, Pool und Raster identisch aus (44 px).
- Blocker „Arbeit 09–17" in der Liste: Todo hineinziehen landet im Band; Band auf
  „geblockt" → Drop wird rot geblockt.
- Aufklapp-Panel zeigt `[+] [Feld] [Pause] [Pool]`; der Pool-Knopf am Slot löst den Slot und
  legt das Todo zurück.
- `npm test` grün inklusive der beiden neuen Guards.

## Bewusst nicht gemacht

- **Keine Ganztagsleiste im Raster.** Wurde geprüft und verworfen — nicht nötig, weil der
  Pool fällig-heute schon nach oben sortiert.
- **Kein Misch-Order-Array pro Tag.** `dayRank` löst dasselbe ohne neuen Key, ohne
  Verwaisung, mit besserem Merge-Verhalten.
- **Kein Umsortieren von Terminen/Blockern in der Liste.**
- **Kein Ersatz für Top-3 und „Tag geschafft".** Bewusste Umkehr einer früheren
  Entscheidung, nicht ein Vergessen.

## Am Rand aufgefallen (nicht Teil dieses Changes)

- `PlacedIcon` in `Pool/Pool.jsx:20` rendert praktisch nie: `getActiveTodos` filtert
  verplante Todos bereits heraus, `isPlaced(t)` kann also nur für ein gerade abgehaktes
  Todo wahr werden. Tote Stelle — gemeldet, nicht angefasst.
- `todoOrder` (Store-Slice, `SK.todoOrder`, Backup-Kategorie, Sync-Policy `lww`) wird von
  niemandem gelesen oder geschrieben. Laut `2026-05-31-fokus-kernschleife-design.md` war er
  für „Todo in die 3 hochheben" vorgesehen und wurde nie gebaut. Dieser Change braucht ihn
  **nicht** (`dayRank` ersetzt ihn funktional). Damit ist er endgültig ohne Zweck — eigener
  Aufräum-Change, gemeldet, nicht angefasst.
