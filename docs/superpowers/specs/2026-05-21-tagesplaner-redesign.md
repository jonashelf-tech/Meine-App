# Tagesplaner & TodoChips Redesign

**Datum:** 2026-05-21  
**Ansatz:** A — Kalender-Harmonisiert

---

## Ziel

Tagesplaner (Zeitplan + Pool) visuell an den Kalender angleichen, Dauer-Bug fixen, Lock-Hover bei Drag implementieren.

---

## Layout — Grid+ mit echtem span

Das Slot-Grid bleibt ein CSS-Grid (`grid-template-columns: 28px 1fr`), aber die Dauer-Visualisierung wird korrigiert:

- **Vorher:** `height: slotPx(duration)` auf dem `.sgHalf` div — unzuverlässig, weil CSS-Grid `grid-auto-rows: auto` die Höhe nicht immer korrekt übernimmt
- **Nachher:** `grid-row: rowBase / span N` wobei `N = Math.ceil(duration / 30)` — die Grid-Zeilen spannen korrekt

**`ROW_H`:** 40px → **48px** für bessere Touch-Targets.

**Consumed-Cells:** Wenn ein Slot N Rows spannt (`grid-row: rowBase / span N`), werden die N-1 nachfolgenden Halb-Zellen mit `style={{ display: 'none' }}` gerendert. Das gilt auch über Stundenreihen hinweg — ein 90min-Slot bei 8:00 consumed 8:30 AND 9:00, wobei 9:00 in der Renderschleife von Stunde 9 als consumed erkannt und ausgeblendet wird. Der `consumedKeys`-Set in `Zeitplan.jsx` bleibt für diese Erkennung zuständig.

---

## SlotBlock — neues visuelles Design

```
┌─[3px stripe]──────────────────────────[○ done][🔒/⠿]─┐
│  Text (0.82rem, bold, white/0.85)                      │
│  Meta: 60min · Kategorie  (wenn vorhanden)             │
└────────────────────────────────────────────────────────┘
```

**Aufbau (flex, align: stretch):**
- Links: 3px Farbstripe (slot.color)
- Mitte: Body — Text + Meta (font-size: 0.54rem, gedimmt)
- Rechts: Done-Circle (14px, kreis, Tap = toggle) + Handle-Column (Lock oder Drag)

**Done-Circle:**
- Leer: `border: 1.5px solid rgba(255,255,255,0.18)`, keine Füllung
- Erledigt: `background: rgba(16,185,129,0.25)`, grüner Border, `✓` darin

**Handle-Column (36px breit, border-left):**
- Slot unlocked: Drag-Dots-Icon, `color: rgba(255,255,255,0.18)`
- Slot locked: `🔒`-Icon (12×14px), `color: var(--primary)`, `filter: drop-shadow(0 0 5px rgba(139,92,246,0.45))`
- Drag-Hover auf locked slot: stärkerer Glow via `:global(.dnd-half-locked) .slotHandle`

**Slot border-radius:** 6px (statt 4px)  
**Slot margin:** `2px 3px 2px 2px` (klein, damit Grid-Lines weiter sichtbar bleiben)

**Done-State des Slots:** `opacity: 0.5`, Text `text-decoration: line-through`

---

## Lock-Icon — 3 Zustände

| Zustand | Icon | Color | Filter |
|---------|------|-------|--------|
| Offen (Drag-Handle) | Dots-SVG | `rgba(255,255,255,0.18)` | — |
| Gesperrt | Lock-SVG (12×14) | `var(--primary)` | `drop-shadow(0 0 5px rgba(139,92,246,0.45))` |
| Drag-Hover auf gesperrtem Slot | Lock-SVG | `#c4b5fd` | `drop-shadow(0 0 12px rgba(139,92,246,0.85))` |

**Drag-Hover-Fix:** `useDragDrop.js` fügt bereits `.dnd-half-locked` auf das `.sgHalf`-Element. Der Fix liegt in der CSS-Regel:
```css
/* In Zeitplan.module.css */
:global(.dnd-half-locked) .slotHandle {
  color: #c4b5fd;
  filter: drop-shadow(0 0 12px rgba(139,92,246,0.85));
}
:global(.dnd-half-locked) .slotHandleLocked {
  color: #c4b5fd;
  filter: drop-shadow(0 0 12px rgba(139,92,246,0.85));
}
```
Das gilt in beide Richtungen (Pool-Chip-Drag über gesperrten Slot, und Slot-Drag über gesperrten Slot).

---

## Controls-Leiste

**Neu:**
```
[▲ 30min] [▼ 30min]    [Alle | Min]
```
- `Alles/Minimal`-Toggle bleibt, rückt nach rechts
- Kein Range-Pill (zu viel UI für wenig Nutzen)

**Expand-Rows:**
```
[+ früher]  [− früh]    ← oben
...grid...
[− spät]  [+ später]    ← unten
```
Alle 4 Buttons bleiben — visuell unverändert.

---

## Entfernte Features

| Feature | Begründung |
|---------|-----------|
| Außenbereich-Hinweise | Mit "+ früher/später" überflüssig |
| Pool-Vollbild-Button (⤢) | Kein echtes Use-Case auf 480px |

---

## Pool

Minimale Änderungen:
- Vollbild-Button (⤢) entfernt
- Pool-Header ohne Vollbild-Button kompakter
- Chip-Design bleibt gleich (TodoChip unverändert)
- Placed-Chip zeigt weiterhin `↩` statt Drag-Dots

---

## Betroffene Dateien

| Datei | Änderung |
|-------|---------|
| `src/features/calendar/Zeitplan/Zeitplan.jsx` | Grid-Span statt height, neue SlotBlock-Struktur, Controls aufräumen |
| `src/features/calendar/Zeitplan/Zeitplan.module.css` | Kompletter visueller Umbau, `:global(.dnd-half-locked)` Regel |
| `src/features/calendar/Pool/Pool.jsx` | Vollbild-Button entfernen |
| `src/features/calendar/Pool/Pool.module.css` | Vollbild-Styles entfernen |
| `src/utils/index.js` | `ROW_H` ist lokal in Zeitplan.jsx — kein Utils-Änderung nötig |

**Nicht angefasst:** `useDragDrop.js`, `TodoChip.jsx`, `TabHeute.jsx`, `ClockPopup.jsx`

---

## Nicht in Scope

- TodoChip selbst (Datenstruktur, Sub-Items, Edit-Modal) — bleibt unverändert
- Clock-Popup — bleibt unverändert  
- useDragDrop.js Logik — bleibt unverändert (nur CSS-Effekt fehlt)
- Pool-Gruppierung (Heute relevant / Offen) — bleibt unverändert
