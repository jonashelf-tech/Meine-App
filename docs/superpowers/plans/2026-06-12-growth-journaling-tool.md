# Growth-Tool (Journaling) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das bestehende Wachstum-Tool wird durch das neue Tool **„Growth"** ersetzt: tägliche Reflexionskarte (250 Karten, 6 Kategorien), Freitext-Journal, geteilter Daily-State (Schlaf/Energie/Stimmung) mit dem Kognitiv-Modul, Opener-Ritual, Archiv mit Nachtrag, KI-Export.

**Architecture:** Standalone-Tool nach Projektmuster (Registry-Eintrag mit lazy Component, eigener Datenlayer `growthStore.js` über `sv/lv/SK`, pure Funktionen + dünne Storage-Wrapper). Neuer zentraler Daily-State-Store (`src/features/daily/dailyState.js`), Kognitiv spiegelt Schlaf/Energie dort hinein. Karten-Ziehung ist persistiert-deterministisch (gezogene Karte pro Datum gespeichert). Garten-XP wird vom alten Wachstum auf Growth umgestellt (Legacy-Habit-Checks bleiben eingefroren zählbar).

**Tech Stack:** React 19 · Vite · Zustand · CSS Modules · Vitest

**Spec-Quelle:** `Dateien/input/prompt-growth-journaling-modul.md` (Abschnitt 6 = kompletter Karten-Content — NIE umformulieren, exakt übernehmen)

---

## Vom User entschiedene Punkte (2026-06-12, Jonas)

1. **Wachstum wird komplett ersetzt.** Tool `wachstum` (Habits + Mini-Journal) fliegt raus, `growth` übernimmt Tab 18. Habits-Feature entfällt ersatzlos (bewusst entschieden).
2. **Kognitiv bleibt unverändert** (UI). Check-in schreibt Schlaf/Energie zusätzlich in den zentralen Daily-State. Stimmung wird nur in Growth erfasst.
3. **Skip zieht sofort eine Ersatzkarte** für heute; die geskippte Karte ist als Tageskarte für morgen vorgemerkt.
4. **Name „Growth", ID `growth`**, Storage-Key `adhs_growth_v1`.

## Festgelegte Annahmen (im Plan getroffen — bei Abnahme prüfen)

