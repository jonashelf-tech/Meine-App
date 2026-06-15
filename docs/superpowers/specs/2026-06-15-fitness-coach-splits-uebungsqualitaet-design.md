# Fitness-Coach: Split-Katalog, Zyklus-Rhythmus & Übungs-Qualität

- **Datum:** 2026-06-15
- **Status:** Entwurf zur Review
- **Bereich:** `src/features/tools/fitness/`

## Kontext & Motivation

Der Coach-Plan leitet den Split aktuell **allein aus der Trainingstage-Zahl** ab — pro
Tageszahl genau ein fester Split, keine Wahl ([planGenerator.js](../../../src/features/tools/fitness/coach/planGenerator.js)).
Der Generator zieht zudem **eine Übung pro Muskel pro Tag**, ohne Bewegungsmuster zu
kennen — dadurch können zwei nahezu identische Übungen (z. B. Bankdrücken + enges
Bankdrücken) gleichzeitig Volumen bekommen. Übungen tragen keine Qualitäts-Metadaten.

Ziel:
1. **Mehr Split-Varianten** pro Größe, eine als „optimal" empfohlen.
2. **Zyklus-Rhythmus** (z. B. 2-on-1-off) als Heute-Hinweis statt Wochentags-Denken.
3. **Übungs-Qualität**: Bewertungen (Stabilität/Dehnung/Last) + Ranking-Anzeige +
   kuratierter Seed + bewegungsmuster-bewusste Auswahl & Satz-Verteilung.

## Leitplanken

- Storage-Disziplin (sv/lv, UUIDs) wie in `kontext/architektur.md`. Keine Single-Device-Annahmen.
- Simplicity First. Heute-Hinweis bleibt **weicher Vorschlag**, blockt nie.
- Migration ist **nicht-destruktiv** und additiv.

## Nicht-Ziele

- Keine Kalender-Einplanung künftiger Trainings (Rhythmus ist reiner Heute-Hinweis).
- Kein hartes Wochentags-Scheduling. Die Plan-Rotation bleibt cursor-basiert
  ([fitnessStore.js `currentDay`/`advancePlanCursor`](../../../src/features/tools/fitness/fitnessStore.js)) — verschobene Trainings sind dadurch schon toleriert.
- Keine externen Quellen/WebSearch; Ratings sind kuratierte Konsens-Werte.

---

# Epic 1 — Splits & Rhythmus

## 1.1 Datenmodell

Zwei saubere Trennungen:

| Feld | Ort | Wirkung |
|---|---|---|
| `coach.splitId` | am Plan (`plan.coach`) | bestimmt, **welche** Tage generiert werden |
| `settings.rhythm` | global (`settings`) | `null \| { on, off }`; beeinflusst **nur** den Heute-Hinweis |

- Das tote Feld `zyklusModus` (in [Onboarding.jsx](../../../src/features/tools/fitness/coach/Onboarding.jsx) gesetzt, nirgends gelesen) wird entfernt.
- `DEFAULT_SETTINGS` bekommt `rhythm: null`. Da `loadFitness` per `{ ...DEFAULT_SETTINGS, ...raw.settings }` mergt, ist das abwärtskompatibel.
- Alte Coach-Pläne ohne `splitId` → Generator nutzt die `recommended`-Variante ihrer Größe.

## 1.2 Split-Katalog

`splitTemplates(size)` wird ersetzt durch einen Katalog `SPLIT_CATALOG`:

```
SPLIT_CATALOG[size] = [{ id, name, recommended: bool, days: [{ name, muscles }] }]
```

`splitTemplates(size, splitId)` liefert die `days` des gewählten Splits (Default:
`recommended`). Muskel-Listen nutzen die bestehenden Konstanten (`OBER`, `UNTER`,
`PUSH`, `PULL`, `BEINE`, `GANZ`) plus neue (`ARME`, `BRUST_TRI`, …).

Größe = „**wie viele verschiedene Trainings rotieren**" (nicht „pro Woche").

