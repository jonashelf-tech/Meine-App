import { createRezept } from './mealprepModel'

// Verteilt Gesamt-Portionen gleichmäßig auf n aktive Bausteine.
// Rest geht an die ersten. [4,3,3] für (3, 10).
export function verteilePortionen(anzahlAktiv, gesamt) {
  if (anzahlAktiv <= 0) return []
  const base = Math.floor(gesamt / anzahlAktiv)
  const rest = gesamt - base * anzahlAktiv
  return Array.from({ length: anzahlAktiv }, (_, i) => base + (i < rest ? 1 : 0))
}

// slots: { protein:[{id,istRezept,gProPortion,anteilPortionen}], kh:[...], gemuese:[...], sauce:[...] }
// menge = gProPortion × anteilPortionen. anteilPortionen mitspeichern → exakter Round-Trip,
// auch bei mehreren Bausteinen pro Slot (z.B. 2× Hähnchen + 2× Hack bei 4 Portionen).
export function rezeptAusKonfig(slots, gesamtPortionen, name, kategorien) {
  const zutaten = [], komponenten = []
  for (const slot of Object.values(slots)) {
    for (const b of slot ?? []) {
      const menge = Math.round((b.gProPortion || 0) * (b.anteilPortionen || 0))
      if (menge <= 0) continue
      if (b.istRezept) komponenten.push({ rezeptId: b.id, menge, anteilPortionen: b.anteilPortionen })
      else zutaten.push({ zutatId: b.id, menge, anteilPortionen: b.anteilPortionen })
    }
  }
  return createRezept({ name, kategorien, basisPortionen: gesamtPortionen, konfigurierbar: true, zutaten, komponenten })
}

// Rekonstruiert den Slot-State aus einem konfigurierbaren Rezept.
// Mit gespeichertem anteilPortionen → exakte Rekonstruktion (gProPortion = menge/anteil).
// Ohne (Alt-Daten / im Editor ergänzt) → anteilPortionen: null als Marker für die
// gleichmäßige Nachverteilung unten.
export function konfigAusRezept(rezept, zutatById, rezeptById) {
  const slots = { protein: [], kh: [], gemuese: [], sauce: [] }
  const p = rezept.basisPortionen || 1

  const add = (slot, id, istRezept, menge, anteil) => {
    const hasSplit = anteil != null && anteil > 0
    slots[slot].push({
      id, istRezept,
      gProPortion: hasSplit ? menge / anteil : menge / p,
      anteilPortionen: hasSplit ? anteil : null,
    })
  }

  for (const { zutatId, menge, anteilPortionen } of rezept.zutaten ?? []) {
    const z = zutatById(zutatId)
    if (!z?.bausteinTyp || !(z.bausteinTyp in slots)) continue
    add(z.bausteinTyp, zutatId, false, menge, anteilPortionen)
  }
  for (const { rezeptId, menge, anteilPortionen } of rezept.komponenten ?? []) {
    const b = rezeptById(rezeptId)
    const slot = b?.bausteinTyp
    if (!slot || !(slot in slots)) continue
    add(slot, rezeptId, true, menge, anteilPortionen)
  }

  // Nur Items ohne gespeicherten Split (anteil:null) gleichmäßig auf p verteilen.
  for (const items of Object.values(slots)) {
    const legacy = items.filter(i => i.anteilPortionen === null)
    if (legacy.length === 0) continue
    const dist = verteilePortionen(legacy.length, p)
    legacy.forEach((item, i) => { item.anteilPortionen = dist[i] })
  }
  return slots
}
