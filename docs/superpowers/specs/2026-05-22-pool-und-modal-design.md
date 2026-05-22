# Design Spec: Pool UX + Einheitliches Todo-Modal

**Datum:** 2026-05-22  
**Status:** Approved  
**Scope:** Gruppe B (Pool UX) + Gruppe A (Modal)

---

## Gruppe B — Pool UX

### B1: Label "Pool" → "Todos"
Das Label `"Pool"` im Pool-Header wird zu `"Todos"`. Einzige Stelle: `Pool.jsx` im Header-Render.

### B2: Auto-Scroll beim Drag
**Problem:** Wenn die Todo-Liste lang ist, liegt der Zeitplan außerhalb des Sichtbereichs. Touch-Drag verhindert natürliches Page-Scroll — Slots sind nicht erreichbar.

**Lösung:** Auto-Scroll in `useDragDrop.js`.
- Während `pointermove`: prüfen ob `clientY` innerhalb von 80px am oberen oder unteren Viewport-Rand
- Wenn ja: `window.scrollBy` mit Geschwindigkeit proportional zur Nähe (max ~8px/frame via `requestAnimationFrame`)
- Scroll-Loop läuft solange Drag aktiv und Finger im Randbereich
- Stoppt bei `pointerup` / Drag-Ende

### B3: Collapse UX
**Vorher:** Kleiner Chevron-Button rechts oben, nur dieser ist tippbar.

**Nachher:** Gesamter Header-Bereich ist tippbar (konsistent mit Kalender-DayPanel).
- Tap irgendwo im Header → togglet collapsed
- Wenn collapsed: Badge `"X offen"` zeigt Anzahl offener Todos (nur undone, nicht placed)
- Sortierschalter verschwinden wenn collapsed (nur sichtbar wenn aufgeklappt)
- Chevron dreht sich (▾ → ▸ wenn collapsed)
- Collapsed-State bleibt lokal (kein localStorage nötig, sinnvoller Default: aufgeklappt)

---

## Gruppe A — Modal

### A2: Bug Fix — Dauer-Default
**Datei:** `src/components/EditModal/EditModal.jsx:24`

```js
// Vorher (buggy):
const [duration, setDuration] = useState(todo.duration ?? 30)

// Nachher:
const [duration, setDuration] = useState(todo.duration ?? null)
```

Todos ohne Dauer behalten beim Bearbeiten keine Dauer. Das `30` war ein ungewollter Default.

### A3: Dauer-Buttons
Einheitliche Dauer-Auswahl in beiden Modals (wird durch A1 zu einem):

**Buttons:** `5` · `10` · `15` · `30` · `60` · `90` · `2h` (= 120min)  
**Freitextfeld:** Nummer-Input direkt neben den Buttons für beliebige Minutenwerte  
**Logik:** Aktiver Button wird deaktiviert wenn nochmal geklickt (→ null). Freitextfeld und Buttons sind synchron (Eingabe im Feld deaktiviert Button-Highlight, Button-Klick setzt Feld).  
**Einheit:** Immer Minuten intern. "2h" Button schreibt `120`.

### A1: Einheitliches Modal

**Komponente:** `src/components/TodoModal/TodoModal.jsx` (neue Datei, ersetzt beide alten)  
**Ersetzt:** `AddTodoModal.jsx` + `EditModal.jsx`

#### Props
```js
TodoModal({
  onClose,           // () → void
  existingTodo,      // Block | null — wenn null: Erstellen-Modus
})
```

#### Modi
| Prop | Titel | Submit-Text |
|---|---|---|
| `existingTodo = null` | "Hinzufügen" | "Todo hinzufügen" / "Termin eintragen" / "Routine erstellen" / "Vorlage speichern" |
| `existingTodo = {...}` | "Bearbeiten" | "Speichern" |

#### Typ-Tabs
Immer sichtbar: **Todo · Termin · Routine · Vorlage**  
Beim Öffnen im Edit-Modus: aktiver Tab entspricht dem Typ des existingTodo.  
Typ-Wechsel ist jederzeit möglich. Daten-Migration beim Wechsel:
- Text, Dauer, Farbe, Kategorie, Schritte → immer übernommen
- Typ-spezifische Felder (Datum, Uhrzeit, Takt etc.) → werden zurückgesetzt wenn Typ wechselt

