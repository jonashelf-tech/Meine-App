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

## Drei Stage-Templates (verifiziert)

1. **`GlideStage({ todoIndex, slotKey, reverse })`** — echter Planer, ein Ghost-Chip gleitet
   flüssig Pool↔Slot (Positionen zur Laufzeit gemessen, CSS-Transition). Für **Drag-Tricks**.
   Der Planer ist höher als das Fenster → die Geste wird pro Animationszyklus mittig
   gescrollt, damit Pool-Start und Ziel-Slot beide sichtbar sind.
2. **`DayPanelStage`** — echtes Kalender-`DayPanel` + `TapPulse` + Mini-Restore-Dialog. Für
   **Kalender-Tricks** (DayPanel ist prop-getrieben, mit `initialOpen` Karten aufklappen).
3. **`ModalStage`** — echtes `TodoModal` eingebettet. Der `.modalWrap` mit `transform: translateZ(0)`
   macht das `fixed`-Overlay **stage-lokal** (nicht bildschirmfüllend). Für **Todos-/Modal-Tricks**.

Für reine „antippen"-Tricks: `DemoPlanner` (mit belegtem Slot) + `TapPulse` auf das Ziel-Element
(`getTarget` per `stageRef.current.querySelector(...)`).

4. **`WeekGridDemo`** — eigenes Wochen-Grid, das die **echten** `TabKalender.module.css`-Klassen
   wiederverwendet (pixelgleich, read-only, Ghost-Block gleitet über Tag+Uhrzeit). **Wichtig:** der
   echte `TabKalender` wurde NICHT umgebaut (Drag-Logik zu tief inline → blind zu riskant). Optik
   identisch über geteilte CSS. Ein `MonthGridDemo` baust du analog (gleiche `wk.month*`-Klassen).

Info-Schritte ohne echte Komponenten: `StageTools` / `StageBackup` (= `.infoStage`).

## Gebaut — erste 12 Schritte (Gesamt 18, Rest siehe „Status" unten)

1. Plane per Drag & Drop (GlideStage) · 2. Tag verschieben ▲▼30min (ControlStage) ·
3. Termine festnageln / Schloss (ControlStage, lockLoop) · 4. Zeit blocken / +Fenster (ControlStage) ·
5. Drei Ansichten Alles/Minimal/Fokus (ControlStage) · 6. Zeitbereich +/− (ControlStage) ·
7. Erledigtes wiederherstellen (DayPanelStage) · 8. Wochenplan Drag (WeekGridDemo mode=drag) ·
9. Tippen legt an (WeekGridDemo mode=create, Modal öffnet kurz) · 10. Auto-Knopf (ModalStage) ·
11. Tools-Konzept (StageTools) · 12. Backup (StageBackup)

`ControlStage` (in briefingContent.jsx) ist die Vorlage für „antippen"-Tricks: DemoPlanner (volle
Toolbar, da `onCreateBlocker`/`onFokusMode` no-op übergeben) + TapPulse auf ein per `find(...)`
gefundenes Element. `withSlot` legt einen Demo-Slot rein, `lockLoop` toggelt dessen Lock.

`TapPulse` holt sein Ziel automatisch ins Sichtfeld (`scrollIntoView` im scrollbaren `.stageWrap`),
falls es außerhalb liegt — z.B. die Pool-Sortierung ganz unten. Wichtig: `behavior: 'auto'`, nicht
`'smooth'` — Smooth-Scroll greift im Briefing-Overlay nicht (bleibt bei scrollTop 0).

## Status: komplett — 18 Schritte (alle DOM-verifiziert)

Zusätzlich zu den 12 oben gebaut:
- **Tagesplaner:** Jeden Tag planen (`DayNavStage`) · Verpasstes nachholen (`MissedStage`,
  echtes `MissedReviewModal` eingebettet) · Pool sortieren (`ControlStage`)
- **Kalender:** Monat & Tagesansicht (`MonthGridDemo` — gleiche CSS-Reuse-Methode wie WeekGridDemo)
- **Todos:** In Schritte zerlegen + Termin oder Aufgabe? (`ModalStage`-Varianten, generalisiert
  über `find` + `todoFactory`)

Alle Tricks aus Jonas' Feedback sind drin. Neue Tricks: einfach `STEPS` erweitern (Templates oben).

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
