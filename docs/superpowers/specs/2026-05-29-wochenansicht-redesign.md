# Wochenansicht — Redesign & PillStrip

**Datum:** 2026-05-29

---

## Ziel

Die Wochenansicht (`TabKalender`, view `woche`) optisch auf den Stand des restlichen App-Designs bringen und die Logik für Termine außerhalb des sichtbaren Zeitbereichs einführen — analog zum Tagesplaner (`Zeitplan`).

---

## Visuelles Design

### Slot-Höhe
- Von `SLOT_H = 28px` auf **`SLOT_H = 40px`** pro 30-Minuten-Slot (80px pro Stunde)
- `weekDayCol` Gesamthöhe passt sich an: `(GRID_END - GRID_START) * 2 * 40px`
- `weekScrollBody` `max-height` von 480px auf **`600px`** erhöhen

### Schriftgrößen
- Zeitachsen-Labels: `0.42rem` → **`0.52rem`**
- Slot-Name: `0.42rem` → **`0.52rem`**
- Slot-Zeit: `0.36rem` → **`0.44rem`**

### Heute-Spalte
- Spalten-Header: leichte lila Tönung (`rgba(139,92,246,0.08)`) + Datum als gefüllter lila Kreis (wie im Mockup)
- Spalten-Body: dezente Hintergrund-Tönung (`rgba(139,92,246,0.04)`)

### Jetzt-Linie
- Rote horizontale Linie (`#FB7185`, 2px) mit Punkt links in der heutigen Spalte
- Positioniert basierend auf der aktuellen Uhrzeit relativ zu `visibleStart`
- Nur sichtbar wenn aktuelle Zeit im sichtbaren Bereich liegt

### Grid-Linien
- Stunden-Linie: `rgba(255,255,255,0.055)` (bisher `--border-dim`)
- Halbe-Stunde-Linie (neu, gestrichelt): `rgba(255,255,255,0.025)` via `::after`

### Ganztags-Label
- `"All"` → **`"Ganzt."`**

### Slot-Blöcke
- Border-Radius: `3px` → **`5px`**
- Padding: `1px 3px` → **`3px 4px`**

---

## Reihenfolge der Zeilen (verändert)

```
1. Spalten-Header (Mo–So mit Tageszahl)
2. PillStrip oben        ← NEU (war: nicht vorhanden)
3. Ganztags-Zeile
4. Scrollbares Zeitgitter
5. PillStrip unten       ← NEU
```

---

## PillStrip — Logik

### State
- `visibleStart` (default: `7`) und `visibleEnd` (default: `21`) als React-State, persistiert in `localStorage` via `lv`/`sv` mit **neuen** Keys `SK.weekVisStart` (`adhs_view_week_vis_start`) und `SK.weekVisEnd` (`adhs_view_week_vis_end`). Nicht `SK.visStart`/`SK.visEnd` verwenden — diese gehören dem Tagesplaner.
- Ersetzen die bisherigen Konstanten `GRID_START = 7` und `GRID_END = 22`.

### Buttons
| Button | Aktion |
|--------|--------|
| `+` oben | `visibleStart -= 1` (früherer Start, min: 0) |
| `−` oben | `visibleStart += 1` (späterer Start, max: `visibleEnd - 1`) |
| `+` unten | `visibleEnd += 1` (späteres Ende, max: 24) |
| `−` unten | `visibleEnd -= 1` (früheres Ende, min: `visibleStart + 1`) |

### Chips
- Zeigt Termine (Slots aus `days[dk]`) mit Uhrzeit außerhalb des sichtbaren Bereichs als kompakte Chips
- Format: `"HH:MM Text"` (Text ggf. abgeschnitten)
- Chips erscheinen im oberen Strip wenn `h < visibleStart`, im unteren wenn `h >= visibleEnd`
- Alle 7 Tage werden zusammen ausgewertet (globale +/- gelten für alle Spalten)
- Klick auf Chip: `visibleStart` bzw. `visibleEnd` auf die Stunde des Chips erweitern (analog zu `onExpandTo` im Zeitplan)

### Leerzustand
- Kein ausgeblendeter Termin: Strip zeigt dezenten Hinweistext (`"Keine Termine vor HH:00"`)
- Strip wird trotzdem immer angezeigt (für die +/- Buttons)

---

## Geänderte Dateien

| Datei | Änderungen |
|-------|-----------|
| `src/features/calendar/TabKalender/TabKalender.jsx` | `SLOT_H`, `GRID_START`/`GRID_END` durch State ersetzen; PillStrip-Komponente einbauen; Heute-Kreis + Jetzt-Linie; `"All"` → `"Ganzt."` |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Slot-Höhe, Schriftgrößen, Slot-Radius, Heute-Spalte, Grid-Linien, PillStrip-Styles |
| `src/storage/index.js` | `weekVisStart` und `weekVisEnd` zu `SK` ergänzen |

---

## Out of Scope

- Keine interaktiven Slots in der Wochenansicht (kein Tippen/Bearbeiten direkt im Grid)
- Keine Synchronisierung des sichtbaren Bereichs mit dem Tagesplaner
- Keine Drag & Drop in der Wochenansicht
