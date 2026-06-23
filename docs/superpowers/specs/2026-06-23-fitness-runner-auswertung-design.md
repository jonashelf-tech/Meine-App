# Fitness — Session-Runner & Auswertung: Design-Spec

**Datum:** 2026-06-23
**Branch:** `feat/fitness-runner-auswertung`
**Status:** abgenommen (Richtungen per Live-Mockup bestätigt)

Folge-Welle nach dem Fitness-Redesign (Dashboard/Onboarding/Scheduling). Hier: die zwei
verbliebenen Flächen aus „Punkt 4" — der **Session-Runner** (laufendes Training) und die
**Auswertung** (`DashboardsTab`) — auf die B-Sprache heben (Calm Dark Violet + Mint `#00FF94`),
plus ein konfigurierbarer Pausen-Timer.

Leitplanken: **kein Layout-Shift** bei Interaktion (feste Maße, Overlays statt Einschub,
tabellarische Ziffern). Optik = Richtung B (Mint-Akzent über `--tool-color`, Orbitron für Zahlen,
Glow dezent). Datenmodell bleibt unangetastet außer dem einen neuen Setting.

---

## 1. Pausen-Timer: flacher, einstellbarer Default

**Heute:** `restSecForExercise(exercise)` nimmt den Pro-Übung-Override `exercise.restSec`, sonst
fällt es über `REST_DEFAULTS` auf eine **Wdh-Bereich-abhängige** Länge zurück (≤5 Wdh → 240 s,
≤10 → 180 s, sonst 120 s). Der Timer startet bereits automatisch, wenn ein Satz mit ✓ erledigt
wird (`SessionRunner.toggleDone` → `setRest(...)`, gated über `settings.restTimerEnabled`).

**Ziel:** Ein **flacher Default von 120 s (2:00)**, einstellbar in den Tool-Einstellungen. Die
Wdh-Automatik entfällt. Der Pro-Übung-Override bleibt erhalten (Vorrang).

**Änderungen:**

- `fitnessStore.js` → `DEFAULT_SETTINGS.restTimerSec: 120`.
  (Greift dank `loadFitness()`-Merge automatisch für Bestandsdaten — keine Migration.)
- `fitnessLogic.js` → Signatur ändern:
  ```js
  export function restSecForExercise(exercise, defaultSec = 120) {
    return exercise?.restSec ?? defaultSec
  }
  ```
  `REST_DEFAULTS`-Import entfernen.
- `fitnessModel.js` → `REST_DEFAULTS` entfernen (wird nur noch hier referenziert → tot nach Umbau).
- `SessionRunner.jsx` → Aufruf wird `restSecForExercise(exObj, restSec)`, wobei
  `restSec = loadFitness().settings.restTimerSec ?? 120` (einmalig via `useRef` lesen, wie
  `restEnabled`).
- `EinstellungenTab.jsx` → in der bestehenden Sektion **„Rest-Timer"** unter dem An/Aus-Toggle
  eine **„Pause-Dauer"**-Auswahl: Preset-Chips **1:00 · 1:30 · 2:00 · 2:30 · 3:00**
  (aktiver Chip = Mint). `onClick` → `update({ restTimerSec: <sek> })`. Immer sichtbar
  (kein Ein-/Ausblenden → kein Shift); wenn Timer aus, optional gedimmt aber an Ort.

**Tests:**
- `fitnessLogic.test.js`: `restSecForExercise`-Block ersetzen — Override gewinnt
  (`{restSec:90}` → 90); ohne Override → `defaultSec` (Default 120; übergebener Wert z. B. 150 → 150).
  Die drei Wdh-Bereich-Cases entfallen.
- `fitnessStore.test.js`: Default `restTimerSec === 120` ergänzt nach Merge.

---

## 2. Session-Runner — Richtung A „Premium-Liste"

Der bekannte Scroll-Flow bleibt (alle Übungen sichtbar, nichts versteckt). Nur hochwertiger +
Fortschrittsgefühl. **Keine Flow-/Logik-Änderung** an Sätzen, Swap, Warmup, Coach-Empfehlung,
Finish — reine Darstellungs-/State-Ableitung + CSS.

**Neu/anders (`SessionRunner.jsx` + `.module.css`):**

1. **Fortschritts-Header** unter der Timer-Leiste (fix, scrollt nicht mit):
   - dünne Track-Leiste, Mint-Glow-Fill = Anteil erledigter Arbeitssätze.
   - Label: `„<done> / <total> Sätze"` (Orbitron für Zahlen). `total` = Summe geplanter
     Arbeitssätze (ohne Warmup), `done` = erledigte Arbeitssätze. Rein aus `draft` abgeleitet.
2. **Übungs-Zustände** (abgeleitet, kein neuer State):
   - **erledigt** = alle Sätze der Übung `done` → ruhige/gedimmte Karte, Häkchen-Marke.
   - **aktiv** = erste nicht-fertige Übung → Mint-Rahmen + dezenter Glow (wie `HeuteTab`-Hero-Akzent),
     Badge „aktiv".
   - sonst neutral.
3. **Aktiver Satz hervorgehoben:** der erste nicht-erledigte Satz der aktiven Übung bekommt einen
   Mint-Links-Akzent (3 px Bar) + leichten Tint; erledigte Sätze wie heute (opacity + line-through).
   Reine CSS-Klassen anhand `done`-Ableitung.
