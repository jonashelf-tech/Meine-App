# Mealprep-Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das alte „Rezepte"-Tool (Tab 6, ID `rezepte`) durch ein Block-Freezing-Mealprep-System ersetzen: ein universeller Konfigurator + Großrezepte/Ketten + Sammlung, die in einen zentralen Kochen-Korb einzahlen, der eine Einkaufsliste + eine Kochanleitung erzeugt.

**Architecture:** **Logik strikt von UI getrennt.** Alle Berechnungen (Nährwerte, Einkauf-Auflösung, Kochanleitung-Merge, Portionsverteilung, Storage/CRUD/Schema-Schutz) leben in puren `.js`-Modulen mit Vitest-TDD. Die React-Komponenten (`.jsx`) verdrahten nur die getestete Logik + State und werden **visuell** via Preview verifiziert (kein Render-Test-Setup vorhanden). **Eine Datenquelle:** Zutaten-Katalog + Rezept-Bibliothek in localStorage; die 3 Module sind Ansichten darauf. Quelle der Wahrheit für Verhalten: `docs/superpowers/specs/2026-06-02-mealprep-tool-design.md` (v4).

**Tech Stack:** React 19, Vite, Zustand (`useAppStore` nur für `toolColors` + `setBackInterceptor`), CSS Modules, Vitest (`globals:true`, localStorage-Mock mit `beforeEach`-clear, nur `src/**/*.test.js`). Storage via `sv/lv/SK` aus `src/storage/index.js`.

---

## Datenmodell (Referenz — gilt für alle Tasks, Typ-Konsistenz!)

```
Zutat   { id, name, einheit, einkaufKategorie, per:100,
          naehrwert:{kcal,protein,carbs,fat},
          bausteinTyp: 'protein'|'kh'|'gemuese'|'sauce'|null,
          gProPortion:number|null, garNotiz:string|null }

Rezept  { id, name, kategorien:string[], basisPortionen:number,
          aufbewahrung:{tk:bool, behaelter:string[]},
          langlaeufer:bool, konfigurierbar:bool,
          zutaten:[{zutatId,menge}], komponenten:[{rezeptId,menge}],
          anleitung:string,
          ergibtMenge:number|null, ergibtEinheit:string|null }   // Basis ⟺ ergibtMenge!=null

Korb    { id, name, eintraege:[{ref, portionen}], gespeichert:bool }
          // ref = rezeptId(string) | Inline-Gericht {name,kategorien,basisPortionen,zutaten,komponenten}

Settings{ kalenderLink:false, standardPortionen:4 }
```

**Abgeleitete Rollen (nie als Feld speichern):** Basis ⟺ `ergibtMenge!=null` · Ableitung ⟺ `komponenten.length>0` · Konfig-Gericht ⟺ `konfigurierbar===true`.

**Bewusste Verfeinerung ggü. Spec §3.2/§3.3:** `naehrwertProEinheit` wird **nicht** gespeichert, sondern **rekursiv berechnet** (Basis-Gesamtnährwert ÷ `ergibtMenge`). Treuer zum Spec-Prinzip „Rezept-Nährwerte gerechnet, keine Doppelpflege". Falls unerwünscht → vor Phase 1 melden.

---

## File Structure

Alle Dateien flach in `src/features/tools/rezepte/` (folgt Konvention von `tools/haushalt/`):

| Datei | Verantwortung | Typ |
|---|---|---|
| `mealprepModel.js` | `genId`, Konstanten (`SCHEMA_VERSION`, `SLOTS`, `BEHAELTER`, `EINKAUF_KATEGORIEN`), Factories (`createZutat/createRezept/createKorb`), `istBasis()` | Logik (TDD) |
| `mealprepStore.js` | `loadAll/saveX` (lv/sv), Altdaten-Schema-Schutz, CRUD, `findUsages` (Referenz-Integrität) | Logik (TDD) |
| `naehrwerte.js` | `zutatNaehrwert`, `rezeptNaehrwertGesamt` (rekursiv, Zyklenschutz), `rezeptProPortion`, `formatNaehrwert` | Logik (TDD) |
| `einkauf.js` | `sammleZutaten` (rekursive Basen-Auflösung), `buildEinkauf` (konsolidieren, Gewürz-Filter, gruppieren) | Logik (TDD) |
| `kochanleitung.js` | `buildKochanleitung` (geteilte Basen 1×, Mise-en-Place, Phasen, Verpackung) | Logik (TDD) |
| `konfigurator.js` | `verteilePortionen`, `rezeptAusKonfig`, `konfigAusRezept` | Logik (TDD) |
| `seed.js` | Seed-Katalog + Seed-Rezepte (Erststart-Content) | Daten |
| `TabRezepte.jsx` + `.module.css` | Container: ToolHeader, Modul-Tabs, Korb-Pille, Overlay-Routing | UI |
| `Naehrwert.jsx` | Mini-Anzeige `480 · 35P 22F 38KH` (shared, nutzt TabRezepte-CSS) | UI |
| `Editor.jsx` + `.module.css` | Universelles typ-adaptives Modal (Form A Baustein / Form B Rezept) | UI |
| `Sammlung.jsx` + `.module.css` | Kategorie-Karten, +Rezept/+Kategorie/✎ | UI |
| `Grossrezepte.jsx` + `.module.css` | Basis-Karten + Ableitungen | UI |
| `Konfigurator.jsx` + `.module.css` | Slot-Baukasten, Portionsverteilung, Speichern-als-Rezept | UI |
| `Korb.jsx` + `.module.css` | Korb-Overlay + Menüs | UI |
| `Einkauf.jsx` + `.module.css` | Einkaufsliste (tap-states) | UI |
| `Kochanleitung.jsx` + `.module.css` | Gerenderte Anleitung | UI |

