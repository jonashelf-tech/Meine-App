import { sv, lv, SK } from '../../../storage'
import { SCHEMA_VERSION } from './mealprepModel'
import { seedZutaten, seedRezepte } from './seed'

const VKEY = SK.recipesVersion   // Schema-Versions-Marker (zentral in SK → Backup + Reset)

export const saveZutaten  = (list) => sv(SK.rezepteZutaten, list)
export const saveRezepte  = (list) => sv(SK.recipes, list)
export const saveSettings = (obj)  => sv(SK.rezepteSettings, obj)

// Wo wird eine Zutat ODER ein Rezept (id) verwendet? Für Lösch-Warnung.
export function findUsages(id, rezepte, koerbe = []) {
  const usedInRezepte = rezepte.filter(r =>
    (r.zutaten ?? []).some(z => z.zutatId === id) ||
    (r.komponenten ?? []).some(k => k.rezeptId === id)
  )
  const usedInKoerbe = koerbe.filter(k =>
    (k.eintraege ?? []).some(e => e.ref === id ||
      (typeof e.ref === 'object' && e.ref !== null && (
        (e.ref.zutaten ?? []).some(z => z.zutatId === id) ||
        (e.ref.komponenten ?? []).some(c => c.rezeptId === id)
      )))
  )
  return { rezepte: usedInRezepte, koerbe: usedInKoerbe }
}

// Schema 9: Eier wurden von Gramm auf Stück umgestellt (1 Ei ≈ 60 g).
// Seed-Rezepte kommen fertig konvertiert aus dem Seed; eigene Rezepte des
// Users, die z_ei in Gramm referenzieren, werden hier einmalig umgerechnet.
export function migrateEierZuStueck(rezepte) {
  return rezepte.map(r => ({
    ...r,
    zutaten: (r.zutaten ?? []).map(z =>
      z.zutatId === 'z_ei' ? { ...z, menge: Math.max(1, Math.round(z.menge / 60)) } : z
    ),
  }))
}

// Liest alles; seedet bei Erststart; bei Schema-Update werden nur neue Einträge
// ergänzt, eigene Rezepte des Users bleiben erhalten.
export function loadAll() {
  const version = lv(VKEY, 0)

  if (version === 0) {
    // Erststart oder komplett leerer Storage – voll seeden
    const zutaten = seedZutaten()
    const rezepte = seedRezepte()
    const settings = { kalenderLink: false, standardPortionen: 4 }
    saveZutaten(zutaten)
    saveRezepte(rezepte)
    saveSettings(settings)
    sv(VKEY, SCHEMA_VERSION)
    return { zutaten, rezepte, settings, version: SCHEMA_VERSION }
  }

  const existing = {
    zutaten:  lv(SK.rezepteZutaten, []),
    rezepte:  lv(SK.recipes, []),
    settings: lv(SK.rezepteSettings, { kalenderLink: false, standardPortionen: 4 }),
  }

  if (version !== SCHEMA_VERSION) {
    // Schema-Update: Seed-Bibliothek auf aktuellen Stand bringen (per ID ersetzen),
    // selbst angelegte Rezepte/Zutaten (Nicht-Seed-IDs) behalten.
    const seedZ = seedZutaten()
    const seedR = seedRezepte()
    const seedZIds = new Set(seedZ.map(z => z.id))
    const seedRIds = new Set(seedR.map(r => r.id))
    const eigeneZ = existing.zutaten.filter(z => !seedZIds.has(z.id))
    let   eigeneR = existing.rezepte.filter(r => !seedRIds.has(r.id))
    if (version < 9) eigeneR = migrateEierZuStueck(eigeneR)
    const mergedZ = [...seedZ, ...eigeneZ]
    const mergedR = [...seedR, ...eigeneR]
    saveZutaten(mergedZ)
    saveRezepte(mergedR)
    sv(VKEY, SCHEMA_VERSION)
    return { zutaten: mergedZ, rezepte: mergedR, settings: existing.settings, version: SCHEMA_VERSION }
  }

  return { ...existing, version }
}
