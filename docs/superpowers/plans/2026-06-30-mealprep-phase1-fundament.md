# Mealprep-Rework Phase 1 — Fundament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Mengen-/Einkaufslogik versteht „frisch vs. TK-Block pro Komponente" — additiv, verhaltenserhaltend, ohne sichtbare UI-Änderung.

**Architecture:** Zwei reine Helfer (`istFrisch`, `portionenSplit`) in `mealprepModel.js` + eine frisch-bewusste Akkumulation (`sammleZutatenGesplittet`) in `einkauf.js`, auf die `buildEinkauf` umgestellt wird. **Kein Schema-Bump, keine destruktive Migration:** das neue Verhalten ist „schlafend" und greift erst, wenn ein Plan `bloecke > 0` setzt (Phase 3). Alt-Format `{ portionen }` wird tolerant gelesen → bitidentisches Ergebnis wie heute, deshalb laufen `Einkauf.jsx` und `kochTodo.js` unverändert weiter.

**Tech Stack:** Vanilla ES-Module, Vitest. Reine Funktionen, kein React.

**Spec:** `kontext/mealprep-rework.md` (Abschnitte „Frisch vs. TK pro Komponente" + „Mengen-Berechnung").

**Datei-Verantwortung nach dieser Phase:**
- `mealprepModel.js` — Konstanten, Factories **+ Domänen-Helfer** (`istBasis`, `istFrisch`, `portionenSplit`)
- `einkauf.js` — Roh-Zutaten-Akkumulation: `sammleZutaten` (uniform, unverändert) + `sammleZutatenGesplittet` (frisch-bewusst) + `buildEinkauf`

---

### Task 1: Helfer `istFrisch` (Frisch-vs-Einfrieren-Heuristik)

**Files:**
- Modify: `src/features/tools/rezepte/mealprepModel.js` (neue Export-Funktion ans Dateiende)
- Test: `src/features/tools/rezepte/mealprepModel.test.js`

- [ ] **Step 1: Failing test schreiben**

In `mealprepModel.test.js` die Import-Zeile um `istFrisch` erweitern:

```js
import {
  SLOTS, EINKAUF_KATEGORIEN,
  createZutat, createRezept, createKorb, istBasis,
  istFrisch,
} from './mealprepModel'
```

Und diesen `describe`-Block ans Dateiende anhängen:

```js
describe('istFrisch — Frisch-vs-Einfrieren-Heuristik', () => {
  const zById = (id) => ({
    nudeln: { id: 'nudeln', bausteinTyp: 'kh' },
    hack:   { id: 'hack',   bausteinTyp: 'protein' },
  }[id])

  it('explizites frisch-Flag schlägt alles', () => {
    expect(istFrisch({ zutatId: 'hack', frisch: true }, zById)).toBe(true)
    expect(istFrisch({ zutatId: 'nudeln', frisch: false }, zById)).toBe(false)
  })
  it('ohne Flag: Zutat mit bausteinTyp "kh" ist Beilage → frisch', () => {
    expect(istFrisch({ zutatId: 'nudeln' }, zById)).toBe(true)
  })
  it('ohne Flag: andere Zutaten frieren ein', () => {
    expect(istFrisch({ zutatId: 'hack' }, zById)).toBe(false)
  })
  it('Komponente (Basis-Referenz) friert per Default ein', () => {
    expect(istFrisch({ rezeptId: 'sosse' }, zById)).toBe(false)
  })
})
```

- [ ] **Step 2: Test laufen lassen → muss fehlschlagen**

Run: `npx vitest run src/features/tools/rezepte/mealprepModel.test.js`
Expected: FAIL — `istFrisch is not a function` / `is not exported`.

- [ ] **Step 3: Minimale Implementierung**

Ans Ende von `mealprepModel.js` anhängen (nach `istBasis`):

```js
// Frisch = wird nur für frische Portionen gekocht, nie eingefroren.
// Reihenfolge: explizites Flag > Beilage-Heuristik (Zutat bausteinTyp 'kh') > einfrieren.
export function istFrisch(komponente, zutatById) {
  if (komponente?.frisch != null) return komponente.frisch
  if (komponente?.zutatId) return zutatById?.(komponente.zutatId)?.bausteinTyp === 'kh'
  return false
}
```

