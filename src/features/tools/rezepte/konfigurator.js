import { createRezept } from './mealprepModel'

// Distributes total portions evenly across n active items.
// Remainder goes to first items. [4,3,3] for (3, 10).
export function verteilePortionen(anzahlAktiv, gesamt) {
  if (anzahlAktiv <= 0) return []
  const base = Math.floor(gesamt / anzahlAktiv)
  const rest = gesamt - base * anzahlAktiv
  return Array.from({ length: anzahlAktiv }, (_, i) => base + (i < rest ? 1 : 0))
}

// slots: { protein:[{id,istRezept,gProPortion,anteilPortionen}], kh:[...], gemuese:[...], sauce:[...] }
// Converts Konfigurator slot state to a saveable Rezept object.
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

// Converts a saved konfigurierbar Rezept back to Konfigurator slot state.
// zutatById and rezeptById need to return objects with .bausteinTyp to determine which slot.
export function konfigAusRezept(rezept, zutatById, rezeptById) {
  const slots = { protein: [], kh: [], gemuese: [], sauce: [] }
  const p = rezept.basisPortionen || 1
  for (const { zutatId, menge } of rezept.zutaten ?? []) {
    const z = zutatById(zutatId)
    if (!z?.bausteinTyp || !(z.bausteinTyp in slots)) continue
    slots[z.bausteinTyp].push({ id: zutatId, istRezept: false, gProPortion: menge / p, anteilPortionen: p })
  }
  for (const { rezeptId, menge } of rezept.komponenten ?? []) {
    const b = rezeptById(rezeptId)
    const slot = b?.bausteinTyp
    if (!slot || !(slot in slots)) continue
    slots[slot].push({ id: rezeptId, istRezept: true, gProPortion: menge / p, anteilPortionen: p })
  }
  return slots
}
