# Architektur — Globale Regeln

## Ordnerstruktur

```
src/
  components/
    BackupNudge/      BackupNudge.jsx         — Hinweis-Balken auf Tagesplaner wenn letzte Off-Device-Sicherung > 7 Tage; "Jetzt sichern" → downloadFullBackup()
    DayNav/           DayNav.jsx              — Datums-Pille oben im Tagesplaner; zeigt "heute" Badge wenn viewDate === today
    ErrorBoundary/    ErrorBoundary.jsx       — fängt Render-Crash in einem Tab/Tool ab (kein Whitescreen); in App.jsx mit key={currentTab} → Tab-Wechsel resettet
    NavPill/          NavPill.jsx             — Pille mit Pfeil-Buttons; optionaler `badge`-Prop (z.B. "heute") als Chip rechts neben Label
    PrioBadge/        PrioBadge.jsx
    RepeatPicker/     RepeatPicker.jsx        — Wiederholungs-Picker (Blocker + Todos)
    Toast/            Toast.jsx
    TodoChip/         TodoChip.jsx + .module.css  — Farbe = Streifen links (3px) + Border in Chip-Farbe (gedimmt), kein Glow-Modus
    TodoModal/        TodoModal.jsx + .module.css
    ToolHeader/       ToolHeader.jsx          — Standard-Header für alle Tools
    ToolSection/      ToolSection.jsx

  features/
    calendar/
      Blocker/
        BlockerCard.jsx         — Blocker-Karte im Zeitplan
        BlockerModal.jsx        — Blocker erstellen/bearbeiten
        RepeatDeleteSheet.jsx   — "Nur diese" / "Diese und zukünftige" löschen
        blockerUtils.js         — Factory + Query + Mutation Helpers
      KiPlanSection/  KiPlanSection.jsx
      Pool/           Pool.jsx + Pool.module.css  — `.listArea` hat horizontales Padding 8px (Glow-Effekt nicht abschneiden)
      TabHeute/
        TabHeute.jsx            — Tagesplaner (DayNav + Zeitplan + Pool + Sections)
        useTimeEvents.js        — Hook: abgelaufene/verpasste Slots behandeln
      TabKalender/
        TabKalender.jsx         — Orchestrator: View-State, NavPill, Woche/Monat-Segmented, Toggle-Strip
        WocheView.jsx           — Zeitgitter-Woche inkl. Drag über Tag+Zeit, PillStrips, Termin-/Todo-Modals
        MonatView.jsx           — Monats-Kacheln + DayPanel-Einbettung
        DayPanel.jsx            — read-only Tagesübersicht (Zeitplan/Erledigt/Tool-Karten)
        kalenderShared.js       — DAY_SHORT/MONTH_NAMES/SLOT_H + pure Helfer (getMonday, blocksOverlap, getToolDots, …)
      Zeitplan/
        MissedReviewModal.jsx   — Modal für TimeEvents (abgelaufene/verpasste Slots)
        SlotBlock.jsx           — Einzelner Slot im Zeitplan (inkl. Play→Fokus-Timer via onPlay)
        SlotSheet.jsx           — Zentriertes Modal beim Tap auf leeren Slot: + Neu / Pool-Todo platzieren
        bandLogic.js            — rein+getestet: computeBands() — Sichtfenster + "frei"-Bänder außerhalb
        Zeitplan.jsx + .module.css

    settings/         TabSettings/TabSettings.jsx

    todos/
      Block.js          — createBlock(), isTermin(), isFaelligkeit(), isTodo()
      parseTodoText.js  — EINZIGER Todo-Parser (!prio, #Kat, Zeiten, Datum, Dauer); Nutzer: TodoModal „Auto"

    tools/
      TabTools/       TabTools.jsx            — Default: Meine Tools-Liste; "+ Alle Tools" Button oben (toggle) zeigt Alle-Tools-Ansicht zum Aktivieren/Deaktivieren; Dachboden-Badge (≥60 Tage ungenutzt) mit 1-Tap-Deaktivieren
      toolRegistry.jsx                        — TOOL_REGISTRY + ToolIcon (SVG)
      toolTabs.js                             — TOOL_TAB — Single Source of Truth
      toolUsage.js                            — Dachboden-Regel: markToolUsed/seedToolUsage/unusedDays (SK.toolUsage, App.jsx trackt Tab-Wechsel)
      elvi/           TabElvi.jsx
      garten/
        TabGarten.jsx           — Begleiter-Tab: Szene, XP, Quellen, Meilensteine
        GartenSection.jsx       — Tagesplaner-Karte (Szene + „+X heute" + Fortschritt)
        GartenSzene.jsx         — prozedurales SVG, Funktion von (stage, dekos, night)
        gartenData.js           — XP abgeleitet aus App-Daten + Monotonie-Ratchet, MILESTONES
      geburtstage/
        BirthdaySheet.jsx   — Bottom Sheet (Neu + Edit)
        BirthdaySection.jsx — Tagesplaner-Widget (Chips: Geburtstag + Geschenk, fakeTodo-Pattern)
        TabGeburtstage.jsx  — Avatar-Karten, Sort, Swipe-Delete
        birthdayUtils.js    — Migration, Chip-Logik, Hilfsfunktionen
      fitness/
        TabFitness.jsx          — Shell: ToolHeader + 7 Sub-Tabs (Heute·Pläne·Übungen·Auswertung·Archiv·Körpergewicht·⚙). Default-Tab Heute; beim allerersten Öffnen (noch keine Pläne) direkt Pläne+Onboarding statt Heute-Leerzustand
        fitnessModel.js         — Konstanten (MUSCLES, MUSCLE_GROUPS [6 UI-Gruppen→Muskeln], VOLUME_REF, EQUIPMENT, Inkremente, Warmup-Schema, SESSION_SET_BUDGET, REP_PREF) + Factories
        fitnessStore.js         — load/save SK.fitness (config: settings.schedule {flex|fixed days}, settings.rhythm [legacy/Zyklus], settings.restTimerSec [Pause-Default Sek, 120]) + SK.fitnessSessions (Log) + Selektoren + ensureSeeded
        fitnessLogic.js         — rein+getestet: e1rm, bestWorkingE1rm, restSecForExercise(ex, defaultSec=120), warmupSets, detectPRs, realSetsPerMuscle, volumeZone, weekStartIso, e1rmSeries, similarExercises; Scheduling: scheduleStatus, weeklyFrequency, isoWeekday; Dashboard: weeklyStreak, sessionsThisWeek, avgDurationMin, weeklyTonnage, estSessionMin
        exerciseSeed.js         — 32 Standard-Übungen (stabile IDs, custom:false)
        koerpergewichtData.js   — Körpergewicht-Daten (SK.weight) — aus altem Gewicht-Tool übernommen
        FitnessSection.jsx      — Tagesplaner-Widget (Körpergewicht-Eingabe + heutiges Training)
        session/SessionRunner.jsx — Live-Session „Premium-Liste" (Redesign B): Fortschritts-Header (erledigte/geplante Arbeitssätze), aktive Übung + aktiver Satz hervorgehoben (Inset-Bar, kein Layout-Shift), fertige Übungen ruhig. Satz-Logging, Vorwerte, Rest-Timer (settings.restTimerSec, Trigger=Satz-✓; zeitstempel-basiert `{endAt}` → friert im Hintergrund nicht ein), Warmup nur via „Aufwärmen"-Helfer (kein Satz-Typ-Durchklicken mehr), Gerät-besetzt, Übungen per ▲▼ umsortierbar (`moveExercise`; `de`-Lookup per exerciseId, nicht Index). Coach-Feedback pro Arbeitssatz nach `settings.feedbackMode`: `rir` (Default) = RIR-Eingabe, leer/0 = bis Versagen, fließt live in `adjustRemaining` (zielRir); `chips` = leicht/passt/hart/nicht geschafft
        session/SessionSummary.jsx — Abschluss-Screen (Dauer/Volumen/PRs)
        tabs/KoerpergewichtTab.jsx — Gewichts-/Kalorien-Tracking (aus altem TabGewicht)
        tabs/HeuteTab.jsx       — Dashboard (Redesign Richtung B): Schedule-Hinweis, Hero „Jetzt dran" (Rotation/Chips/CTA), 3 Kacheln (Woche/Streak/Ø Dauer), Muskel-Balance (6 Gruppen), Quick-Actions, Leerzustand → onStartOnboarding()
        tabs/PlaeneTab (Listen + Editor, Redesign B; Übungen je Tag per ▲▼ umsortierbar `moveExercise`) · UebungenTab · DashboardsTab (Redesign B: Toggle Plan-Soll·Geloggt·Kraft; Geloggt mit Überblick-Kacheln [Trainings/Volumen via weeklyTonnage/Ø Dauer, wochenbezogen] + Wochen-Check-Akzentkarte + Mint-Glow-Balken (optimal); Kraft-Verlauf dauerhaft sichtbar = kein Aufklapp-Shift, Sparkline mit Area-Fill) · ArchivTab. PlaeneTab nimmt `autoOnboard`-Prop (von TabFitness gesetzt: über HeuteTab-Leerzustand, oder direkt beim allerersten Öffnen ohne Pläne) → öffnet Onboarding automatisch; handleCoachDone → saveSettings({schedule})
        tabs/EinstellungenTab.jsx — Wann-trainierst-du (primär: Flexibel|Feste Tage + Wochentag-Picker Mo–So, direkt saveSettings({schedule})) · Rest-Timer (Toggle + Pause-Dauer-Chips 1:00–3:00 → settings.restTimerSec, Default 120) · Erweitert: Zyklus (RhythmPicker, sekundär/optional) · Coach-Split-Editor (falls aktiver Coach-Plan) · Feedback-Modus · Gewichts-Inkremente
        coach/Onboarding.jsx     — Geführtes Briefing (Redesign B): Intro → 4 Schritte (Umfang · Intensität+Längen-Schätzung · Fokus [6 Gruppen Aus·Weniger·Normal·Mehr]+Schmerzen · Wann [Flexibel|Feste Tage]) → Finish mit tippbarer Tag-Vorschau. Slide-Übergänge, live Zusammenfassung (kein Layout-Shift). Emit: {trainingDays, splitId, ambition, repPref, priorities[per-Muskel], pains, schedule}
        coach/planGenerator.js   — SPLIT_CATALOG (Varianten/Größe, genau 1× recommended) + generateCoachPlan; Prio-Level `off`→Muskel raus, sonst low/normal/high. coach/SplitPicker (Onboarding+Settings), coach/RhythmPicker (legacy/Zyklus)
      growth/         — Journaling-Tool (ersetzt Wachstum, Tab 18) — geführter Fluss + Übersicht
        growthContent.json      — 250 Karten / 6 Kategorien / 4 Opener (Guard: growthContent.test.js)
        growthStore.js          — Datenlayer: Ziehlogik (60-Tage-Sperre, Skip-Queue, Bonus), Schwelle, Migration, KI-Prompt, flowAbgeschlossen-Flag
        growthFlowLogic.js      — pure: growthViewMode (flow|overview) + flowSteps (Guard: growthFlowLogic.test.js) — NB: ≠ GrowthFlow.jsx (Case-Kollision auf Windows!)
        TabGrowth.jsx           — Router: briefing | settings | flow | overview. Mode ist STATE (nicht pro Render abgeleitet, sonst kippt der Fluss bei Check-in-Eingabe in die Übersicht). persist zieht dataRef synchron.
        GrowthFlow.jsx          — geführte State-Machine: Ankommen → Karte → (Bonus?) → Freitext → Abschluss, über FlowStepper
        FlowStepper.jsx         — „Tiefe"-Übergang (entering/leaving Layer gleichzeitig; Commit per Timeout → reduced-motion-sicher)
        BreathingCircle.jsx     — Atemkreis (4 ein/6 aus) + 2-Min-Ring + Breath-Label (ambient, kein Auto-Weiter)
        StepAnkommen.jsx        — Ankommen + Check-in verschmolzen; Atemkreis nur bei settings.openerAn (Toggle entfernt nur die Atem-Ebene)
        StepKarte / StepBonusFrage / StepFreitext / StepAbschluss — die übrigen Flow-Schritte
        GrowthOverview.jsx      — Ruhezustand (Ziel von Fertig/Überspringen + Re-Entry): Check-in + Karten (inline edit via TageskarteCard) + Notiz + frühere Tage
        GrowthSection.jsx       — Tagesplaner-Widget ("Karte offen")
        DailyStateRow / TageskarteCard / GrowthArchiv / GrowthBriefing / GrowthSettings
        useAutosave.js          — Debounce-Autosave (Freitext + Antworten)
      haushalt/
        HaushaltBriefing.jsx
        HaushaltSection.jsx     — Eingebettet in TabHeute (Tagesplaner-Widget)
        TabHaushalt.jsx + .module.css
        haushaltData.js
      pizza/          TabPizza.jsx
      rad/            TabRad.jsx
      reminder/
        ReminderSection.jsx     — Eingebettet in TabHeute (Tagesplaner-Widget)
        TabReminder.jsx
      rezepte/
        TabRezepte.jsx          — Home-first-Router: home | Bibliothek (rezepte·ketten·konfig·zutaten) | Durchgang-Wizard (d-gerichte→d-portionen→d-einkauf→d-kochen, gemeinsame Step-Chrome); Screen persistiert via SK.rezepteScreen (ephemer); Overlay-Routing (View/Editor)
        MealprepHome.jsx        — Startseite: Erst-Briefing, Smart-CTA, Froster-Bestand, Bibliothek-Links
        mealprepModel.js        — genId, Konstanten, Factories (createZutat/createRezept/createKorb), istBasis
        mealprepStore.js        — loadAll (Schema-Guard), save*, findUsages, korbSpeichern, korbDuplizieren
        naehrwerte.js           — zutatNaehrwert, rezeptNaehrwertGesamt (rekursiv), rezeptProPortion, formatNaehrwert
        einkauf.js              — sammleZutaten (rekursiv), buildEinkauf
        kochanleitung.js        — buildKochanleitung (Basen 1×, Mise-en-Place)
        konfigurator.js         — verteilePortionen, rezeptAusKonfig, konfigAusRezept
        seed.js                 — Seed-Katalog + Seed-Rezepte (Erststart)
        Naehrwert.jsx           — Mini-Display "480 · 35P 22F 38KH"
        Editor.jsx              — Universelles typ-adaptives Modal (Form A Zutat / Form B Rezept)
        RezeptView.jsx          — Read-Only-Rezeptkarte (Tap auf Namen); Stift → Editor
        Sammlung.jsx            — Kategorie-Karten, aufklappbar, +Rezept, +Kategorie, Suche
        Grossrezepte.jsx        — Basis-Karten mit Ableitungen, Ketten
        Konfigurator.jsx        — Slot-Baukasten, Portionsverteilung, Als-Rezept-speichern
        Zutaten.jsx             — Zutaten-Katalog (klappbare Kategorien, Suche)
        AddPicker.jsx           — Eigenes Dropdown (ersetzt native <select> im Editor)
        PortionenStep.jsx       — ② Portionen: Frisch/TK-Block-Stepper pro Korb-Gericht (hideChrome: Wizard übernimmt Kopf/Steps/Weiter)
        Kochen.jsx              — Einkauf + Kochanleitung (inkl. Einblocken, Froster-Übernahme); im Wizard via forcedView/hideTabBar gesteuert
        Einkauf.jsx             — Einkaufsliste mit 2-State-Tap (gekauft/zurück)
        Kochanleitung.jsx       — Mise-en-Place, Basen, Gerichte, Verpackung — Zeilen abhakbar (Tap)
        kochTodo.js             — buildKochTodoBlock (Korb → Tagesplaner-Todo); Nutzer: Kochen + MealprepSection
        MealprepSection.jsx     — Tagesplaner-Karte: Korb-Inhalt + „Koch-Todo"-Action
      timer/          TabTimer.jsx
      wasjetzt/       TabWasJetzt.jsx
      kognitiv/
        TabKognitiv.jsx         — Router: Heute-first (HeuteHero) + Nav-Screens (einheit-briefing·einheit·briefing·exercise·results·allmodules·auswertung·settings·module/session-detail). Onboarding-Gating via configStore. Gear→Einstellungen
        moduleConfig.js         — MODULE_CONFIG (8 aktiv + archiviert `geteilt`), MODULE_ORDER, PROFILE_DOMAINS (5 Domänen→Module, für Profil-Balken)
        configStore.js          — SK.kognitivConfig: tägliche Einheit (modules + Reihenfolge), reminders (flex|fixed), checkinOn, onboardingDone (+Migration aus altem introSeen)
        sessionStore.js         — SK.kognitiv (Läufe) + pure Helfer: bestMetric/computeDelta/barFraction · formScore/moduleForm/domainForm · isPersonalBest · einheitenInRange/einheitStreak; sessionGroupId/einheitComplete = Einheit-Gruppierung. Guard: sessionStore.test.js
        checkinStore.js         — SK.kognitivCheckin (Schlaf/Energie vor der Einheit) + Skip-Flag
        HeuteHero.jsx           — Startseite: Hero (Einheit-Chips, Ring n/total, Gradient-CTA, Akzent B), 3 Kacheln (Streak/Woche/Ø Dauer), Profil-Balken, Auswertung/Alle-Module
        EinheitBriefing.jsx     — Vorbildschirm der Einheit (Modul-Liste + Dauer) zwischen Check-in und EinheitRunner
        EinheitRunner.jsx       — spielt Module am Stück (Countdown→Übung→…), speichert je Lauf mit gemeinsamer sessionGroupId; EinheitResult.jsx = kombiniertes Ergebnis + Bestwerte
        Onboarding.jsx          — Konfigurator (Erstöffnung): Intro→Auswahl&Reihenfolge→Wann→Finish; EinheitPicker.jsx = geteilte Modul-Auswahl/Reihenfolge (auch in Einstellungen)
        Auswertung.jsx          — Tabs Überblick/Module/Profil; Modul-Sparklines mit antippbaren Punkten → SessionDetail. ModuleDetail/SessionDetail = Tiefenanalyse
        ModuleList.jsx          — „Alle Module" (Einzelspiel) · Briefing.jsx + ModuleDemo.jsx (CSS-Loop-Demos) vor der Übung
        exercises/              — ExerciseShell + 8 Übungen · ShapeIcon.jsx (Kreis/Dreieck/Rechteck/Stern, von N-Back + Speed-Sort geteilt) · exerciseMap.js (moduleId→Übung, Single Source)
        KognitivSection.jsx     — Tagesplaner-Widget (heutige Einheit offen)

  hooks/
    useDragDrop.js
    useDoubleTap.js
    useKeyboardOffset.js

  store/            index.js    — Zustand Store
  storage/          index.js    — sv / lv / SK / exportData / importData
  sync/             crypto.js (AES-GCM, Recovery-Code, getestet) · cloudBackup.js (Cloud-Voll-Backup, getestet) — Server-Code liegt in server/ (Cloudflare Worker + D1)
  styles/           vars.css    — Globale CSS-Variablen + Keyframes
  utils/            index.js    — sk, dateKey, todayKey, parseHHMM, ALL_SLOT_KEYS …
```