#### Felder pro Typ

| Feld | Todo | Termin | Routine | Vorlage |
|---|:---:|:---:|:---:|:---:|
| Text + Auto-Button | ✓ | ✓ | ✓ | ✓ |
| Prio (3-stufig) | ✓ | – | – | – |
| Datum/Fälligkeit | ✓ (optional) | – | – | – |
| Datum + Uhrzeit | – | ✓ (prominent, Pflicht) | – | – |
| Takt + Wochentag/Monatstag | – | – | ✓ | – |
| Uhrzeit (optional) | – | – | ✓ | – |
| Dauer | ✓ | ✓ | ✓ | ✓ |
| Farbe | ✓ | ✓ | ✓ | ✓ |
| Kategorie | ✓ | ✓ | ✓ | ✓ |
| Schritte (Sub-Items) | ✓ | ✓ | ✓ | ✓ |

#### Kategorie-Feld (neu)
**Normal-Zustand:**
- Bestehende Kategorien als tippbare Chips
- ✏-Button rechts außen
- Auswahl: Tap auf Chip → aktiv/inaktiv

**Edit-Modus (nach Tap auf ✏):**
- ✏ leuchtet lila
- Alle Chips zeigen ✕-Badge zum Löschen
- Darunter erscheint: Textfeld + "+" zum Hinzufügen
- Tap auf ✏ nochmal → zurück zum Normal-Zustand

**Datenhaltung:**
- Kategorien global in `cats` (Zustand Store) + `SK.cats` (localStorage)
- Bereits vorhanden — kein neues Storage nötig
- Beim Löschen einer Kategorie: nur aus `cats` entfernen, bestehende Todos behalten ihren `category`-Wert

#### Submit-Logik (analog zu AddTodoModal)
**Erstellen:**
- **Todo:** `createBlock(...)` → `setTodos`
- **Termin:** `createBlock(...)` → `setTodos` + `setDays` (locked Slot)
- **Routine:** Routine-Objekt → `setRoutines`
- **Vorlage:** `createBlock({ isTemplate: true })` → `setTemplates`

**Bearbeiten (gleicher Typ):** Update in-place im jeweiligen Array.

**Bearbeiten mit Typ-Wechsel:** Cross-Array-Migration nötig:
- Todo/Termin/Vorlage → Routine: altes Block aus `todos`/`templates` entfernen, neue Routine in `setRoutines` hinzufügen
- Routine → Todo/Termin/Vorlage: alte Routine aus `routines` entfernen, neuen Block in `setTodos`/`setTemplates` hinzufügen
- Todo ↔ Termin ↔ Vorlage: nur `setTodos`/`setTemplates`, kein Array-Wechsel nötig (alle sind Blocks)
- Bei Termin-Wechsel (weg von Termin): bestehende Slots im `days`-Store bleiben bestehen (keine automatische Bereinigung)

#### Auto-Parser
Übernommen aus `AddTodoModal` — Funktion `parseTodoText` bleibt unverändert.

---

## Auswirkungen auf bestehenden Code

| Datei | Aktion |
|---|---|
| `src/components/AddTodoModal/AddTodoModal.jsx` | Löschen (ersetzt durch TodoModal) |
| `src/components/EditModal/EditModal.jsx` | Löschen (ersetzt durch TodoModal) |
| `src/components/TodoModal/TodoModal.jsx` | Neu anlegen |
| `src/components/TodoModal/TodoModal.module.css` | Neu anlegen |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Import + Verwendung anpassen |
| `src/features/calendar/Pool/Pool.jsx` | Label, Collapse-Logik, Header-Tap |
| `src/hooks/useDragDrop.js` | Auto-Scroll hinzufügen |
| Alle anderen Consumer von EditModal/AddTodoModal | Auf TodoModal umstellen |

---

## Nicht in Scope (wird separat geplant)

- C: Datenmodell Todo/Routine/Termin/Vorlage vereinfachen
- D: Tagesplan als modularer Tool-Container
