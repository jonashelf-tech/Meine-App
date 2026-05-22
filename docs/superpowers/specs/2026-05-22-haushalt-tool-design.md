# Haushalt-Tool — Design Spec
**Datum:** 2026-05-22  
**Status:** Approved

---

## 1. Ziel

Ein neurodivergenzfreundliches Haushalts-Tool das sich wie ein unterstützendes Regulationssystem anfühlt — nicht wie eine klassische Putz-App oder ToDo-Liste.

Kernprinzipien:
- Minimale mentale Last beim Einstieg
- Positive Verstärkung, kein Shame/Druck
- Kleine Fortschritte sichtbar machen
- Funktioniert ohne Setup, ist aber maximal konfigurierbar
- Rückstände werden intern getrackt, aber nie als "überfällig X Tage" angezeigt

---

## 2. Architektur: Zwei Einstiegspunkte

### 2a. Tagesplaner-Integration (primärer täglicher Einstieg)

Die Haushalt-Card lebt als Teil eines **einheitlichen Tool-Section-Patterns** im Tagesplaner (unterhalb des Zeitplans), das für alle integrierten Tools gilt.

**Einheitliches Card-Pattern (gilt für alle Tools):**
- Jedes Tool bekommt eine Card mit: Icon + Tool-Name (als Direktlink ↗ ins Tool) + Badge-Indikator + Chevron
- Standard: zugeklappt, Badge zeigt Anzahl offener Items auch im zugeklappten Zustand
- Todos-Card: standardmäßig aufgeklappt
- Aufgeklappt: TodoChips in identischer Optik wie überall in der App (Stripe links, Expand-Button, PrioBadge rechts)
- Footer: ein „Zur Todoliste übertragen"-Button

**Haushalt-Card spezifisch:**
- Badge zeigt „Modus wählen" wenn noch kein Modus gewählt wurde
- Aufgeklappt: Drei Modus-Chips (🛡 Survival / 🔄 Maintain / ✨ Boost) → Auswahl generiert TodoChips direkt in der Card
- Badge aktualisiert sich auf gewählten Modus + Anzahl Tasks
- „Zur Todoliste übertragen" → schreibt Tasks als `createBlock()`-Objekte in den Pool; Tasks mit Uhrzeit → direkt als Zeitplan-Slot
- Nach Transfer: Badge wechselt auf „✓ übertragen", Chips werden inaktiv
- Tagesplaner öffnen = Modus noch nicht gewählt → User wählt aktiv (kein Auto-Generate)

**Datenfluss Transfer:**
```
Modus wählen → TodoChips in Card → "Übertragen" →
  ohne Uhrzeit → todos[] (Pool)
  mit Uhrzeit  → days[today][slotKey]
```
ClockPopup und Auto-Return greifen danach automatisch (bereits implementiert).

---

### 2b. Standalone Tool — Tab 13

Tab-ID: `haushalt`, Tab-Nummer: 13

**Header:** Standard `ToolHeader` mit Titel „Haus*halt*"

**Zwei Views via Tab-Strip:**

#### Queue-View (Standard)
1. **Modus-Strip** — 3 große Buttons (Survival / Maintain / Boost), einer immer aktiv, farbig hervorgehoben
2. **Zeit-Schnellwahl** — Label „Ich hab gerade…", 4 Buttons: `5 min | 15 min | 30 min | 1h+`
3. **Smart Queue** — dynamisch gefilterte TodoChip-Liste basierend auf Modus + Zeit

#### Räume-View
- Raumkarten (aufklappbar) mit Status-Badge: „jetzt dran" (rose) / „bald dran" (violet) / „erledigt" (emerald)
- Jeder Raum: Liste seiner Tasks mit Frequenz
- „+ Raum hinzufügen" am Ende
- Alle Räume, Tasks, Frequenzen editierbar/streichbar

---

## 3. Drei Modi

| Modus | Farbe | Philosophie | Beispiel-Tasks |
|---|---|---|---|
| 🛡 Survival | rose `#fb7185` | Wohnung bewohnbar halten | Müll, Küche basics |
| 🔄 Maintain | violet `#8B5CF6` | Regelmäßige Routine halten | Küche, Bad, Staubsaugen |
| ✨ Boost | emerald `#10B981` | Tief sauber, optional perfekt | Fenster, Kühlschrank, Wischen |

`minMode` bestimmt den *Mindestschwellenwert* ab dem ein Task erscheint — nicht den exklusiven Modus. Ein Task mit `minMode: 'survival'` erscheint in allen drei Modi. Ein Task mit `minMode: 'boost'` erscheint nur im Boost-Modus. Survival-Tasks sind damit immer sichtbar, Boost-Tasks nur wenn der Nutzer das aktiv will.

---

## 4. Datenmodell