---

## CSS Modules

Jede Komponente hat eine eigene `.module.css` Datei.
Kein Inline-CSS außer dynamischen Werten (`style={{ color: x }}`).
Globale Variablen nur in `styles/vars.css`.

---

## State-Regeln

- Zustand Store für alles was über 2 Komponenten-Ebenen geht
- Kein Context-Missbrauch
- Tool-interner State: `useState` im Tool selbst

---

## CSS-Variablen (vars.css) — Stand: Calm Dark Violet

**Hauptpalette:**
- `--primary`  #8B5CF6  (Violett — Hauptakzent)
- `--teal`     #14B8A6  (Teal — sekundärer Akzent / Focus)
- `--emerald`  #10B981  (Grün — Erfolg, Done-States)
- `--rose`     #FB7185  (Rose — nur Löschen/Fehler)
- `--amber`    #f59e0b  (Amber — Warnstufe "bald fällig"; Light Mode: #D97706)

**Backwards-Compat-Aliases (nicht mehr direkt verwenden):**
- `--cyan`   → var(--primary)
- `--green`  → var(--emerald)
- `--pink`   → var(--rose)
- `--purple` → var(--primary)
- `--violet` → var(--primary)

**Backgrounds:** `--bg` #080810 · `--bg2` #0c0c1a · `--bg3` #101020
**Surfaces:** `--surface` rgba(255,255,255,0.065) · `--border` rgba(255,255,255,0.09)
**Text:** `--text` rgba(255,255,255,0.92) · `--text-dim` rgba(255,255,255,0.52)
**Border-Radius:** `--r` 14px · `--r-sm` 8px · `--r-lg` 20px
**Shadows:** `--shadow-sm` · `--shadow-md` · `--shadow-lg`
**Glows:** `--glow-primary` · `--glow-teal` · `--glow-emerald`
**Keyframes:** `fadeInUp` · `toolEnter` · `overlayIn` · `pulse` · `slideInBottom` · `glowPulse` · `shimmer`
**Motion-Tokens:** `--dur-fast` 160ms · `--dur` 240ms · `--dur-slow` 320ms · `--ease-out` (Enter) · `--ease-in` (Exit) · `--ease` · Elevation `--elev-1` · `--elev-drag`
**z-index:** `--z-overlay` 400 (alle Dialoge) · Toast 9999
**Accessibility:** `@media (prefers-reduced-motion: reduce)` — alle Animationen aus