| Größe | ⭐ Empfohlen (id) | Alternativen |
|---|---|---|
| 2 | Ganzkörper A/B (`ganz2`) | Oberkörper/Unterkörper (`ul2`) |
| 3 | Ober/Unter/Ganzkörper (`ulg3`) | Push/Pull/Beine (`ppl3`) · Ganzkörper ×3 (`ganz3`) |
| 4 | Oberkörper/Unterkörper ×2 (`ul4`) | Push/Fullbody/Pull/Fullbody (`pfpf4`) · 4er-Split (`split4`) |
| 5 | Ober/Unter/Push/Pull/Beine (`ulppl5`) | Ober/Unter ×2 + Arme&Schultern (`ula5`) |
| 6 | Push/Pull/Beine ×2 (`ppl6`) | Arnold-Split (`arnold6`) |

**Regel hinter ⭐:** bestes Verhältnis aus Frequenz (jeder Muskel möglichst 2×) und
Erholung/Session-Länge.

Muskel-Listen der neuen/zusammengesetzten Tage:
- `ARME` = `bizeps, trizeps, schulterSeitlich, schulterHinten`
- 4er-Split (`split4`):
  - Brust = `brust, trizeps`
  - Rücken = `ruecken, bizeps, trapez`
  - Schulter+Arme = `schulterVorne, schulterSeitlich, schulterHinten, bizeps, trizeps`
  - Beine = `quadrizeps, hamstrings, gluteus, waden, bauch`
- Arnold (`arnold6`), 2× je:
  - Brust+Rücken = `brust, ruecken, schulterHinten`
  - Schulter+Arme = `schulterVorne, schulterSeitlich, bizeps, trizeps`
  - Beine = `quadrizeps, hamstrings, gluteus, waden, bauch`
- `pfpf4` = `PUSH, GANZ, PULL, GANZ`
- `ulppl5` = `OBER, UNTER, PUSH, PULL, BEINE`

## 1.3 Onboarding-Flow (5 → 7 Schritte)

`Trainings-Anzahl` → **`Split`** → `Ambition` → `Wdh-Präferenz` → **`Rhythmus`** →
`Schmerzen` → `Prioritäten`.

- Schritt 1 neue Formulierung: *„Wie viele verschiedene Trainings willst du abwechseln?"*
  mit Hinweis *„rotieren der Reihe nach — in deinem Tempo"*.
- Schritt **Split**: Karten der Varianten für die gewählte Größe; die `recommended`
  ist **vorausgewählt** und trägt das Badge „Empfohlen". Zeigt die Tag-Namen je Variante.
- Schritt **Rhythmus**: Segmented `Aus · 1/1 · 2/1 · 3/1 · Eigen`; bei „Eigen" zwei
  Stepper (Training / Pause, je ≥1). „Aus" = `rhythm: null`.
- `onDone` liefert `{ trainingDays, splitId, ambition, repPref, pains, priorities, rhythm }`.
  `PlaeneTab.handleCoachDone` trennt: `generateCoachPlan(coach)` **und**
  `saveSettings({ rhythm })`. `zyklusModus` entfällt.
- Der **Split-Picker** wird als eigenständige Komponente extrahiert (Wiederverwendung in
  Einstellungen, DRY).

## 1.4 Heute-Hinweis (weich, selbst-korrigierend)

Neue Funktion in `fitnessLogic.js`:

```
trainingDayStatus(rhythm, sessions, todayIso) -> null | { kind: 'done'|'rest'|'train' }
```

Algorithmus:
1. `rhythm == null` → `null` (kein Hinweis; Verhalten wie heute).
2. `today ∈ sessionDates` → `{ kind:'done' }`.
3. `lastDate` = jüngstes Session-Datum `< today`; keins → `{ kind:'train' }`.
4. `daysSince = diffTage(today, lastDate)`; `restDaysSoFar = daysSince - 1`.
5. `trainingStreak` = zusammenhängende Tage mit Session, rückwärts ab `lastDate` gezählt.
6. `trainingStreak >= rhythm.on && restDaysSoFar < rhythm.off` → `{ kind:'rest' }`.
7. sonst → `{ kind:'train' }`.