- **A1 — Alte Journal-Einträge werden migriert:** `SK.wachstum.journal` → Growth-Freitext (lazy, einmalig, nur wenn der Zieltag noch keinen Freitext hat). `SK.wachstum` bleibt als Legacy-Key im Backup (Muster: `SK.erfolge`), wird NICHT gelöscht.
- **A2 — Dot-Semantik:** Ein State-Check zählt nur dann für den Growth-Dot, wenn er **im Growth-Tool** passierte (`stateTouched`-Flag am Tageseintrag). Ein reiner Kognitiv-Check-in erzeugt keinen Growth-Dot.
- **A3 — Timer-Rückkehr:** `timerAutoStart` bekommt optionales Feld `returnTab`. TabTimer navigiert nach Ablauf dorthin zurück (statt Erledigt-Dialog). Growth merkt sich `timerKarteId` am Tag und öffnet beim nächsten Mount das Antwortfeld.
- **A4 — 60-Tage-Sperre wirkt in beide Richtungen** (|Abstand| < Sperrfrist), damit Nachtrag-Ziehungen keine Karte doppeln, die heute schon gezogen wurde.
- **A5 — Opener:** inline-Karte (kein Fullscreen-Overlay), Rotation deterministisch per Tagesnummer `% 4`, gilt als „gezeigt" sobald gerendert (strikt „erstes Öffnen des Tages").
- **A6 — Nachtrag (≤3 Tage):** voll editierbar (Karte ziehen/beantworten, Freitext, State) — aber **kein Skip** und **keine Bonuskarten** (Skip-Queue für Vergangenheitstage ergäbe Unsinn).
- **A7 — Garten:** `journalTag`-XP zählt künftig Growth-Eintragstage (durch A1 lückenlos), `habitCheck`-XP liest die eingefrorenen Legacy-Checks direkt aus `SK.wachstum`.
- **A8 — Dashboard-Section** erscheint auch vor dem ersten Briefing (nudged ins Onboarding); verschwindet sobald Karte 1 beantwortet/erledigt ist.
- **A9 — `SK.dailyState` gehört in keine TOOL_RESETS-Liste** (geteilt zwischen Kognitiv und Growth, Muster „Klären/Projekte teilen Daten → nicht resetten").

---

## Dateistruktur

**Neu:**
```
src/features/daily/dailyState.js              — zentraler Tages-Store (Schlaf/Energie/Stimmung)
src/features/daily/dailyState.test.js
src/features/tools/growth/growthContent.json  — 6 Kategorien, 4 Opener, 250 Karten (aus Spec §6)
src/features/tools/growth/growthContent.test.js — Guard: Zahlen/IDs/Typen/Timer exakt
src/features/tools/growth/growthStore.js      — Datenlayer: laden/speichern, Ziehlogik, Schwelle, KI-Prompt, Migration
src/features/tools/growth/growthStore.test.js
src/features/tools/growth/useAutosave.js      — Debounce-Autosave-Hook (Freitext + Antworten)
src/features/tools/growth/TabGrowth.jsx|.module.css        — Hauptscreen + Navigation
src/features/tools/growth/DailyStateRow.jsx|.module.css    — Schlaf/Energie/Stimmung-Zeile
src/features/tools/growth/TageskarteCard.jsx|.module.css   — Karte (frage/aufgabe/timer), Warum, Skip
src/features/tools/growth/GrowthOpener.jsx|.module.css     — 4 Ankommens-Varianten
src/features/tools/growth/GrowthArchiv.jsx|.module.css     — Swipe-Leiste + KI-Export-Bereich
src/features/tools/growth/GrowthBriefing.jsx|.module.css   — First-Open (4 Screens, Pflicht-Kategorien)
src/features/tools/growth/GrowthSettings.jsx|.module.css   — Tool-Einstellungen
src/features/tools/growth/GrowthSection.jsx|.module.css    — Tagesplaner-Dashboard („Karte offen")
```

**Geändert:** `storage/index.js` · `store/index.js` · `toolRegistry.jsx` · `toolReset.js` · `utils/index.js` · `TabHeute.jsx` · `DayPanel.jsx` · `kalenderShared.js` · `TabKalender.jsx` · `MonatView.jsx` · `WocheView.jsx` · `kognitiv/checkinStore.js` · `kognitiv/CheckinModal.jsx` · `timer/TabTimer.jsx` · `garten/gartenData.js` · `garten/gartenData.test.js` · `kontext/*.md`

**Gelöscht:** `src/features/tools/wachstum/` (kompletter Ordner, in Task 5 — erst nachdem Garten/TabHeute/DayPanel umgehängt sind)

---

### Task 1: Content-JSON + Guard-Test

**Files:**
- Create: `src/features/tools/growth/growthContent.json`
- Create: `src/features/tools/growth/growthContent.test.js`

- [ ] **Step 1.1: growthContent.json anlegen**

Quelle: `Dateien/input/prompt-growth-journaling-modul.md` Abschnitt 6 (Zeilen 148–426). Zeilenformat dort: `id | typ | text | warum (optional) | timer (optional, Minuten)`.

**Parsing-Regel für das 4. Feld:** Ist es rein numerisch → es ist `timer` (kein `warum`). 5 Felder → Feld 4 = `warum`, Feld 5 = `timer`. Betroffen (4 Felder, numerisch): MK44, DB17, DB33, IR30, IR42. Mit 5 Feldern: MT28, MK06, MK24, IR11.

Struktur (Texte EXAKT aus der Spec übernehmen — Typografie wie „…", ·, — beibehalten; hier nur die ersten Einträge als Schema-Beispiel, ALLE 250 Karten gehören hinein):

```json
{
  "kategorien": [
    { "id": "mein-tag",   "name": "Mein Tag",    "untertitel": "Kurzer Rückblick, kleine Wins, Dankbarkeit", "default": true },
    { "id": "mein-kopf",  "name": "Mein Kopf",   "untertitel": "Fokus, Reize, Energie, Selbstmitgefühl",     "default": true },
    { "id": "dranbleiben","name": "Dranbleiben", "untertitel": "Gewohnheiten & Ziele, kleine Schritte",      "default": false },
    { "id": "innere-ruhe","name": "Innere Ruhe", "untertitel": "Gelassenheit, Präsenz, Nein sagen",          "default": false },
    { "id": "geld",       "name": "Geld",        "untertitel": "Bewusster Umgang, Mindset, Klarheit",        "default": false },
    { "id": "menschen",   "name": "Menschen",    "untertitel": "Beziehungen, Wertschätzung, Gespräche",      "default": false }
  ],
  "opener": [
    { "id": "atmen",     "titel": "Atmen",      "anleitung": "4 Sekunden ein, 6 Sekunden aus", "zyklen": 5 },
    { "id": "sinne",     "titel": "5 Sinne",    "anleitung": "Nimm wahr: 3 Dinge, die du siehst · 2, die du hörst · 1, das du spürst." },
    { "id": "loslassen", "titel": "Loslassen",  "anleitung": "Schultern hochziehen, 3 Sekunden halten, fallen lassen. 3×." },
    { "id": "atemzuege", "titel": "3 Atemzüge", "anleitung": "Nur drei tiefe Atemzüge. Mehr nicht." }
  ],
  "karten": [
    { "id": "MT01", "kategorie": "mein-tag", "typ": "frage", "text": "Was war heute dein Win — egal wie klein?" },
    { "id": "MT02", "kategorie": "mein-tag", "typ": "frage", "text": "Nenne 3 Dinge, für die du heute dankbar bist. 3 Stichworte reichen.", "warum": "Die „3 gute Dinge\"-Übung aus der Positiven Psychologie hebt nachweislich über Wochen die Grundstimmung — gerade weil sie so klein ist." },
    { "id": "MT28", "kategorie": "mein-tag", "typ": "timer-aufgabe", "text": "Nimm dir 5 Minuten und schreib einfach drauflos, was heute war. Unsortiert.", "warum": "Freies Schreiben verarbeitet Emotionen besser als strukturierte Fragen — ab und zu braucht der Kopf genau das.", "timer": 5 }
  ]
}
```

- [ ] **Step 1.2: Guard-Test schreiben**

```js
// src/features/tools/growth/growthContent.test.js
// Anti-Drift: Der Karten-Content ist eine exakte Übernahme der Spezifikation.
// Wer hier Karten ändert/löscht, soll es bewusst tun — der Test friert Zählung,
// IDs, Typen und Timer-Werte ein.
import { describe, it, expect } from 'vitest'
import content from './growthContent.json'

const EXPECTED_COUNTS = {
  'mein-tag': 40, 'mein-kopf': 50, 'dranbleiben': 45,
  'innere-ruhe': 45, 'geld': 35, 'menschen': 35,
}
const PREFIX_BY_KATEGORIE = {
  'mein-tag': 'MT', 'mein-kopf': 'MK', 'dranbleiben': 'DB',
  'innere-ruhe': 'IR', 'geld': 'GE', 'menschen': 'ME',
}
const EXPECTED_TIMER = {
  MT28: 5, MK06: 5, MK24: 10, MK44: 2, DB17: 10, DB33: 10, IR11: 2, IR30: 2, IR42: 10,
}

describe('growthContent — Struktur', () => {
  it('hat 6 Kategorien mit korrekten Defaults', () => {
    expect(content.kategorien).toHaveLength(6)
    const on = content.kategorien.filter(k => k.default).map(k => k.id).sort()
    expect(on).toEqual(['mein-kopf', 'mein-tag'])
  })
  it('hat 4 Opener', () => {
    expect(content.opener.map(o => o.id)).toEqual(['atmen', 'sinne', 'loslassen', 'atemzuege'])
  })
  it('hat exakt 250 Karten, korrekt pro Kategorie verteilt', () => {
    expect(content.karten).toHaveLength(250)
    Object.entries(EXPECTED_COUNTS).forEach(([kat, n]) =>
      expect(content.karten.filter(k => k.kategorie === kat)).toHaveLength(n))
  })
  it('IDs sind eindeutig und passen zum Kategorie-Präfix', () => {
    const ids = content.karten.map(k => k.id)
    expect(new Set(ids).size).toBe(250)
    content.karten.forEach(k =>
      expect(k.id.startsWith(PREFIX_BY_KATEGORIE[k.kategorie])).toBe(true))
  })
  it('Typen sind gültig; genau die 9 Timer-Karten tragen die richtigen Minuten', () => {
    content.karten.forEach(k =>
      expect(['frage', 'aufgabe', 'timer-aufgabe']).toContain(k.typ))
    const timerKarten = content.karten.filter(k => k.typ === 'timer-aufgabe')
    expect(Object.fromEntries(timerKarten.map(k => [k.id, k.timer]))).toEqual(EXPECTED_TIMER)
    content.karten.filter(k => k.typ !== 'timer-aufgabe').forEach(k =>
      expect(k.timer).toBeUndefined())
  })
  it('Stichprobe: Texte exakt wie in der Spezifikation', () => {
    const byId = Object.fromEntries(content.karten.map(k => [k.id, k]))
    expect(byId.MT01.text).toBe('Was war heute dein Win — egal wie klein?')
    expect(byId.MK44.text).toBe('2 Minuten: Räume nur die Fläche direkt vor dir frei. Nicht mehr.')
    expect(byId.MK44.warum).toBeUndefined()
    expect(byId.ME35.text).toBe('Schreibe 3 Dinge, die du an deiner liebsten Person liebst — und teile heute eines davon mit ihr.')
  })
})
```

- [ ] **Step 1.3: Test laufen lassen**

Run: `npx vitest run src/features/tools/growth/growthContent.test.js`
Expected: PASS (alle 6 Tests). Schlägt die Verteilung fehl → Übernahmefehler in der JSON suchen, NICHT den Test anpassen.

- [ ] **Step 1.4: Commit**

```bash
git add src/features/tools/growth/growthContent.json src/features/tools/growth/growthContent.test.js
git commit -m "feat(growth): Karten-Content (250 Karten, 6 Kategorien, 4 Opener) + Guard-Test"
```

---

### Task 2: Zentraler Daily-State-Store

**Files:**
- Create: `src/features/daily/dailyState.js`
- Create: `src/features/daily/dailyState.test.js`
- Modify: `src/storage/index.js` (SK + BACKUP_CATS)

- [ ] **Step 2.1: Storage-Keys ergänzen**

In `src/storage/index.js` im `SK`-Objekt nach `wachstum:`-Zeile ergänzen (Kommentar an `wachstum` anpassen):

```js
  wachstum:        `${PREFIX}wachstum_v1`,     // LEGACY (altes Wachstum-Tool; Habits eingefroren, Journal → growth migriert)
  growth:          `${PREFIX}growth_v1`,
  dailyState:      `${PREFIX}daily_state_v1`,
```

In `BACKUP_CATS.tools` die Zeile `SK.wachstum, SK.garten,` ersetzen durch:

```js
    SK.wachstum, SK.garten, SK.growth, SK.dailyState,
```

- [ ] **Step 2.2: Failing Test schreiben**

```js
// src/features/daily/dailyState.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { sv, lv, SK } from '../../storage'
import { seedFromCheckins, loadDailyStates, getDayState, setDayState } from './dailyState'

beforeEach(() => localStorage.clear())

describe('seedFromCheckins — Einmal-Migration aus Kognitiv', () => {
  it('übernimmt Schlaf/Energie, Stimmung bleibt leer', () => {
    const checkins = {
      '2026-06-01': { sleep: 4, energy: 2, medi: null, note: 'x' },
      '2026-06-02': { sleep: null, energy: null },
    }
    expect(seedFromCheckins(checkins)).toEqual({
      '2026-06-01': { sleep: 4, energy: 2, mood: null },
    })
  })
  it('leeres Archiv → leerer Store', () => {
    expect(seedFromCheckins({})).toEqual({})
    expect(seedFromCheckins(null)).toEqual({})
  })
})

describe('loadDailyStates — lazy Seed nur beim allerersten Laden', () => {
  it('seedet aus kognitivCheckin wenn Key fehlt, danach nie wieder', () => {
    sv(SK.kognitivCheckin, { '2026-06-01': { sleep: 3, energy: 5 } })
    expect(loadDailyStates()['2026-06-01']).toEqual({ sleep: 3, energy: 5, mood: null })
    // Key existiert jetzt — späterer Checkin-Eintrag wird NICHT erneut geseedet
    sv(SK.kognitivCheckin, { '2026-06-09': { sleep: 1, energy: 1 } })
    expect(loadDailyStates()['2026-06-09']).toBeUndefined()
  })
  it('leerer Seed schreibt trotzdem den Key (Marker)', () => {
    loadDailyStates()
    expect(lv(SK.dailyState, null)).toEqual({})
  })
})

describe('getDayState / setDayState', () => {
  it('setDayState merged Felder pro Tag', () => {
    setDayState('2026-06-12', { sleep: 4 })
    setDayState('2026-06-12', { mood: 2 })
    expect(getDayState('2026-06-12')).toEqual({ sleep: 4, energy: null, mood: 2 })
  })
  it('unbekannter Tag → null', () => {
    expect(getDayState('2099-01-01')).toBeNull()
  })
})
```

- [ ] **Step 2.3: Test ausführen — muss fehlschlagen**

Run: `npx vitest run src/features/daily/dailyState.test.js`
Expected: FAIL („Failed to resolve import ... dailyState")

- [ ] **Step 2.4: Implementierung**

```js
// src/features/daily/dailyState.js
// Zentraler Tages-Store für Schlaf / Energie / Stimmung (je 1–5 oder null).
// Geteilt: Kognitiv spiegelt Schlaf/Energie beim Check-in hierher, Growth
// liest/schreibt alle drei Werte. Keine Doppelerfassung — wer zuerst erfasst,
// dessen Werte sieht das andere Modul.
// Einmalige Seed-Migration: beim allerersten Laden wird das bestehende
// Kognitiv-Check-in-Archiv (Schlaf/Energie) übernommen.
import { sv, lv, SK } from '../../storage'

export function seedFromCheckins(checkins) {
  const out = {}
  Object.entries(checkins ?? {}).forEach(([date, c]) => {
    if (c?.sleep == null && c?.energy == null) return
    out[date] = { sleep: c.sleep ?? null, energy: c.energy ?? null, mood: null }
  })
  return out
}

export function loadDailyStates() {
  const existing = lv(SK.dailyState, null)
  if (existing !== null) return existing
  const seeded = seedFromCheckins(lv(SK.kognitivCheckin, {}))
  sv(SK.dailyState, seeded) // Key-Existenz = Migrations-Marker
  return seeded
}

export function getDayState(date) {
  return loadDailyStates()[date] ?? null
}

export function setDayState(date, patch) {
  const all = loadDailyStates()
  const next = {
    ...all,
    [date]: { sleep: null, energy: null, mood: null, ...(all[date] ?? {}), ...patch },
  }
  sv(SK.dailyState, next)
  return next[date]
}
```

- [ ] **Step 2.5: Tests grün?**

Run: `npx vitest run src/features/daily/dailyState.test.js src/storage/storage.test.js`
Expected: PASS — auch der Backup-Anti-Drift-Test (neue Keys sind in BACKUP_CATS.tools).

- [ ] **Step 2.6: Commit**

```bash
git add src/features/daily src/storage/index.js
git commit -m "feat(daily): zentraler Daily-State-Store (Schlaf/Energie/Stimmung) + Seed aus Kognitiv-Check-ins"
```

---

### Task 3: Kognitiv-Anbindung (Spiegeln + Prefill)

**Files:**
- Modify: `src/features/tools/kognitiv/checkinStore.js`
- Modify: `src/features/tools/kognitiv/CheckinModal.jsx:75-79`

- [ ] **Step 3.1: saveCheckin spiegelt in den zentralen Store**

In `checkinStore.js` Import ergänzen und `saveCheckin` erweitern:

```js
import { setDayState } from '../../daily/dailyState'
```

In `saveCheckin` nach der `sv(SK.kognitivCheckin, ...)`-Zeile:

```js
  // Schlaf/Energie zusätzlich in den zentralen Tages-Store spiegeln (geteilt mit Growth)
  setDayState(date, { sleep: entry.sleep, energy: entry.energy })
```

- [ ] **Step 3.2: CheckinModal prefill aus dem zentralen Store**

In `CheckinModal.jsx` Imports ergänzen:

```js
import { getDayState } from '../../daily/dailyState'
import { todayKey } from '../../../utils'
```

Die State-Initialisierung (Zeilen 76–79) ersetzen:

```js
  const last  = getLastCheckin()
  // Heute schon erfasst (z.B. in Growth) → Werte vorbelegen, keine Doppelerfassung
  const heute = getDayState(todayKey())

  const [sleep,    setSleep]    = useState(heute?.sleep  ?? last?.sleep           ?? 3)
  const [energy,   setEnergy]   = useState(heute?.energy ?? last?.energy          ?? 3)
```

(`mediName`/`mediDos`/`mediTime`/`note`-Zeilen unverändert lassen.)

- [ ] **Step 3.3: Verifizieren**

Run: `npx vitest run && npx eslint src/features/tools/kognitiv src/features/daily`
Expected: alle Tests PASS, 0 Lint-Fehler.

- [ ] **Step 3.4: Commit**

```bash
git add src/features/tools/kognitiv/checkinStore.js src/features/tools/kognitiv/CheckinModal.jsx
git commit -m "feat(kognitiv): Check-in spiegelt Schlaf/Energie in zentralen Daily-State + Prefill daraus"
```

---

### Task 4: growthStore — Datenlayer + Ziehlogik (TDD)

**Files:**
- Create: `src/features/tools/growth/growthStore.js`
- Create: `src/features/tools/growth/growthStore.test.js`

- [ ] **Step 4.1: Failing Tests schreiben**

```js
// src/features/tools/growth/growthStore.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { sv, lv, SK } from '../../../storage'
import content from './growthContent.json'
import {
  loadGrowth, saveGrowth, emptyDay, migrateWachstumJournal,
  collectLockedIds, drawKarteId, ensureDayCard, skipKarte, drawBonusKarte,
  setAntwort, setFreitext, markStateTouched,
  dayHasEntry, getDoneDates, isTageskarteOffen, isEditable, nextDate,
  buildKiPrompt, karteById, MAX_KARTEN_PRO_TAG,
} from './growthStore'

beforeEach(() => localStorage.clear())

// Hilfen: deterministische RNG + Settings mit allen Kategorien
const rng0 = () => 0
const allCats = { aktiveKategorien: content.kategorien.map(k => k.id), openerAn: true, kiExportAn: false, briefingGesehen: true }
const base = () => ({ ...loadGrowth(), settings: { ...loadGrowth().settings, ...allCats } })

describe('Migration — altes Wachstum-Journal → Freitext', () => {
  it('übernimmt Journal-Texte in leere Tage, überschreibt nichts', () => {
    const data = {
      days: { '2026-06-01': { ...emptyDay(), freitext: 'schon da' } },
      queuedCard: null, openerShownFor: null,
      settings: allCats, wachstumJournalMigriert: false,
    }
    const legacy = { habits: [], checks: {}, journal: { '2026-06-01': 'alt1', '2026-06-02': 'alt2' } }
    const out = migrateWachstumJournal(data, legacy)
    expect(out.days['2026-06-01'].freitext).toBe('schon da')
    expect(out.days['2026-06-02'].freitext).toBe('alt2')
    expect(out.wachstumJournalMigriert).toBe(true)
  })
  it('loadGrowth migriert lazy genau einmal', () => {
    sv(SK.wachstum, { habits: [], checks: {}, journal: { '2026-05-30': 'hallo' } })
    expect(loadGrowth().days['2026-05-30'].freitext).toBe('hallo')
    // Marker gesetzt → Ändern des Legacy-Keys hat keine Wirkung mehr
    sv(SK.wachstum, { habits: [], checks: {}, journal: { '2026-05-31': 'neu' } })
    expect(loadGrowth().days['2026-05-31']).toBeUndefined()
  })
})

describe('Ziehlogik', () => {
  it('ensureDayCard zieht deterministisch: zweiter Aufruf ändert nichts', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const id1 = data.days['2026-06-12'].tageskarteId
    expect(id1).toBeTruthy()
    const again = ensureDayCard(data, '2026-06-12', () => 0.99)
    expect(again).toBe(data) // No-op: identische Referenz
  })
  it('60-Tage-Sperre: gezogene Karte ist im Fenster nicht erneut ziehbar', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const id = data.days['2026-06-12'].tageskarteId
    const locked = collectLockedIds(data.days, '2026-06-13', 60)
    expect(locked.has(id)).toBe(true)
    expect(collectLockedIds(data.days, '2026-09-20', 60).has(id)).toBe(false)
  })
  it('Sperre wirkt auch rückwärts (Nachtrag dupliziert nicht heute)', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const id = data.days['2026-06-12'].tageskarteId
    expect(collectLockedIds(data.days, '2026-06-10', 60).has(id)).toBe(true)
  })
  it('erschöpfter Pool: Sperrfrist halbiert sich statt Fehler', () => {
    // Nur Kategorie "geld" (35 Karten) aktiv; 35 Tage lang je 1 Karte ziehen
    let data = { ...base(), settings: { ...allCats, aktiveKategorien: ['geld'] } }
    for (let i = 0; i < 35; i++) {
      const d = new Date('2026-01-01T12:00:00'); d.setDate(d.getDate() + i)
      data = ensureDayCard(data, d.toISOString().slice(0, 10), rng0)
    }
    const drawn = new Set(Object.values(data.days).map(x => x.tageskarteId))
    expect(drawn.size).toBe(35) // keine Wiederholung solange Pool reicht
    // Tag 36: Pool leer bei 60 Tagen Sperre → Halbierung greift, es WIRD gezogen
    data = ensureDayCard(data, '2026-02-05', rng0)
    expect(data.days['2026-02-05'].tageskarteId).toBeTruthy()
  })
  it('Kategorien sind gleichgewichtet: erst Kategorie, dann Karte', () => {
    // rng liefert erst 0.99 (letzte Kategorie), dann 0 (erste Karte daraus)
    const seq = [0.99, 0]; let i = 0
    const rngSeq = () => seq[Math.min(i++, seq.length - 1)]
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rngSeq)
    const karte = karteById(data.days['2026-06-12'].tageskarteId)
    expect(karte.kategorie).toBe('menschen') // letzte der 6 Kategorien
  })
})

describe('Skip', () => {
  it('zieht sofort Ersatz, merkt Karte für morgen vor, nur 1×/Tag', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const skipped = data.days['2026-06-12'].tageskarteId
    data = skipKarte(data, '2026-06-12', rng0)
    const day = data.days['2026-06-12']
    expect(day.skipVerwendet).toBe(true)
    expect(day.tageskarteId).not.toBe(skipped)
    expect(day.karten.some(k => k.kartenId === skipped)).toBe(false)
    expect(data.queuedCard).toEqual({ date: '2026-06-13', kartenId: skipped })
    // zweiter Skip wirkungslos
    expect(skipKarte(data, '2026-06-12', rng0)).toBe(data)
  })
  it('vorgemerkte Karte überschreibt die Zufallsziehung des Folgetags', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const skipped = data.days['2026-06-12'].tageskarteId
    data = skipKarte(data, '2026-06-12', rng0)
    data = ensureDayCard(data, '2026-06-13', () => 0.5)
    expect(data.days['2026-06-13'].tageskarteId).toBe(skipped)
    expect(data.queuedCard).toBeNull()
  })
})

describe('Bonuskarten', () => {
  it('max 3 Karten/Tag gesamt', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    data = drawBonusKarte(data, '2026-06-12', rng0)
    data = drawBonusKarte(data, '2026-06-12', rng0)
    expect(data.days['2026-06-12'].karten).toHaveLength(MAX_KARTEN_PRO_TAG)
    const ids = data.days['2026-06-12'].karten.map(k => k.kartenId)
    expect(new Set(ids).size).toBe(3)
    expect(drawBonusKarte(data, '2026-06-12', rng0)).toBe(data)
  })
})

describe('Erfolgs-Schwelle (Dot) + Offen-Logik', () => {
  it('leerer Tag: kein Eintrag, Karte offen', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    expect(dayHasEntry(data.days['2026-06-12'])).toBe(false)
    expect(isTageskarteOffen(data, '2026-06-12')).toBe(true)
  })
  it('1 Zeichen Freitext reicht', () => {
    let data = setFreitext(base(), '2026-06-12', 'x')
    expect(dayHasEntry(data.days['2026-06-12'])).toBe(true)
  })
  it('State-Check im Tool reicht', () => {
    let data = markStateTouched(base(), '2026-06-12')
    expect(dayHasEntry(data.days['2026-06-12'])).toBe(true)
  })
  it('beantwortete Tageskarte schließt die Offen-Anzeige', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    data = setAntwort(data, '2026-06-12', data.days['2026-06-12'].tageskarteId, { antwort: 'ok' })
    expect(isTageskarteOffen(data, '2026-06-12')).toBe(false)
    expect(getDoneDates(data)).toEqual(['2026-06-12'])
  })
  it('beantwortete BONUS-Karte lässt Karte 1 offen', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    data = drawBonusKarte(data, '2026-06-12', rng0)
    const bonusId = data.days['2026-06-12'].karten[1].kartenId
    data = setAntwort(data, '2026-06-12', bonusId, { erledigt: true })
    expect(isTageskarteOffen(data, '2026-06-12')).toBe(true)
  })
})

describe('Nachtrag-Fenster', () => {
  it('heute und bis 3 Tage zurück editierbar, älter nicht, Zukunft nicht', () => {
    expect(isEditable('2026-06-12', '2026-06-12')).toBe(true)
    expect(isEditable('2026-06-09', '2026-06-12')).toBe(true)
    expect(isEditable('2026-06-08', '2026-06-12')).toBe(false)
    expect(isEditable('2026-06-13', '2026-06-12')).toBe(false)
  })
  it('nextDate über Monatsgrenze', () => {
    expect(nextDate('2026-06-30')).toBe('2026-07-01')
  })
})

describe('KI-Export', () => {
  it('baut Prompt nach Template, nur Tage mit Inhalt', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-11', rng0)
    data = setAntwort(data, '2026-06-11', data.days['2026-06-11'].tageskarteId, { antwort: 'meine Antwort' })
    data = setFreitext(data, '2026-06-11', 'freier Text')
    const states = { '2026-06-11': { sleep: 4, energy: 2, mood: 3 } }
    const prompt = buildKiPrompt(data, states, 7, '2026-06-12')
    expect(prompt).toContain('der letzten 7 Tage')
    expect(prompt).toContain('--- EINTRÄGE ---')
    expect(prompt).toContain('2026-06-11')
    expect(prompt).toContain('Schlaf: 4/5')
    expect(prompt).toContain('meine Antwort')
    expect(prompt).toContain('freier Text')
    expect(prompt).not.toContain('2026-06-10') // leerer Tag taucht nicht auf
  })
})
```

- [ ] **Step 4.2: Test ausführen — muss fehlschlagen**

Run: `npx vitest run src/features/tools/growth/growthStore.test.js`
Expected: FAIL (Modul existiert nicht)

- [ ] **Step 4.3: growthStore.js implementieren**

```js
// src/features/tools/growth/growthStore.js
// Datenlayer des Growth-Tools (Journaling mit Tageskarten).
// Cross-Tool-Lesen (Dashboard-Section, Kalender-Dots/DayPanel, Garten-XP)
// läuft über dieses Modul, nie roh über localStorage.
import { sv, lv, SK } from '../../../storage'
import { dateKey, todayKey } from '../../../utils'
import content from './growthContent.json'

export const MAX_KARTEN_PRO_TAG = 3
export const LOCK_TAGE = 60
export const NACHTRAG_TAGE = 3

// Stimmungs-Farben 1–5 — nur Palette-Variablen (vars.css), keine neuen Hex-Werte
export const MOOD_COLORS = ['var(--rose)', 'var(--amber)', 'var(--primary)', 'var(--teal)', 'var(--emerald)']

export const KATEGORIEN = content.kategorien
export const OPENER = content.opener
export const karteById = (id) => content.karten.find(k => k.id === id) ?? null

export function emptyDay() {
  return { tageskarteId: null, skipVerwendet: false, karten: [], freitext: '', stateTouched: false, timerKarteId: null }
}

const DEFAULT_SETTINGS = () => ({
  aktiveKategorien: content.kategorien.filter(k => k.default).map(k => k.id),
  openerAn: true,
  kiExportAn: false,
  briefingGesehen: false,
})

// ─── Laden / Speichern ────────────────────────────────────
export function loadGrowth() {
  const raw = lv(SK.growth, null)
  let data = {
    days: raw?.days ?? {},
    queuedCard: raw?.queuedCard ?? null,
    openerShownFor: raw?.openerShownFor ?? null,
    settings: { ...DEFAULT_SETTINGS(), ...(raw?.settings ?? {}) },
    wachstumJournalMigriert: raw?.wachstumJournalMigriert ?? false,
  }
  if (!data.wachstumJournalMigriert) {
    data = migrateWachstumJournal(data, lv(SK.wachstum, null))
    sv(SK.growth, data)
  }
  return data
}

export function saveGrowth(data) { sv(SK.growth, data) }

// Einmalig: Journal-Texte des alten Wachstum-Tools als Freitext übernehmen.
// Bestehender Freitext gewinnt; Legacy-Key bleibt unangetastet (Backup-Kompat).
export function migrateWachstumJournal(data, legacy) {
  const days = { ...data.days }
  Object.entries(legacy?.journal ?? {}).forEach(([date, text]) => {
    if (!days[date]?.freitext) days[date] = { ...emptyDay(), ...(days[date] ?? {}), freitext: text }
  })
  return { ...data, days, wachstumJournalMigriert: true }
}

// ─── Ziehlogik ────────────────────────────────────────────
// Alle im Sperrfenster um `forDate` gezogenen Karten (Tageskarte + Bonus).
// Fenster wirkt in BEIDE Richtungen, damit Nachtrag-Ziehungen nichts doppeln.
export function collectLockedIds(days, forDate, lockTage) {
  const locked = new Set()
  const ref = new Date(forDate + 'T00:00:00')
  Object.entries(days).forEach(([date, day]) => {
    const diff = Math.abs((ref - new Date(date + 'T00:00:00')) / 86400000)
    if (diff >= lockTage) return
    day.karten?.forEach(k => locked.add(k.kartenId))
    if (day.tageskarteId) locked.add(day.tageskarteId)
  })
  return locked
}

function drawableKarten(days, settings, forDate, lockTage, extraExclude) {
  const locked = collectLockedIds(days, forDate, lockTage)
  return content.karten.filter(k =>
    settings.aktiveKategorien.includes(k.kategorie) &&
    !locked.has(k.id) && !extraExclude.has(k.id))
}

// Gleichgewichtet: erst Kategorie zufällig (unter denen mit ziehbaren Karten),
// dann Karte daraus. Pool leer → Sperrfrist halbieren (60→30→15…) statt Fehler.
export function drawKarteId(data, forDate, rng = Math.random, extraExclude = new Set()) {
  let lockTage = LOCK_TAGE
  let pool = drawableKarten(data.days, data.settings, forDate, lockTage, extraExclude)
  while (pool.length === 0 && lockTage > 0) {
    lockTage = Math.floor(lockTage / 2)
    pool = drawableKarten(data.days, data.settings, forDate, lockTage, extraExclude)
  }
  if (pool.length === 0) return null
  const cats = [...new Set(pool.map(k => k.kategorie))]
  const cat = cats[Math.floor(rng() * cats.length)]
  const inCat = pool.filter(k => k.kategorie === cat)
  return inCat[Math.floor(rng() * inCat.length)].id
}

// Stellt sicher, dass `date` eine gezogene Tageskarte hat (deterministisch via
// Persistenz). Eine vorgemerkte (geskippte) Karte überschreibt die Ziehung.
export function ensureDayCard(data, date, rng = Math.random) {
  if (data.days[date]?.tageskarteId) return data
  let kartenId, queuedCard = data.queuedCard
  if (queuedCard?.date === date) {
    kartenId = queuedCard.kartenId
    queuedCard = null
  } else {
    kartenId = drawKarteId(data, date, rng)
  }
  if (!kartenId) return data
  const prev = data.days[date]
  const day = { ...emptyDay(), ...(prev ?? {}), tageskarteId: kartenId }
  if (!day.karten.some(k => k.kartenId === kartenId)) {
    day.karten = [...day.karten, { kartenId, antwort: '', erledigt: false }]
  }
  return { ...data, days: { ...data.days, [date]: day }, queuedCard }
}

export function nextDate(date) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return dateKey(d)
}

// Skip: genau 1×/Tag. Geskippte Karte → Tageskarte für morgen; sofort Ersatz ziehen.
export function skipKarte(data, date, rng = Math.random) {
  const day = data.days[date]
  if (!day?.tageskarteId || day.skipVerwendet) return data
  const skippedId = day.tageskarteId
  const ersatzId = drawKarteId(data, date, rng, new Set([skippedId]))
  if (!ersatzId) return data
  const karten = day.karten
    .filter(k => k.kartenId !== skippedId)
    .concat({ kartenId: ersatzId, antwort: '', erledigt: false })
  return {
    ...data,
    days: { ...data.days, [date]: { ...day, tageskarteId: ersatzId, skipVerwendet: true, karten } },
    queuedCard: { date: nextDate(date), kartenId: skippedId },
  }
}

// Bonus: max 3 Karten/Tag gesamt. Zählt nie für Dot-/Offen-Logik.
export function drawBonusKarte(data, date, rng = Math.random) {
  const day = data.days[date]
  if (!day || day.karten.length >= MAX_KARTEN_PRO_TAG) return data
  const id = drawKarteId(data, date, rng, new Set(day.karten.map(k => k.kartenId)))
  if (!id) return data
  const karten = [...day.karten, { kartenId: id, antwort: '', erledigt: false }]
  return { ...data, days: { ...data.days, [date]: { ...day, karten } } }
}

// ─── Antworten / Freitext / State ─────────────────────────
export function setAntwort(data, date, kartenId, patch) {
  const day = data.days[date]
  if (!day) return data
  const karten = day.karten.map(k => k.kartenId === kartenId ? { ...k, ...patch } : k)
  return { ...data, days: { ...data.days, [date]: { ...day, karten } } }
}

export function setFreitext(data, date, text) {
  const day = { ...emptyDay(), ...(data.days[date] ?? {}), freitext: text }
  return { ...data, days: { ...data.days, [date]: day } }
}

// State im Growth-Tool erfasst/korrigiert → zählt für die Erfolgs-Schwelle (Dot)
export function markStateTouched(data, date) {
  const day = { ...emptyDay(), ...(data.days[date] ?? {}), stateTouched: true }
  return { ...data, days: { ...data.days, [date]: day } }
}

export function setTimerKarte(data, date, kartenId) {
  const day = data.days[date]
  if (!day) return data
  return { ...data, days: { ...data.days, [date]: { ...day, timerKarteId: kartenId } } }
}

// ─── Erfolgs-Schwelle / Offen-Logik ───────────────────────
// Kleinste Schwelle: State-Check (im Tool) ODER 1 Zeichen Freitext ODER beantwortete Karte.
export function dayHasEntry(day) {
  if (!day) return false
  return day.stateTouched
    || (day.freitext ?? '').length > 0
    || (day.karten ?? []).some(k => (k.antwort ?? '').trim().length > 0 || k.erledigt)
}

export function getDoneDates(data = loadGrowth()) {
  return Object.entries(data.days).filter(([, d]) => dayHasEntry(d)).map(([date]) => date).sort()
}

// Nur Karte 1 zählt als „offen" — Bonuskarten nie.
export function isTageskarteOffen(data, date) {
  const day = data.days[date]
  if (!day?.tageskarteId) return true
  const k1 = day.karten.find(k => k.kartenId === day.tageskarteId)
  return !k1 || (!(k1.antwort ?? '').trim() && !k1.erledigt)
}

export function isEditable(date, today = todayKey()) {
  const diff = (new Date(today + 'T00:00:00') - new Date(date + 'T00:00:00')) / 86400000
  return diff >= 0 && diff <= NACHTRAG_TAGE
}

// ─── Tageszusammenfassung (Kalender-DayPanel) ─────────────
export function getDaySummary(date) {
  const data = loadGrowth()
  const day = data.days[date]
  if (!day || !dayHasEntry(day)) return null
  return {
    freitext: day.freitext ?? '',
    karten: (day.karten ?? [])
      .filter(k => (k.antwort ?? '').trim() || k.erledigt)
      .map(k => ({ ...k, frage: karteById(k.kartenId)?.text ?? '' })),
  }
}

// ─── KI-Export ────────────────────────────────────────────
// Template exakt aus der Spezifikation (§3.7). Keine API, keine Netzwerk-Calls.
export function buildKiPrompt(data, dailyStates, nTage, today = todayKey()) {
  const tage = []
  for (let i = nTage - 1; i >= 0; i--) {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - i)
    const date = dateKey(d)
    const day = data.days[date]
    const state = dailyStates[date]
    if (!dayHasEntry(day) && !state) continue
    const zeilen = [`Datum: ${date}`]
    if (state) {
      const fmt = (v) => v != null ? `${v}/5` : '–'
      zeilen.push(`Stimmung: ${fmt(state.mood)} · Energie: ${fmt(state.energy)} · Schlaf: ${fmt(state.sleep)}`)
    }
    ;(day?.karten ?? []).forEach(k => {
      if (!(k.antwort ?? '').trim() && !k.erledigt) return
      const frage = karteById(k.kartenId)?.text ?? k.kartenId
      zeilen.push(`Karte: ${frage}`)
      if ((k.antwort ?? '').trim()) zeilen.push(`Antwort: ${k.antwort.trim()}`)
      else zeilen.push('Antwort: (als erledigt markiert)')
    })
    if ((day?.freitext ?? '').trim()) zeilen.push(`Freitext: ${day.freitext.trim()}`)
    tage.push(zeilen.join('\n'))
  }
  return `Du bist ein einfühlsamer, ehrlicher Coach. Unten stehen meine Journaling-Einträge der letzten ${nTage} Tage (Stimmung, Energie, beantwortete Reflexionskarten, freie Texte). Werte sie aus:
1. Welche wiederkehrenden Muster siehst du (Stimmung, Energie, Themen)?
2. Was läuft erkennbar gut und sollte beibehalten werden?
3. Welche 2–3 konkreten, kleinen nächsten Schritte empfiehlst du?
Sei direkt und konkret, kein Allgemeinplatz-Coaching. Ich habe ADHS — berücksichtige das bei den Empfehlungen (kleine Schritte, Systeme statt Disziplin).

--- EINTRÄGE ---
${tage.join('\n\n')}`
}
```

- [ ] **Step 4.4: Tests grün?**

Run: `npx vitest run src/features/tools/growth`
Expected: PASS (Content-Guard + Store-Tests)

- [ ] **Step 4.5: Commit**

```bash
git add src/features/tools/growth/growthStore.js src/features/tools/growth/growthStore.test.js
git commit -m "feat(growth): Datenlayer — Ziehlogik (60-Tage-Sperre, Skip-Queue, Bonus), Schwelle, Migration, KI-Prompt"
```

---

### Task 5: Tool-Umzug wachstum → growth (atomar) + TabGrowth-Scaffold

> Dieser Task ist bewusst „groß aber atomar": Nach ihm läuft die App ohne Wachstum-Tool, mit Growth-Scaffold (Header + Freitext + Autosave + Archiv-Platzhalter). Erst hier wird der wachstum-Ordner gelöscht — alle Verweise werden im selben Commit umgehängt.

**Files:**
- Create: `src/features/tools/growth/useAutosave.js`
- Create: `src/features/tools/growth/TabGrowth.jsx`, `TabGrowth.module.css`
- Modify: `src/features/tools/toolRegistry.jsx` (Eintrag + Icon-Key)
- Modify: `src/store/index.js:95` (activeTools-Migration) + neuer Intent `growthOpenDate`
- Modify: `src/features/tools/toolReset.js:18`
- Modify: `src/utils/index.js:104` (DEFAULTS-Farbe)
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx:14,609`
- Modify: `src/features/calendar/TabKalender/DayPanel.jsx` (Wachstum-Karte + Import raus, initialOpen-Key)
- Modify: `src/features/tools/garten/gartenData.js` + `gartenData.test.js`
- Delete: `src/features/tools/wachstum/` (5 Dateien)

- [ ] **Step 5.1: Autosave-Hook**

```js
// src/features/tools/growth/useAutosave.js
// Debounce-Autosave für Textfelder: speichert ab dem ersten Zeichen (400 ms),
// flusht zusätzlich bei App-Hintergrund und Unmount — blur feuert auf mobilen
// PWAs nicht zuverlässig (Muster aus dem alten Wachstum-Tool übernommen).
import { useState, useRef, useEffect } from 'react'

export function useAutosave(initial, onSave, deps = []) {
  const [value, setValue] = useState(initial)
  const valueRef = useRef(value)
  const saveRef = useRef(onSave)
  const timerRef = useRef(null)
  valueRef.current = value
  saveRef.current = onSave

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setValue(initial) }, deps)

  const onChange = (next) => {
    setValue(next)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveRef.current(next), 400)
  }

  useEffect(() => {
    const flush = () => { clearTimeout(timerRef.current); saveRef.current(valueRef.current) }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    return () => { document.removeEventListener('visibilitychange', onHide); flush() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return [value, onChange]
}
```

- [ ] **Step 5.2: TabGrowth-Scaffold**

```jsx
// src/features/tools/growth/TabGrowth.jsx
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { loadGrowth, saveGrowth, ensureDayCard, setFreitext, isEditable } from './growthStore'
import { useAutosave } from './useAutosave'
import s from './TabGrowth.module.css'

export default function TabGrowth({ onBack }) {
  const { toolColors, setBackInterceptor, growthOpenDate, setGrowthOpenDate } = useAppStore()
  const toolColor = getToolColor('growth', toolColors)

  const [data, setData] = useState(() => loadGrowth())
  const [today, setToday] = useState(() => todayKey())
  const [viewDate, setViewDate] = useState(() => useAppStore.getState().growthOpenDate ?? todayKey())
  const [nav, setNav] = useState(null) // null | 'settings'

  const dataRef = useRef(data)
  dataRef.current = data
  const persist = (next) => { if (next !== dataRef.current) { setData(next); saveGrowth(next) } }

  // Intent aus dem Kalender-DayPanel einmalig konsumieren
  useEffect(() => { if (growthOpenDate) setGrowthOpenDate(null) }, [growthOpenDate, setGrowthOpenDate])

  // Tageswechsel bei offener App: beim Sichtbarwerden Datum prüfen (Spec §5)
  useEffect(() => {
    const check = () => {
      const t = todayKey()
      if (t !== today) { setToday(t); setViewDate(v => (v === today ? t : v)) }
    }
    const onVis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', check)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', check) }
  }, [today])

  // Swipe-Back: Settings/Vergangenheit → eine Ebene zurück statt Tool schließen
  useEffect(() => {
    const handler = nav !== null ? () => setNav(null)
      : viewDate !== today ? () => setViewDate(today)
      : null
    setBackInterceptor(handler)
    return () => setBackInterceptor(null)
  }, [nav, viewDate, today, setBackInterceptor])

  const editable = isEditable(viewDate, today)

  // Tageskarte sicherstellen (nur für editierbare Tage; deterministisch via Persistenz)
  useEffect(() => {
    if (!data.settings.briefingGesehen || !editable) return
    persist(ensureDayCard(dataRef.current, viewDate))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate, today, data.settings.briefingGesehen])

  const day = data.days[viewDate]

  // Freitext mit Autosave (ab dem ersten Zeichen)
  const [freitext, onFreitext] = useAutosave(
    day?.freitext ?? '',
    (text) => persist(setFreitext(dataRef.current, viewDate, text)),
    [viewDate],
  )

  const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="growth" size={20} />}
        eyebrow="Tool"
        title="Growth"
        actions={
          <button className={s.settingsBtn} onClick={() => setNav('settings')} aria-label="Einstellungen">
            <SettingsIcon />
          </button>
        }
      />

      {viewDate !== today && (
        <button className={s.backToToday} onClick={() => setViewDate(today)}>
          ← Zurück zu heute
        </button>
      )}

      {/* Freitext — immer sichtbar, jeden Tag, unabhängig von der Karte */}
      <div className={s.section}>
        {editable ? (
          <textarea
            className={s.freitext}
            value={freitext}
            onChange={e => onFreitext(e.target.value)}
            placeholder="Ein Satz reicht."
            rows={3}
          />
        ) : (
          <div className={s.freitextRead}>{day?.freitext || '—'}</div>
        )}
      </div>
    </div>
  )
}
```

```css
/* src/features/tools/growth/TabGrowth.module.css */
.page { display: flex; flex-direction: column; gap: 14px; padding-bottom: 24px; }
.section { display: flex; flex-direction: column; gap: 8px; }
.settingsBtn { width: 36px; height: 36px; border: none; background: none; color: var(--text-dim); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: var(--r-sm); }
.settingsBtn:hover { color: var(--text); }
.backToToday { align-self: flex-start; border: 1px solid var(--border); background: var(--surface); color: var(--text-dim); border-radius: var(--r); padding: 6px 12px; font-size: 0.78rem; cursor: pointer; font-family: var(--font); }
.freitext { width: 100%; min-height: 72px; resize: vertical; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); color: var(--text); padding: 12px; font-size: 0.9rem; font-family: var(--font); }
.freitext:focus { outline: none; border-color: var(--tool-color); }
.freitextRead { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); color: var(--text); padding: 12px; font-size: 0.9rem; white-space: pre-wrap; }
```

- [ ] **Step 5.3: Registry umstellen**

In `toolRegistry.jsx`: ICONS-Key `wachstum:` → `growth:` umbenennen (SVG-Pfad identisch lassen). Den `wachstum`-Eintrag in `TOOL_REGISTRY` ersetzen durch:

```js
  {
    id: 'growth',
    tabId: 18,
    name: 'Growth',
    icon: '🌱',
    color: '#4ADE80',
    description: 'Tägliche Reflexionskarte & Journal — ein Satz reicht',
    standalone: true,
    integrated: true,
    component: lazy(() => import('./growth/TabGrowth')),
  },
