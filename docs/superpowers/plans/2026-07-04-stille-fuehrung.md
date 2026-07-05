# Stille Führung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die gescheiterte Onboarding-Tour ersetzen durch stille Führung — App startet direkt in den Tagesplaner, Erklärung wohnt in Empty-States + statischen Untertiteln + einem Hilfe-Sheet in den Einstellungen.

**Architecture:** Löschen statt umbauen. `AppBriefing/` + `AppOnboarding/` fliegen komplett raus (inkl. Store-Feld, Guard-Tests, `data-onboarding`-Anker). Neu: eine präsentationale `Hilfe`-Komponente als Sub-View der Einstellungen (lokaler State + `backInterceptor`, kein Modal, kein Storage-Key). Die Tool-Liste im Sheet generiert sich aus `TOOL_REGISTRY` und wird per erweitertem Guard-Test abgesichert.

**Tech Stack:** React 19, Zustand (`useAppStore`), CSS Modules, Vitest. Keine neuen Dependencies.

**Reihenfolge-Prinzip:** Jeder Commit lässt Build + Tests grün. Erst neuen Weg bauen (Hilfe), dann alten abreißen (Onboarding), dann Copy ergänzen, dann totes Zeug wegräumen, dann Docs.

**Delegation:** Task 6 (mechanische Registry-Kur über 16 Einträge) eignet sich für einen Sonnet-Subagenten. Rest ist chirurgisch — im Hauptmodell halten.

---

## Dateien-Überblick

**Neu:**
- `src/features/settings/Hilfe/Hilfe.jsx` — präsentationale Hilfe-Sub-View
- `src/features/settings/Hilfe/Hilfe.module.css` — Styles dazu

**Geändert:**
- `src/features/tools/toolRegistry.test.js` — Guard: jedes Tool hat `description` ≥ 10 Zeichen (ersetzt featured/intro-Tests)
- `src/features/tools/toolRegistry.jsx` — `featured` + `intro` entfernt (tote Felder)
- `src/features/settings/TabSettings/TabSettings.jsx` — „Einführung"-Karte → „Hilfe"-Karte, öffnet Hilfe-Sub-View
- `src/App.jsx` — AppOnboarding-Import/Render/closeOnboarding + `data-onboarding="add-fab"` raus
- `src/store/index.js` — `onboardingOpen`/`setOnboardingOpen` raus
- `src/features/calendar/Pool/Pool.jsx` — Empty-State „erste Aufgabe", `data-onboarding="pool"` raus
- `src/features/tools/TabTools/TabTools.jsx` — statischer Untertitel, `data-onboarding="tools-list"` raus
- `src/features/tools/TabTools/TabTools.module.css` — `.allToolsHint`
- `src/features/calendar/Zeitplan/MissedReviewModal.jsx` — feste Beruhigungszeile
- `src/features/calendar/Zeitplan/MissedReviewModal.module.css` — `.reassure`
- `src/components/TodoModal/TodoModal.jsx` — `data-onboarding="todo-auto"` raus
- `src/features/calendar/TabHeute/TabHeute.jsx` — `data-onboarding="tool-section"` raus
- `src/storage/index.js` — `SK.missedHintSeen` (3 Stellen) raus
- `kontext/architektur.md`, `CLAUDE.md` — nachziehen

**Gelöscht (ganze Ordner):**
- `src/components/AppBriefing/`
- `src/components/AppOnboarding/`

---

## Task 1: Registry-Guard auf `description` umstellen

Sichert die selbstpflegende Tool-Liste ab: neues Tool ohne Beschreibung → roter Test statt leerer Eintrag im Sheet. Ersetzt die alten `featured`/`intro`-Tests (die wir mit dem Onboarding entsorgen).

**Files:**
- Modify: `src/features/tools/toolRegistry.test.js` (ganz ersetzen)

- [ ] **Step 1: Test-Datei ersetzen**