Selbst-korrigierend: kein fixer Anker → verschobene/ausgelassene Trainings rechnen sich
beim nächsten Öffnen neu.

Anzeige in [HeuteTab.jsx](../../../src/features/tools/fitness/tabs/HeuteTab.jsx) als kleine Statuszeile über der Tages-Karte:
- `done` → „Heute erledigt 💪"
- `rest` → „Heute Pause empfohlen 😴 (2/1-Rhythmus)" — **Training-Button bleibt sichtbar**
- `train` → „Trainingstag"
- `null` → nichts

## 1.5 Einstellungen-Tab (+2 Sektionen)

In [EinstellungenTab.jsx](../../../src/features/tools/fitness/tabs/EinstellungenTab.jsx):
- **Trainings-Rhythmus** (global): Segmented `Aus · 1/1 · 2/1 · 3/1 · Eigen` (+ Stepper bei
  „Eigen"); schreibt `settings.rhythm` via `saveSettings`.
- **Coach-Split** (nur wenn aktiver Plan `modus==='coach'`): zeigt aktuellen Split-Namen +
  Button „Split ändern" → öffnet den Split-Picker (Größe + Variante) →
  **regeneriert den aktiven Coach-Plan** (gleiche `plan.id`, bleibt aktiv).
  ⚠️ **Bestätigungs-Dialog**, da manuelle Tag-Änderungen dabei ersetzt werden.

---

# Epic 2 — Übungs-Qualität

## 2.1 Modell-Felder (`createExercise`, Seed)

Vier neue Felder pro Übung:

| Feld | Typ | Default (custom) | Bedeutung |
|---|---|---|---|
| `stabilitaet` | 1–5 | 3 | wie stabil/sicher hart belastbar |
| `dehnung` | 1–5 | 3 | Spannung in der gedehnten Position (Stretch-Hypertrophie) |
| `last` | 1–5 | 3 | absolute Überladbarkeit |
| `pattern` | string\|null | null | Bewegungsmuster-Familie (für Dedup) |

## 2.2 Bewegungsmuster (`pattern`)

Bewusst fein granuliert: Flach- und Schrägdruck sind **verschiedene** Muster (zusammen
erlaubt), Bankdrücken + enges Bankdrücken sind **beide `flachDruck`** (Dedup greift).

Taxonomie: `flachDruck, schraegDruck, brustFly, vertikalDruck, seitheben, vertikalZug,
horizontalZug, reverseFly, shrug, bizepsCurl, hammerCurl, trizepsPushdown,
trizepsUeberkopf, trizepsStirn, kniebeuge, beinstrecker, hipHinge, beinbeuger, hipThrust,
gluteKickback, wade, bauchCrunch, huftBeugung`.

## 2.3 Ranking-Anzeige (Übungen-Tab)

In [UebungenTab.jsx](../../../src/features/tools/fitness/tabs/UebungenTab.jsx):
- Listen-Zeile zeigt die drei Achsen kompakt (Mini-Balken `Stab ▮▮▮▮▯ · Dehn ▮▮▮▯▯ · Last ▮▮▮▮▮`).
- Kopfzeile: **Sortieren nach** (Stabilität ⭐ default / Dehnung / Last / Name) + **Muskel-Filter**
  → ergibt „Ranking pro Muskel".
- Detail-Ansicht: drei 1–5-Selektoren + Muster-Auswahl (auch für eigene Übungen).

## 2.4 Smartere Auswahl & Satz-Verteilung (`generateCoachPlan`)

Pro Tag werden `usedExerciseIds` **und** `usedPatterns` getrackt. Je Muskel `m` mit Ziel:
1. **Muster-Dedup:** Kandidaten mit `pattern ∈ usedPatterns` fallen raus.
2. **Qualitäts-gewichtete Wahl:** Sortierung primär nach `dehnung + stabilitaet`
   (Tie-Break: Grundübung zuerst, dann `allocation[m]`). Bester → `ex1`.
3. **Volumen-Split:** ist `perTarget >= 6` Sätze, wird ein zweiter, komplementärer
   `ex2` (anderes Muster, bevorzugt hohe `dehnung`/Isolation) gewählt; Sätze ~60/40
   aufgeteilt. Sonst eine Übung. **Max. 2 Übungen/Muskel/Tag.**
4. Satz-Clamp je Übung wie bisher (Grund 3–5, Iso 2–4). `zielWdh`/`zielGewicht`/`zielRir`
   wie bisher.

`perTarget = round(targets[m] / freq[m])`.
Konstanten: `SPLIT_THRESHOLD = 6`, `MAX_EX_PER_MUSCLE = 2`.

## 2.5 Migration (nicht-destruktiv)

Problem: `ensureSeeded` fügt nur Übungen mit **neuer ID** hinzu, aktualisiert bestehende
nicht. Vorhandene Seed-Übungen im Speicher bekommen die neuen Felder sonst nie.

Lösung — versionierte, additive Migration:
- `meta.exerciseMetaVersion` (neu). Beim Laden, falls < aktuell:
  - Für jede gespeicherte Übung mit `custom === false` und passender `id` im
    `EXERCISE_SEED`: nur `{ pattern, stabilitaet, dehnung, last }` aus dem Seed mergen
    (Name/Allokation/Nutzerfelder unangetastet).
  - Für `custom === true` ohne Ratings: Defaults `3/3/3`, `pattern: null`.
  - Version hochsetzen.
- Neue Seed-Übungen (neue IDs) kommen weiter über `ensureSeeded` dazu.
- **Backup-Pfad:** vor Deploy einmal Backup/Export prüfen; Migration ist additiv &
  idempotent. Storage-Backup-Abdeckung bleibt durch den vorhandenen Guard gesichert.

## 2.6 Kuratierter Seed (Konsens-Werte)

Rubrik: `stabilitaet` (Maschine 5, Kabel 4, Langhantel 4, Kurzhantel 3, frei/instabil 2) ·
`dehnung` (gedehnte Last hoch = Flys/RDL/Overhead/tiefe Kniebeuge/Incline = 4–5; Pressen/
Rudern 3; Kurzlast wie Pushdown/Kickback/Beinstrecker/Seitheben 2) · `last` (Compounds 4–5,
Isolation 1–3).

### Bestand (32) — `pattern · Stab/Dehn/Last`

| Übung | pattern | Stab | Dehn | Last |
|---|---|---|---|---|
| Bankdrücken (LH) | flachDruck | 4 | 3 | 5 |
| Schrägbankdrücken (KH) | schraegDruck | 3 | 4 | 4 |
| Brustpresse (Maschine) | flachDruck | 5 | 3 | 4 |
| Kabel-Fly | brustFly | 2 | 5 | 2 |
| Klimmzug | vertikalZug | 3 | 4 | 4 |
| Latzug (Maschine) | vertikalZug | 5 | 4 | 4 |
| Langhantelrudern | horizontalZug | 3 | 3 | 5 |
| Kabelrudern | horizontalZug | 4 | 4 | 4 |
| Schulterpresse (KH) | vertikalDruck | 3 | 3 | 4 |
| Seitheben (KH) | seitheben | 3 | 2 | 2 |
| Seitheben (Kabel) | seitheben | 4 | 3 | 2 |
| Face Pull | reverseFly | 4 | 2 | 2 |
| Shrugs (KH) | shrug | 4 | 2 | 4 |
| Langhantel-Curls | bizepsCurl | 4 | 3 | 4 |
| Kurzhantel-Curls | bizepsCurl | 3 | 3 | 3 |
| Hammer-Curls | hammerCurl | 3 | 3 | 3 |
| Trizepsdrücken (Kabel) | trizepsPushdown | 4 | 2 | 3 |
| Enges Bankdrücken | flachDruck | 4 | 3 | 4 |
| Overhead-Trizeps (Kabel) | trizepsUeberkopf | 4 | 5 | 3 |
| Kniebeuge (LH) | kniebeuge | 3 | 4 | 5 |
| Beinpresse | kniebeuge | 5 | 4 | 5 |
| Beinstrecker | beinstrecker | 5 | 2 | 3 |
| Ausfallschritte (KH) | kniebeuge | 2 | 4 | 3 |
| Rumänisches Kreuzheben | hipHinge | 3 | 5 | 5 |
| Beinbeuger (Maschine) | beinbeuger | 5 | 3 | 3 |
| Hip Thrust | hipThrust | 4 | 2 | 5 |
| Glute Kickback (Kabel) | gluteKickback | 4 | 3 | 2 |
| Wadenheben stehend | wade | 4 | 4 | 4 |
| Wadenheben sitzend | wade | 5 | 4 | 3 |
| Crunch (Kabel) | bauchCrunch | 4 | 3 | 3 |
| Beinheben hängend | huftBeugung | 2 | 3 | 2 |
| Kreuzheben (LH) | hipHinge | 3 | 3 | 5 |

### Neue Stretch-Picks (~8) — inkl. Allokation

| Übung | Equipment | Allokation | pattern | Stab | Dehn | Last |
|---|---|---|---|---|---|---|
| Incline-Curls (KH) | kurzhantel | bizeps 100 | bizepsCurl | 3 | 5 | 2 |
| Preacher Curl | maschine | bizeps 100 | bizepsCurl | 4 | 4 | 3 |
| Seated Leg Curl | maschine | hamstrings 100 | beinbeuger | 5 | 5 | 3 |
| Hack Squat | maschine | quadrizeps 65, gluteus 25, hamstrings 10 | kniebeuge | 5 | 5 | 5 |
| Bulgarian Split Squat (KH) | kurzhantel | quadrizeps 50, gluteus 40, hamstrings 10 | kniebeuge | 2 | 5 | 3 |
| Pec Deck | maschine | brust 100 | brustFly | 5 | 4 | 3 |
| Skullcrusher (SZ) | langhantel | trizeps 100 | trizepsStirn | 3 | 4 | 3 |
| Reverse Pec Deck | maschine | schulterHinten 80, trapez 20 | reverseFly | 5 | 3 | 2 |

---

# Tests / Guards (Anti-Drift)

- `planGenerator.test`:
  - Split-Längen je Katalog-Größe stimmen.
  - **Guard:** jede `SPLIT_CATALOG`-Größe hat **genau eine** `recommended`-Variante.
  - **Guard:** generierter Tag hat **kein doppeltes `pattern`**.
  - Max. 2 Übungen/Muskel/Tag.
- `exerciseSeed.test` erweitert: jede Seed-Übung hat gültiges `pattern` und
  `stabilitaet/dehnung/last ∈ 1..5`. Allokationen weiter = 100, alle 15 Muskeln abgedeckt.
- Neuer Test für `trainingDayStatus` (done/rest/train/leer/verschoben).
- Migrations-Test: Bestand bekommt Felder, custom-Edits bleiben, idempotent.

# Umsetzungs-Reihenfolge (Phasen)

1. **Modell + Migration + Seed** (Felder, Defaults, kuratierte Werte, Migration) — Fundament.
2. **Split-Katalog** (`SPLIT_CATALOG`, `splitTemplates(size, splitId)`, `coach.splitId`).
3. **Generator** (Muster-Dedup, Qualitäts-Wahl, Volumen-Split).
4. **Onboarding** (Split-Picker-Komponente, Rhythmus-Schritt, neue Formulierung).
5. **Heute-Hinweis** (`trainingDayStatus` + HeuteTab-Zeile).
6. **Einstellungen** (Rhythmus-Sektion + Coach-Split-Sektion).
7. **Ranking-UI** (Übungen-Tab Mini-Balken, Sortierung, Filter, Detail-Selektoren).

# Offene Punkte / Risiken

- ⭐-Empfehlungen sind teils Geschmackssache (z. B. Ober/Unter/Ganz vs. PPL bei Größe 3) —
  in der Review final bestätigen.
- Rating-Werte sind Konsens-Schätzungen, im Übungen-Tab jederzeit nachjustierbar.
- `pattern`-Taxonomie muss alle Seed-Übungen abdecken (Guard sichert das ab).