```

- [ ] **Step 5.4: Store — activeTools-Migration + Intent**

In `src/store/index.js` Zeile 95 ersetzen:

```js
  activeTools: lv(SK.activeTools, ['geburtstage', 'kognitiv', 'haushalt', 'klaeren'])
    .map(id => id === 'erfolge' ? 'garten' : id === 'wachstum' ? 'growth' : id),
```

Nach dem `calendarDate`-Block (Zeile 83) ergänzen:

```js
  // Growth: Kalender-DayPanel → bestimmten Tag im Tool öffnen (flüchtig)
  growthOpenDate: null,
  setGrowthOpenDate: (dk) => set({ growthOpenDate: dk }),
```

- [ ] **Step 5.5: toolReset + utils**

`toolReset.js` Zeile 18: `wachstum:    { keys: [SK.wachstum] },` ersetzen durch:

```js
  // SK.dailyState gehört bewusst NICHT hierher (geteilt mit Kognitiv).
  // SK.wachstum (Legacy) bleibt erhalten — Garten zählt eingefrorene Habit-Checks daraus.
  growth:      { keys: [SK.growth] },
```

`utils/index.js` Zeile 104: `wachstum:     '#4ADE80',` → `growth:       '#4ADE80',`

- [ ] **Step 5.6: TabHeute umhängen**

In `TabHeute.jsx`: Zeile 14 `import WachstumSection from '../../tools/wachstum/WachstumSection'` ersetzen durch:

```js
import GrowthSection       from '../../tools/growth/GrowthSection'
```

In Zeile 609 im `SECTIONS`-Objekt `wachstum: WachstumSection` → `growth: GrowthSection`.

**GrowthSection minimal anlegen** (voller Ausbau in Task 12, aber Import muss existieren):

```jsx
// src/features/tools/growth/GrowthSection.jsx
import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { loadGrowth, isTageskarteOffen } from './growthStore'
import s from './GrowthSection.module.css'

