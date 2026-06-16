# ① Overlay-Primitive & Dialog-Vereinheitlichung — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine geteilte `<Overlay>`-Komponente, die alle 11 echten Dialoge identisch rahmt (ein Backdrop, ein z-index, ein Auftritt, Escape-zum-Schließen), plus zwei leichte Mikro-Animationen.

**Architecture:** Backdrop + animierter Panel-Wrapper + children-Karte. Migrierte Dialoge verlieren ihren eigenen Backdrop + Entrance-Keyframe und nutzen nur noch `<Overlay variant="center|sheet">`. Kanonische Werte in `vars.css` (`--z-overlay`, `@keyframes overlayIn`). Anti-Drift per Datei-Guard-Test.

**Tech Stack:** React 19, CSS Modules, Vitest 4 (Datei-Content-Guards, kein jsdom). Spec: `docs/superpowers/specs/2026-06-16-overlay-primitive-design.md`.

**Test-Stil:** Diese Codebase hat **kein** jsdom/RTL — alle Tests sind Datei-Content-/Logik-Guards (`vitest run`, `src/**/*.test.js`). Komponenten-Verhalten (Backdrop-Tap, Escape) wird per **Preview visuell** verifiziert, nicht per RTL.

**Befehle:** Tests `npm run test` · Lint `npm run lint` · Build `npm run build`.

---

### Task 1: Tokens + Keyframe in vars.css

**Files:**
- Modify: `src/styles/vars.css` (`:root`-Block + Animations-Block)
- Test: `src/styles/motion.test.js`

- [ ] **Step 1: Failing-Test schreiben** — in `motion.test.js`, neuer `describe`-Block am Ende:

```js
describe('Overlay-Tokens', () => {
  it('definiert --z-overlay', () => {
    expect(vars).toMatch(/--z-overlay\s*:/)
  })
  it('hat den overlayIn-Keyframe', () => {
    expect(vars).toMatch(/@keyframes\s+overlayIn/)
  })
})
```

- [ ] **Step 2: Test rot sehen** — `npm run test -- motion` → FAIL (Token/Keyframe fehlen).

- [ ] **Step 3: Token einfügen** — in `vars.css` direkt nach `--elev-drag:` (vor dem schließenden `}` von `:root`):

```css
  --z-overlay: 400;
```

- [ ] **Step 4: Keyframe einfügen** — in `vars.css` direkt nach dem `@keyframes toolEnter { … }`-Block:

```css
@keyframes overlayIn {
  from { opacity: 0; transform: scale(0.96) translateY(6px); }
  to   { opacity: 1; transform: none; }
}
```

- [ ] **Step 5: Reduced-Motion prüfen** — den `@media (prefers-reduced-motion: reduce)`-Block in `vars.css` lesen. Falls er Animationen **nicht** pauschal neutralisiert (z.B. `*{animation:none}` o.ä.), dort sicherstellen, dass `overlayIn`/`slideInBottom` neutralisiert sind. Falls schon pauschal → nichts tun.

- [ ] **Step 6: Test grün** — `npm run test -- motion` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/styles/vars.css src/styles/motion.test.js
git commit -m "feat(overlay): --z-overlay Token + overlayIn Keyframe"
```

---

### Task 2: Overlay-Komponente

**Files:**
- Create: `src/components/Overlay/Overlay.jsx`
- Create: `src/components/Overlay/Overlay.module.css`
- Create: `src/components/Overlay/overlay.test.js`

- [ ] **Step 1: Failing-Test schreiben** — `src/components/Overlay/overlay.test.js`:

```js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(here, 'Overlay.jsx'), 'utf8')
const css = readFileSync(join(here, 'Overlay.module.css'), 'utf8')

describe('Overlay — Komponente', () => {
  it('schließt bei Escape', () => {
    expect(jsx).toMatch(/Escape/)
    expect(jsx).toMatch(/keydown/)
  })
  it('schließt nur bei Backdrop-/Panel-Tap (currentTarget)', () => {
    expect(jsx).toMatch(/currentTarget/)
  })
  it('setzt role=dialog + aria-modal', () => {
    expect(jsx).toMatch(/role="dialog"/)
    expect(jsx).toMatch(/aria-modal/)
  })
  it('unterstützt beide Varianten', () => {
    expect(jsx).toMatch(/sheet/)
    expect(jsx).toMatch(/center/)
  })
})