4. **Pause-Bar** in B (Mint-Tint, Orbitron-Zeit) — bereits vorhanden, nur Styling angleichen.
5. **Finish-Button** als Mint-Gradient (`linear-gradient(120deg, var(--tool-color), var(--teal))`),
   konsistent mit `HeuteTab`-CTA.

Alles über `--tool-color` (= Mint für Fitness), keine Hardcodes. Fonts ausschließlich via `var(--font)`/
`var(--font-num)` (Styleguide-Guard).

**Tests:** `sessionFlow.test.js` bleibt grün (kein Verhaltens-/Datenfluss-Change). Falls eine reine
Ableitungs-Helferfunktion ausgelagert wird (z. B. `runnerProgress(draft)` → `{done,total}`), kleinen
Unit-Test ergänzen; sonst inline und ungetestet (nur Darstellung).

---

## 3. Auswertung (`DashboardsTab`) — B-Politur

Gleiche Inhalte & Selektoren, neue Sprache. Drei-Wege-Toggle **Plan-Soll · Geloggt · Kraft** bleibt.

**`DashboardsTab.jsx` + `.module.css`:**

1. **Toggle & Week-Nav** in B (Mint-aktiv, ruhige Surfaces) — weitgehend Styling.
2. **Geloggt-View — Überblick-Kacheln** oben (3 Kacheln, Stil wie `HeuteTab.tiles`):
   - **Trainings** = `sessionsThisWeek(sessions, today)` (Highlight-Kachel).
   - **Volumen** = Wochen-Tonnage → neuer Helper (s. u.), Anzeige in t (z. B. „18,4 t").
   - **Ø Dauer** = `avgDurationMin(sessions)` in min.
   - Kacheln zeigen Werte der aktuell gewählten Woche (`weekStart`).
3. **Wochen-Check-Karte** → Mint-Akzent-Karte (Gradient-Tint + Puls-Dot), Buttons „Anwenden"
   (Mint-Gradient) / „Später" (ghost). Logik unverändert.
4. **Muskel-Balken** (`MuscleVolumeBars`): Fill behält **Zonen-Farbe** (low = dim, optimal = Mint
   mit Glow, high = amber, over = rose) — `ZONE_VARS` auf Mint umstellen: `optimal` → `var(--tool-color)`
   statt `--emerald`. MEV/MAV/MRV-Marken + Ref-Zeile bleiben. „Nur getrackt"-Liste bleibt.
5. **Kraft-View** (`StrengthView`): **kein Aufklappen mehr** (entfernt `expandedId`-State und den
   `onClick`-Toggle, der heute Nachbarn verschiebt). Jede Karte zeigt **dauerhaft** den
   Mini-`Sparkline` (Area-Fill in Mint) — feste Höhe → kein Shift. e1RM groß (Orbitron) +
   Trend-Pfeil bleiben. Karten mit nur einem Datenpunkt: Sparkline rendert Punkt/leere Fläche
   (kein Crash — `Sparkline` ist robust gegen `length===1`).
6. **Sparkline**: Stroke/Punkte über `var(--tool-color)` (heute schon), zusätzlich dezenter
   Area-Fill (linearGradient Mint→transparent). Achsenlabels bleiben.

**Neuer Helper (`fitnessLogic.js`):**
```js
// Summe Arbeitssatz-Tonnage (gewicht*wdh) aller Sessions ab weekStart (eine Woche).
export function weeklyTonnage(sessions, weekStart) { ... }
```
(Arbeitssätze = `satzTyp ∈ {normal,dropset,failure}`, wie `totalVolume` im Runner.)
Mit Unit-Test in `fitnessLogic.test.js` (leer → 0; eine Woche summiert; Warmup zählt nicht).

---

## 4. Reihenfolge (Sonnet, phasenweise — jede Phase: Tests grün + `npm run build` + Opus-Review)

1. **Phase 1 — Pausen-Timer** (§1): kleinster, in sich geschlossener Logik-/Settings-Change inkl.
   Tests. Niedriges Risiko, sofort verifizierbar.
2. **Phase 2 — Auswertung** (§3): Helper + `DashboardsTab` B-Politur + Strength-No-Shift.
3. **Phase 3 — Session-Runner** (§2): Premium-Liste-Politur.

(Reihenfolge 1→2→3: erst Logik/Daten absichern, dann die zwei UI-Flächen. UI-Phasen unabhängig.)

## 5. Guards / Anti-Drift
- `styleguide.test.js` bleibt grün (Fonts nur via `var()`).
- Keine **Akzent**-Farb-Hardcodes (kein `#00FF94` o. ä.) — Akzent immer über `var(--tool-color)`;
  Basisfarben über Tokens, Schatten wie bestehend (`rgba(0,0,0,…)`) sind ok.
- `REST_DEFAULTS` vollständig entfernt (kein toter Export).

## 6. Bewusst draußen (YAGNI)
- Kein Fokus-Modus / „eine Übung nach der anderen" (Richtung B des Mockups verworfen).
- Keine „Übung x/n"-Anzeige im Runner (Reihenfolge nicht erzwungen → Sätze-Fortschritt reicht).
- Keine Pro-Übung-Pausen-UI-Erweiterung (Override existiert bereits im Übungen-Tab).
- Keine neuen Auswertungs-Metriken über die drei Kacheln hinaus.

## 7. Kontext-Pflege
- `kontext/architektur.md` Fitness-Abschnitt nach Umsetzung aktualisieren (Pausen-Setting,
  `weeklyTonnage`, Runner-Fortschritt, Auswertungs-B-Politur, Strength-No-Shift).
