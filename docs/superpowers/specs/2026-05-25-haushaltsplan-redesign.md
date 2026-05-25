# Haushaltsplan — Redesign Spec
_2026-05-25_

## Zusammenfassung

Das bestehende Haushalt-Tool wird um drei Dinge erweitert:
1. **Briefing** — ein Onboarding-Wizard der beim ersten Öffnen führt und jederzeit neu gestartet werden kann
2. **Übersicht** — die Hauptansicht wird zur motivierenden Echtzeit-Ansicht mit Segment-Balken pro Aufgabe
3. **Energie-Filter** — Normal / Low Energy direkt in der Übersicht, visueller Filter ohne Tab-Wechsel

---

## Betroffene Dateien

- `src/features/tools/haushalt/haushaltData.js` — Datenmodell + Logik
- `src/features/tools/haushalt/TabHaushalt.jsx` — Hauptkomponente
- `src/features/tools/haushalt/TabHaushalt.module.css` — Styles
- `src/features/tools/haushalt/HaushaltSection.jsx` — Raum-Karte (anpassen)
- `src/features/tools/haushalt/HaushaltSection.module.css`
- `src/features/tools/haushalt/HaushaltBriefing.jsx` — NEU
- `src/features/tools/haushalt/HaushaltBriefing.module.css` — NEU

---

## 1. Navigation & Struktur

**Vorher:** 2 Tabs — Queue · Räume  
**Nachher:** Keine Tabs. Eine einzige Ansicht: die Übersicht.

Die Übersicht enthält:
- Energie-Selector (oben)
- Ring-Score
- Raum-Karten mit Aufgaben-Balken
- Direktes Abhaken / Resetten
- Bearbeiten per Stift-Icon

Der bisherige Queue-Tab, Zeitbudget-Selector und Räume-Tab entfallen komplett.

---

## 2. Übersicht

### Energie-Selector
Zwei Buttons oben: `⚡ Normal` · `🪫 Low Energy`  
Gespeicherter UI-State via `SK` (eigener Eintrag `adhs_haushalt_energie`), kein Teil des Konfig-Objekts.

- **Normal:** alle Tasks voll sichtbar
- **Low Energy:** Tasks mit `lowEnergy: true` leuchten normal, alle anderen auf `opacity: 0.3` gedimmt + kein ✓-Button (nicht abhakbar wenn gedimmt)

### Ring-Score
Kreis oben mit Prozentzahl. Berechnung: Anteil der Tasks deren Urgency < 1.0.  
Farbe: grün (≥70%) · gelb (40–69%) · rot (<40%).  
Darunter: kurzer Text z.B. "Wohnung im Griff" / "Einiges liegt" / "Chaos-Modus".

### Raum-Karten
Jede Karte zeigt:
- Icon + Raumname + Status-Badge (ok / bald fällig / überfällig)
- Auf-/Zugeklappt per Tap auf den Header
- Stift-Icon im Header → Inline-Edit-Modus (Task hinzufügen, entfernen, Frequenz ändern, Low-Energy-Flag setzen)

### Aufgaben-Zeile
Pro Task innerhalb einer Karte:
- Aufgabenname + optionales 🪫-Badge wenn `lowEnergy: true`
- Fälligkeits-Label rechts (z.B. "in 2 Tagen" / "morgen" / "überfällig")
- Segment-Balken: N Kästchen = N Tage der Periode. Gefüllte Kästchen = vergangene Tage. Farbe: grün→gelb→rot je nach Füllstand. Überfällig = alle Kästchen rot + leichter Glow.
- ✓-Button → setzt `lastDone = heute`, Balken leert sich
- (Reset-Button im Edit-Modus → setzt `lastDone = null`)

---

## 3. Briefing-Wizard

### Trigger
- **Automatisch:** wenn `config.briefingDone === false` (erster Start)
- **Manuell:** kleiner "Setup neu starten"-Link in der Übersicht (z.B. im Footer oder als ⓘ-Icon)

### Overlay
Vollbild-Overlay über der Übersicht. Fortschrittsanzeige oben (Schritt X / 4).

### Schritt 1 — Willkommen
- Kurze Erklärung des Tools (3–4 Sätze)
- Was bedeuten die Balken, was ist Low Energy, wie abhaken
- Kleines visuelles Beispiel (1 Raum mit 2 Tasks)

### Schritt 2 — Räume einrichten
- Default-Räume vorgeschlagen: Küche 🍳, Bad 🚿, Wohnzimmer 🛋, Schlafzimmer 🛏, Flur 🚪
- User kann Räume entfernen (✕) oder neue hinzufügen (Name + Icon)
- Tasks innerhalb der Räume nur lesbar sichtbar — Detailanpassung später über Stift-Icon

### Schritt 3 — Was ist gerade erledigt?
- Alle Tasks aller Räume aufgelistet mit Checkbox "gerade frisch erledigt"
- Abgehakt → `lastDone = heute` → Task startet mit leerem Balken (frisch)
- Nicht abgehakt → `lastDone` bleibt `null` → erscheint in Übersicht sofort als überfällig

Hinweis-Text: "Alles was du nicht abhakst startet als offen — so siehst du sofort was als erstes dran ist."

### Schritt 4 — Wie planst du Putzen?
Zwei Optionen:
- 🗓 **Verteilt über die Woche** (`distribution: 'spread'`) — Tasks werden nach Fälligkeit angezeigt, kein bestimmter Tag
- 🧹 **Großputztag** (`distribution: 'block'`) — Tasks sammeln sich, ideal für einen fixen Wochentag

Nach Auswahl: `config.briefingDone = true` setzen, Overlay schließen.

---

## 4. Datenmodell-Änderungen

### Task — neues Feld
```js
lowEnergy: false,  // boolean
```

### Config — neue Felder
```js
briefingDone: false,       // boolean
distribution: 'spread',    // 'spread' | 'block'
```

### Config — entferntes Feld
```js
// energie: 'normal'  → entfällt, wird zu lokalem UI-State in TabHaushalt
```

### haushaltData.js — Logik-Änderungen

**`daysSince(null)`:** Gibt bisher `-1` zurück (= unsichtbar). Neu: `null` bedeutet "nie erledigt" = `freqToDays(task) * 2` Tage vergangen → Task erscheint sofort als überfällig.

**Entfernt:**
- `calcZustand()` + `ZUSTAND_META`
- `buildSmartQueue()`
- `ENERGIE_META`

**Neu:**
- `calcRingScore(rooms)` → Zahl 0–100: Anteil Tasks mit Urgency < 1.0
- `taskSegments(task)` → `{ filled: number, total: number, color: string }` für Segment-Balken

### Migration
`loadHaushalt()` prüft ob `briefingDone` fehlt:
- Fehlt + **keine** gespeicherten Rooms-Daten → `briefingDone: false` (echter Erststart)
- Fehlt + **vorhandene** Rooms-Daten → `briefingDone: true` (Bestandsnutzer, kein erneutes Briefing)

Fehlende `lowEnergy`-Felder an Tasks werden auf `false` gesetzt (defaults).

---

## 5. Nicht im Scope

- Tagesplaner-Integration (kein automatisches Einplanen)
- Kalender-Integration (`integrated: false` bleibt)
- Benachrichtigungen / Reminder
- Statistiken / Verlauf

---

## 6. Offene Fragen (für Implementierung irrelevant)

- Großputztag-Modus: konkret an welchem Wochentag? → erstmal nur Flag, kein Datum nötig
