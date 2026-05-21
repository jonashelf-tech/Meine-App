# Keyboard-Aware Modals

**Datum:** 2026-05-21  
**Status:** Approved

## Problem

Alle Overlays (`EditModal`, `AddTodoModal`, `ClockPopup`) nutzen `align-items: center`. Wenn auf Mobile die virtuelle Tastatur aufgeht, überdeckt sie die untere Bildschirmhälfte — das Modal bleibt mittig und wird halb verborgen.

## Ziel

Modal sitzt zentriert wenn keine Tastatur offen ist. Sobald die Tastatur erscheint, rutscht das Modal nach oben und bleibt vollständig sichtbar.

## Lösung: Ansatz A — `useKeyboardOffset` Hook

### Neuer Hook `src/hooks/useKeyboardOffset.js`

- Hört auf `window.visualViewport` → `resize`-Event
- Berechnet Tastaturhöhe: `window.innerHeight - visualViewport.height`
- Gibt `paddingBottom` (Zahl, px) zurück — `0` wenn Tastatur zu oder kein visualViewport
- Kein Effect-Cleanup vergessen (removeEventListener)

### Integration in Modals

Gleiches Muster in allen drei Komponenten:

```jsx
const keyboardOffset = useKeyboardOffset();
const overlayStyle = keyboardOffset > 0
  ? { alignItems: 'flex-start', paddingTop: 16, paddingBottom: keyboardOffset }
  : {};

<div className={styles.overlay} style={overlayStyle}>
```

- `keyboardOffset === 0` → leeres `overlayStyle` → CSS-Default (`align-items: center`) greift
- `keyboardOffset > 0` → Modal nach oben, `paddingBottom` verhindert Überschneidung mit Tastatur

### CSS-Dateien

Keine Änderungen. `align-items: center` bleibt als Default-Fallback.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/hooks/useKeyboardOffset.js` | neu |
| `src/components/EditModal/EditModal.jsx` | Hook einbinden + `overlayStyle` |
| `src/components/AddTodoModal/AddTodoModal.jsx` | Hook einbinden + `overlayStyle` |
| `src/features/calendar/Zeitplan/ClockPopup.jsx` | Hook einbinden + `overlayStyle` |

## Nicht in Scope

- CSS-Dateien der Modals
- Andere Overlays/Tooltips ohne Texteingabe