- [ ] **Step 4: Test laufen lassen → muss bestehen**

Run: `npx vitest run src/features/tools/rezepte/mealprepModel.test.js`
Expected: PASS (alle bestehenden + 4 neue Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/mealprepModel.js src/features/tools/rezepte/mealprepModel.test.js
git commit -m "$(cat <<'EOF'
feat(mealprep): istFrisch-Heuristik (Beilage frisch vs. einfrieren)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Helfer `portionenSplit` (Frisch/TK, Alt-Format tolerant)

**Files:**
- Modify: `src/features/tools/rezepte/mealprepModel.js` (neue Export-Funktion ans Dateiende)
- Test: `src/features/tools/rezepte/mealprepModel.test.js`

- [ ] **Step 1: Failing test schreiben**

Import-Zeile in `mealprepModel.test.js` um `portionenSplit` erweitern (zur bestehenden Liste hinzufügen):

```js
import {
  SLOTS, EINKAUF_KATEGORIEN,
  createZutat, createRezept, createKorb, istBasis,
  istFrisch, portionenSplit,
} from './mealprepModel'
```

`describe`-Block ans Dateiende anhängen:

```js
describe('portionenSplit — Frisch/TK-Aufteilung, Alt-Format tolerant', () => {
  it('neues Format {frisch,bloecke} → total = frisch+bloecke', () => {
    expect(portionenSplit({ frisch: 2, bloecke: 4 })).toEqual({ frisch: 2, bloecke: 4, total: 6 })
  })
  it('nur frisch gesetzt → bloecke 0', () => {
    expect(portionenSplit({ frisch: 3 })).toEqual({ frisch: 3, bloecke: 0, total: 3 })
  })
  it('Alt-Format {portionen} → alles frisch, keine Blöcke', () => {
    expect(portionenSplit({ portionen: 5 })).toEqual({ frisch: 5, bloecke: 0, total: 5 })
  })
  it('leeres Objekt → alles 0', () => {
    expect(portionenSplit({})).toEqual({ frisch: 0, bloecke: 0, total: 0 })
  })
})
```

- [ ] **Step 2: Test laufen lassen → muss fehlschlagen**

Run: `npx vitest run src/features/tools/rezepte/mealprepModel.test.js`
Expected: FAIL — `portionenSplit is not a function`.

- [ ] **Step 3: Minimale Implementierung**

Ans Ende von `mealprepModel.js` anhängen:

```js
// Normalisiert Korb-Eintrag / Gericht auf {frisch, bloecke, total}.
// Toleriert Alt-Format {portionen} → als rein frische Portionen behandelt.
export function portionenSplit(o) {
  if (o?.frisch != null || o?.bloecke != null) {
    const frisch = o.frisch ?? 0
    const bloecke = o.bloecke ?? 0
    return { frisch, bloecke, total: frisch + bloecke }
  }
  const p = o?.portionen ?? 0
  return { frisch: p, bloecke: 0, total: p }
}
```

- [ ] **Step 4: Test laufen lassen → muss bestehen**

Run: `npx vitest run src/features/tools/rezepte/mealprepModel.test.js`
Expected: PASS (4 neue Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/mealprepModel.js src/features/tools/rezepte/mealprepModel.test.js
git commit -m "$(cat <<'EOF'
feat(mealprep): portionenSplit (frisch/TK, Alt-Format tolerant)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Frisch-bewusste Einkauf-Akkumulation

**Files:**
- Modify: `src/features/tools/rezepte/einkauf.js`
- Test: `src/features/tools/rezepte/einkauf.test.js`

Kern dieser Phase. `sammleZutaten` bleibt **unverändert** (uniforme Rekursion, von Tests + neuem Splitter genutzt). Neu: `sammleZutatenGesplittet` entscheidet je Top-Level-Komponente, ob sie für alle Portionen (einfrieren) oder nur für frische zählt. `buildEinkauf` wird darauf umgestellt und liest Frisch/TK tolerant via `portionenSplit`.

- [ ] **Step 1: Failing test schreiben**

Import-Zeile in `einkauf.test.js` bleibt (`sammleZutaten, buildEinkauf`). Diesen `describe`-Block ans Dateiende anhängen:

```js
describe('buildEinkauf — Frisch/TK-Split: Beilage nur für frische Portionen', () => {
  const Z = {
    hack:   { id: 'hack',   name: 'Hack',   bausteinTyp: 'protein', einheit: 'g', einkaufKategorie: 'Fleisch & Fisch' },
    nudeln: { id: 'nudeln', name: 'Nudeln', bausteinTyp: 'kh',      einheit: 'g', einkaufKategorie: 'Brot & Getreide' },
  }
  const zb = (id) => Z[id]

  it('Einfrier-Teil zählt alle Portionen, Beilage nur die frischen', () => {
    const gericht = {
      basisPortionen: 4,
      zutaten: [
        { zutatId: 'hack',   menge: 400 },   // protein → friert ein
        { zutatId: 'nudeln', menge: 500 },   // kh → Beilage, frisch
      ],
      komponenten: [],
    }
    // 2 frische Portionen + 4 TK-Blöcke → total 6
    const liste = buildEinkauf([{ rezept: gericht, frisch: 2, bloecke: 4 }], zb, () => null)
    const hack   = liste.find(g => g.kategorie === 'Fleisch & Fisch').items[0]
    const nudeln = liste.find(g => g.kategorie === 'Brot & Getreide').items[0]
    expect(hack.menge).toBe(600)    // 400 * (6/4) — alle 6 Portionen
    expect(nudeln.menge).toBe(250)  // 500 * (2/4) — nur 2 frische
  })
})
```

- [ ] **Step 2: Test laufen lassen → muss fehlschlagen**

Run: `npx vitest run src/features/tools/rezepte/einkauf.test.js`
Expected: FAIL — `buildEinkauf` liest noch `g.portionen` (hier undefined) → `menge` wird `NaN`, Assertions schlagen fehl.

- [ ] **Step 3: Implementierung — `einkauf.js` komplett ersetzen**

```js
import { EINKAUF_KATEGORIEN, istFrisch, portionenSplit } from './mealprepModel'

// Akkumuliert Roh-Zutaten (zutatId → menge) rekursiv über Komponenten.
// skala: Portionsfaktor. seen: Zyklenschutz. Uniform — kein Frisch/TK-Split.
export function sammleZutaten(rezept, skala, rezeptById, acc, seen = new Set()) {
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    acc[zutatId] = (acc[zutatId] ?? 0) + menge * skala
  }
  for (const { rezeptId, menge } of rezept.komponenten ?? []) {
    const basis = rezeptById(rezeptId)
    if (!basis || !basis.ergibtMenge || seen.has(basis.id)) continue
    const basisSkala = (menge * skala) / basis.ergibtMenge
    sammleZutaten(basis, basisSkala, rezeptById, acc, new Set([...seen, basis.id]))
  }
}

// Wie sammleZutaten, aber je Top-Level-Komponente entschieden:
// Frisch-Teile zählen nur für frische Portionen (frischP),
// Einfrier-Teile für alle (totalP). Die Rekursion in eine Basis bleibt uniform.
export function sammleZutatenGesplittet(rezept, frischP, totalP, zutatById, rezeptById, acc) {
  const bp = rezept.basisPortionen || 1
  for (const line of rezept.zutaten ?? []) {
    const count = istFrisch(line, zutatById) ? frischP : totalP
    acc[line.zutatId] = (acc[line.zutatId] ?? 0) + line.menge * (count / bp)
  }
  for (const line of rezept.komponenten ?? []) {
    const basis = rezeptById(line.rezeptId)
    if (!basis || !basis.ergibtMenge) continue
    const count = istFrisch(line, zutatById) ? frischP : totalP
    const basisSkala = (line.menge * (count / bp)) / basis.ergibtMenge
    sammleZutaten(basis, basisSkala, rezeptById, acc, new Set([basis.id]))
  }
}

// korbGerichte: [{ rezept, frisch, bloecke }] (oder Alt-Format { rezept, portionen }).
// Returns: [{ kategorie, items:[{zutatId,name,menge,einheit}] }] — ohne Gewürze, sortiert nach EINKAUF_KATEGORIEN.
export function buildEinkauf(korbGerichte, zutatById, rezeptById) {
  const acc = {}
  for (const g of korbGerichte) {
    const { frisch, total } = portionenSplit(g)
    sammleZutatenGesplittet(g.rezept, frisch, total, zutatById, rezeptById, acc)
  }
  const byKat = {}
  for (const [zutatId, menge] of Object.entries(acc)) {
    const z = zutatById(zutatId)
    if (!z) continue
    if (z.einkaufKategorie === 'Gewürze') continue
    const kat = z.einkaufKategorie || 'Sonstiges'
    ;(byKat[kat] ??= []).push({ zutatId, name: z.name, menge: Math.round(menge), einheit: z.einheit })
  }
  return EINKAUF_KATEGORIEN
    .filter(k => byKat[k] && k !== 'Gewürze')
    .map(kategorie => ({ kategorie, items: byKat[kategorie] }))
}
```

- [ ] **Step 4: Tests laufen lassen → alle grün (alt + neu)**

Run: `npx vitest run src/features/tools/rezepte/einkauf.test.js`
Expected: PASS — neuer Split-Test (600/250) **und** die bestehenden Tests:
- `sammleZutaten`-Tests unverändert grün (Funktion nicht angefasst).
- `buildEinkauf`-Alttest (Hack 1200 g) grün: Alt-Format `{portionen}` → `frisch = total = portionen` → identische Mathematik wie zuvor.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/einkauf.js src/features/tools/rezepte/einkauf.test.js
git commit -m "$(cat <<'EOF'
feat(mealprep): Einkauf rechnet Frisch/TK pro Komponente (Beilage nur frisch)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Gesamt-Verifikation (keine Regression, UI unverändert)

**Files:** keine Änderung — reine Prüfung.

- [ ] **Step 1: Komplette Test-Suite**

Run: `npm test`
Expected: PASS — gesamte Suite grün (inkl. `mealprepStore.test.js`, `naehrwerte.test.js`, `styleguide.test.js`, `storage.test.js`).

- [ ] **Step 2: Lint der berührten Dateien**

Run: `npm run lint`
Expected: keine neuen Fehler in `mealprepModel.js` / `einkauf.js`.

- [ ] **Step 3: Build-Sanity (UI läuft unverändert)**

Run: `npm run build`
Expected: erfolgreicher Build. Kein Aufrufer von `buildEinkauf` (`Einkauf.jsx`, `kochTodo.js`) wurde geändert; deren Verhalten ist durch Task 3 Step 4 abgesichert.

---

## Self-Review (durchgeführt)

**Spec-Abdeckung:** „Frisch vs. TK pro Komponente" → Task 1 (`istFrisch`) + Task 3 (Anwendung). „Mengen-Berechnung: frische Bestandteile × frisch, sonst × (frisch+bloecke)" → Task 3. Erfolgskriterium „Frisch-Komponenten bei TK ausgelassen (Guard-Test)" → Task 3 Step 1. Bewusst **nicht** in Phase 1 (laut Spec-Phasenplan später): `blockGramm`/Einblocken (Phase 4), Froster (Phase 4), Korb schreibt `{frisch,bloecke}` (Phase 3, hier nur tolerant gelesen), neue UI/Shell (Phase 2+).

**Abweichung von der Spec (begründet):** Spec nannte „SCHEMA 9→10 + Migration". Dieser Plan nutzt stattdessen **tolerantes Lesen + Default-at-read** (kein Schema-Bump, keine Datenmutation). Sicherer für Jonas' Daten, gleiches Ergebnis, weniger bewegliche Teile. `blockGramm`-Default und Froster-Backup-Kategorie kommen erst, wenn die Felder real genutzt werden (Phase 4) — dann inkl. der in der Spec geforderten Guard-Tests.

**Platzhalter-Scan:** keine TBD/TODO; jeder Code-Step zeigt vollständigen Code.

**Typ-Konsistenz:** `istFrisch(komponente, zutatById)`, `portionenSplit(o) → {frisch,bloecke,total}`, `sammleZutatenGesplittet(rezept, frischP, totalP, zutatById, rezeptById, acc)` — Signaturen über alle Tasks konsistent verwendet.
