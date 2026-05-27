# Architektur — Globale Regeln

## Ordnerstruktur

```
src/
  components/
    DayNav/           DayNav.jsx              — Datums-Pille oben im Tagesplaner
    NavPill/          NavPill.jsx
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
      QuickAdd/       QuickAdd.jsx
      TabHeute/
        TabHeute.jsx            — Tagesplaner (DayNav + Zeitplan + Pool + Sections)
        useTimeEvents.js        — Hook: abgelaufene/verpasste Slots behandeln
      TabKalender/    TabKalender.jsx
      Zeitplan/
        MissedReviewModal.jsx   — Modal für TimeEvents (abgelaufene/verpasste Slots)
        SlotBlock.jsx           — Einzelner Slot im Zeitplan
        Zeitplan.jsx + .module.css

    settings/         TabSettings/TabSettings.jsx

    todos/            Block.js  — createBlock(), isTermin(), isFaelligkeit(), isTodo()

    tools/
      TabTools/       TabTools.jsx            — Meine Tools / Alle Tools
      toolRegistry.jsx                        — TOOL_REGISTRY + ToolIcon (SVG)
      toolTabs.js                             — TOOL_TAB — Single Source of Truth
      elvi/           TabElvi.jsx
      gamification/   TabGamification.jsx
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
      rezepte/        TabRezepte.jsx
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

---

## Fonts

**Erlaubt:** Outfit (UI, alle Texte) · Orbitron (Zahlen, Timer, Display-Werte)
**Verboten:** Inter · Roboto · Arial · System-UI · Space Grotesk

---

## Mobile First

Max-Width: 480px. Alles zuerst fürs Handy denken.

---

## Icons

Keine Emojis als strukturelle Icons. Immer SVG (inline oder als Komponente).
- Tool-Icons: `<ToolIcon id={toolId} size={20} />` aus `toolRegistry.jsx` — nicht `{tool.icon}` (Emoji-Fallback)
- Tab-Bar-Icons: eigene SVG-Komponenten in `App.jsx`
- Alle interaktiven Buttons: SVG-Komponenten, nie Text-Sonderzeichen oder Emojis
- Touch-Targets: min 44×44px für primäre Aktionen, min 36×36px für sekundäre

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
