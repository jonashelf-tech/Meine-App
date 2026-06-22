# Fitness-Tool Redesign — Oberfläche, Onboarding, Plan-Editor

- **Datum:** 2026-06-21
- **Status:** Entwurf zur Review
- **Bereich:** `src/features/tools/fitness/`
- **Baut auf:** [2026-06-15 Splits/Rhythmus/Qualität](2026-06-15-fitness-coach-splits-uebungsqualitaet-design.md)
- **Mockups:** `.superpowers/brainstorm/.../content/` (Dashboard-Stilrichtungen, Onboarding-Klickprototyp v2)

## Ziel & Motivation

Das Tool ist funktional, wirkt aber „hier friss": nackte Einzelkarten, ein 7-Schritte-Wizard
nach dem Muster „1 Frage, 1 Fenster", kaum Übergänge. Gewünscht: **hochwertiger, frischer
Look mit Sog** — ohne Stilbruch zum Rest der App.

**Diese Welle:** Shell · **Dashboard (Heute)** · **Onboarding/Briefing** · **Plan-Editor/Tag-Detail**.
**Spätere Welle (separat brainstormen):** Auswertung-Dashboards (`DashboardsTab`) und **Session-Runner**.

## Leitplanken

- Storage-Disziplin (sv/lv, UUIDs), keine Single-Device-Annahmen (`kontext/architektur.md`).
- Alle Modell-Änderungen **additiv & nicht-destruktiv**. Bestehende Daten werden nicht umgeschrieben.
- Simplicity First. Minimal-Eingriff in den Generator.

## Design-Sprache — Richtung B („ruhig + Mint-Highlights")

- **Akzent = Tool-Farbe Mint `#00FF94`** (über `--tool-color`, aus `getToolColor('fitness')`),
  Basis = Calm-Dark-Violet aus `vars.css`. **Keine neuen Hex-Werte** — nur bestehende Tokens / `color-mix`.
- **Karten:** `--surface` + `--border`. Aktive/Hero-Elemente: dezenter Mint-Verlauf + Glow + 1px
  Mint-getönte Border. Zahlen/Display in **Orbitron** (`--font-num`), Text **Geist** (`--font`).
- **Motion:** `--dur`/`--ease-out`, Slide+Fade zwischen Schritten und Subscreens. Respektiert
  global schon `prefers-reduced-motion`.
- **HARTE REGEL — kein Layout-Shift:** Wechselnder Inhalt verschiebt nie Nachbar-Flächen.
  Variable Elemente bekommen feste Höhen/Spalten (z. B. Schätz-Box, Zusammenfassungs-Chips).

## 1. Shell — `TabFitness`

Tab-Leiste + Header im neuen Stil (Pillen, Tool-Color-Glow am aktiven Tab). Tab-Struktur und
„Mehr"-Logik bleiben. Kein funktionaler Umbau.

## 2. Dashboard (Heute) — Einstieg

Ersetzt die nackte Einzelkarte durch ein kleines Dashboard. Aufbau:

- **Hero „Jetzt dran"** = `currentDay(fitness)`: Tag-Name, Rotation „Tag i/n" (`planCursor`),
  Übungs-Vorschau-Chips, geschätzte Dauer, großer CTA → Session. Darüber weiche Schedule-Zeile (§5.1) — **nie blockierend**.
