# Design-Spec: Blocker / Zeitfenster im Tagesplaner

**Datum:** 2026-05-23  
**Status:** Approved

---

## Überblick

Benutzer können im Tagesplaner (TabHeute / Zeitplan) farbige Zeitfenster-Blocker anlegen (z.B. "Me-Time 13–15 Uhr", "Arbeit 9–17 Uhr"). Blocker sind unabhängig von Todos — sie markieren einen Zeitraum visuell als Kontext, können Todos zulassen (offen) oder verhindern (geblockt), und unterstützen Wiederholungen.

---

## Datenmodell

### Blocker-Eintrag

```js
{
  id:        genId(),
  text:      "Me-Time",
  color:     "#3b82f6",    // frei wählbar
  startHour: 13,           // Dezimalstunde: 13 = 13:00, 13.5 = 13:30
  endHour:   15,
  locked:    false,        // false = offen, true = geblockt
  repeat: null | {
    type: 'daily' | 'workdays' | 'weekly',
    days: [1, 3, 5],       // nur bei 'weekly': Wochentage (0=So … 6=Sa)
  },
  exceptions: [],          // Datumsstrings "2026-05-23" — Tage wo diese Instanz gelöscht wurde
}
```

### Storage

```js
SK.blockers → 'adhs_blockers'   // Array aller Basis-Blocker
```

Gespeichert als flaches Array. Wiederholungs-Instanzen werden zur Laufzeit berechnet (nicht gespeichert). Gelöschte Einzelinstanzen landen in `exceptions[]`.

### Store

```js
blockers,     setBlockers    // neu in store/index.js
```

---

## Erstellung & Bearbeitung

### Zugang

Im Zeitplan gibt es bereits einen `+`-Button. Dieser bekommt zwei Optionen:
- **+ Todo** — bestehend, unverändert
- **+ Zeitfenster** — öffnet BlockerModal

### BlockerModal

Ein schlankes Modal (ähnlich dem bestehenden AddTodoModal). Felder:

| Feld | UI |
|---|---|
| Name | Textinput |
| Von / Bis | Uhrzeit-Picker, 30-min-Schritte |
| Farbe | Farbauswahl (bestehende Komponente) |
| Modus | Toggle: `Offen` / `Geblockt` |
| Wiederholung | Chip-Row: `Nie · Täglich · Werktags · Wöchentlich` |
| Wochentage | Nur bei "Wöchentlich": inline Wochentag-Picker (Mo Di Mi Do Fr Sa So) |

Das Modal verändert sein Layout nicht — die Wochentage klappen inline auf, kein Seiten-Wechsel.

### Bearbeiten

Tap auf den Blocker-Header im Zeitplan → BlockerModal öffnet vorausgefüllt.

Bei Wiederholung: vor dem Speichern/Löschen erscheint ein Sheet:
- **Nur diesen** — schreibt eine Exception in `exceptions[]`
- **Diesen und alle zukünftigen** — setzt ein `endDate` auf dem Basis-Blocker (vor dieser Instanz)

---

## Visuelles Rendering im Zeitplan

### Blocker-Karte

Slots die in den Zeitraum eines Blockers fallen werden als **gerundete Karte** gerendert (statt normaler Slot-Zeilen):

```
┌─────────────────────────────────────┐
│ ● Me-Time          13–15   [offen]  │  ← Header: Farbe, Name, Zeit, Status-Pill
├─────────────────────────────────────┤
│ 13:00  │                            │
│ 13:30  │ [Buch lesen]               │  ← Normale Slots mit Todo-Chips
│ 14:00  │                            │
│ 14:30  │ [Spazieren]                │
└─────────────────────────────────────┘
```

- Header-Hintergrund: Blockerfarbe mit ~18% Opacity
- Card-Border: Blockerfarbe mit ~35% Opacity, `border-radius: 12px`
- Status-Pill: `offen` (blau-tinted) oder `geblockt` (rot-tinted)
- Slots innerhalb: identisch zu normalen Slots — gleiche Drag-&-Drop-Logik

### Geblockt-Modus

Wenn `locked: true`:
- Slot-Inhalte visuell gedimmt (opacity ~0.25)
- Todos können **nicht** in geblockte Slots gedroppt werden (Drop wird abgewiesen)
- Bestehende Todos im Pool bleiben unberührt

---

## Löschen mit Wiederholung

Gilt für **Blocker** (sofort) und **Termine** (sobald Termine ebenfalls `repeat` unterstützen — das ist ein separates Feature, das denselben Mechanismus nutzen soll):

Beim Löschen einer Instanz erscheint ein Action-Sheet von unten:

```
Zeitfenster löschen
──────────────────
○ Nur diesen
○ Diesen und alle zukünftigen
[Abbrechen]
```

- **Nur diesen** → Datum zu `exceptions[]` hinzufügen
- **Diesen und alle zukünftigen** → `endDate` auf Vortag dieser Instanz setzen

---

## Was sich NICHT ändert

- Todo-Pool und Slot-Logik bleiben unverändert
- Blocker haben keine Referenz auf Todos und umgekehrt
- Blocker sind nicht per Drag verschiebbar
- Der Kalender (TabKalender) zeigt Blocker vorerst nicht an

---

## Out of Scope

- Blocker im Kalender / Wochenansicht
- Blocker auf mehrere Tage (z.B. Urlaub-Spanne) — separates Feature
- Templates / Wiederverwendbare Blocker-Sets
