# Kalender Tool-Redesign

**Datum:** 2026-05-27  
**Status:** Genehmigt

---

## Ziel

Der Kalender zeigt aktuell für jedes aktive Tool einen Dot — unabhängig davon ob an dem Tag tatsächlich etwas passiert ist. Das erzeugt Lärm ohne Nutzen. Ziel: Nur Daten die wirklich existieren erscheinen im Kalender. Jedes Tool bekommt genau die Kalender-Präsenz die sinnvoll ist — oder keine.

---

## Tool-Klassifikation

### Keine Kalender-Präsenz

Diese Tools erscheinen weder in Dots noch im DayPanel:

- Elvi, Fokus-Timer, Pizzarechner, Prokrastination (Klaeren), Rezepte, Was jetzt?, Zufallsrad, Erfolge

### Geburtstage — Balken + DayPanel-Eintrag (kein Dot)

- **Monatsansicht:** Synthetischer farbiger Balken in der Tageskachel (Toolfarbe, Pink), ganz oben vor Terminen/Todos. Bedingung: `birthday.kalender === true AND birthday.plannedYear !== currentYear`. Wird bei jedem Render aus `birthdays[]` abgeleitet — kein Eintrag im `days`-Store.
- **DayPanel (Zeitplan-Sektion):** Geburtstags-Einträge erscheinen als All-day-Zeile ganz oben in der Zeitplan-Sektion, ohne Uhrzeit. Format: `⭐ [Name] Geburtstag · [Datum]`. Kein eigener Reiter, kein Collapse.
- **Kein Dot** in der Monatsansicht.

### Gewicht — Dot + DayPanel-Miniview

- **Dot:** Erscheint wenn ein Gewicht-Eintrag für diesen Tag existiert (`loadEntries().find(e => e.date === dk)` aus `gewichtData.js`).
- **DayPanel:** Eigene Sektion "Gewicht" (collapsible, standardmäßig aufgeklappt wenn Daten). Zeigt: kg + kcal (nur kg wenn kein kcal-Wert vorhanden). Link-Button → navigiert zu Tab Gewicht.
- Sektion erscheint **nur** wenn Eintrag für diesen Tag existiert.

### Haushalt — Dot only

- **Dot:** Erscheint wenn an diesem Tag Haushalt-Todos zur Todoliste hinzugefügt wurden. Ableitung: `todos.some(t => t.toolId === 'haushalt' && t.createdAt?.startsWith(dk))`.
- **Kein DayPanel-Eintrag**, kein Mini-Dashboard.
- Edge case "keine fälligen Tasks": kein Dot — korrekt.

### Reminder — Dot only

- **Dot:** Erscheint wenn an diesem Tag Reminder-Items hinzugefügt wurden. Ableitung:
  - Todos: `todos.some(t => t.reminderItemId && t.createdAt?.startsWith(dk))`
  - Slots: `Object.values(days[dk] ?? {}).some(s => s.reminderItemId)`
  - Entweder reicht für den Dot.
- **Kein DayPanel-Eintrag**.
- Edge case "keine fälligen Items": kein Dot — korrekt.

---

## Monatsansicht — Tageskachel

Neue Reihenfolge der Elemente:

1. Tageszahl
2. **Geburtstags-Balken** (synthetisch, zuerst) — nur wenn `kalender=true` und nicht `plannedYear`
3. Termin-Balken (aus `days[dk]`, keine `todoId`)
4. Todo-Balken (aus `days[dk]`, mit `todoId`)
5. **Dots** (nur): Gewicht-Dot · Haushalt-Dot · Reminder-Dot

Kein Dot für Tools ohne Daten.

---

## DayPanel — neue Struktur

```
Panel-Header (Datum + "heute"-Badge, klickbar → Tagesplaner)
│
├─ Zeitplan [collapsible, default: offen]
│    ├─ ⭐ [Name] Geburtstag · [Datum]    ← All-day, ganz oben (nur wenn birthday)
│    ├─ 09:00  Meeting                    ← Normale Zeitslots
│    └─ 14:00  Sport                [Todo]
│
├─ Erledigt [collapsible, default: offen]
│    └─ ✓ erledigte Todos (klickbar → Restore-Modal)
│
└─ Gewicht [collapsible, default: offen] ← NUR wenn Eintrag für diesen Tag
     └─ ⚖️  81.2 kg   1.840 kcal   [→ Gewicht]
```

**Entfernt:** Die "Tools"-Sektion (zeigte alle aktiven Tools als Chips, unabhängig von Daten).

---

## Toggle-Strip (unten im Kalender)

**Entfernt:** "Tools"-Button. Dieser steuerte die alten generischen Tool-Dots — fällt vollständig weg.

**Bleiben:** "Termine"-Toggle, "Todos"-Toggle.

Die neuen daten-gesteuerten Dots (Gewicht, Haushalt, Reminder) haben keinen eigenen Toggle — sie erscheinen einfach nur wenn Daten vorhanden sind.

---

## Wochenansicht

In der Wochenansicht erscheinen Tool-Dots im Tages-Header (gleiche Logik wie Monatsansicht). Geburtstage erscheinen im All-day-Streifen als farbige Bar (analog zu Todos ohne Uhrzeit).

---

## Dot-Farben

- Gewicht-Dot: `getToolColor('gewicht', toolColors)` (default `#00FF94`)
- Haushalt-Dot: `getToolColor('haushalt', toolColors)` (default `#8B5CF6`)
- Reminder-Dot: `getToolColor('reminder', toolColors)` (default `#00FF94`)

Dots sind immer solid (gefüllt) — kein Ring-Stil mehr. Sie sind reine Präsenz-Indikatoren.

---

## Visuelles Design (DayPanel)

- Sektionen als gerundete Cards (`border-radius: 10px`, `background: surface2`), mit 4px Abstand zwischen Sektionen und 8px Seitenabstand zum Panel-Rand.
- Zeitplan-Einträge: vollständig gerundete Zeilen (`border-radius: 8px`), linker farbiger Akzentstreifen (`border-left: 2.5px solid`), 8px Padding.
- Geburtstags-All-day-Eintrag: gleiche Zeilenform, `border-color: pink`, leicht pinker Hintergrund.
- Gewicht-Sektion: Icon + Wert + kcal + Link-Button rechtsbündig.

---

## Nicht verändert

- DayPanel-Header (Datum klickbar → Tagesplaner)
- Zeitplan-Sektion Inhalt und Funktionalität (Doppelklick → Tagesplaner)
- Erledigt-Sektion + Restore-Modal
- Monatsansicht Termin/Todo-Balken
- Wochenansicht Zeitgitter
- NavPill + Woche/Monat-Toggle

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `TabKalender.jsx` | `getToolDots()` neu, Monatsansicht-Kachel (birthday bars), DayPanel rebuilt, Toggle-Strip |
| `TabKalender.module.css` | Neue Styles für gerundete Einträge, Gewicht-Sektion, All-day-Row |
| `birthdayUtils.js` | Bereits vorhanden: `getBirthdaysForCalendarDate` — wird genutzt |
| `gewichtData.js` | Bereits vorhanden: `loadEntries` — wird genutzt |