### HaushaltConfig (Storage Key: `SK.haushalt`)
```js
{
  rooms: [
    {
      id: string,
      name: string,         // "Küche"
      icon: string,         // "🍳" — nur hier erlaubt (kein SVG-Icon nötig)
      tasks: [
        {
          id: string,
          text: string,           // "Herd abwischen"
          duration: number,       // Minuten
          freq: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom',
          customDays: number,     // nur bei freq='custom'
          minMode: 'survival' | 'maintain' | 'boost',  // ab welchem Modus sichtbar
          lastDone: string | null, // ISO date "2026-05-20"
          subItems: [{ id, text }], // optionale Sub-Tasks (createBlock subItems)
        }
      ]
    }
  ],
  selectedMode: 'survival' | 'maintain' | 'boost',  // letzter Modus im Tagesplaner
  // Reset-Logik: DEFAULT_CONFIG wird als Konstante im Code gehalten (nicht in Storage).
  // "Auf Standard zurücksetzen" überschreibt rooms[] mit DEFAULT_ROOMS aus der Konstante.
}
```

### Smart Queue Algorithmus
```
Input: modus, zeitBudget (Minuten)
1. Alle Tasks filtern: task.minMode <= modus (Survival ≤ Maintain ≤ Boost)
2. Fälligkeit berechnen: daysSince(task.lastDone) >= freq.days → priorität hoch
3. Sortieren: fällige Tasks zuerst, dann nach Priorität, dann nach Raum-Rotation
4. Greedy-Fit: Tasks akkumulieren bis zeitBudget erreicht
5. Output: Liste von Tasks → werden als TodoChips dargestellt
```
**Wichtig:** Keine "X Tage überfällig"-Anzeige. Tasks erscheinen einfach wenn sie dran sind.

---

## 5. Default-Konfiguration (Out-of-the-Box)

### Räume
- Küche, Bad, Wohnzimmer, Schlafzimmer, Flur

### Default-Tasks pro Raum (Auswahl)
| Raum | Task | Freq | minMode |
|---|---|---|---|
| Küche | Abwasch / Spülmaschine | täglich | survival |
| Küche | Müll rausbringen | 2× wöchentlich | survival |
| Küche | Herd abwischen | wöchentlich | maintain |
| Küche | Kühlschrank ausräumen | monatlich | boost |
| Bad | WC reinigen | wöchentlich | maintain |
| Bad | Waschbecken | wöchentlich | maintain |
| Bad | Dusche/Wanne | wöchentlich | boost |
| Wohnzimmer | Aufräumen | wöchentlich | survival |
| Wohnzimmer | Fenster putzen | monatlich | boost |
| Schlafzimmer | Bett machen | täglich | survival |
| Schlafzimmer | Staubsaugen | wöchentlich | maintain |
| Flur | Staubsaugen | wöchentlich | maintain |
| Flur | Boden wischen | 2× wöchentlich | boost |

---

## 6. Konfigurierbarkeit

Alles im Räume-View editierbar:
- Räume hinzufügen / umbenennen / löschen
- Tasks hinzufügen / bearbeiten / löschen
- Frequenz ändern
- `minMode` ändern (ab welchem Modus ein Task erscheint)
- Sub-Tasks definieren

**Reset-System:**
- Pro-Modus-Reset in den Modus-Einstellungen: „Auf Standard zurücksetzen" (betrifft nur diesen Modus)
- Globaler Reset tief in Tool-Einstellungen, hinter Bestätigung: „Alle Anpassungen zurücksetzen?"

---

## 7. Integration ins bestehende System

**Storage:** `sv/lv/SK` aus `storage/index.js`, neuer Key `SK.haushalt`  
**Todos:** `createBlock()` aus `Block.js`, `subItems` für Sub-Tasks  
**Zeitplan:** `setDays()` aus Store, Slot-Format aus kern.md  
**ClockPopup:** greift automatisch für Slots mit Uhrzeit (bereits implementiert)  
**Auto-Return:** greift automatisch für unerledigte text-only Slots (bereits implementiert)  
**Tab-Routing:** `TOOL_TAB.haushalt = 13` in `toolTabs.js`  

---

## 8. Out of Scope (diese Version)

- XP / Gamification-Integration → spätere Erweiterung
- Streak-Tracking / Statistiken
- Push-Notifications
- Mehrere Profile / Haushalte
- KI-generierte Task-Vorschläge

---

## 9. Implementierungs-Phasen

**Phase 1 — Tagesplaner-Integration**
1. Einheitliches `ToolSection`-Pattern als wiederverwendbare Komponente
2. `HaushaltSection.jsx` in TabHeute (analog zu ReminderSection)
3. Modus-Wahl → Task-Generierung → Transfer in Pool/Zeitplan
4. Bestehende `ReminderSection` auf neue Komponente migrieren

**Phase 2 — Standalone Tool**
1. `src/features/tools/haushalt/TabHaushalt.jsx` + CSS
2. Queue-View mit Modus-Strip + Zeit-Schnellwahl + Smart Queue
3. Räume-View mit Raumkarten + Task-Listen
4. Storage + Default-Konfiguration
5. Tab-Registry (toolRegistry.js + toolTabs.js + App.jsx)

**Phase 3 — Konfiguration**
1. Räume/Tasks CRUD im Räume-View
2. Pro-Modus-Reset + globaler Reset