export default function GrowthSection() {
  const { setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('growth', toolColors)

  // Nur Karte 1 zählt — beantwortet/erledigt → Sektion verschwindet
  const offen = isTageskarteOffen(loadGrowth(), todayKey())
  if (!offen) return null

  return (
    <ToolSection
      toolId="growth"
      title="Growth"
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.growth)}
    >
      <div className={s.row}>
        <span className={s.text}>Heutige Karte offen</span>
        <button className={s.openBtn} onClick={() => setCurrentTab(TOOL_TAB.growth)} aria-label="Öffnen">▶</button>
      </div>
    </ToolSection>
  )
}
```

```css
/* src/features/tools/growth/GrowthSection.module.css */
.row { display: flex; align-items: center; gap: 8px; }
.text { flex: 1; font-size: 0.82rem; color: var(--text-dim); }
.openBtn { width: 30px; height: 30px; border-radius: var(--r-sm); border: 1px solid var(--border); background: none; color: var(--tc); cursor: pointer; font-size: 0.7rem; }
```

- [ ] **Step 5.7: DayPanel — Wachstum-Karte entfernen**

In `DayPanel.jsx`:
- Zeile 6 (`import { getDaySummary as getWachstumDay } ...`) löschen.
- Zeilen 51–53 (`wachstumDay`/`wachstumColor`/`hasWachstum`) löschen.
- Den kompletten Block `{/* Wachstum-Karte */} {hasWachstum && (...)}` (Zeilen ~298–333) löschen.
- In Zeile 37 `initialOpen`-Default: `wachstum: false` → `growth: false`.

(Die neue Growth-Karte kommt in Task 9 — mit Datum-Intent.)

- [ ] **Step 5.8: Garten auf Growth umstellen**

`gartenData.js` — Import ersetzen und Quellen-Funktion einführen:

```js
import { lv, sv, SK } from '../../../storage'
import { todayKey } from '../../../utils'
import { loadGrowth, getDoneDates } from '../growth/growthStore'
```

`computeRawXP`/`todayRawXP` ersetzen (Signatur: `growth` → `quellen`):

```js
// Quellen: habitChecks = eingefrorene Checks des alten Wachstum-Tools (Legacy),
// journalDates = Growth-Eintragstage (inkl. migrierter Alt-Journale).
export function gartenQuellen() {
  const legacy = lv(SK.wachstum, null)
  const habitChecks = Object.values(legacy?.checks ?? {}).reduce((n, a) => n + a.length, 0)
  return { habitChecks, journalDates: getDoneDates(loadGrowth()) }
}

