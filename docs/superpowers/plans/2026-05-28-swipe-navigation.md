# Swipe-Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Horizontales Wischen navigiert in Tagesplaner und Kalender einen Tag / eine Woche / einen Monat weiter, mit einer hochwertigen Slide-Animation die dem Finger folgt.

**Architecture:** Ein `usePageSwipe`-Hook registriert `touch`-Listener direkt auf einem DOM-Element. Der Inhalt folgt live dem Finger (`translateX`), beim Loslassen wird via `flushSync` navigiert und der neue Inhalt schiebt sich rein. Die Callbacks (`onPrev`/`onNext`) werden per Ref aktuell gehalten um stale-closure-Probleme zu vermeiden.

**Tech Stack:** React 18, `react-dom/flushSync`, CSS Inline Styles

---

## Datei-Übersicht

| Datei | Aktion |
|---|---|
| `src/hooks/usePageSwipe.js` | Neu erstellen — der wiederverwendbare Hook |
| `src/features/calendar/TabHeute/TabHeute.module.css` | Modifizieren — `overflow-x: hidden` auf `.page` |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Modifizieren — Hook integrieren, Content wrappen |
| `src/features/calendar/TabKalender/TabKalender.module.css` | Modifizieren — `overflow-x: hidden` auf `.page` |
| `src/features/calendar/TabKalender/TabKalender.jsx` | Modifizieren — Hook integrieren, Content wrappen |

---

## Task 1: `usePageSwipe`-Hook erstellen

**Files:**
- Create: `src/hooks/usePageSwipe.js`

- [ ] **Schritt 1: Datei erstellen**

```js
import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

export function usePageSwipe(ref, opts) {
  const o = useRef(opts)
  useEffect(() => { o.current = opts })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startX = 0, startY = 0, startTime = 0
    let swipeMode = null, deltaX = 0

    function onStart(e) {
      if (o.current.disabled) return
      startX    = e.touches[0].clientX
      startY    = e.touches[0].clientY
      startTime = Date.now()
      swipeMode = null
      deltaX    = 0
      el.style.transition = 'none'
    }

    function onMove(e) {
      if (swipeMode === false) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (swipeMode === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        swipeMode = Math.abs(dx) > Math.abs(dy)
      }
      if (swipeMode === true) {
        e.preventDefault()
        deltaX = dx
        el.style.transform = `translateX(${dx}px)`
        el.style.opacity   = String(1 - Math.abs(dx) / 800)
      }
    }

    function onEnd() {
      if (swipeMode !== true) return
      const velocity  = Math.abs(deltaX) / (Date.now() - startTime)
      const threshold = window.innerWidth * 0.3
      if (velocity > 0.3 || Math.abs(deltaX) > threshold) {
        navigate(deltaX > 0 ? 'prev' : 'next')
      } else {
        el.style.transition = 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease'
        el.style.transform  = 'translateX(0)'
        el.style.opacity    = '1'
      }
    }

    function navigate(dir) {
      const ease = 'cubic-bezier(0.25,0.46,0.45,0.94)'
      el.style.transition = `transform 260ms ${ease}, opacity 260ms ease`
      el.style.transform  = `translateX(${dir === 'prev' ? '100%' : '-100%'})`
      el.style.opacity    = '0'
      setTimeout(() => {
        flushSync(() => dir === 'prev' ? o.current.onPrev() : o.current.onNext())
        el.style.transition = 'none'
        el.style.transform  = `translateX(${dir === 'prev' ? '-100%' : '100%'})`
        el.style.opacity    = '0'
        requestAnimationFrame(() => {
          el.style.transition = `transform 260ms ${ease}, opacity 260ms ease`
          el.style.transform  = 'translateX(0)'
          el.style.opacity    = '1'
        })
      }, 260)
    }

    el.addEventListener('touchstart', onStart,  { passive: true  })
    el.addEventListener('touchmove',  onMove,   { passive: false })
    el.addEventListener('touchend',   onEnd,    { passive: true  })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [ref])
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/hooks/usePageSwipe.js
git commit -m "feat: add usePageSwipe hook"
```

