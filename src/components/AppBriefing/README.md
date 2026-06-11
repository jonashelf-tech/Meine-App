# AppBriefing — Onboarding-Tour

Geführte Tour beim ersten App-Start. Zeigt versteckte Funktionen, indem sie die
**echten** Komponenten (Zeitplan, Pool, DayPanel, TodoModal) mit **Demo-Daten** rendert —
komplett isoliert (lokaler State, kein Store-Zugriff, nichts wird gespeichert).

## Aufbau

- `AppBriefing.jsx` — Controller: rendert `STEPS[step]`, Kapitel/Fortschritt/Skip/Weiter/Zurück.
- `briefingContent.jsx` — `STEPS`-Array + die Stage-Komponenten (= der Inhalt).
- `DemoPlanner.jsx` — rendert echten `Zeitplan` + `Pool` mit Demo-Props, alle Callbacks no-op.
  Reicht `registerHalf` durch → Animation kann echte Slot-/Pool-Elemente messen.
- `TapPulse.jsx` — pulsierender Tap-Indikator über einem gemessenen Ziel-Element.

## Verkabelung (steht, nicht anfassen)

- `store/index.js`: `briefingOpen` / `setBriefingOpen` (flüchtig).
- `App.jsx`: First-Run-Check (`lv(SK.appBriefingSeen)`) → öffnet einmalig; `closeBriefing` setzt `seen`.
- `TabSettings.jsx`: Button „Einführung nochmal ansehen" → `setBriefingOpen(true)`.
- `storage/index.js`: `SK.appBriefingSeen` in `BACKUP_CATS.einstellungen` (Anti-Drift-Test grün).

## Einen Schritt hinzufügen

In `briefingContent.jsx` ans `STEPS`-Array anhängen:

```jsx
{ chapter: 'Tagesplaner', title: '…', text: <>… <strong>fett</strong> …</>, Stage: MeineStage }
```

Controller macht Navigation/Fortschritt automatisch. Letzter Schritt = „Fertig ✓".

## Stage-Templates (verifiziert)

1. **`GlideStage({ todoIndex, slotKey, reverse })`** — echter Planer, ein Ghost-Chip gleitet
   flüssig Pool↔Slot (Positionen zur Laufzeit gemessen, CSS-Transition). Für **Drag-Tricks**.
   Der Planer ist höher als das Fenster → die Geste wird pro Animationszyklus mittig
   gescrollt, damit Pool-Start und Ziel-Slot beide sichtbar sind.
2. **`ControlStage({ find })`** — DemoPlanner (volle Toolbar, no-op-Callbacks) + `TapPulse` auf
   ein per `find(...)` gefundenes Toolbar-Element. Für **„antippen"-Tricks**.
3. **`ModalStage({ find })`** — echtes `TodoModal` eingebettet. Der `.modalWrap` mit `transform: translateZ(0)`
   macht das `fixed`-Overlay **stage-lokal** (nicht bildschirmfüllend). Für **Todos-/Modal-Tricks**.
4. **`WeekGridDemo`** — eigenes Wochen-Grid, das die **echten** `TabKalender.module.css`-Klassen
   wiederverwendet (pixelgleich, read-only, Ghost-Block gleitet über Tag+Uhrzeit). Der
   echte `TabKalender` wurde NICHT umgebaut. (`mode="create"`-Variante existiert weiter im
   Component, wird aktuell nicht genutzt.)
5. **`MissedStage`** — echtes `MissedReviewModal` eingebettet (gleicher Transform-Trick).

Info-Schritte ohne echte Komponenten: `StageTools` / `StageBackup` (= `.infoStage`).

`TapPulse` holt sein Ziel automatisch ins Sichtfeld (`scrollIntoView` im scrollbaren `.stageWrap`),
falls es außerhalb liegt. Wichtig: `behavior: 'auto'`, nicht `'smooth'` — Smooth-Scroll greift im
Briefing-Overlay nicht (bleibt bei scrollTop 0).

## Status: 7 Schritte (2026-06: von 18 auf 7 gekürzt)

Bewusst nur, was man nicht durch Ausprobieren findet: Drag&Drop (GlideStage) · +Fenster
(ControlStage) · Verpasstes nachholen (MissedStage) · Woche&Monat (WeekGridDemo) · Auto-Knopf
(ModalStage) · Tools (StageTools) · Backup (StageBackup).

Entfernt (Stages mit-gelöscht): DayNavStage, DayPanelStage, MonthGridDemo, Lock/30min/Ansichten/
Zeitbereich/Pool-Sortierung/Schritte/Termin-Schritte. Neue Tricks: einfach `STEPS` erweitern.

## Hinweise für die Modal-/Grid-Tricks

- `BlockerModal` / `MissedReviewModal` einbetten: gleicher Transform-Trick wie ModalStage
  (`.modalWrap`). Vorher kurz prüfen, dass sie prop-getrieben sind (Props rein, keine
  Store-Schreibzugriffe ohne Bestätigung) — TodoModal war's auch.
- `MonthGridDemo`: wie `WeekGridDemo` bauen, nur die `wk.month*`-Klassen aus
  `TabKalender.module.css` wiederverwenden. Den echten `TabKalender` NICHT umbauen.

## ⚠️ Verifikation in dieser Umgebung

- **Screenshots timen aus** an den echten Komponenten (Compositor-Limit). Stattdessen mit
  `preview_eval` per DOM-Checks verifizieren (Element vorhanden, Overlay-Höhe eingegrenzt, …)
  **und Jonas an localhost gucken lassen.** Nicht auf Screenshots verlassen.
- Embedded-Modal-Höhe `.modalWrap` = `max-height: 540px` — bei langen Modals ggf. anpassen,
  sonst wird unten abgeschnitten.
- `DayPanel` liest echte Tool-Daten des Demo-Tages (Kognitiv/Elvi/Gewicht/Wachstum) read-only;
  bei frischem Nutzer leer.
