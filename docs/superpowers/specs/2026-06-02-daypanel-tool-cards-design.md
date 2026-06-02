# DayPanel Tool-Karten — Design Spec
_2026-06-02_

## Zusammenfassung

Das DayPanel (Monatsansicht → Tag anklicken) bekommt eine einheitliche Karten-Vorlage für Tools, die tagesbezogene Historiendaten schreiben. „Erledigt" zeigt nur noch echte abgehakte Todos/Termine.

---

## Erledigt-Sektion (Änderung)

**Vorher:** Kognitiv-Sessions wurden in „Erledigt" mitgezählt und angezeigt.

**Nachher:** Nur `todos.filter(t => t.doneAt?.startsWith(dateKey))` — reine abgehakte Todos. Kognitivsessions raus.

Default: **zugeklappt** (`open.done = false` — bereits so).

---

## Tool-Karten — Design-Vorlage

Jede Karte:
- `border-radius: 10px`, `background: rgba(255,255,255,0.045)`
- `border-top: 2px solid <toolColor>`
- Header: Tool-Name (uppercase, in Toolfarbe) + `→ Öffnen`-Button (rechts, Toolfarbe mit 15% opacity background)
- Body: tool-spezifischer Inhalt
- **Default: zugeklappt** (`useState(false)`)
- Karte nur rendern wenn tatsächlich Daten für diesen Tag vorhanden

---

## Kognitiv-Karte

**Datenquelle:** `loadSessions().filter(s => s.date === dateKey)`

**Toolfarbe:** `getToolColor('kognitiv', toolColors)` (Default `#2DD4BF`)

**Link:** `setCurrentTab(TOOL_TAB.kognitiv)`

**Pro Session eine Zeile:**
- Oben: `✓` (in Toolfarbe) · Modulname (`MODULE_CONFIG[sess.moduleId].name`) · Uhrzeit (`startedAt` → `HH:MM`) · Dauer (`duration` Sek → `Xmin Ys`)
- Tags (darunter, eingerückt):
  - `<mainMetric><unit>` in Toolfarbe (z.B. `338ms Reaktion`)
  - Score-Zusammenfassung (z.B. `19 korrekt · 0 Fehler`)
  - Delta vs. vorherige Session — `getDelta(moduleId, mainMetric)` → positiv = `−Xms vs. vorher` (grün), negativ = `+Xms` (rose), kein Vorwert = kein Tag

---

## Gewicht-Karte

**Datenquelle:** `loadEntries().find(e => e.date === dateKey)` (ersetzt bisherige Gewicht-Sektion)

**Toolfarbe:** `getToolColor('gewicht', toolColors)`

**Link:** `setCurrentTab(TOOL_TAB.gewicht)`

**Inhalt:**
- Großer `kg`-Wert (22px, Toolfarbe) + Einheit
- Daneben kcal falls vorhanden (`entry.kcal`)

> Bisherige separate Gewicht-Sektion im DayPanel wird durch diese Karte ersetzt.

---

## Elvi-Karte

**Datenquelle:** `JSON.parse(localStorage.getItem('adhs_elvi_v1'))?.savedDays?.find(d => d.date === dateKey)`

**Toolfarbe:** `getToolColor('elvi', toolColors)` (Default `#00e5b8`)

**Link:** `setCurrentTab(TOOL_TAB.elvi)`

**Inhalt:**
- Dosis-Pills: je eine Pill pro Dosis (`time · mg` — z.B. `50mg · 08:00`)
- Ratings als Tags: Fokus, Stimmung, Crash, Impulsivität jeweils `Label X/10` (nur wenn rating vorhanden)
- Notes als kursiver Textblock mit linkem Akzentstreifen (nur wenn `notes` nicht leer)

---

## Reihenfolge im DayPanel

1. Zeitplan (unverändert)
2. Erledigt (nur Todos, default zugeklappt)
3. Kognitiv-Karte (wenn Sessions für den Tag, default zugeklappt)
4. Gewicht-Karte (wenn Eintrag für den Tag, default zugeklappt — ersetzt bisherige Gewicht-Sektion)
5. Elvi-Karte (wenn savedDay für den Tag, default zugeklappt)

---

## State-Management im DayPanel

`open`-State aktuell: `{ zeitplan: true, done: false, gewicht: true }`

Neu: `{ zeitplan: true, done: false, kognitiv: false, gewicht: false, elvi: false }`

Toggle per `setOpen(prev => ({ ...prev, [key]: !prev[key] }))` — unverändert.

---

## Neue Tools in Zukunft

Tool-Karte hinzufügen wenn:
- Tool schreibt tagesbezogene Historiendaten (wiederholbar pro Tag, rückblickend sinnvoll)
- Daten per `date === dateKey` abrufbar
- Tool hat einen TOOL_TAB-Eintrag

Vorlage: `ToolCard`-Komponente (inline in DayPanel oder extrahiert) mit Props `toolId`, `color`, `title`, `onOpen`, `children`.
