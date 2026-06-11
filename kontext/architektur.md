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
    TodoChip/         TodoChip.jsx + .module.css  — Stripe wird ausgeblendet wenn `glowColor` prop gesetzt (toolId aktiv)
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
        SlotSheet.jsx           — Bottom-Sheet beim Tap auf leeren Slot: + Neu / Pool-Todo platzieren
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
      gewicht/        TabGewicht.jsx
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
        TabRezepte.jsx          — Container, 5 Tabs (Rezepte·Ketten·Konfig·Zutaten·Kochen), Overlay-Routing (View/Editor)
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
        Kochen.jsx              — Kochen-Tab: Auswahl + Unteransichten Kochanleitung/Einkauf
        Einkauf.jsx             — Einkaufsliste mit 2-State-Tap (gekauft/zurück)
        Kochanleitung.jsx       — Mise-en-Place, Basen, Gerichte, Verpackung — Zeilen abhakbar (Tap)
        kochTodo.js             — buildKochTodoBlock (Korb → Tagesplaner-Todo); Nutzer: Kochen + MealprepSection
        MealprepSection.jsx     — Tagesplaner-Karte: Korb-Inhalt + „Koch-Todo"-Action
      timer/          TabTimer.jsx
      wasjetzt/       TabWasJetzt.jsx

  hooks/
    useDragDrop.js
    useDoubleTap.js
    useKeyboardOffset.js

  store/            index.js    — Zustand Store
  storage/          index.js    — sv / lv / SK / exportData / importData
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
**Keyframes:** `fadeInUp` · `pulse` · `slideInBottom` · `glowPulse` · `shimmer`
**Accessibility:** `@media (prefers-reduced-motion: reduce)` — alle Animationen aus

**Light Mode** (`data-theme="light"` und `@media (prefers-color-scheme: light)`):
- Hintergründe warm: #F5F3F0 / #ECEAE5 / #E0DDD7 (statt kaltem Blau-Grau)
- surface/border-Kontrast erhöht, Atmosphären-Gradient für Light Mode
- `App.module.css`: Tab-Bar mit hellem frosted-glass Hintergrund + dunkle Icon-Farben via `data-theme` Override
- Alle ~30 CSS-Module-Dateien: hardcodierte `rgba(255,255,255,X)` durch CSS-Variablen ersetzt (--text, --text-dim, --text-ghost, --text-faint, --border, --border-dim, --surface, --surface-low, --bg2). Box-shadows absichtlich nicht geändert.
- Toast: Light-Mode-Override mit warmem Hintergrund (statt dunklem Popup)

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

---

## Langfrist-Leitplanke: Cloud-Sync (Zukunft)

Geplant ist irgendwann ein optionaler Sync (z. B. geteilter Kalender für 2 Personen) + App-Store-Build.
Der Umbau soll **eine Schicht hinter `storage/index.js`** werden — kein App-Umbau. Damit das so bleibt:
- Nutzdaten nie an `sv/lv` vorbei schreiben (gilt schon, bleibt kritisch)
- IDs immer `genId()`/`createBlock()` (UUIDs sind sync-fähig, Zähler/Timestamps nicht)
- Neue Features nicht auf "es gibt nur ein Gerät" bauen (z. B. keine Logik, die doppelte
  Einträge nach Gerät dedupliziert oder von exklusivem Schreibzugriff ausgeht)

---

## Fehlertoleranz & Off-Device-Backup

**ErrorBoundary** (`components/ErrorBoundary/`): wraps den Tab-Content in `App.jsx` mit `key={currentTab}`. Ein Render-Crash in einem Tool zeigt einen ruhigen Fallback (kein Whitescreen) — Tab-Wechsel mountet neu und resettet den Fehler.

**Backup-Schichten** (alles in `storage/index.js`):
- `localStorage` — primärer Speicher, jeder `sv()` schreibt sofort.
- OPFS-Auto-Backup (`saveAutoBackup`, throttle 30 Min) — Spiegel same-origin. Rettet bei Reload/Crash, **stirbt** mit localStorage bei "Browserdaten löschen".
- **Off-Device-Download** — der einzige Pfad, der eine Browser-Löschung überlebt (Datei landet außerhalb des Browsers).

**Helfer für Off-Device:**
- `downloadFullBackup()` — exportiert alle Kategorien als JSON-Download + `markOffDeviceBackup()`.
- `offDeviceBackupAgeDays()` / `markOffDeviceBackup()` — Alter seit letzter echter Sicherung (Key `SK.lastOffDeviceBackup`).
- `BackupNudge` (Tagesplaner) erinnert ab > 7 Tagen.

**BACKUP_CATS** (kategorisierter Export/Restore) muss **vollständig** bleiben — jeder neue Storage-Key, der echte Nutzdaten hält, gehört in eine Kategorie (`kalender` / `tools` / `einstellungen`), sonst geht er bei Teil-Restore still verloren. (Historischer Bug: Kognitiv-Sessions + Projekte fehlten.)
