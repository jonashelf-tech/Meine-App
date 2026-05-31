# Wochenplaner — freies horizontales Scrollen

**Datum:** 2026-05-31
**Bereich:** Kalender / Wochenansicht (`src/features/calendar/TabKalender/`)

## Problem

Die Wochenansicht ist ein festes 7-Spalten-Gitter (Mo–So). Navigation passiert in
ganzen 7-Tage-Sprüngen (Wisch-Gesture + NavPill). Man kann nicht „mal eben" über
die Wochengrenze schauen, ohne komplett umzuspringen — der Kontext der angrenzenden
Tage geht verloren.

## Ziel

Eine durchgehend horizontal scrollbare Zeitleiste: flüssig zu jedem beliebigen Tag
pannen statt in 7er-Schritten springen. Default 7 Tage sichtbar, in den Einstellungen
änderbar. Tag-Header und Allday-Streifen scrollen synchron mit.

## Nicht im Scope (YAGNI)

- Auto-Scroll beim Draggen an den horizontalen Rand (kann später nachgezogen werden)
- True Virtualization / Spalten-Recycling (leere Spalten sind billig genug)
- Änderungen an der Monatsansicht

---

## Ansatz: ein gemeinsamer Scroll-Container mit Sticky-Achsen

Heute sind es drei getrennte Blöcke: Header-Zeile, Allday-Zeile, und der vertikal
scrollbare `weekScrollBody`. Stattdessen kommt **ein** Container mit
`overflow: auto` (beide Richtungen):

```
┌─ Scroll-Container (overflow-x + overflow-y) ──────────────┐
│ [Ecke]   Mo  Di  Mi  Do  Fr  Sa  So  Mo  Di …   ← sticky top
│ [Ganzt.] ▓   ▓   …                              ← sticky top (Allday)
│ ┌──────┬───┬───┬───┬───┬───┬───┬───┬───┬─────   │
│ │07:00 │   │   │   │   │   │   │   │   │         │
│ │ ↑    │   │ Spalten = Tage, frei scrollbar    │
│ │sticky│   │                                    │
│ │ left │   │                                    │
│ └──────┴───┴───┴───┴───┴───┴───┴───┴───┴─────   │
└────────────────────────────────────────────────────────────┘
```

- **Zeitachse (links):** `position: sticky; left: 0` → bleibt beim Horizontal-Scrollen stehen.
- **Tag-Header + Allday (oben):** `position: sticky; top: 0` → bleiben beim Vertikal-Scrollen stehen.
- **Ecke oben-links:** sticky in beide Richtungen (`left: 0; top: 0`), höchster z-index.

Vorteil: Header scrollt **automatisch synchron** mit den Spalten — kein manuelles
`onScroll`-Syncing zwischen zwei Containern, keine Race Conditions. Das ist der
robusteste Weg.

### Sticky-Layering

Die sticky-Elemente brauchen eine undurchsichtige Hintergrundfarbe (sonst scheinen
Spalten durch) und gestaffelte z-index:
- Ecke: z-index 30
- Header-Zeile + Allday (sticky top): z-index 20
- Zeitachse (sticky left): z-index 10
- Spalten-Inhalt: z-index 0

---

## Spaltenbreite / Setting

Neues Setting **`weekVisibleDays`** (Default `7`), gespeichert unter neuem
Storage-Key `SK.weekVisibleDays` (`adhs_view_week_visible_days`). In `BACKUP_CATS.kalender`
aufnehmen.

- Spaltenbreite = `Scrollport-Breite / weekVisibleDays`, gesetzt über CSS-Variable
  `--week-col-w` am Scroll-Container.
- Scrollport-Breite wird per `ResizeObserver` (oder einmalig + `resize`-Listener)
  am Container gemessen.
- Bei `weekVisibleDays = 7` füllt eine Woche exakt den Screen; Scrollen zeigt fließend
  die Nachbartage.
- Sinnvoller Wertebereich: 3–7. UI-Control in den Einstellungen.

### Settings-UI

In `TabSettings.jsx`, neue `<section className={s.card}>` „Kalender" (oder in die
bestehende „Erscheinungsbild"-Karte), Segmented-Buttons `3 · 4 · 5 · 6 · 7 Tage`.
Schreibt `sv(SK.weekVisibleDays, n)`. TabKalender liest den Wert beim Mount
(`lv(SK.weekVisibleDays, 7)`).

---

## Gerenderter Tagesbereich + dynamische Erweiterung

State: `rangeStart` (Date, Montag), `rangeDays` (Anzahl gerenderter Spalten).