---

## Task 2: CSS — `overflow-x: hidden` für beide Views

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.module.css`
- Modify: `src/features/calendar/TabKalender/TabKalender.module.css`

- [ ] **Schritt 1: TabHeute.module.css — `.page` ergänzen**

Aktuelle `.page`-Regel (Zeile 1–6):
```css
.page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 80px;
}
```

Ersetzen durch:
```css
.page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 80px;
  overflow-x: hidden;
}
```

- [ ] **Schritt 2: TabKalender.module.css — `.page` ergänzen**

Aktuelle `.page`-Regel (Zeile 1–3):
```css
.page {
  padding-bottom: 24px;
}
```

Ersetzen durch:
```css
.page {
  padding-bottom: 24px;
  overflow-x: hidden;
}
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.module.css
git add src/features/calendar/TabKalender/TabKalender.module.css
git commit -m "fix: overflow-x hidden für swipe-animation clipping"
```

---

## Task 3: Tagesplaner (TabHeute) — Swipe integrieren

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: Imports ergänzen**

Zeile 1 (React-Imports) — `useRef` hinzufügen:
```js
import { useState, useCallback, useEffect, useRef } from 'react'
```

Zeile 3 (utils-Imports) — `dateKey` hinzufügen:
```js
import { todayKey, ALL_SLOT_KEYS, getDurationKeys, dateKey } from '../../../utils'
```

Nach dem letzten bestehenden Import (Zeile 24, `import s from './TabHeute.module.css'`) hinzufügen:
```js
import { usePageSwipe } from '../../../hooks/usePageSwipe'
```

- [ ] **Schritt 2: Ref und Hook nach den bestehenden useState-Zeilen einfügen**

Direkt nach dem `const { registerHalf, startDrag } = useDragDrop()`-Block (nach Zeile 37) einfügen:

```js
  const swipeRef = useRef(null)
  usePageSwipe(swipeRef, {
    onPrev: () => {
      const [y, m, d] = viewDate.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      date.setDate(date.getDate() - 1)
      setViewDate(dateKey(date))
    },
    onNext: () => {
      const [y, m, d] = viewDate.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      date.setDate(date.getDate() + 1)
      setViewDate(dateKey(date))
    },
    disabled: editingTodo !== null || blockerModal !== null || klaerenTodo !== null || teOpen,
  })
