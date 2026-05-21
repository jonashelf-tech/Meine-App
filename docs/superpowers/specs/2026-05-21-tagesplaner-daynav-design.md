# Tagesplaner DayNav — Design Spec
_2026-05-21_

## Überblick

Der "Heute"-Reiter wird zu "Tagesplaner" umbenannt und erhält eine kompakte Tagesnavigation (DayNav-Pille) oben. Der User kann tagesweise vor/zurück navigieren, Plant Zeitplan + Pool auf allen Tagen, und der heutige Tag leuchtet visuell auf. Ein Klick auf das Datum öffnet den Kalender-Tab. Vom Kalender-DayPanel kann per Doppelklick direkt zum richtigen Tag navigiert werden.

---

## Features

1. **Tab-Umbenennung**: `"Heute"` → `"Tagesplaner"` in `App.jsx` (TABS-Array)

2. **DayNav-Komponente** (`src/components/DayNav/DayNav.jsx` + `.module.css`)
   - Kompakte Pille: `‹` — Datum — `›`
   - Datum-Format: "Do, 21. Mai" (Wochentag kurz, Tag, Monatsname lang)
   - **Heute**: Datum cyan + glow (`var(--primary)`)
   - **Nicht heute**: Datum weiß/dim; der Pfeil der in Richtung heute zeigt leuchtet cyan
     - heute liegt in Vergangenheit → `‹` leuchtet
     - heute liegt in Zukunft → `›` leuchtet
   - Klick auf Datum → `onCalendarOpen()` (öffnet Tab 1)
   - Props: `date: string` (dateKey "YYYY-MM-DD"), `onChange(newDateKey)`, `onCalendarOpen()`

3. **TabHeute — viewDate-State**
   - `viewDate` als lokaler State: `useState(() => store.dayplanDate ?? todayKey())`
   - `useEffect` beim Mount: liest `store.dayplanDate`, setzt viewDate, ruft `store.setDayplanDate(null)` auf
   - Alle Slot-Mutations (`setTodaySlots`, `handleSetSlot`, usw.) schreiben auf `viewDate`
   - Pool bleibt immer sichtbar, Drag & Drop schreibt auf den aktuellen `viewDate`
   - Auto-Return-Logik (vergangene Slots → Pool) bleibt unverändert
   - Tab verlassen + zurück → TabHeute unmountet → State resettet auf heute (automatisch, kein Extra-Aufwand)

4. **Store** (`store/index.js`)
   - Neues Feld: `dayplanDate: null` (string | null)
   - Neuer Setter: `setDayplanDate(dk)`
   - Kein Persist in localStorage nötig (flüchtiger Intent)

5. **TabKalender DayPanel**
   - Bestehende Doppelklick-Handler auf Termin/Todo: zusätzlich `store.setDayplanDate(dk)` vor `setCurrentTab(0)`

---

## Architektur-Entscheidung

`viewDate` lebt als **lokaler State** in TabHeute (nicht im Store). Das ermöglicht automatisches Reset auf heute beim Tab-Wechsel (unmount/remount). Die einzige Store-Brücke ist `dayplanDate` (nullable), das DayPanel setzt und TabHeute einmalig beim Mount konsumiert und löscht.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/App.jsx` | Tab-Label ändern |
| `src/store/index.js` | `dayplanDate` + `setDayplanDate` hinzufügen |
| `src/components/DayNav/DayNav.jsx` | Neu erstellen |
| `src/components/DayNav/DayNav.module.css` | Neu erstellen |
| `src/features/calendar/TabHeute/TabHeute.jsx` | viewDate-State, DayNav einbinden, Mutations anpassen |
| `src/features/calendar/TabKalender/TabKalender.jsx` | DayPanel Doppelklick-Handler erweitern |
| `kontext/kern.md` | Tab-Name + DayNav-Feature dokumentieren |

---

## Nicht in Scope

- Wischgesten (Swipe) zum Tagwechsel
- Wochenstreifen-Ansicht
- Sync von viewDate mit Kalender-Wochenansicht (Kalender öffnet einfach, ohne Positionierung)