export function computeRawXP(todos, tracking, quellen) {
  return XP_WEIGHTS.todo       * todos.filter(t => t.done).length
       + XP_WEIGHTS.planerTag  * (tracking.tagesplanerDates ?? []).length
       + XP_WEIGHTS.habitCheck * quellen.habitChecks
       + XP_WEIGHTS.journalTag * quellen.journalDates.length
}

export function todayRawXP(todos, tracking, quellen, today) {
  return XP_WEIGHTS.todo       * todos.filter(t => t.done && (t.doneAt ?? '').startsWith(today)).length
       + XP_WEIGHTS.planerTag  * ((tracking.tagesplanerDates ?? []).includes(today) ? 1 : 0)
       + XP_WEIGHTS.journalTag * (quellen.journalDates.includes(today) ? 1 : 0)
}
```

`displayXP`, `todayXP`, `xpBreakdown` auf `gartenQuellen()` umstellen:

```js
export function displayXP(todos) {
  const raw   = computeRawXP(todos, trackingNow(), gartenQuellen())
  const state = loadState()
  if (raw > state.xpFloor) {
    sv(SK.garten, { ...state, xpFloor: raw })
    return raw
  }
  return state.xpFloor
}

export function todayXP(todos) {
  return todayRawXP(todos, trackingNow(), gartenQuellen(), todayKey())
}

export function xpBreakdown(todos) {
  const tracking = trackingNow()
  const quellen  = gartenQuellen()
  const todosDone  = todos.filter(t => t.done).length
  const planerTage = (tracking.tagesplanerDates ?? []).length
  return [
    { id: 'todos',   label: 'Erledigte Todos',    count: todosDone,                   each: XP_WEIGHTS.todo,       xp: todosDone * XP_WEIGHTS.todo },
    { id: 'planer',  label: 'Tagesplaner-Tage',   count: planerTage,                  each: XP_WEIGHTS.planerTag,  xp: planerTage * XP_WEIGHTS.planerTag },
    { id: 'checks',  label: 'Gewohnheits-Checks', count: quellen.habitChecks,         each: XP_WEIGHTS.habitCheck, xp: quellen.habitChecks * XP_WEIGHTS.habitCheck },
    { id: 'journal', label: 'Journal-Tage',       count: quellen.journalDates.length, each: XP_WEIGHTS.journalTag, xp: quellen.journalDates.length * XP_WEIGHTS.journalTag },
  ]
}
```

`gartenData.test.js` anpassen — die beiden `growth`-Parameter-Tests umstellen:

```js
const Q = (habitChecks, journalDates) => ({ habitChecks, journalDates })

describe('computeRawXP — Gewichte', () => {
  it('gewichtet alle vier Quellen korrekt', () => {
    const todos    = [T(true, '2026-06-10T08:00'), T(true, '2026-06-09T08:00'), T(false, null)]
    const tracking = { tagesplanerDates: ['2026-06-08', '2026-06-09', '2026-06-10'] }
    // 2·10 + 3·25 + 3·5 + 1·15 = 125
    expect(computeRawXP(todos, tracking, Q(3, ['2026-06-10']))).toBe(125)
  })
  it('funktioniert ohne Growth-Daten (leere Defaults)', () => {
    expect(computeRawXP([T(true, 'x')], { tagesplanerDates: [] }, Q(0, []))).toBe(XP_WEIGHTS.todo)
  })
})

describe('todayRawXP — zählt nur heutige Beiträge', () => {
  const today = '2026-06-10'
  it('Todos nur mit doneAt von heute', () => {
    const todos = [T(true, '2026-06-10T09:00:00'), T(true, '2026-06-09T09:00:00')]
    expect(todayRawXP(todos, { tagesplanerDates: [] }, Q(0, []), today)).toBe(XP_WEIGHTS.todo)
  })
  it('Planer-Tag + Journal von heute', () => {
    expect(todayRawXP([], { tagesplanerDates: [today] }, Q(0, [today]), today))
      .toBe(XP_WEIGHTS.planerTag + XP_WEIGHTS.journalTag)
  })
})
```

(`EMPTY_GROWTH`-Konstante in der Testdatei löschen; übrige Tests unverändert.)

- [ ] **Step 5.9: wachstum-Ordner löschen**

```bash
git rm -r src/features/tools/wachstum
```

- [ ] **Step 5.10: Volle Verifikation**

Run: `npx vitest run && npx eslint . && npm run build`
Expected: alle Tests PASS, 0 Lint-Fehler, Build OK. Zusätzlich Grep-Check: `grep -ri "wachstum" src/ --include=*.jsx --include=*.js` darf nur noch Treffer in `storage/index.js` (Legacy-Key), `toolReset.js`-Kommentar, `growthStore.js` (Migration) und `gartenData.js` (Legacy-Checks) zeigen.

- [ ] **Step 5.11: Commit**

```bash
git add -A
git commit -m "feat(growth)!: Wachstum-Tool durch Growth ersetzt — Registry/Store/Garten umgehängt, Journal-Migration, Scaffold mit Freitext-Autosave"
```

---

### Task 6: Tagesansicht — DailyStateRow + TageskarteCard

**Files:**
- Create: `src/features/tools/growth/DailyStateRow.jsx`, `DailyStateRow.module.css`
- Create: `src/features/tools/growth/TageskarteCard.jsx`, `TageskarteCard.module.css`
- Modify: `src/features/tools/growth/TabGrowth.jsx`

- [ ] **Step 6.1: DailyStateRow**

```jsx
// src/features/tools/growth/DailyStateRow.jsx
// Schlaf / Energie / Stimmung — zentraler Daily-State, geteilt mit Kognitiv.
// Bereits erfasste Werte werden nur angezeigt (antippbar zum Korrigieren),
// fehlende per 1 Tap erfasst. Alles optional — kein Zwang, kein Gate.
import { useState, useEffect } from 'react'
import { getDayState, setDayState } from '../../daily/dailyState'
import s from './DailyStateRow.module.css'

const FELDER = [
  { key: 'sleep',  label: 'Schlaf' },
  { key: 'energy', label: 'Energie' },
  { key: 'mood',   label: 'Stimmung' },
]

