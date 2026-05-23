# Design: Vergangene Ereignisse — Missed Review Modal

**Datum:** 2026-05-23  
**Status:** Approved

---

## Problem

Wenn man die App mehrere Tage nicht öffnet, gibt es zwei bestehende Mechanismen für verpasste Items die beide problematisch sind:

1. **Stilles Auto-Return** — text-only Slots aus vergangenen Tagen werden automatisch als neue Todos in den Pool gelegt, ohne dass der User gefragt wird
2. **missedQueue** — Todos mit `awaitingClockResponse: true` werden einzeln nacheinander als ClockPopup angezeigt → bei mehreren Tagen Abwesenheit viel zu viele einzelne Popups

Beide Mechanismen werden ersetzt durch einen einzigen **Missed Review Modal**.

---

## Lösung

Ein Modal (Overlay) das **einmal pro Tag beim ersten App-Öffnen** erscheint, wenn es unerledigte Items aus vergangenen Tagen gibt. Der User kann Items auswählen und per Bulk-Aktion als erledigt markieren, ignorieren oder in den Pool verschieben.

---

## Trigger & Häufigkeit

- Läuft einmal pro Tag beim Mount von `TabHeute` (via `useMissedReview`-Hook)
- Throttle via `SK.lastPoolReturn` — wird gesetzt sobald der Dialog abgeschlossen wird
- Öffnet man die App erneut am selben Tag: `lastPoolReturn === today` → kein Dialog
- Nächster Tag: Datum veraltet → Prüfung läuft, Dialog nur wenn Items vorhanden
- Keine unerledigten Vergangenheits-Items → kein Dialog, kein Popup
- **Edge case:** App wird mid-Dialog force-geschlossen → `lastPoolReturn` noch nicht gesetzt → nächstes Öffnen zeigt Dialog erneut (gewollt, kein Datenverlust)

---

## Items im Dialog

Gesammelt werden alle unerledigten Items aus `days[dk]` wobei `dk < todayKey()`:

| Typ | Bedingung |
|---|---|
| Text-only Slot | `!slot.done && slot.text && !slot.todoId && !slot.reviewed` |
| Todo-Slot | `!slot.done && slot.todoId && todo.awaitingClockResponse === true && !slot.reviewed` |

---

## Aktionen

| Aktion | Text-only Slot | Todo mit awaitingClockResponse |
|---|---|---|
| **Erledigt** | `slot.done = true`, `slot.reviewed = true` | `todo.done = true`, `todo.doneAt = now`, `todo.awaitingClockResponse = false`, `slot.reviewed = true` |
| **Ignorieren** | `slot.reviewed = true` — kein Todo erstellt | `todo.awaitingClockResponse = false`, `slot.reviewed = true` — Todo bleibt im Pool |
| **In Pool verschieben** (alle verbleibenden) | Neues Todo im Pool erstellt (`createBlock`), `slot.reviewed = true` | `todo.awaitingClockResponse = false`, `slot.reviewed = true` — Todo bleibt im Pool |

Nach „In Pool verschieben": `SK.lastPoolReturn = today`, Modal schließt.

---

## Dialog UI

```
┌─────────────────────────────────┐
│  📋  Vergangene Ereignisse      │
│  3 Einträge aus vergangenen     │
│  Tagen                          │
├─────────────────────────────────┤
│  ☐  [●] Meeting vorbereiten     │
│      Di 20.05 · 09:00           │
│                                 │
│  ☐  [●] Medikamente bestellen   │
│      Di 20.05 · 14:00           │
│                                 │
│  ☐  [●] Sport                   │
│      Mi 21.05 · 08:00           │
├─────────────────────────────────┤
│  [Alle]  [Keine]                │
│                                 │
│  ✓ Erledigt    ✕ Ignorieren     │
│                                 │
│  → In Pool verschieben          │
└─────────────────────────────────┘
```

- Farbstreifen links pro Item (`slot.color` oder `todo.color`)
- Datum + Uhrzeit klein darunter (aus `dateKey` + `slotKey`)
- `Alle` / `Keine` — Bulk-Selektion aller Checkboxen
- `✓ Erledigt` / `✕ Ignorieren` — wirken auf aktuell ausgewählte Items, Liste aktualisiert sich, Checkboxen resetten danach
- `→ In Pool verschieben` — einzige Möglichkeit Modal zu schließen, alle verbleibenden Items landen im Pool
- Kein X-Button — erzwingt aktive Entscheidung

---

## Datenmodel-Änderung

**Slot** bekommt optionales Feld:
```js
reviewed: false  // boolean — verhindert erneutes Erscheinen im Dialog
```

Kein neuer Storage-Key nötig — `reviewed` wird direkt auf dem Slot im `days`-Store persistiert.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/features/calendar/TabHeute/TabHeute.jsx` | Auto-Return-Logik + missedQueue entfernen, `useMissedReview` einbinden, Modal rendern |
| `src/features/calendar/TabHeute/useMissedReview.js` | **Neu** — Hook, sammelt Items, liefert Modal-State + Handler |
| `src/features/calendar/Zeitplan/MissedReviewModal.jsx` | **Neu** — Modal-Komponente |
| `src/features/calendar/Zeitplan/MissedReviewModal.module.css` | **Neu** — Styles |
| `kontext/kern.md` | Slot-Datenstruktur um `reviewed?: boolean` ergänzen |

---

## Was nicht ändert

- Gleichtägige ClockPopups (Slots deren Zeit gerade abläuft) bleiben unverändert
- `SK.lastPoolReturn` bleibt als Tages-Throttle
- Pool-Sortierung, Drag & Drop, alle anderen Mechanismen unberührt