**Light Mode** (`data-theme="light"` und `@media (prefers-color-scheme: light)`):
- Hintergründe warm: #F5F3F0 / #ECEAE5 / #E0DDD7 (statt kaltem Blau-Grau)
- surface/border-Kontrast erhöht, Atmosphären-Gradient für Light Mode
- `App.module.css`: Tab-Bar mit hellem frosted-glass Hintergrund + dunkle Icon-Farben via `data-theme` Override
- Alle ~30 CSS-Module-Dateien: hardcodierte `rgba(255,255,255,X)` durch CSS-Variablen ersetzt (--text, --text-dim, --text-ghost, --text-faint, --border, --border-dim, --surface, --surface-low, --bg2). Box-shadows absichtlich nicht geändert.
- Toast: Light-Mode-Override mit warmem Hintergrund (statt dunklem Popup)

---

## Dialoge — `<Overlay>`-Primitive

`src/components/Overlay/Overlay.jsx` rahmt **alle** echten Dialoge (Backdrop + Karte) einheitlich.

```jsx
<Overlay variant="center" | "sheet" onClose={fn} style={backdropStyle?}>
  {children /* eigene Karte des Dialogs */}
</Overlay>
```

- **Backdrop kanonisch:** `rgba(0,0,0,0.62)` + `blur(18px) saturate(130%)`, `z-index: var(--z-overlay)`, Fade-in über `--dur-fast`. Pro Dialog **kein** eigener Backdrop mehr.
- **`center`** mittig (Keyframe `overlayIn`), **`sheet`** unten angedockt (Keyframe `slideInBottom`) — beide `--dur`/`--ease-out`.
- **Schließt** bei Backdrop-Tap (nur wenn der Backdrop selbst getroffen wird) **und Escape**. Bewusst nicht-schließbare Dialoge (MissedReview, CheckinModal, UpdatePrompt) übergeben einfach kein `onClose`.
- `role="dialog"` + `aria-modal`. `style` wird auf den Backdrop durchgereicht (z.B. Keyboard-Offset).
- **Genutzt von:** TodoModal · KlaerenModal · MissedReviewModal · Zeitplan-RemoveDialog · UpdatePrompt · Konfigurator-SaveDialog · SlotSheet (center) — BirthdaySheet · CheckinModal · BlockerModal · RepeatDeleteSheet (sheet).
- **Nicht** für Vollbild-Modi (FokusView, Kognitiv-Übungen, Fitness-Session, Briefings) — anderer Archetyp.
- **Guard:** `src/components/Overlay/overlay.test.js` erzwingt, dass migrierte Dialog-CSS keinen eigenen Backdrop bzw. `scaleIn`/`slideUp`-Keyframe mehr definieren.

