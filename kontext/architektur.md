# Architektur — Globale Regeln

## Ordnerstruktur

```
src/
  components/       Globale Komponenten (AddTodoModal, TodoChip, Toast, EditModal, PrioBadge, ToolHeader)
  features/
    calendar/       TabHeute, TabKalender, Zeitplan, Pool, QuickAdd, KiPlanSection
                    └─ Zeitplan/ClockPopup.jsx  (Clock-Popup wenn Slot-Zeit abläuft)
                    └─ TabHeute/DayNav.jsx       (Datums-Pille oben im Tagesplaner)
    settings/       TabSettings
    todos/          Block.js (Datentyp + createBlock + PRIO)
    tools/          TabTools, toolRegistry.js (+ ToolIcon), toolTabs.js (TOOL_TAB — Single Source)
                    + alle Tool-Unterordner
  hooks/            useDragDrop.js, useDoubleTap.js, useKeyboardOffset.js
  store/            index.js (Zustand)
  storage/          index.js (sv/lv + SK)
  styles/           vars.css (globale CSS-Variablen)
  utils/            index.js (sk, dateKey, slotPx, todayKey, parseHHMM, ALL_SLOT_KEYS)
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
- `--primary`  #8B5CF6  (Violett — Hauptakzent, ersetzt --cyan)
- `--teal`     #14B8A6  (Teal — sekundärer Akzent / Focus)
- `--emerald`  #10B981  (Grün — Erfolg, CTA, ersetzt --green)
- `--rose`     #FB7185  (Rose — nur Löschen/Fehler, ersetzt --pink)

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
Tool-Icons: `<ToolIcon id={toolId} size={20} />` aus `toolRegistry.js` — nicht `{tool.icon}` (Emoji-Fallback).
Tab-Bar-Icons: eigene SVG-Komponenten in `App.jsx`.

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