Kompletter neuer Inhalt von `src/features/tools/toolRegistry.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from './toolRegistry.jsx'

describe('Tool-Registry — Hilfe-Sheet-Liste', () => {
  it('jedes Tool hat eine description (>= 10 Zeichen)', () => {
    for (const t of TOOL_REGISTRY) {
      expect(typeof t.description, `${t.id}.description fehlt`).toBe('string')
      expect(t.description.trim().length, `${t.id}.description zu kurz`).toBeGreaterThanOrEqual(10)
    }
  })

  it('jede id ist eindeutig', () => {
    const ids = TOOL_REGISTRY.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: Test laufen lassen**

Run: `npx vitest run src/features/tools/toolRegistry.test.js`
Expected: PASS (alle 16 Tools haben bereits eine `description` ≥ 10 Zeichen — der Guard fixiert den Ist-Zustand).

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/toolRegistry.test.js
git commit -m "test(tools): Registry-Guard verlangt description je Tool (Hilfe-Sheet)"
```

---

## Task 2: Hilfe-Komponente bauen (noch nicht verdrahtet)

Präsentationale Sub-View. Reine Text-Karten + generierte Tool-Liste. Kein Storage, kein Modal.

**Files:**
- Create: `src/features/settings/Hilfe/Hilfe.jsx`
- Create: `src/features/settings/Hilfe/Hilfe.module.css`

- [ ] **Step 1: Hilfe.jsx anlegen**

Kompletter Inhalt von `src/features/settings/Hilfe/Hilfe.jsx`:

```jsx
import { useEffect } from 'react'
import { useAppStore } from '../../../store'
import { TOOL_REGISTRY, ToolIcon } from '../../tools/toolRegistry.jsx'
import s from './Hilfe.module.css'

// Handgeschriebene Kern-Karten. Neue Kern-Mechanik → hier eine Karte ergänzen
// (siehe CLAUDE.md-Regel). Die Tool-Liste unten pflegt sich selbst aus der Registry.
const CARDS = [
  {
    title: 'Der Kern',
    body: 'Aufgaben sammeln sich im Pool. Um eine in deinen Tag zu bringen: halt sie am Griff gedrückt und zieh sie auf eine Uhrzeit — oder tipp auf eine freie Zeit und wähl die Aufgabe aus. Beide Wege führen zum selben Ziel.',
  },
  {
    title: 'Wenn Zeit abläuft',
    body: 'Läuft die Zeit eines Eintrags ab, sammelt die App ihn in einer ruhigen Abfrage. Du entscheidest pro Eintrag: erledigt, später nochmal, oder zurück in den Pool. Nichts geht verloren.',
  },
  {
    title: 'Pause',
    body: 'Kommst du an einer Aufgabe gerade nicht weiter, kannst du sie pausieren — optional mit einem kurzen Grund. Sie rückt gedimmt ans Ende des Pools. Der ▶-Knopf am Eintrag holt sie zurück.',
  },
  {
    title: 'Kalender',
    body: 'In der Wochenansicht ziehst du Blöcke frei über Tage und Uhrzeiten. Die Monatsansicht gibt dir den ruhigen Überblick über den Monat.',
  },
  {
    title: 'Der +-Knopf',
    body: 'Über + legst du Aufgaben an. Schreib einfach drauflos — aus „Einkaufen 30min wichtig" erkennt die App Dauer und Priorität von selbst. Über den Umschalter oben wird aus dem + auch eine schnelle Notiz.',
  },
]

const TOOLS_INTRO =
  'Tools erweitern die App um Extra-Funktionen. Ausgeschaltet tauchen sie nirgends auf, angeschaltet sind sie in die App integriert. Ein- und ausschalten kannst du sie im Tools-Tab.'

const DATA_CARD = {
  title: 'Deine Daten',
  body: 'Alles bleibt offline auf deinem Gerät — kein Konto nötig. Ein Backup machst du unter Einstellungen → Speicher.',
}

export default function Hilfe({ onBack }) {
  const { setBackInterceptor } = useAppStore()

  // Swipe-/Zurück-Geste schließt zuerst die Hilfe, nicht den ganzen Tab.
  useEffect(() => {
    setBackInterceptor(() => onBack())
    return () => setBackInterceptor(null)
  }, [onBack, setBackInterceptor])

  return (
    <div className={s.page}>
      <button className={s.back} onClick={onBack}>‹ Zurück</button>
      <h2 className={s.heading}>Wie funktioniert die App?</h2>

      {CARDS.map(c => (
        <section key={c.title} className={s.card}>
          <h3 className={s.cardTitle}>{c.title}</h3>
          <p className={s.cardBody}>{c.body}</p>
        </section>
      ))}

      <section className={s.card}>
        <h3 className={s.cardTitle}>Tools</h3>
        <p className={s.cardBody}>{TOOLS_INTRO}</p>
        <div className={s.toolList}>
          {TOOL_REGISTRY.map(t => (
            <div key={t.id} className={s.toolRow}>
              <span className={s.toolIcon} style={{ color: t.color }}>
                <ToolIcon id={t.id} size={20} />
              </span>
              <div className={s.toolText}>
                <span className={s.toolName}>{t.name}</span>
                <span className={s.toolDesc}>{t.description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.card}>
        <h3 className={s.cardTitle}>{DATA_CARD.title}</h3>
        <p className={s.cardBody}>{DATA_CARD.body}</p>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Hilfe.module.css anlegen**

Kompletter Inhalt von `src/features/settings/Hilfe/Hilfe.module.css`:

```css
.page {
  padding: 8px 4px 40px;
  animation: toolEnter var(--dur) var(--ease-out);
}