export default function DailyStateRow({ date, editable, onTouched }) {
  const [state, setState] = useState(() => getDayState(date))
  useEffect(() => { setState(getDayState(date)) }, [date])

  const setField = (key, val) => {
    if (!editable) return
    setState(setDayState(date, { [key]: val }))
    onTouched?.()
  }

  return (
    <div className={s.row}>
      {FELDER.map(({ key, label }) => (
        <div key={key} className={s.feld}>
          <span className={s.label}>{label}</span>
          <div className={s.dots}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                className={[s.dot, (state?.[key] ?? 0) >= n ? s.dotOn : ''].join(' ')}
                onClick={() => setField(key, n)}
                disabled={!editable}
                aria-label={`${label} ${n} von 5`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

```css
/* src/features/tools/growth/DailyStateRow.module.css */
.row { display: flex; gap: 10px; }
.feld { flex: 1; display: flex; flex-direction: column; gap: 5px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 8px 10px; }
.label { font-size: 0.66rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; }
.dots { display: flex; gap: 4px; }
.dot { width: 13px; height: 13px; border-radius: 50%; border: 1px solid var(--border); background: none; padding: 0; cursor: pointer; transition: all 0.15s; }
.dot:disabled { cursor: default; }
.dotOn { background: var(--tool-color); border-color: var(--tool-color); }
```

- [ ] **Step 6.2: TageskarteCard**

```jsx
// src/features/tools/growth/TageskarteCard.jsx
// Eine Karte (Tageskarte oder Bonus): frage | aufgabe | timer-aufgabe.
// Antwort autosaved; „Warum?"-Aufklapper nur wenn die Karte ein warum-Feld hat.
import { useState } from 'react'
import { karteById, KATEGORIEN } from './growthStore'
import { useAutosave } from './useAutosave'
import s from './TageskarteCard.module.css'

export default function TageskarteCard({
  eintrag,          // { kartenId, antwort, erledigt }
  date,
  editable,
  istTageskarte,
  skipMoeglich,     // nur heute, nur 1×, nur Tageskarte
  autoOpen,         // Timer-Rückkehr: Antwortfeld direkt öffnen
  onPatch,          // (patch) => void  — { antwort } | { erledigt }
  onSkip,
  onStartTimer,     // (karte) => void
}) {
  const karte = karteById(eintrag.kartenId)
  const [warumOffen, setWarumOffen] = useState(false)
  const [antwortOffen, setAntwortOffen] = useState(
    autoOpen || Boolean((eintrag.antwort ?? '').trim()) || karte?.typ === 'frage'
  )

  const [antwort, onAntwort] = useAutosave(
    eintrag.antwort ?? '',
    (text) => onPatch({ antwort: text }),
    [date, eintrag.kartenId],
  )

  if (!karte) return null
  const kategorie = KATEGORIEN.find(k => k.id === karte.kategorie)

  return (
    <div className={s.card}>
      <div className={s.head}>
        <span className={s.kategorie}>{kategorie?.name}{!istTageskarte && ' · Bonus'}</span>
        {skipMoeglich && (
          <button className={s.skipBtn} onClick={onSkip}>Überspringen</button>
        )}
      </div>

      <div className={s.text}>{karte.text}</div>

      {karte.warum && (
        <div className={s.warumWrap}>
          <button className={s.warumLink} onClick={() => setWarumOffen(v => !v)}>
            Warum diese Frage? {warumOffen ? '▴' : '▾'}
          </button>
          {warumOffen && <div className={s.warumText}>{karte.warum}</div>}
        </div>
      )}

      {karte.typ === 'timer-aufgabe' && editable && !eintrag.erledigt && (
        <button className={s.timerBtn} onClick={() => onStartTimer(karte)}>
          ▶ {karte.timer} min starten
        </button>
      )}

      {(karte.typ === 'aufgabe' || karte.typ === 'timer-aufgabe') && (
        <button
          className={[s.erledigtBtn, eintrag.erledigt ? s.erledigtOn : ''].join(' ')}
          onClick={() => editable && onPatch({ erledigt: !eintrag.erledigt })}
          disabled={!editable}
        >
          {eintrag.erledigt ? '✓ Erledigt' : 'Erledigt'}
        </button>
      )}

      {editable ? (
        antwortOffen ? (
          <textarea
            className={s.antwort}
            value={antwort}
            onChange={e => onAntwort(e.target.value)}
            placeholder="Ein Satz reicht."
            rows={2}
            autoFocus={autoOpen}
          />
        ) : (
          <button className={s.antwortToggle} onClick={() => setAntwortOffen(true)}>
            + Notiz dazu
          </button>
        )
      ) : (
        (eintrag.antwort ?? '').trim() && <div className={s.antwortRead}>{eintrag.antwort}</div>
      )}
    </div>
  )
}
```

```css
/* src/features/tools/growth/TageskarteCard.module.css */
.card { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--tool-color); border-radius: var(--r); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.head { display: flex; align-items: center; justify-content: space-between; }
.kategorie { font-size: 0.66rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
.skipBtn { border: none; background: none; color: var(--text-dim); font-size: 0.72rem; cursor: pointer; padding: 4px 0; font-family: var(--font); }
.skipBtn:hover { color: var(--text); }
.text { font-size: 0.95rem; line-height: 1.45; color: var(--text); }
.warumWrap { display: flex; flex-direction: column; gap: 6px; }
.warumLink { align-self: flex-start; border: none; background: none; color: var(--text-dim); font-size: 0.72rem; cursor: pointer; padding: 0; font-family: var(--font); }
.warumText { font-size: 0.78rem; color: var(--text-dim); line-height: 1.5; border-left: 2px solid var(--border); padding-left: 10px; }
.timerBtn { align-self: flex-start; border: 1px solid var(--tool-color); background: color-mix(in srgb, var(--tool-color) 12%, transparent); color: var(--tool-color); border-radius: var(--r); padding: 8px 16px; font-size: 0.82rem; cursor: pointer; font-family: var(--font); min-height: 36px; }
.erledigtBtn { align-self: flex-start; border: 1px solid var(--border); background: none; color: var(--text-dim); border-radius: var(--r); padding: 8px 16px; font-size: 0.82rem; cursor: pointer; font-family: var(--font); min-height: 36px; }
.erledigtOn { border-color: var(--emerald); color: var(--emerald); background: color-mix(in srgb, var(--emerald) 10%, transparent); }
.antwort { width: 100%; min-height: 56px; resize: vertical; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r-sm); color: var(--text); padding: 10px; font-size: 0.88rem; font-family: var(--font); }
.antwort:focus { outline: none; border-color: var(--tool-color); }
.antwortToggle { align-self: flex-start; border: none; background: none; color: var(--text-dim); font-size: 0.75rem; cursor: pointer; padding: 0; font-family: var(--font); }
.antwortRead { font-size: 0.88rem; color: var(--text); white-space: pre-wrap; background: var(--bg2); border-radius: var(--r-sm); padding: 10px; }
```

- [ ] **Step 6.3: In TabGrowth einbauen**

In `TabGrowth.jsx` Imports ergänzen:

```js
import DailyStateRow from './DailyStateRow'
import TageskarteCard from './TageskarteCard'
import { skipKarte, drawBonusKarte, setAntwort, markStateTouched, setTimerKarte, isTageskarteOffen } from './growthStore'
```

Zwischen `backToToday`-Button und Freitext-Section einfügen:

```jsx
      {/* Daily State — geteilt mit Kognitiv, optional */}
      <DailyStateRow
        date={viewDate}
        editable={editable}
        onTouched={() => persist(markStateTouched(dataRef.current, viewDate))}
      />

      {/* Karten: Tageskarte zuerst, dann Bonus */}
      {(day?.karten ?? []).map(eintrag => (
        <TageskarteCard
          key={eintrag.kartenId}
          eintrag={eintrag}
          date={viewDate}
          editable={editable}
          istTageskarte={eintrag.kartenId === day.tageskarteId}
          skipMoeglich={
            viewDate === today && editable && !day.skipVerwendet &&
            eintrag.kartenId === day.tageskarteId &&
            !(eintrag.antwort ?? '').trim() && !eintrag.erledigt
          }
          autoOpen={timerRueckkehr === eintrag.kartenId}
          onPatch={(patch) => persist(setAntwort(dataRef.current, viewDate, eintrag.kartenId, patch))}
          onSkip={() => persist(skipKarte(dataRef.current, viewDate))}
          onStartTimer={(karte) => handleStartTimer(karte)}
        />
      ))}

      {/* Bonus: erst nach beantworteter Tageskarte, max 3 gesamt, nur heute */}
      {viewDate === today && day && !isTageskarteOffen(data, viewDate) && day.karten.length < 3 && (
        <button className={s.bonusBtn} onClick={() => persist(drawBonusKarte(dataRef.current, viewDate))}>
          Noch eine ziehen?
        </button>
      )}
```

Dazu im Component-Body (vor dem return; `handleStartTimer` kommt in Task 7, hier Platzhalter-frei nur der State):

```js
  const [timerRueckkehr] = useState(null) // wird in Task 7 mit Leben gefüllt
  const handleStartTimer = () => {}        // wird in Task 7 implementiert
```

CSS ergänzen in `TabGrowth.module.css`:

```css
.bonusBtn { align-self: center; border: none; background: none; color: var(--text-dim); font-size: 0.78rem; cursor: pointer; padding: 4px 12px; font-family: var(--font); }
.bonusBtn:hover { color: var(--text); }
```

- [ ] **Step 6.4: Verifizieren**

Run: `npx vitest run && npx eslint src/features/tools/growth`
Expected: PASS, 0 Fehler. Dev-Server-Smoke-Test: Tool öffnen → Karte erscheint, Antwort tippen, Reload → Antwort + selbe Karte noch da; Skip → neue Karte, Skip-Link weg.

- [ ] **Step 6.5: Commit**

```bash
git add src/features/tools/growth
git commit -m "feat(growth): Tagesansicht — Daily-State-Zeile, Tageskarte (frage/aufgabe), Warum-Aufklapper, Skip, Bonuskarten"
```

---

### Task 7: Timer-Karten — Fokustimer mit Rückweg

**Files:**
- Modify: `src/features/tools/timer/TabTimer.jsx` (returnTab)
- Modify: `src/features/tools/growth/TabGrowth.jsx`

- [ ] **Step 7.1: TabTimer — returnTab unterstützen**

In `TabTimer.jsx` Zeile 50 `setCurrentTab` mit destrukturieren:

```js
  const { todos, setTodos, toolColors, setTimerAutoStart, setDays, setCurrentTab } = useAppStore()
```

Den Done-Effect (Zeilen 334–339) ersetzen:

```js
  // When timer finishes and a task is set, show mark-done dialog.
  // Kam der Start aus einem Tool (returnTab gesetzt) → dorthin zurück statt Dialog.
  useEffect(() => {
    if (!done || timerMode !== 'normal') return
    if (autoTask?.returnTab != null) {
      const rt = autoTask.returnTab
      reset()
      setCurrentTab(rt)
      return
    }
    if (focusTodoId || autoTask) setConfirmDone(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, focusTodoId, autoTask, timerMode])
```

Im Store-Kommentar (`store/index.js` Zeile 90) das Feld dokumentieren:

```js
  // { todoId, text, color, duration, date, slotKey, returnTab? } — flüchtig, kein localStorage
```

- [ ] **Step 7.2: Growth — Timer starten + Rückkehr behandeln**

In `TabGrowth.jsx`: Imports ergänzen (`TOOL_TAB` + Store-Setter):

```js
import { TOOL_TAB } from '../toolTabs'
```

`useAppStore`-Destrukturierung erweitern um `setTimerAutoStart, setCurrentTab`.

Die Platzhalter aus Task 6 ersetzen:

```js
  // Timer-Karte: bestehenden Fokustimer mit Kartendauer starten; Karte am Tag
  // vormerken, damit beim Rückweg das Antwortfeld aufgeht (auch wenn der Timer
  // im Hintergrund ablief und das Tool später manuell geöffnet wird).
  const [timerRueckkehr, setTimerRueckkehr] = useState(null)
  const handleStartTimer = (karte) => {
    persist(setTimerKarte(dataRef.current, viewDate, karte.id))
    setTimerAutoStart({ text: karte.text, color: toolColor, duration: karte.timer, returnTab: TOOL_TAB.growth })
    setCurrentTab(TOOL_TAB.timer)
  }

  // Rückkehr vom Timer: vorgemerkte Karte einmalig konsumieren
  useEffect(() => {
    const id = dataRef.current.days[todayKey()]?.timerKarteId
    if (!id) return
    setTimerRueckkehr(id)
    persist(setTimerKarte(dataRef.current, todayKey(), null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

- [ ] **Step 7.3: Verifizieren**

Run: `npx vitest run && npx eslint .`
Expected: PASS. Smoke-Test: Timer-Karte (z.B. via Skip erzwingen bis eine kommt, oder Kategorie temporär einschränken) → „▶ X min starten" → Timer läuft mit Karten-Text-Banner → abwarten/Fertig → zurück in Growth, Antwortfeld offen.

- [ ] **Step 7.4: Commit**

```bash
git add src/features/tools/timer/TabTimer.jsx src/features/tools/growth/TabGrowth.jsx src/store/index.js
git commit -m "feat(growth): Timer-Karten starten den Fokustimer und kehren zur Karte zurück (timerAutoStart.returnTab)"
```

---

### Task 8: Opener (Ankommens-Ritual)

**Files:**
- Create: `src/features/tools/growth/GrowthOpener.jsx`, `GrowthOpener.module.css`
- Modify: `src/features/tools/growth/TabGrowth.jsx`, `growthStore.js`

- [ ] **Step 8.1: Store-Helfer**

In `growthStore.js` ergänzen:

```js
// Opener: rotiert deterministisch pro Tag; gilt als gezeigt, sobald gerendert.
export function openerForDate(date) {
  const dayNum = Math.floor(new Date(date + 'T12:00:00').getTime() / 86400000)
  return content.opener[dayNum % content.opener.length]
}

export function markOpenerShown(data, date) {
  if (data.openerShownFor === date) return data
  return { ...data, openerShownFor: date }
}
```

- [ ] **Step 8.2: GrowthOpener**

```jsx
// src/features/tools/growth/GrowthOpener.jsx
// ~60 Sekunden ankommen, bevor die Karte kommt. Überspringen ist IMMER sichtbar.
// Variante "atmen": animierter Kreis (4s ein / 6s aus, 5 Zyklen, auto-fertig).
// Übrige Varianten: Anleitung + „Fertig"-Tap, kein Zwangstimer (minimale Friction).
import { useState, useEffect } from 'react'
import s from './GrowthOpener.module.css'

export default function GrowthOpener({ opener, onDone }) {
  const zyklen = opener.zyklen ?? 0
  const [zyklus, setZyklus] = useState(1)

  // Atmen: 10s pro Zyklus (4 ein + 6 aus), danach automatisch fertig
  useEffect(() => {
    if (opener.id !== 'atmen') return
    if (zyklus > zyklen) { onDone(); return }
    const t = setTimeout(() => setZyklus(z => z + 1), 10000)
    return () => clearTimeout(t)
  }, [opener.id, zyklus, zyklen, onDone])

  return (
    <div className={s.card}>
      <div className={s.head}>
        <span className={s.eyebrow}>Ankommen · {opener.titel}</span>
        <button className={s.skip} onClick={onDone}>Überspringen</button>
      </div>

      <div className={s.anleitung}>{opener.anleitung}</div>

      {opener.id === 'atmen' ? (
        <div className={s.atmenWrap}>
          <div key={zyklus} className={s.atmenKreis} />
          <span className={s.zyklus}>{Math.min(zyklus, zyklen)} / {zyklen}</span>
        </div>
      ) : (
        <button className={s.fertig} onClick={onDone}>Fertig</button>
      )}
    </div>
  )
}
```

```css
/* src/features/tools/growth/GrowthOpener.module.css */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; display: flex; flex-direction: column; gap: 12px; align-items: stretch; }
.head { display: flex; align-items: center; justify-content: space-between; }
.eyebrow { font-size: 0.66rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
.skip { border: none; background: none; color: var(--text-dim); font-size: 0.75rem; cursor: pointer; font-family: var(--font); padding: 6px 0; }
.skip:hover { color: var(--text); }
.anleitung { font-size: 0.9rem; color: var(--text); line-height: 1.5; text-align: center; }
.atmenWrap { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0; }
.atmenKreis { width: 64px; height: 64px; border-radius: 50%; background: color-mix(in srgb, var(--tool-color) 25%, transparent); border: 2px solid var(--tool-color); animation: growthAtmen 10s ease-in-out; }
.zyklus { font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-num); }
.fertig { align-self: center; border: 1px solid var(--tool-color); background: none; color: var(--tool-color); border-radius: var(--r); padding: 8px 24px; font-size: 0.82rem; cursor: pointer; font-family: var(--font); min-height: 44px; }
@keyframes growthAtmen {
  0%   { transform: scale(0.6); }
  40%  { transform: scale(1.15); }  /* 4s einatmen */
  100% { transform: scale(0.6); }   /* 6s ausatmen */
}
@media (prefers-reduced-motion: reduce) {
  .atmenKreis { animation: none; }
}
```

- [ ] **Step 8.3: In TabGrowth einbauen**

Imports: `GrowthOpener` + `openerForDate, markOpenerShown` ergänzen. Im Body:

```js
  // Opener: nur beim ersten Öffnen des Tages, nur heute, abschaltbar.
  // „Gezeigt" wird sofort beim Rendern persistiert (strikt 1× pro Tag).
  const showOpener = data.settings.briefingGesehen && data.settings.openerAn
    && viewDate === today && data.openerShownFor !== today
  const [openerAktiv, setOpenerAktiv] = useState(false)
  useEffect(() => {
    if (showOpener) {
      setOpenerAktiv(true)
      persist(markOpenerShown(dataRef.current, today))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOpener, today])
```

Im JSX direkt nach `<DailyStateRow …/>`:

```jsx
      {openerAktiv && viewDate === today && (
        <GrowthOpener opener={openerForDate(today)} onDone={() => setOpenerAktiv(false)} />
      )}
```

- [ ] **Step 8.4: Verifizieren + Commit**

Run: `npx vitest run && npx eslint src/features/tools/growth`
Smoke: Tool öffnen → Opener sichtbar, überspringen → weg; Tool neu öffnen → kein Opener mehr heute.

```bash
git add src/features/tools/growth
git commit -m "feat(growth): Opener-Ritual — 4 rotierende Varianten, Atmen-Animation, immer überspringbar"
```

---

### Task 9: Archiv-Leiste, Vergangenheits-Ansicht, DayPanel-Growth-Karte

**Files:**
- Create: `src/features/tools/growth/GrowthArchiv.jsx`, `GrowthArchiv.module.css`
- Modify: `src/features/tools/growth/TabGrowth.jsx`
- Modify: `src/features/calendar/TabKalender/DayPanel.jsx`
- Modify: `src/features/calendar/TabKalender/MonatView.jsx` (Props durchreichen)
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx` (Props durchreichen)

- [ ] **Step 9.1: GrowthArchiv (Swipe-Leiste)**

```jsx
// src/features/tools/growth/GrowthArchiv.jsx
// Dezente horizontale Leiste vergangener Tage: Datum, Stimmungsfarbe, erste Zeile.
// Tap → Eintrag wird in der (gleichen) Tagesansicht geöffnet — ≤3 Tage editierbar.
import { dayHasEntry, MOOD_COLORS, karteById } from './growthStore'
import { loadDailyStates } from '../../daily/dailyState'
import s from './GrowthArchiv.module.css'

function firstLine(day) {
  if ((day.freitext ?? '').trim()) return day.freitext.trim().split('\n')[0]
  const beantwortet = (day.karten ?? []).find(k => (k.antwort ?? '').trim())
  if (beantwortet) return beantwortet.antwort.trim().split('\n')[0]
  const erledigt = (day.karten ?? []).find(k => k.erledigt)
  if (erledigt) return karteById(erledigt.kartenId)?.text ?? ''
  return ''
}

export default function GrowthArchiv({ data, today, onOpen, children }) {
  const states = loadDailyStates()
  const eintraege = Object.entries(data.days)
    .filter(([date, day]) => date < today && dayHasEntry(day))
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)

  if (eintraege.length === 0 && !children) return null

  return (
    <div className={s.wrap}>
      <div className={s.label}>Frühere Tage</div>
      {eintraege.length > 0 && (
        <div className={s.strip}>
          {eintraege.map(([date, day]) => {
            const mood = states[date]?.mood
            return (
              <button key={date} className={s.mini} onClick={() => onOpen(date)}>
                <span className={s.miniHead}>
                  {mood != null && <span className={s.moodDot} style={{ background: MOOD_COLORS[mood - 1] }} />}
                  <span className={s.miniDate}>{date.slice(8, 10)}.{date.slice(5, 7)}.</span>
                </span>
                <span className={s.miniText}>{firstLine(day)}</span>
              </button>
            )
          })}
        </div>
      )}
      {children /* KI-Export-Bereich, Task 11 */}
    </div>
  )
}
```

```css
/* src/features/tools/growth/GrowthArchiv.module.css */
.wrap { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
.label { font-size: 0.66rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
.strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
.mini { flex: 0 0 auto; width: 110px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 8px 10px; cursor: pointer; font-family: var(--font); }
.miniHead { display: flex; align-items: center; gap: 5px; }
.moodDot { width: 8px; height: 8px; border-radius: 50%; }
.miniDate { font-size: 0.7rem; color: var(--text-dim); font-family: var(--font-num); }
.miniText { font-size: 0.72rem; color: var(--text); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

- [ ] **Step 9.2: In TabGrowth einbauen + Kalender-Intent konsumieren**

Import `GrowthArchiv` ergänzen. Unter der Freitext-Section:

```jsx
      {viewDate === today && (
        <GrowthArchiv data={data} today={today} onOpen={(d) => setViewDate(d)} />
      )}
```

Den Intent-Effect aus Task 5 (Step 5.2) erweitern — der Initialwert von `viewDate` konsumiert `growthOpenDate` bereits beim Mount; der Effect setzt ihn nur zurück (bereits implementiert — prüfen, dass `useState(() => useAppStore.getState().growthOpenDate ?? todayKey())` steht).

Für Read-only-Tage (>3 Tage) zeigt die Tagesansicht: Karten read-only (`editable=false` greift bereits in TageskarteCard/DailyStateRow/Freitext) — kein zusätzlicher Code nötig. Hinweiszeile ergänzen (nach `backToToday`):

```jsx
      {viewDate !== today && !editable && (
        <div className={s.readOnlyHint}>Nur lesen — älter als 3 Tage</div>
      )}
```

```css
.readOnlyHint { font-size: 0.72rem; color: var(--text-dim); }
```

(Bewusst KEIN Hinweis bei editierbaren Nachtrag-Tagen — kommentarlos per Spec.)

- [ ] **Step 9.3: DayPanel — Growth-Karte (gated auf aktive Tools)**

`TabKalender.jsx`: Store liefert `activeTools` bereits? Prüfen — falls nicht destrukturiert, ergänzen. An `MonatView` wird `activeTools` schon übergeben (Zeile 12 der Props). In `MonatView.jsx` beim `<DayPanel …>`-Aufruf zusätzlich durchreichen:

```jsx
            activeTools={activeTools}
            setGrowthOpenDate={setGrowthOpenDate}
```

`setGrowthOpenDate` in MonatView als Prop aufnehmen und in `TabKalender.jsx` aus dem Store holen (`const { …, setGrowthOpenDate } = useAppStore()`) und an MonatView übergeben.

`DayPanel.jsx`: Props erweitern (`activeTools = [], setGrowthOpenDate`), Import + Daten:

```js
import { getDaySummary as getGrowthDay } from '../../tools/growth/growthStore'
```

```js
  const growthDay   = useMemo(
    () => activeTools.includes('growth') ? getGrowthDay(dateKey) : null,
    [dateKey, activeTools],
  )
  const growthColor = getToolColor('growth', toolColors)
```

Karte (an der Stelle der alten Wachstum-Karte, gleiche `toolCard`-Klassen):

```jsx
      {/* Growth-Karte */}
      {growthDay && (
        <div className={s.toolCard} style={{ borderTop: `2px solid ${growthColor}` }}>
          <div className={s.toolCardHead} onClick={() => toggle('growth')}>
            <span className={s.toolCardTitle} style={{ color: growthColor }}>Growth</span>
            <button
              className={s.toolCardOpenBtn}
              style={{ color: growthColor, background: `color-mix(in srgb, ${growthColor} 15%, transparent)` }}
              onClick={e => { e.stopPropagation(); setGrowthOpenDate?.(dateKey); setCurrentTab(TOOL_TAB.growth) }}
            >
              → Öffnen
            </button>
            <span className={s.toolCardArrow}>{open.growth ? '▾' : '▸'}</span>
          </div>
          {open.growth && (
            <div className={s.toolCardBody}>
              {growthDay.karten.map(k => (
                <div key={k.kartenId} className={s.elviNotes}>
                  <strong>{k.frage}</strong>
                  {(k.antwort ?? '').trim() ? ` — ${k.antwort}` : ' — ✓ erledigt'}
                </div>
              ))}
              {growthDay.freitext && <div className={s.elviNotes}>{growthDay.freitext}</div>}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 9.4: Verifizieren + Commit**

Run: `npx vitest run && npx eslint . && npm run build`
Smoke: Eintrag heute machen → morgen-simuliert (oder Eintrag an Vergangenheitstag via Nachtrag) → Archiv-Leiste zeigt Mini-Karte; Tap öffnet Tag; Kalender → Monat → Tag antippen → Growth-Karte im DayPanel, „→ Öffnen" springt auf den Tag im Tool.

```bash
git add -A
git commit -m "feat(growth): Archiv-Swipe-Leiste, Nachtrag (3 Tage), Kalender-DayPanel-Karte mit Datums-Intent"
```

---

### Task 10: First-Open-Briefing + Tool-Einstellungen

**Files:**
- Create: `src/features/tools/growth/GrowthBriefing.jsx`, `GrowthBriefing.module.css`
- Create: `src/features/tools/growth/GrowthSettings.jsx`, `GrowthSettings.module.css`
- Modify: `src/features/tools/growth/TabGrowth.jssx` → `.jsx`, `growthStore.js`

- [ ] **Step 10.1: Store-Helfer**

In `growthStore.js`:

```js
export function setSettings(data, patch) {
  return { ...data, settings: { ...data.settings, ...patch } }
}

// Kategorie togglen — mindestens 1 muss aktiv bleiben
export function toggleKategorie(data, katId) {
  const cur = data.settings.aktiveKategorien
  const next = cur.includes(katId) ? cur.filter(id => id !== katId) : [...cur, katId]
  if (next.length === 0) return data
  return setSettings(data, { aktiveKategorien: next })
}
```

- [ ] **Step 10.2: Kategorie-Kacheln + Briefing**

```jsx
// src/features/tools/growth/GrowthBriefing.jsx
// First-Open: 4 Screens, Screen 4 = Pflicht-Kategorienauswahl (min. 1).
import { useState } from 'react'
import { KATEGORIEN } from './growthStore'
import s from './GrowthBriefing.module.css'

const SCREENS = [
  { titel: 'Jeden Tag eine Karte.', text: 'Beantworten, überspringen (1×) oder einfach ignorieren — dein Tempo.' },
  { titel: 'Dein freies Feld.', text: 'Darunter: dein freies Feld. Ein Satz reicht. Diktieren geht über die Mikrofon-Taste deiner Tastatur.' },
  { titel: '60 Sekunden ankommen.', text: 'Vorher 60 Sekunden ankommen — jederzeit überspringbar, in den Einstellungen abschaltbar.' },
]

export function KategorieKacheln({ aktiv, onToggle }) {
  return (
    <div className={s.kacheln}>
      {KATEGORIEN.map(k => {
        const on = aktiv.includes(k.id)
        return (
          <button
            key={k.id}
            className={[s.kachel, on ? s.kachelOn : ''].join(' ')}
            onClick={() => onToggle(k.id)}
            aria-pressed={on}
          >
            <span className={s.kachelName}>{on && <span className={s.check}>✓ </span>}{k.name}</span>
            <span className={s.kachelSub}>{k.untertitel}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function GrowthBriefing({ defaults, onComplete }) {
  const [screen, setScreen] = useState(0)
  const [aktiv, setAktiv] = useState(defaults)

  const toggle = (id) => setAktiv(cur => {
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    return next.length === 0 ? cur : next
  })

  return (
    <div className={s.page}>
      {screen < 3 ? (
        <>
          <div className={s.step}>{screen + 1} / 4</div>
          <div className={s.titel}>{SCREENS[screen].titel}</div>
          <div className={s.text}>{SCREENS[screen].text}</div>
          <button className={s.weiter} onClick={() => setScreen(screen + 1)}>Weiter</button>
        </>
      ) : (
        <>
          <div className={s.step}>4 / 4</div>
          <div className={s.titel}>Welche Themen willst du?</div>
          <KategorieKacheln aktiv={aktiv} onToggle={toggle} />
          <button className={s.weiter} onClick={() => onComplete(aktiv)}>Los geht's</button>
        </>
      )}
    </div>
  )
}
```

```css
/* src/features/tools/growth/GrowthBriefing.module.css */
.page { display: flex; flex-direction: column; gap: 16px; padding: 24px 4px; min-height: 60vh; justify-content: center; }
.step { font-size: 0.7rem; color: var(--text-dim); font-family: var(--font-num); }
.titel { font-size: 1.3rem; font-weight: 600; color: var(--text); }
.text { font-size: 0.92rem; color: var(--text-dim); line-height: 1.6; }
.weiter { margin-top: 10px; border: none; background: var(--tool-color); color: #08080f; border-radius: var(--r); padding: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: var(--font); min-height: 44px; }
.kacheln { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.kachel { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 12px; cursor: pointer; font-family: var(--font); }
.kachelOn { border-color: var(--tool-color); background: color-mix(in srgb, var(--tool-color) 10%, transparent); }
.kachelName { font-size: 0.85rem; color: var(--text); font-weight: 600; }
.check { color: var(--tool-color); }
.kachelSub { font-size: 0.68rem; color: var(--text-dim); line-height: 1.4; }
```

- [ ] **Step 10.3: Settings**

```jsx
// src/features/tools/growth/GrowthSettings.jsx
import { KategorieKacheln } from './GrowthBriefing'
import s from './GrowthSettings.module.css'

export default function GrowthSettings({ settings, onToggleKategorie, onPatch, onBack }) {
  return (
    <div className={s.page}>
      <button className={s.back} onClick={onBack}>← Zurück</button>

      <div className={s.label}>Themen</div>
      <KategorieKacheln aktiv={settings.aktiveKategorien} onToggle={onToggleKategorie} />
      <div className={s.hint}>Mindestens 1 Thema bleibt aktiv. Heutige Karte bleibt bestehen — Änderungen wirken ab morgen.</div>

      <div className={s.label}>Optionen</div>
      <label className={s.toggleRow}>
        <span>Ankommens-Ritual (Opener)</span>
        <input type="checkbox" checked={settings.openerAn} onChange={e => onPatch({ openerAn: e.target.checked })} />
      </label>
      <label className={s.toggleRow}>
        <span>KI-Export</span>
        <input type="checkbox" checked={settings.kiExportAn} onChange={e => onPatch({ kiExportAn: e.target.checked })} />
      </label>

      <button className={s.briefingBtn} onClick={() => onPatch({ briefingGesehen: false })}>
        Briefing erneut anzeigen
      </button>
    </div>
  )
}
```

```css
/* src/features/tools/growth/GrowthSettings.module.css */
.page { display: flex; flex-direction: column; gap: 12px; }
.back { align-self: flex-start; border: 1px solid var(--border); background: var(--surface); color: var(--text-dim); border-radius: var(--r); padding: 6px 12px; font-size: 0.78rem; cursor: pointer; font-family: var(--font); }
.label { font-size: 0.66rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px; }
.hint { font-size: 0.7rem; color: var(--text-dim); line-height: 1.4; }
.toggleRow { display: flex; align-items: center; justify-content: space-between; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 12px; font-size: 0.85rem; color: var(--text); cursor: pointer; }
.toggleRow input { accent-color: var(--tool-color); width: 18px; height: 18px; }
.briefingBtn { margin-top: 10px; border: 1px solid var(--border); background: none; color: var(--text-dim); border-radius: var(--r); padding: 10px; font-size: 0.8rem; cursor: pointer; font-family: var(--font); }
```

- [ ] **Step 10.4: In TabGrowth verdrahten**

Imports: `GrowthBriefing`, `GrowthSettings`, `setSettings, toggleKategorie`. Im Return GANZ OBEN (vor dem normalen Render, nach den Hooks!):

```jsx
  if (!data.settings.briefingGesehen) {
    return (
      <div className={s.page} style={{ '--tool-color': toolColor }}>
        <ToolHeader onBack={onBack} icon={<ToolIcon id="growth" size={20} />} eyebrow="Tool" title="Growth" />
        <GrowthBriefing
          defaults={data.settings.aktiveKategorien}
          onComplete={(kategorien) =>
            persist(setSettings(dataRef.current, { aktiveKategorien: kategorien, briefingGesehen: true }))}
        />
      </div>
    )
  }

  if (nav === 'settings') {
    return (
      <div className={s.page} style={{ '--tool-color': toolColor }}>
        <ToolHeader onBack={onBack} icon={<ToolIcon id="growth" size={20} />} eyebrow="Tool" title="Growth" />
        <GrowthSettings
          settings={data.settings}
          onToggleKategorie={(id) => persist(toggleKategorie(dataRef.current, id))}
          onPatch={(patch) => { persist(setSettings(dataRef.current, patch)); if (patch.briefingGesehen === false) setNav(null) }}
          onBack={() => setNav(null)}
        />
      </div>
    )
  }
```

WICHTIG: Alle Hooks (useState/useEffect/useAutosave) müssen VOR diesen Early-Returns stehen — Reihenfolge aus Task 5/6 beibehalten, Early-Returns erst direkt vor dem Haupt-`return`.

- [ ] **Step 10.5: Verifizieren + Commit**

Run: `npx vitest run && npx eslint src/features/tools/growth`
Smoke: `localStorage.removeItem('adhs_growth_v1')` in DevTools → Tool öffnen → 4 Briefing-Screens, Kategorien wählen (letzte lässt sich nicht abwählen) → „Los geht's" → Tagesansicht. Settings: Zahnrad → Toggles + „Briefing erneut anzeigen".

```bash
git add src/features/tools/growth
git commit -m "feat(growth): First-Open-Briefing (4 Screens, Pflicht-Kategorien) + Tool-Einstellungen"
```

---

### Task 11: KI-Export

**Files:**
- Modify: `src/features/tools/growth/TabGrowth.jsx`, `GrowthArchiv.module.css`

- [ ] **Step 11.1: Export-UI im Archiv-Bereich**

In `TabGrowth.jsx`: Import `buildKiPrompt` + `loadDailyStates` (aus `../../daily/dailyState`). State + Handler:

```js
  const [kiKopiert, setKiKopiert] = useState(false)
  const handleKiExport = async (nTage) => {
    const prompt = buildKiPrompt(dataRef.current, loadDailyStates(), nTage, today)
    try {
      await navigator.clipboard.writeText(prompt)
      setKiKopiert(true)
      setTimeout(() => setKiKopiert(false), 2500)
    } catch {
      // Clipboard verweigert (z.B. fehlender Focus) → kein Crash, kein Toast
    }
  }
```

Als `children` in `<GrowthArchiv …>` (nur wenn aktiviert):

```jsx
        {data.settings.kiExportAn && (
          <div className={s.kiRow}>
            <span className={s.kiLabel}>{kiKopiert ? '✓ In Zwischenablage kopiert' : 'Für KI exportieren:'}</span>
            {!kiKopiert && [7, 30, 90].map(n => (
              <button key={n} className={s.kiBtn} onClick={() => handleKiExport(n)}>{n} Tage</button>
            ))}
          </div>
        )}
```

CSS in `TabGrowth.module.css`:

```css
.kiRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kiLabel { font-size: 0.75rem; color: var(--text-dim); }
.kiBtn { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: var(--r-sm); padding: 6px 12px; font-size: 0.75rem; cursor: pointer; font-family: var(--font); }
```

- [ ] **Step 11.2: Verifizieren + Commit**

Run: `npx vitest run` (der buildKiPrompt-Test aus Task 4 deckt das Template ab)
Smoke: Settings → KI-Export an → Archiv-Bereich zeigt Buttons → „7 Tage" → Einfügen in Editor: Template + Einträge korrekt.

```bash
git add src/features/tools/growth
git commit -m "feat(growth): KI-Export — Prompt für 7/30/90 Tage in die Zwischenablage (default aus)"
```

---

### Task 12: Kalender-Dots + Dashboard-Feinschliff

**Files:**
- Modify: `src/features/calendar/TabKalender/kalenderShared.js:53`
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`
- Modify: `src/features/calendar/TabKalender/MonatView.jsx`
- Modify: `src/features/calendar/TabKalender/WocheView.jsx`

- [ ] **Step 12.1: getToolDots erweitern**

Signatur + Block in `kalenderShared.js`:

```js
export function getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions, growthDoneDates) {
```

Vor dem `return dots`:

```js
  if (activeTools.includes('growth') && growthDoneDates) {
    if (growthDoneDates.includes(dk))
      dots.push({ id: 'growth', color: getToolColor('growth', toolColors) })
  }
```

- [ ] **Step 12.2: Daten laden + durchreichen**

`TabKalender.jsx` (neben den bestehenden Memos, Zeile ~35):

```js
import { getDoneDates as loadGrowthDoneDates } from '../../tools/growth/growthStore'
```

```js
  const growthDoneDates = useMemo(() => loadGrowthDoneDates(), [])
```

An BEIDE Views als Prop `growthDoneDates={growthDoneDates}` übergeben (Zeilen ~150 + ~170). In `MonatView.jsx` und `WocheView.jsx`: Prop aufnehmen und beim `getToolDots(...)`-Aufruf als 8. Argument anhängen.

- [ ] **Step 12.3: Verifizieren + Commit**

Run: `npx vitest run && npx eslint . && npm run build`
Smoke: Eintrag heute (1 Zeichen Freitext) → Monatsansicht: grüner Dot am Tag. Tool deaktivieren (TabTools) → Dot weg, Section weg, DayPanel-Karte weg.

```bash
git add -A
git commit -m "feat(growth): Kalender-Dot nach Projekt-Dot-Logik (datengesteuert, nur bei aktivem Tool)"
```

---

### Task 13: Kontext-Doku + Gesamt-Validierung + Audit

**Files:**
- Modify: `kontext/kern.md`, `kontext/architektur.md`, `kontext/tool-pattern.md`

- [ ] **Step 13.1: Kontext-Dateien aktualisieren**

- `kontext/kern.md`: Storage-Keys-Block — `SK.wachstum`-Zeile als LEGACY markieren, `SK.growth` + `SK.dailyState` ergänzen; Store-Block um `growthOpenDate` ergänzen; `timerAutoStart`-Kommentar um `returnTab?` ergänzen; Tab-Routing: Tab 17 Projekte, Tab 18 Growth; TabKalender-Tool-Dots-Liste um Growth-Dot ergänzen (Wachstum hatte keinen).
- `kontext/architektur.md`: Ordnerstruktur — `wachstum/` raus, `growth/` (Dateiliste) + `daily/` rein.
- `kontext/tool-pattern.md`: Tab-Nummern-Liste aktualisieren (16 kognitiv, 17 projekte, 18 growth, 19 → nächstes Tool).

- [ ] **Step 13.2: Node-Validierung (Spec §0.2)**

Run: `npx vitest run && npx eslint . && npm run build`
Expected: 0 Fehler überall. Zusätzlich `npx vite preview` Smoke-Durchlauf aller Abnahmekriterien.

- [ ] **Step 13.3: Audit-Tabelle erstellen** (im Abschluss-Report, gegen Spec §7):

| # | Kriterium | Status |
|---|---|---|
| 1 | Tool deaktiviert → null Spuren (Section, Dots, DayPanel) | 🔴/🟡/🟢 |
| 2 | Dot-Logik identisch zur Projektlogik, ab Mindest-Eintrag | |
| 3 | Offene Tageskarte im Dashboard, Bonuskarten nie | |
| 4 | Daily State geteilt mit Kognitiv, keine Doppelerfassung | |
| 5 | Timer-Karten starten bestehenden Fokustimer | |
| 6 | Skip 1/Tag, Karte kommt morgen wieder | |
| 7 | Keine Streaks, keine Verpasst-Hinweise irgendwo | |
| 8 | Nachtrag 3 Tage, kommentarlos | |
| 9 | Briefing mit Pflicht-Kategorienauswahl | |
| 10 | Alle 250 Karten exakt übernommen (Guard-Test grün) | |
| 11 | Autosave Freitext, Platzhalter „Ein Satz reicht." | |
| 12 | KI-Export nach Template in Zwischenablage | |

- [ ] **Step 13.4: Commit**

```bash
git add kontext
git commit -m "docs(kontext): Growth-Tool, Daily-State-Store, Tab-Nummern, Storage-Keys aktualisiert"
```

---

## Self-Review (erledigt beim Planschreiben)

- **Spec-Abdeckung:** §3.1→T5/6/8/9, §3.2→T4/6, §3.3→T1/10, §3.4→T8, §3.5→T2/3/6, §3.6→T9, §3.7→T4/11, §3.8→T10, §3.9→T10, §4→T1/2/4, §5 Edge Cases→T4 (Tests: Skip-Queue, Sperre-Halbierung, Kategorie-deaktiviert via Persistenz, Nachtrag-Ziehung) + T5 (Tageswechsel-Listener), §6→T1, §7→T13.
- **Typ-Konsistenz:** `ensureDayCard/skipKarte/drawBonusKarte/setAntwort/setFreitext/markStateTouched/setTimerKarte` — alle `(data, date, …) → data`; UI ruft sie ausschließlich über `persist(fn(dataRef.current, …))` auf. `dayHasEntry(day)`, `isTageskarteOffen(data, date)` — Aufrufer in T5/6/12 konsistent.
- **Keine Platzhalter** außer der bewussten Content-Übernahme-Anweisung in T1 (Quelle in Repo, Guard-Test sichert Vollständigkeit).
