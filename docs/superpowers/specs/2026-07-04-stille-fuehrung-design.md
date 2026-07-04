# Stille Führung — Design (2026-07-04)

Ersetzt das App-Onboarding-Design vom 2026-07-02. Nach drei gescheiterten Tour-Versuchen
(18 Schritte → 7 Demo-Bühnen → interaktiver Coach) ist die Diagnose: **Das Format Tour ist
die Ursache**, nicht die Ausführung — Optik einer eigenen Overlay-Schicht bricht, alles
erklären heißt nichts betonen, Themenwechsel sind bei einer Tour eingebaut.

## Ziel

Neue Nutzer (konkrete Personen aus Jonas' Umfeld, ADHS-Zielgruppe, ohne Jonas daneben)
verstehen den Kern der App **beim Benutzen**, nicht vorab. Es gibt keine Tour mehr.
Erklärung passiert an vier kleinen, voneinander unabhängigen Stellen — jede wohnt im
normalen Layout an dem Ort, um den es geht. Alles ist später in einem Hilfe-Sheet
wiederfindbar (ADHS: Wiederfinden schlägt Merken).

**Erfolgskriterium:** Frischer Browser → 1 Willkommens-Screen → „Los geht's" → leerer
Pool sagt, was zu tun ist → Todo angelegt → Puls zeigt auf den Drag-Griff → gezogen →
Ruhe, für immer. Kein Overlay, nichts zu überspringen, keine gesperrte Eingabe.

## Leitentscheidungen

1. **Keine Tour, keine Demo-Bühnen, keine Coach-Overlays.** `AppBriefing/` und
   `AppOnboarding/` werden komplett gelöscht.
2. **Hinweise sitzen im Layout, nie darüber.** Kein Banner, das oben/unten andockt,
   kein Modal überm Modal, keine gemessenen Rects. Was nicht im normalen Fluss
   erklärbar ist, gehört ins Hilfe-Sheet.
3. **Genau ein gecoachter Moment:** die Drag-Geste Pool → Zeitplan. Sie ist die einzige
   nicht entdeckbare Mechanik der App. Alles andere: Empty-States, statische Untertitel,
   Einmal-Erklärkopf, Hilfe-Sheet.
4. **Ein Gedanke pro Hinweis.** Kein Hinweis transportiert zwei Botschaften.
5. **Tool-Vorstellung bleibt dezentral:** Erst-Briefings beim ersten Öffnen der großen
   Tools existieren und bleiben unverändert. Das Hilfe-Sheet listet alle Tools mit
   Einzeilern aus der Registry (generiert, veraltet nie).

## Die Bausteine

### 1. Willkommens-Screen (einziger First-Run-Screen)

- **Wann:** `!lv(SK.onboardingSeen)` beim App-Start (Gate in App.jsx, ersetzt den
  auskommentierten Auto-Start). Schließen setzt `SK.onboardingSeen = true`.
- **Was:** Vollbild in App-UI-Sprache (--surface, Gradient-CTA wie Tool-Briefings).
  Titel „Schön, dass du da bist". Text: „Sammle, was ansteht — und zieh es in deinen
  Tag. Alles bleibt auf deinem Gerät." Ein Button: **„Los geht's"**. Kein Skip-Link
  (der Button ist der Skip), keine Konfiguration, kein Karussell.
- **Wo:** `src/components/Willkommen/Willkommen.jsx` (+ module.css).
- Bestandsgeräte ohne gesetzten Key sehen den Screen einmal — bewusst ok (1 Tap).

### 2. Empty-States statt Erklär-Schritten

- **Pool leer, noch gar nichts angelegt** (`todos.length === 0`): „Über **+** legst
  du deine erste Aufgabe an." — Geist-Text an der Stelle des bestehenden
  Empty-States in Pool.jsx.
- **Pool leer, aber Einträge existieren/existierten:** bestehender Text
  „Alle Todos verplant ✓" bleibt.
- **Alle-Tools-Liste (TabTools):** statischer Geist-Untertitel unter dem Header:
  „Aus = taucht nirgends auf. An = in die App integriert." Kein Einmal-Mechanismus,
  kein Storage-Key — der Satz steht einfach da.

### 3. Drag-Hinweis (der eine Coach-Moment)

- **Trigger (alle gleichzeitig):** mindestens ein offenes Pool-Todo existiert UND
  noch nie irgendwo ein Slot platziert (`days` enthält keinen Tag mit ≥ 1 Slot —
  schließt Bestandsgeräte zuverlässig aus) UND `!lv(SK.dragHintSeen)` UND
  Tagesplaner zeigt heute (`viewDate === todayKey()`).
- **Darstellung:** Der Drag-Griff des **ersten** Pool-Chips bekommt eine Puls-Klasse
  (reine CSS-Animation am echten Element — kein Messen, kein Portal;
  `prefers-reduced-motion`: statische Hervorhebung statt Puls). Direkt unter dem
  Chip eine Inline-Zeile im normalen Layoutfluss: „Halte den Griff gedrückt und
  zieh die Aufgabe auf eine Uhrzeit" + ✕ zum Wegtippen.
- **Ende:** erster platzierter Slot oder ✕ → `sv(SK.dragHintSeen, true)`, Hinweis
  erscheint nie wieder. (Platzieren via Tap-auf-freie-Zeit/SlotSheet erfüllt das
  Prädikat genauso — auch dieser Weg beendet den Hinweis.)
- **Logik:** pure Prädikate in `src/features/calendar/Pool/hintLogic.js`
  (`hasOpenPoolTodo(todos)`, `hasAnySlot(days)` — robust gegen leere
  Tages-Objekte), einzeln getestet. UI-Anbindung in Pool.jsx.

### 4. Einmal-Erklärkopf auf der ersten Zeitablauf-Abfrage

- **Wo:** oben **im** bestehenden `MissedReviewModal`
  (`src/features/calendar/Zeitplan/MissedReviewModal.jsx`) als abgesetzter
  Geist-Block — kein zweites Modal, kein Overlay.
- **Wann:** gerendert solange `!lv(SK.missedHintSeen)` (Key existiert bereits,
  war nie verkabelt). Beim Schließen des Modals `sv(SK.missedHintSeen, true)`.
- **Text:** „Hier sammelt sich, was seine Zeit verpasst hat. Entscheide in Ruhe —
  **nichts geht verloren.**" (Die drei Aktionen erklären sich durch ihre Buttons.)

### 5. Hilfe-Sheet „Wie funktioniert die App?"

- **Wo:** Unteransicht der Einstellungen (`src/features/settings/Hilfe/Hilfe.jsx`),
  geöffnet über die bestehende Karte in TabSettings — Button-Text wird
  „Wie funktioniert die App?" (ersetzt „↻ Einführung nochmal ansehen").
  Navigation über lokalen State + `backInterceptor` (bestehendes Muster) —
  fühlt sich an wie jede Tool-Unteransicht, nicht wie ein Modal.