- Initial: `rangeStart = getMonday(today) − 6 Wochen`, `rangeDays = 84` (12 Wochen).
- Beim Mount: `scrollLeft` so setzen, dass **heute** (bzw. `weekStart`) am linken Rand steht.
- `onScroll`-Handler: nähert sich `scrollLeft` dem linken Rand (< 2 Spaltenbreiten),
  werden 28 Tage **vorne** angehängt (`rangeStart −= 28`, `rangeDays += 28`) und
  `scrollLeft += 28 * colW` gesetzt, damit die sichtbare Position erhalten bleibt
  (kein sichtbarer Sprung). Symmetrisch am rechten Rand (nur `rangeDays += 28`).

Die Spalten-Map (`weekDays`) wird aus `rangeStart` + `rangeDays` erzeugt statt fix 7.

**Performance:** Leere Tagesspalten sind nur ein `<div>` mit zwei
Gitter-Pseudo-Elementen. 84+ Spalten sind unkritisch. Sollte es je klemmen, ist
Virtualization der nächste Schritt — bewusst nicht jetzt.

---

## Snap auf Spalten

CSS Scroll-Snap am Container:
- Container: `scroll-snap-type: x mandatory`
- Jede Tagesspalte: `scroll-snap-align: start`

→ Beim Loslassen rastet die Ansicht sauber auf Tagesgrenzen ein, nie eine halb
abgeschnittene Spalte am Rand.

---

## NavPill / „heute"

NavPill bleibt, Verhalten ändert sich von „Woche umschalten" zu „Scroll-Position
verschieben":
- `‹` / `›`: `scrollLeft ∓= 7 * colW` mit `behavior: 'smooth'` (eine Woche weich scrollen).
- **Label:** zeigt den aktuell **sichtbaren** Datumsbereich, abgeleitet aus
  `scrollLeft` / `colW` → erster sichtbarer Tag bis erster + `weekVisibleDays − 1`.
  Wird per `onScroll` aktualisiert (throttled via `requestAnimationFrame`).
- **`isCurrent` / „heute"-Doppeltipp:** scrollt weich zu heute.
- `leftGlows` / `rightGlows`: aus Vergleich sichtbarer Bereich vs. heute.

Das **Wisch-Gesture** (`usePageSwipe`) für ±Woche **entfällt in der Woche-Ansicht**
— das übernimmt jetzt der native Horizontal-Scroll. In der Monatsansicht bleibt
`usePageSwipe` unverändert (Monat blättern).

---

## Now-Linie & Drag & Drop

- **Now-Linie:** unverändert — wird in der Spalte des heutigen Tages gerendert, sofern
  heute im gerenderten Bereich liegt. `nowTop`-Berechnung bleibt.
- **Drag & Drop:** funktioniert weiter über `colRefs` (jetzt mehr Einträge, gleiche
  Logik). `updateDragTarget` iteriert `colRefs` und trifft per `clientX`-Range die
  richtige Spalte — skaliert ohne Änderung. Auto-Scroll am Rand bleibt bewusst weg.

---

## Pill-Strips (oben/unten — abgeschnittene Stunden)

Die `WeekPillStrip`-Komponenten zeigen Slots außerhalb des sichtbaren vertikalen
Stunden-Fensters. Heute iterieren sie über alle `weekDays`. Bei 84 Spalten würden
sie unbrauchbar voll.

→ Sie werden auf die **aktuell horizontal sichtbaren Tage** beschränkt: aus
`scrollLeft` / `colW` den sichtbaren Index-Bereich ableiten und nur diese Tage an
`WeekPillStrip` übergeben. (Falls das die Strips zu „flackrig" macht beim Scrollen,
Fallback: Strips schlicht entfernen — aber erst messen, nicht vorab löschen.)

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/storage/index.js` | `SK.weekVisibleDays` + in `BACKUP_CATS.kalender` |
| `src/features/calendar/TabKalender/TabKalender.jsx` | Scroll-Container-Umbau, Range-State, Scroll-Handler, NavPill-Anbindung, Pill-Strip-Scope |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Sticky-Achsen, `--week-col-w`, scroll-snap, z-index-Layering |
| `src/features/settings/TabSettings/TabSettings.jsx` | Setting-Control „Tage pro Woche-Ansicht" |

## Erfolgskriterium

- Wochenansicht lässt sich flüssig horizontal scrollen; jeder beliebige Tag kann
  am Rand landen, nicht nur ganze Wochen.
- Tag-Header + Allday + Zeitachse bleiben korrekt gepinnt beim Scrollen in beide Richtungen.
- Setting auf z.B. 4 Tage → breitere Spalten, 4 Tage sichtbar, Header passt sich an.
- Snap rastet auf Tagesgrenzen ein.
- Drag & Drop, Now-Linie, Termin-Edit funktionieren wie vorher.
- Uhrzeit-Labels bleiben mit den Slots ausgerichtet (28px/Halbstunde, wie zuletzt gefixt).