**Geändert (bestehend):** `src/storage/index.js` (3 SK-Keys + BACKUP_CATS), `src/features/tools/toolRegistry.jsx` (Name „Mealprep"). **Gelöscht:** alte `TabRezepte.jsx`-Inhalte (komplett ersetzt).

**UI-Verifikation (statt Render-Tests):** `npm run dev` → Tab „Mealprep" → die im jeweiligen Task genannten Schritte durchklicken. Visuelle Vorlage: `Dateien/output/mealprep-mockup.html`.

---

# PHASE 1 — Fundament (rein testbar, noch keine UI)

### Task 1: Storage-Keys + Backup-Kategorien

**Files:**
- Modify: `src/storage/index.js:52-55` (SK) und `:106-112` (BACKUP_CATS.tools)
- Test: `src/storage/storage.test.js` (ergänzen)

- [ ] **Step 1: Failing test** — in `src/storage/storage.test.js` am Ende ergänzen:

```js
describe('Mealprep-Keys', () => {
  it('hat die 3 neuen Rezepte-Keys', () => {
    expect(SK.rezepteZutaten).toBe('adhs_recipes_ingredients')
    expect(SK.rezepteKoerbe).toBe('adhs_recipes_baskets')
    expect(SK.rezepteSettings).toBe('adhs_recipes_settings')
  })
  it('alle Mealprep-Nutzdaten-Keys sind in BACKUP_CATS.tools', () => {
    ;[SK.recipes, SK.rezepteZutaten, SK.rezepteKoerbe, SK.rezepteSettings,
      SK.selectedDishes].forEach(k => expect(BACKUP_CATS.tools).toContain(k))
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- storage` → FAIL (`SK.rezepteZutaten` undefined).

- [ ] **Step 3: Implement** — in `SK` (nach `selectedDishes`, Zeile 55) ergänzen:

```js
  rezepteZutaten:  `${PREFIX}recipes_ingredients`,
  rezepteKoerbe:   `${PREFIX}recipes_baskets`,
  rezepteSettings: `${PREFIX}recipes_settings`,
```

In `BACKUP_CATS.tools` (Zeile 107) die `SK.recipes`-Zeile erweitern zu:

```js
    SK.recipes, SK.rezepteZutaten, SK.rezepteKoerbe, SK.rezepteSettings,
    SK.shopping, SK.shoppingStates, SK.selectedDishes,
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- storage` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/index.js src/storage/storage.test.js
git commit -m "feat(mealprep): storage keys + backup cats"
```

---

### Task 2: Datenmodell — Factories & Konstanten

**Files:**
- Create: `src/features/tools/rezepte/mealprepModel.js`
- Test: `src/features/tools/rezepte/mealprepModel.test.js`

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import {
  genId, SCHEMA_VERSION, SLOTS, BEHAELTER, EINKAUF_KATEGORIEN,
  createZutat, createRezept, createKorb, istBasis,
} from './mealprepModel'

describe('Konstanten', () => {
  it('SLOTS sind die 4 Konfigurator-Kategorien', () => {
    expect(SLOTS).toEqual(['protein', 'kh', 'gemuese', 'sauce'])
  })
  it('Gewürze ist eine Einkaufskategorie (für Ausschluss)', () => {
    expect(EINKAUF_KATEGORIEN).toContain('Gewürze')
  })
})

describe('createZutat', () => {
  it('setzt Defaults + eigene ID', () => {
    const z = createZutat({ name: 'Reis', bausteinTyp: 'kh' })
    expect(z.id).toBeTruthy()
    expect(z.name).toBe('Reis')
    expect(z.per).toBe(100)
    expect(z.bausteinTyp).toBe('kh')
    expect(z.naehrwert).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })
  it('zwei Aufrufe → verschiedene IDs', () => {
    expect(createZutat().id).not.toBe(createZutat().id)
  })
})

describe('createRezept', () => {
  it('Defaults: leere Listen, nicht konfigurierbar, keine Basis', () => {
    const r = createRezept({ name: 'Chili' })
    expect(r.zutaten).toEqual([])
    expect(r.komponenten).toEqual([])
    expect(r.konfigurierbar).toBe(false)
    expect(r.aufbewahrung).toEqual({ tk: false, behaelter: [] })
    expect(istBasis(r)).toBe(false)
  })
  it('istBasis true wenn ergibtMenge gesetzt', () => {
    expect(istBasis(createRezept({ name: 'Tomatensoße', ergibtMenge: 2000, ergibtEinheit: 'ml' }))).toBe(true)
  })
})

describe('createKorb', () => {
  it('Defaults: leer, nicht gespeichert', () => {
    const k = createKorb()
    expect(k.eintraege).toEqual([])
    expect(k.gespeichert).toBe(false)
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- mealprepModel` → FAIL (Modul fehlt).

- [ ] **Step 3: Implement** — `mealprepModel.js`:

```js
// Datenmodell-Factories + Konstanten für das Mealprep-Tool.
export const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const SCHEMA_VERSION = 2   // 1 = altes Rezepte-Tool, 2 = Mealprep

export const SLOTS = ['protein', 'kh', 'gemuese', 'sauce']
export const SLOT_LABELS = { protein: 'Protein', kh: 'Kohlenhydrate', gemuese: 'Gemüse', sauce: 'Sauce' }
export const BEHAELTER = ['Box', 'Blockform', 'Glas', 'Eiswürfel', 'frisch']
export const EINKAUF_KATEGORIEN = [
  'Fleisch & Fisch', 'Milchprodukte', 'Brot & Getreide',
  'Konserven & Trockenwaren', 'Gemüse & Obst', 'Gewürze', 'Sonstiges',
]

export const createZutat = (o = {}) => ({
  id: o.id ?? genId(),
  name: o.name ?? '',
  einheit: o.einheit ?? 'g',
  einkaufKategorie: o.einkaufKategorie ?? 'Sonstiges',
  per: o.per ?? 100,
  naehrwert: o.naehrwert ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  bausteinTyp: o.bausteinTyp ?? null,
  gProPortion: o.gProPortion ?? null,
  garNotiz: o.garNotiz ?? null,
})

export const createRezept = (o = {}) => ({
  id: o.id ?? genId(),
  name: o.name ?? '',
  kategorien: o.kategorien ?? [],
  basisPortionen: o.basisPortionen ?? 4,
  aufbewahrung: o.aufbewahrung ?? { tk: false, behaelter: [] },
  langlaeufer: o.langlaeufer ?? false,
  konfigurierbar: o.konfigurierbar ?? false,
  zutaten: o.zutaten ?? [],
  komponenten: o.komponenten ?? [],
  anleitung: o.anleitung ?? '',
  ergibtMenge: o.ergibtMenge ?? null,
  ergibtEinheit: o.ergibtEinheit ?? null,
})

export const createKorb = (o = {}) => ({
  id: o.id ?? genId(),
  name: o.name ?? '',
  eintraege: o.eintraege ?? [],
  gespeichert: o.gespeichert ?? false,
})

export const istBasis = (r) => r?.ergibtMenge != null
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- mealprepModel` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/mealprepModel.js src/features/tools/rezepte/mealprepModel.test.js
git commit -m "feat(mealprep): data model factories + constants"
```

---

### Task 3: Store — Laden mit Altdaten-Schema-Schutz

**Files:**
- Create: `src/features/tools/rezepte/mealprepStore.js`
- Test: `src/features/tools/rezepte/mealprepStore.test.js`

**Warum:** Das alte Tool nutzte `adhs_recipes_list` mit Schema `{cookingTime, tkSuitable, ingredients:[{category}], nutrition}`. Beim ersten Start des neuen Tools darf das nicht als neues Rezept fehlinterpretiert werden → Schema-Marker entscheidet.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import { sv, lv, SK } from '../../../storage'
import { loadAll, saveZutaten, saveRezepte } from './mealprepStore'
import { SCHEMA_VERSION } from './mealprepModel'

describe('loadAll — Erststart & Schema-Schutz', () => {
  it('liefert Seed bei komplett leerem Storage und setzt Schema-Marker', () => {
    const { zutaten, rezepte, version } = loadAll()
    expect(version).toBe(SCHEMA_VERSION)
    expect(zutaten.length).toBeGreaterThan(0)   // Seed-Katalog
    expect(rezepte.length).toBeGreaterThan(0)    // Seed-Rezepte
    expect(lv(`${SK.recipes}__v`, 0)).toBe(SCHEMA_VERSION)  // Marker persistiert
  })

  it('verwirft Altdaten ohne Schema-Marker und seedet neu', () => {
    sv(SK.recipes, [{ id: 1, name: 'Alt', cookingTime: 30, tkSuitable: true }])
    const { rezepte } = loadAll()
    expect(rezepte.some(r => r.name === 'Alt')).toBe(false)
    expect(rezepte.every(r => 'kategorien' in r)).toBe(true)  // neues Schema
  })

  it('behält Daten mit aktuellem Schema-Marker', () => {
    sv(`${SK.recipes}__v`, SCHEMA_VERSION)
    saveRezepte([{ id: 'x', name: 'Mein Chili', kategorien: ['Onepot'] }])
    saveZutaten([{ id: 'z', name: 'Reis' }])
    const { rezepte, zutaten } = loadAll()
    expect(rezepte).toEqual([{ id: 'x', name: 'Mein Chili', kategorien: ['Onepot'] }])
    expect(zutaten).toEqual([{ id: 'z', name: 'Reis' }])
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- mealprepStore` → FAIL (Modul + seed fehlen). *(Seed wird in Task 6 mit echtem Inhalt gefüllt; hier ein Minimal-Stub anlegen, damit der Test läuft.)*

- [ ] **Step 3: Implement** — zuerst Stub `seed.js`:

```js
// Wird in Task 6 mit echtem Content gefüllt. Bis dahin Minimal-Seed.
import { createZutat, createRezept } from './mealprepModel'
export const seedZutaten = () => [createZutat({ name: 'Reis (trocken)', einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh', gProPortion: 80, naehrwert: { kcal: 350, protein: 7, carbs: 78, fat: 1 } })]
export const seedRezepte = () => [createRezept({ name: 'Beispiel-Chili', kategorien: ['Onepot/Auflauf'], basisPortionen: 4 })]
```

Dann `mealprepStore.js`:

```js
import { sv, lv, SK } from '../../../storage'
import { SCHEMA_VERSION } from './mealprepModel'
import { seedZutaten, seedRezepte } from './seed'

const VKEY = `${SK.recipes}__v`   // Schema-Versions-Marker

export const saveZutaten  = (list) => sv(SK.rezepteZutaten, list)
export const saveRezepte  = (list) => sv(SK.recipes, list)
export const saveKoerbe   = (list) => sv(SK.rezepteKoerbe, list)
export const saveSettings = (obj)  => sv(SK.rezepteSettings, obj)

// Liest alles; seedet bei Erststart / verwirft inkompatible Altdaten.
export function loadAll() {
  const version = lv(VKEY, 0)
  if (version !== SCHEMA_VERSION) {
    // Erststart oder Altschema → frisch seeden
    const zutaten = seedZutaten()
    const rezepte = seedRezepte()
    saveZutaten(zutaten)
    saveRezepte(rezepte)
    saveKoerbe([])
    saveSettings({ kalenderLink: false, standardPortionen: 4 })
    sv(VKEY, SCHEMA_VERSION)
    return { zutaten, rezepte, koerbe: [], settings: { kalenderLink: false, standardPortionen: 4 }, version: SCHEMA_VERSION }
  }
  return {
    zutaten:  lv(SK.rezepteZutaten, []),
    rezepte:  lv(SK.recipes, []),
    koerbe:   lv(SK.rezepteKoerbe, []),
    settings: lv(SK.rezepteSettings, { kalenderLink: false, standardPortionen: 4 }),
    version,
  }
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- mealprepStore` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/mealprepStore.js src/features/tools/rezepte/mealprepStore.test.js src/features/tools/rezepte/seed.js
git commit -m "feat(mealprep): store load + schema guard against old data"
```

---

### Task 4: Store — CRUD + Referenz-Integrität (`findUsages`)

**Files:**
- Modify: `src/features/tools/rezepte/mealprepStore.js`
- Test: `src/features/tools/rezepte/mealprepStore.test.js` (ergänzen)

- [ ] **Step 1: Failing test** — ergänzen:

```js
import { findUsages } from './mealprepStore'

describe('findUsages — Referenz-Integrität', () => {
  const rezepte = [
    { id: 'tomate', name: 'Tomatensoße', komponenten: [], zutaten: [{ zutatId: 'z1', menge: 500 }] },
    { id: 'bolo',   name: 'Bolognese',   komponenten: [{ rezeptId: 'tomate', menge: 600 }], zutaten: [] },
    { id: 'chili',  name: 'Chili',       komponenten: [{ rezeptId: 'tomate', menge: 400 }], zutaten: [] },
  ]
  const koerbe = [{ id: 'k1', name: 'Woche', eintraege: [{ ref: 'tomate', portionen: 4 }] }]

  it('findet Rezepte + Körbe, die eine Basis nutzen', () => {
    const u = findUsages('tomate', rezepte, koerbe)
    expect(u.rezepte.map(r => r.name).sort()).toEqual(['Bolognese', 'Chili'])
    expect(u.koerbe.map(k => k.name)).toEqual(['Woche'])
  })

  it('findet Rezepte, die eine Zutat nutzen', () => {
    const u = findUsages('z1', rezepte, koerbe)
    expect(u.rezepte.map(r => r.name)).toEqual(['Tomatensoße'])
  })

  it('leere Nutzung wenn nirgends referenziert', () => {
    const u = findUsages('unbenutzt', rezepte, koerbe)
    expect(u.rezepte).toEqual([])
    expect(u.koerbe).toEqual([])
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- mealprepStore` → FAIL (`findUsages` undefined).

- [ ] **Step 3: Implement** — in `mealprepStore.js` ergänzen:

```js
// Wo wird eine Zutat ODER ein Rezept (id) verwendet? Für Lösch-Warnung.
export function findUsages(id, rezepte, koerbe) {
  const usedInRezepte = rezepte.filter(r =>
    (r.zutaten ?? []).some(z => z.zutatId === id) ||
    (r.komponenten ?? []).some(k => k.rezeptId === id)
  )
  const usedInKoerbe = koerbe.filter(k =>
    (k.eintraege ?? []).some(e => e.ref === id ||
      (typeof e.ref === 'object' && (
        (e.ref.zutaten ?? []).some(z => z.zutatId === id) ||
        (e.ref.komponenten ?? []).some(c => c.rezeptId === id)
      )))
  )
  return { rezepte: usedInRezepte, koerbe: usedInKoerbe }
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- mealprepStore` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/mealprepStore.js src/features/tools/rezepte/mealprepStore.test.js
git commit -m "feat(mealprep): findUsages for reference integrity"
```

---

### Task 5: Nährwerte — rekursive Berechnung + Format

**Files:**
- Create: `src/features/tools/rezepte/naehrwerte.js`
- Test: `src/features/tools/rezepte/naehrwerte.test.js`

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import { zutatNaehrwert, rezeptNaehrwertGesamt, rezeptProPortion, formatNaehrwert } from './naehrwerte'

const ZUTATEN = {
  reis:   { id: 'reis',   per: 100, naehrwert: { kcal: 350, protein: 7, carbs: 78, fat: 1 } },
  tomate: { id: 'tomate', per: 100, naehrwert: { kcal: 20,  protein: 1, carbs: 4,  fat: 0 } },
  hack:   { id: 'hack',   per: 100, naehrwert: { kcal: 200, protein: 18, carbs: 0, fat: 14 } },
}
const zById = (id) => ZUTATEN[id]

describe('zutatNaehrwert — skaliert auf Menge', () => {
  it('200 g Reis = 2× per-100-Wert', () => {
    expect(zutatNaehrwert(ZUTATEN.reis, 200)).toEqual({ kcal: 700, protein: 14, carbs: 156, fat: 2 })
  })
})

describe('rezeptNaehrwertGesamt — Zutaten + Komponenten rekursiv', () => {
  const basis = { id: 'soße', basisPortionen: 1, ergibtMenge: 1000, ergibtEinheit: 'ml',
                  zutaten: [{ zutatId: 'tomate', menge: 1000 }], komponenten: [] }
  const rById = (id) => (id === 'soße' ? basis : null)

  it('summiert rohe Zutaten', () => {
    const r = { basisPortionen: 1, zutaten: [{ zutatId: 'reis', menge: 100 }], komponenten: [] }
    expect(rezeptNaehrwertGesamt(r, zById, rById)).toEqual({ kcal: 350, protein: 7, carbs: 78, fat: 1 })
  })

  it('löst Komponente anteilig auf (500 ml von 1000-ml-Basis = halber Nährwert)', () => {
    const r = { basisPortionen: 1, zutaten: [], komponenten: [{ rezeptId: 'soße', menge: 500 }] }
    // Basis-Gesamt: 1000 g Tomate = 10× per-100 = {200,10,40,0}; davon 500/1000 = Hälfte
    expect(rezeptNaehrwertGesamt(r, zById, rById)).toEqual({ kcal: 100, protein: 5, carbs: 20, fat: 0 })
  })

  it('Zyklus bricht ab statt Endlosschleife', () => {
    const a = { id: 'a', basisPortionen: 1, ergibtMenge: 100, zutaten: [], komponenten: [{ rezeptId: 'a', menge: 50 }] }
    const rec = (id) => (id === 'a' ? a : null)
    expect(() => rezeptNaehrwertGesamt(a, zById, rec)).not.toThrow()
  })
})

describe('rezeptProPortion + format', () => {
  it('teilt durch basisPortionen', () => {
    const r = { basisPortionen: 2, zutaten: [{ zutatId: 'hack', menge: 200 }], komponenten: [] }
    expect(rezeptProPortion(r, zById, () => null)).toEqual({ kcal: 200, protein: 18, carbs: 0, fat: 14 })
  })
  it('formatiert als "kcal · NP NF NKH"', () => {
    expect(formatNaehrwert({ kcal: 480.4, protein: 35, carbs: 38, fat: 22 })).toBe('480 · 35P 22F 38KH')
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- naehrwerte` → FAIL.

- [ ] **Step 3: Implement** — `naehrwerte.js`:

```js
const ZERO = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
const add = (a, b) => { a.kcal += b.kcal; a.protein += b.protein; a.carbs += b.carbs; a.fat += b.fat; return a }
const scale = (n, f) => ({ kcal: n.kcal * f, protein: n.protein * f, carbs: n.carbs * f, fat: n.fat * f })

export function zutatNaehrwert(zutat, menge) {
  return scale(zutat.naehrwert ?? ZERO(), menge / (zutat.per || 100))
}

// Gesamt-Nährwert eines Rezepts (nicht pro Portion). Rekursiv über Komponenten, Zyklenschutz.
export function rezeptNaehrwertGesamt(rezept, zutatById, rezeptById, seen = new Set()) {
  if (!rezept || seen.has(rezept.id)) return ZERO()
  if (rezept.id != null) seen.add(rezept.id)
  const sum = ZERO()
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    const z = zutatById(zutatId)
    if (z) add(sum, zutatNaehrwert(z, menge))
  }
  for (const { rezeptId, menge } of rezept.komponenten ?? []) {
    const basis = rezeptById(rezeptId)
    if (!basis || !basis.ergibtMenge) continue
    const gesamt = rezeptNaehrwertGesamt(basis, zutatById, rezeptById, seen)
    add(sum, scale(gesamt, menge / basis.ergibtMenge))
  }
  return sum
}

export function rezeptProPortion(rezept, zutatById, rezeptById) {
  const g = rezeptNaehrwertGesamt(rezept, zutatById, rezeptById)
  const p = rezept.basisPortionen || 1
  return scale(g, 1 / p)
}

export const formatNaehrwert = (n) =>
  `${Math.round(n.kcal)} · ${Math.round(n.protein)}P ${Math.round(n.fat)}F ${Math.round(n.carbs)}KH`
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- naehrwerte` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/naehrwerte.js src/features/tools/rezepte/naehrwerte.test.js
git commit -m "feat(mealprep): recursive nutrition calculation + format"
```

---

### Task 6: Seed-Content (echter Initial-Inhalt)

**Files:**
- Modify: `src/features/tools/rezepte/seed.js` (Stub aus Task 3 ersetzen)
- Test: `src/features/tools/rezepte/seed.test.js`

**Quelle:** `Dateien/output/mealprep-rezepte.md` (Teil 5: Konfigurator-Bausteine + Master-Batch-Ketten). Mindestumfang: je 3-5 Bausteine pro Slot, 2 Basen (Tomatensoße, Pulled Chicken) mit je 2 Ableitungen, 1 Bowl + 1 Burrito (konfigurierbar). IDs **stabil** (feste Strings, nicht `genId`), damit Komponenten-Referenzen halten.

- [ ] **Step 1: Failing test** — `seed.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { seedZutaten, seedRezepte } from './seed'
import { rezeptNaehrwertGesamt } from './naehrwerte'

describe('Seed-Integrität', () => {
  const zutaten = seedZutaten()
  const rezepte = seedRezepte()
  const zById = (id) => zutaten.find(z => z.id === id)
  const rById = (id) => rezepte.find(r => r.id === id)

  it('jeder Slot hat mindestens 3 Bausteine', () => {
    for (const slot of ['protein', 'kh', 'gemuese', 'sauce']) {
      expect(zutaten.filter(z => z.bausteinTyp === slot).length).toBeGreaterThanOrEqual(3)
    }
  })
  it('alle Komponenten-Referenzen zeigen auf existierende Rezepte', () => {
    for (const r of rezepte) {
      for (const k of r.komponenten ?? []) expect(rById(k.rezeptId)).toBeTruthy()
    }
  })
  it('alle Zutaten-Referenzen zeigen auf existierende Zutaten', () => {
    for (const r of rezepte) {
      for (const z of r.zutaten ?? []) expect(zById(z.zutatId)).toBeTruthy()
    }
  })
  it('mindestens 1 Basis + 1 konfigurierbares Rezept', () => {
    expect(rezepte.some(r => r.ergibtMenge != null)).toBe(true)
    expect(rezepte.some(r => r.konfigurierbar)).toBe(true)
  })
  it('Nährwert-Berechnung wirft bei keinem Seed-Rezept', () => {
    for (const r of rezepte) expect(() => rezeptNaehrwertGesamt(r, zById, rById)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- seed` → FAIL (Stub erfüllt Mindestumfang nicht).

- [ ] **Step 3: Implement** — `seed.js` mit festen IDs ausschreiben. Struktur (Werte aus `mealprep-rezepte.md` übernehmen):

```js
import { createZutat, createRezept } from './mealprepModel'

export const seedZutaten = () => [
  // PROTEIN
  createZutat({ id: 'z_haehnchen', name: 'Hähnchenbrust', einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 200, garNotiz: 'scharf anbraten', naehrwert: { kcal: 110, protein: 23, carbs: 0, fat: 2 } }),
  createZutat({ id: 'z_hack',      name: 'Rinderhack',    einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 150, garNotiz: 'krümelig braten', naehrwert: { kcal: 200, protein: 18, carbs: 0, fat: 14 } }),
  createZutat({ id: 'z_tofu',      name: 'Tofu',          einkaufKategorie: 'Milchprodukte',    bausteinTyp: 'protein', gProPortion: 150, garNotiz: 'pressen, anbraten', naehrwert: { kcal: 120, protein: 13, carbs: 2, fat: 7 } }),
  createZutat({ id: 'z_lachs',     name: 'Lachsfilet',    einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 180, garNotiz: 'Haut knusprig', naehrwert: { kcal: 200, protein: 20, carbs: 0, fat: 13 } }),
  // KH
  createZutat({ id: 'z_reis',   name: 'Reis (trocken)', einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh', gProPortion: 80,  garNotiz: 'kochen 1:2', naehrwert: { kcal: 350, protein: 7,  carbs: 78, fat: 1 } }),
  createZutat({ id: 'z_pasta',  name: 'Pasta (trocken)',einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh', gProPortion: 90,  garNotiz: 'al dente',  naehrwert: { kcal: 360, protein: 12, carbs: 72, fat: 2 } }),
  createZutat({ id: 'z_wrap',   name: 'Wrap',           einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh', gProPortion: 64,  garNotiz: 'kurz erwärmen', naehrwert: { kcal: 300, protein: 8, carbs: 50, fat: 7 } }),
  createZutat({ id: 'z_kartoffel', name: 'Kartoffeln', einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'kh', gProPortion: 250, garNotiz: 'Ofen 200°C', naehrwert: { kcal: 77, protein: 2, carbs: 17, fat: 0 } }),
  // GEMÜSE
  createZutat({ id: 'z_brokkoli', name: 'Brokkoli',   einkaufKategorie: 'Gemüse & Obst', bausteinTyp: 'gemuese', gProPortion: 200, garNotiz: 'dämpfen', naehrwert: { kcal: 34, protein: 3, carbs: 7, fat: 0 } }),
  createZutat({ id: 'z_paprika',  name: 'Paprika',    einkaufKategorie: 'Gemüse & Obst', bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Streifen, anbraten', naehrwert: { kcal: 31, protein: 1, carbs: 6, fat: 0 } }),
  createZutat({ id: 'z_zucchini', name: 'Zucchini',   einkaufKategorie: 'Gemüse & Obst', bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Würfel, braten', naehrwert: { kcal: 17, protein: 1, carbs: 3, fat: 0 } }),
  createZutat({ id: 'z_spinat',   name: 'Blattspinat',einkaufKategorie: 'Gemüse & Obst', bausteinTyp: 'gemuese', gProPortion: 100, garNotiz: 'zusammenfallen lassen', naehrwert: { kcal: 23, protein: 3, carbs: 1, fat: 0 } }),
  // SAUCE
  createZutat({ id: 'z_currysauce', name: 'Kokos-Curry-Sauce', einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 120, garNotiz: 'köcheln', naehrwert: { kcal: 90, protein: 1, carbs: 4, fat: 8 } }),
  createZutat({ id: 'z_teriyaki',   name: 'Teriyaki-Sauce',    einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 40,  garNotiz: 'einreduzieren', naehrwert: { kcal: 130, protein: 3, carbs: 28, fat: 0 } }),
  createZutat({ id: 'z_frischkaese',name: 'Körniger Frischkäse',einkaufKategorie: 'Milchprodukte',           bausteinTyp: 'sauce', gProPortion: 100, garNotiz: 'unterrühren', naehrwert: { kcal: 100, protein: 12, carbs: 3, fat: 5 } }),
  // ZUTATEN für Basen (kein bausteinTyp)
  createZutat({ id: 'z_dosentomaten', name: 'Dosentomaten', einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 20, protein: 1, carbs: 4, fat: 0 } }),
  createZutat({ id: 'z_zwiebel',      name: 'Zwiebeln',     einkaufKategorie: 'Gemüse & Obst',             naehrwert: { kcal: 40, protein: 1, carbs: 9, fat: 0 } }),
  createZutat({ id: 'z_pulledchick',  name: 'Hähnchenschenkel', einkaufKategorie: 'Fleisch & Fisch',       naehrwert: { kcal: 180, protein: 19, carbs: 0, fat: 11 } }),
  createZutat({ id: 'z_salz',         name: 'Salz',         einkaufKategorie: 'Gewürze',                   naehrwert: { kcal: 0, protein: 0, carbs: 0, fat: 0 } }),
]

export const seedRezepte = () => [
  // BASEN
  createRezept({ id: 'r_tomatensauce', name: 'Tomatensoße (Basis)', kategorien: ['Saucen'], basisPortionen: 8,
    ergibtMenge: 2000, ergibtEinheit: 'ml', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [{ zutatId: 'z_dosentomaten', menge: 1600 }, { zutatId: 'z_zwiebel', menge: 300 }, { zutatId: 'z_salz', menge: 10 }],
    anleitung: 'Zwiebeln glasig, Dosentomaten dazu, 30 Min köcheln, pürieren.' }),
  createRezept({ id: 'r_pulledchicken', name: 'Pulled Chicken (Basis)', kategorien: ['Saucen'], basisPortionen: 6,
    ergibtMenge: 1200, ergibtEinheit: 'g', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [{ zutatId: 'z_pulledchick', menge: 1500 }, { zutatId: 'z_salz', menge: 15 }],
    anleitung: 'Schenkel 3 h schmoren, zerzupfen.' }),
  // ABLEITUNGEN
  createRezept({ id: 'r_bolognese', name: 'Bolognese', kategorien: ['Onepot/Auflauf'], basisPortionen: 4,
    aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [{ zutatId: 'z_hack', menge: 500 }], komponenten: [{ rezeptId: 'r_tomatensauce', menge: 800 }],
    anleitung: 'Hack braten, Tomatensoße dazu, köcheln.' }),
  createRezept({ id: 'r_chili', name: 'Chili', kategorien: ['Onepot/Auflauf'], basisPortionen: 4,
    aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [{ zutatId: 'z_hack', menge: 400 }], komponenten: [{ rezeptId: 'r_tomatensauce', menge: 600 }],
    anleitung: 'Hack braten, Tomatensoße + Bohnen, scharf abschmecken.' }),
  // KONFIGURIERBAR (Bowl + Burrito)
  createRezept({ id: 'r_koreanbowl', name: 'Korean Beef Bowl', kategorien: ['Bowls'], basisPortionen: 4, konfigurierbar: true,
    aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [{ zutatId: 'z_hack', menge: 600 }, { zutatId: 'z_reis', menge: 320 }, { zutatId: 'z_brokkoli', menge: 800 }, { zutatId: 'z_teriyaki', menge: 160 }],
    anleitung: 'Reis kochen, Hack mit Teriyaki braten, Brokkoli dämpfen, schichten.' }),
  createRezept({ id: 'r_burrito', name: 'Burrito', kategorien: ['Burritos'], basisPortionen: 6, konfigurierbar: true,
    aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [{ zutatId: 'z_wrap', menge: 384 }], komponenten: [{ rezeptId: 'r_chili', menge: 900 }, { rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: 'Chili + Pulled Chicken auf Wrap, rollen, optional anbraten.' }),
]
```

*(Mengen/Nährwerte sind plausible Startwerte — der Nutzer editiert sie in-app. Wichtig ist die Struktur + valide Referenzen.)*

- [ ] **Step 4: Run, verify PASS** — `npm test -- seed` und `npm test` (alles grün).

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/seed.js src/features/tools/rezepte/seed.test.js
git commit -m "feat(mealprep): seed catalog + recipes with valid references"
```

---

# PHASE 2 — Container, Editor, Sammlung (erstes Sichtbares)

**Ab hier UI: nach jedem Task `npm run dev` und die Schritte durchklicken. Keine Render-Tests.**

### Task 7: Container TabRezepte (Gerüst, ersetzt altes Tool)

**Files:**
- Rewrite: `src/features/tools/rezepte/TabRezepte.jsx` (komplett)
- Rewrite: `src/features/tools/rezepte/TabRezepte.module.css`
- Modify: `src/features/tools/toolRegistry.jsx` (Name „Mealprep")

**Verantwortung:** Lädt State via `loadAll()`, hält Zutaten/Rezepte/Körbe/Settings + aktuellen Korb in `useState`, persistiert über `saveX`. Rendert ToolHeader + Modul-Tabs (`konfig`/`gross`/`sammlung`) + schwebende Korb-Pille + Overlay-Routing (Editor/Korb/Einkauf/Anleitung). Reicht Daten + Callbacks an Modul-Komponenten (Phase 2-4 füllen sie).

- [ ] **Step 1:** `toolRegistry.jsx` — `rezepte`-Eintrag `name: 'Rezepte'` → `name: 'Mealprep'` (Icon/ID bleiben).

- [ ] **Step 2:** `TabRezepte.jsx` neu — Grundgerüst:

```jsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { loadAll, saveZutaten, saveRezepte, saveKoerbe, saveSettings } from './mealprepStore'
import { createKorb } from './mealprepModel'
import Sammlung from './Sammlung'
import Grossrezepte from './Grossrezepte'
import Konfigurator from './Konfigurator'
import Editor from './Editor'
import Korb from './Korb'
import s from './TabRezepte.module.css'

const MODULE = [['konfig', 'Konfigurator'], ['gross', 'Großrezepte'], ['sammlung', 'Sammlung']]

export default function TabRezepte({ onBack }) {
  const { toolColors, setBackInterceptor } = useAppStore()
  const toolColor = getToolColor('rezepte', toolColors)

  const init = useMemo(() => loadAll(), [])
  const [zutaten, setZutatenS] = useState(init.zutaten)
  const [rezepte, setRezepteS] = useState(init.rezepte)
  const [koerbe,  setKoerbeS]  = useState(init.koerbe)
  const [settings, setSettingsS] = useState(init.settings)
  const [korb, setKorb] = useState(() => createKorb({ name: 'Aktueller Korb' }))  // aktueller Arbeits-Korb

  const [modul, setModul] = useState('konfig')
  const [editing, setEditing] = useState(null)   // {form:'zutat'|'rezept', data} | null
  const [korbOpen, setKorbOpen] = useState(false)
  const [konfigLoad, setKonfigLoad] = useState(null)  // Rezept, das in Konfigurator geladen werden soll

  // Persistenz-Wrapper
  const setZutaten = useCallback(v => { setZutatenS(v); saveZutaten(v) }, [])
  const setRezepte = useCallback(v => { setRezepteS(v); saveRezepte(v) }, [])
  const setKoerbe  = useCallback(v => { setKoerbeS(v);  saveKoerbe(v) }, [])
  const setSettings= useCallback(v => { setSettingsS(v); saveSettings(v) }, [])

  // Hardware-Back schließt Overlays zuerst
  useEffect(() => {
    const hasOverlay = editing || korbOpen
    setBackInterceptor(hasOverlay ? () => { setEditing(null); setKorbOpen(false) } : null)
    return () => setBackInterceptor(null)
  }, [editing, korbOpen, setBackInterceptor])

  // Lookup-Helfer für Kinder
  const zById = useCallback(id => zutaten.find(z => z.id === id), [zutaten])
  const rById = useCallback(id => rezepte.find(r => r.id === id), [rezepte])

  const addToKorb = useCallback((ref, portionen) => {
    setKorb(k => ({ ...k, eintraege: [...k.eintraege, { ref, portionen }] }))
  }, [])

  const ladeInKonfigurator = useCallback((rezept) => { setKonfigLoad(rezept); setModul('konfig') }, [])

  const sharedProps = { zutaten, rezepte, setZutaten, setRezepte, zById, rById, toolColor,
                        onEdit: setEditing, addToKorb }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      {editing && (
        <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <Editor {...editing} zutaten={zutaten} rezepte={rezepte} koerbe={koerbe}
            onSaveZutat={/* Task 9 */ undefined} onSaveRezept={/* Task 9 */ undefined}
            onDelete={/* Task 9 */ undefined} onClose={() => setEditing(null)} />
        </div>
      )}
      {korbOpen && (
        <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) setKorbOpen(false) }}>
          <Korb korb={korb} setKorb={setKorb} koerbe={koerbe} setKoerbe={setKoerbe}
            settings={settings} setSettings={setSettings}
            zById={zById} rById={rById} rezepte={rezepte} onClose={() => setKorbOpen(false)} />
        </div>
      )}

      <ToolHeader onBack={onBack} icon={<ToolIcon id="rezepte" size={20} />} eyebrow="Tool"
        title={<>Meal<em>prep</em></>} />

      <div className={s.subtabs}>
        {MODULE.map(([id, label]) => (
          <button key={id} className={`${s.subtab} ${modul === id ? s.subtabActive : ''}`}
            onClick={() => setModul(id)}>{label}</button>
        ))}
      </div>

      {modul === 'konfig' && (
        <Konfigurator {...sharedProps} settings={settings}
          loadRezept={konfigLoad} onLoaded={() => setKonfigLoad(null)} />
      )}
      {modul === 'gross' && <Grossrezepte {...sharedProps} />}
      {modul === 'sammlung' && <Sammlung {...sharedProps} ladeInKonfigurator={ladeInKonfigurator} />}

      {korb.eintraege.length > 0 && (
        <button className={s.korbPille} onClick={() => setKorbOpen(true)}>
          🧺 Korb · {korb.eintraege.length}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3:** `TabRezepte.module.css` — basierend auf altem CSS (Overlay, Subtabs, Page) + neu `.korbPille` (position:fixed, bottom, `background:var(--tool-color)`, border-radius:var(--r-lg), shadow). Tokens aus `vars.css`, **keine neuen Hex-Werte**. Overlay/Subtab-Klassen aus dem alten `TabRezepte.module.css` übernehmen.

- [ ] **Step 4: Stub-Komponenten** anlegen, damit der Import nicht crasht (jede gibt vorerst `<div>Modul…</div>` zurück): `Sammlung.jsx`, `Grossrezepte.jsx`, `Konfigurator.jsx`, `Editor.jsx`, `Korb.jsx`.

- [ ] **Step 5: Verify** — `npm run dev`, Tab Mealprep öffnet ohne Crash, 3 Modul-Tabs schaltbar, ToolHeader korrekt. `npm test` weiter grün.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/rezepte/ src/features/tools/toolRegistry.jsx
git commit -m "feat(mealprep): container shell with module tabs + overlay routing"
```

---

### Task 8: Naehrwert-Mini-Komponente

**Files:**
- Create: `src/features/tools/rezepte/Naehrwert.jsx`

- [ ] **Step 1:** Implement:

```jsx
import { formatNaehrwert } from './naehrwerte'
// n = {kcal,protein,carbs,fat}; className optional für Styling-Kontext
export default function Naehrwert({ n, className = '' }) {
  if (!n) return null
  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.7, fontSize: '0.72rem' }}>{formatNaehrwert(n)}</span>
}
```

- [ ] **Step 2: Verify** — wird in folgenden Tasks eingebunden; hier nur Existenz. `npm run dev` ok.

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/rezepte/Naehrwert.jsx
git commit -m "feat(mealprep): Naehrwert mini display component"
```

---

### Task 9: Universeller Editor (Form A Baustein / Form B Rezept)

**Files:**
- Rewrite: `src/features/tools/rezepte/Editor.jsx` + `.module.css`
- Modify: `TabRezepte.jsx` (Editor-Callbacks verdrahten)

**Verantwortung (Spec §4):** Ein Modal, zwei Formen je nach `form`-Prop. **Form A (`zutat`):** Name, Einheit, Einkaufkategorie (`EINKAUF_KATEGORIEN`), Nährwerte/100 (4 Zahlenfelder, eintragbar), Baustein-Slot (`SLOTS`+„keiner"), Roh-Gewicht/Portion, Garnotiz. **Form B (`rezept`):** Name, Kategorien (mehrfach, frei eingebbar), Aufbewahrung (`tk`-Toggle + `BEHAELTER`-Mehrfach), Nährwerte/Portion (read-only, `rezeptProPortion` via `Naehrwert`), Portionen, `langlaeufer`-Toggle, Komponenten („Kann abgeleitet werden aus", +/− aus `rezepte` mit `istBasis`), Zutaten mit Menge (+/− aus `zutaten`), Anleitung (textarea), bei Basis zusätzlich ergibtMenge/Einheit, `konfigurierbar`-Toggle → Button „Im Konfigurator öffnen". **Löschen:** ruft `findUsages`; bei Treffern Warnung mit Liste statt sofort löschen.

- [ ] **Step 1:** In `TabRezepte.jsx` die Callbacks definieren und an `<Editor>` geben:

```jsx
const saveZutat = useCallback((z) => {
  setZutaten(prev => prev.some(x => x.id === z.id) ? prev.map(x => x.id === z.id ? z : x) : [...prev, z])
  setEditing(null)
}, [setZutaten])
const saveRezept = useCallback((r) => {
  setRezepte(prev => prev.some(x => x.id === r.id) ? prev.map(x => x.id === r.id ? r : x) : [...prev, r])
  setEditing(null)
}, [setRezepte])
const deleteItem = useCallback((id, form) => {
  if (form === 'zutat') setZutaten(prev => prev.filter(x => x.id !== id))
  else setRezepte(prev => prev.filter(x => x.id !== id))
  setEditing(null)
}, [setZutaten, setRezepte])
```

Im `<Editor>`-JSX `onSaveZutat={saveZutat} onSaveRezept={saveRezept} onDelete={deleteItem}` setzen. „Im Konfigurator öffnen" ruft `ladeInKonfigurator(rezept)` + `setEditing(null)`.

- [ ] **Step 2:** `Editor.jsx` bauen. Lokaler Draft via `useState(data ?? createZutat()/createRezept())`. Kategorien-Eingabe = Chips + Freitext-Input (Enter fügt hinzu). Komponenten/Zutaten-Hinzufügen = `<select>` (Optionen aus `rezepte.filter(istBasis)` bzw. `zutaten`) + Mengen-Input. Nährwerte Form B via `rezeptProPortion(draft, zById, rById)`. Löschen-Logik:

```jsx
const tryDelete = () => {
  const u = findUsages(draft.id, rezepte, koerbe)
  if (u.rezepte.length || u.koerbe.length) { setUsages(u); return }   // zeigt Warnung
  onDelete(draft.id, form)
}
```

Visuelle Vorlage: Editor-Abschnitt in `mealprep-mockup.html`. Modal-Chrome (`.modal/.modalHeader/.modalBody/.saveBtn`) aus altem `TabRezepte.module.css` übernehmen.

- [ ] **Step 3:** `Editor.module.css` — Felder, Chips, Toggle-Pills, Mehrfach-Auswahl. Tokens aus vars.css.

- [ ] **Step 4: Verify** (`npm run dev`): (a) Sammlung → später; hier per temporärem Test-Button oder via Konfigurator/Sammlung-Stub einen Editor öffnen. Mindest-Check sobald Sammlung (Task 10) existiert: neue Zutat anlegen → erscheint; Nährwerte eintragen → gespeichert; Rezept mit Zutat+Komponente anlegen → Nährwerte/Portion rechnet live; Löschen einer genutzten Basis → Warnung mit Nutzungsliste.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/Editor.jsx src/features/tools/rezepte/Editor.module.css src/features/tools/rezepte/TabRezepte.jsx
git commit -m "feat(mealprep): universal type-adaptive editor"
```

---

### Task 10: Sammlung (Kategorie-Karten + Neu/Bearbeiten)

**Files:**
- Rewrite: `src/features/tools/rezepte/Sammlung.jsx` + `.module.css`

**Verantwortung (Spec §5.3):** Rezepte gruppiert nach `kategorien` (ein Rezept kann in mehreren Karten erscheinen). Jede Kategorie = aufklappbare Karte. Oben „+ Neue Kategorie" (fügt leeren Kategorie-Namen zur lokalen Kategorie-Liste). Pro Karte „+ Rezept" (öffnet Editor Form B mit `kategorien:[diese]` vorbelegt). Jede Zeile: Auswahl-Toggle (→ `addToKorb(rezept.id, basisPortionen)`), `✎` (→ `onEdit({form:'rezept', data:rezept})`), `<Naehrwert>`, bei `konfigurierbar` zusätzlich „→ Konfigurator" (`ladeInKonfigurator`).

- [ ] **Step 1:** Kategorie-Liste ableiten: `useMemo` über alle `rezepte.flatMap(r=>r.kategorien)` uniq + lokale Extra-Kategorien (useState) für leere neue Karten. „+ Neue Kategorie" = prompt/inline-Input → zur Extra-Liste.

- [ ] **Step 2:** Render Karten (aufklappbar via `useState(collapsed)`). Karten-Pattern analog `ToolSection` (Titel-Klick toggelt). Rezept-Zeile mit Auswahl-Button (✓/○ wie tool-pattern `.selectBtn`), Name, `<Naehrwert n={rezeptProPortion(r, zById, rById)} />`, `✎`, optional „→ Konfigurator".

```jsx
const addRezept = (kat) => onEdit({ form: 'rezept', data: createRezept({ kategorien: [kat] }) })
```

- [ ] **Step 3:** `Sammlung.module.css` — Karten, Zeilen, Buttons. Tokens.

- [ ] **Step 4: Verify** (`npm run dev`): Seed-Rezepte erscheinen unter ihren Kategorien (Bowls, Burritos, Onepot/Auflauf, Saucen). „+ Neue Kategorie" legt Karte an. „+ Rezept" → Editor mit vorbelegter Kategorie → speichern → erscheint. ✎ → editieren. Auswahl → Korb-Pille zählt hoch. Bei „Korean Beef Bowl" erscheint „→ Konfigurator".

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/Sammlung.jsx src/features/tools/rezepte/Sammlung.module.css
git commit -m "feat(mealprep): Sammlung with category cards + add/edit"
```

---

# PHASE 3 — Großrezepte + Konfigurator

### Task 11: Konfigurator-Logik (Portionsverteilung, Konfig↔Rezept)

**Files:**
- Create: `src/features/tools/rezepte/konfigurator.js`
- Test: `src/features/tools/rezepte/konfigurator.test.js`

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import { verteilePortionen, rezeptAusKonfig, konfigAusRezept } from './konfigurator'

describe('verteilePortionen — gleichmäßig mit Rest', () => {
  it('10 auf 3 → [4,3,3]', () => expect(verteilePortionen(3, 10)).toEqual([4, 3, 3]))
  it('8 auf 2 → [4,4]',  () => expect(verteilePortionen(2, 8)).toEqual([4, 4]))
  it('0 aktive → []',    () => expect(verteilePortionen(0, 10)).toEqual([]))
})

describe('rezeptAusKonfig — Slots → Rezept', () => {
  it('rohe Bausteine → zutaten, Basen → komponenten, menge = gProPortion×anteil', () => {
    const slots = {
      protein: [{ id: 'z_hack', istRezept: false, gProPortion: 150, anteilPortionen: 4 }],
      kh:      [{ id: 'z_reis', istRezept: false, gProPortion: 80,  anteilPortionen: 4 }],
      sauce:   [{ id: 'r_tomatensauce', istRezept: true, gProPortion: 100, anteilPortionen: 4 }],
      gemuese: [],
    }
    const r = rezeptAusKonfig(slots, 4, 'Test-Bowl', ['Bowls'])
    expect(r.konfigurierbar).toBe(true)
    expect(r.basisPortionen).toBe(4)
    expect(r.kategorien).toEqual(['Bowls'])
    expect(r.zutaten).toContainEqual({ zutatId: 'z_hack', menge: 600 })
    expect(r.zutaten).toContainEqual({ zutatId: 'z_reis', menge: 320 })
    expect(r.komponenten).toContainEqual({ rezeptId: 'r_tomatensauce', menge: 400 })
  })
})

describe('konfigAusRezept — Rezept → Slots (Rekonstruktion)', () => {
  it('gProPortion = menge / basisPortionen, Slot aus bausteinTyp', () => {
    const rezept = { basisPortionen: 4, zutaten: [{ zutatId: 'z_reis', menge: 320 }], komponenten: [{ rezeptId: 'r_tomatensauce', menge: 400 }] }
    const zById = (id) => ({ id, bausteinTyp: 'kh' })
    const rById = (id) => ({ id, bausteinTyp: 'sauce' })  // Basis-Slot via bausteinTyp am Rezept-Lookup
    const slots = konfigAusRezept(rezept, zById, rById)
    expect(slots.kh[0]).toMatchObject({ id: 'z_reis', gProPortion: 80, anteilPortionen: 4, istRezept: false })
    expect(slots.sauce[0]).toMatchObject({ id: 'r_tomatensauce', gProPortion: 100, anteilPortionen: 4, istRezept: true })
  })
})
```

*(Hinweis: Eine Basis im Konfigurator braucht einen Slot. Lösung: Basis-Rezepte tragen optional `bausteinTyp` — Feld ergänzen in `createRezept` Defaults `bausteinTyp:null`, in Task 11 mitnutzen. In Test oben liefert `rById` den Slot.)*

- [ ] **Step 2:** Ergänze `bausteinTyp: o.bausteinTyp ?? null` in `createRezept` (mealprepModel.js) — erlaubt Basen einen Konfigurator-Slot. Test in mealprepModel.test.js nicht betroffen.

- [ ] **Step 3: Run, verify FAIL** — `npm test -- konfigurator` → FAIL.

- [ ] **Step 4: Implement** — `konfigurator.js`:

```js
import { createRezept } from './mealprepModel'

export function verteilePortionen(anzahlAktiv, gesamt) {
  if (anzahlAktiv <= 0) return []
  const base = Math.floor(gesamt / anzahlAktiv)
  const rest = gesamt - base * anzahlAktiv
  return Array.from({ length: anzahlAktiv }, (_, i) => base + (i < rest ? 1 : 0))
}

// slots: { protein:[{id,istRezept,gProPortion,anteilPortionen}], kh:[...], gemuese:[...], sauce:[...] }
export function rezeptAusKonfig(slots, gesamtPortionen, name, kategorien) {
  const zutaten = [], komponenten = []
  for (const slot of Object.values(slots)) {
    for (const b of slot ?? []) {
      const menge = Math.round((b.gProPortion || 0) * (b.anteilPortionen || 0))
      if (menge <= 0) continue
      if (b.istRezept) komponenten.push({ rezeptId: b.id, menge })
      else zutaten.push({ zutatId: b.id, menge })
    }
  }
  return createRezept({ name, kategorien, basisPortionen: gesamtPortionen, konfigurierbar: true, zutaten, komponenten })
}

// Rezept → Slots zur Bearbeitung im Konfigurator
export function konfigAusRezept(rezept, zutatById, rezeptById) {
  const slots = { protein: [], kh: [], gemuese: [], sauce: [] }
  const p = rezept.basisPortionen || 1
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    const z = zutatById(zutatId); if (!z?.bausteinTyp) continue
    slots[z.bausteinTyp].push({ id: zutatId, istRezept: false, gProPortion: menge / p, anteilPortionen: p })
  }
  for (const { rezeptId, menge } of rezept.komponenten ?? []) {
    const b = rezeptById(rezeptId); const slot = b?.bausteinTyp; if (!slot) continue
    slots[slot].push({ id: rezeptId, istRezept: true, gProPortion: menge / p, anteilPortionen: p })
  }
  return slots
}
```

- [ ] **Step 5: Run, verify PASS** — `npm test -- konfigurator` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/rezepte/konfigurator.js src/features/tools/rezepte/konfigurator.test.js src/features/tools/rezepte/mealprepModel.js
git commit -m "feat(mealprep): konfigurator logic (distribute, build, reconstruct)"
```

---

### Task 12: Großrezepte/Ketten

**Files:**
- Rewrite: `src/features/tools/rezepte/Grossrezepte.jsx` + `.module.css`

**Verantwortung (Spec §5.2):** Listet alle Basen (`rezepte.filter(istBasis)`) als aufklappbare Karten. Pro Karte: die Ableitungen (= Rezepte, deren `komponenten` diese Basis referenzieren) als markierbare Zeilen. „+ Basis" (Editor Form B mit ergibt-Feldern) und in der Karte „+ Ableitung" (Editor mit `komponenten:[{rezeptId:basis.id, menge:…}]` vorbelegt). Markieren → `addToKorb`.

- [ ] **Step 1:** Ableitungen ermitteln: `const ableitungen = (basis) => rezepte.filter(r => r.komponenten?.some(k => k.rezeptId === basis.id))`.

- [ ] **Step 2:** Karten rendern (collapse-State). Basis-Zeile mit `<Naehrwert>` (pro Einheit-Info optional) + ✎; Ableitungs-Zeilen mit Auswahl-Toggle + ✎ + `<Naehrwert>`. „+ Basis"/„+ Ableitung" → `onEdit`.

- [ ] **Step 3:** CSS analog Sammlung (Karten-Pattern wiederverwenden — gleiche Klassennamen-Konvention).

- [ ] **Step 4: Verify** (`npm run dev`): Tomatensoße + Pulled Chicken erscheinen als Basis-Karten. Unter Tomatensoße: Bolognese + Chili. Markieren → Korb. „+ Ableitung" unter Tomatensoße → Editor hat Tomatensoße als Komponente vorbelegt.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/Grossrezepte.jsx src/features/tools/rezepte/Grossrezepte.module.css
git commit -m "feat(mealprep): Grossrezepte chains view"
```

---

### Task 13: Konfigurator-UI

**Files:**
- Rewrite: `src/features/tools/rezepte/Konfigurator.jsx` + `.module.css`

**Verantwortung (Spec §6):** Gesamt-Portionen-Stepper oben. 4 Slot-Blöcke (klappbar). Pro Slot wählbare Bausteine = `zutaten.filter(z=>z.bausteinTyp===slot)` **+** `rezepte.filter(r=>r.bausteinTyp===slot)` (Basen). Auswahl togglen; gewählte verteilen `verteilePortionen` über ihre Anzahl; pro Baustein Stepper für `anteilPortionen` + Input für `gProPortion`. Slot-Kopf zeigt „X/Gesamt verteilt" (Warnung bei ≠). Baustein anklicken (Name) → `onEdit({form:'zutat'|'rezept'})`. „+ Baustein" pro Slot → Editor Form A mit `bausteinTyp:slot`. Live Ø/Portion via `rezeptProPortion(rezeptAusKonfig(...))`. „zu Kochen" → `addToKorb(inlineGericht, gesamt)`. „Als Rezept speichern" → Dialog (Name + Kategorien) → `rezeptAusKonfig` → `setRezepte([...,r])`. **Laden:** wenn `loadRezept`-Prop gesetzt → `konfigAusRezept` füllt Slots, dann `onLoaded()`.

- [ ] **Step 1:** State: `gesamt` (aus `settings.standardPortionen`), `slots` (`{protein:[],kh:[],gemuese:[],sauce:[]}` mit gewählten `{id,istRezept,gProPortion,anteilPortionen}`), `collapsed`. `useEffect` auf `loadRezept` → `setSlots(konfigAusRezept(loadRezept, zById, rById))`, `setGesamt(loadRezept.basisPortionen)`, `onLoaded()`.

- [ ] **Step 2:** Beim Togglen eines Bausteins in Slot: hinzufügen/entfernen, dann `anteilPortionen` aller im Slot neu via `verteilePortionen(n, gesamt)`. Default `gProPortion` aus Zutat/Basis (`z.gProPortion ?? 100`).

- [ ] **Step 3:** Render Slots + Stepper + Summenzeile. Inline-Gericht für „zu Kochen":

```jsx
const inline = () => { const r = rezeptAusKonfig(slots, gesamt, 'Konfiguriert', []); return { name: r.name, kategorien: [], basisPortionen: r.basisPortionen, zutaten: r.zutaten, komponenten: r.komponenten } }
```

- [ ] **Step 4:** „Als Rezept speichern"-Dialog (Name-Input + Kategorie-Chips) → `setRezepte(prev => [...prev, rezeptAusKonfig(slots, gesamt, name, kats)])` + Toast.

- [ ] **Step 5:** CSS — Slot-Blöcke, Stepper, Summenzeile, Warn-Hinweis (`color:var(--rose)` bei ≠). Vorlage: Konfigurator im Mockup.

- [ ] **Step 6: Verify** (`npm run dev`): Slots zeigen Zutaten **und** Basen (Tomatensoße unter Sauce). Portionen verteilen sich, Stepper ändert. g/P editierbar, Ø/Portion aktualisiert. „+ Baustein" legt neuen an. „Als Rezept speichern" → erscheint in Sammlung. Aus Sammlung „Korean Beef Bowl → Konfigurator" lädt die Slots korrekt.

- [ ] **Step 7: Commit**

```bash
git add src/features/tools/rezepte/Konfigurator.jsx src/features/tools/rezepte/Konfigurator.module.css
git commit -m "feat(mealprep): universal konfigurator UI"
```

---

# PHASE 4 — Korb, Einkauf, Kochanleitung

### Task 14: Einkaufslisten-Logik

**Files:**
- Create: `src/features/tools/rezepte/einkauf.js`
- Test: `src/features/tools/rezepte/einkauf.test.js`

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import { sammleZutaten, buildEinkauf } from './einkauf'

const ZUTATEN = {
  hack:   { id: 'hack',   name: 'Hack',         einheit: 'g', einkaufKategorie: 'Fleisch & Fisch' },
  tomate: { id: 'tomate', name: 'Dosentomaten', einheit: 'g', einkaufKategorie: 'Konserven & Trockenwaren' },
  salz:   { id: 'salz',   name: 'Salz',         einheit: 'g', einkaufKategorie: 'Gewürze' },
}
const zById = (id) => ZUTATEN[id]
const SOSSE = { id: 'soße', basisPortionen: 8, ergibtMenge: 1000, zutaten: [{ zutatId: 'tomate', menge: 1000 }, { zutatId: 'salz', menge: 10 }], komponenten: [] }
const rById = (id) => (id === 'soße' ? SOSSE : null)

describe('sammleZutaten — rekursive Basen-Auflösung', () => {
  it('Ableitung mit Komponente löst Basis in Roh-Zutaten auf', () => {
    const bolo = { id: 'bolo', basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }], komponenten: [{ rezeptId: 'soße', menge: 500 }] }
    const acc = {}
    sammleZutaten(bolo, 1, rById, acc)   // skala 1 (Basisportionen)
    expect(acc.hack).toBe(400)
    // 500 ml von 1000-ml-Basis = halbe Basis-Zutaten: 500 g Tomate, 5 g Salz
    expect(acc.tomate).toBe(500)
    expect(acc.salz).toBe(5)
  })
  it('skaliert mit Portionsfaktor', () => {
    const r = { id: 'r', basisPortionen: 2, zutaten: [{ zutatId: 'hack', menge: 200 }], komponenten: [] }
    const acc = {}
    sammleZutaten(r, 2, rById, acc)   // doppelte Portionen
    expect(acc.hack).toBe(400)
  })
})

describe('buildEinkauf — konsolidieren, Gewürze raus, gruppieren', () => {
  it('summiert gleiche Zutat über mehrere Gerichte, gruppiert, klammert Gewürze aus', () => {
    const korbGerichte = [
      { rezept: { basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }], komponenten: [] }, portionen: 4 },
      { rezept: { basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }, { zutatId: 'salz', menge: 8 }], komponenten: [] }, portionen: 8 },
    ]
    const liste = buildEinkauf(korbGerichte, zById, rById)
    const fleisch = liste.find(g => g.kategorie === 'Fleisch & Fisch')
    expect(fleisch.items[0]).toMatchObject({ name: 'Hack', menge: 1200, einheit: 'g' })  // 400 + 400×2
    expect(liste.some(g => g.kategorie === 'Gewürze')).toBe(false)  // ausgeklammert
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- einkauf` → FAIL.

- [ ] **Step 3: Implement** — `einkauf.js`:

```js
import { EINKAUF_KATEGORIEN } from './mealprepModel'

// Akkumuliert rohe Zutaten-Mengen (zutatId → menge), rekursiv über Komponenten. Zyklenschutz via seen.
export function sammleZutaten(rezept, skala, rezeptById, acc, seen = new Set()) {
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    acc[zutatId] = (acc[zutatId] ?? 0) + menge * skala
  }
  for (const { rezeptId, menge } of rezept.komponenten ?? []) {
    const basis = rezeptById(rezeptId)
    if (!basis || !basis.ergibtMenge || seen.has(basis.id)) continue
    const basisSkala = (menge * skala) / basis.ergibtMenge
    sammleZutaten(basis, basisSkala, rezeptById, acc, new Set(seen).add(basis.id))
  }
}

// korbGerichte: [{ rezept, portionen }]  (rezept = Rezept oder Inline-Gericht, beide mit basisPortionen)
// → [{ kategorie, items:[{zutatId,name,menge,einheit}] }] ohne Gewürze
export function buildEinkauf(korbGerichte, zutatById, rezeptById) {
  const acc = {}
  for (const { rezept, portionen } of korbGerichte) {
    sammleZutaten(rezept, portionen / (rezept.basisPortionen || 1), rezeptById, acc)
  }
  const byKat = {}
  for (const [zutatId, menge] of Object.entries(acc)) {
    const z = zutatById(zutatId); if (!z) continue
    if (z.einkaufKategorie === 'Gewürze') continue
    const kat = z.einkaufKategorie || 'Sonstiges'
    ;(byKat[kat] ??= []).push({ zutatId, name: z.name, menge: Math.round(menge), einheit: z.einheit })
  }
  return EINKAUF_KATEGORIEN.filter(k => byKat[k]).map(kategorie => ({ kategorie, items: byKat[kategorie] }))
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- einkauf` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/einkauf.js src/features/tools/rezepte/einkauf.test.js
git commit -m "feat(mealprep): shopping list logic with recursive resolution"
```

---

### Task 15: Kochanleitung-Logik

**Files:**
- Create: `src/features/tools/rezepte/kochanleitung.js`
- Test: `src/features/tools/rezepte/kochanleitung.test.js`

**Verantwortung (Spec §8):** Geteilte Basen erscheinen 1× mit summiertem Bedarf; Mise-en-Place bündelt gleiche Roh-Zutat; Reihenfolge langläufer/Basen zuerst; Verpackung pro Gericht.

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest'
import { buildKochanleitung } from './kochanleitung'

const SOSSE = { id: 'soße', name: 'Tomatensoße', basisPortionen: 8, ergibtMenge: 1000, langlaeufer: true,
                zutaten: [{ zutatId: 'tomate', menge: 1000 }], komponenten: [], anleitung: 'köcheln' }
const ZB = { tomate: { id: 'tomate', name: 'Dosentomaten', einheit: 'g' }, hack: { id: 'hack', name: 'Hack', einheit: 'g' } }
const zById = (id) => ZB[id]
const rById = (id) => (id === 'soße' ? SOSSE : null)

describe('buildKochanleitung', () => {
  const bolo  = { id: 'bolo',  name: 'Bolognese', basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }], komponenten: [{ rezeptId: 'soße', menge: 500 }], anleitung: 'Hack braten', aufbewahrung: { tk: true, behaelter: ['Box'] } }
  const chili = { id: 'chili', name: 'Chili',     basisPortionen: 4, zutaten: [{ zutatId: 'hack', menge: 400 }], komponenten: [{ rezeptId: 'soße', menge: 500 }], anleitung: 'Hack braten', aufbewahrung: { tk: true, behaelter: ['Glas'] } }
  const korbGerichte = [{ rezept: bolo, portionen: 4 }, { rezept: chili, portionen: 4 }]

  it('geteilte Basis erscheint genau 1× mit summierter Menge', () => {
    const plan = buildKochanleitung(korbGerichte, zById, rById)
    const sosseSteps = plan.basen.filter(b => b.id === 'soße')
    expect(sosseSteps).toHaveLength(1)
    expect(sosseSteps[0].menge).toBe(1000)   // 500 + 500
  })
  it('Mise-en-Place bündelt gleiche Roh-Zutat über Gerichte', () => {
    const plan = buildKochanleitung(korbGerichte, zById, rById)
    const hack = plan.miseEnPlace.find(m => m.name === 'Hack')
    expect(hack.menge).toBe(800)   // 400 + 400
  })
  it('Verpackung listet pro Gericht die Behälter', () => {
    const plan = buildKochanleitung(korbGerichte, zById, rById)
    expect(plan.verpackung.map(v => v.name)).toEqual(['Bolognese', 'Chili'])
    expect(plan.verpackung[0].behaelter).toEqual(['Box'])
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- kochanleitung` → FAIL.

- [ ] **Step 3: Implement** — `kochanleitung.js`:

```js
// Sammelt nur die DIREKTEN Roh-Zutaten eines Gerichts (ohne Basen-Auflösung) für Mise-en-Place.
function directRoh(rezept, skala, acc) {
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    acc[zutatId] = (acc[zutatId] ?? 0) + menge * skala
  }
}

export function buildKochanleitung(korbGerichte, zutatById, rezeptById) {
  const basenBedarf = {}      // basisId → summierte menge (in ergibtEinheit)
  const miseAcc = {}          // zutatId → menge (direkte Roh-Zutaten aller Gerichte + Basen)

  for (const { rezept, portionen } of korbGerichte) {
    const skala = portionen / (rezept.basisPortionen || 1)
    directRoh(rezept, skala, miseAcc)
    for (const { rezeptId, menge } of rezept.komponenten ?? []) {
      const basis = rezeptById(rezeptId); if (!basis) continue
      basenBedarf[rezeptId] = (basenBedarf[rezeptId] ?? 0) + menge * skala
    }
  }

  // Basen-Roh-Zutaten in Mise-en-Place aufnehmen (skaliert auf summierten Bedarf)
  const basen = Object.entries(basenBedarf).map(([id, menge]) => {
    const basis = rezeptById(id)
    const bSkala = basis.ergibtMenge ? menge / basis.ergibtMenge : 0
    directRoh(basis, bSkala, miseAcc)
    return { id, name: basis.name, menge: Math.round(menge), einheit: basis.ergibtEinheit, langlaeufer: !!basis.langlaeufer, anleitung: basis.anleitung }
  }).sort((a, b) => (b.langlaeufer ? 1 : 0) - (a.langlaeufer ? 1 : 0))   // Langläufer zuerst

  const miseEnPlace = Object.entries(miseAcc).map(([zutatId, menge]) => {
    const z = zutatById(zutatId)
    return { zutatId, name: z?.name ?? zutatId, menge: Math.round(menge), einheit: z?.einheit }
  }).sort((a, b) => a.name.localeCompare(b.name))

  const gerichte = korbGerichte.map(({ rezept, portionen }) => ({ id: rezept.id, name: rezept.name, portionen, anleitung: rezept.anleitung }))
  const verpackung = korbGerichte.map(({ rezept }) => ({ name: rezept.name, tk: rezept.aufbewahrung?.tk ?? false, behaelter: rezept.aufbewahrung?.behaelter ?? [] }))

  return { miseEnPlace, basen, gerichte, verpackung }
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- kochanleitung` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/kochanleitung.js src/features/tools/rezepte/kochanleitung.test.js
git commit -m "feat(mealprep): cooking instruction merge logic"
```

---

### Task 16: Korb-Overlay

**Files:**
- Rewrite: `src/features/tools/rezepte/Korb.jsx` + `.module.css`

**Verantwortung (Spec §7):** Listet `korb.eintraege`: Name (Rezept via `rById(ref)` oder Inline `ref.name`), Portionen-Stepper, Entfernen. Buttons „Einkaufsliste" und „Kochanleitung" (öffnen `Einkauf`/`Kochanleitung` als Unter-Overlay, mit gemappten `korbGerichte = eintraege.map(e => ({ rezept: typeof e.ref==='string'?rById(e.ref):e.ref, portionen: e.portionen }))`). „Korb leeren". Menü-Bereich (Task 19).

- [ ] **Step 1:** Eintrags-Mapping-Helfer + Render Liste mit Stepper (`setKorb` aktualisiert `eintraege[i].portionen`). Entfernen = filter.

- [ ] **Step 2:** Lokaler State `view` (`'korb'|'einkauf'|'anleitung'`). Buttons schalten um; `Einkauf`/`Kochanleitung` bekommen `korbGerichte`.

- [ ] **Step 3:** CSS — Liste, Stepper, Aktions-Buttons (`background:var(--tool-color)`).

- [ ] **Step 4: Verify** (`npm run dev`): Aus Sammlung/Konfigurator Gerichte in Korb legen → Korb-Pille → Overlay zeigt Einträge, Portionen änderbar, entfernen funktioniert.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/Korb.jsx src/features/tools/rezepte/Korb.module.css
git commit -m "feat(mealprep): cooking basket overlay"
```

---

### Task 17: Einkaufsliste-UI

**Files:**
- Rewrite: `src/features/tools/rezepte/Einkauf.jsx` + `.module.css`

**Verantwortung (Spec §9):** `buildEinkauf(korbGerichte, zById, rById)` rendern, gruppiert. Tap-States (offen→gekauft→entfernt→zurück) lokal (`useState` map keyed `zutatId`). „Leeren" (Bestätigung). Pattern = alter Einkauf-Tab in `TabRezepte.jsx:246-303` (3-State-Tap, Gruppen, Counts) — übernehmen.

- [ ] **Step 1:** `const liste = useMemo(() => buildEinkauf(korbGerichte, zById, rById), [korbGerichte])`. Tap-State + `tapItem(zutatId)` (3-Zyklus wie alt).

- [ ] **Step 2:** Render Gruppen + Items (`menge einheit`), Counts (offen/gekauft/entfernt), „Leeren" mit Confirm.

- [ ] **Step 3:** CSS aus altem Einkauf-Tab übernehmen (`.catGroup/.einkaufItem/...`).

- [ ] **Step 4: Verify** (`npm run dev`): Korb → Einkaufsliste zeigt konsolidierte Mengen nach Kategorie, **keine** Gewürze, Basen in Roh-Zutaten aufgelöst (z. B. „Dosentomaten" statt „Tomatensoße"). Tap zyklisch.

- [ ] **Step 5: Commit**

```bash
git add src/features/tools/rezepte/Einkauf.jsx src/features/tools/rezepte/Einkauf.module.css
git commit -m "feat(mealprep): shopping list UI"
```

---

### Task 18: Kochanleitung-UI

**Files:**
- Rewrite: `src/features/tools/rezepte/Kochanleitung.jsx` + `.module.css`

**Verantwortung (Spec §8):** `buildKochanleitung(...)` rendern in Abschnitten: **Mise-en-Place** (Liste „X g Name"), **Basen zuerst** (langläufer markiert, mit Menge + anleitung), **Gerichte** (Name · Portionen + anleitung), **Einfrieren & Verpackung** (pro Gericht TK + Behälter). Keine Zeitangaben.

- [ ] **Step 1:** `const plan = useMemo(() => buildKochanleitung(korbGerichte, zById, rById), [korbGerichte])`. Vier Abschnitte rendern.

- [ ] **Step 2:** CSS — Abschnitts-Überschriften, Listen, Langläufer-Badge.

- [ ] **Step 3: Verify** (`npm run dev`): Mit Bolognese + Chili im Korb → Tomatensoße erscheint **einmal** unter Basen (summierte Menge), Hack gebündelt in Mise-en-Place, Verpackung pro Gericht.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/rezepte/Kochanleitung.jsx src/features/tools/rezepte/Kochanleitung.module.css
git commit -m "feat(mealprep): cooking instruction UI"
```

---

# PHASE 5 — Menüs + Feinschliff

### Task 19: Gespeicherte Menüs

**Files:**
- Modify: `src/features/tools/rezepte/mealprepStore.js` (+ Test) und `Korb.jsx`

- [ ] **Step 1: Failing test** — in `mealprepStore.test.js`:

```js
import { korbSpeichern, korbDuplizieren } from './mealprepStore'

describe('Menü-Persistenz', () => {
  it('korbSpeichern fügt benannten Korb mit gespeichert:true hinzu', () => {
    const koerbe = []
    const next = korbSpeichern(koerbe, { id: 'a', name: 'Woche', eintraege: [{ ref: 'x', portionen: 4 }] })
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ name: 'Woche', gespeichert: true })
  })
  it('korbDuplizieren erzeugt Kopie mit neuer ID + " (Kopie)"', () => {
    const orig = { id: 'a', name: 'Woche', eintraege: [{ ref: 'x', portionen: 4 }], gespeichert: true }
    const dup = korbDuplizieren([orig], 'a')
    expect(dup).toHaveLength(2)
    expect(dup[1].id).not.toBe('a')
    expect(dup[1].name).toBe('Woche (Kopie)')
    expect(dup[1].eintraege).toEqual(orig.eintraege)
  })
})
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- mealprepStore` → FAIL.

- [ ] **Step 3: Implement** — in `mealprepStore.js`:

```js
import { genId } from './mealprepModel'

export function korbSpeichern(koerbe, korb) {
  const saved = { ...korb, gespeichert: true }
  return koerbe.some(k => k.id === korb.id) ? koerbe.map(k => k.id === korb.id ? saved : k) : [...koerbe, saved]
}
export function korbDuplizieren(koerbe, id) {
  const orig = koerbe.find(k => k.id === id); if (!orig) return koerbe
  return [...koerbe, { ...orig, id: genId(), name: `${orig.name} (Kopie)` }]
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- mealprepStore` → PASS.

- [ ] **Step 5:** `Korb.jsx` — Menü-Bereich: „Als Menü speichern" (Name-Input → `setKoerbe(korbSpeichern(koerbe, {...korb, name}))`), Liste gespeicherter Menüs (`koerbe`) mit „Laden" (`setKorb(menu)`) und „Duplizieren" (`setKoerbe(korbDuplizieren(koerbe, id))`).

- [ ] **Step 6: Verify** (`npm run dev`): Korb füllen → „Als Menü speichern" → erscheint in Menü-Liste → „Laden" stellt ihn wieder her → „Duplizieren" erzeugt Kopie. Reload (F5): Menüs bleiben.

- [ ] **Step 7: Commit**

```bash
git add src/features/tools/rezepte/mealprepStore.js src/features/tools/rezepte/mealprepStore.test.js src/features/tools/rezepte/Korb.jsx
git commit -m "feat(mealprep): saved menus (save/load/duplicate)"
```

---

### Task 20: Settings + optionaler Kalender-Link

**Files:**
- Modify: `Korb.jsx` oder Container — kleiner Settings-Bereich

**Verantwortung (Spec §3.5, §11 Nicht-Ziele):** Minimal: `standardPortionen` (Stepper, vorbelegt im Konfigurator) + `kalenderLink` (Toggle). Kalender-Link nur, wenn `kalenderLink` true: beim „Kochanleitung"-Erzeugen optional einen Eintrag in den Kalender schreiben (Pattern aus `kontext/tool-pattern.md` „Kalender-Integration"). **Wenn Kalender-Link zu groß wirkt → nur das Settings-Feld bauen, Schreib-Logik als Folge-Task markieren.**

- [ ] **Step 1:** Settings-Zeile (z. B. im Korb-Overlay Fuß): Stepper `standardPortionen` → `setSettings({...settings, standardPortionen})`. Toggle `kalenderLink`.

- [ ] **Step 2:** (Falls `kalenderLink`) im Korb beim Anleitung-Erzeugen `useAppStore().setDays(...)` mit Eintrag `{text:'Mealprep kochen', color:toolColor, locked:true}` auf heutiges Datum. Sonst überspringen.

- [ ] **Step 3: Verify** (`npm run dev`): `standardPortionen` ändern → neuer Konfigurator startet damit. Toggle persistiert über Reload.

- [ ] **Step 4: Commit**

```bash
git add src/features/tools/rezepte/
git commit -m "feat(mealprep): settings (default portions, calendar link)"
```

---

### Task 21: Integrations-Durchlauf + Aufräumen

**Files:**
- Review: gesamtes `src/features/tools/rezepte/`

- [ ] **Step 1:** `npm test` — **alle** Logik-Tests grün.
- [ ] **Step 2:** `npm run lint` — keine Fehler (kein toter/auskommentierter Code, keine `Date.now()`-IDs, keine direkten `localStorage`-Zugriffe außerhalb Store).
- [ ] **Step 3:** `npm run build` — baut durch.
- [ ] **Step 4: End-to-End-Klick** (`npm run dev`): Konfigurator → Bowl bauen → „Als Rezept speichern" → Sammlung zeigt sie → in Korb → Großrezept-Ableitung dazu (geteilte Basis) → Korb → Einkaufsliste (konsolidiert, Basen aufgelöst, keine Gewürze) → Kochanleitung (Basis 1×, Mise-en-Place) → als Menü speichern → Reload → Menü laden. Screenshot je Modul.
- [ ] **Step 5:** Alte Rezepte-Daten-Check: Falls Tester noch Altdaten hat → erster Start verwirft sie sauber (kein Crash, Seed erscheint).
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(mealprep): integration pass, lint + build green"
```

---

## Kontext aktuell halten (nach Abschluss)

- `kontext/tool-pattern.md`: Bestehende Tabelle bleibt (rezepte = Tab 6). Falls Anzeigename „Mealprep" → Zeile 8 anpassen.
- `kontext/architektur.md` Zeile 65: `rezepte/ TabRezepte.jsx` → neue Datei-Liste (mealprepModel/Store/naehrwerte/einkauf/kochanleitung/konfigurator/seed + Modul-Komponenten).
- Memory `project-adhs-app.md`: Status „Mealprep gebaut" statt „Umsetzungsplan".

---

## Self-Review (durchgeführt)

**Spec-Abdeckung:** §1 Prinzip → Seed+Module · §2 eine Datenquelle → Store+Container · §3 Datenmodell → Task 2 · §3.3 Nährwerte → Task 5 · §4 Editor → Task 9 · §5 Module → Tasks 10/12/13 · §6 Konfigurator → Tasks 11/13 · §7 Korb+Menüs → Tasks 16/19 · §8 Kochanleitung → Tasks 15/18 · §9 Einkauf → Tasks 14/17 · §10 Referenz-Integrität → Task 4 (findUsages) + Task 9 (Warnung) · §12 Storage+Altdaten → Tasks 1/3 · §13 Seed → Task 6. **Keine Lücke.**

**Typ-Konsistenz geprüft:** `zutatId`/`rezeptId`/`menge`/`ref`/`portionen`/`basisPortionen`/`bausteinTyp`/`konfigurierbar`/`ergibtMenge` durchgängig identisch. Slot-Objekt `{id,istRezept,gProPortion,anteilPortionen}` konsistent zwischen `rezeptAusKonfig`/`konfigAusRezept`/Task 13. `korbGerichte`-Form `{rezept,portionen}` konsistent zwischen Korb/Einkauf/Kochanleitung. Funktionsnamen stabil (`buildEinkauf`, `buildKochanleitung`, `findUsages`, `rezeptProPortion`).

**Offene bewusste Abweichung:** `naehrwertProEinheit` nicht gespeichert sondern berechnet (siehe Datenmodell-Notiz) — vor Phase 1 vom Nutzer bestätigen lassen.
