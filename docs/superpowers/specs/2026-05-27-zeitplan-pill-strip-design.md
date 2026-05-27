# Zeitplan: Pill-Strip für Rand-Kontrolle und Out-of-Range-Todos

## Zusammenfassung

Der Zeitplan bekommt oben und unten eine neue "Pill-Leiste" die zwei Aufgaben übernimmt: die bisherigen + / − Steuer-Buttons ersetzen und Todos/Slots anzeigen die außerhalb des sichtbaren Bereichs liegen.

---

## Default-Bereich ändern

`visEnd`-Default in `TabHeute.jsx` von `20` auf `18` ändern:

```js
const [visEnd, setVisEnd] = useState(() => lv(SK.visEnd, 18))
```

Bestehende User die bereits einen gespeicherten Wert haben bleiben unverändert (localStorage überschreibt den Default).

---

## Pill-Strip — Struktur

Zwei Leisten: eine über dem Zeitplan-Grid (für Slots vor `visStart`), eine darunter (für Slots nach `visEnd`).

**Layout der Leiste:**

```
[ − ] | [ TodoChips, vertikal gestapelt ]  | [ + ]
```

- Eine zusammenhängende Bar mit `border-radius: 10px` und `border: 1px solid rgba(255,255,255,0.07)`
- `−` und `+` sind Segmente: durch Border vom Chip-Bereich getrennt, feste Breite 38px
- Chip-Bereich wächst in der Höhe mit der Anzahl der Todos (kein scroll, kein clipping)

**− Button:** Verhält sich wie bisher — entfernt die erste (oben) bzw. letzte (unten) sichtbare Stunde. Farbe: `rgba(255,255,255,0.2)`.

**+ Button:** Wie bisher — fügt eine Stunde früher (oben) bzw. später (unten) hinzu. Farbe: `#8B5CF6`.

**Chip-Bereich leer:** Zeigt einen leeren Zustand (`min-height: 32px`) — Bar bleibt sichtbar, nur mit − und +.

---

## Out-of-Range Todos anzeigen

Welche Slots gehören in die obere vs. untere Leiste:

- **Obere Leiste:** alle belegten Slot-Keys mit `hour < visStart`
- **Untere Leiste:** alle belegten Slot-Keys mit `hour >= visEnd`

Berechnung in `Zeitplan.jsx` (oder als Prop aus `TabHeute.jsx` übergeben):

```js
// rangeHours zeigt visibleStart..visibleEnd inkl. — jede ganze Stunde incl. :30-Slot
// Slot-Keys können "8" oder "8.5" sein → floor bestimmt die Stundenzugehörigkeit
const floorH = k => Math.floor(parseFloat(k))

const outBefore = Object.entries(slots)
  .filter(([k, v]) => v && floorH(k) < visibleStart)
  .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))

const outAfter = Object.entries(slots)
  .filter(([k, v]) => v && floorH(k) > visibleEnd)
  .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
```

---

## Chip-Darstellung

Jedes Out-of-Range-Item wird als vollständiger `TodoChip` gerendert — gleiche Komponente, gleiche Optik wie im Pool. Kein Mini-Format.

Chip-`meta`-Zeile zeigt: `HH:MM · Xmin` (Zeit des Slots + Duration).

**Tap-Verhalten:** Klick auf einen Chip expandiert den Zeitplan so dass der Slot sichtbar wird:
- Obere Leiste: `setVisStart(Math.min(visStart, Math.floor(slotHour)))`
- Untere Leiste: `setVisEnd(Math.max(visEnd, Math.ceil(slotHour) + 1))`

Danach verschwindet der Chip aus der Leiste (er liegt jetzt im sichtbaren Bereich).

---

## Was wegfällt

Die bisherigen `expandRow`-Divs (`+ früher`, `− früh`, `+ später`, `− spät`) in `Zeitplan.jsx` werden komplett entfernt und durch die Pill-Strips ersetzt.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `TabHeute.jsx` | `visEnd`-Default von 20 → 18 |
| `Zeitplan.jsx` | `expandRow`-Divs entfernen, Pill-Strip-Komponente einbauen |
| `Zeitplan.module.css` | Styles für `.pillStrip`, `.pillBtn`, `.pillChips` |

Die `PillStrip`-Komponente kann direkt in `Zeitplan.jsx` als lokale Komponente leben (kein eigenes File nötig).

---

## Nicht in Scope

- Drag & Drop in die Pill-Strip-Chips (Chips sind read-only + Expand-Tap)
- Animation beim Expand (kein Bedarf besprochen)
- Scroll bei vielen Chips (Box wächst, kein Overflow-Handling nötig)
