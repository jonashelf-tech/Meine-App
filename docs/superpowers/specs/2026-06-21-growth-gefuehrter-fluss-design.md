# Growth — Geführter Fluss (Redesign der Tagesansicht)

**Datum:** 2026-06-21
**Status:** Freigegeben (Design via Visual-Companion bestätigt)
**Bereich:** `src/features/tools/growth/` · Tool-Tab „Growth"

---

## Problem

Die Tagesansicht legt heute alles gleichzeitig auf einen Screen (Check-in, Opener,
Tageskarte, Bonus, Freitext, Archiv). Funktional, aber „hier friss" — kalt, ohne
Übergänge, kein Fokus. Gewünscht: ein **geführter Fluss**, ein Fenster nach dem
anderen, mit hochwertigen Übergängen und einem belohnenden Abschluss. Ruhezustand =
eine **Übersicht** (heutiger Tag + frühere Tage).

**Warum das passt (ADHS):** Eine Sache pro Screen senkt Entscheidungslast und
Aktivierungsenergie. Die Mini-Aufgabe (Check-in) wird an einen beruhigenden Anker
(Atemkreis) gekoppelt — das Langweilige reitet auf dem Beruhigenden mit.

---

## Leitplanken

- **Geführt, nie gefangen:** „Überspringen" an jedem Schritt, „Weiter" jederzeit
  sofort. Kein Zwang-Timer.
- **Keine externen Libs** (kein framer-motion): CSS-Animationen + kleine
  React-State-Machine.
- **vars.css-Variablen statt Hex**, `var(--font)`/`var(--font-num)`, **SVG-Icons**
  statt Emojis (Haken, Pfeile), Touch-Targets ≥ 44px für Primäraktionen.
- **`prefers-reduced-motion`** respektiert (globale Regel greift; Stepper-Commit
  zusätzlich timeout-gesichert).
- Daten nur über `sv/lv/SK` bzw. die bestehenden Store-Helfer; additive, sync-sichere
  Änderungen (keine Zähler/Geräte-Annahmen).

---

## Flow — Screen für Screen (nur „heute", wenn frisch)

1. **Ankommen + Check-in (verschmolzen).** Atemkreis (4 s ein / 6 s aus) mit sanftem
   2-Minuten-Ring (ambient, **kein Gate**) + rotierende Opener-Worte; darunter der
   Check-in Schlaf/Energie/Stimmung. Man lässt sich drauf ein **oder** tippt den
   Check-in **oder** überspringt. Die **Atem-Ebene** erscheint nur bei
   `settings.openerAn`; ist sie aus, bleibt ein ruhiger Check-in (kein Kreis/Timer).
2. **Karte.** Die Tageskarte (`frage` | `aufgabe` | `timer-aufgabe`), „Warum?"-
   Aufklapper, Antwortfeld (Autosave), Erledigt-/Timer-Button wo zutreffend.
3. **Bonus (optional).** „Magst du noch eine Karte ziehen?" → Ja zieht eine weitere
   Karte (max. 3 gesamt) und zeigt sie als weitere Karten-Screen, dann zurück zur
   Bonus-Frage; Nein → Freitext.
4. **Freitext.** „Sonst noch was im Kopf?" (Autosave).
5. **Abschluss.** Die letzte Karte faltet sich zu einem grünen Haken, ein Ring pulst
   kurz (Dopamin-Klick), dann enthüllt sich die Übersicht (gestaffelt).

Oben läuft ein dezenter **Fortschritts-Punkt-Indikator** (Basisschritte; Bonus zählt
als Extra). „Überspringen" oder „Fertig" springt an **jedem** Schritt direkt zur
Übersicht.

---

## Übersicht (Ruhezustand)

- **Kopf:** Datum + Affirmation „Du warst heute da." + Haken (SVG).
- **Blöcke**, je antippbar → **inline bearbeiten** (kein erneuter Wizard), solange der
  Tag editierbar ist (≤ 3 Tage, bestehende `isEditable`-Regel):
  - Check-in (Schlaf/Energie/Stimmung)
  - Karte + deine Antwort (bei `aufgabe` zusätzlich Erledigt-Status)
  - Freitext (falls vorhanden)