---

## Fonts

**Erlaubt:** Geist (UI, alle Texte — via `var(--font)`) · Orbitron (Zahlen, Timer, Display-Werte — via `var(--font-num)`)
**Verboten:** Inter · Roboto · Arial · System-UI · Space Grotesk · Outfit (war nie geladen)
**Regel:** In CSS nie Font-Namen direkt schreiben — immer `var(--font)` / `var(--font-num)` (auch `Orbitron`/`inherit` ok). Ausnahme: Canvas-Code (`ctx.font`) kann keine CSS-Variablen.
**Guard:** `src/styleguide.test.js` erzwingt das automatisch (Vorbild: Backup-Anti-Drift-Test). (2026-06-10: 31 tote `Outfit`-Referenzen ersetzt.)

---

## Mobile First

Max-Width: 480px. Alles zuerst fürs Handy denken.

---

## App-Icon

Ripple-Design: konzentrische Ringe aus der **oberen linken Ecke** (Ursprung = 0,0), kein Mittelpunkt-Marker, dunkler Hintergrund (`#04030b`), Ringe von hell-lila (innen) nach fast-schwarz (außen).
- `public/favicon.svg` — Browser-Tab
- `public/pwa-192x192.png` / `pwa-512x512.png` — PWA Install

---

## Icons

