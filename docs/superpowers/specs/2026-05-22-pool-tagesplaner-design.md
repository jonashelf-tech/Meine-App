# Pool & Tagesplaner — Redesign Spec
**Datum:** 2026-05-22  
**Status:** Abgenommen  
**Betroffene Dateien:** `Pool.jsx`, `Pool.module.css`, `TabHeute.jsx`

---

## Ziel

Pool und Tagesplaner werden vereinfacht: zwei getrennte Listen (Heute relevant / Offen) werden zu einer einzigen, sortierten Liste zusammengeführt. Done-Verhalten wird konsistent mit dem Zeitplan. Alles bleibt in einem Panel — kein Overlay, kein Kontextwechsel.

---

## 1. Pool — Struktur

### Eine Liste, keine Gruppen
Die bisherigen Gruppen „Heute relevant" und „Offen" mit ihren klappbaren Headern (`Group`-Komponente) werden entfernt. Es gibt eine einzige kombinierte Liste aller offenen Todos.

### Sortierung
**Standard (default) — zwei Gruppen, innerhalb sortiert:**

**Gruppe A — Fällig:** `isFaelligkeit(t) && t.date <= todayKey()` (heute oder vergangen)
→ sortiert nach Prio (1→2→3), bei gleicher Prio nach `createdAt` aufsteigend

**Gruppe B — Rest:** alle anderen offenen Todos
→ sortiert nach Prio (1→2→3), bei gleicher Prio nach `createdAt` aufsteigend

Kurzformel: Fällige zuerst, dann nach Priorität, immer ältere vor neueren bei Gleichstand.

**Weitere Sortieroptionen (Chips im Header):**
- **Kategorie** — gruppiert nach `todo.category` (alphabetisch), keine Kategorie ans Ende
- **Alter** — nach `createdAt` absteigend (neueste zuerst)

### Anzahl
- Standardmäßig werden **maximal 10 Einträge** angezeigt
- Wenn mehr vorhanden: Button „Weitere anzeigen +N ▾" am Ende der Liste
- Klick darauf zeigt alle Einträge (kein erneutes Einklappen nötig)

### Default-Zustand
- Pool ist beim Öffnen des Tagesplaner-Tabs **immer aufgeklappt** (`useState(true)` in Pool)
- Collapse-Button (`▾`) im Header klappt ihn zu

---

## 2. Done-Verhalten

### Abhaken im Pool
- Antippen → `onToggleDone(id)` aufrufen (setzt `done: true`, `doneAt: new Date().toISOString()`)
- Gleichzeitig: `pendingDoneIds.add(id)` im lokalen Pool-State
- Visuell: grüner Flash-Effekt (identisch zu Zeitplan, `doneFlash`-Keyframe 650ms) → danach Strikethrough + reduzierte Opacity
- Todo **bleibt an seiner Stelle** in der aktiven Liste bis „Aufräumen" gedrückt wird
- Optik der Done-Chips: identisch zum Zeitplan — aktuelle Implementierung beim Entwickeln prüfen

### Aufräumen-Button
- Erscheint **nur** wenn `pendingDoneIds.size > 0`
- Position: unter der aktiven Liste, rechtsbündig
- Label: `✓ Aufräumen` + Zahl-Badge
- Aktion: `pendingDoneIds` leeren → abgehakte Todos verschwinden aus der aktiven Liste
- Die Todos selbst bleiben unverändert im Store (`done: true, doneAt: ISO`) — kein Datenverlust

### pendingDoneIds
- Lokaler `useState(new Set())` im Pool — **nicht** im Store, **nicht** in localStorage
- Resettet sich beim Tab-Wechsel / Unmount (gewollt — sauberer Neustart)

---

## 3. „Erledigt heute" Abschnitt

### Datenquelle
```js
todos.filter(t => t.done && t.doneAt?.startsWith(todayKey()))
```
Identisch zur Quelle des DayPanels im Kalender — **kein neuer Storage-Key**.

### Darstellung
- Immer am Ende des Pools sichtbar (unter der aktiven Liste)
- Optisch wie abgehakte Todos: Strikethrough, gedimmter Stripe (grünlich), reduzierte Opacity
- Anzeige der Uhrzeit als Meta-Info: `doneAt` → `HH:MM`
- Abschnitt-Header: „✓ Erledigt heute" + kleiner Hinweis „Antippen = rückgängig"
- Wenn leer: kleiner Leer-Hinweis (z.B. `Noch nichts erledigt`)

### Rückgängig machen
- Antippen eines erledigten Todos → `done: false, doneAt: null`
- Todo erscheint sofort wieder in der aktiven Liste

---

## 4. Betroffene Dateien & Änderungen

| Datei | Änderung |
|---|---|
| `Pool.jsx` | Kompletter Umbau — Group raus, neue Sortierlogik, pendingDoneIds, Weitere-anzeigen, Aufräumen, Erledigt-Sektion, Sort-Chips |
| `Pool.module.css` | Neue Styles für Sort-Chips, Expand-Button, Aufräumen, Erledigt-Sektion |
| `TabHeute.jsx` | `handleToggleDone` prüfen: setzt `doneAt` korrekt; Pool-Props anpassen |
| `TodoChip.jsx` | Nicht anfassen |
| `TodoChip.module.css` | Nicht anfassen |
| `store/index.js` | Keine Änderung |
| `storage/index.js` | Kein neuer SK-Key |
| `TabKalender.jsx` | Keine Änderung — DayPanel zeigt done+doneAt-Todos weiterhin korrekt |

---

## 5. Nicht in Scope

- Zeitplan-Komponente bleibt unverändert
- Drag & Drop Logik bleibt unverändert
- QuickAdd bleibt unverändert
- Kein neues Datenmodell / keine Migration

---

## 6. Optik-Hinweis

Bei der Implementierung: aktuelle Chip-Optik aus dem Zeitplan (`Zeitplan.jsx` / zugehörige CSS) als Referenz nehmen — nicht die alte `TodoChip.module.css` blind übernehmen, da sich Chips optisch verändert haben könnten.
