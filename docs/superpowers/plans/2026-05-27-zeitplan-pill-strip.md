# Zeitplan Pill-Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ersetze die expandRow-Buttons im Zeitplan durch eine Pill-Leiste (oben + unten) die gleichzeitig + / − Steuerung und Out-of-Range-Slots als Chips anzeigt; Default visEnd 20 → 18.

**Architecture:** Lokale `SlotChipPreview`- und `PillStrip`-Komponenten in `Zeitplan.jsx`. Zwei neue Props `onExpandUpTo` / `onExpandDownTo` in `TabHeute.jsx` für den Chip-Tap. Die `expandRow`-Divs fallen komplett weg.

**Tech Stack:** React 18, CSS Modules, Vite

---

## Dateien

| Datei | Was passiert |
|---|---|
| `src/features/calendar/TabHeute/TabHeute.jsx` | Default 20→18, zwei neue Callback-Props |
| `src/features/calendar/Zeitplan/Zeitplan.jsx` | expandRow entfernen, PillStrip + SlotChipPreview hinzufügen |
| `src/features/calendar/Zeitplan/Zeitplan.module.css` | Pill-Strip-Styles anhängen |

---

### Task 1: visEnd-Default auf 18 und neue Expand-Handler in TabHeute.jsx

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Step 1: Default von 20 auf 18 ändern**

Zeile 28 in `TabHeute.jsx`:
```js
// vorher
const [visEnd,   setVisEnd]   = useState(() => lv(SK.visEnd,   20))
// nachher
const [visEnd,   setVisEnd]   = useState(() => lv(SK.visEnd,   18))
```

- [ ] **Step 2: Zwei neue Handler nach handleRemoveHour einfügen (ca. Zeile 161)**

```js
const handleExpandUpTo = useCallback((h) => {
  const next = Math.floor(h)
  setVisStart(next)
  saveVis(next, visEnd)
}, [visEnd])

const handleExpandDownTo = useCallback((h) => {
  const next = Math.floor(h)
  setVisEnd(next)
  saveVis(visStart, next)
}, [visStart])
```

- [ ] **Step 3: Neue Props an `<Zeitplan>` übergeben (ca. Zeile 300–322)**

```jsx
<Zeitplan
  slots={todaySlots}
  todos={todos}
  setTodos={setTodos}
  visibleStart={visStart}
  visibleEnd={visEnd}
  dateLabel={viewDate}
  onSetSlot={handleSetSlot}
  onToggleSlotDone={handleToggleSlotDone}
  onEditTodo={handleEdit}
  onRemoveSlot={handleRemoveSlot}
  onShiftAll={handleShiftAll}
  onExpandUp={handleExpandUp}
  onExpandDown={handleExpandDown}
  onExpandUpTo={handleExpandUpTo}
  onExpandDownTo={handleExpandDownTo}
  onRemoveHour={handleRemoveHour}
  onToggleLock={handleToggleLock}
  registerHalf={registerHalf}
  startSlotDrag={startSlotDrag}
  blockers={blockers}
  onCreateBlocker={handleCreateBlocker}
  onEditBlocker={handleEditBlocker}
  onToggleBlockerLocked={handleToggleBlockerLocked}
/>
```

- [ ] **Step 4: Manuell verifizieren**

App starten. `adhs_view_vis_end` aus localStorage löschen (DevTools → Application → Local Storage → Eintrag entfernen → Tab neu laden). Zeitplan sollte jetzt bei 8–18 Uhr enden statt 8–20.

- [ ] **Step 5: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat(zeitplan): default visEnd 20→18, add expandUpTo/DownTo handlers"
```

---

### Task 2: Pill-Strip-Styles in Zeitplan.module.css

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`

- [ ] **Step 1: Styles am Ende der Datei anhängen**

