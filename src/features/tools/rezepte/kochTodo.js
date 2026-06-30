import { createBlock } from '../../todos/Block'
import { buildEinkauf } from './einkauf'

// Baut das Koch-Todo für den Tagesplaner aus dem aktuellen Korb:
// Einkaufsliste als Schritte, Gerichte in den Notizen, Kochzeit als Dauer.
// Genutzt vom Kochen-Tab und der Tagesplaner-Karte (MealprepSection).
export function buildKochTodoBlock(korbGerichte, zById, rById, toolColor) {
  const kochzeit = korbGerichte.reduce((sum, g) => sum + (g.rezept.kochdauer || 0), 0)
  const liste    = buildEinkauf(korbGerichte, zById, rById)
  const subItems = liste.flatMap(g => g.items).map(item => ({
    id: crypto.randomUUID?.() ?? `${item.zutatId}-${Math.random()}`,
    text: `${item.name} · ${item.menge} ${item.einheit}`,
    done: false,
  }))
  const gerichteNamen = korbGerichte.map(g => g.rezept.name)
  return createBlock({
    text: `Meal Prep: ${gerichteNamen.join(', ')}`,
    duration: kochzeit || null,
    subItems,
    toolId: 'rezepte',
    color: toolColor,
    notes: gerichteNamen.map(n => `• ${n}`).join('\n'),
  })
}

// Reine Einkaufsliste als Tagesplaner-Todo mit Unterpunkten (gruppiert, zum Abhaken im Laden).
export function buildEinkaufTodoBlock(korbGerichte, zById, rById, toolColor) {
  const liste = buildEinkauf(korbGerichte, zById, rById)
  const subItems = liste.flatMap(g => g.items).map(item => ({
    id: crypto.randomUUID?.() ?? `${item.zutatId}-${Math.random()}`,
    text: `${item.name} · ${item.menge} ${item.einheit}`,
    done: false,
  }))
  return createBlock({
    text: 'Einkaufen (Mealprep)',
    subItems,
    toolId: 'rezepte',
    color: toolColor,
  })
}
