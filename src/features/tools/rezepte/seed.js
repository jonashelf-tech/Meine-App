// Minimal stub — will be replaced with real content in Task 6.
import { createZutat, createRezept } from './mealprepModel'

export const seedZutaten = () => [
  createZutat({ name: 'Reis (trocken)', einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh', gProPortion: 80, naehrwert: { kcal: 350, protein: 7, carbs: 78, fat: 1 } }),
]

export const seedRezepte = () => [
  createRezept({ name: 'Beispiel-Chili', kategorien: ['Onepot/Auflauf'], basisPortionen: 4 }),
]
