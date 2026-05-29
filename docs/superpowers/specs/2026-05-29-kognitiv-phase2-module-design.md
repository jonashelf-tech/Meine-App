# Kognitiv — Phase 2 & 3 Module Design Spec
_2026-05-29 · Status: approved_

## Überblick

6 neue kognitive Trainingsmodule als Erweiterung des bestehenden Kognitiv-Tools (Tab 16). Alle Module folgen den etablierten Patterns aus Phase 1: Briefing → Übung (nur X-Button) → Ergebnis → Session gespeichert. Tages-Limit, Check-in, Dashboard, KognitivSection und Einstellungen bleiben unverändert und gelten automatisch für alle neuen Module.

---

## Integration ins bestehende System

- **moduleConfig.js** — 6 neue Einträge (moduleId, label, description, variants)
- **sessionStore.js** — keine Änderung nötig; Session-Format ist bereits generisch
- **Dashboard** — neue Module erscheinen automatisch als Kacheln
- **ModuleList** — neue Module erscheinen automatisch in der Liste
- **KognitivSettings** — neue Module erscheinen automatisch als konfigurierbar
- **SK.kognitiv** — alle Sessions in demselben Array, unterschieden via `moduleId`

---

## Modul 1 — Go/No-Go

### Konzept
Ein Stimulus (Kreis) erscheint einzeln auf komplett schwarzem Screen. Grüner Kreis → so schnell wie möglich tippen. Roter Kreis → stillhalten. Misst Reaktionszeit und Impulsivitätsfehler.

### Stimuli
- **Go:** Großer Kreis, `#10B981` (emerald), Glow `rgba(16,185,129,0.35)`
- **No-Go:** Großer Kreis, `#FB7185` (rose), Glow `rgba(251,113,133,0.25)`
- **Zwischen Stimuli:** Komplett schwarzer Screen — nichts, kein Placeholder, kein Punkt

### Verhältnis & Timing
- **Normal:** 80% Go / 20% No-Go · ISI 1.5–4s zufällig · Stimulus sichtbar 800ms · ~30 Stimuli
- **Schwer:** 80% Go / 20% No-Go · ISI 0.8–2.5s zufällig · Stimulus sichtbar 800ms · ~40 Stimuli

### Varianten (Briefing)
- `normal` — Standard-Tempo
- `schwer` — kürzere Abstände, mehr RT-Druck

### Gemessen
- Reaktionszeit (ms) bei Go-Stimuli → Hauptmetrik: Ø RT
- Fehlerrate bei No-Go (falsches Tippen = Impulsivität)
- Auslasser (Go-Stimulus verpasst)

### Session-Score
```js
score: { correct: n, errors: n, misses: n, total: n }
mainMetric: avgRT  // ms
taps: [{ index, type: 'go'|'nogo', correct, time, reactionMs? }]
```

---

## Modul 2 — N-Back

### Konzept
4 geometrische Symbole erscheinen einzeln nacheinander, mittig, groß. Tippen wenn das aktuelle Symbol dasselbe ist wie das vorherige (1-back). Einfach-Modus nutzt Farbe als kognitives Scaffolding, Schwer-Modus entfernt den Farb-Cue.

### Symbole & Farben
| Symbol | Einfach-Farbe | Schwer-Farbe |
|--------|--------------|-------------|
| Kreis | `#8B5CF6` (lila) | `rgba(255,255,255,0.4)` |
| Dreieck | `#14B8A6` (teal) | `rgba(255,255,255,0.4)` |
| Quadrat | `#10B981` (grün) | `rgba(255,255,255,0.4)` |
| Stern | `#FB7185` (rose) | `rgba(255,255,255,0.4)` |

Jede Form hat im Einfach-Modus immer dieselbe Farbe (konsistent, nicht zufällig). Im Schwer-Modus sind alle Formen gleich grau — kein Farb-Cue.