```css
/* ── Pill Strip ───────────────────────────────────────────── */
.pillStrip {
  display: flex;
  align-items: stretch;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: var(--surface-low);
}

.pillBtn {
  flex-shrink: 0;
  width: 38px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.2);
  font-size: 20px;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.pillBtn:hover {
  background: rgba(255, 255, 255, 0.04);
}

.pillBtnMinus {
  border-right: 1px solid rgba(255, 255, 255, 0.07);
}

.pillBtnPlus {
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  color: var(--primary);
}

.pillBtnPlus:hover {
  background: rgba(139, 92, 246, 0.1);
  color: #a78bfa;
}

.pillChips {
  flex: 1;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 34px;
  justify-content: center;
}

/* ── Slot-Chip in der Strip ──────────────────────────────── */
.pillChip {
  display: flex;
  align-items: stretch;
  background: rgba(255, 255, 255, 0.022);
  border: 1px solid rgba(255, 255, 255, 0.065);
  border-radius: var(--r);
  overflow: hidden;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s;
  -webkit-tap-highlight-color: transparent;
}

.pillChip:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.14);
}

.pillChipStripe {
  width: 3px;
  min-width: 3px;
  flex-shrink: 0;
}

.pillChipBody {
  flex: 1;
  padding: 7px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
}

.pillChipText {
  font-family: 'Outfit', sans-serif;
  font-size: 0.84rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pillChipMeta {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 2px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.module.css
git commit -m "style(zeitplan): pill strip CSS"
```

---

### Task 3: PillStrip in Zeitplan.jsx einbauen

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`

- [ ] **Step 1: Zwei neue Props in der Zeitplan-Signatur ergänzen**

Die Prop-Liste des `Zeitplan`-Components (ca. Zeile 29–50) um zwei Props erweitern:

```js
export default function Zeitplan({
  slots = {},
  todos = [],
  setTodos,
  visibleStart = 8,
  visibleEnd = 18,
  dateLabel,
  onSetSlot,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onShiftAll,
  onExpandUp,
  onExpandDown,
  onExpandUpTo,      // NEU — fn(h: float) setzt visStart auf Math.floor(h)
  onExpandDownTo,    // NEU — fn(h: float) setzt visEnd auf Math.floor(h)
  onRemoveHour,
  onToggleLock,
  registerHalf,
  startSlotDrag,
  blockers = [],
  onCreateBlocker,
  onEditBlocker,
  onToggleBlockerLocked,
}) {
```

- [ ] **Step 2: SlotChipPreview-Komponente direkt nach dem RemoveDialog einfügen (ca. Zeile 27)**

```jsx
// ─── SlotChipPreview ──────────────────────────────────────
function SlotChipPreview({ slotKey, slot, onTap }) {
  const h    = parseFloat(slotKey)
  const hour = String(Math.floor(h)).padStart(2, '0')
  const min  = h % 1 === 0 ? '00' : '30'
  const meta = `${hour}:${min}${slot.duration ? ` · ${slot.duration}min` : ''}`
  return (
    <div className={s.pillChip} onClick={() => onTap(h)}>
      <div className={s.pillChipStripe} style={{ background: slot.color || '#8B5CF6' }} />
      <div className={s.pillChipBody}>
        <span className={s.pillChipText}>{slot.text || '—'}</span>
        <span className={s.pillChipMeta}>{meta}</span>
      </div>
    </div>
  )
}

// ─── PillStrip ────────────────────────────────────────────
function PillStrip({ slots, visibleStart, visibleEnd, isTop, onExpand, onShrink, onExpandTo }) {
  const outSlots = Object.entries(slots)
    .filter(([k, v]) => {
      if (!v) return false
      const h = Math.floor(parseFloat(k))
      return isTop ? h < visibleStart : h > visibleEnd
    })
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))

  return (
    <div className={s.pillStrip}>
      <button className={[s.pillBtn, s.pillBtnMinus].join(' ')} onClick={onShrink}>−</button>
      <div className={s.pillChips}>
        {outSlots.map(([k, slot]) => (
          <SlotChipPreview key={k} slotKey={k} slot={slot} onTap={onExpandTo} />
        ))}
      </div>
      <button className={[s.pillBtn, s.pillBtnPlus].join(' ')} onClick={onExpand}>+</button>
    </div>
  )
}
```

- [ ] **Step 3: Obere expandRow durch PillStrip ersetzen**

Den gesamten "Top expand row"-Block (ca. Zeile 231–236):
```jsx
      {/* Top expand row */}
      <div className={s.expandRow}>
        {visibleStart < visibleEnd - 1 && (
          <button className={[s.xBtn, s.xBtnRm].join(' ')} onClick={() => onRemoveHour?.(visibleStart)}>− früh</button>
        )}
        <button className={[s.xBtn, s.xBtnAdd].join(' ')} onClick={() => onExpandUp?.()}>+ früher</button>
      </div>