- **„+ Noch eine Karte ziehen?"** wenn berechtigt (Tageskarte beantwortet, < 3 Karten).
- **„Frühere Tage"** als Karten-Strip (Datum, Stimmungsfarbe, erste Zeile) → öffnet
  diesen Tag als dieselbe Übersicht, **lesend** (bzw. ≤ 3 Tage editierbar).
- **KI-Export** unten dezent, wenn `settings.kiExportAn`.
- **Leerzustand** (alles übersprungen, kein Eintrag): ruhiger Hinweis „Heute noch
  nichts festgehalten" + „Loslegen →" startet den Fluss.

---

## Eintrittslogik (View-Mode)

Reine Funktion `growthViewMode(data, viewDate, today, editable)` → `'flow' | 'overview'`:

- `viewDate !== today` → `'overview'` (lesend; inline editierbar nur wenn `isEditable`).
- `viewDate === today`:
  - `'flow'`, wenn der Tag **frisch** ist (`!day?.flowAbgeschlossen && !dayHasEntry(day)`).
  - sonst `'overview'`.
- Aus der Übersicht startet „Loslegen →" / „Durchgehen" den Fluss erneut (lokaler
  UI-State in `GrowthFlow`, ohne das Flag zu löschen).

So landet man beim erneuten Öffnen am selben Tag direkt auf der Übersicht, nicht wieder
im Fluss.

---

## Animations-System („Tiefe")

- **`FlowStepper`** (eigene Komponente): hält `displayedStep`, `pendingStep`,
  `direction`. Bei Step-Wechsel werden kurz beide gerendert:
  - **Alt (`.leaving`):** `scale(.86) translateY(-12px)`, Fade-out — tritt zurück.
  - **Neu (`.entering`):** `translateY(46px) scale(.98)` → `0 / 1`, Fade-in — steigt auf.
  - Easing `cubic-bezier(.34, 1.3, .5, 1)`, ~420 ms. Commit per `onAnimationEnd` **mit
    Timeout-Fallback**; bei `reduced-motion` sofort (kein Hängen, da Dauer ≈ 0).
  - Richtung: vorwärts (Standard) vs. rückwärts (Transforms gespiegelt) für „zurück".
- **Stagger innerhalb eines Steps:** Frage (0), Feld (60 ms), Button (120 ms) via
  `fadeInUp` + `animation-delay`.
- **Mikro-Interaktionen:** Check-in-Punkte poppen + leuchten beim Tippen (`scale`
  1→1.25→1 + Glow); Buttons `active: scale(.97)`; Atemkreis (Keyframe + SVG-Ring +
  Breath-Label-Crossfade).
- **Abschluss:** Karte kollabiert → Haken-Pop + Ring-Puls → Übersicht-Stagger.

---

## Datenmodell (`growthStore.js`)

- **Neu:** `day.flowAbgeschlossen?: boolean` — gesetzt bei „Fertig" (letzter Step) oder
  „Überspringen". Steuert ausschließlich den Re-Entry-Mode.
- **Migration:** rein additiv. Bestehende Tage ohne Flag werden über
  `dayHasEntry(day)` ohnehin als Übersicht behandelt; kein Datenverlust-Risiko.
- **Check-in** bleibt im geteilten `features/daily/dailyState`-Store (kein Move).
- **Neue pure Helfer** (in `growthStore.js` oder neuem `growthFlow.js`), unit-getestet:
  - `growthViewMode(data, viewDate, today, editable)`
  - `flowSteps(data, viewDate, settings)` → geordnete Step-Liste (berücksichtigt
    `openerAn`, Bonus-Grenzen).

---

## Komponenten

**Neu**
- `GrowthFlow.jsx` (+ `.module.css`) — Step-Machine + Step-Rendering, nutzt `FlowStepper`.
- `FlowStepper.jsx` (+ `.module.css`) — „Tiefe"-Transition-Container (tool-intern,
  bewusst nicht über-generalisiert).
- `BreathingCircle.jsx` (+ `.module.css`) — Atemkreis + 2-Min-Ring + Breath-Label
  (extrahiert aus `GrowthOpener`).
- Step-Inhalte als fokussierte Bausteine: `StepAnkommen`, `StepKarte`,
  `StepBonusFrage`, `StepFreitext`, `StepAbschluss` (jeweils + `.module.css`; kleine
  Steps dürfen als Sektionen in `GrowthFlow` leben, wenn das schlanker ist).