### Timing
- Symbole erscheinen für 1.2s (Normal) / 0.8s (Schwer), dann kurze Pause 0.4s, nächstes Symbol
- Sequenz: 20–25 Symbole gesamt

### Varianten (Briefing)
- `normal` — 1-back, farbige Symbole
- `schwer` — 1-back, monochrome Symbole

### Gemessen
- Treffer (korrekt getippt), Fehler (falsch getippt), Auslasser (Match verpasst)
- Hauptmetrik: Treffer-Anteil in %

### Session-Score
```js
score: { hits: n, errors: n, misses: n, total: n }
mainMetric: hitRate  // 0–100 %
taps: [{ index, match: bool, correct: bool, time }]
```

---

## Modul 3 — Task Switching

### Konzept
X oder O erscheint einzeln mittig, in einer von 4 Farben (lila/teal/grün/rose). Zwei Phasen mit automatischem Regelwechsel. Phase 1: Form-Matching. Phase 2: Farb-Matching. Misst den Einbruch nach Regelwechsel (Switch Cost).

### Stimuli
- Symbole: `X` und `O`
- Schrift: Outfit Bold, sehr groß (~80px)
- Farben: `#8B5CF6` · `#14B8A6` · `#10B981` · `#FB7185`
- Hintergrund: `#05050e`

### Regel-Indicator
Oben mittig: Pill mit aktiver Regel
- FORM: `background: rgba(139,92,246,0.12)`, `border: rgba(139,92,246,0.3)`, Text `#8B5CF6`
- FARBE: `background: rgba(20,184,166,0.12)`, `border: rgba(20,184,166,0.3)`, Text `#14B8A6`

### Regelwechsel-Sequenz
Nach ~30 Stimuli Phase 1:
1. Stimulus stoppt
2. Flash-Screen: "JETZT: FARBE" groß zentriert
3. Countdown: 3 · 2 · 1 (je 1s)
4. Phase 2 beginnt sofort

### Timing
- Stimulus sichtbar: 1.5s · ISI: 0.8–2s zufällig
- Phase 1: ~30 Stimuli · Phase 2: ~30 Stimuli

### Varianten (Briefing)
- `normal` — Phase 1 Form, dann Phase 2 Farbe
- `schwer` — 3 Phasen: Form → Farbe → Form (zweiter Wechsel zurück, ebenfalls mit 3s-Countdown)

### Gemessen
- RT gesamt · RT Phase 1 · RT Phase 2
- Fehler gesamt · Fehler in den ersten 5 Stimuli nach Wechsel (Switch Cost Window)
- **Hauptmetrik:** RT-Delta Phase2 − Phase1 (Switch Cost in ms)

### Session-Score
```js
score: { correct: n, errors: n, switchErrors: n, total: n }
mainMetric: switchCostMs  // RT-Delta Phase2−Phase1
taps: [{ index, phase: 1|2, correct, reactionMs }]
```

---

## Modul 4 — CPT-light / Vigilanz

### Konzept
Kreis (○) und X erscheinen einzeln nacheinander auf schwarzem Screen. Nur bei einem bestimmten Symbol (z.B. immer ○) tippen, beim anderen nicht. 2–3 Minuten Dauer. Misst wie Fehlerrate und RT über die Zeit zunimmt — der Aufmerksamkeitsabfall.

### Stimuli
- **Ziel-Symbol (tippen):** Großer Kreis, `#8B5CF6`, Outline-Style (wie Go/No-Go)
- **Distractor-Symbol (nicht tippen):** Großes X, `rgba(255,255,255,0.4)`
- Hintergrund zwischen Stimuli: komplett schwarz

### Timing
- Stimulus-Dauer: 600ms · ISI: 1–2.5s zufällig
- Verhältnis: ~70% Ziel / 30% Distractor
- Dauer: 3 Minuten · ~80–90 Stimuli

### Varianten (Briefing)
- `normal` — ○ ist Ziel, X ist Distractor
- `schwer` — X ist Ziel, ○ ist Distractor (Regelumkehr — gewohntes ignorieren, ungewohntes tippen)