- **Form:** ruhige, scrollbare Karten. **Nur Text + vorhandene UI-Symbole** —
  keine Demo-Komponenten, keine Live-Bühnen, keine Illustrationen (v1).
- **Karten:**
  1. **Der Kern** — „Sammle Aufgaben im Pool. Halte eine am Griff und zieh sie
     auf eine Uhrzeit — das ist dein Tag."
  2. **Wenn Zeit abläuft** — die Abfrage, die drei Optionen, nichts geht verloren.
  3. **Kalender** — Woche: Blöcke frei über Tage und Zeiten ziehen. Monat: Überblick.
  4. **Der +-Knopf** — Auto-Erkennung („Einkaufen 30min wichtig"), Notiz-Modus.
  5. **Tools** — Konzept-Satz (aus/an) + Liste **aller** Tools mit Icon, Toolfarbe
     und der `description` aus der Tool-Registry (generiert).
  6. **Deine Daten** — offline auf dem Gerät; Backup: Einstellungen → Speicher.

## Storage

| Key | String | Kategorie | Zweck |
|-----|--------|-----------|-------|
| `SK.onboardingSeen` | (existiert) | einstellungen | Gate Willkommens-Screen |
| `SK.missedHintSeen` | (existiert) | einstellungen | Einmal-Erklärkopf Zeitablauf-Abfrage |
| `SK.dragHintSeen` | `adhs_drag_hint_seen` | einstellungen | Drag-Hinweis gesehen/weggetippt |
| `SK.appBriefingSeen` | (existiert) | einstellungen | LEGACY — nur Backup-Kompat |

`storage.test.js` (Anti-Drift) erzwingt die Registrierung von `dragHintSeen` automatisch.

## Was gelöscht wird

- `src/components/AppBriefing/` **komplett** (inkl. TapPulse — der Puls wird eine
  CSS-Klasse am echten Griff, keine Mess-Komponente).
- `src/components/AppOnboarding/` **komplett** (Controller, CoachBanner, CoachOverlay,
  TapPulse, onboardingSteps, onboardingLogic + beide Tests). Die brauchbare
  Prädikat-Idee lebt schlanker in `hintLogic.js` weiter.
- Store: `onboardingOpen`/`setOnboardingOpen` entfällt (Willkommen rendert über das
  Gate; Hilfe ist lokaler State in den Einstellungen).
- `data-onboarding="…"`-Attribute im src (per Grep finden, z. B. `add-fab` in App.jsx).
- `kontext/architektur.md` wird in derselben Änderung nachgezogen
  (neue Komponenten Willkommen/Hilfe, Löschungen).

## Tests

- **`hintLogic.test.js`:** Prädikate pur — frisches Profil (kein Slot je platziert),
  Bestandsprofil (irgendein Tag hat Slots), leere Tages-Objekte in `days`,
  Pool ohne offene Todos.
- **`storage.test.js`:** grün sobald `dragHintSeen` registriert ist (automatisch).
- **Manuelle Preview-Verifikation:** frisches Profil → kompletter Erfolgskriteriums-Lauf;
  Bestandsprofil → kein Drag-Hinweis, Willkommen genau einmal; Erklärkopf erscheint auf
  erster Zeitablauf-Abfrage und nie wieder; Hilfe-Sheet aus den Einstellungen; Light Mode
  + `prefers-reduced-motion` stichprobenartig.

## Bewusst weggelassen

Tour jeder Art (auch „Mini-Tour"), Wiederaufruf einer Tour aus den Einstellungen
(ersetzt durchs Hilfe-Sheet), Demo-Bühnen/Live-Komponenten im Sheet, Illustrationen
im Sheet (nachrüstbar, wenn Text nachweislich nicht reicht), Einmal-Hinweis im
Tools-Tab (statischer Untertitel stattdessen), Coach für Woche/Monat und +-Fenster
(Sheet reicht), Onboarding-Fortschritts-Persistierung (gegenstandslos).
