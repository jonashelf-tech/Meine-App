# Kognitiv-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (Routine-UI an Sonnet) bzw. superpowers:executing-plans. Schritte als `- [ ]`.

**Goal:** Kognitiv-Tool auf Fitness-Niveau heben: tägliche Einheit (1 Button) + Einzelspiel, Erstöffnungs-Konfigurator, Fitness-artige Auswertung, dopplungsfreies 8-Modul-Roster.

**Architecture:** Datenmodell bleibt in `sessionStore`/`storage` (sv/lv, UUIDs). Einheit = abgeleitete Gruppe von Modul-Läufen (`sessionGroupId`); Abschluss-Flag auf dem letzten Lauf. Neuer Config-Store `SK.kognitivConfig` (Set+Reihenfolge+Erinnerungen+Check-in). UI translatiert die Fitness-Bildsprache (Hero, Kacheln, Tabs, Sparklines) nach Violett.

**Tech Stack:** React 19, Vite, Zustand, CSS Modules, Vitest. Spec: `docs/superpowers/specs/2026-06-29-kognitiv-redesign-design.md`.

---

## Phase 0 — Fundament (Opus, TDD)

### Task 0.1 Roster (`moduleConfig.js`)
- Modify: `src/features/tools/kognitiv/moduleConfig.js`
- Umbenennen: `gedaechtnis.name`→„Merkspanne"; `zahlensuche.domain`→„Visuelle Suche".
- Neu: `stroop` (Domain „Selektive Aufmerksamkeit", color `#F472B6`, higherIsBetter true, mainMetric „Trefferquote"/%), `speedsort` (Domain „Tempo & Dauerfokus", color `#22D3EE`, higherIsBetter true, mainMetric „richtige/min").
- `geteilt`: aus `MODULE_ORDER` raus, Config-Eintrag bleibt (Archiv), `archived:true`.
- `MODULE_ORDER` = `['alertness','zahlensuche','gedaechtnis','gonogo','nback','taskswitching','stroop','speedsort']`.
- Neu exportieren: `PROFILE_DOMAINS` = { aufmerksamkeit:{label,color:#2DD4BF,modules:['alertness','stroop']}, gedaechtnis:{…#A78BFA,['gedaechtnis','nback']}, tempo:{…#38BDF8,['zahlensuche','speedsort']}, impulskontrolle:{…#34D399,['gonogo']}, flexibilitaet:{…#FBBF24,['taskswitching']} }.
- Verify: `npm test` grün (kein Test referenziert geteilt direkt).

### Task 0.2 Icons (`ModuleIcon.jsx`)
- Modify: `src/features/tools/kognitiv/ModuleIcon.jsx`
- `PATHS.stroop` (z. B. „A" mit Tropfen/Tinte), `PATHS.speedsort` (zwei Pfeile ↓ + Häkchen/Kreuz). Bestehende Pfade als Speed-Sort-Stream wiederverwendbar.

### Task 0.3 Storage (`storage/index.js`)
- Add `SK.kognitivConfig = \`${PREFIX}kognitiv_config\``.
- In `BACKUP_CATS.tools` aufnehmen.
- Verify: `storage.test.js` „Backup-Abdeckung" grün (sonst unclassified-Key).

### Task 0.4 Config-Store (neu)
- Create: `src/features/tools/kognitiv/configStore.js`
- API: `loadConfig()` (mit Default-Seed: modules=4 sinnvolle, reminders:{mode:'flex'}, checkinOn:true, onboardingDone:false), `saveConfig(patch)`, `getEinheitModules()` (geordnete Keys, gefiltert auf nicht-archiviert), `setEinheitModules(ids)`, `isOnboardingDone()`, `markOnboardingDone()`. Migration: altes `SK.kognitivSchedule`/`kognitivIntroSeen` respektieren (introSeen→onboardingDone).
- IDs/Defaults ohne `Date.now()`-IDs.

### Task 0.5 Datenmodell + Metriken (`sessionStore.js`, TDD)
- Modify `createSession(...)`: optionale Felder `sessionGroupId=null`, `einheitComplete=false`, `einheitSize=null`.
- Neue pure Helfer (+ Tests in `sessionStore.test.js`):
  - `formScore(recent, best, hib)` → 0–100 (hib: 100·recent/best; sonst 100·best/recent; clamp 0..100; best/recent 0 → 0).
  - `moduleForm(metrics, hib)` → letzter rollender Schnitt(≤3) vs best → formScore, oder null bei [].
  - `domainForm(sessions)` → { domainId: 0–100|null } via PROFILE_DOMAINS + higherIsBetter je Modul.
  - `isPersonalBest(prevMetrics, value, hib)` → strikt besser als alle bisherigen.
  - `einheitenInRange(sessions, fromDateKey)` → Anzahl Sessions mit `einheitComplete` & date≥from.
  - `einheitStreak(sessions, todayKey)` → fortlaufende Tage (heute/gestern verankert) mit ≥1 `einheitComplete`.
- Verify: `npm test` grün.

**Commit:** `feat(kognitiv): Fundament — Roster, Config-Store, Einheit-Datenmodell + Metriken`

---

## Phase 1 — Neue Module (Sonnet, parallelisierbar)

### Task 1.1 Stroop (`exercises/StroopExercise.jsx` + `.module.css`)
- Muster: `GoNoGoExercise` (refs, `createSession`, `onDone`/`onAbort`, `ExerciseShell` progress/total).
- 4 Farben (rot/blau/grün/gelb über vars.css-nahe Hex in Modul-Daten), ~40 Trials, kongruent/inkongruent gemischt. Tippe **Tintenfarbe**. `mainMetric`=Trefferquote %, `score`={correct,errors,total}, `taps`=[{congruent,correctColor,chosen,reactionMs,correct}], moduleId `stroop`.
- Verify: per Hand im Dev-Server (preview), keine Konsolen-Fehler.

### Task 1.2 Speed-Sort (`exercises/SpeedSortExercise.jsx` + `.module.css`)
- Zeitbasiert: `ExerciseShell durationMs={90000}`. Oben Ziel-Symbol + Countdown 10→0 (Ziel wechselt bei 0). Mitte aktuelles Symbol (ModuleIcon-Pfade als Pool). Unten ✓/✗ Buttons. `mainMetric`=richtige/min, `score`={correct,errors,total}, moduleId `speedsort`.

### Task 1.3 Demos (`ModuleDemo.jsx`)
- Mini-Schleifen für `stroop` und `speedsort` ergänzen (Muster der bestehenden Demos).

**Commit je Modul.**

---

## Phase 2 — In-Session-Runner „Einheit" (Opus)

- Create: `EinheitRunner.jsx` — State-Machine: für jedes Modul der Einheit nacheinander: (Erstbegegnung→Demo/Briefing, sonst Countdown/Übergang) → Übung → Übergang N/total → nach letztem: kombiniertes Ergebnis. Jeder Lauf via `saveSession` mit gemeinsamer `sessionGroupId` (genId), letzter mit `einheitComplete:true,einheitSize`.
- Create: `EinheitResult.jsx` — kombiniertes Ergebnis (Mini-Resultate je Modul, PRs, Streak-Update-Hinweis).
- Modify `TabKognitiv.jsx`: neuer nav-Screen `einheit`; Start aus Hero. Einzelspiel-Pfad bleibt (`briefing`→`exercise`→`results`). Check-in einmal vor Einheit (statt pro Modul).
- Verify: Einheit durchspielen; Sessions korrekt gruppiert; Abbruch speichert Teilläufe.

**Commit:** `feat(kognitiv): Einheit-Runner + kombiniertes Ergebnis`

---

## Phase 3 — Startseite „Heute" (Sonnet, nach Phase 0/2)
- Create: `HeuteHero.jsx` (+ css) nach Mockup `kognitiv_startseite_mockup`: Begrüßung, Hero (Kicker+Punkt, Titel, Meta, Ring „n/total heute", Modul-Chips, Gradient-CTA, **Akzent Variante B**), 3 Kacheln (`einheitStreak`/`einheitenInRange`/Ø Dauer, Orbitron), Profil-Balken (`domainForm`), Buttons „Auswertung"/„Alle Module".
- Modify `TabKognitiv.jsx`: Default-Tab = HeuteHero; „Alle Module" → bestehende `ModuleList` (Einzelspiel).
- Verify: preview-Screenshot vs Mockup.

## Phase 4 — Konfigurator (Sonnet, nach Phase 0)
- Create: `Onboarding.jsx` (+css) nach Mockup `kognitiv_onboarding_flow_mockup`: Intro → Auswahl&Reihenfolge (Drag, `setEinheitModules`) → Wann (flex/fixed) → Finish. Schreibt `kognitivConfig`, `markOnboardingDone()`.
- Modify `TabKognitiv.jsx`: bei `!isOnboardingDone()` → Onboarding statt altem `KognitivBriefing`.
- Modify `KognitivSettings.jsx`: Set/Reihenfolge/Erinnerungen editierbar (statt nur per-Modul-Schedule).

## Phase 5 — Auswertung (Sonnet, nach Phase 0)
- Create: `Auswertung.jsx` (+css) nach Mockup `kognitiv_auswertung_mockup`: Tabs Überblick·Module·Profil, Wochen-Navigator, Kacheln (Einheiten/Bestwerte/Ø Dauer), Wochen-Einblick, Profil-Balken; Module-Tab = Sparkline-Karten pro Modul (`getModuleStats`), **jeder Punkt antippbar → SessionDetail**.
- Modify `TabKognitiv.jsx`: „Statistik"-Tab → `Auswertung` (ersetzt `Dashboard`).
- Verify: Punkt-Tap öffnet Detail; Granularität erhalten.

## Phase 6 — Cleanup + Doku (Sonnet)
- `geteilt`: `GeteilteExercise.*` löschen, Import/`ExMap` in TabKognitiv entfernen.
- Verwaiste alte Komponenten prüfen (ModuleList nur noch „Alle Module"; Dashboard ggf. raus).
- `kontext/architektur.md`: Design-Sprache (Hero/Kacheln/Tabs/Sparkline/Akzentlinien-Regel) + Kognitiv-Dateiliste aktualisieren.
- `npm test` grün (Backup-Guard, Styleguide, Inputs).

**Commit:** `chore(kognitiv): geteilt entfernt + Doku/Design-Sprache`

---

## Self-Review
- Spec-Abdeckung: Roster(0.1) · neue Module(1) · Datenmodell/Backup(0.3–0.5) · Einheit(2) · Startseite(3) · Konfigurator(4) · Auswertung(5) · Doku/Removal(6) · Metriken/Form(0.5). ✓
- Keine Platzhalter in 0.x (Code folgt beim Bau). Signaturen konsistent (`sessionGroupId`, `einheitComplete`, `domainForm`, `einheitStreak`).