.back {
  background: none;
  border: none;
  color: var(--text-dim);
  font-family: var(--font);
  font-size: 0.9rem;
  padding: 6px 0;
  margin-bottom: 6px;
  cursor: pointer;
}

.heading {
  font-family: var(--font);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 18px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 16px;
  margin-bottom: 12px;
}

.cardTitle {
  font-family: var(--font);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.cardBody {
  font-family: var(--font);
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-dim);
}

.toolList {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.toolRow {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolIcon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--r-sm);
  background: var(--surface-low);
}

.toolText {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.toolName {
  font-family: var(--font);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.toolDesc {
  font-family: var(--font);
  font-size: 0.8rem;
  color: var(--text-dim);
  line-height: 1.35;
}
```

- [ ] **Step 3: Build prüfen (Komponente kompiliert, noch ungenutzt)**

Run: `npm run build`
Expected: Build erfolgreich. (Hilfe ist noch nirgends importiert — ESLint könnte „unused" NICHT melden, da es eine Default-Export-Datei ist; kein Fehler erwartet.)

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/Hilfe/Hilfe.jsx src/features/settings/Hilfe/Hilfe.module.css
git commit -m "feat(settings): Hilfe-Sub-View (Kern-Karten + generierte Tool-Liste)"
```

---

## Task 3: Hilfe in die Einstellungen verdrahten

Ersetzt die „Einführung nochmal ansehen"-Karte durch „Wie funktioniert die App?". TabSettings hört auf, `setOnboardingOpen` zu nutzen (Store-Feld bleibt vorerst, wird in Task 4 entfernt).

**Files:**
- Modify: `src/features/settings/TabSettings/TabSettings.jsx`

- [ ] **Step 1: Hilfe importieren**

In `src/features/settings/TabSettings/TabSettings.jsx` nach der `CloudBackupSection`-Import-Zeile (Zeile 11) ergänzen:

```jsx
import Hilfe from '../Hilfe/Hilfe'
```

- [ ] **Step 2: `setOnboardingOpen` aus dem Store-Destructure entfernen, `helpOpen`-State ergänzen**

Zeile 66 ändern von:

```jsx
  const { theme, setTheme, accentColor, setAccentColor, setOnboardingOpen } = useAppStore()
```

zu:

```jsx
  const { theme, setTheme, accentColor, setAccentColor } = useAppStore()
```

Direkt bei den anderen `useState`-Zeilen (nach Zeile 69 `const [confirmReset, setConfirmReset] = useState(false)`) ergänzen:

```jsx
  const [helpOpen, setHelpOpen] = useState(false)
```

- [ ] **Step 3: Hilfe-Sub-View vor dem Haupt-Return rendern**

Unmittelbar vor `return (` des Haupt-Renders (die Zeile mit `<div className={s.page}>`, ~Zeile 250+) einfügen:

```jsx
  if (helpOpen) return <Hilfe onBack={() => setHelpOpen(false)} />

```

- [ ] **Step 4: „Einführung"-Karte durch „Hilfe"-Karte ersetzen**

Den Block (Zeile 282-287):

```jsx
      <section className={s.card}>
        <h3 className={s.cardTitle}>Einführung</h3>
        <button className={s.actionBtn} onClick={() => setOnboardingOpen(true)}>
          ↻ Einführung nochmal ansehen
        </button>
      </section>
```

ersetzen durch:

```jsx
      <section className={s.card}>
        <h3 className={s.cardTitle}>Hilfe</h3>
        <button className={s.actionBtn} onClick={() => setHelpOpen(true)}>
          Wie funktioniert die App?
        </button>
      </section>
```

- [ ] **Step 5: Build + Lint prüfen**

Run: `npm run build`
Expected: Build erfolgreich, keine „setOnboardingOpen is not defined"-Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/features/settings/TabSettings/TabSettings.jsx
git commit -m "feat(settings): Einfuehrungs-Karte oeffnet neue Hilfe statt alter Tour"
```

---

## Task 4: Onboarding-System abreißen

App.jsx entkoppeln, Store-Feld entfernen, beide Ordner löschen, alle `data-onboarding`-Anker entfernen. Danach existiert keine Tour mehr.

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/store/index.js`
- Modify: `src/components/TodoModal/TodoModal.jsx`
- Modify: `src/features/tools/TabTools/TabTools.jsx`
- Modify: `src/features/calendar/Pool/Pool.jsx`
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`
- Delete: `src/components/AppBriefing/` (ganzer Ordner)
- Delete: `src/components/AppOnboarding/` (ganzer Ordner)

- [ ] **Step 1: App.jsx — Import entfernen**

Zeile 19 löschen:

```jsx
import AppOnboarding    from './components/AppOnboarding/AppOnboarding'
```

- [ ] **Step 2: App.jsx — Store-Destructure bereinigen**

Zeile 71 ändern von:

```jsx
  const { currentTab, previousTab, setCurrentTab, accentColor, theme, onboardingOpen, setOnboardingOpen } = useAppStore()
```

zu:

```jsx
  const { currentTab, previousTab, setCurrentTab, accentColor, theme } = useAppStore()
```

- [ ] **Step 3: App.jsx — Kommentarblock + closeOnboarding entfernen**

Zeilen 106-110 löschen (den 4-Zeilen-Kommentar `// Onboarding-Auto-Start bewusst deaktiviert …` **und** die Zeile `const closeOnboarding = () => { sv(SK.onboardingSeen, true); setOnboardingOpen(false) }`).

- [ ] **Step 4: App.jsx — Render-Zeile entfernen**

Zeile 189 löschen:

```jsx
      {onboardingOpen && <AppOnboarding onClose={closeOnboarding} />}
```

- [ ] **Step 5: App.jsx — `data-onboarding="add-fab"` entfernen**

Am FAB-Button (Zeile 174) das Attribut `data-onboarding="add-fab"` streichen (nur diese Zeile, restliche Button-Attribute bleiben).

- [ ] **Step 6: App.jsx — verwaiste Imports prüfen**

Run: `npx grep -n "sv(" src/App.jsx` — falls kein Treffer außer entfernten, ist `sv` verwaist. Praktisch: `sv`/`SK` werden in App.jsx weiter für Backup/PWA genutzt → bleiben. Verifiziere per Suche, dass `SK` und `sv` noch mindestens einmal vorkommen; falls nicht, den jeweiligen Import in Zeile mit `from './storage'` entfernen.

Konkret prüfen (Grep-Tool): Muster `\bsv\b` und `\bSK\b` in `src/App.jsx`. Erwartung: beide kommen weiter vor (bleiben).

- [ ] **Step 7: Store-Feld entfernen**

In `src/store/index.js` die Zeilen 102-103 löschen:

```jsx
  onboardingOpen: false,
  setOnboardingOpen: (v) => set({ onboardingOpen: v }),
```

- [ ] **Step 8: `data-onboarding`-Anker aus den 4 Komponenten entfernen**

Jeweils nur das Attribut streichen, umliegendes Markup unverändert:
- `src/components/TodoModal/TodoModal.jsx:381` — `data-onboarding="todo-auto"`
- `src/features/tools/TabTools/TabTools.jsx:319` — `data-onboarding="tools-list"` (aus `<div className={s.page} data-onboarding="tools-list">` wird `<div className={s.page}>`)
- `src/features/calendar/Pool/Pool.jsx:190` — `data-onboarding="pool"`
- `src/features/calendar/TabHeute/TabHeute.jsx:243` — `data-onboarding="tool-section"`

- [ ] **Step 9: Beide Ordner löschen**

```bash
git rm -r src/components/AppBriefing src/components/AppOnboarding
```

Das entfernt auch `onboardingLogic.test.js` + `onboardingTargets.test.js` (der Guard, der die eben gelöschten `data-onboarding`-Anker prüfte — korrekt, er ist gegenstandslos).

- [ ] **Step 10: Volle Testsuite + Build**

Run: `npx vitest run`
Expected: PASS, keine Referenz auf `AppOnboarding`/`onboardingTargets`/`onboardingLogic` mehr.

Run: `npm run build`
Expected: Build erfolgreich, keine ungelösten Imports.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor(onboarding): Tour komplett entfernt (AppBriefing + AppOnboarding, Store-Feld, data-onboarding-Anker)"
```

> Hinweis: Hier ist `git add -A` bewusst ok (koordinierte Löschung über viele Pfade). Falls eine Parallel-Session läuft, stattdessen die oben gelisteten Pfade explizit adden.

---

## Task 5: Neue Copy — Empty-States & Beruhigungszeile

**Files:**
- Modify: `src/features/calendar/Pool/Pool.jsx`
- Modify: `src/features/tools/TabTools/TabTools.jsx`
- Modify: `src/features/tools/TabTools/TabTools.module.css`
- Modify: `src/features/calendar/Zeitplan/MissedReviewModal.jsx`
- Modify: `src/features/calendar/Zeitplan/MissedReviewModal.module.css`

- [ ] **Step 1: Pool — Erstnutzer-Empty-State**

In `src/features/calendar/Pool/Pool.jsx` den Block (Zeile 243-245):

```jsx
            {activePool.length === 0 && (
              <p className={s.empty}>Alle Todos verplant ✓</p>
            )}
```

ersetzen durch:

```jsx
            {activePool.length === 0 && (
              <p className={s.empty}>
                {todos.length === 0
                  ? 'Über + legst du deine erste Aufgabe an.'
                  : 'Alle Todos verplant ✓'}
              </p>
            )}
```

(`todos` ist bereits eine Prop der Pool-Komponente, Zeile 82.)

- [ ] **Step 2: TabTools — statischer Untertitel über der Alle-Tools-Liste**

In `src/features/tools/TabTools/TabTools.jsx` den Block (Zeile 334-338):

```jsx
      {showAll && (
        <div className={s.list}>
          {allToolsSorted.map(renderChip)}
        </div>
      )}
```

ersetzen durch:

```jsx
      {showAll && (
        <>
          <p className={s.allToolsHint}>Aus = taucht nirgends auf. An = in die App integriert.</p>
          <div className={s.list}>
            {allToolsSorted.map(renderChip)}
          </div>
        </>
      )}
```

- [ ] **Step 3: TabTools CSS — `.allToolsHint`**

Am Ende von `src/features/tools/TabTools/TabTools.module.css` ergänzen:

```css
.allToolsHint {
  font-family: var(--font);
  font-size: 0.8rem;
  color: var(--text-dim);
  line-height: 1.4;
  padding: 2px 4px 10px;
}
```

- [ ] **Step 4: MissedReviewModal — feste Beruhigungszeile**

In `src/features/calendar/Zeitplan/MissedReviewModal.jsx` den Header-Block (Zeile 70-77) — konkret nach dem schließenden `</p>` der `.subtitle`-Zeile — eine Zeile ergänzen. Aus:

```jsx
            <p className={s.subtitle}>
              {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'} offen
            </p>
          </div>
```

wird:

```jsx
            <p className={s.subtitle}>
              {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'} offen
            </p>
            <p className={s.reassure}>Nichts geht verloren — entscheide in Ruhe.</p>
          </div>
```

- [ ] **Step 5: MissedReviewModal CSS — `.reassure`**

In `src/features/calendar/Zeitplan/MissedReviewModal.module.css` direkt nach der `.subtitle`-Regel ergänzen:

```css
.reassure {
  font-family: var(--font);
  font-size: 0.78rem;
  color: var(--text-dim);
  margin-top: 3px;
  line-height: 1.4;
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: Build erfolgreich.

- [ ] **Step 7: Commit**

```bash
git add src/features/calendar/Pool/Pool.jsx src/features/tools/TabTools/TabTools.jsx src/features/tools/TabTools/TabTools.module.css src/features/calendar/Zeitplan/MissedReviewModal.jsx src/features/calendar/Zeitplan/MissedReviewModal.module.css
git commit -m "feat(onboarding): stille Fuehrung — Empty-States + Beruhigungszeile im Layout"
```

---

## Task 6: Totes Zeug wegräumen (Registry + Storage-Key)

Nach dem Abriss verwaist: `featured` + `intro` (nur der alte Test las sie — der ist weg) und `SK.missedHintSeen` (nie geschrieben, kein Backup enthält ihn). Beides sauber entfernen.

**Files:**
- Modify: `src/features/tools/toolRegistry.jsx`
- Modify: `src/storage/index.js`

- [ ] **Step 1: Verwaisung bestätigen**

Grep-Tool über `src/`: Muster `\.featured` und `\.intro\b` und `missedHintSeen`.
Erwartung: `featured`/`intro` nur noch als Objekt-Felder in `toolRegistry.jsx` selbst (keine Leser); `missedHintSeen` nur in `src/storage/index.js`. Falls ein anderer Leser auftaucht → NICHT entfernen, stattdessen melden und den betroffenen Teil überspringen.

- [ ] **Step 2: `featured` + `intro` aus allen Registry-Einträgen entfernen**

In `src/features/tools/toolRegistry.jsx` bei den 8 betroffenen Tools (geburtstage, rezepte, fitness, garten, haushalt, kognitiv, projekte, growth) jeweils die beiden Zeilen `featured: true,` und die `intro: '…',`-Zeile löschen. Beispiel geburtstage — aus:

```jsx
    description: 'Geburtstage & Erinnerungen',
    featured: true,
    intro: 'Trag Geburtstage einmal ein — die App erinnert dich rechtzeitig und blendet sie im Kalender ein. Optional mit Geschenk-Vorlauf, damit nichts kurzfristig wird.',
    standalone: true,
```

wird:

```jsx
    description: 'Geburtstage & Erinnerungen',
    standalone: true,
```

Für alle 8 featured-Einträge analog. Die restlichen 8 Tools (timer, pizza, elvi, rad, reminder, wasjetzt, klaeren, notizen) haben weder `featured` noch `intro` — unverändert lassen.

- [ ] **Step 3: `SK.missedHintSeen` an 3 Stellen entfernen**

In `src/storage/index.js`:
- Zeile 85 löschen: `  missedHintSeen: \`${PREFIX}missed_hint_seen\`,     // Einmal-Erklärkopf der ersten echten Zeitablauf-Abfrage`
- Zeile 182 löschen: `  [SK.missedHintSeen]:  'lww',`
- In Zeile 292 den Eintrag `SK.missedHintSeen,` aus der Liste streichen (aus `SK.settings, SK.theme, SK.appBriefingSeen, SK.onboardingSeen, SK.missedHintSeen,` wird `SK.settings, SK.theme, SK.appBriefingSeen, SK.onboardingSeen,`).

`SK.appBriefingSeen` und `SK.onboardingSeen` bleiben bewusst (LEGACY, alte Backups).

- [ ] **Step 4: Storage- + Registry-Tests + Build**

Run: `npx vitest run src/storage/index.test.js src/features/tools/toolRegistry.test.js`

(Falls die Storage-Testdatei anders heißt: `npx vitest run` filtert nichts weg — komplette Suite laufen lassen.)

Run: `npx vitest run`
Expected: PASS — die Backup-Abdeckungs-Anti-Drift bleibt grün (ein Key weniger, keine Dangling-Referenz).

Run: `npm run build`
Expected: Build erfolgreich.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/toolRegistry.jsx src/storage/index.js
git commit -m "chore(cleanup): tote Registry-Felder (featured/intro) + SK.missedHintSeen entfernt"
```

---

## Task 7: Kontext & Regeln nachziehen

**Files:**
- Modify: `kontext/architektur.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: architektur.md — Hilfe-Komponente eintragen**

Im Ordnerbaum von `kontext/architektur.md` beim `features/`-Block eine Zeile für die Settings-Sub-View ergänzen (bei den anderen `settings/`-Einträgen; falls kein settings-Block existiert, unter `features/` einfügen):

```
    settings/
      Hilfe/          Hilfe.jsx + .module.css  — Sub-View „Wie funktioniert die App?": Kern-Karten (Prosa) + Tool-Liste generiert aus TOOL_REGISTRY. Kein Onboarding, kein Storage-Key.
```

Falls im Baum noch ein Eintrag zu `AppBriefing`/`AppOnboarding` steht: entfernen (die Komponente `components/`-Liste in architektur.md listet sie aktuell **nicht** — dann nichts zu löschen).

- [ ] **Step 2: CLAUDE.md — Anti-Drift-Regel für Hilfe-Karten**

In `CLAUDE.md` unter „Prinzipien" → „Anti-Drift" (nach dem bestehenden Absatz) ergänzen:

```markdown

**Hilfe-Sheet statt Tour:** Es gibt kein aktives Onboarding — Erklärung wohnt im Layout (Empty-States, Untertitel) + im Hilfe-Sheet (`src/features/settings/Hilfe/`). Die Tool-Liste dort generiert sich aus `TOOL_REGISTRY` (Guard: `toolRegistry.test.js` verlangt `description` je Tool). Neue **Kern-Mechanik** (Pool/Zeitplan/Kalender/+/Pause-artig) → im selben Change eine Hilfe-Karte ergänzen oder anpassen. In Feature-Specs nie „wird im Onboarding erklärt" schreiben.
```

- [ ] **Step 3: Commit**

```bash
git add kontext/architektur.md CLAUDE.md
git commit -m "docs: Hilfe-Sheet in Architektur + Anti-Drift-Regel (keine Tour mehr)"
```

---

## Task 8: Preview-Verifikation (Erfolgskriterium)

Kein Commit — reine Verifikation am laufenden Dev-Server. Bei Fehlern: Quelle fixen, betroffene Task-Schritte wiederholen.

- [ ] **Step 1: Dev-Server starten** (preview_start) und frisches Profil simulieren

Im Preview per `preview_eval` localStorage leeren und neu laden:

```js
localStorage.clear(); window.location.reload()
```

- [ ] **Step 2: Direkt-Start prüfen**

Erwartung (preview_snapshot): App zeigt sofort den Tagesplaner. **Kein** Overlay, **kein** Willkommens-Screen, nichts zu überspringen.

- [ ] **Step 3: Erstnutzer-Empty-State im Pool**

Erwartung: Pool zeigt „Über + legst du deine erste Aufgabe an." (nicht „Alle Todos verplant ✓").

- [ ] **Step 4: Hilfe-Sheet öffnen**

Einstellungen-Tab → Karte „Hilfe" → „Wie funktioniert die App?" tippen (preview_click).
Erwartung (preview_snapshot): Sub-View mit Kern-Karten + Tool-Liste. **Alle 16 Registry-Tools** gelistet (Name + Beschreibung, farbiges Icon). „‹ Zurück" schließt wieder zur Einstellungen-Seite.

- [ ] **Step 5: Tools-Untertitel**

Tools-Tab → „+ Alle Tools" öffnen.
Erwartung: Zeile „Aus = taucht nirgends auf. An = in die App integriert." über der Liste.

- [ ] **Step 6: MissedReview-Beruhigungszeile** (falls ohne echte Daten schwer auslösbar: Code-Review genügt)

Erwartung: Im Modal-Kopf steht dauerhaft „Nichts geht verloren — entscheide in Ruhe.".

- [ ] **Step 7: Light Mode Stichprobe**

preview_resize colorScheme: 'light' → Hilfe-Sheet + Pool-Empty-State bleiben lesbar (Text-Kontrast ok).

- [ ] **Step 8: Konsolen-Check**

preview_console_logs (level error): keine Fehler.

- [ ] **Step 9: Screenshot als Nachweis**

preview_screenshot vom offenen Hilfe-Sheet für Jonas.

---

## Self-Review (vom Autor durchgeführt)

**Spec-Abdeckung:**
- Baustein 1 (Empty-States/Untertitel/MissedReview-Untertitel) → Task 5 ✓
- Baustein 2 (Hilfe-Sheet, 7 Karten, Registry-Liste) → Task 2 (Bau) + Task 3 (Verdrahtung). Karten 1–5 = CARDS, Karte 6 = Tools-Section, Karte 7 = DATA_CARD ✓
- Auto-Update (Registry-Generierung + Guard) → Task 1 (Guard) + Task 2 (Generierung) ✓
- Storage (missedHintSeen raus, onboardingSeen/appBriefingSeen LEGACY) → Task 6 ✓
- Löschungen (AppBriefing, AppOnboarding, Store-Feld, data-onboarding) → Task 4 ✓
- Tests (Registry-Guard erweitert, alte Suiten gelöscht) → Task 1 + Task 4 ✓
- Docs (architektur.md, CLAUDE.md) → Task 7 ✓
- `featured`/`intro`-Verwaisung → zur Plan-Zeit per Grep bestätigt, Task 6 ✓

**Platzhalter-Scan:** keine TBD/TODO; jeder Code-Schritt zeigt vollständigen Code.

**Typ-/Namens-Konsistenz:** `helpOpen`/`setHelpOpen` konsistent in Task 3. `onBack`-Prop konsistent zwischen Hilfe.jsx (Task 2) und TabSettings-Aufruf (Task 3). `.allToolsHint`/`.reassure` konsistent zwischen JSX und CSS (Task 5). `TOOL_REGISTRY`/`ToolIcon` Importpfad `../../tools/toolRegistry.jsx` von `features/settings/Hilfe/` aus korrekt.

**Offener Prüfpunkt für den Executor:** Zeilennummern sind Momentaufnahmen — vor jedem Edit den zitierten Kontext-Text als Anker nutzen, nicht blind die Zeilennummer.
```