- **3 Kacheln:** Diese Woche (Sessions, bei festen Tagen „/Ziel") · Streak (Wochen-Streak) · Ø Dauer.
- **Muskel-Balance:** `plannedRealSetsPerMuscle` vs `VOLUME_REF`, auf die 6 Gruppen (§5.3)
  aggregiert, Farbe via `volumeZone`.
- **Quick-Actions:** Auswertung · Körpergewicht.
- **Leerzustand (kein Plan):** einladende Karte, „Plan erstellen" startet **direkt das Onboarding**
  (nicht mehr „geh zum Pläne-Tab").

Neue Selektoren in `fitnessLogic.js`: `weeklyStreak(sessions, today)`,
`sessionsThisWeek(sessions, today)`, `avgDurationMin(sessions, n=5)`.

## 3. Onboarding / Briefing

**Briefing-Intro → 4 gruppierte Schritte → Finish.** Fortschrittsbalken, live mitlaufende
Plan-Zusammenfassung (feste Höhe, scrollt horizontal), Slide-Übergänge.

1. **Umfang:** Trainingszahl (2–6) + Split-Karten (empfohlene vorgewählt, ändert sich live mit
   der Zahl) — aus `SPLIT_CATALOG`.
2. **Intensität:** Ambition (2×2-Raster) + **Live-Längen-Schätzung** + Wdh-Präferenz.
   Schätzung = `Arbeitssätze · 2,5 min + 10 min Aufwärmen`, gerundet auf 5 (Box mit fester Höhe).
3. **Fokus & Einschränkungen:** 6 Muskel-Gruppen × `[Aus · Weniger · Normal · Mehr]` + Schmerz-Chips.
4. **Wann:** `Flexibel` | `Feste Wochentage` (Wochentag-Picker). **Ersetzt den Rhythmus-Schritt.**

**Finish:** fertige Tageskarten (Übungszahl + Dauer), antippbar → **Tag-Detail (§4)**. CTA → erstes Training.

`onDone` liefert: `{ trainingDays, splitId, ambition, repPref, priorities, pains, schedule }` —
`priorities` ist die per-Muskel-Map (aus den Gruppen abgeleitet, §5.3). `PlaeneTab.handleCoachDone`
trennt: `generateCoachPlan(coach)` **und** `saveSettings({ schedule })`.

## 4. Plan-Editor / Tag-Detail

**Tag-Detail als eigener Screen** (Slide-in), **wiederverwendet** im Finish *und* im Plan-Editor:
Übungsliste (Name, Sätze × Wdh), Dauer, Reihenfolge ziehen, Sätze/Wdh inline ändern, Übung
hinzufügen/entfernen. `PlaeneTab`-Liste + `DetailView` im neuen Kartenstil (gleiche Funktionen).

## 5. Modell-/Logik-Änderungen (additiv, nicht-destruktiv)

### 5.1 Scheduling (ersetzt „Rhythmus" im Onboarding)

- **Neu:** `settings.schedule = { mode:'flex' } | { mode:'fixed', days:[1..7] }` (ISO-Wochentag,
  Mo=1..So=7). `DEFAULT_SETTINGS.schedule = { mode:'flex' }` → merge-kompatibel.
- `settings.rhythm` **bleibt** (Daten + als „Zyklus"-Profi-Option in den Einstellungen) — nicht gelöscht.
- **Neu:** `scheduleStatus(schedule, sessions, today)` → `null | { kind:'done'|'rest'|'train' }`.
  `flex` → kein Nag. `fixed`: heute Trainingstag & getraint → `done`; Trainingstag & offen → `train`;
  kein Trainingstag → `rest`. **Nie blockierend.**
- **Rotation = Quelle der Wahrheit:** `advancePlanCursor` läuft weiterhin nur bei echtem Training —
  unverändert. Verpasste/verschobene Trainings können nicht „verfallen".
- **Frequenz fürs Volumen:** `weeklyFrequency(settings, rotationLength)` → `fixed`: `days.length`;
  `rhythm`: bestehendes `sessionsPerWeek`; sonst Default-Zyklus. `plannedRealSetsPerMuscle` bekommt
  die Frequenz hierüber (statt nur `rhythm`).

### 5.2 Muskel „Aus"

- Prioritäts-Level **`'off'`** zusätzlich zu `low|normal|high`. In `targetSetsPerMuscle`:
  `prio==='off'` → Muskel **kein Target** (auslassen). Der Generator filtert ihn bereits via
  `muscles.filter(m => targets[m])` → keine weitere Änderung nötig.

### 5.3 Prioritäten-Gruppen (nur UI-Schicht)

- **Neu:** `MUSCLE_GROUPS` (6 Gruppen → `VOLUME_REF`-Muskeln), z. B. `Beine →
  [quadrizeps,hamstrings,gluteus,waden]`, `Arme → [bizeps,trizeps]`, `Schultern →
  [schulterSeitlich,schulterHinten]`.
- Onboarding/Einstellungen setzen **Gruppen**, speichern aber weiter **pro Muskel** in
  `coach.priorities` → **Generator bleibt unverändert**. Dieselbe Map aggregiert die Dashboard-Balance.

## 6. Migration & Backup

- Rein additiv: neue `settings`-Keys (`schedule`), neue Funktionen, neues Prio-Level. Keine
  Umschreibung bestehender Daten; `rhythm` bleibt erhalten.
- `settings` liegt in `SK.fitness` → von `BACKUP_CATS` bereits abgedeckt (`schedule` fährt mit).
  Vor Deploy Routine-Backup/Export-Check.

## 7. Guards / Tests (Anti-Drift)

- `scheduleStatus`: liefert nie einen blockierenden Zustand; `flex`→kein Nag; `fixed` an
  Trainingstag→`train`, getraint→`done`, sonst→`rest`.
- Priorität `'off'` → Muskel taucht im generierten Tag **nicht** auf.
- `MUSCLE_GROUPS` deckt **alle** `VOLUME_REF`-Muskeln ab (Guard).
- `weeklyStreak` / `avgDurationMin`: Basisfälle (leer, eine Session, Lücke).
- Onboarding-Split-IDs == `SPLIT_CATALOG`-IDs (kein Drift).
- `styleguide.test` (Fonts) gilt weiter; neue CSS nur über `var()`-Farben.

## 8. Nicht in dieser Welle

- Auswertung-Dashboards (`DashboardsTab`) und Session-Runner-Optik → eigene Brainstorm-Runde.

## 9. Umsetzungs-Reihenfolge

1. **Logik/Modell** (`schedule` + `scheduleStatus` + `weeklyFrequency`, Muskel `'off'`,
   `MUSCLE_GROUPS`, Dashboard-Selektoren) **+ Tests** — Fundament.
2. **Shell + Dashboard (Heute)**.
3. **Onboarding** (Komponenten, Schritte, Übergänge, Längen-Schätzung, Scheduling-Schritt).
4. **Plan-Editor / Tag-Detail** (gemeinsamer Screen).
5. `kontext/architektur.md` (Fitness-Abschnitt) in derselben Änderung aktualisieren.

## 10. Offene Punkte

- Streak-Definition: „aufeinanderfolgende Wochen mit ≥1 Training" (robust für flexibles Training) —
  in Review bestätigen.
- Wochentag-Konvention (ISO 1–7) vs. JS `getDay()` (0–6): Umrechnung im Code kapseln.