```

- [ ] **Schritt 3: Content-Bereich in swipeable `div` wrappen**

Im `return` (ab Zeile 398) das `<Zeitplan>`-Element bis zum Ende des `{(() => { ... })()}` IIFE-Blocks in einen neuen div einschließen.

Bestehende Struktur:
```jsx
    <DayNav
      date={viewDate}
      onChange={setViewDate}
      onCalendarOpen={() => { setCalendarDate(viewDate); setCurrentTab(1) }}
    />
    <Zeitplan
      ...
    />
    <Pool
      ...
    />
    {(() => {
      ...
    })()}

    {editingTodo && (
```

Ersetzen durch:
```jsx
    <DayNav
      date={viewDate}
      onChange={setViewDate}
      onCalendarOpen={() => { setCalendarDate(viewDate); setCurrentTab(1) }}
    />
    <div ref={swipeRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Zeitplan
        ...
      />
      <Pool
        ...
      />
      {(() => {
        ...
      })()}
    </div>

    {editingTodo && (
```

Die Props von `<Zeitplan>` und `<Pool>` und der IIFE-Inhalt bleiben **unverändert**. Nur der neue `<div ref={swipeRef}>` wrapper wird hinzugefügt. Die Modals (`editingTodo`, `klaerenTodo`, `teOpen`, `blockerModal`, `repeatDeleteSheet`) bleiben außerhalb des wrappers.

- [ ] **Schritt 4: App starten und manuell testen**

```bash
npm run dev
```

Auf einem Mobilgerät oder mit aktiviertem Touch-Emulator im Browser:
- Im Tagesplaner: links wischen → nächster Tag
- Rechts wischen → vorheriger Tag
- Kurzes Antippen ohne Wisch → kein ungewollter Navigate
- Vertikales Scrollen im Zeitplan → funktioniert weiterhin
- Pfeil-Buttons in DayNav → funktionieren weiterhin

- [ ] **Schritt 5: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat: swipe-navigation im Tagesplaner"
```

---

## Task 4: Kalender (TabKalender) — Swipe integrieren

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: Import hinzufügen**

Nach dem letzten bestehenden Import (Zeile 9, `import s from './TabKalender.module.css'`) einfügen:
```js
import { usePageSwipe } from '../../../hooks/usePageSwipe'
```

- [ ] **Schritt 2: Ref und Hook nach den bestehenden useState-Zeilen einfügen**

Direkt nach `const weightEntries = useMemo(() => loadEntries(), [])` und `const weekScrollRef = useRef(null)` (nach Zeile 244) einfügen:

```js
  const kalenderSwipeRef = useRef(null)
  usePageSwipe(kalenderSwipeRef, {
    onPrev: view === 'woche'
      ? () => setWeekStart(d => addDays(d, -7))
      : () => setMonthRef(r => {
          const m = r.month === 0 ? 11 : r.month - 1
          const y = r.month === 0 ? r.year - 1 : r.year
          return { year: y, month: m }
        }),
    onNext: view === 'woche'
      ? () => setWeekStart(d => addDays(d, 7))
      : () => setMonthRef(r => {
          const m = r.month === 11 ? 0 : r.month + 1
          const y = r.month === 11 ? r.year + 1 : r.year
          return { year: y, month: m }
        }),
    disabled: restoreTodo !== null,
  })
```

- [ ] **Schritt 3: JSX umstrukturieren — swipeable Wrapper um View-Content**

Im `return` (ab Zeile 294) die Struktur unterhalb des `segmented`-Divs in einen neuen `div` mit `ref={kalenderSwipeRef}` wrappen.

Bestehende Struktur:
```jsx
  return (
    <div className={s.page}>
      <div className={s.segmented}>
        ...
      </div>

      {/* ─── WOCHENANSICHT ───────────────────────── */}
      {view === 'woche' && (
        <>
          <NavPill ... />
          <div className={s.weekWrapper}>
            ...
          </div>
        </>
      )}

      {/* ─── MONATSANSICHT ────────────────────────── */}
      {view === 'monat' && (
        <>
          <NavPill ... />
          <div className={s.monthGrid}>
            ...
          </div>
          {selectedDay && (
            <DayPanel ... />
          )}
        </>
      )}
    </div>
  )
```

Ersetzen durch:
```jsx
  return (
    <div className={s.page}>
      <div className={s.segmented}>
        ...
      </div>

      <div ref={kalenderSwipeRef}>
        {/* ─── WOCHENANSICHT ───────────────────────── */}
        {view === 'woche' && (
          <>
            <NavPill ... />
            <div className={s.weekWrapper}>
              ...
            </div>
          </>
        )}

        {/* ─── MONATSANSICHT ────────────────────────── */}
        {view === 'monat' && (
          <>
            <NavPill ... />
            <div className={s.monthGrid}>
              ...
            </div>
            {selectedDay && (
              <DayPanel ... />
            )}
          </>
        )}
      </div>
    </div>
  )
```

Alle Props und Inhalte von NavPill, weekWrapper, monthGrid und DayPanel bleiben **unverändert**. Nur der neue `<div ref={kalenderSwipeRef}>` wrapper wird hinzugefügt.

- [ ] **Schritt 4: App starten und manuell testen**

Auf einem Mobilgerät oder mit Touch-Emulator:
- Wochenansicht: links wischen → nächste Woche, rechts → vorherige Woche
- Monatsansicht: links → nächster Monat, rechts → vorheriger Monat
- Umschalten Woche ↔ Monat über Segmented Control: kein ungewollter Swipe-Effekt
- DayPanel in Monatsansicht: Tap auf Tageskachel öffnet DayPanel weiterhin korrekt
- NavPill-Buttons: funktionieren weiterhin

- [ ] **Schritt 5: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat: swipe-navigation im Kalender (Woche + Monat)"
```
