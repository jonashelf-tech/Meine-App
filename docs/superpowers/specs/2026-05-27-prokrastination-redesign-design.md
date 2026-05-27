# Prokrastination-Tool — Redesign

**Datum:** 2026-05-27  
**Status:** Approved

---

## Kontext

Das bestehende Prokrastination-Tool zeigt bei alten Todos eine Auswahl von Reason-Cards (z.B. "Mir fehlt Energie") und generiert daraus automatisch vage Sub-Todos. Der Flow ist eine Sackgasse: keine echte Reflexion, keine Verbindung zwischen Ursache und nächsten Schritten. Das Redesign ersetzt diesen Ansatz mit einem geführten, sequenziellen 4-Screen-Flow.

---

## Modal-Flow (4 Screens)

### Screen 1 — Relevanz
**Frage:** „Möchtest du das angehen — oder willst du es loslassen?"  
**Tagline (klein darunter):** „Die falsche Entscheidung ist nur keine."

Buttons:
- `[Angehen ✓]` → weiter zu Screen 2
- `[Loslassen & löschen]` → Todo wird gelöscht, Modal schließt

### Screen 2 — Hindernis
**Frage:** „Was ist gerade dein größter ‚Gegner' dabei?"  
**Sub-Text:** „Kurz und ehrlich. Kein perfekter Satz nötig."

- Freitext-Input (optional)
- Statischer Tipp unter dem Input: 🤝 *„Tipp: Kannst du genau diesen einen Punkt abgeben? Manchmal braucht es nur eine kurze Frage an die richtige Person."*
- `[Weiter →]` / `[Überspringen]`
- Eingabe wird in **lokalem Modal-State** gehalten (noch nicht gespeichert)

### Screen 3 — Wert
**Frage:** „Was wird konkret besser, wenn es erledigt ist?"  
**Sub-Text:** „Nicht was es kostet — was du gewinnst."

- Freitext-Input (optional)
- `[Weiter →]` / `[Überspringen]`
- Eingabe wird in **lokalem Modal-State** gehalten (noch nicht gespeichert)

### Screen 4 — Schritte
**Überschrift:** „Zerleg es in die kleinsten möglichen Schritte:"

- Der TodoChip wird **direkt im Modal simuliert** — visuell identisch zum echten Chip (inkl. Ring-Badge)
- Darunter: Sub-Item-Liste + Eingabezeile (`+ Schritt hinzufügen…` + `+`-Button)
- Ring-Badge aktualisiert sich live mit der Anzahl der hinzugefügten Schritte
- Kein Mindest- oder Maximalwert für Schritte
- `[Fertig ✓]` → speichert alle Sub-Items + lokalen `klaerenHindernis`/`klaerenWert`-State am Todo, Modal schließt
- Modal schließen vor Screen 4 (X / Overlay-Tap) → **nichts wird gespeichert**

**Fortschritts-Dots** (1–4) auf jedem Screen sichtbar.

---

## Datenmodell

Zwei neue optionale Felder am Todo-Objekt:

```js
{
  klaerenHindernis: string | undefined,
  klaerenWert:      string | undefined,
}
```

Bestehende Felder (`subItems`, etc.) unverändert. Sub-Items aus Screen 4 werden zu `todo.subItems` hinzugefügt (append, nicht ersetzen).

---

## Chip-Button (Prokrastination-Trigger)

**Form:** Kreis-Badge (34×34 px)  
**Inhalt:** Alter in Tagen (`87` oben, `Tage` klein darunter)  
**Farbe:** immer `#34D399` (Prokrastination-Toolfarbe), kein Farbwechsel mit Alter  
**Position:** direkt links vom `✕`-Button im TodoChip  
**Sichtbarkeit:** nur wenn `!todo.done && alter >= schwelle`

Der restliche TodoChip bleibt **unverändert** — es wird nur dieser Kreis eingefügt.

**Betroffene Dateien:**
- `TodoChip.jsx` — Kreis-Element einfügen
- `TodoChip.module.css` — Stil für `.klaerenCircle`

---

## Hindernis & Wert — Anzeige im ausgeklappten Chip

Wenn `todo.klaerenHindernis` oder `todo.klaerenWert` gesetzt sind, erscheint nach den Sub-Item-Zeilen eine **Mint-Card**:

- Voller Border: `rgba(52,211,153,0.35)`
- Hintergrund: `rgba(52,211,153,0.05)`
- Je eine Zeile für Hindernis (🏔) und Wert (✨) mit Label und Text
- Trennlinie zwischen den beiden Zeilen
- Zeile wird nur gerendert wenn das jeweilige Feld gefüllt ist

**Betroffene Dateien:**
- `TodoChip.jsx` — Mint-Card nach Sub-Items rendern
- `TodoChip.module.css` — Stile `.klaerenContext`, `.klaerenRow`, `.klaerenLabel`, `.klaerenText`

---

## Settings (in TabKlaeren, ausklappbar)

Am unteren Ende des Prokrastination-Tabs: ein ausklappbarer „⚙ Einstellungen"-Bereich.

Einstellungen:
1. **Schwelle** — Anzahl Tage ab der der Kreis-Badge erscheint (Standard: 30, Zahlen-Input)
2. **Farbe** — Farbe des Age-Borders/Textes auf alten TodoChips (Preset-Swatches, kein freier Picker)
   - Betrifft die bestehenden `s.chipOld` und `s.ageTagOld` Styles in `TodoChip.module.css` — werden von hartcodierten Farben auf `ageColor` aus dem Store umgestellt

Gespeichert in Zustand: `useAppStore` → neues Feld `klaerenSettings: { threshold: number, ageColor: string }`.

**Betroffene Dateien:**
- `TabKlaeren.jsx` — Settings-Sektion
- `TabKlaeren.module.css` — Stile
- `store.js` — `klaerenSettings` State + Setter
- `TodoChip.jsx` — `threshold` und `ageColor` aus Store lesen

---

## Was sich NICHT ändert

- Alle bestehenden Reason-Cards und `AUTO_SUBITEMS` in `KlaerenModal.jsx` werden **komplett ersetzt**
- `KlaerenModal.jsx` wird neu geschrieben (nicht erweitert)
- `TabKlaeren.jsx` bleibt strukturell gleich, bekommt Settings-Sektion
- Alle anderen TodoChip-Props, Styles und Layouts bleiben unberührt

---

## Betroffene Dateien (Zusammenfassung)

| Datei | Änderung |
|---|---|
| `KlaerenModal.jsx` | Komplett neu: 4-Screen-Flow |
| `KlaerenModal.module.css` | Anpassung an neuen Flow |
| `TabKlaeren.jsx` | Settings-Sektion hinzufügen |
| `TabKlaeren.module.css` | Settings-Styles |
| `TodoChip.jsx` | Kreis-Badge + Mint-Card einfügen |
| `TodoChip.module.css` | Neue Klassen für Badge + Card |
| `store.js` | `klaerenSettings` State |
