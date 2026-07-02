# App-Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein geführtes Erst-Start-Onboarding, das die echte App-Oberfläche als Bühne nutzt (Coach-Layer sperrt Eingabe außer dem freigegebenen Ziel), die App erklärt UND konfiguriert — am Ende sind Tools gewählt und der Pool→Zeitplan-Kern wurde einmal echt erlebt.

**Architecture:** Ein Controller (`AppOnboarding.jsx`) rendert **über** der echten App einen `CoachOverlay` (Eingabe-Sperre mit „Loch" über dem aktuellen Ziel-Element) plus ein `CoachBanner` (Erklär-Karte). Die Schritte sind Daten (`onboardingSteps.jsx`); Weiterschaltung über pure Zustands-Prädikate (`onboardingLogic.js`), nicht über DOM-Events. Ziel-Elemente werden über `data-onboarding="…"`-Attribute im echten Code gefunden; ein Guard-Test hält Schrittliste und Markup synchron. Alles, was der Nutzer anlegt, läuft über die normalen Store-Pfade (echte Daten).

**Tech Stack:** React 19, Zustand, CSS Modules, Vitest (Guards + pure Logik), Vite/PWA. Keine neuen Abhängigkeiten.

**Reihenfolge:** Teil A–C bauen die vollständige **Pflicht-Strecke** (Willkommen → Hands-on-Kern → Tools → Abschluss) — nach Task 10 ist das Erfolgskriterium erfüllt und alles lauffähig committet. Teil D ergänzt den MissedReview-Erklärkopf, die optionale Kür und räumt das alte AppBriefing weg.

---

## Dateien-Übersicht

**Neu:**
- `src/components/AppOnboarding/AppOnboarding.jsx` — Controller (Phasen/Schritt-State, Skip, Tab-Steuerung)
- `src/components/AppOnboarding/CoachBanner.jsx` — Erklär-Karte (oben/unten angedockt)
- `src/components/AppOnboarding/CoachOverlay.jsx` — Eingabe-Sperre mit Loch + TapPulse
- `src/components/AppOnboarding/TapPulse.jsx` — pulsierender Tap-Indikator (umgezogen aus AppBriefing)
- `src/components/AppOnboarding/onboardingSteps.jsx` — STEPS-Daten
- `src/components/AppOnboarding/onboardingLogic.js` — pure Advance-Prädikate
- `src/components/AppOnboarding/onboardingLogic.test.js` — Test der Prädikate
- `src/components/AppOnboarding/AppOnboarding.module.css` — Styles für Banner/Overlay/Pulse
- `src/components/AppOnboarding/onboardingTargets.test.js` — Guard: jedes Step-`target` existiert als `data-onboarding`

**Geändert:**
- `src/storage/index.js` — `SK.onboardingSeen` + `SK.missedHintSeen`, in `BACKUP_CATS.einstellungen`
- `src/store/index.js` — `briefingOpen`/`setBriefingOpen` → `onboardingOpen`/`setOnboardingOpen`
- `src/App.jsx` — Gate + Render auf AppOnboarding umstellen, Import tauschen, `data-onboarding="add-fab"` am FAB
- `src/features/settings/TabSettings/TabSettings.jsx` — Button ruft `setOnboardingOpen`
- `src/features/tools/toolRegistry.jsx` — `featured: true` + `intro`-Text an den 8 großen Tools
- `src/components/TodoModal/TodoModal.jsx` — `data-onboarding="todo-auto"` am Auto-Toggle
- `src/features/tools/TabTools/TabTools.jsx` — `data-onboarding="tools-list"` an der Alle-Tools-Liste
- `src/features/calendar/TabHeute/TabHeute.jsx` — `data-onboarding="tool-section"` am ersten Tool-Section-Wrapper; `data-onboarding="fenster-btn"` am „+ Fenster"; `data-onboarding="pool"` am Pool-Container (Kür/Highlight)
- `src/features/calendar/Zeitplan/MissedReviewModal.jsx` — optionaler Erklärkopf (`SK.missedHintSeen`)
- `src/styles/vars.css` — `--z-coach: 500`
- `kontext/architektur.md` — AppBriefing-Eintrag → AppOnboarding

**Gelöscht (Teil D):**
- `src/components/AppBriefing/` komplett (AppBriefing.jsx, briefingContent.jsx, DemoPlanner.jsx, WeekGridDemo.jsx, AppBriefing.module.css, README.md) — TapPulse ist vorher umgezogen.

---

## TEIL A — Fundament (TDD)

### Task 1: Storage-Keys + Store-Umbenennung

**Files:**
- Modify: `src/storage/index.js:52` (SK), `:154-158` (BACKUP_CATS.einstellungen)
- Test: `src/storage.test.js` (bestehend — muss grün bleiben)

> **Reihenfolge-Hinweis:** Die Store-Umbenennung `briefingOpen`→`onboardingOpen` passiert
> bewusst **nicht hier**, sondern atomar mit ihren Nutzern (`App.jsx`, `TabSettings`) in **Task 9**.
> Sonst wäre die App zwischen den Tasks gebrochen: der First-Run-`useEffect` ruft `setBriefingOpen`
> auf — ein umbenanntes Feld wäre `undefined` → Crash beim Mount. Task 1 fasst den Store nicht an.

- [ ] **Step 1: Neue SK-Keys ergänzen**

In `src/storage/index.js`, in `SK` direkt nach `appBriefingSeen:` (Zeile 52) einfügen:

```js
  appBriefingSeen:`${PREFIX}app_briefing_seen`,   // LEGACY — nur Backup-Kompat, wird nicht mehr gelesen
  onboardingSeen: `${PREFIX}onboarding_seen`,      // Gate: neues Onboarding gelaufen/übersprungen
  missedHintSeen: `${PREFIX}missed_hint_seen`,     // Einmal-Erklärkopf der ersten echten Zeitablauf-Abfrage
```

- [ ] **Step 2: Keys in BACKUP_CATS registrieren**

In `BACKUP_CATS.einstellungen` (Zeile 154-158) die erste Zeile ergänzen:

```js
  einstellungen: [
    SK.settings, SK.theme, SK.appBriefingSeen, SK.onboardingSeen, SK.missedHintSeen,
    SK.kognitivIntroSeen, SK.rezepteIntroSeen,
    SK.accentColor, SK.toolColors, SK.activeTools, SK.toolUsage,
    SK.notizenMigrated,
  ],
```

- [ ] **Step 3: storage-Guard grün prüfen**

Run: `npx vitest run src/storage.test.js`
Expected: PASS (die zwei neuen Keys sind gesichert; kein Key ohne Kategorie).

- [ ] **Step 4: Commit**

```bash
git add src/storage/index.js
git commit -m "feat(onboarding): SK.onboardingSeen + missedHintSeen registriert"
```

---

### Task 2: featured-Flag + intro-Texte in der Tool-Registry

**Files:**
- Modify: `src/features/tools/toolRegistry.jsx` (die 8 großen Tools)
- Test: `src/features/tools/toolRegistry.test.js` (neu)

Große Tools (bekommen `featured: true` + `intro`): `geburtstage`, `fitness`, `kognitiv`, `growth`, `rezepte`, `haushalt`, `projekte`, `garten`. Alle anderen bleiben unverändert (kein `featured`).

- [ ] **Step 1: Failing test schreiben**

Create `src/features/tools/toolRegistry.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from './toolRegistry.jsx'

const FEATURED = ['geburtstage', 'fitness', 'kognitiv', 'growth', 'rezepte', 'haushalt', 'projekte', 'garten']

describe('Tool-Registry — Onboarding-Vorstellung', () => {
  it('genau die vorgesehenen 8 Tools sind featured', () => {
    const featured = TOOL_REGISTRY.filter(t => t.featured).map(t => t.id).sort()
    expect(featured).toEqual([...FEATURED].sort())
  })

  it('jedes featured Tool hat einen Vorstellungstext (intro, >= 20 Zeichen)', () => {
    for (const t of TOOL_REGISTRY.filter(t => t.featured)) {
      expect(typeof t.intro, `${t.id}.intro fehlt`).toBe('string')
      expect(t.intro.trim().length, `${t.id}.intro zu kurz`).toBeGreaterThanOrEqual(20)
    }
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `npx vitest run src/features/tools/toolRegistry.test.js`
Expected: FAIL (kein Tool hat `featured`).

- [ ] **Step 3: featured + intro an den 8 Tools ergänzen**

Jeweils im Registry-Objekt nach `description:` eine Zeile `featured: true,` und einen `intro:`-Text ergänzen. Beispiel `geburtstage` (Zeile 31-38):

```js
  {
    id: 'geburtstage',
    tabId: 4,
    name: 'Geburtstage',    color: '#FF2D78',
    description: 'Geburtstage & Erinnerungen',
    featured: true,
    intro: 'Trag Geburtstage einmal ein — die App erinnert dich rechtzeitig und blendet sie im Kalender ein. Optional mit Geschenk-Vorlauf, damit nichts kurzfristig wird.',
    standalone: true,
    integrated: true,
    component: lazy(() => import('./geburtstage/TabGeburtstage')),
  },
```

Intro-Texte für die übrigen sieben (je 2–3 Sätze, Ton „du", warm):

- `fitness`: `'Kraftpläne, geführte Trainings mit Live-Session und dein Körpergewicht an einem Ort. Ein kurzer Coach fragt dich am Anfang ab und baut dir einen passenden Plan.'`
- `kognitiv`: `'Kurze tägliche Übungen für Reaktion, Aufmerksamkeit und Gedächtnis — als eine zusammenhängende Einheit. Du stellst dir zusammen, was drankommt, der Rest läuft geführt.'`
- `growth`: `'Eine ruhige Reflexionskarte pro Tag — ein Satz reicht. Über die Zeit wird daraus dein persönliches Journal.'`
- `rezepte`: `'Rezepte, automatische Einkaufsliste und dein Tiefkühl-Vorrat. Plan ein Menü, hak beim Kochen ab, der Rest wird für dich zusammengerechnet.'`
- `haushalt`: `'Haushalt in ruhigen Routinen statt großer Listen — nach Räumen sortiert, im Tempo, das gerade passt. Fällige Aufgaben landen als Karte im Tagesplaner.'`
- `projekte`: `'Bündel zusammengehörige Aufgaben als Projekt mit Fortschritt und geplanten Todos. So behältst du bei größeren Vorhaben den Überblick.'`
- `garten`: `'Dein stiller Begleiter: Alles, was du erledigst, lässt einen kleinen Garten wachsen. Kein Zwang, kein Verlieren — nur ein sichtbares Zeichen für deine Tage.'`

- [ ] **Step 4: Test grün prüfen**

Run: `npx vitest run src/features/tools/toolRegistry.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/toolRegistry.jsx src/features/tools/toolRegistry.test.js
git commit -m "feat(onboarding): featured-Flag + Vorstellungstexte fuer grosse Tools"
```

---

### Task 3: Pure Advance-Prädikate

**Files:**
- Create: `src/components/AppOnboarding/onboardingLogic.js`
- Test: `src/components/AppOnboarding/onboardingLogic.test.js`

Die Prädikate bekommen einen flachen `ctx`-Snapshot (aus dem Store gezogen, siehe Task 8) und geben `true` zurück, wenn der Schritt als erfüllt gilt. Regel aus der Spec: Ist ein Prädikat beim Schritt-**Eintritt** schon `true`, zeigt der Schritt „Weiter" statt zu warten — diese Auswertung passiert im Controller; die Prädikate selbst sind zustandslos.

- [ ] **Step 1: Failing test schreiben**

Create `src/components/AppOnboarding/onboardingLogic.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { hasPoolTodo, hasSlotToday } from './onboardingLogic'

const todo = (over = {}) => ({ id: 'x', text: 't', done: false, date: null, time: null, ...over })

describe('onboardingLogic — hasPoolTodo', () => {
  it('true bei offenem Pool-Todo (kein date/time)', () => {
    expect(hasPoolTodo({ todos: [todo()] })).toBe(true)
  })
  it('false bei leerem Pool', () => {
    expect(hasPoolTodo({ todos: [] })).toBe(false)
  })
  it('false wenn nur ein Termin existiert (date+time)', () => {
    expect(hasPoolTodo({ todos: [todo({ date: '2026-07-02', time: '14:00' })] })).toBe(false)
  })
  it('false wenn nur eine Fälligkeit existiert (nur date)', () => {
    expect(hasPoolTodo({ todos: [todo({ date: '2026-07-02' })] })).toBe(false)
  })
  it('ignoriert erledigte Todos', () => {
    expect(hasPoolTodo({ todos: [todo({ done: true })] })).toBe(false)
  })
})

describe('onboardingLogic — hasSlotToday', () => {
  it('true wenn heute mindestens ein Slot belegt ist', () => {
    expect(hasSlotToday({ days: { '2026-07-02': { '9': { text: 't' } } } }, '2026-07-02')).toBe(true)
  })
  it('false wenn heute keine Slots', () => {
    expect(hasSlotToday({ days: {} }, '2026-07-02')).toBe(false)
  })
  it('false wenn nur ein anderer Tag Slots hat', () => {
    expect(hasSlotToday({ days: { '2026-07-01': { '9': { text: 't' } } } }, '2026-07-02')).toBe(false)
  })
})
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `npx vitest run src/components/AppOnboarding/onboardingLogic.test.js`
Expected: FAIL („does not provide an export named 'hasPoolTodo'").

- [ ] **Step 3: Implementierung**

Create `src/components/AppOnboarding/onboardingLogic.js`:

```js
// Pure Advance-Prädikate für das Onboarding. Bekommen einen flachen Store-Snapshot,
// geben true zurück, wenn der zugehörige Schritt als erledigt gilt.
// Zustandslos — der Controller entscheidet daraus „warten" vs. „Weiter-Button".

// Ein echtes Pool-Todo: offen, ohne Datum/Zeit (kein Termin, keine Fälligkeit).
export function hasPoolTodo(ctx) {
  return (ctx.todos ?? []).some(t => !t.done && !t.date && !t.time)
}

// Mindestens ein belegter Slot am gegebenen Tag.
export function hasSlotToday(ctx, todayKey) {
  const day = (ctx.days ?? {})[todayKey]
  return !!day && Object.keys(day).length > 0
}
```

- [ ] **Step 4: Test grün prüfen**

Run: `npx vitest run src/components/AppOnboarding/onboardingLogic.test.js`
Expected: PASS (8 Tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/AppOnboarding/onboardingLogic.js src/components/AppOnboarding/onboardingLogic.test.js
git commit -m "feat(onboarding): pure Advance-Praedikate (Pool-Todo, Slot heute)"
```

---

## TEIL B — Coach-Infrastruktur (Preview-verifiziert)

> Hinweis: UI-Bausteine werden wie die bestehenden Briefings **im Preview** verifiziert (DOM-Checks + Jonas an localhost), nicht per Screenshot — Screenshots timen an den echten Komponenten aus (siehe altes AppBriefing-README).

### Task 4: TapPulse umziehen + CoachOverlay (Eingabe-Sperre)

**Files:**
- Create: `src/components/AppOnboarding/TapPulse.jsx` (Inhalt aus `src/components/AppBriefing/TapPulse.jsx` übernehmen, Import auf lokales CSS-Modul zeigen lassen)
- Create: `src/components/AppOnboarding/CoachOverlay.jsx`
- Create: `src/components/AppOnboarding/AppOnboarding.module.css`
- Modify: `src/styles/vars.css` (neue z-Index-Variable)

- [ ] **Step 1: z-Index-Variable ergänzen**

In `src/styles/vars.css` bei den z-index-Tokens `--z-coach: 500;` ergänzen (über `--z-overlay: 400`, unter Toast 9999).

- [ ] **Step 2: TapPulse übernehmen**

Lies `src/components/AppBriefing/TapPulse.jsx` und kopiere den Inhalt nach `src/components/AppOnboarding/TapPulse.jsx`. Einzige Änderung: `import s from './AppBriefing.module.css'` → `import s from './AppOnboarding.module.css'`. Die von TapPulse genutzten CSS-Klassen (`.pulse` o.ä.) in Schritt 4 ins neue Modul mit aufnehmen.

- [ ] **Step 3: CoachOverlay implementieren**

Create `src/components/AppOnboarding/CoachOverlay.jsx`:

```jsx
import { useLayoutEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import TapPulse from './TapPulse'
import s from './AppOnboarding.module.css'

// Sperrt die ganze Seite bis auf ein „Loch" über dem Ziel-Element.
// Vier Blocker-Rechtecke (oben/unten/links/rechts) fangen Pointer-Events ab;
// das Loch über dem Ziel lässt Klicks/Drags durch. Ohne Ziel: Vollsperre.
export default function CoachOverlay({ targetSelector, allowInteraction = true }) {
  const [rect, setRect] = useState(null)

  const measure = useCallback(() => {
    if (!targetSelector) { setRect(null); return }
    const el = document.querySelector(`[data-onboarding="${targetSelector}"]`)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    const pad = 6
    setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
  }, [targetSelector])

  useLayoutEffect(() => {
    measure()
    const id = setInterval(measure, 250) // folgt Layout-Verschiebungen (Modal öffnet, Scroll)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { clearInterval(id); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [measure])

  // Kein Ziel gefunden → Vollsperre (defensive Schiene; Controller zeigt dann „Weiter"-Button)
  const hole = allowInteraction ? rect : null

  const blockers = hole
    ? [
        { top: 0, left: 0, right: 0, height: Math.max(0, hole.top) },                                   // oben
        { top: hole.top + hole.height, left: 0, right: 0, bottom: 0 },                                  // unten
        { top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height },                 // links
        { top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height },                 // rechts
      ]
    : [{ top: 0, left: 0, right: 0, bottom: 0 }]                                                        // Vollsperre

  return createPortal(
    <div className={s.overlayRoot} aria-hidden>
      {blockers.map((st, i) => <div key={i} className={s.blocker} style={st} />)}
      {hole && <div className={s.hole} style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }} />}
      {hole && <TapPulse rect={hole} />}
    </div>,
    document.body,
  )
}
```

> Anpassung TapPulse: Falls die übernommene Version `stageRef`/`getTarget` erwartet (alte Signatur), im Zug von Task 4 auf die simple `rect`-Prop umstellen — TapPulse rendert dann einen absolut positionierten Puls mittig auf `rect` (top/left/width/height). Der alte Mess-/Scroll-Code entfällt, weil CoachOverlay schon misst.

- [ ] **Step 4: CSS für Overlay + Pulse**

Create `src/components/AppOnboarding/AppOnboarding.module.css` mit u.a.:

```css
.overlayRoot { position: fixed; inset: 0; z-index: var(--z-coach); pointer-events: none; }
.blocker { position: fixed; background: rgba(0,0,0,0.55); backdrop-filter: blur(2px); pointer-events: auto; transition: all var(--dur-fast) var(--ease); }
.hole { position: fixed; border-radius: var(--r-sm); box-shadow: 0 0 0 2px var(--primary), var(--glow-primary); pointer-events: none; transition: all var(--dur-fast) var(--ease); }
.pulse { position: fixed; border-radius: 50%; border: 2px solid var(--primary); pointer-events: none; animation: pulse 1.4s var(--ease) infinite; }
@media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
```

(Banner-Klassen kommen in Task 5 hinzu.)

- [ ] **Step 5: Preview-Smoke — Overlay misst ein Ziel**

Start Preview (siehe Task 10 für launch.json). Vorübergehend in `App.jsx` `<CoachOverlay targetSelector="add-fab" />` unbedingt rendern (nur zum Test), dann:

Run (preview_eval):
```js
(() => { const b = document.querySelectorAll('[class*="blocker"]').length; const h = document.querySelectorAll('[class*="hole"]').length; return { blockers: b, hole: h } })()
```
Expected: `{ blockers: 4, hole: 1 }` (FAB gefunden → Loch + 4 Blocker). Danach den Test-Einbau wieder entfernen.

- [ ] **Step 6: Commit**

```bash
git add src/components/AppOnboarding/TapPulse.jsx src/components/AppOnboarding/CoachOverlay.jsx src/components/AppOnboarding/AppOnboarding.module.css src/styles/vars.css
git commit -m "feat(onboarding): CoachOverlay (Eingabe-Sperre mit Loch) + TapPulse umgezogen"
```

---

### Task 5: CoachBanner

**Files:**
- Create: `src/components/AppOnboarding/CoachBanner.jsx`
- Modify: `src/components/AppOnboarding/AppOnboarding.module.css` (Banner-Klassen)

- [ ] **Step 1: Banner implementieren**

Create `src/components/AppOnboarding/CoachBanner.jsx`:

```jsx
import s from './AppOnboarding.module.css'

// Erklär-Karte über dem Coach-Layer. Dockt unten an (Default) oder oben,
// je nach `dock` — der Controller wählt oben, wenn das Ziel unten liegt.
export default function CoachBanner({ phase, phaseCount, title, children, dock = 'bottom', onSkip, onBack, onNext, nextLabel, canNext = true, cta }) {
  return (
    <div className={[s.bannerRoot, dock === 'top' ? s.bannerTop : s.bannerBottom].join(' ')}>
      <div className={s.banner}>
        <div className={s.bannerHead}>
          <span className={s.dots}>
            {Array.from({ length: phaseCount }).map((_, i) => (
              <span key={i} className={[s.dot, i <= phase ? s.dotOn : ''].join(' ')} />
            ))}
          </span>
          <button className={s.skip} onClick={onSkip}>Überspringen</button>
        </div>
        {title && <h3 className={s.bannerTitle}>{title}</h3>}
        <div className={s.bannerText}>{children}</div>
        {cta}
        <div className={s.bannerFoot}>
          {onBack ? <button className={s.back} onClick={onBack}>Zurück</button> : <span />}
          {onNext && <button className={s.next} disabled={!canNext} onClick={onNext}>{nextLabel ?? 'Weiter →'}</button>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Banner-CSS ergänzen**

In `AppOnboarding.module.css` ergänzen (z-Index über den Blockern, damit das Banner bedienbar ist):

```css
.bannerRoot { position: fixed; left: 0; right: 0; z-index: calc(var(--z-coach) + 1); display: flex; justify-content: center; padding: 12px; pointer-events: none; }
.bannerBottom { bottom: 0; } .bannerTop { top: 0; }
.banner { pointer-events: auto; width: 100%; max-width: 440px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-lg); padding: 16px; animation: slideInBottom var(--dur) var(--ease-out); }
.bannerHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.dots { display: flex; gap: 6px; } .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); } .dotOn { background: var(--primary); }
.skip { background: none; border: none; color: var(--text-dim); font-family: var(--font); font-size: 13px; cursor: pointer; }
.bannerTitle { margin: 0 0 6px; font-family: var(--font); font-size: 17px; color: var(--text); }
.bannerText { font-family: var(--font); font-size: 14px; line-height: 1.5; color: var(--text-dim); }
.bannerFoot { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; gap: 10px; }
.back { background: none; border: none; color: var(--text-dim); font-family: var(--font); font-size: 14px; cursor: pointer; }
.next { background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 70%, white), var(--primary)); color: #fff; border: none; border-radius: var(--r); padding: 10px 18px; font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; }
.next:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 3: Preview-Smoke — Banner erscheint**

Vorübergehend `<CoachBanner phase={0} phaseCount={4} title="Test" onSkip={()=>{}} onNext={()=>{}}>Hallo</CoachBanner>` in App.jsx rendern, preview_snapshot prüfen (Text „Hallo", Buttons „Überspringen"/„Weiter →" vorhanden), danach entfernen.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppOnboarding/CoachBanner.jsx src/components/AppOnboarding/AppOnboarding.module.css
git commit -m "feat(onboarding): CoachBanner (Erklaer-Karte, oben/unten andockbar)"
```

---

### Task 6: data-onboarding-Anker setzen

**Files:**
- Modify: `src/App.jsx` (FAB), `src/components/TodoModal/TodoModal.jsx` (Auto-Toggle), `src/features/tools/TabTools/TabTools.jsx` (Alle-Tools-Liste), `src/features/calendar/TabHeute/TabHeute.jsx` (Tool-Section, Pool, + Fenster)

> Der Guard-Test (`onboardingTargets.test.js`) importiert `STEPS` und wird deshalb erst in Task 7 angelegt (nach `onboardingSteps.jsx`) — sonst crasht ein globaler Testlauf zwischen den Tasks. Hier nur die Anker setzen.

- [ ] **Step 1: FAB-Anker (App.jsx)**

In `src/App.jsx` am FAB-`<button>` (Zeile 169-176) `data-onboarding="add-fab"` ergänzen:

```jsx
        <button
          className={styles.fab}
          onClick={() => setAddOpen(true)}
          aria-label="Todo hinzufügen"
          data-onboarding="add-fab"
        >
```

- [ ] **Step 2: Auto-Toggle-Anker (TodoModal)**

In `src/components/TodoModal/TodoModal.jsx` am Auto-Toggle-Button (um Zeile 379, `onClick={toggleAuto}`) `data-onboarding="todo-auto"` ergänzen.

- [ ] **Step 3: Alle-Tools-Liste-Anker (TabTools)**

In `src/features/tools/TabTools/TabTools.jsx`: Am Container der „Alle Tools"-Ansicht (die Liste, die bei `showAll` erscheint — Zeile ~335 `<div className={s.list}>`) `data-onboarding="tools-list"` ergänzen. Falls mehrere `.list`-Blöcke: den ersten unter dem „+ Alle Tools"-Toggle.

- [ ] **Step 4: Tagesplaner-Anker (TabHeute)**

In `src/features/calendar/TabHeute/TabHeute.jsx`:
- Am Pool-Container (der Wrapper um `<Pool …/>`) `data-onboarding="pool"`.
- Am „+ Fenster"-Button `data-onboarding="fenster-btn"`.
- Am Wrapper der ersten gerenderten Tool-Section (die `SECTIONS`-Map, Zeile ~229 ff.) `data-onboarding="tool-section"` — an das äußere Element, das die Sections umschließt.

- [ ] **Step 5: Commit (nur Anker; Guard folgt in Task 7)**

```bash
git add src/App.jsx src/components/TodoModal/TodoModal.jsx src/features/tools/TabTools/TabTools.jsx src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat(onboarding): data-onboarding-Anker in echter UI gesetzt"
```

---

## TEIL C — Onboarding zusammensetzen (Pflicht-Strecke)

### Task 7: onboardingSteps.jsx (Phasen 0–3)

**Files:**
- Create: `src/components/AppOnboarding/onboardingSteps.jsx`

Schritt-Schema:
```
{ id, phase (0..3), tab (Zieltab, Controller wechselt dorthin), target? (data-onboarding),
  dock? ('top'|'bottom'), title, text (JSX), advance? ('poolTodo'|'slotToday' — sonst Button),
  kind? ('welcome'|'toolQuestion'|'toolCards'|'finish' — Sonder-Renderings im Controller) }
```

- [ ] **Step 1: STEPS anlegen**

Create `src/components/AppOnboarding/onboardingSteps.jsx`:

```jsx
export const PHASES = ['Willkommen', 'Dein Tag', 'Deine Tools', 'Fertig']

export const STEPS = [
  // ── Phase 0 — Willkommen ──
  {
    id: 'welcome', phase: 0, tab: 0, kind: 'welcome',
    title: 'Schön, dass du hier bist',
    text: (<>Das ist dein Tag, deine Aufgaben, deine Helfer — alles offline auf deinem Gerät.
      In zwei Minuten richten wir zusammen ein, was du brauchst. Du kannst jederzeit überspringen.</>),
  },
  // ── Phase 1 — Hands-on-Kern (echter Tagesplaner) ──
  {
    id: 'add', phase: 1, tab: 0, target: 'add-fab', dock: 'top',
    title: 'Hast du etwas zu erledigen?',
    text: (<>Unten sammelst du im <strong>Pool</strong> alles, was ansteht. Tipp auf das <strong>+</strong>,
      um deine erste Aufgabe anzulegen.</>),
    advance: 'modalOpen',
  },
  {
    id: 'auto', phase: 1, tab: 0, target: 'todo-auto', dock: 'bottom',
    title: 'Einfach drauflosschreiben',
    text: (<>Schalte <strong>Auto</strong> ein und schreib z.B. „Einkaufen 30min wichtig" — Dauer und
      Priorität werden automatisch erkannt. Unterpunkte gehst du später über <strong>Schritte</strong> an.
      Sichern legt die Aufgabe in den Pool.</>),
    advance: 'poolTodo',
    fallbackExample: true, // Controller zeigt „Beispiel nehmen"-Button
  },
  {
    id: 'drag', phase: 1, tab: 0, target: 'pool', dock: 'top',
    title: 'Zieh es in deinen Tag',
    text: (<>Halte den <strong>Griff</strong> deiner Aufgabe und zieh sie nach oben auf eine Uhrzeit —
      schon ist sie verplant. Zurück in den Pool geht genauso, nichts geht verloren.</>),
    advance: 'slotToday',
    fallbackTapHint: true, // nach ~10s: „Oder tipp auf eine freie Zeit"
  },
  {
    id: 'core-done', phase: 1, tab: 0,
    title: 'Das ist der Kern',
    text: (<>Sammeln, dann in den Tag ziehen. Mehr brauchst du erstmal nicht — der Rest hilft dir dabei.</>),
  },
  // ── Phase 2 — Tools ──
  {
    id: 'tools-intro', phase: 2, tab: 2, target: 'tools-list', dock: 'bottom', kind: 'toolQuestion',
    title: 'Deine Helfer',
    text: (<>Hier findest du Tools und kleine Helfer. <strong>Ausgeschaltet</strong> tauchen sie nirgends auf.
      <strong>Angeschaltet</strong> sind sie überall in die App integriert. Möchtest du selbst ausprobieren
      oder sollen wir dir die Großen kurz vorstellen?</>),
    // kind:'toolQuestion' → Controller zeigt zwei CTAs: „Selbst ausprobieren" / „Kurz vorstellen"
  },
  {
    id: 'tools-cards', phase: 2, tab: 2, kind: 'toolCards',
    title: 'Die großen Helfer',
    text: (<>Tippe an, was zu dir passt — ändern kannst du das jederzeit.</>),
    // kind:'toolCards' → Controller rendert Karten der featured Tools mit Aktivieren-Toggle
  },
  {
    id: 'tools-embed', phase: 2, tab: 0, target: 'tool-section', dock: 'top',
    title: 'So klinken sich Tools ein',
    text: (<>Aktive Tools zeigen sich als Karte hier im Tagesplaner, hinterlassen Spuren im Kalender —
      ein Tipp öffnet das ganze Tool. Die kleinen Helfer findest du jederzeit im Tab <strong>Tools</strong>.</>),
    // Controller: wenn kein widget-fähiges Tool aktiv → target weglassen, reiner Text
  },
  // ── Phase 3 — Abschluss ──
  {
    id: 'finish', phase: 3, tab: 0, kind: 'finish',
    title: 'Fertig eingerichtet!',
    text: (<>Drei Dinge noch: Deine Daten liegen nur hier — mach ab und zu ein <strong>Backup</strong>
      (Einstellungen → Speicher). Farbe & Theme stellst du in den <strong>Einstellungen</strong> ein.
      Und diese Einführung findest du dort jederzeit wieder.</>),
    // kind:'finish' → Controller zeigt „Feinheiten ansehen" (→ Kür) / „Loslegen" (→ Ende)
  },
]
```

> `advance: 'modalOpen'` braucht ein Prädikat, das im Controller aus lokalem State kommt (TodoModal offen), nicht aus dem Store — siehe Task 8. Es steht bewusst nicht in `onboardingLogic.js` (dort nur store-basierte pure Prädikate).

- [ ] **Step 2: Guard-Test anlegen**

Create `src/components/AppOnboarding/onboardingTargets.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STEPS } from './onboardingSteps.jsx'

// Anti-Drift: jedes in onboardingSteps referenzierte `target` muss als
// data-onboarding="…" irgendwo in src/ im Markup existieren. Vorbild: styleguide.test.js.
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const markup = walk(SRC)
  .filter(f => /\.jsx?$/.test(f))
  .map(f => readFileSync(f, 'utf8'))
  .join('\n')

describe('Onboarding-Targets — Anti-Drift', () => {
  const targets = [...new Set(STEPS.map(s => s.target).filter(Boolean))]
  it.each(targets)('data-onboarding="%s" existiert im Markup', (target) => {
    expect(markup.includes(`data-onboarding="${target}"`)).toBe(true)
  })
})
```

- [ ] **Step 3: Guard-Test grün prüfen**

Run: `npx vitest run src/components/AppOnboarding/onboardingTargets.test.js`
Expected: PASS — alle Pflicht-targets (`add-fab`, `todo-auto`, `pool`, `tools-list`, `tool-section`) sind im Markup (aus Task 6). Die Kür-targets (`slot`, `week-grid`, `fenster-btn`) kommen erst mit Task 12 in STEPS — bis dahin nicht referenziert, also kein Fehlschlag.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppOnboarding/onboardingSteps.jsx src/components/AppOnboarding/onboardingTargets.test.js
git commit -m "feat(onboarding): Schrittdaten Phase 0-3 + Anti-Drift-Guard"
```

---

### Task 8: AppOnboarding.jsx — Controller

**Files:**
- Create: `src/components/AppOnboarding/AppOnboarding.jsx`

Der Controller hält `stepIndex`, wechselt via `setCurrentTab` in den Zieltab des Schritts, misst das Advance-Prädikat und schaltet automatisch weiter (bzw. zeigt „Weiter"). Er beobachtet den Store über `useAppStore` und einen leichten Poll für DOM-abhängige Signale (Modal offen).

- [ ] **Step 1: Controller implementieren**

Create `src/components/AppOnboarding/AppOnboarding.jsx`:

```jsx
import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '../../store'
import { todayKey } from '../../utils'
import { createBlock } from '../../features/todos/Block'
import { TOOL_REGISTRY, ToolIcon } from '../../features/tools/toolRegistry.jsx'
import { STEPS, PHASES } from './onboardingSteps.jsx'
import { hasPoolTodo, hasSlotToday } from './onboardingLogic'
import CoachOverlay from './CoachOverlay'
import CoachBanner from './CoachBanner'
import s from './AppOnboarding.module.css'

export default function AppOnboarding({ onClose }) {
  const [i, setI] = useState(0)
  const [askedTools, setAskedTools] = useState(false) // toolQuestion beantwortet?
  const store = useAppStore()
  const { todos, days, setTodos, setCurrentTab, activeTools, toggleTool } = store
  const step = STEPS[i]

  // Zieltab beim Schritt-Eintritt setzen
  useEffect(() => { if (step.tab != null) setCurrentTab(step.tab) }, [i]) // eslint-disable-line

  // Advance-Prädikat auswerten (store-basiert). modalOpen kommt aus dem DOM.
  const advanced = useMemo(() => {
    if (step.advance === 'poolTodo') return hasPoolTodo({ todos })
    if (step.advance === 'slotToday') return hasSlotToday({ days }, todayKey())
    return false
  }, [step.advance, todos, days])

  // modalOpen: TodoModal im DOM? (leichter Poll, nur für diesen Schritt)
  const [modalOpen, setModalOpen] = useState(false)
  useEffect(() => {
    if (step.advance !== 'modalOpen') return
    const id = setInterval(() => setModalOpen(!!document.querySelector('[class*="modal"] [data-onboarding="todo-auto"]') || !!document.querySelector('[data-todomodal]')), 200)
    return () => clearInterval(id)
  }, [step.advance])

  // Auto-Weiterschaltung, sobald das Prädikat erfüllt ist (mit kleiner Verzögerung fürs Auge)
  const satisfied = step.advance === 'modalOpen' ? modalOpen : advanced
  useEffect(() => {
    if (!step.advance || !satisfied) return
    const t = setTimeout(() => setI(v => Math.min(v + 1, STEPS.length - 1)), step.advance === 'modalOpen' ? 150 : 700)
    return () => clearTimeout(t)
  }, [step.advance, satisfied]) // eslint-disable-line

  const finishAll = () => { onClose() }
  const next = () => (i >= STEPS.length - 1 ? finishAll() : setI(v => v + 1))
  const back = () => setI(v => Math.max(0, v - 1))

  const addExample = () => {
    setTodos(prev => [...prev, createBlock({ text: 'Einkaufen', priority: 2, duration: 30 })])
  }

  // „Weiter"-Button zeigen, wenn kein Prädikat ODER Prädikat schon erfüllt (Re-Run/Reload)
  const showNext = !step.advance || satisfied
  const dock = step.dock ?? 'bottom'
  const phaseCount = PHASES.length

  // ── Sonder-Renderings ──
  if (step.kind === 'welcome' || step.kind === 'finish') {
    return (
      <div className={s.fullRoot}>
        <div className={s.fullCard}>
          <h2 className={s.fullTitle}>{step.title}</h2>
          <p className={s.fullText}>{step.text}</p>
          <div className={s.fullActions}>
            {step.kind === 'welcome' && <button className={s.next} onClick={next}>Los geht's</button>}
            {step.kind === 'finish' && <>
              {/* Pflicht-Zwischenstand: Kür existiert noch nicht → beide schließen.
                  Task 12 ersetzt den „Feinheiten"-Handler durch setI(v => v + 1). */}
              <button className={s.back} onClick={finishAll}>Feinheiten ansehen</button>
              <button className={s.next} onClick={finishAll}>Loslegen</button>
            </>}
          </div>
          <button className={s.skip} onClick={finishAll}>Überspringen</button>
        </div>
      </div>
    )
  }

  const featured = TOOL_REGISTRY.filter(t => t.featured)

  return (
    <>
      <CoachOverlay targetSelector={step.target} />
      <CoachBanner
        phase={step.phase} phaseCount={phaseCount}
        title={step.title} dock={dock}
        onSkip={finishAll}
        onBack={i > 0 ? back : undefined}
        onNext={showNext ? next : undefined}
        canNext={showNext}
        cta={
          step.kind === 'toolQuestion'
            ? (!askedTools && <div className={s.ctaRow}>
                <button className={s.next} onClick={() => { setAskedTools(true); setI(v => v + 1) }}>Kurz vorstellen</button>
                <button className={s.ghost} onClick={() => { setAskedTools(true); /* bleibt auf Liste, target freigegeben */ }}>Selbst ausprobieren</button>
              </div>)
            : step.kind === 'toolCards'
              ? <div className={s.cards}>
                  {featured.map(t => {
                    const on = activeTools.includes(t.id)
                    return (
                      <div key={t.id} className={s.card}>
                        <span className={s.cardIcon} style={{ color: t.color }}><ToolIcon id={t.id} size={22} /></span>
                        <div className={s.cardBody}>
                          <span className={s.cardName}>{t.name}</span>
                          <span className={s.cardIntro}>{t.intro}</span>
                        </div>
                        <button className={[s.toggle, on ? s.toggleOn : ''].join(' ')} onClick={() => toggleTool(t.id)}>{on ? 'An' : 'Aus'}</button>
                      </div>
                    )
                  })}
                </div>
              : step.fallbackExample
                ? <button className={s.ghost} onClick={addExample}>Beispiel nehmen</button>
                : null
        }
      >
        {step.text}
      </CoachBanner>
    </>
  )
}
```

> Der „Feinheiten ansehen"-Zweig zeigt zunächst auf denselben `finishAll` (Kür noch nicht gebaut). Task 12 hängt die Kür-Schritte hinten an STEPS und ersetzt diesen Handler durch normales `setI(v => v+1)`.

- [ ] **Step 2: Sonder-CSS ergänzen**

In `AppOnboarding.module.css` ergänzen: `.fullRoot` (fixed, inset:0, z-index über Banner, zentriert, `background: var(--bg)`), `.fullCard`, `.fullTitle`, `.fullText`, `.fullActions`, `.ctaRow`, `.ghost` (sekundärer Button: transparent, border), `.cards`, `.card`, `.cardIcon`, `.cardBody`, `.cardName`, `.cardIntro`, `.toggle`/`.toggleOn`. Farben/Radii nur über Variablen. `.cards` scrollbar (`max-height: 50vh; overflow-y:auto`).

- [ ] **Step 3: Preview-Verifikation (siehe Task 10) — hier nur Kompilierbarkeit**

Run: `npx vitest run src/components/AppOnboarding/` (Guards + Logik grün, kein Render-Crash im Import-Graph)
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppOnboarding/AppOnboarding.jsx src/components/AppOnboarding/AppOnboarding.module.css
git commit -m "feat(onboarding): AppOnboarding-Controller (Phasen, Praedikat-Advance, Tool-Karten)"
```

---

### Task 9: Verkabelung — App.jsx + TabSettings

**Files:**
- Modify: `src/App.jsx` (Import, Gate, Render, Wait-for-MissedReview)
- Modify: `src/features/settings/TabSettings/TabSettings.jsx:64,276`

- [ ] **Step 1: Store-Feld umbenennen + App.jsx Import/Feld tauschen** (atomar, ein Commit)

In `src/store/index.js` (Zeile 102-103) ersetzen:

```js
  onboardingOpen: false,
  setOnboardingOpen: (v) => set({ onboardingOpen: v }),
```

In `src/App.jsx`:
- Zeile 17: `import AppBriefing from './components/AppBriefing/AppBriefing'` → `import AppOnboarding from './components/AppOnboarding/AppOnboarding'`
- Zeile 69: `briefingOpen, setBriefingOpen` → `onboardingOpen, setOnboardingOpen`

> Store-Umbenennung, App.jsx und TabSettings (Step 4) gehören in **denselben Commit** —
> kein Zwischenzustand darf `briefingOpen` und `onboardingOpen` gemischt haben.

- [ ] **Step 2: Gate umstellen**

Zeile 104-109 ersetzen:

```jsx
  // First-Run: neues Onboarding einmalig zeigen (auch auf Bestandsgeräten,
  // die nur das alte Briefing kannten — bewusst per neuem Key onboardingSeen).
  useEffect(() => {
    if (!lv(SK.onboardingSeen, false)) setOnboardingOpen(true)
  }, [setOnboardingOpen])

  const closeOnboarding = () => { sv(SK.onboardingSeen, true); setOnboardingOpen(false) }
```

- [ ] **Step 3: Render umstellen**

Zeile 187 ersetzen:

```jsx
      {onboardingOpen && <AppOnboarding onClose={closeOnboarding} />}
```

- [ ] **Step 4: TabSettings — Button**

In `src/features/settings/TabSettings/TabSettings.jsx`:
- Zeile 64: `setBriefingOpen` → `setOnboardingOpen`
- Zeile 276: `onClick={() => setBriefingOpen(true)}` → `onClick={() => setOnboardingOpen(true)}`

- [ ] **Step 5: Kompilieren + Tests grün**

Run: `npx vitest run`
Expected: PASS (alle Suites; kein Verweis mehr auf `briefingOpen`).

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/features/settings/TabSettings/TabSettings.jsx
git commit -m "feat(onboarding): Gate + Render auf AppOnboarding, Settings-Button verdrahtet"
```

---

### Task 10: Preview-Verifikation der Pflicht-Strecke (Erfolgskriterium)

**Files:**
- Ggf. Create: `.claude/launch.json` (falls nicht vorhanden)

- [ ] **Step 1: launch.json sicherstellen**

Falls `.claude/launch.json` fehlt, anlegen:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "adhs-dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

- [ ] **Step 2: Frisches Profil simulieren**

preview_start („adhs-dev"), dann preview_eval `localStorage.clear(); location.reload()`.

- [ ] **Step 3: Durchlauf verifizieren (DOM-Checks statt Screenshot)**

Nacheinander preview-verifizieren:
1. Willkommen sichtbar (`.fullTitle` Text „Schön, dass du hier bist"). „Los geht's" klicken.
2. Coach-Loch über FAB (`[class*="hole"]` vorhanden). FAB (`[data-onboarding="add-fab"]`) klicken → TodoModal offen → Schritt springt auf „auto".
3. Auto-Schritt: „Beispiel nehmen" klicken → Pool-Todo entsteht (`hasPoolTodo`) → Schritt springt auf „drag".
4. Drag-Schritt: per preview_eval einen Slot setzen (Store-API `useAppStore.getState().setDays(...)` mit `days[todayKey()]['9'] = {...}`) → Schritt springt auf „core-done". (Echtes Draggen ist im synthetischen Test unzuverlässig — hier nur das Prädikat prüfen; die Geste testet Jonas manuell.)
5. Tools-Frage: „Kurz vorstellen" → Karten der 8 featured Tools sichtbar, ein Toggle schaltet ein Tool (`activeTools`).
6. „Tools klinken sich ein" → Weiter.
7. Abschluss sichtbar → „Loslegen" → `localStorage.getItem('adhs_onboarding_seen')` === `"true"`, Onboarding zu.

Erwartet am Ende: mind. ein Tool aktiv, ein Slot in `days[today]`, `onboardingSeen` gesetzt.

- [ ] **Step 4: Skip + Re-Run prüfen**

- Reload → Onboarding startet erneut? Nein (seen gesetzt). Über Einstellungen → „Einführung nochmal ansehen" → startet; erledigte Prädikate → sofort „Weiter" statt Hängen.
- Frisches Profil, in Phase 1 „Überspringen" → Onboarding zu, `onboardingSeen` gesetzt.

- [ ] **Step 5: Jonas an localhost draufschauen lassen** (echte Drag-Geste + Look in Light/Dark).

- [ ] **Step 6: Commit (falls launch.json neu)**

```bash
git add .claude/launch.json
git commit -m "chore(onboarding): launch.json fuer Preview"
```

---

## TEIL D — MissedReview-Erklärkopf, Kür, Aufräumen

### Task 11: MissedReviewModal — Einmal-Erklärkopf

**Files:**
- Modify: `src/features/calendar/Zeitplan/MissedReviewModal.jsx`

- [ ] **Step 1: Erklärkopf einbauen**

In `MissedReviewModal.jsx`: `lv`/`sv`/`SK` importieren. Nach dem `<div className={s.head}>`-Block einen einmaligen Erklär-Absatz rendern, wenn `!lv(SK.missedHintSeen, false)`:

```jsx
import { lv, sv, SK } from '../../../storage'
// …
const [showHint, setShowHint] = useState(() => !lv(SK.missedHintSeen, false))
const dismissHint = () => { sv(SK.missedHintSeen, true); setShowHint(false) }
// …
{showHint && (
  <div className={s.hint}>
    <p>Wenn eine Zeit abgelaufen ist, fragt die App kurz nach: <strong>Erledigt</strong>, <strong>Ignorieren</strong>
      (kommt am nächsten Tag wieder) oder zurück <strong>in den Pool</strong>. Abgehaktes findest du im Kalender beim Tag unter „Erledigt".</p>
    <button className={s.hintOk} onClick={dismissHint}>Verstanden</button>
  </div>
)}
```

CSS `.hint`/`.hintOk` in `MissedReviewModal.module.css` ergänzen (dezente surface-Box, Variablen).

- [ ] **Step 2: Preview-Check**

Frisches Profil → einen abgelaufenen Slot erzeugen (per preview_eval `days` mit vergangenem Slot heute setzen) → TabHeute → MissedReviewModal zeigt Erklärkopf; „Verstanden" → `adhs_missed_hint_seen` === `"true"`; erneut auslösen → kein Kopf mehr.

- [ ] **Step 3: Commit**

```bash
git add src/features/calendar/Zeitplan/MissedReviewModal.jsx src/features/calendar/Zeitplan/MissedReviewModal.module.css
git commit -m "feat(onboarding): einmaliger Erklaerkopf der ersten Zeitablauf-Abfrage"
```

---

### Task 12: Kür (Phase 4, optional)

**Files:**
- Modify: `src/components/AppOnboarding/onboardingSteps.jsx` (Kür-Schritte anhängen)
- Modify: `src/components/AppOnboarding/AppOnboarding.jsx` („Feinheiten ansehen" → nächster Schritt; MissedStage-Rendering)
- Modify: `src/features/calendar/Zeitplan/SlotBlock.jsx` (`data-onboarding="slot"` am ersten Slot), `src/features/calendar/TabKalender/WocheView.jsx` (`data-onboarding="week-grid"` am Grid)

- [ ] **Step 1: Kür-Schritte anhängen**

In `onboardingSteps.jsx` ans STEPS-Array (nach `finish`) anhängen — Phase bleibt 3 (Abschluss-Phase), `optional: true`:

```jsx
  { id: 'kuer-missed', phase: 3, tab: 0, kind: 'missedDemo', optional: true,
    title: 'Wenn Zeit verstreicht',
    text: (<>Läuft eine geplante Zeit ab, fragt die App: <strong>Erledigt</strong>, <strong>Ignorieren</strong>
      (kommt morgen wieder) oder zurück <strong>in den Pool</strong>. So fällt nichts hinten runter.</>) },
  { id: 'kuer-slot', phase: 3, tab: 0, target: 'slot', dock: 'bottom', optional: true,
    title: 'Feinjustieren',
    text: (<>Passt eine Uhrzeit nicht, schieb den Slot mit <strong>▲▼</strong>. Das <strong>Schloss</strong> am
      Griff fixiert ihn; Termine mit Uhrzeit sind automatisch fix und bleiben beim Verschieben unberührt.</>) },
  { id: 'kuer-fenster', phase: 3, tab: 0, target: 'fenster-btn', dock: 'top', optional: true,
    title: 'Feste Zeiten blocken',
    text: (<>Mit <strong>+ Fenster</strong> blockst du Schlaf, Arbeit, Pausen — auch wiederkehrend.</>) },
  { id: 'kuer-tap', phase: 3, tab: 0, target: 'pool', dock: 'top', optional: true,
    title: 'Direkt antippen',
    text: (<>Tipp auf eine freie Fläche im Plan, um dort direkt etwas anzulegen oder ein Pool-Todo zu
      platzieren — im Tagesplan und in der Woche.</>) },
  { id: 'kuer-woche', phase: 3, tab: 1, target: 'week-grid', dock: 'bottom', optional: true,
    title: 'Woche & Monat',
    text: (<>In der Woche ziehst du Blöcke frei über <strong>Tage und Zeiten</strong>. Der Monat gibt den Überblick.</>) },
```

- [ ] **Step 2: Controller — Feinheiten-Handler + MissedStage**

In `AppOnboarding.jsx`:
- Der „Feinheiten ansehen"-Button (finish-Zweig) ruft jetzt `setI(v => v + 1)` statt `finishAll` (nächster = erste Kür).
- Für `kind: 'missedDemo'`: das echte `MissedReviewModal` trocken rendern (Beispiel-Item aus dem eigenen ersten Pool-Todo oder ein generisches; Callbacks no-op). Gleicher Transform-Trick wie das alte MissedStage (`.modalWrap`, `transform: translateZ(0)`), damit das `fixed`-Overlay lokal bleibt.

```jsx
import MissedReviewModal from '../../features/calendar/Zeitplan/MissedReviewModal'
import { todayKey } from '../../utils'
// … im Render, wenn step.kind === 'missedDemo':
const demoItems = [{ id: 'demo', text: todos.find(t => !t.done)?.text ?? 'Sport machen', color: '#10B981', dateKey: todayKey(), slotKey: '9' }]
// <div className={s.modalWrap}><MissedReviewModal items={demoItems} variant="new-day" onDone={()=>{}} onIgnore={()=>{}} onMoveToPool={()=>{}} /></div>
```

- [ ] **Step 3: Kür-Anker setzen**

`data-onboarding="slot"` am ersten Slot-Block in `SlotBlock.jsx`; `data-onboarding="week-grid"` am Wochen-Grid in `WocheView.jsx`.

- [ ] **Step 4: Guard grün + Preview**

Run: `npx vitest run src/components/AppOnboarding/onboardingTargets.test.js`
Expected: PASS (jetzt auch `slot`, `week-grid`, `fenster-btn`).

Preview: „Feinheiten ansehen" führt durch die 5 Kür-Schritte, Tab wechselt bei „Woche" auf Kalender, „Weiter" am Ende schließt (`onboardingSeen`).

- [ ] **Step 5: Commit**

```bash
git add src/components/AppOnboarding/ src/features/calendar/Zeitplan/SlotBlock.jsx src/features/calendar/TabKalender/WocheView.jsx
git commit -m "feat(onboarding): optionale Kuer (Zeitablauf, Slots, Fenster, Tap, Woche)"
```

---

### Task 13: AppBriefing entfernen + Kontext nachziehen

**Files:**
- Delete: `src/components/AppBriefing/` (ganzer Ordner)
- Modify: `kontext/architektur.md`

- [ ] **Step 1: Sicherstellen, dass nichts mehr referenziert**

Run: `git grep -n "AppBriefing\|briefingContent\|DemoPlanner\|WeekGridDemo\|briefingOpen"` (Grep-Tool)
Expected: keine Treffer in `src/` (nur ggf. in `docs/`). Falls Treffer → vorher beheben.

- [ ] **Step 2: Ordner löschen**

```bash
git rm -r src/components/AppBriefing
```

- [ ] **Step 3: architektur.md nachziehen**

In `kontext/architektur.md` den `AppBriefing/`-Eintrag in der Ordnerstruktur durch einen `AppOnboarding/`-Eintrag ersetzen (Controller + CoachOverlay/CoachBanner/TapPulse + onboardingSteps/onboardingLogic; Gate über `SK.onboardingSeen`).

- [ ] **Step 4: Volle Tests**

Run: `npx vitest run`
Expected: PASS (styleguide-Guard scannt jetzt auch die neuen CSS-Module; keine verbotenen Fonts, keine toten Font-Namen).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(onboarding): altes AppBriefing entfernt, architektur.md nachgezogen"
```

---

### Task 14: Abschluss-Verifikation

- [ ] **Step 1: Voller Testlauf**

Run: `npx vitest run`
Expected: PASS — insb. `storage.test.js`, `styleguide.test.js`, `onboardingLogic.test.js`, `onboardingTargets.test.js`, `toolRegistry.test.js`.

- [ ] **Step 2: End-to-End im Preview mit frischem Profil**

`localStorage.clear()` → kompletter Pflicht-Durchlauf inkl. echter Drag-Geste (Jonas) → Kür einmal durch → Light Mode + `prefers-reduced-motion` Stichprobe (Puls statisch, Banner lesbar).

- [ ] **Step 3: Erfolgskriterium bestätigen**

Am Ende eines frischen Durchlaufs: `activeTools` nicht leer, `days[todayKey()]` hat einen Slot, `onboardingSeen === "true"`. Ergebnis (Screenshot Abschluss-Screen) an Jonas.

---

## Self-Review (gegen die Spec)

**Spec-Coverage:**
- Echte Oberfläche als Bühne + Eingabe-Sperre → Task 4 (CoachOverlay). ✓
- Ansatz „Pflicht kurz + Kür optional" → Task 7 (Pflicht) + Task 12 (Kür). ✓
- AppBriefing ersetzt, TapPulse zieht um → Task 4, Task 13. ✓
- Tool-Schritt (Konzept → Frage → Vorstellung großer Tools) → Task 7 (`toolQuestion`/`toolCards`) + Task 8 (Rendering) + Task 2 (featured/intro). ✓
- Große Tools inkl. Geburtstage → Task 2. ✓
- Neuer Gate-Key, Bestandsgeräte einmal → Task 1 + Task 9. ✓
- Weiter-Schaltung über Prädikate, „schon erfüllt → Weiter" → Task 3 + Task 8. ✓
- MissedReview-Erklärkopf → Task 11. ✓
- „Tools klinken sich ein" (Dashboard im Tagesplaner + Kalender-Spuren) → Task 7 (`tools-embed`) + `tool-section`-Anker. ✓
- Storage-Keys + BACKUP_CATS + Guards → Task 1, Task 6, Task 2. ✓
- Fallbacks (Termin statt Todo, Beispiel-Button, Tap-Plan-B) → Task 7 (`fallbackExample`/`fallbackTapHint`) + Task 8 (`addExample`). ✓
- Kontext nachziehen → Task 13. ✓

**Offene Umsetzungsdetails (bewusst dem Bau überlassen, mit Netz):**
- Exakte CSS-Klassennamen der Anker-Elemente (Auto-Toggle, Tool-Section-Wrapper) — der Bau-Agent setzt das Attribut am korrekten Element; der Guard-Test (Task 7) erzwingt bloße Existenz, die Preview-Verifikation (Task 10) erzwingt die Funktion.
- `modalOpen`-Signal: robusteste Quelle beim Bau wählen (vorhandenes `data-onboarding="todo-auto"` sitzt im Modal → Präsenz = Modal offen). Alternativ ein `data-todomodal`-Attribut am Modal-Root ergänzen.

**Type-Konsistenz:** `hasPoolTodo(ctx)` / `hasSlotToday(ctx, todayKey)` identisch in Logic, Test und Controller. `featured`/`intro` identisch in Registry, Test, Controller. `target`/`data-onboarding` identisch in Steps, Anker, Guard.