describe('Overlay — CSS', () => {
  it('nutzt den kanonischen Backdrop', () => {
    expect(css).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.62\)/)
    expect(css).toMatch(/blur\(18px\)/)
  })
  it('nutzt das z-overlay-Token', () => {
    expect(css).toMatch(/var\(--z-overlay\)/)
  })
  it('referenziert beide Entrance-Keyframes', () => {
    expect(css).toMatch(/overlayIn/)
    expect(css).toMatch(/slideInBottom/)
  })
})
```

- [ ] **Step 2: Test rot sehen** — `npm run test -- overlay` → FAIL (Dateien fehlen).

- [ ] **Step 3: Komponente schreiben** — `src/components/Overlay/Overlay.jsx`:

```jsx
import { useEffect } from 'react'
import s from './Overlay.module.css'

export default function Overlay({ variant = 'center', onClose, style, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const close = e => { if (e.target === e.currentTarget) onClose?.() }
  const isSheet = variant === 'sheet'

  return (
    <div
      className={`${s.backdrop} ${isSheet ? s.sheet : s.center}`}
      style={style}
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div className={`${s.panel} ${isSheet ? s.panelSheet : s.panelCenter}`} onClick={close}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: CSS schreiben** — `src/components/Overlay/Overlay.module.css`:

```css
.backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  display: flex;
  justify-content: center;
  animation: overlayBackdropIn var(--dur-fast) var(--ease-out) both;
}

.center {
  align-items: center;
  padding: 20px 16px;
  padding-bottom: max(20px, env(safe-area-inset-bottom, 20px));
}

.sheet {
  align-items: flex-end;
}

.panel {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.panelCenter { animation: overlayIn var(--dur) var(--ease-out) both; }
.panelSheet  { animation: slideInBottom var(--dur) var(--ease-out) both; }

@keyframes overlayBackdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 5: Test grün** — `npm run test -- overlay` → PASS.

- [ ] **Step 6: Visuell smoke-testen (Opus, Preview)** — Dev-Server starten, eine Wegwerf-Instanz prüfen oder bis Task 3 warten. (Echte visuelle Verifikation passiert nach den Migrationen.)

- [ ] **Step 7: Commit**

```bash
git add src/components/Overlay/
git commit -m "feat(overlay): geteilte <Overlay>-Primitive (center/sheet, Escape, role=dialog)"
```

---

## Migrations-Rezept (gilt für Task 3–5)

Pro Dialog **immer** dieselbe Transformation:

1. **Import:** `import Overlay from '…/components/Overlay/Overlay'` (relativer Pfad je Datei).
2. **JSX ersetzen:**
   ```jsx
   // VORHER
   <div className={s.overlay} style={X} onClick={…close…}>
     <div className={s.modal} onClick={e => e.stopPropagation()}> … </div>
   </div>
   // NACHHER
   <Overlay variant="center|sheet" onClose={onClose} style={X}>
     <div className={s.modal}> … </div>
   </Overlay>
   ```
   - `onClose` = die vorhandene Schließ-Funktion des Dialogs.
   - `style={X}` nur setzen, wenn der Dialog heute ein `style` am Overlay hat (Keyboard-Offset/`overlayStyle`); sonst weglassen.
   - `onClick={e => e.stopPropagation()}` am Inhalt **entfernen** (nicht mehr nötig).
   - Die Innen-Karte behält ihre Klasse (`.modal`/`.sheet`/`.dialog`/`.backdrop`-Inhalt) **unverändert**.
3. **CSS aufräumen** in der zugehörigen `.module.css`:
   - Die Backdrop-Regel löschen (`.overlay`/`.backdrop`/`.dialogOverlay` — die mit `position:fixed; inset:0; background: rgba(...)`).
   - Am Karten-Selektor die `animation:`-Zeile entfernen (scaleIn/slideUp).
   - Die lokalen `@keyframes scaleIn`/`slideUp`/`fadeIn` löschen, **sofern sie nur dort fürs Overlay genutzt werden** (vorher per Suche im File prüfen!).
4. **Nicht anfassen:** Karten-Styling (bg/border/radius/padding/box-shadow/width/max-width), restliche Logik.

**Wichtig:** Jede Datei vor dem Löschen von Keyframes kurz durchsuchen, ob der Keyframe woanders im selben File noch gebraucht wird. Im Zweifel stehen lassen und melden.

---

### Task 3: Migration center — Welle 1

**Files (je .jsx + .module.css):**
- `src/components/TodoModal/TodoModal.{jsx,module.css}`
- `src/features/tools/klaeren/KlaerenModal.{jsx,module.css}`
- `src/features/calendar/Zeitplan/MissedReviewModal.{jsx,module.css}`
- `src/features/calendar/Zeitplan/Zeitplan.jsx` (inline `RemoveDialog`) + `Zeitplan.module.css`

**Spezifika je Dialog:**

| Dialog | variant | `style`-Prop | Entrance-Keyframe entfernen | Hinweis |
|---|---|---|---|---|
| TodoModal | center | ja: das vorhandene Keyboard-Offset-`style` (`alignItems:'flex-start'`, paddingTop, paddingBottom) | `@keyframes scaleIn` | `.closeBtn` im Inhalt bleibt |
| KlaerenModal | center | ja: vorhandenes `overlayStyle` | `@keyframes scaleIn` | `--tool-color` bleibt am `.modal`-`style` |
| MissedReviewModal | center | nein | `@keyframes slideUp` **und** `@keyframes fadeIn` (beide nur fürs Overlay) | overlay hatte `animation: fadeIn` → fällt weg |
| RemoveDialog (Zeitplan) | center | nein | keiner (hatte nie Entrance) | `RemoveDialog` ist eine **inline-Funktionskomponente** in `Zeitplan.jsx`; nur deren `<div className={s.dialogOverlay}>`-Wrapper ersetzen. `.dialogOverlay`-Regel aus `Zeitplan.module.css` löschen. |

- [ ] **Step 1:** TodoModal migrieren (Rezept + Spezifika).
- [ ] **Step 2:** KlaerenModal migrieren.
- [ ] **Step 3:** MissedReviewModal migrieren.
- [ ] **Step 4:** Zeitplan `RemoveDialog` migrieren.
- [ ] **Step 5: Tests grün** — `npm run test` → alle PASS (keine Regression).
- [ ] **Step 6: Lint** — `npm run lint` → keine **neuen** Fehler.
- [ ] **Step 7: Commit**

```bash
git add src/components/TodoModal src/features/tools/klaeren src/features/calendar/Zeitplan
git commit -m "refactor(overlay): center-Dialoge auf <Overlay> migriert (TodoModal, Klaeren, MissedReview, RemoveDialog)"
```

---

### Task 4: Migration sheet — Welle 1

**Files (je .jsx + .module.css):**
- `src/features/calendar/Zeitplan/SlotSheet.{jsx,module.css}`
- `src/features/tools/geburtstage/BirthdaySheet.{jsx,module.css}`
- `src/features/tools/kognitiv/CheckinModal.{jsx,module.css}`
- `src/features/calendar/Blocker/BlockerModal.{jsx,module.css}`
- `src/features/calendar/Blocker/RepeatDeleteSheet.{jsx,module.css}`

**Spezifika je Dialog:**

| Dialog | variant | `style`-Prop | Entrance entfernen | Hinweis |
|---|---|---|---|---|
| SlotSheet | sheet | nein | `animation: slideInBottom` an `.sheet` raus (Keyframe ist global, **nicht** löschen) | — |
| BirthdaySheet | sheet | ja: vorhandenes `overlayStyle` | `animation: slideInBottom` an `.sheet` raus (global lassen) | `.handle`-Griff bleibt im Inhalt |
| CheckinModal | sheet | nein | hatte keinen Entrance | Backdrop-Klasse heißt **`.backdrop`**, Innen-Karte `.modal`. `.backdrop`-Regel löschen. |
| BlockerModal | sheet | ja: Keyboard-Offset-`style` (paddingBottom) | `@keyframes slideUp` | — |
| RepeatDeleteSheet | sheet | nein | `@keyframes slideUp` | — |

- [ ] **Step 1:** SlotSheet migrieren.
- [ ] **Step 2:** BirthdaySheet migrieren.
- [ ] **Step 3:** CheckinModal migrieren (Backdrop-Klasse `.backdrop`).
- [ ] **Step 4:** BlockerModal migrieren.
- [ ] **Step 5:** RepeatDeleteSheet migrieren.
- [ ] **Step 6: Tests grün** — `npm run test` → PASS.
- [ ] **Step 7: Lint** — `npm run lint` → keine neuen Fehler.
- [ ] **Step 8: Commit**

```bash
git add src/features/calendar/Zeitplan src/features/tools/geburtstage src/features/tools/kognitiv src/features/calendar/Blocker
git commit -m "refactor(overlay): sheet-Dialoge auf <Overlay> migriert (Slot, Birthday, Checkin, Blocker, RepeatDelete)"
```

---

### Task 5: Migration — Welle 2 (peripher)

**Files (je .jsx + .module.css):**
- `src/components/UpdatePrompt/UpdatePrompt.{jsx,module.css}` — center
- `src/features/tools/rezepte/Konfigurator.jsx` + `Konfigurator.module.css` (`.saveDialogOverlay` → Innen-Karte `.saveDialog`?) — center

**Spezifika:**

| Dialog | variant | Hinweis |
|---|---|---|
| UpdatePrompt | center | Backdrop heute rgba .72 / blur4 → wird kanonisch. Schließ-Verhalten prüfen (evtl. kein Backdrop-Close erwünscht, da Update-Aktion — dann `onClose` weglassen/no-op und Escape ggf. deaktivieren; beim Bauen entscheiden + melden). |
| Konfigurator-SaveDialog | center | `.saveDialogOverlay` ist eine **eingebettete** Dialog-Sektion in `Konfigurator.jsx`. Nur den Overlay-Wrapper ersetzen, Innen-Karte unverändert. |

- [ ] **Step 1:** UpdatePrompt migrieren. **Achtung:** Falls der Update-Prompt bewusst **nicht** per Backdrop/Escape schließbar sein soll (Nutzer muss „Neu laden"/„Später" wählen), `onClose` als no-op übergeben und das prüfen — beim Bauen entscheiden und im Ergebnis melden.
- [ ] **Step 2:** Konfigurator-SaveDialog migrieren.
- [ ] **Step 3: Tests grün** — `npm run test` → PASS.
- [ ] **Step 4: Lint** — `npm run lint` → keine neuen Fehler.
- [ ] **Step 5: Commit**

```bash
git add src/components/UpdatePrompt src/features/tools/rezepte
git commit -m "refactor(overlay): UpdatePrompt + Rezepte-SaveDialog auf <Overlay> migriert"
```

---

### Task 6: Leichte Mikro-Animationen (TodoChip)

**Files:**
- Modify: `src/components/TodoChip/TodoChip.module.css`
- ggf. Modify: `src/components/TodoChip/TodoChip.jsx` (nur falls für das Einblenden eine Klasse/Key nötig)

- [ ] **Step 1: Subtodo-Einblenden** — In `TodoChip.module.css` dem Listen-Item der Unterpunkte (`.item`) eine dezente Enter-Animation geben:

```css
.item {
  animation: fadeInUp var(--dur-fast) var(--ease-out) both;
}
```
`fadeInUp` ist global in `vars.css`. **Prüfen:** `.item` darf dadurch nicht bei jedem Re-Render neu animieren — falls die Liste so rendert, dass alle Items beim Expand neu animieren, ist das ok (kurzer Einblendeffekt). Per Preview verifizieren, dass es nicht „flackert".

- [ ] **Step 2: Done glätten** — In `TodoChip.module.css`:
  - `.doneFlash { animation: doneFlash 0.65s ease; }` → `animation: doneFlash 0.65s var(--ease);`
  - Den Durchstreich-/Dim-Zustand weich machen: an `.chipDone .text` und `.itemDone .itemText` einen `transition` ergänzen:
    ```css
    .text, .itemText { transition: color var(--dur-fast) var(--ease), opacity var(--dur-fast) var(--ease); }
    ```
    (am Basis-Selektor, damit der Übergang in **beide** Richtungen greift; `text-decoration` ist nicht animierbar — daher Farbe/Opacity glätten.)

- [ ] **Step 3: Tests grün** — `npm run test` → PASS.
- [ ] **Step 4: Visuell (Preview)** — TodoChip mit Subtodos: hinzufügen blendet ein; Abhaken → weicher Done-Übergang + Flash. Screenshot.
- [ ] **Step 5: Commit**

```bash
git add src/components/TodoChip
git commit -m "feat(overlay): leichte Mikro-Animationen — Subtodo-Einblenden + Done-Glätten"
```

---

### Task 7: Anti-Drift-Guard + Gesamt-Verifikation

**Files:**
- Modify: `src/components/Overlay/overlay.test.js` (Anti-Drift-Block ergänzen)

- [ ] **Step 1: Anti-Drift-Test ergänzen** — in `overlay.test.js`:

```js
const root = join(here, '..', '..')
const migrated = [
  'components/TodoModal/TodoModal.module.css',
  'features/tools/klaeren/KlaerenModal.module.css',
  'features/calendar/Zeitplan/MissedReviewModal.module.css',
  'features/calendar/Zeitplan/Zeitplan.module.css',
  'features/calendar/Zeitplan/SlotSheet.module.css',
  'features/tools/geburtstage/BirthdaySheet.module.css',
  'features/tools/kognitiv/CheckinModal.module.css',
  'features/calendar/Blocker/BlockerModal.module.css',
  'features/calendar/Blocker/RepeatDeleteSheet.module.css',
  'components/UpdatePrompt/UpdatePrompt.module.css',
  'features/tools/rezepte/Konfigurator.module.css',
]

describe('Overlay — Anti-Drift (migrierte Dialoge ohne eigenen Backdrop/Entrance)', () => {
  for (const rel of migrated) {
    const txt = readFileSync(join(root, rel), 'utf8')
    it(`${rel} definiert keinen eigenen Voll-Backdrop`, () => {
      // Kein "position:fixed; inset:0;" zusammen mit einem schwarzen rgba-Background
      const hasFixedFullBackdrop =
        /position:\s*fixed[\s\S]{0,80}inset:\s*0[\s\S]{0,120}background:\s*rgba\(0,\s*0,\s*0/.test(txt)
      expect(hasFixedFullBackdrop).toBe(false)
    })
    it(`${rel} definiert keinen scaleIn/slideUp-Keyframe mehr`, () => {
      expect(txt).not.toMatch(/@keyframes\s+(scaleIn|slideUp)/)
    })
  }
})
```
**Hinweis:** Falls eine Datei legitime andere fixed-Elemente mit dunklem rgba enthält (kein Dialog-Backdrop), Regex eng genug halten oder die Datei gezielt ausnehmen + Grund kommentieren.

- [ ] **Step 2: Guard grün** — `npm run test -- overlay` → PASS (alle migrierten Dateien sauber).
- [ ] **Step 3: Volle Suite** — `npm run test` → alles grün (262+).
- [ ] **Step 4: Lint** — `npm run lint` → keine neuen Fehler.
- [ ] **Step 5: Build** — `npm run build` → erfolgreich.
- [ ] **Step 6: Visuelle End-Verifikation (Opus, Preview)** — je 1 center- (TodoModal) + 1 sheet-Dialog (SlotSheet) öffnen: Backdrop einheitlich, sanfter Auftritt, Backdrop-Tap schließt, Escape schließt. Screenshots als Nachweis.
- [ ] **Step 7: Commit**

```bash
git add src/components/Overlay/overlay.test.js
git commit -m "test(overlay): Anti-Drift-Guard — migrierte Dialoge ohne eigenen Backdrop/Entrance"
```

---

### Task 8: Doku + Abschluss

**Files:**
- Modify: `kontext/architektur.md` (Overlay-Primitive + kanonische Dialog-Werte dokumentieren)

- [ ] **Step 1:** In `kontext/architektur.md` einen kurzen Abschnitt „Dialoge: `<Overlay>`-Primitive" ergänzen (API, center/sheet, kanonischer Backdrop, `--z-overlay`, Escape, Vollbild-Modi ausgenommen).
- [ ] **Step 2: Commit**

```bash
git add kontext/architektur.md
git commit -m "docs(overlay): Overlay-Primitive in architektur.md dokumentiert"
```

- [ ] **Step 3:** Merge nach `main` (`git checkout main && git merge --no-ff feat/overlay-primitive`) + Deploy (`npx vercel --prod`). Loose Ends prüfen: Toast bleibt über Dialogen (z-index).

---

## Self-Review (vom Plan-Autor)

- **Spec-Abdeckung:** Overlay-API ✓ (T2) · Tokens ✓ (T1) · alle 11 Dialoge ✓ (T3–5) · Mikro-Animationen ✓ (T6) · Guard ✓ (T1+T7) · Vollbild-Ausschluss ✓ (Guard prüft nur migrierte) · Risiken (Backdrop-Optik, Toast-z, Panel-Breite) ✓ (per Preview in T7 / Merge).
- **Keine Platzhalter:** alle Code-Schritte ausgeschrieben; Migration als präzises Rezept + Spezifika-Tabelle (DRY statt 11× Copy-Paste).
- **Typ-/Namens-Konsistenz:** `--z-overlay`, `overlayIn`, `slideInBottom` (global), `overlayBackdropIn` (lokal), Klassen `backdrop/center/sheet/panel/panelCenter/panelSheet` durchgängig identisch in T2 + Tests.
- **Offen/Bewusst:** UpdatePrompt-Schließbarkeit wird beim Bauen entschieden (T5) · Keyframe-Löschung nur nach Datei-Suche (Rezept) · Reduced-Motion-Block in T1 geprüft.