- `GrowthOverview.jsx` (+ `.module.css`) — Ruhezustand (Recap-Blöcke + Archiv-Strip).

**Geändert**
- `TabGrowth.jsx` — wird dünner **Router**: `briefing | settings | flow | overview`,
  plus die gemeinsamen Effekte (Tageswechsel, Timer-Rückkehr, Opener-Shown,
  BackInterceptor, ensureDayCard). Flow-/Overview-Logik wandert in die neuen Komponenten.
- `DailyStateRow.jsx` — wiederverwendet in `StepAnkommen` + Übersicht; Dot-Pop-Mikro.
- `GrowthArchiv.jsx` — wiederverwendet in der Übersicht (Karten-Strip-Optik).
- `TageskarteCard.jsx` — Karten-Darstellung für den Übersicht-Edit-Block; Doppelung mit
  `StepKarte` vermeiden (gemeinsame Datenhelfer `karteById`, `setAntwort`, `useAutosave`).
- `GrowthSettings.jsx` — Label „Ankommen" ggf. zu „Ankommen (Atem)" präzisieren.

**Entfernt** (durch Redesign obsolet — nur nach Importer-Check; aktuell nur `TabGrowth`)
- `GrowthOpener.jsx` / `.module.css` → ersetzt durch `BreathingCircle` + `StepAnkommen`.

**Unverändert**
- `GrowthSection.jsx` (Tagesplaner-Widget), `GrowthBriefing.jsx`, `growthContent.json`,
  `growthStore.js`-Ziehlogik (nur Flag + pure Helfer ergänzt).

---

## Tests / Guards

- `growthStore.test.js` / neu `growthFlow.test.js`:
  - `growthViewMode`: frisch → flow; mit Eintrag → overview; `flowAbgeschlossen` →
    overview; vergangener Tag → overview.
  - `flowSteps`: mit/ohne `openerAn`; Bonus-Grenzen (max 3).
  - Migration: bestehende Tage ohne Flag bleiben unverändert lesbar.
- `styleguide.test.js` bleibt grün (neue CSS: nur `var(--font)`/`var(--font-num)`, keine
  rohen Hex-Werte).
- `growthContent.test.js` unberührt.

---

## Erfolg erkennbar (Done-Kriterien)

- Frisch geöffneter **heutiger** Tag startet im **Fluss**; ein Screen nach dem anderen
  mit „Tiefe"-Übergang.
- „Überspringen"/„Fertig" an jedem Schritt → **Übersicht**; erneutes Öffnen am selben
  Tag → direkt Übersicht.
- Vergangene Tage öffnen die Übersicht **lesend** (≤ 3 Tage inline editierbar).
- **Atem-Toggle** entfernt nur die Atem-Ebene, nicht den Check-in-Screen.
- `prefers-reduced-motion` → sofortige Wechsel, kein Hängen.
- Alle Tests grün; `kontext/`-Doku (architektur.md / tool-pattern) in derselben Änderung
  aktualisiert.

---

## Out of Scope

- Keine Änderung an Kartentexten/Kategorien/Ziehlogik (außer Bonus-Einbindung in den Flow).
- Keine neue Persistenz-Schicht, kein Cloud-Sync.
- Kein Umbau anderer Tools.

---

## Sonnet-Delegation (geplant)

Eng verzahnter Kern bleibt bei Opus (Datenmodell/Migration, `FlowStepper`,
Flow-Orchestrierung, Abschluss-Animation, `TabGrowth`-Router). An Sonnet delegierbar,
weil klar abgegrenzt und präzise spezifizierbar:

- **Guard-Tests** für die pure-Funktionen (`growthViewMode`, `flowSteps`) aus exakter
  Signatur-Vorgabe.
- **`BreathingCircle`** als isolierte, präsentationale Komponente (Kontrakt: Props
  `aktiv`, `dauerSek`, `onFertig`; CSS aus dem Mockup).
- Mechanische **CSS-Module** für ruhige Bausteine (Übersicht-Blöcke, Check-in-Rows)
  nach Pixel-Vorgabe — sobald die Variablen/Kontrakte stehen.

Reihenfolge so, dass Sonnet-Tasks **eigene Dateien** treffen (kein paralleler Zugriff
auf `TabGrowth.jsx`/`growthStore.js`).