```

ersetzen durch:
```jsx
      {/* Top pill strip */}
      <PillStrip
        slots={slots}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        isTop={true}
        onExpand={() => onExpandUp?.()}
        onShrink={() => onRemoveHour?.(visibleStart)}
        onExpandTo={(h) => onExpandUpTo?.(h)}
      />
```

- [ ] **Step 4: Untere expandRow durch PillStrip ersetzen**

Den gesamten "Bottom expand row"-Block (ca. Zeile 271–276):
```jsx
      {/* Bottom expand row */}
      <div className={s.expandRow}>
        {visibleStart < visibleEnd - 1 && (
          <button className={[s.xBtn, s.xBtnRm].join(' ')} onClick={() => onRemoveHour?.(visibleEnd)}>− spät</button>
        )}
        <button className={[s.xBtn, s.xBtnAdd].join(' ')} onClick={() => onExpandDown?.()}>+ später</button>
      </div>
```

ersetzen durch:
```jsx
      {/* Bottom pill strip */}
      <PillStrip
        slots={slots}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        isTop={false}
        onExpand={() => onExpandDown?.()}
        onShrink={() => onRemoveHour?.(visibleEnd)}
        onExpandTo={(h) => onExpandDownTo?.(h)}
      />
```

- [ ] **Step 5: Manuell verifizieren**

1. App öffnen → Zeitplan: alte Text-Buttons `+ früher / − früh / + später / − spät` sind weg, stattdessen zwei Pill-Leisten oben und unten
2. `+` Buttons: Zeitplan dehnt sich je eine Stunde aus
3. `−` Buttons: Zeitplan schrumpft je eine Stunde
4. Einen Slot auf eine Stunde vor 8 Uhr legen (z.B. 7:00) → Chip erscheint in oberer Leiste → Tippen → Zeitplan springt auf 7 Uhr, Chip verschwindet ins Grid
5. Einen Slot auf z.B. 20:00 legen → Chip in unterer Leiste → Tippen → Expand

- [ ] **Step 6: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.jsx
git commit -m "feat(zeitplan): replace expandRows with PillStrip, show out-of-range slots as chips"
```

---

### Task 4: Tote CSS-Klassen aufräumen

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.module.css`

- [ ] **Step 1: Nicht mehr genutzte Klassen entfernen**

Suche in `Zeitplan.module.css` nach den folgenden Klassen und entferne sie komplett (werden nur von den alten `expandRow`-Divs genutzt):
- `.expandRow`
- `.xBtn`
- `.xBtnAdd`
- `.xBtnRm`

Mit Grep prüfen ob sie noch irgendwo referenziert sind:
```bash
grep -r "expandRow\|xBtn\|xBtnAdd\|xBtnRm" src/features/calendar/Zeitplan/
```
Erwartetes Ergebnis: kein Treffer in `.jsx`-Dateien, nur in der `.css`.

- [ ] **Step 2: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.module.css
git commit -m "chore(zeitplan): remove unused expandRow CSS classes"
```