Keine Emojis als strukturelle Icons. Immer SVG (inline oder als Komponente).
- Tool-Icons: `<ToolIcon id={toolId} size={20} />` aus `toolRegistry.jsx` — nicht `{tool.icon}` (Emoji-Fallback)
- Tab-Bar-Icons: eigene SVG-Komponenten in `App.jsx`
- Alle interaktiven Buttons: SVG-Komponenten, nie Text-Sonderzeichen oder Emojis
- Touch-Targets: min 44×44px für primäre Aktionen, min 36×36px für sekundäre
- DayPanel Geburtstags-Einträge: SVG-Stern (inline, `fill="#FF2D78"`) statt ⭐ Emoji
- TabTimer Pomodoro: SVG Bullseye/Target (inline) statt 🍅 Emoji

---

## App.jsx — Navigation

- Hardware Back-Button (Android): `popstate`-Listener fängt das Event und ruft `setCurrentTab(previousTab)` auf statt grauem Browser-Screen.

## PWA Share-Target + Shortcut (installierte PWA, Android)

- Manifest (`vite.config.js`): `share_target` (GET, params title/text/url) + `shortcuts` („Neues Todo" → `/?neu=1`).
- `App.jsx` konsumiert die URL-Parameter einmalig beim Mount: öffnet das TodoModal, geteilter Text landet via `prefill={{ text }}` im Eingabefeld, danach `history.replaceState` (URL wieder sauber). Muss vor dem popstate-Effect laufen.

---

## ToolHeader-Komponente

Standard-Header für alle Tools:

```jsx
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
<ToolHeader onBack={onBack} icon={<MyIcon />} eyebrow="Tool" title="Toolname" />
```

---

## Tool-Design-Sprache (Patterns)

Aus dem Fitness-Look abgeleitet — gilt für „hochwertige" Tool-Screens (Kognitiv, Fitness …):
- **Hero-Karte**: Kicker mit farbigem Punkt · großer Titel · Meta-Zeile · Fortschritts-Ring · Chips · großer Gradient-CTA.
- **Kacheln**: 3er-Grid, Orbitron-Zahlen (`var(--font-num)`), eine hervorgehoben (Akzent-Rand).
- **Section-Labels**: Caps + letter-spacing, `--text-dim`.
- **Balance-/Profil-Balken**: Label + Track + Fill in Domänen-/Akzentfarbe.
- **Tab-Switcher** (segmented) + **Wochen-Navigator** + **Sparkline-Karten** mit antippbaren Punkten — Granularität bleibt: Punkt = Session → Detail.
- **Akzentlinie-Regel**: kein einseitiger Rand/keine Linie auf runder Ecke (wirkt „abgehackt"). Entweder weicher Schimmer ODER Linie mit transparenten Enden (`linear-gradient(90deg, transparent, …, transparent)`).
- **Gradient-CTA**: `linear-gradient(135deg, color-mix(in srgb, var(--primary) 70%, white), var(--primary))`, Text weiß; Glow via `color-mix(var(--primary) …)`.
- Modul-/Domänen-**Farben sind Daten** (moduleConfig / PROFILE_DOMAINS, Hex in JS) — nicht in CSS-Dateien hardcoden.

---

## Verboten

- Helle Hintergründe
- Tailwind / externe UI-Libs
- Redux
- Auskommentierter Code
- Änderungshistorie im Code
- Over-Engineering
- Neue Farb-Hex-Werte direkt in CSS — immer über vars.css Variablen
- Emojis als Icons in der UI
- `Date.now()` als ID — immer `createBlock()` verwenden
- `localStorage` direkt — immer `sv/lv/SK` aus `storage/index.js`
- TOOL_TAB lokal definieren — immer aus `toolTabs.js` importieren
- `awaitingClockResponse` setzen — deprecated, ClockPopup entfernt
- Zahlenfeld, das ein geleertes Feld auf 0 zwingt (`Number(e.target.value) || 0`, `=== '' ? 0`) — immer `value={x ?? ''}` + `e.target.value === '' ? null : Number(...)`, damit man löschen & neu tippen kann (Guard: `src/inputs.test.js`)

---

## Langfrist-Leitplanke: Cloud-Sync (Zukunft)

**Architektur entschieden (Fable-Review 2026-07-03):** `Dateien/output/sync-architektur.md` — Sync-Policy pro Storage-Key (lww/by-id/by-subkey/device-local/ephemeral), Merge auf dem Client, Server = dummer versionierter Blob-Store (Cloudflare Workers + D1), E2E-verschlüsselt, geteilter Kalender als eigener Store `SK.sharedEvents`. Bau = Roadmap-Projekt 2.

Geplant ist irgendwann ein optionaler Sync (z. B. geteilter Kalender für 2 Personen) + App-Store-Build.
Der Umbau soll **eine Schicht hinter `storage/index.js`** werden — kein App-Umbau. Damit das so bleibt:
- Nutzdaten nie an `sv/lv` vorbei schreiben (gilt schon, bleibt kritisch)
- IDs immer `genId()`/`createBlock()` (UUIDs sind sync-fähig, Zähler/Timestamps nicht)
- Neue Features nicht auf "es gibt nur ein Gerät" bauen (z. B. keine Logik, die doppelte
  Einträge nach Gerät dedupliziert oder von exklusivem Schreibzugriff ausgeht)

---

## Fehlertoleranz & Off-Device-Backup

**ErrorBoundary** (`components/ErrorBoundary/`): wraps den Tab-Content in `App.jsx` mit `key={currentTab}`. Ein Render-Crash in einem Tool zeigt einen ruhigen Fallback (kein Whitescreen) — Tab-Wechsel mountet neu und resettet den Fehler.

**Backup-Schichten**:
- `localStorage` — primärer Speicher, jeder `sv()` schreibt sofort.
- OPFS-Auto-Backup (`saveAutoBackup`, throttle 30 Min) — Spiegel same-origin. Rettet bei Reload/Crash, **stirbt** mit localStorage bei "Browserdaten löschen".
- **Off-Device-Download** — Datei landet außerhalb des Browsers, überlebt Browser-Löschung.
- **Cloud-Backup** (`src/sync/cloudBackup.js`, Sync-Etappe 2) — E2E-verschlüsseltes Voll-Backup (`exportData()` → AES-GCM → eigener Cloudflare Worker, `server/`). Auto-Push stündlich gedrosselt, Trigger in App.jsx neben `saveAutoBackup` (Mount + visibilitychange); `BackupNudge` rechnet Cloud-Alter als Off-Device-Sicherung mit ein. Einrichtung/Restore: Einstellungen → Cloud-Sicherung (`CloudBackupSection.jsx`), Recovery-Code = Schlüssel, Server sieht nur Ciphertext. Neue Keys: `SK.cloudCreds` (Backup: einstellungen) + `SK.cloudMeta` (ephemer). Architektur: `Dateien/output/sync-architektur.md`, Plan: `sync-plan.md`.

**Helfer für Off-Device:**
- `downloadFullBackup()` — exportiert alle Kategorien als JSON-Download + `markOffDeviceBackup()`.
- `offDeviceBackupAgeDays()` / `markOffDeviceBackup()` — Alter seit letzter echter Sicherung (Key `SK.lastOffDeviceBackup`).
- `BackupNudge` (Tagesplaner) erinnert ab > 7 Tagen.

**BACKUP_CATS** (kategorisierter Export/Restore) muss **vollständig** bleiben — jeder neue Storage-Key, der echte Nutzdaten hält, gehört in eine Kategorie (`kalender` / `tools` / `einstellungen`), sonst geht er bei Teil-Restore still verloren. (Historischer Bug: Kognitiv-Sessions + Projekte fehlten.)