### Gemessen
- RT und Fehler aufgeteilt in 3 Zeitfenster (Minute 1 / 2 / 3)
- **Hauptmetrik:** Vigilanz-Dekrement = Fehleranstieg Minute3 − Minute1
- Auslasser (Ziel verpasst), False Alarms (Distractor getippt)

### Session-Score
```js
score: { hits: n, misses: n, falseAlarms: n, total: n }
mainMetric: vigilanceDecrement  // Fehleranstieg über Zeit (0 = konstant, positiv = schlechter)
taps: [{ index, type: 'target'|'distractor', correct, reactionMs, minute: 1|2|3 }]
```

---

## Modul 5 — Selektive Aufmerksamkeit (Zielfarbe im Strom)

### Konzept
Symbole (Formen aus N-Back-Pool) blitzen einzeln auf in verschiedenen Formen und Farben. Oben ist eine Zielfarbe als Pill sichtbar. Nur tippen wenn das aktuelle Symbol in der Zielfarbe erscheint — Form ist irrelevant. Ablenkung = alle anderen Farben.

### Stimuli
- Symbole: Kreis · Dreieck · Quadrat · Stern (zufällig)
- Farben: `#8B5CF6` · `#14B8A6` · `#10B981` · `#FB7185` (zufällig)
- Zielfarbe: zu Beginn zufällig gewählt, bleibt für die ganze Session konstant
- Zielfarbe-Indicator oben: Pill mit Farb-Dot + Farbname

### Timing
- Stimulus-Dauer: 600ms · ISI: 0.8–2s zufällig
- Verhältnis: ~25% Ziel (1 von 4 Farben) / ~75% Distractor
- Dauer: ~3 Minuten

### Varianten (Briefing)
- `normal` — Zielfarbe konstant sichtbar oben
- `schwer` — Zielfarbe-Indicator wird nach 30s ausgeblendet (aus dem Gedächtnis halten)

### Gemessen
- Treffer, Fehler (falsche Farbe), Auslasser (Zielfarbe verpasst), RT
- **Hauptmetrik:** Treffer-Anteil in %

### Session-Score
```js
score: { hits: n, errors: n, misses: n, total: n }
mainMetric: hitRate  // %
taps: [{ index, targetColor: bool, correct, reactionMs }]
```

---

## Modul 6 — Geteilte Aufmerksamkeit (Dual-Task)

### Konzept
Zwei parallele Kanäle laufen gleichzeitig im selben Takt. Visuell: 5 Kreise die zwischen offen/geschlossen wechseln. Auditiv: Töne wechseln zwischen hoch und tief. Tippen bei: geschlossener Kreis erscheint ODER gleicher Ton zweimal hintereinander. Eine Taste für beide Ereignisse.

### Visueller Kanal
- 5 Kreise in einer Reihe, zentriert
- **Offen:** Outline-Kreis `rgba(255,255,255,0.25)`
- **Geschlossen:** Filled Kreis `#8B5CF6` mit Glow
- Wechsel-Takt: 1.2s pro Beat
- Pro Beat: jeder Kreis wechselt unabhängig mit einer Wahrscheinlichkeit — im Schnitt 1 geschlossener pro 4–5 Beats

### Auditiver Kanal
- Hoch: ~880 Hz (Web Audio API, kurzer Ton 150ms)
- Tief: ~330 Hz (Web Audio API, kurzer Ton 150ms)
- **Audio-Unlock:** Browser-Policy erfordert User-Interaktion vor erstem Ton. Der Start-Button im Briefing dient als Audio-Unlock — `AudioContext` beim Tap auf "Starten" initialisieren.
- Takt: synchron mit visuellem Kanal (jeder Beat = ein Ton)
- Sequenz: zufällig, aber Wiederholung (hoch-hoch oder tief-tief) ~25% der Beats

