# Projekte Tool — Design

**Datum:** 2026-05-28  
**Status:** Approved

---

## Zusammenfassung

Ein neues Tool "Projekte" das bestehende Kategorien zu Projekten aufwertet. Kein neues Datenmodell — Kategorien bekommen ein `isProject`-Flag, Todos bekommen `showFromDate`. Minimale Änderungen am bestehenden System.

---

## Datenmodell

### Kategorie (cats)

```js
{
  id, label, color,      // bestehend
  isProject: false,      // neu — macht Kategorie zum Projekt
  hidden: false,         // neu — Projekt in Projekte-Tab ausblenden
  autoDelete: false,     // neu — nach Abschluss automatisch abschließen ohne Bestätigung
}
```

### Block (todos)

```js
{
  ...                    // alles bestehende bleibt
  showFromDate: null,    // neu — "2026-06-15", Todo erst ab diesem Datum aktiv
}
```

`showFromDate`-Todos sind von Anfang an normale Blocks mit ID. Sie werden lediglich:
- Im normalen Pool ausgeblendet solange `showFromDate > today`
- Im Projekttab ausgegraut + nicht checkbar solange `showFromDate > today`
- Sobald Datum erreicht: normaler Pool-Todo, im Projekt voll aktiv

---

## UI

### TabProjekte

- Liste aller Kategorien mit `isProject: true`
- "+ Neues Projekt"-Button oben → erstellt neue Kategorie mit `isProject: true`
- Ganz unten: "Ausgeblendet (N)"-Toggle für `hidden: true`-Projekte

### ProjektKarte

```
┌─────────────────────────────┐
│ Urlaub Italien          ···  │  ← Titel + Kontextmenü
│ ████████░░░░  5/8 erledigt  │  ← Fortschrittsbalken
│                             │
│ ☐ Flug buchen               │
│ ☐ Hotel suchen              │
│ ✓ Reisepass checken         │  ← durchgestrichen
│ ░ Packliste erstellen       │  ← ausgegraut "ab 1. Jun"
│                             │
│ 3 erledigt ▾                │  ← erledigte eingeklappt
│                             │
│ + Todo hinzufügen           │  ← ProjektQuickAdd
└─────────────────────────────┘
```

**Kontextmenü (···):**
- Ausblenden / Einblenden
- Auto-Delete an/aus
- Projekt abschließen
- Löschen (ohne Todos)

### ProjektQuickAdd

Inline innerhalb der Karte:
- Textfeld für Todo-Titel
- Optionaler Date-Picker für `showFromDate` ("Erst ab Datum anzeigen")
- Todo wird mit `category: catId` erstellt via `createBlock()`

---

## Fortschrittsbalken

```js
getProgress(todos) // { done, total }
```

- `total` = alle Todos der Kategorie (aktive + geplante)
- `done` = Todos mit `done: true`
- Geplante (`showFromDate > today`) zählen als offen

---

## Pool-Filter

Bestehende Pool-Rendering-Logik bekommt eine einzeilige Ergänzung:

```js
// Todos mit showFromDate in der Zukunft aus Pool ausblenden
.filter(t => !t.showFromDate || t.showFromDate <= todayKey())
```

---

## Abschluss-Logik

Auslöser: alle Todos der Kategorie sind `done: true` (aktive + geplante).

**`autoDelete: false` (default):**
1. Fortschrittsbalken zeigt 100%
2. Button "Projekt abschließen" erscheint
3. Manueller Klick → Abschluss-Flow

**`autoDelete: true`:**
1. Letzter Haken → kurze Erfolgsanimation
2. Automatischer Abschluss-Flow

**Abschluss-Flow (beide Varianten):**
1. `category: null` auf allen Todos dieser Kategorie setzen
2. Kategorie aus `cats` löschen
3. Projekt verschwindet aus dem Projekte-Tab
4. Todos bleiben erhalten (Pool, Kalender, Verlauf) — nur ohne Kategorie

Geplante Todos (`showFromDate` noch nicht erreicht) werden **nicht gelöscht** — sie werden normal freigeschaltet wenn ihr Datum kommt, dann aber ohne Kategorie im Pool sichtbar.

---

## Architektur

```
src/features/tools/projekte/
  TabProjekte.jsx        — Tool-Tab, listet alle isProject-Kategorien
  ProjektKarte.jsx       — Projektkarte (Fortschritt + Todos + QuickAdd)
  ProjektQuickAdd.jsx    — Inline Todo-Erstellung mit optionalem showFromDate
  projektUtils.js        — Hilfsfunktionen
```

### projektUtils.js

```js
getProjectTodos(todos, catId)   // alle Todos dieser Kategorie
getProgress(todos)              // { done, total }
isTodoActive(block)             // !block.showFromDate || block.showFromDate <= todayKey()
closeProject(catId, todos, cats, setTodos, setCats) // Abschluss-Flow
```

### Store

- `cats`: bestehende `setCats` — keine neue Slice nötig
- `createBlock()`: `showFromDate`-Feld ergänzen
- Kein neuer Store-Slice

### toolRegistry / toolTabs

- Neuer Eintrag `projekte` in `TOOL_REGISTRY` und `TOOL_TAB`
- Icon: SVG (Ordner oder Checkliste)

---

## Was nicht gebaut wird

- Kanban-Ansicht
- Projekt-übergreifende Abhängigkeiten
- Mehrere Kategorien pro Projekt
- Kommentare / Beschreibungen auf Projektebene
- Benachrichtigungen wenn showFromDate erreicht wird
