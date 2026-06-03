import { sv, lv, SK } from '../../../storage'
import { genId, SCHEMA_VERSION } from './mealprepModel'
import { seedZutaten, seedRezepte } from './seed'

const VKEY = `${SK.recipes}__v`   // Schema-Versions-Marker

export const saveZutaten  = (list) => sv(SK.rezepteZutaten, list)
export const saveRezepte  = (list) => sv(SK.recipes, list)
export const saveKoerbe   = (list) => sv(SK.rezepteKoerbe, list)
export const saveSettings = (obj)  => sv(SK.rezepteSettings, obj)

// Wo wird eine Zutat ODER ein Rezept (id) verwendet? Für Lösch-Warnung.
export function findUsages(id, rezepte, koerbe) {
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

export function korbSpeichern(koerbe, korb) {
  const saved = { ...korb, gespeichert: true }
  return koerbe.some(k => k.id === korb.id)
    ? koerbe.map(k => k.id === korb.id ? saved : k)
    : [...koerbe, saved]
}

export function korbDuplizieren(koerbe, id) {
  const orig = koerbe.find(k => k.id === id)
  if (!orig) return koerbe
  return [...koerbe, { ...orig, id: genId(), name: `${orig.name} (Kopie)` }]
}

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
