# Swipe-Navigation — Design Spec
_2026-05-28_

## Ziel

Horizontales Wischen auf dem Bildschirm navigiert in Tagesplaner und Kalender einen Tag / eine Woche / einen Monat vor oder zurück. Der Inhalt folgt live dem Finger und snappt mit einer hochwertigen Slide-Animation ein.

---

## Hook: `usePageSwipe`

**Datei:** `src/hooks/usePageSwipe.js`

**Signatur:**
```js
usePageSwipe(ref, { onPrev, onNext, disabled? })
```

- `ref` — React-Ref auf das zu wischende Container-Element
- `onPrev()` — Callback: einen Schritt zurück (vorheriger Tag / Woche / Monat)
- `onNext()` — Callback: einen Schritt vor
- `disabled` — boolean, unterbricht Swipe-Erkennung (z. B. wenn Modal offen)

Der Hook registriert Touch-Listener direkt auf dem DOM-Element (nicht via React-Events, damit `preventDefault()` für passive-Event-Konflikte funktioniert, `{ passive: false }`).

---

## Touch-Logik

### touchstart
- `startX`, `startY`, `startTime` speichern
- `swipeMode = null` (undecided), `delta = 0`

### touchmove
- `deltaX = currentX - startX`, `deltaY = currentY - startY`
- Ersten signifikanten Move (>5px) auswerten:
  - `|deltaX| > |deltaY|` → `swipeMode = true`, `e.preventDefault()` (blockiert Scroll)
  - `|deltaY| > |deltaX|` → `swipeMode = false`, hook ignoriert den Rest des Touches
- Bei `swipeMode = true`:
  - `element.style.transition = 'none'`
  - `element.style.transform = translateX(${deltaX}px)`
  - Leichte Opacity-Dämpfung: `opacity = 1 - Math.abs(deltaX) / 800`

### touchend
- Velocity: `v = deltaX / (Date.now() - startTime)` (px/ms)
- Navigieren wenn: `Math.abs(v) > 0.3` ODER `Math.abs(deltaX) > window.innerWidth * 0.3`
- `deltaX > 0` → `animateNavigate('prev')`, sonst `animateNavigate('next')`
- Sonst → Snap-back

---

## Animations-Sequenz

### `animateNavigate(direction)`

```
1. Exit-Animation:
   transition: transform 260ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
   transform: translateX(direction === 'prev' ? +100% : -100%)

2. Nach 260ms:
   flushSync(() => direction === 'prev' ? onPrev() : onNext())
   // → React rendert neue Inhalte synchron ins DOM

3. Enter-Start (kein Transition):
   transition: none
   transform: translateX(direction === 'prev' ? -100% : +100%)

4. Ein Frame warten (requestAnimationFrame)

5. Enter-Animation:
   transition: transform 260ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
   transform: translateX(0)
   opacity: 1
```

`flushSync` (aus `react-dom`) erzwingt synchrones Re-Render, damit der neue Inhalt im DOM ist, bevor die Enter-Animation startet.

### Snap-back (nicht genug Schwung)

```
transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)
transform: translateX(0)
opacity: 1
```

Leichter Federstoß zurück — fühlt sich elastisch an, nicht starr.

---

## Integration

| View | Datei | `ref` auf | Navigiert |
|---|---|---|---|
| Tagesplaner | `TabHeute.jsx` | Container unter `DayNav` | ±1 Tag (`shiftDay`) |
| Kalender Woche | `TabKalender.jsx` | `.weekWrapper` | ±7 Tage (`setWeekStart`) |
| Kalender Monat | `TabKalender.jsx` | `.monthGrid` | ±1 Monat (`setMonthRef`) |

`DayNav` und `NavPill` bleiben fix und werden nicht in den Swipe-Container eingeschlossen.

### `disabled`-Bedingungen
- **TabHeute:** wenn `editingTodo !== null` oder `blockerModal !== null` oder `klaerenTodo !== null`
- **TabKalender:** wenn `restoreTodo !== null`

---

## Konflikt-Vermeidung

- **Vertikaler Scroll / Drag-Drop:** Richtungscheck auf dem ersten 5px-Move. Vertikale Geste → hook ignoriert den Touch vollständig, kein Interference.
- **Passive Events:** Listener mit `{ passive: false }` registrieren, damit `preventDefault()` auf `touchmove` funktioniert.
- **Cleanup:** Listener werden in `useEffect`-Cleanup entfernt.

---

## Was NICHT geändert wird

- `DayNav`, `NavPill`, `Zeitplan`, `Pool` — keine Änderungen
- Keine neuen Dependencies
- Kein CSS-Modul nötig (reine Inline-Style-Manipulation)
