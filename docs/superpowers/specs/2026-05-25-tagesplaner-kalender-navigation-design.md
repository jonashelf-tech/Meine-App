# Design: Tagesplaner + Kalender Navigation

**Datum:** 2026-05-25

## Überblick

Vier unabhängige Verbesserungen an Navigation und Verlinkung zwischen Tagesplaner (Tab 0) und Kalender (Tab 1).

---

## 1. Pfeile größer (NavPill)

**Problem:** `‹` / `›` Buttons in NavPill zu klein für Touch-Bedienung.

**Lösung:** `NavPill.module.css` — `.arrow` bekommt `min-width: 44px`, `min-height: 44px`, `font-size: 1.5rem`, `padding: 0 16px`. Gilt für alle NavPill-Instanzen (DayNav im Tagesplaner + Woche/Monat-Navigation im Kalender).

**Dateien:** `src/components/NavPill/NavPill.module.css`

---

## 2. Tagesplaner → Kalender: richtiger Tag öffnen

**Problem:** Klick auf Datum-Label in DayNav öffnet Kalender, aber navigiert nicht zum richtigen Tag.

**Lösung:**

Neues flüchtiges Store-Feld `calendarDate / setCalendarDate` (analog `dayplanDate`). Kein localStorage.

`TabHeute` ruft beim Kalender-Link `setCalendarDate(viewDate)` vor `setCurrentTab(1)` auf.

`TabKalender` konsumiert `calendarDate` beim Mount (einmaliger Effect, löscht danach):
- Navigiert zum richtigen Monat (`setMonthRef`) bzw. zur richtigen Woche (`setWeekStart`)
- Setzt `selectedDay` auf diesen Tag

**Dateien:**
- `src/store/index.js` — `calendarDate`, `setCalendarDate`
- `src/features/calendar/TabHeute/TabHeute.jsx` — `setCalendarDate(viewDate)` beim Kalender-Link
- `src/features/calendar/TabKalender/TabKalender.jsx` — Mount-Effect

---

## 2b. Kalender → Tagesplaner: Datum-Label im DayPanel klickbar

**Problem:** Kein offensichtlicher Weg vom Kalender in den Tagesplaner für einen bestimmten Tag.

**Lösung:** `dayPanelDate`-Span im DayPanel-Header wird klickbar. Klick → `setDayplanDate(dateKey); setCurrentTab(0)`. TabHeute öffnet dann auf genau diesem Tag (bestehender `dayplanDate`-Mechanismus).

Gleichzeitig: `onDoubleClick` auf einzelne Zeitplan-Einträge im DayPanel wird entfernt (ersetzt durch Datum-Klick).

CSS: `cursor: pointer`, Hover-Farbe `--teal`, kurze Transition.

**Dateien:** `src/features/calendar/TabKalender/TabKalender.jsx`

---

## 3. Kalender: immer ein Tag angewählt

**Problem:** `selectedDay` startet als `null`, kein DayPanel sichtbar beim ersten Öffnen.

**Lösung:** `selectedDay` Default-Wert: `todayKey` statt `null`. Toggle-Verhalten (`prev === dateKey ? null : dateKey`) entfällt — immer `setSelectedDay(dk)`, nie auf `null` zurücksetzen.

Beim Konsum von `calendarDate` wird `selectedDay` auf diesen Wert gesetzt.

**Dateien:** `src/features/calendar/TabKalender/TabKalender.jsx`

---

## 4. Restore-Popup blockiert Tag-Auswahl

**Problem:** `restoreTodo`-State ist lokal in `DayPanel`. Wenn Popup offen ist, kann der User trotzdem einen anderen Tag anklicken — `selectedDay` ändert sich, DayPanel rendert neu, Popup verschwindet unkontrolliert.

**Lösung:** `restoreTodo`-State nach `TabKalender` heben. `handleDayClick` prüft: `if (restoreTodo) return`. `DayPanel` bekommt `restoreTodo`, `setRestoreTodo`, `handleRestore` als Props.

**Dateien:** `src/features/calendar/TabKalender/TabKalender.jsx`

---

## Betroffene Dateien (gesamt)

| Datei | Änderung |
|---|---|
| `src/store/index.js` | `calendarDate` + `setCalendarDate` |
| `src/components/NavPill/NavPill.module.css` | Arrow Touch-Target + Größe |
| `src/features/calendar/TabHeute/TabHeute.jsx` | `setCalendarDate(viewDate)` beim Kalender-Link |
| `src/features/calendar/TabKalender/TabKalender.jsx` | Mount-Effect, selectedDay-Default, restoreTodo heben, DayPanel-Header klickbar, DoubleClick entfernen |

---

## Nicht in Scope

- Wochenansicht bekommt kein DayPanel (nur Monat hat eins)
- NavPill-Pfeile werden nicht zu SVG umgebaut — nur größer
- Keine Änderungen an der Pool-Logik oder Slot-Daten
