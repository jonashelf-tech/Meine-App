import { createZutat, createRezept } from './mealprepModel'

export const seedZutaten = () => [
  // PROTEIN (4 items)
  createZutat({ id: 'z_haehnchen', name: 'Haehnchenbrust',    einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 200, garNotiz: 'scharf anbraten',           naehrwert: { kcal: 110, protein: 23, carbs: 0, fat: 2  } }),
  createZutat({ id: 'z_hack',      name: 'Rinderhack',        einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 150, garNotiz: 'kruemelig braten',           naehrwert: { kcal: 200, protein: 18, carbs: 0, fat: 14 } }),
  createZutat({ id: 'z_tofu',      name: 'Tofu',              einkaufKategorie: 'Milchprodukte',   bausteinTyp: 'protein', gProPortion: 150, garNotiz: 'pressen, anbraten',          naehrwert: { kcal: 120, protein: 13, carbs: 2, fat: 7  } }),
  createZutat({ id: 'z_lachs',     name: 'Lachsfilet',        einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 180, garNotiz: 'Haut knusprig',              naehrwert: { kcal: 200, protein: 20, carbs: 0, fat: 13 } }),
  // KH (4 items)
  createZutat({ id: 'z_reis',      name: 'Reis (trocken)',    einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 80,  garNotiz: 'kochen 1:2',                 naehrwert: { kcal: 350, protein: 7,  carbs: 78, fat: 1 } }),
  createZutat({ id: 'z_pasta',     name: 'Pasta (trocken)',   einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 90,  garNotiz: 'al dente',                   naehrwert: { kcal: 360, protein: 12, carbs: 72, fat: 2 } }),
  createZutat({ id: 'z_wrap',      name: 'Wrap',              einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 64,  garNotiz: 'kurz erwaermen',             naehrwert: { kcal: 300, protein: 8,  carbs: 50, fat: 7 } }),
  createZutat({ id: 'z_kartoffel', name: 'Kartoffeln',        einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'kh',      gProPortion: 250, garNotiz: 'Ofen 200 Grad',              naehrwert: { kcal: 77,  protein: 2,  carbs: 17, fat: 0 } }),
  // GEMÜSE (4 items)
  createZutat({ id: 'z_brokkoli',  name: 'Brokkoli',          einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 200, garNotiz: 'daempfen',                   naehrwert: { kcal: 34,  protein: 3,  carbs: 7,  fat: 0 } }),
  createZutat({ id: 'z_paprika',   name: 'Paprika',           einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Streifen, anbraten',         naehrwert: { kcal: 31,  protein: 1,  carbs: 6,  fat: 0 } }),
  createZutat({ id: 'z_zucchini',  name: 'Zucchini',          einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Wuerfel, braten',            naehrwert: { kcal: 17,  protein: 1,  carbs: 3,  fat: 0 } }),
  createZutat({ id: 'z_spinat',    name: 'Blattspinat',       einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 100, garNotiz: 'zusammenfallen lassen',      naehrwert: { kcal: 23,  protein: 3,  carbs: 1,  fat: 0 } }),
  // SAUCE (3 items)
  createZutat({ id: 'z_currysauce',  name: 'Kokos-Curry-Sauce',     einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 120, garNotiz: 'koecheln',      naehrwert: { kcal: 90,  protein: 1,  carbs: 4,  fat: 8 } }),
  createZutat({ id: 'z_teriyaki',    name: 'Teriyaki-Sauce',        einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 40,  garNotiz: 'einreduzieren', naehrwert: { kcal: 130, protein: 3,  carbs: 28, fat: 0 } }),
  createZutat({ id: 'z_frischkaese', name: 'Koerniger Frischkaese', einkaufKategorie: 'Milchprodukte',            bausteinTyp: 'sauce', gProPortion: 100, garNotiz: 'unterruehren',  naehrwert: { kcal: 100, protein: 12, carbs: 3,  fat: 5 } }),
  // ZUTATEN fuer Basen (kein bausteinTyp)
  createZutat({ id: 'z_dosentomaten', name: 'Dosentomaten',      einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 20,  protein: 1,  carbs: 4, fat: 0  } }),
  createZutat({ id: 'z_zwiebel',      name: 'Zwiebeln',          einkaufKategorie: 'Gemüse & Obst',            naehrwert: { kcal: 40,  protein: 1,  carbs: 9, fat: 0  } }),
  createZutat({ id: 'z_haehnchensch', name: 'Haehnchenschenkel', einkaufKategorie: 'Fleisch & Fisch',          naehrwert: { kcal: 180, protein: 19, carbs: 0, fat: 11 } }),
  createZutat({ id: 'z_salz',         name: 'Salz',              einkaufKategorie: 'Gewürze',                  naehrwert: { kcal: 0,   protein: 0,  carbs: 0, fat: 0  } }),
]

export const seedRezepte = () => [
  // BASEN
  createRezept({ id: 'r_tomatensauce', name: 'Tomatensosse (Basis)', kategorien: ['Saucen'], basisPortionen: 8,
    ergibtMenge: 2000, ergibtEinheit: 'ml', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [{ zutatId: 'z_dosentomaten', menge: 1600 }, { zutatId: 'z_zwiebel', menge: 300 }, { zutatId: 'z_salz', menge: 10 }],
    anleitung: 'Zwiebeln glasig, Dosentomaten dazu, 30 Min koecheln, puerieren.' }),

  createRezept({ id: 'r_pulledchicken', name: 'Pulled Chicken (Basis)', kategorien: ['Saucen'], basisPortionen: 6,
    ergibtMenge: 1200, ergibtEinheit: 'g', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [{ zutatId: 'z_haehnchensch', menge: 1500 }, { zutatId: 'z_salz', menge: 15 }],
    anleitung: 'Schenkel 3 h schmoren, zerzupfen.' }),

  // ABLEITUNGEN
  createRezept({ id: 'r_bolognese', name: 'Bolognese', kategorien: ['Onepot/Auflauf'], basisPortionen: 4,
    aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [{ zutatId: 'z_hack', menge: 500 }],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 800 }],
    anleitung: 'Hack braten, Tomatensosse dazu, koecheln.' }),

  createRezept({ id: 'r_chili', name: 'Chili', kategorien: ['Onepot/Auflauf'], basisPortionen: 4,
    aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [{ zutatId: 'z_hack', menge: 400 }],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 600 }],
    anleitung: 'Hack braten, Tomatensosse + Bohnen, scharf abschmecken.' }),

  // KONFIGURIERBAR
  createRezept({ id: 'r_koreanbowl', name: 'Korean Beef Bowl', kategorien: ['Bowls'], basisPortionen: 4, konfigurierbar: true,
    aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_hack',     menge: 600 },
      { zutatId: 'z_reis',     menge: 320 },
      { zutatId: 'z_brokkoli', menge: 800 },
      { zutatId: 'z_teriyaki', menge: 160 },
    ],
    anleitung: 'Reis kochen, Hack mit Teriyaki braten, Brokkoli daempfen, schichten.' }),

  createRezept({ id: 'r_burrito', name: 'Burrito', kategorien: ['Burritos'], basisPortionen: 6, konfigurierbar: true,
    aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [{ zutatId: 'z_wrap', menge: 384 }],
    komponenten: [{ rezeptId: 'r_chili', menge: 900 }, { rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: 'Chili + Pulled Chicken auf Wrap, rollen, optional anbraten.' }),
]
