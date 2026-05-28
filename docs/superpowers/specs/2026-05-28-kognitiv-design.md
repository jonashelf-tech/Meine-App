# Kognitiv — Design Spec
_2026-05-28 · Status: approved_

## Überblick

Ein kognitives Trainings-Tool für die ADHS-App, inspiriert von REHACOM-Therapiemodulen. Ziel: die Übungen die Jonas in der Ergotherapie macht zuhause am Handy reproduzieren, mit sauberer Datenlage und voller Session-Analyse.

Kein Biofeedback (braucht Hardware). Kein Gamification. Kein Streak. Satisfying Feedback-Design statt Gaming-Mechanik.

---

## Phasierung

### Phase 1 — Diese Spec
- Alertness (mit/ohne Warnton)
- Zahlensuche (01–25 Grid)
- Arbeitsgedächtnis (Sequenz-Kreise)

### Phase 2 — Nächste Spec
- Selektive Aufmerksamkeit
- Vigilanz
- Geteilte Aufmerksamkeit (dual-task: visuell + auditiv gleichzeitig)

### Phase 3 — Eigene Spec
- Logisches Denken (IQ-artige Aufgaben — braucht Content-Strategie)

---

## Tool-Integration

- **Tool-ID:** `kognitiv`
- **Tab-Nr:** 16 (klaeren = 15, kognitiv = 16)
- **Farbe:** `--primary` (#8B5CF6)
- **Standalone:** true
- **Integrated:** true (Kalender-Dot wenn Session an diesem Tag)
- **Storage:** `SK.kognitiv` → `adhs_kognitiv_sessions`

---

## Navigation

Das Tool hat zwei Tabs (interner Tab-Switcher, nicht App-Tabs):

```
[ Module ]  [ Dashboard ]
```

### Tab "Module"
- Liste aller verfügbaren Module mit letztem Ergebnis + Level-Indikator
- Phase-2/3-Module sichtbar aber als "Phase 2 / bald" markiert (gedimmt)
- Klick auf Modul → Briefing Screen

### Tab "Dashboard"
- Kopf: Gesamt-Sessions, Sessions diese Woche, Gesamt-Trend (↑ / ↓ / →)
- Modul-Kacheln: Name, letztes Ergebnis, Delta, Mini-Balken-Chart (letzte 5 Sessions)
- Klick auf Modul-Kachel → Modul-Detail

---

## Screen-Flows

### Flow: Modul starten

```
Module-Tab → [Klick Modul] → Briefing → [Starten] → Übung → Ergebnis → [Zurück zu Modul-Tab]
```

### Briefing Screen (vor jeder Übung)

Zeigt einmalig:
- Modul-Name + Icon
- **Dauer** als Pill (z.B. "ca. 3 Minuten") — **wird nur hier angezeigt, nie während der Übung**
- Kurze Beschreibung was zu tun ist
- "Was gemessen wird" (grün markiert)
- "Was nicht gemessen wird / nicht relevant" (gedimmt)
- Schwierigkeit wählen: Normal · Schwer · (Rückwärts bei Zahlensuche)
- Start-Button

### Übungs-Screen (während der Übung)

**Regel: Nur X-Button + Task selbst. Absolut nichts sonst.**

- Kein Timer
- Kein Fortschritts-Counter (keine 7/25)
- Kein Fehler-Counter
- Kein Stressfaktor
- Nur das X-Abbrechen-Button oben links

Grund: ADHS/Neurodivergenz — live Fehler-Anzeige erhöht Stress und verschlechtert Performance.

### Ergebnis-Screen (nach der Übung)

Zeigt alles auf einmal:
- Hauptmetrik groß (Zeit, ms, korrekte Anzahl)
- Delta zur letzten Session
- 3–4 Kennzahlen (korrekte, Fehler, Ø pro Element, Dauer)
- Tipp-Zeiten-Visualisierung (jeder Tipp als Balken: grün = schnell, lila = normal, rot = langsam/Fehler)
- Mini-Trend (letzte 5 Sessions)
- Button: "Im Kalender speichern"
- Button: "Nochmal · oder anderes Modul"

### Tages-Limit

Einmal pro Modul pro Tag. Sanfte Sperre — kein Error, kein Popup.

Bei erneutem Klick auf ein erledigtes Modul: eigener Screen der zeigt:
- "Heute erledigt" + grünes Checkmark
- Erklärung (kurz: Gehirn braucht Pause)
- "Morgen ab 00:00 wieder verfügbar"
- Letztes Ergebnis sichtbar
- Button: "Ergebnis nochmal ansehen →"

---

## Module — Details

### 1. Alertness

**Was der User tut:** Ein Stimulus (Kreis) erscheint zu zufälligen Zeitpunkten auf dem Screen. So schnell wie möglich tippen.

**Varianten (im Briefing wählbar):**
- Ohne Ton: Stimulus erscheint ohne Ankündigung
- Mit Warnton: kurzer Piepton kündigt den Stimulus an, aber mit zufälligem Abstand (0.5–2s nach Ton)

**Interaktion während Übung:** Schwarzer Screen mit gelegentlich erscheinendem Kreis. Sonst nichts außer X.

**Gemessen:** Reaktionszeit (ms) pro Tipp, Fehler (Tippen wenn kein Stimulus), Auslasser (Stimulus verpasst)

**Hauptmetrik:** Ø Reaktionszeit in ms

**Dauer:** ~3 Minuten, ~30 Stimuli

**Schwierigkeit:** Normal (ISI 2–5s) · Schwer (ISI 0.8–2.5s, kürzere Stimulus-Sichtbarkeit)

---

### 2. Zahlensuche

**Was der User tut:** 5×5 Grid (25 Felder) mit Zahlen 01–25 zufällig verteilt. Zahlen in aufsteigender Reihenfolge (01 → 02 → ... → 25) so schnell wie möglich antippen.

**Varianten:**
- Normal: Zahlen 01–25
- Schwer: Zahlen 01–25 mit kleinerer Schrift / mehr Ablenkung
- Rückwärts: 25 → 24 → ... → 01

**Erweiterung Phase 2:** A–Z statt Zahlen (gleiche Mechanik)

**Interaktion während Übung:** Nur das Grid + X-Button. Erledigte Felder werden dezent gedimmt (violet). Nächstes Ziel pulst leicht. Keine Zahl-Counter, kein Timer.

**Gemessen:** Gesamtzeit (s), Fehler (falsche Zahl getippt), Zeit pro Zahl (für Tiefenanalyse)

**Hauptmetrik:** Gesamtzeit in Sekunden (niedriger = besser)

**Dauer:** ~2–5 Minuten (abhängig von Geschwindigkeit)

**Schwierigkeit:**
- Normal: 5×5 Grid (25 Zahlen), Ziffern gut lesbar
- Schwer: 6×5 Grid (30 Zahlen, 01–30), kleinere Zellen
- Rückwärts: 5×5 Grid, Reihenfolge 25→01

---

### 3. Arbeitsgedächtnis

**Was der User tut:** 12 Kreise auf dem Screen, angeordnet als Ring (Uhrzeiger-Anordnung). Eine Sequenz von Kreisen leuchtet nacheinander auf. Dann: Sequenz reproduzieren (in gleicher Reihenfolge antippen).

**Schema:** 2 × 2er Sequenz, 2 × 3er Sequenz, 2 × 4er Sequenz, 2 × 5er Sequenz = 8 Runden gesamt.

**Interaktion während Übung:**
- Phase "Einprägen": Kreise leuchten auf. User sieht zu.
- Phase "Reproduzieren": Kreise neutral. User tippt. Nur X-Button sichtbar.

**Gemessen:** Korrekte Sequenzen (max. 8), Fehler pro Sequenz, max. Sequenzlänge ohne Fehler

**Hauptmetrik:** Korrekte / 8

**Dauer:** ~5 Minuten

**Schwierigkeit:** Normal (Sequenz-Tempo normal) · Schwer (Tempo schneller, mehr Kreise gleichzeitig)

---

## Datenmodell

### Session

```js
// SK.kognitiv → Array von Sessions
{
  id:        genId(),
  moduleId:  'zahlensuche',        // 'alertness' | 'zahlensuche' | 'gedaechtnis'
  variant:   'normal',             // 'normal' | 'schwer' | 'rueckwaerts' | 'mit-ton'
  date:      '2026-05-28',         // dateKey
  startedAt: '2026-05-28T08:14:00.000Z',
  duration:  42,                   // Sekunden Gesamtdauer
  score:     { correct: 24, errors: 1, total: 25 },  // Hauptkennzahlen (modulspezifisch)
  mainMetric: 42,                  // Hauptwert (Zeit in s / ms / Anzahl korrekte)
  taps: [                          // Jeder Tipp einzeln — Format modulspezifisch
    // Zahlensuche: { index, target, correct, time, got? }
    { index: 0, target: '01', correct: true,  time: 820 },
    { index: 1, target: '02', correct: true,  time: 1240 },
    { index: 4, target: '05', correct: false, time: 3300, got: '07' },
    // Alertness: { index, correct, time, type }
    // type: 'hit' | 'miss' | 'false-alarm'
    // Gedächtnis: { round, sequenceLen, correct, errors }
  ]
}
```

### Tages-Limit prüfen

```js
const todaysDone = sessions.filter(s => s.date === todayKey() && s.moduleId === moduleId)
const isDoneToday = todaysDone.length > 0
```

---

## Dashboard — Detail

### Modul-Kachel
- Icon + Name
- Letztes Ergebnis + Delta zur vorletzten Session
- Mini-Balken-Chart (letzte 5 Sessions, normalisiert)
- Klick → Modul-Detail

### Modul-Detail Screen
- Kopf: zurück (‹) + Modul-Name
- Trend-Chart: alle Sessions chronologisch (Balken), Datum-Labels unten
- Kennzahlen: Best / Anzahl Sessions / Gesamtverbesserung seit erster Session
- Liste aller Sessions: Datum + Uhrzeit, Variante, Hauptmetrik, Delta, › zum Reintippen
- Klick auf Session → Tiefenanalyse dieser Session

### Tiefenanalyse einer Session
- Datum + Uhrzeit + Variante + Dauer
- Hauptkennzahlen (3 Werte nebeneinander)
- Tipp-Zeiten-Balken: jeder Tipp als Balken (grün/lila/rot nach Schnelligkeit)
- Einzelwert-Liste: jedes Element mit Name, Balken, Zeit in s
- Fehler hervorgehoben (rot hinterlegt)

---

## Kalender-Integration

Nach dem Ergebnis-Screen: "Im Kalender speichern" erstellt einen Block im `days`-Store:

```js
{
  text:     'Kognitiv: Zahlensuche (42s)',
  color:    '#8B5CF6',
  duration: Math.ceil(session.duration / 60),  // auf Minuten gerundet
  locked:   true,
  done:     true,
  toolId:   'kognitiv',
}
```

Kalender-Dot: `sessions.some(s => s.date === dk)` — erscheint wenn mindestens eine Session an dem Tag.

---

## Optik — Regeln

- Während Übung: Background `#05050e` (noch dunkler als `--bg`)
- Zahlensuche-Grid: erledigte Felder `rgba(139,92,246,0.1)` gedimmt, nächstes Ziel pulst mit `--glow-primary`
- Ergebnis-Screen: Hauptmetrik in Orbitron, Trend-Delta grün/rot
- Dashboard: Mini-Charts in `rgba(139,92,246,0.25)`, aktuelle Session in `#8B5CF6`
- Alle anderen Design-Regeln: wie in `kontext/architektur.md`

---

## Was bewusst nicht gebaut wird (Phase 1)

- Streak / Gamification / XP
- Timer oder Fortschritts-Counter während der Übung
- Neurofeedback / Biofeedback (braucht Hardware)
- Auto-Planung von Sessions (Phase 2+)
- Auto-Todo-Generierung (Phase 2+)
- Tagesplaner-Widget (Phase 2+)
- Logisches Denken (Phase 3)