### Tippen
- Ein Tap = Reaktion auf visuelles ODER auditives Ereignis
- Korrekt wenn: geschlossener Kreis ODER Ton-Wiederholung (oder beides gleichzeitig)
- Falsch wenn: keines von beiden

### Varianten (Briefing)
- `normal` — beide Kanäle aktiv, Takt 1.2s
- `schwer` — Takt schneller (0.8s), mehr geschlossene Kreise gleichzeitig möglich

### Gemessen
- Treffer visuell · Treffer auditiv · False Alarms · Auslasser
- **Hauptmetrik:** Gesamt-Treffer-Anteil %
- Analyse: visueller Kanal vs. auditiver Kanal getrennt ausgewertet (Stärke/Schwäche)

### Session-Score
```js
score: { visualHits: n, audioHits: n, combined: n, errors: n, misses: n, total: n }
mainMetric: hitRate  // %
taps: [{ index, triggerVisual: bool, triggerAudio: bool, correct, reactionMs }]
```

---

## Icons in toolRegistry

Für die 6 neuen Module müssen SVG-Icons in `toolRegistry.jsx` hinterlegt werden (analog zu bestehenden Modul-Icons). Keine Emojis. Schlichte SVG-Outline-Icons, 20×20px viewBox.

---

## Neue moduleConfig-Einträge

```js
// Ergänzung in moduleConfig.js
{
  id: 'gonogo',
  label: 'Go/No-Go',
  description: 'Tippen bei Grün, stillhalten bei Rot.',
  icon: 'circle',
  phase: 2,
  variants: ['normal', 'schwer'],
  defaultVariant: 'normal',
},
{
  id: 'nback',
  label: 'N-Back',
  description: 'Tippen wenn das Symbol dasselbe ist wie das vorherige.',
  icon: 'shapes',
  phase: 2,
  variants: ['normal', 'schwer'],
  defaultVariant: 'normal',
},
{
  id: 'taskswitching',
  label: 'Task Switching',
  description: 'Regel wechselt — Form oder Farbe matchen.',
  icon: 'switch',
  phase: 2,
  variants: ['normal', 'schwer'],
  defaultVariant: 'normal',
},
{
  id: 'cpt',
  label: 'Vigilanz',
  description: 'Nur beim Ziel-Symbol tippen — 3 Minuten lang.',
  icon: 'eye',
  phase: 2,
  variants: ['normal', 'schwer'],
  defaultVariant: 'normal',
},
{
  id: 'selektiv',
  label: 'Selektive Aufmerksamkeit',
  description: 'Nur tippen wenn die Zielfarbe erscheint.',
  icon: 'filter',
  phase: 2,
  variants: ['normal', 'schwer'],
  defaultVariant: 'normal',
},
{
  id: 'geteilt',
  label: 'Geteilte Aufmerksamkeit',
  description: 'Bild und Ton gleichzeitig beobachten.',
  icon: 'dual',
  phase: 2,
  variants: ['normal', 'schwer'],
  defaultVariant: 'normal',
},
```

---

## Neue Exercise-Dateien

```
src/features/tools/kognitiv/exercises/
  GoNoGoExercise.jsx + .module.css
  NBackExercise.jsx + .module.css
  TaskSwitchingExercise.jsx + .module.css
  CptExercise.jsx + .module.css
  SelektivExercise.jsx + .module.css
  GeteilteExercise.jsx + .module.css
```

Alle Exercises folgen dem bestehenden Interface:
```js
// Props
onDone(sessionData)   // Übung fertig — Ergebnis-Screen
onAbort()             // X-Button getippt — zurück zu ModuleList
```

---

## Nicht gebaut (bewusst)

- 2-back Variante für N-Back (Phase 3, eigene Spec)
- Buchstaben/Zahlen als N-Back-Stimuli (Symbole sind die endgültige Entscheidung)
- Ton-only Modus für Geteilte Aufmerksamkeit
- Adaptive Schwierigkeit (Phase 3)
