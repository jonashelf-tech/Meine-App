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
