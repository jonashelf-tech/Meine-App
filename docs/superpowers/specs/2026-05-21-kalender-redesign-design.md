# Kalender Redesign — Design Spec
_Datum: 2026-05-21_

## Ziel

Den `TabKalender` visuell auffrischen und funktional erweitern:
- Monatsansicht zeigt Termine als Farbbalken mit Minitext statt nur Dots
- Wochenansicht als echtes Zeitgitter (7 Spalten, Zeitachse)
- Toggle-Strip zum Ein-/Ausblenden von Terminen, Todos und Tool-Indikatoren
- Tool-Dots in Monatszellen: ausgefüllt = erledigt, Ring = aktiv

---

## Datengrundlage

Alle Informationen kommen aus bestehenden Stores — keine neuen Datenstrukturen nötig:

| Kategorie | Quelle |
|---|---|
| Termine | `days[dateKey]` — Slots **ohne** `todoId` |
| Todos | `days[dateKey]` — Slots **mit** `todoId` |
| Tool-Dots | `activeTools` — ein Dot pro aktivem Tool in der Farbe des Tools |
| Geburtstage | `birthdays` (bereits vorhanden) |

---

## Monatsansicht

### Zellen-Aufbau (von oben nach unten)

1. **Tageszahl** — oben links, klein, `var(--primary)` wenn heute
2. **Termin-Balken** — farbige Rechtecke (Höhe 5px), Terminfarbe als Hintergrund, weißer Minitext (ca. 0.35rem) abgeschnitten mit `text-overflow: ellipsis`
3. **Todo-Balken** — gleiche Form, aber `opacity: 0.65` und etwas gedimmter Hintergrund (`rgba(Farbe, 0.6)`)
4. **`+N`-Hinweis** — wenn mehr als 3 Balken insgesamt: `+N weitere` in `var(--text-dim)`
5. **Tool-Dots** — ganz unten, `margin-top: auto`, Reihe kleiner Punkte (3.5px)
   - Ein Dot pro Tool das in `activeTools` ist, in der jeweiligen Tool-Farbe
   - Ausgefüllter Punkt = mindestens ein Todo (`todos`) mit `doneAt` auf diesem Tag
   - Leerer Ring = kein Todo an diesem Tag abgehakt (Tool aktiv, aber noch offen)

### Toggle-Verhalten

- Toggle **Termine aus** → Termin-Balken werden nicht gerendert
- Toggle **Todos aus** → Todo-Balken werden nicht gerendert
- Toggle **Tools aus** → Tool-Dot-Reihe wird nicht gerendert

### Zellen-Größe

Mindesthöhe 44px (wie heute). Bei vielen Einträgen wächst die Zelle in der Höhe mit — kein Overflow-Clipping nach 3 Balken, stattdessen `+N`-Hinweis.

---

## Wochenansicht — Zeitgitter

### Layout

```
[Zeitachse] | Mo | Di | Mi | Do | Fr | Sa | So |
            |    Allday-Streifen (Todos ohne Zeit)  |
  08:00     | ████|    |    |    |    |    |    |
  08:30     |    |████|    |    |    |    |    |
  ...
  22:00     |    |    |    |    |    |    |    |
```

- Zeitachse links: 08:00–22:00, Schritte je 30 min (Slot-Keys aus `days`)
- Jede Spalte = ein Wochentag
- Spaltenheader: Wochentagskürzel + Datum, heute = `var(--primary)`
- Scrollbar vertikal (overflow-y: auto), Kopfzeile sticky

### Allday-Streifen

- Schmale Zeile ganz oben (ca. 18px), fest, nicht scrollbar
- Zeigt Todos aus `todos[]` wo `todo.date === dateKey && !todo.time` — also Todos die auf einen Tag gesetzt wurden, aber keine Uhrzeit haben
- Kleine Farbbalken wie in Monatsansicht, leicht gedimmt

### Slot-Blöcke im Zeitgitter

- Alle `days[dateKey]`-Slots erscheinen an ihrer Zeitposition
- Termine (kein `todoId`): volle Opazität, farbiger Hintergrund, weißer Text + Uhrzeit
- Todos (hat `todoId`): `opacity: 0.65`, sonst gleiche Darstellung
- Höhe proportional zur `duration` (30 min = 1 Einheit), Mindesthöhe 1 Einheit
- Zu kurzer Slot (duration < 30): nur Farbstreifen, kein Text

### Tool-Dots im Wochengitter

- Winzige Dots als Badge an der Spaltenüberschrift (rechts oben am Tageskopf)
- Gleiche Logik: ausgefüllt = erledigt, Ring = aktiv

### Toggle-Verhalten

Gleich wie Monatsansicht — Termine, Todos, Tool-Dots unabhängig ein/ausblendbar.

---

## Bottom Strip (Toggle-Leiste)

Fixiert unterhalb des Kalender-Inhalts, oberhalb des Seitenrands:

```
[ Termine ● ]  [ Todos ● ]  [ Tools ● ]
```

- 3 gleichbreite Chips nebeneinander
- Aktiv: farbig hinterlegt (`rgba(Farbe, 0.1)`) + farbiger Text + farbiger Border
- Inaktiv: gedimmt, kein Border
- Farben: Termine = `var(--primary)`, Todos = `var(--teal)`, Tools = `var(--emerald)`
- State: `useState` lokal in `TabKalender` (3 Booleans)
- Gilt für beide Ansichten (Woche + Monat)

---

## Frischere Optik

- Keine gemischten Stile (alte Dots in Monat weg, nur noch Balken)
- Zellen: `background: rgba(255,255,255,0.035)` statt `var(--surface)`, wirkt leichter
- Balken: konsistente Höhe 5px, border-radius 2px überall
- Heute-Zelle: `box-shadow: 0 0 8px rgba(139,92,246,0.2)` zusätzlich zum Border
- Animationen: `fadeInUp` beim Aufklappen der Detail-Ansicht bleibt

---

## Scope — was NICHT geändert wird

- `DayDetail`-Popup beim Klick auf eine Monatszelle bleibt unverändert
- Zeitplan (`Zeitplan.jsx`) und Pool bleiben unangetastet
- Keine neuen Datenstrukturen / Store-Änderungen
- Keine Navigation oder Tab-Struktur Änderungen

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/features/calendar/TabKalender/TabKalender.jsx` | Komplettes Redesign beider Views + Toggle-Strip |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Neue CSS-Klassen für Balken, Zeitgitter, Strip |
