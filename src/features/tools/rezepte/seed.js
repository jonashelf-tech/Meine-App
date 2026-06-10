import { createZutat, createRezept } from './mealprepModel'

export const seedZutaten = () => [
  // ── PROTEIN ──────────────────────────────────────────────────────────────
  createZutat({ id: 'z_haehnchen',    name: 'Hähnchenbrust',        einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 200, garNotiz: 'scharf anbraten',             naehrwert: { kcal: 110, protein: 23, carbs: 0,  fat: 2  } }),
  createZutat({ id: 'z_hack',         name: 'Rinderhack',           einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 150, garNotiz: 'krümelig braten',             naehrwert: { kcal: 200, protein: 18, carbs: 0,  fat: 14 } }),
  createZutat({ id: 'z_tofu',         name: 'Tofu',                 einkaufKategorie: 'Milchprodukte',   bausteinTyp: 'protein', gProPortion: 150, garNotiz: 'pressen, scharf anbraten',    naehrwert: { kcal: 120, protein: 13, carbs: 2,  fat: 7  } }),
  createZutat({ id: 'z_lachs',        name: 'Lachsfilet',           einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 180, garNotiz: 'Haut knusprig braten',        naehrwert: { kcal: 200, protein: 20, carbs: 0,  fat: 13 } }),
  createZutat({ id: 'z_ei',           name: 'Eier',                 einkaufKategorie: 'Milchprodukte',   bausteinTyp: 'protein', gProPortion: 120, garNotiz: 'über-easy braten',            naehrwert: { kcal: 155, protein: 13, carbs: 1,  fat: 11 } }),
  createZutat({ id: 'z_garnelen',     name: 'Garnelen',             einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 150, garNotiz: '2 Min je Seite, nicht zäh',   naehrwert: { kcal: 99,  protein: 24, carbs: 0,  fat: 1  } }),

  // ── KOHLENHYDRATE ────────────────────────────────────────────────────────
  createZutat({ id: 'z_reis',         name: 'Reis (trocken)',        einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 80,  garNotiz: '1:2 kochen',                  naehrwert: { kcal: 350, protein: 7,  carbs: 78, fat: 1  } }),
  createZutat({ id: 'z_pasta',        name: 'Pasta (trocken)',       einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 90,  garNotiz: 'al dente kochen',             naehrwert: { kcal: 360, protein: 12, carbs: 72, fat: 2  } }),
  createZutat({ id: 'z_wrap',         name: 'Wrap',                 einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 64,  garNotiz: 'kurz erwärmen',               naehrwert: { kcal: 300, protein: 8,  carbs: 50, fat: 7  } }),
  createZutat({ id: 'z_kartoffel',    name: 'Kartoffeln',           einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'kh',      gProPortion: 250, garNotiz: 'Ofen 200°, 35 Min',           naehrwert: { kcal: 77,  protein: 2,  carbs: 17, fat: 0  } }),
  createZutat({ id: 'z_couscous',     name: 'Couscous (trocken)',   einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 80,  garNotiz: '1:1 kochendes Wasser, 5 Min', naehrwert: { kcal: 376, protein: 13, carbs: 72, fat: 2  } }),
  createZutat({ id: 'z_tortilla',     name: 'Tortilla-Chips',       einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 50,  garNotiz: 'als Bett, nicht aufweichen',  naehrwert: { kcal: 500, protein: 7,  carbs: 63, fat: 25 } }),
  createZutat({ id: 'z_burgerbun',    name: 'Burger-Bun',           einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 90,  garNotiz: 'Schnittflächen toasten',      naehrwert: { kcal: 280, protein: 9,  carbs: 49, fat: 5  } }),
  createZutat({ id: 'z_suesskartoffel', name: 'Süßkartoffeln',      einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'kh',      gProPortion: 250, garNotiz: 'Würfel, Ofen 200°, 25 Min',    naehrwert: { kcal: 86,  protein: 2,  carbs: 20, fat: 0  } }),
  createZutat({ id: 'z_gnocchi',      name: 'Gnocchi',              einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 200, garNotiz: 'in Pfanne goldbraun braten',   naehrwert: { kcal: 160, protein: 4,  carbs: 32, fat: 2  } }),

  // ── GEMÜSE ───────────────────────────────────────────────────────────────
  createZutat({ id: 'z_brokkoli',     name: 'Brokkoli',             einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 200, garNotiz: 'dämpfen, 6 Min',              naehrwert: { kcal: 34,  protein: 3,  carbs: 7,  fat: 0  } }),
  createZutat({ id: 'z_paprika',      name: 'Paprika',              einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Streifen, anbraten',          naehrwert: { kcal: 31,  protein: 1,  carbs: 6,  fat: 0  } }),
  createZutat({ id: 'z_zucchini',     name: 'Zucchini',             einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Würfel, scharf braten',       naehrwert: { kcal: 17,  protein: 1,  carbs: 3,  fat: 0  } }),
  createZutat({ id: 'z_spinat',       name: 'Blattspinat',          einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 100, garNotiz: 'zusammenfallen lassen',       naehrwert: { kcal: 23,  protein: 3,  carbs: 1,  fat: 0  } }),
  createZutat({ id: 'z_karotte',      name: 'Karotten',             einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Scheiben, mitdünsten',        naehrwert: { kcal: 41,  protein: 1,  carbs: 10, fat: 0  } }),
  createZutat({ id: 'z_champignon',   name: 'Champignons',          einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'scharf anbraten (trocken!)',  naehrwert: { kcal: 22,  protein: 3,  carbs: 3,  fat: 0  } }),
  createZutat({ id: 'z_salat',        name: 'Salat (gemischt)',     einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 80,  garNotiz: 'frisch, nicht aufwärmen',     naehrwert: { kcal: 14,  protein: 1,  carbs: 2,  fat: 0  } }),
  createZutat({ id: 'z_gurke',        name: 'Gurke',                einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 100, garNotiz: 'frisch',                      naehrwert: { kcal: 13,  protein: 1,  carbs: 2,  fat: 0  } }),
  createZutat({ id: 'z_tomate',       name: 'Tomaten',              einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 100, garNotiz: 'frisch würfeln',              naehrwert: { kcal: 18,  protein: 1,  carbs: 4,  fat: 0  } }),
  createZutat({ id: 'z_avocado',      name: 'Avocado',              einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 70,  garNotiz: 'frisch, erst zum Servieren',  naehrwert: { kcal: 160, protein: 2,  carbs: 9,  fat: 15 } }),
  createZutat({ id: 'z_rotkohl',      name: 'Rotkohl',              einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 80,  garNotiz: 'fein hobeln',                 naehrwert: { kcal: 31,  protein: 1,  carbs: 7,  fat: 0  } }),
  createZutat({ id: 'z_blumenkohl',   name: 'Blumenkohl',           einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 200, garNotiz: 'Röschen, dämpfen 6 Min',      naehrwert: { kcal: 25,  protein: 2,  carbs: 5,  fat: 0  } }),
  createZutat({ id: 'z_lauch',        name: 'Frühlingszwiebeln',    einkaufKategorie: 'Gemüse & Obst',                           gProPortion: 30,  garNotiz: 'in Ringe, als Topping',       naehrwert: { kcal: 32,  protein: 2,  carbs: 7,  fat: 0  } }),

  // ── SAUCE / DRESSING (Konfigurator-Bausteine) ────────────────────────────
  createZutat({ id: 'z_currysauce',   name: 'Kokos-Curry-Sauce',    einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 120, garNotiz: 'köcheln',            naehrwert: { kcal: 90,  protein: 1,  carbs: 4,  fat: 8  } }),
  createZutat({ id: 'z_teriyaki',     name: 'Teriyaki-Sauce',       einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 40,  garNotiz: 'einreduzieren',      naehrwert: { kcal: 130, protein: 3,  carbs: 28, fat: 0  } }),
  createZutat({ id: 'z_frischkaese',  name: 'Körniger Frischkäse',  einkaufKategorie: 'Milchprodukte',            bausteinTyp: 'sauce', gProPortion: 100, garNotiz: 'unterrühren',        naehrwert: { kcal: 100, protein: 12, carbs: 3,  fat: 5  } }),
  createZutat({ id: 'z_bbqsauce',     name: 'BBQ-Sauce',            einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 40,  garNotiz: 'direkt verwenden',   naehrwert: { kcal: 110, protein: 1,  carbs: 26, fat: 0  } }),
  createZutat({ id: 'z_joghurt',      name: 'Griechischer Joghurt', einkaufKategorie: 'Milchprodukte',            bausteinTyp: 'sauce', gProPortion: 100, garNotiz: 'kalt',               naehrwert: { kcal: 97,  protein: 9,  carbs: 4,  fat: 5  } }),
  createZutat({ id: 'z_magerquark',   name: 'Magerquark',           einkaufKategorie: 'Milchprodukte',            bausteinTyp: 'sauce', gProPortion: 150, garNotiz: 'kalt, mit Schuss Wasser cremig rühren', naehrwert: { kcal: 67, protein: 12, carbs: 4, fat: 0 } }),
  createZutat({ id: 'z_salsa',        name: 'Salsa (Glas)',         einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 60,  garNotiz: 'kalt oder warm',     naehrwert: { kcal: 36,  protein: 1,  carbs: 7,  fat: 0  } }),
  createZutat({ id: 'z_guacamole',    name: 'Guacamole',            einkaufKategorie: 'Gemüse & Obst',            bausteinTyp: 'sauce', gProPortion: 60,  garNotiz: 'frisch, mit Limette', naehrwert: { kcal: 160, protein: 2,  carbs: 8,  fat: 14 } }),

  // ── BASIS- & SAUCEN-ZUTATEN ──────────────────────────────────────────────
  createZutat({ id: 'z_dosentomaten', name: 'Dosentomaten',         einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 20,  protein: 1,  carbs: 4,  fat: 0  } }),
  createZutat({ id: 'z_tomatenmark',  name: 'Tomatenmark',          einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 82,  protein: 4,  carbs: 15, fat: 0  } }),
  createZutat({ id: 'z_zwiebel',      name: 'Zwiebeln',             einkaufKategorie: 'Gemüse & Obst',            naehrwert: { kcal: 40,  protein: 1,  carbs: 9,  fat: 0  } }),
  createZutat({ id: 'z_knoblauch',    name: 'Knoblauch',            einkaufKategorie: 'Gewürze',                  naehrwert: { kcal: 149, protein: 6,  carbs: 33, fat: 0  } }),
  createZutat({ id: 'z_haehnchensch', name: 'Hähnchenschenkel',     einkaufKategorie: 'Fleisch & Fisch',          naehrwert: { kcal: 180, protein: 19, carbs: 0,  fat: 11 } }),
  createZutat({ id: 'z_schweinenacken', name: 'Schweinenacken',     einkaufKategorie: 'Fleisch & Fisch',          naehrwert: { kcal: 242, protein: 18, carbs: 0,  fat: 18 } }),
  createZutat({ id: 'z_kokosmilch',   name: 'Kokosmilch',           einkaufKategorie: 'Konserven & Trockenwaren', einheit: 'ml', naehrwert: { kcal: 230, protein: 2, carbs: 6, fat: 24 } }),
  createZutat({ id: 'z_currypaste',   name: 'Rote Currypaste',      einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 150, protein: 3,  carbs: 10, fat: 12 } }),
  createZutat({ id: 'z_kidneybohnen', name: 'Kidney-Bohnen (Dose)', einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 94,  protein: 7,  carbs: 16, fat: 0  } }),
  createZutat({ id: 'z_schwarzebohnen', name: 'Schwarze Bohnen (Dose)', einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 91, protein: 6, carbs: 16, fat: 0 } }),
  createZutat({ id: 'z_linsen',       name: 'Rote Linsen (trocken)', einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 350, protein: 24, carbs: 50, fat: 1 } }),
  createZutat({ id: 'z_mais',         name: 'Mais (Dose)',          einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 86,  protein: 3,  carbs: 19, fat: 1  } }),
  createZutat({ id: 'z_mozzarella',   name: 'Mozzarella',           einkaufKategorie: 'Milchprodukte',            naehrwert: { kcal: 254, protein: 18, carbs: 2,  fat: 20 } }),
  createZutat({ id: 'z_cheddar',      name: 'Cheddar (gerieben)',   einkaufKategorie: 'Milchprodukte',            naehrwert: { kcal: 400, protein: 25, carbs: 1,  fat: 33 } }),
  createZutat({ id: 'z_feta',         name: 'Feta',                 einkaufKategorie: 'Milchprodukte',            naehrwert: { kcal: 264, protein: 14, carbs: 4,  fat: 21 } }),
  createZutat({ id: 'z_parmesan',     name: 'Parmesan',             einkaufKategorie: 'Milchprodukte',            naehrwert: { kcal: 392, protein: 35, carbs: 0,  fat: 28 } }),
  createZutat({ id: 'z_milch',        name: 'Milch',                einkaufKategorie: 'Milchprodukte',            einheit: 'ml', naehrwert: { kcal: 47, protein: 3, carbs: 5, fat: 2 } }),
  createZutat({ id: 'z_butter',       name: 'Butter',               einkaufKategorie: 'Milchprodukte',            naehrwert: { kcal: 717, protein: 1,  carbs: 0,  fat: 81 } }),
  createZutat({ id: 'z_schmand',      name: 'Schmand',              einkaufKategorie: 'Milchprodukte',            naehrwert: { kcal: 162, protein: 3,  carbs: 4,  fat: 15 } }),
  createZutat({ id: 'z_mehl',         name: 'Mehl',                 einkaufKategorie: 'Brot & Getreide',          naehrwert: { kcal: 364, protein: 10, carbs: 76, fat: 1  } }),
  createZutat({ id: 'z_sojasauce',    name: 'Soja-Sauce',           einkaufKategorie: 'Konserven & Trockenwaren', einheit: 'ml', naehrwert: { kcal: 53, protein: 8, carbs: 5, fat: 0 } }),
  createZutat({ id: 'z_gochujang',    name: 'Gochujang',            einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 130, protein: 4,  carbs: 24, fat: 2  } }),
  createZutat({ id: 'z_mayo',         name: 'Mayonnaise',           einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 680, protein: 1,  carbs: 1,  fat: 75 } }),
  createZutat({ id: 'z_senf',         name: 'Senf',                 einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 66,  protein: 4,  carbs: 5,  fat: 4  } }),
  createZutat({ id: 'z_tahini',       name: 'Tahini',               einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 595, protein: 17, carbs: 21, fat: 54 } }),
  createZutat({ id: 'z_erdnussbutter', name: 'Erdnussbutter',       einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 588, protein: 25, carbs: 20, fat: 50 } }),
  createZutat({ id: 'z_honig',        name: 'Honig',                einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 304, protein: 0,  carbs: 82, fat: 0  } }),
  createZutat({ id: 'z_olivenoel',    name: 'Olivenöl',             einkaufKategorie: 'Konserven & Trockenwaren', einheit: 'ml', naehrwert: { kcal: 884, protein: 0, carbs: 0, fat: 100 } }),
  createZutat({ id: 'z_essig',        name: 'Balsamico-Essig',      einkaufKategorie: 'Konserven & Trockenwaren', einheit: 'ml', naehrwert: { kcal: 88, protein: 0, carbs: 17, fat: 0 } }),
  createZutat({ id: 'z_limette',      name: 'Limette',              einkaufKategorie: 'Gemüse & Obst',            naehrwert: { kcal: 30,  protein: 1,  carbs: 11, fat: 0  } }),
  createZutat({ id: 'z_salz',         name: 'Salz',                 einkaufKategorie: 'Gewürze',                  naehrwert: { kcal: 0,   protein: 0,  carbs: 0,  fat: 0  } }),
]

export const seedRezepte = () => [

  // ══════════════════════════════════════════════════════════════════════════
  // BASEN (vorkochen, einfrieren) — Herzstück der Ketten
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_tomatensauce', name: 'Tomatensoße', kategorien: ['Saucen'],
    basisPortionen: 8, ergibtMenge: 2000, ergibtEinheit: 'ml', kochdauer: 40,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [
      { zutatId: 'z_dosentomaten', menge: 1600 },
      { zutatId: 'z_zwiebel',      menge: 300  },
      { zutatId: 'z_knoblauch',    menge: 20   },
      { zutatId: 'z_tomatenmark',  menge: 60   },
      { zutatId: 'z_salz',         menge: 10   },
    ],
    anleitung: '1. Zwiebeln + Knoblauch glasig dünsten.\n2. Tomatenmark 2 Min mitrösten.\n3. Dosentomaten + Salz dazu, 30 Min köcheln.\n4. Pürieren.\nTipp: Kräuter erst beim Ableiten — Basis bleibt neutral.' }),

  createRezept({ id: 'r_pulledchicken', name: 'Pulled Chicken', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1250, ergibtEinheit: 'g', kochdauer: 180,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_haehnchensch', menge: 1500 },
      { zutatId: 'z_zwiebel',      menge: 200  },
      { zutatId: 'z_salz',         menge: 15   },
    ],
    anleitung: '1. Schenkel + Zwiebeln + 1 Tasse Brühe in den Topf.\n2. 3 Std bei 160° schmoren (Deckel).\n3. Knochen raus, Fleisch mit 2 Gabeln zerzupfen.\n4. Als Block einfrieren.' }),

  createRezept({ id: 'r_pulledpork', name: 'Pulled Pork BBQ', kategorien: ['Saucen'],
    basisPortionen: 8, ergibtMenge: 1500, ergibtEinheit: 'g', kochdauer: 480,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_schweinenacken', menge: 2200 },
      { zutatId: 'z_zwiebel',        menge: 200  },
      { zutatId: 'z_bbqsauce',       menge: 200  },
      { zutatId: 'z_salz',           menge: 20   },
    ],
    anleitung: '1. Nacken mit Rub (Paprika, Salz, Pfeffer, Kreuzkümmel) einreiben.\n2. 8 Std bei 120° im Ofen, bis Kerntemperatur 92°.\n3. Zerzupfen, mit BBQ-Sauce + Bratensaft mischen.\n4. Portionsweise als Block einfrieren.' }),

  createRezept({ id: 'r_thaicurry', name: 'Thai-Curry', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1500, ergibtEinheit: 'ml', kochdauer: 30,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_kokosmilch',  menge: 800 },
      { zutatId: 'z_currypaste',  menge: 60  },
      { zutatId: 'z_zwiebel',     menge: 200 },
      { zutatId: 'z_salz',        menge: 8   },
    ],
    anleitung: '1. Zwiebeln anschwitzen.\n2. Currypaste 2 Min mitrösten, bis es duftet.\n3. Kokosmilch aufgießen, 20 Min sanft köcheln.\n4. Als Block einfrieren.\nTipp: Gemüse + Protein immer frisch dazu.' }),

  createRezept({ id: 'r_tacohack', name: 'Taco-Hack', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1250, ergibtEinheit: 'g', kochdauer: 30,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_hack',         menge: 1000 },
      { zutatId: 'z_zwiebel',      menge: 200  },
      { zutatId: 'z_tomatenmark',  menge: 60   },
      { zutatId: 'z_schwarzebohnen', menge: 240 },
      { zutatId: 'z_salz',         menge: 12   },
    ],
    anleitung: '1. Hack krümelig braten, Zwiebeln dazu.\n2. Tomatenmark + Taco-Gewürz (Kreuzkümmel, Paprika, Chili, Oregano) rösten.\n3. Bohnen + 1 Tasse Wasser, 10 Min einköcheln.\n4. Als Block einfrieren.' }),

  createRezept({ id: 'r_kaesesauce', name: 'Cheddar-Käsesauce', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1000, ergibtEinheit: 'ml', kochdauer: 20,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [
      { zutatId: 'z_milch',   menge: 700 },
      { zutatId: 'z_cheddar', menge: 300 },
      { zutatId: 'z_butter',  menge: 50  },
      { zutatId: 'z_mehl',    menge: 50  },
      { zutatId: 'z_salz',    menge: 6   },
    ],
    anleitung: '1. Butter + Mehl zur Mehlschwitze verrühren.\n2. Milch nach und nach einrühren, glatt aufkochen.\n3. Cheddar schmelzen, mit Muskat + Salz abschmecken.\n4. Einfrieren — beim Auftauen mit Schuss Milch aufschlagen.' }),

  createRezept({ id: 'r_dal', name: 'Rote-Linsen-Dal', kategorien: ['Saucen'],
    basisPortionen: 5, ergibtMenge: 1500, ergibtEinheit: 'g', kochdauer: 35,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_linsen',     menge: 400 },
      { zutatId: 'z_kokosmilch', menge: 400 },
      { zutatId: 'z_zwiebel',    menge: 200 },
      { zutatId: 'z_tomatenmark', menge: 50 },
      { zutatId: 'z_salz',       menge: 10  },
    ],
    anleitung: '1. Zwiebeln + Curry/Kurkuma anschwitzen.\n2. Tomatenmark kurz rösten.\n3. Linsen + Kokosmilch + 400 ml Wasser, 25 Min köcheln bis cremig.\n4. Als Block einfrieren.' }),

  createRezept({ id: 'r_gyros', name: 'Hähnchen-Gyros', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1500, ergibtEinheit: 'g', kochdauer: 30,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_haehnchensch', menge: 1500 },
      { zutatId: 'z_joghurt',      menge: 150  },
      { zutatId: 'z_olivenoel',    menge: 40   },
      { zutatId: 'z_knoblauch',    menge: 20   },
      { zutatId: 'z_salz',         menge: 12   },
    ],
    anleitung: '1. Hähnchen in Streifen schneiden.\n2. Mit Joghurt, Öl, Knoblauch, Gyros-Gewürz (Paprika, Kreuzkümmel, Oregano) + Salz marinieren — 1 Std, gern über Nacht.\n3. Scharf in der Pfanne braun braten (oder Ofen 220°, 20 Min).\n4. Als Block einfrieren — wird zu Bowl, Wrap oder Auflauf.' }),

  createRezept({ id: 'r_roestgemuese', name: 'Ofen-Röstgemüse', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1500, ergibtEinheit: 'g', kochdauer: 35,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_zucchini',  menge: 500 },
      { zutatId: 'z_paprika',   menge: 400 },
      { zutatId: 'z_karotte',   menge: 300 },
      { zutatId: 'z_zwiebel',   menge: 200 },
      { zutatId: 'z_olivenoel', menge: 60  },
      { zutatId: 'z_salz',      menge: 10  },
    ],
    anleitung: '1. Alles in mundgerechte Stücke schneiden.\n2. Mit Öl, Salz + italienischen Kräutern auf 2 Blechen mischen.\n3. Ofen 200°, 30 Min, einmal wenden.\n4. Abkühlen, als Vorrat — wird zu Bowl, Frittata, Pasta oder Wrap.' }),

  // ── Marinaden (Basis mit bausteinTyp:'sauce') ─────────────────────────────

  createRezept({ id: 'r_korean_marinade', name: 'Korean Gochujang Marinade', kategorien: ['Marinaden'],
    basisPortionen: 6, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 10,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_gochujang',  menge: 60 },
      { zutatId: 'z_sojasauce',  menge: 80 },
      { zutatId: 'z_zwiebel',    menge: 80 },
      { zutatId: 'z_salz',       menge: 5  },
    ],
    anleitung: '1. Alle Zutaten + Sesamöl fein mixen.\n2. Protein mind. 2 Std marinieren — über Nacht optimal.\nHält im Kühlschrank 2 Wochen.' }),

  createRezept({ id: 'r_joghurt_marinade', name: 'Joghurt-Knoblauch Marinade', kategorien: ['Marinaden'],
    basisPortionen: 4, ergibtMenge: 200, ergibtEinheit: 'ml', kochdauer: 10,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_joghurt',   menge: 160 },
      { zutatId: 'z_knoblauch', menge: 15  },
      { zutatId: 'z_salz',      menge: 5   },
    ],
    anleitung: '1. Joghurt, gepressten Knoblauch, Zitronensaft, Oregano + Salz verrühren.\n2. Als Marinade (2 Std) oder direkt als Dip/Dressing.' }),

  createRezept({ id: 'r_zitronen_marinade', name: 'Zitronen-Kräuter Marinade', kategorien: ['Marinaden'],
    basisPortionen: 6, ergibtMenge: 200, ergibtEinheit: 'ml', kochdauer: 10,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_olivenoel', menge: 100 },
      { zutatId: 'z_limette',   menge: 60  },
      { zutatId: 'z_knoblauch', menge: 15  },
      { zutatId: 'z_salz',      menge: 5   },
    ],
    anleitung: '1. Öl, Zitrone/Limette, Knoblauch, Oregano + Thymian verrühren.\n2. Protein mind. 1 Std marinieren.\nIdeal für Hähnchen, Fisch, Halloumi.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // VORRATS-SAUCEN (Konfigurator-Sauce, TK-geeignet)
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_bbq_homemade', name: 'BBQ-Sauce hausgemacht', kategorien: ['Saucen'],
    basisPortionen: 10, ergibtMenge: 500, ergibtEinheit: 'ml', kochdauer: 25,
    bausteinTyp: 'sauce', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [
      { zutatId: 'z_tomatenmark', menge: 150 },
      { zutatId: 'z_honig',       menge: 100 },
      { zutatId: 'z_essig',       menge: 60  },
      { zutatId: 'z_sojasauce',   menge: 40  },
      { zutatId: 'z_zwiebel',     menge: 80  },
    ],
    anleitung: '1. Zwiebel fein anschwitzen.\n2. Alles + Paprikapulver, Senf, Rauchsalz dazu.\n3. 20 Min köcheln bis sirupartig, pürieren.\n4. In Gläser oder als Eiswürfel einfrieren.' }),

  createRezept({ id: 'r_erdnusssauce', name: 'Erdnuss-Satay-Sauce', kategorien: ['Saucen'],
    basisPortionen: 8, ergibtMenge: 500, ergibtEinheit: 'ml', kochdauer: 15,
    bausteinTyp: 'sauce', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [
      { zutatId: 'z_erdnussbutter', menge: 200 },
      { zutatId: 'z_kokosmilch',    menge: 200 },
      { zutatId: 'z_sojasauce',     menge: 40  },
      { zutatId: 'z_limette',       menge: 40  },
    ],
    anleitung: '1. Erdnussbutter, Kokosmilch, Sojasauce, Limette + etwas Currypaste glattrühren.\n2. Kurz erwärmen.\nFür Bowls, Wraps, Gemüse-Dip. In Würfeln einfrierbar.' }),

  createRezept({ id: 'r_pilzrahm', name: 'Pilzrahm-Sauce', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 800, ergibtEinheit: 'ml', kochdauer: 25,
    bausteinTyp: 'sauce', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Box'] },
    zutaten: [
      { zutatId: 'z_champignon', menge: 400 },
      { zutatId: 'z_schmand',    menge: 300 },
      { zutatId: 'z_zwiebel',    menge: 100 },
      { zutatId: 'z_salz',       menge: 6   },
    ],
    anleitung: '1. Champignons + Zwiebel scharf braten — Wasser muss komplett weg.\n2. Mit Brühe ablöschen.\n3. Schmand dazu, einköcheln, Petersilie.\nZu Pasta, Schnitzel, Kartoffeln.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // DRESSINGS (frisch / Kühlschrank)
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_caesar', name: 'Caesar-Dressing', kategorien: ['Dressings'],
    basisPortionen: 8, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 10,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_mayo',     menge: 120 },
      { zutatId: 'z_parmesan', menge: 50  },
      { zutatId: 'z_senf',     menge: 20  },
      { zutatId: 'z_knoblauch', menge: 10 },
    ],
    anleitung: '1. Mayo, Parmesan, Senf, Knoblauch, Zitrone + Sardellenpaste verrühren.\n2. Mit Wasser auf Dressing-Konsistenz bringen.\nHält 1 Woche im Glas.' }),

  createRezept({ id: 'r_honig_senf', name: 'Honig-Senf-Dressing', kategorien: ['Dressings'],
    basisPortionen: 8, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 5,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_senf',      menge: 80 },
      { zutatId: 'z_honig',     menge: 60 },
      { zutatId: 'z_olivenoel', menge: 80 },
      { zutatId: 'z_essig',     menge: 30 },
    ],
    anleitung: '1. Senf, Honig, Öl, Essig kräftig verrühren oder shaken.\n2. Süß-scharfe Balance abschmecken.\nZu Blattsalat, Bowls, gebratenem Hähnchen.' }),

  createRezept({ id: 'r_tahini_dressing', name: 'Tahini-Zitronen-Dressing', kategorien: ['Dressings'],
    basisPortionen: 8, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 5,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_tahini',    menge: 120 },
      { zutatId: 'z_limette',   menge: 50  },
      { zutatId: 'z_knoblauch', menge: 10  },
    ],
    anleitung: '1. Tahini, Zitrone/Limette, Knoblauch + Wasser löffelweise glattrühren (wird erst fest, dann cremig).\n2. Salzen.\nZu Falafel, Bowls, geröstetem Gemüse.' }),

  createRezept({ id: 'r_avocado_dressing', name: 'Avocado-Limetten-Dressing', kategorien: ['Dressings'],
    basisPortionen: 6, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 10,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_avocado', menge: 150 },
      { zutatId: 'z_joghurt', menge: 100 },
      { zutatId: 'z_limette', menge: 40  },
    ],
    anleitung: '1. Avocado, Joghurt, Limette, Koriander + Knoblauch cremig pürieren.\n2. Mit Wasser verdünnen.\nFrisch verwenden (max. 2 Tage). Zu Tacos, Bowls, Salaten.' }),

  createRezept({ id: 'r_balsamico_vinaigrette', name: 'Balsamico-Vinaigrette', kategorien: ['Dressings'],
    basisPortionen: 10, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 5,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_olivenoel', menge: 150 },
      { zutatId: 'z_essig',     menge: 70  },
      { zutatId: 'z_senf',      menge: 20  },
      { zutatId: 'z_honig',     menge: 20  },
    ],
    anleitung: '1. 3 Teile Öl, 1 Teil Balsamico, je 1 Löffel Senf + Honig als Emulgator.\n2. Kräftig shaken.\nKlassiker zu jedem Blattsalat. Hält 2 Wochen.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Tomatensoße
  // ══════════════════════════════════════════════════════════════════════════

  // ── Zwischen-Basis: Bolognese (aus Tomatensoße) → Basis für Lasagne & Chili ──
  createRezept({ id: 'r_bolognese', name: 'Bolognese', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 5, kochdauer: 30, ergibtMenge: 1500, ergibtEinheit: 'g',
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_hack',        menge: 600 },
      { zutatId: 'z_karotte',     menge: 150 },
      { zutatId: 'z_tomatenmark', menge: 40  },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 750 }],
    anleitung: '1. Karotte + Zwiebel anschwitzen.\n2. Hack zugeben, krümelig braten.\n3. Tomatenmark rösten, mit Schuss Rotwein ablöschen.\n4. Tomatensoße dazu, 20 Min köcheln.\n5. Als Block einfrieren — wird zu Pasta, Lasagne oder Chili.' }),

  createRezept({ id: 'r_bolo_pasta', name: 'Pasta Bolognese', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',    menge: 270 },
      { zutatId: 'z_parmesan', menge: 60  },
    ],
    komponenten: [{ rezeptId: 'r_bolognese', menge: 750 }],
    anleitung: '1. Bolognese-Basis erwärmen.\n2. Pasta al dente kochen.\n3. Mit etwas Nudelwasser unter die Soße schwenken.\n4. Parmesan + Basilikum.' }),

  createRezept({ id: 'r_chili', name: 'Chili con Carne', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_kidneybohnen', menge: 400 },
      { zutatId: 'z_mais',         menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_bolognese', menge: 1000 }],
    anleitung: '1. Bolognese-Basis erhitzen.\n2. Mit Kreuzkümmel, Chili + geräuchertem Paprika würzen.\n3. Bohnen + Mais dazu, 15 Min köcheln.\nGeheimtipp: 1 Stück Bitterschokolade + Schuss Espresso für Tiefe.' }),

  createRezept({ id: 'r_shakshuka', name: 'Shakshuka', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 2, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_paprika', menge: 200 },
      { zutatId: 'z_ei',      menge: 240 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: '1. Paprika + Zwiebel anbraten, etwas Harissa.\n2. Tomatensoße drauf, aufkochen.\n3. 4 Mulden formen, Eier hineingleiten lassen.\n4. Deckel drauf, 3–4 Min bei schwacher Hitze.\n5. Joghurt + Petersilie.' }),

  createRezept({ id: 'r_fitness_lasagne', name: 'Fitness-Lasagne', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 6, kochdauer: 55, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',      menge: 280 },
      { zutatId: 'z_frischkaese', menge: 400 },
      { zutatId: 'z_mozzarella', menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_bolognese', menge: 1250 }],
    anleitung: '1. Bolognese-Basis erwärmen.\n2. Schichten: Nudelplatten / Bolognese / körniger Frischkäse (statt Béchamel).\n3. Oben Mozzarella.\n4. Ofen 180°, 40 Min.\nProtein-Boost durch Frischkäse statt Sahne.' }),

  createRezept({ id: 'r_hackncheese', name: "Hack 'n' Cheese", kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 40, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_hack',       menge: 500 },
      { zutatId: 'z_reis',       menge: 300 },
      { zutatId: 'z_frischkaese', menge: 250 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: '1. Hack krümelig braten, Reis kochen.\n2. Alles in Auflaufform, Frischkäse unterrühren.\n3. Tomatensoße drauf.\n4. Ofen 180°, 25 Min. Optional mit Käse überbacken.' }),

  createRezept({ id: 'r_arrabiata', name: 'Penne Arrabiata', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 20, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',     menge: 270 },
      { zutatId: 'z_knoblauch', menge: 20  },
      { zutatId: 'z_parmesan',  menge: 60  },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: '1. Knoblauch + Chiliflocken in Öl anbraten.\n2. Tomatensoße dazu, einkochen.\n3. Penne al dente, mit etwas Nudelwasser schwenken.\n4. Parmesan + Petersilie.' }),

  createRezept({ id: 'r_tomatensuppe', name: 'Cremige Tomatensuppe', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Glas', 'Box'] },
    zutaten: [
      { zutatId: 'z_schmand', menge: 150 },
      { zutatId: 'z_paprika', menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 750 }],
    anleitung: '1. Paprika mitrösten.\n2. Tomatensoße + Brühe aufkochen, fein pürieren.\n3. Schmand einrühren, mit Basilikum.\nDazu geröstetes Brot.' }),

  createRezept({ id: 'r_tomaten_feta_pasta', name: 'Tomaten-Feta-Pasta', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',    menge: 320 },
      { zutatId: 'z_feta',     menge: 200 },
      { zutatId: 'z_spinat',   menge: 150 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: '1. Tomatensoße erwärmen, Feta darin zerdrücken — wird cremig.\n2. Spinat unterrühren bis er zusammenfällt.\n3. Pasta al dente, untermischen.\nSchnell, proteinreich, viral-Klassiker.' }),

  createRezept({ id: 'r_gnocchi_auflauf', name: 'Gnocchi-Auflauf mit Hähnchen', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 4, kochdauer: 35, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_gnocchi',     menge: 600 },
      { zutatId: 'z_haehnchen',   menge: 400 },
      { zutatId: 'z_frischkaese', menge: 250 },
      { zutatId: 'z_mozzarella',  menge: 150 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: '1. Hähnchenwürfel scharf anbraten.\n2. Mit Gnocchi, Tomatensoße + körnigem Frischkäse in der Auflaufform mischen.\n3. Mozzarella drüber.\n4. Ofen 200°, 20 Min goldbraun.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Pulled Chicken
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_pulled_bbq_bowl', name: 'Pulled Chicken BBQ Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_reis',     menge: 320 },
      { zutatId: 'z_bbqsauce', menge: 160 },
      { zutatId: 'z_salat',    menge: 240 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: '1. Reis kochen.\n2. Pulled Chicken erwärmen, BBQ-Sauce unterziehen.\n3. Bowl: Reis, Chicken, frischer Salat.\nPickled Onions als Topping.' }),

  createRezept({ id: 'r_pulled_wrap', name: 'Pulled Chicken Wrap', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_joghurt', menge: 200 },
      { zutatId: 'z_salat',   menge: 160 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: '1. Pulled Chicken erwärmen.\n2. Wrap mit Joghurt-Knoblauch bestreichen.\n3. Chicken + Salat + Gurke einrollen.\n4. Fest rollen, optional kurz anbraten.' }),

  createRezept({ id: 'r_pulled_burrito', name: 'Chicken Burrito', kategorien: ['Burritos'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',     menge: 320 },
      { zutatId: 'z_reis',     menge: 240 },
      { zutatId: 'z_mais',     menge: 150 },
      { zutatId: 'z_cheddar',  menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: '1. Chicken erwärmen.\n2. Wrap belegen: Reis, Chicken, Mais, Cheddar, Salsa.\n3. Fest rollen, Naht nach unten anbraten.\n4. Einzeln in Folie für TK.' }),

  createRezept({ id: 'r_pulled_quesadilla', name: 'Chicken Quesadilla', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_cheddar', menge: 200 },
      { zutatId: 'z_paprika', menge: 150 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 250 }],
    anleitung: '1. Wrap halb mit Chicken, Cheddar + Paprika belegen, zuklappen.\n2. In trockener Pfanne beidseitig goldbraun, bis Käse schmilzt.\n3. In Spalten schneiden.' }),

  createRezept({ id: 'r_pulled_salat', name: 'Pulled Chicken Salat-Bowl', kategorien: ['Salate'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_salat',   menge: 320 },
      { zutatId: 'z_mais',    menge: 150 },
      { zutatId: 'z_gurke',   menge: 200 },
      { zutatId: 'z_avocado', menge: 140 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: '1. Pulled Chicken kalt oder lauwarm.\n2. Großer Salat mit Mais, Gurke, Avocado, Kirschtomaten.\n3. Mit Honig-Senf- oder Avocado-Dressing.' }),

  createRezept({ id: 'r_pulled_auflauf', name: 'Chicken-Reis-Auflauf mit Frischkäse', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 4, kochdauer: 35, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_reis',        menge: 300 },
      { zutatId: 'z_brokkoli',    menge: 400 },
      { zutatId: 'z_frischkaese', menge: 300 },
      { zutatId: 'z_cheddar',     menge: 100 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: '1. Reis kochen, Brokkoli 4 Min vordämpfen.\n2. Mit Pulled Chicken + körnigem Frischkäse in der Auflaufform mischen.\n3. Cheddar drüber.\n4. Ofen 200°, 20 Min. High-Protein-Sattmacher.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Pulled Pork
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_pork_bowl', name: 'Pulled Pork Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_reis',    menge: 320 },
      { zutatId: 'z_rotkohl', menge: 240 },
      { zutatId: 'z_mais',    menge: 150 },
    ],
    komponenten: [{ rezeptId: 'r_pulledpork', menge: 500 }],
    anleitung: '1. Reis kochen, Pork erwärmen.\n2. Krautsalat: Rotkohl mit etwas Essig + Öl mischen.\n3. Bowl: Reis, Pork, Krautsalat, Mais, Frühlingszwiebeln.' }),

  createRezept({ id: 'r_pork_burrito', name: 'Pulled Pork Burrito', kategorien: ['Burritos'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 320 },
      { zutatId: 'z_reis',    menge: 240 },
      { zutatId: 'z_schwarzebohnen', menge: 200 },
      { zutatId: 'z_cheddar', menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_pulledpork', menge: 500 }],
    anleitung: '1. Pork erwärmen.\n2. Wrap belegen: Reis, Pork, schwarze Bohnen, Cheddar, Salsa.\n3. Fest rollen, anbraten.\n4. Einzeln in Folie für TK.' }),

  createRezept({ id: 'r_pork_burger', name: 'Pulled Pork Burger', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_burgerbun', menge: 360 },
      { zutatId: 'z_rotkohl',   menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_pulledpork', menge: 500 }],
    anleitung: '1. Buns toasten.\n2. Pork mit extra BBQ erwärmen.\n3. Belegen: Pork, Coleslaw (Rotkohl), Gurke.\n4. Deckel drauf, Pommes dazu.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Taco-Hack
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_taco_bowl', name: 'Taco Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_reis',    menge: 320 },
      { zutatId: 'z_mais',    menge: 150 },
      { zutatId: 'z_salat',   menge: 200 },
      { zutatId: 'z_cheddar', menge: 100 },
    ],
    komponenten: [{ rezeptId: 'r_tacohack', menge: 500 }],
    anleitung: '1. Reis kochen, Taco-Hack erwärmen.\n2. Bowl: Reis, Hack, Mais, Salat, Cheddar.\n3. Salsa + Guacamole drauf.\nTortilla-Chips zum Dippen.' }),

  createRezept({ id: 'r_taco_burrito', name: 'Beef Burrito', kategorien: ['Burritos'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 320 },
      { zutatId: 'z_reis',    menge: 240 },
      { zutatId: 'z_cheddar', menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_tacohack', menge: 500 }],
    anleitung: '1. Taco-Hack erwärmen.\n2. Wrap belegen: Reis, Hack, Cheddar, Salsa, etwas Salat.\n3. Fest rollen, Naht anbraten.\n4. Einzeln in Folie für TK.' }),

  createRezept({ id: 'r_quesadilla', name: 'Beef Quesadilla', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_cheddar', menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_tacohack', menge: 250 }],
    anleitung: '1. Wrap halb mit Hack + Cheddar belegen, zuklappen.\n2. In trockener Pfanne beidseitig knusprig.\n3. In Spalten, mit Salsa + Guac.' }),

  createRezept({ id: 'r_nachos', name: 'Überbackene Nachos', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_tortilla', menge: 300 },
      { zutatId: 'z_cheddar',  menge: 150 },
    ],
    komponenten: [
      { rezeptId: 'r_tacohack',   menge: 500 },
      { rezeptId: 'r_kaesesauce', menge: 250 },
    ],
    anleitung: '1. Tortilla-Chips aufs Blech.\n2. Taco-Hack + Käsesauce + Cheddar drüber.\n3. Ofen 180°, 10 Min überbacken.\n4. Mit Guacamole, Salsa, Jalapeños + Schmand toppen.' }),

  createRezept({ id: 'r_taco_salat', name: 'Taco-Salat', kategorien: ['Salate'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_salat',   menge: 320 },
      { zutatId: 'z_mais',    menge: 150 },
      { zutatId: 'z_tomate',  menge: 200 },
      { zutatId: 'z_avocado', menge: 140 },
    ],
    komponenten: [{ rezeptId: 'r_tacohack', menge: 500 }],
    anleitung: '1. Taco-Hack lauwarm auf großem Salat mit Mais, Tomate, Avocado, Cheddar.\n2. Mit Salsa + Joghurt-Dressing.\nTortilla-Chips als Crunch.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Cheddar-Käsesauce
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_mac_cheese', name: 'Mac & Cheese', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 30, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',   menge: 320 },
      { zutatId: 'z_cheddar', menge: 100 },
    ],
    komponenten: [{ rezeptId: 'r_kaesesauce', menge: 500 }],
    anleitung: '1. Makkaroni al dente kochen.\n2. Mit Käsesauce mischen.\n3. In Auflaufform, extra Cheddar + Semmelbrösel drüber.\n4. Ofen 200°, 15 Min goldbraun.' }),

  createRezept({ id: 'r_blumenkohl_gratin', name: 'Blumenkohl-Käse-Gratin', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 4, kochdauer: 35, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_blumenkohl', menge: 800 },
      { zutatId: 'z_cheddar',    menge: 100 },
    ],
    komponenten: [{ rezeptId: 'r_kaesesauce', menge: 500 }],
    anleitung: '1. Blumenkohl 5 Min vorgaren, in die Auflaufform.\n2. Käsesauce drüber, Cheddar oben.\n3. Ofen 200°, 25 Min.\nLow-Carb-Sattmacher.' }),

  createRezept({ id: 'r_kartoffelgratin', name: 'Kartoffel-Käse-Gratin', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 50, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_kartoffel', menge: 1000 },
      { zutatId: 'z_cheddar',   menge: 100  },
    ],
    komponenten: [{ rezeptId: 'r_kaesesauce', menge: 500 }],
    anleitung: '1. Kartoffeln in dünne Scheiben hobeln.\n2. In die Form schichten, Käsesauce + Muskat darüber.\n3. Cheddar oben.\n4. Ofen 190°, 40 Min, bis goldbraun + weich.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Thai-Curry
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_curry_haehnchen', name: 'Kokos-Curry Hähnchen', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_haehnchen', menge: 600 },
      { zutatId: 'z_reis',      menge: 320 },
      { zutatId: 'z_brokkoli',  menge: 400 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 750 }],
    anleitung: '1. Hähnchen scharf anbraten (nicht ganz durch).\n2. Thai-Curry Basis erhitzen, Hähnchen + Brokkoli rein.\n3. 8 Min köcheln.\n4. Mit Reis servieren.' }),

  createRezept({ id: 'r_thai_suppe', name: 'Thai-Kokos-Suppe', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_kokosmilch', menge: 300 },
      { zutatId: 'z_champignon', menge: 300 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 500 }],
    anleitung: '1. Thai-Curry Basis + extra Kokosmilch, mit Gemüsebrühe verlängern.\n2. Champignons rein, aufkochen.\n3. Koriander + Limette oben.' }),

  createRezept({ id: 'r_curry_garnelen', name: 'Garnelen-Curry', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_garnelen', menge: 450 },
      { zutatId: 'z_reis',     menge: 240 },
      { zutatId: 'z_paprika',  menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 500 }],
    anleitung: '1. Curry-Basis mit Paprika erhitzen.\n2. Garnelen erst 3 Min vor Ende rein (sonst zäh!).\n3. Mit Reis + Limette.\nNicht einfrieren.' }),

  createRezept({ id: 'r_curry_tofu_bowl', name: 'Curry-Tofu Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 25, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_tofu',     menge: 500 },
      { zutatId: 'z_reis',     menge: 320 },
      { zutatId: 'z_brokkoli', menge: 400 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 500 }],
    anleitung: '1. Tofu pressen, würfeln, knusprig braten.\n2. Curry-Basis + Brokkoli erhitzen, Tofu erst zum Schluss.\n3. Bowl mit Reis. Erdnüsse als Topping.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Linsen-Dal
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_dal_bowl', name: 'Dal Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_reis',    menge: 320 },
      { zutatId: 'z_spinat',  menge: 200 },
      { zutatId: 'z_joghurt', menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_dal', menge: 750 }],
    anleitung: '1. Dal erwärmen, Spinat unterrühren bis er zusammenfällt.\n2. Bowl: Reis, Dal, Klecks Joghurt, Koriander.\nNaan optional.' }),

  createRezept({ id: 'r_dal_wrap', name: 'Dal-Wrap', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_joghurt', menge: 160 },
      { zutatId: 'z_salat',   menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_dal', menge: 500 }],
    anleitung: '1. Dal eindicken (darf nicht zu flüssig sein).\n2. Wrap mit Joghurt bestreichen, Dal + Salat + rote Zwiebeln.\n3. Rollen, anbraten.' }),

  createRezept({ id: 'r_dal_suppe', name: 'Linsen-Kokos-Suppe', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Glas', 'Box'] },
    zutaten: [
      { zutatId: 'z_kokosmilch', menge: 200 },
      { zutatId: 'z_spinat',     menge: 150 },
    ],
    komponenten: [{ rezeptId: 'r_dal', menge: 500 }],
    anleitung: '1. Dal + Kokosmilch mit Gemüsebrühe zur Suppe verlängern.\n2. Spinat unterrühren, aufkochen.\n3. Limette + Koriander.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Hähnchen-Gyros
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_gyros_bowl', name: 'Gyros-Bowl', kategorien: ['Bowls', 'Fitness'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_reis',    menge: 320 },
      { zutatId: 'z_joghurt', menge: 200 },
      { zutatId: 'z_gurke',   menge: 200 },
      { zutatId: 'z_salat',   menge: 160 },
    ],
    komponenten: [{ rezeptId: 'r_gyros', menge: 500 }],
    anleitung: '1. Reis kochen, Gyros erwärmen.\n2. Tzatziki: Joghurt + geraspelte Gurke + Knoblauch.\n3. Bowl: Reis, Gyros, Salat, Tzatziki.' }),

  createRezept({ id: 'r_gyros_wrap', name: 'Gyros-Wrap', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_joghurt', menge: 160 },
      { zutatId: 'z_tomate',  menge: 120 },
      { zutatId: 'z_salat',   menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_gyros', menge: 500 }],
    anleitung: '1. Gyros erwärmen.\n2. Wrap mit Joghurt-Tzatziki bestreichen.\n3. Gyros, Tomate, Salat, rote Zwiebeln einrollen.\n4. Fest rollen, kurz anbraten.' }),

  createRezept({ id: 'r_gyros_auflauf', name: 'Kartoffel-Gyros-Auflauf', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 5, kochdauer: 45, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_kartoffel',   menge: 800 },
      { zutatId: 'z_frischkaese', menge: 400 },
      { zutatId: 'z_paprika',     menge: 200 },
      { zutatId: 'z_cheddar',     menge: 100 },
    ],
    komponenten: [{ rezeptId: 'r_gyros', menge: 750 }],
    anleitung: '1. Kartoffeln in Spalten, 10 Min vorkochen.\n2. Mit Gyros, Paprika + körnigem Frischkäse in der Form mischen.\n3. Cheddar drüber.\n4. Ofen 200°, 30 Min.\nDer Fitness-Klassiker — viel Protein, sättigt lange.' }),

  createRezept({ id: 'r_gyros_salat', name: 'Gyros-Salat-Bowl', kategorien: ['Salate', 'Fitness'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_salat',  menge: 320 },
      { zutatId: 'z_gurke',  menge: 200 },
      { zutatId: 'z_tomate', menge: 200 },
      { zutatId: 'z_feta',   menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_gyros', menge: 500 }],
    anleitung: '1. Gyros lauwarm.\n2. Großer Salat mit Gurke, Tomate, roten Zwiebeln, Feta.\n3. Mit Tzatziki oder Zitronen-Dressing.\nLow Carb, proteinreich.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Ofen-Röstgemüse
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_roest_bowl', name: 'Röstgemüse-Couscous-Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_couscous', menge: 320 },
      { zutatId: 'z_feta',     menge: 150 },
    ],
    komponenten: [{ rezeptId: 'r_roestgemuese', menge: 750 }],
    anleitung: '1. Couscous mit kochendem Wasser 5 Min quellen lassen.\n2. Röstgemüse erwärmen, untermischen.\n3. Feta darüber bröseln.\n4. Mit Tahini- oder Zitronen-Dressing.' }),

  createRezept({ id: 'r_roest_frittata', name: 'Gemüse-Frittata', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 4, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_ei',          menge: 480 },
      { zutatId: 'z_frischkaese', menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_roestgemuese', menge: 500 }],
    anleitung: '1. Eier mit körnigem Frischkäse + Salz verquirlen.\n2. Röstgemüse in die ofenfeste Pfanne, Eimasse drüber.\n3. Ofen 180°, 18 Min, bis gestockt.\n4. In Stücke schneiden — top zum Vorbereiten.' }),

  createRezept({ id: 'r_roest_pasta', name: 'Mediterrane Gemüse-Pasta', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',    menge: 320 },
      { zutatId: 'z_feta',     menge: 150 },
      { zutatId: 'z_parmesan', menge: 40  },
    ],
    komponenten: [{ rezeptId: 'r_roestgemuese', menge: 500 }],
    anleitung: '1. Pasta al dente kochen.\n2. Röstgemüse erwärmen, mit etwas Nudelwasser + Feta cremig schwenken.\n3. Pasta untermischen, Parmesan drüber.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // FITNESS-AUFLÄUFE & BOWLS (high-protein, einfach)
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_kartoffel_hack_auflauf', name: 'Kartoffel-Gemüse-Hack-Auflauf', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 4, kochdauer: 45, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_hack',        menge: 500 },
      { zutatId: 'z_kartoffel',   menge: 800 },
      { zutatId: 'z_paprika',     menge: 200 },
      { zutatId: 'z_zucchini',    menge: 200 },
      { zutatId: 'z_zwiebel',     menge: 100 },
      { zutatId: 'z_tomatenmark', menge: 30  },
      { zutatId: 'z_frischkaese', menge: 400 },
      { zutatId: 'z_cheddar',     menge: 100 },
      { zutatId: 'z_salz',        menge: 8   },
    ],
    anleitung: '1. Kartoffelwürfel 10 Min vorkochen.\n2. Hack + Zwiebel krümelig braten, Tomatenmark + Paprikapulver rösten, Paprika + Zucchini kurz mitbraten, salzen.\n3. Kartoffeln + Hack-Gemüse in der Auflaufform mischen, körnigen Frischkäse unterheben.\n4. Cheddar drüber, Ofen 200°, 25 Min goldbraun.\nDer Fitness-Klassiker: viel Protein, lange satt, super zum Vorkochen.' }),

  createRezept({ id: 'r_haehnchen_brokkoli_auflauf', name: 'Hähnchen-Brokkoli-Auflauf', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 4, kochdauer: 40, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_haehnchen',   menge: 600 },
      { zutatId: 'z_brokkoli',    menge: 600 },
      { zutatId: 'z_reis',        menge: 200 },
      { zutatId: 'z_frischkaese', menge: 300 },
      { zutatId: 'z_cheddar',     menge: 100 },
      { zutatId: 'z_salz',        menge: 6   },
    ],
    anleitung: '1. Reis kochen, Brokkoli 4 Min dämpfen.\n2. Hähnchenwürfel scharf anbraten, salzen.\n3. Alles mit körnigem Frischkäse in der Form mischen.\n4. Cheddar drüber, Ofen 200°, 20 Min.\nLow-Carb-freundlich, sehr proteinreich.' }),

  createRezept({ id: 'r_cheeseburger_auflauf', name: 'Cheeseburger-Auflauf (Low Carb)', kategorien: ['Onepot/Auflauf', 'Fitness'],
    basisPortionen: 4, kochdauer: 35, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_hack',        menge: 600 },
      { zutatId: 'z_blumenkohl',  menge: 500 },
      { zutatId: 'z_ei',          menge: 120 },
      { zutatId: 'z_frischkaese', menge: 200 },
      { zutatId: 'z_cheddar',     menge: 150 },
      { zutatId: 'z_gurke',       menge: 100 },
      { zutatId: 'z_zwiebel',     menge: 80  },
    ],
    anleitung: '1. Blumenkohl 5 Min dämpfen.\n2. Hack + Zwiebel braten, salzen.\n3. Mit Blumenkohl, Ei + Frischkäse in der Form mischen.\n4. Cheddar drüber, Ofen 200°, 20 Min.\n5. Zum Servieren: Gewürzgurke + Burger-Soße (Joghurt + Senf + Tomatenmark).' }),

  createRezept({ id: 'r_ofen_feta_pasta', name: 'Ofen-Feta-Pasta', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 35, aufbewahrung: { tk: false, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_feta',      menge: 200 },
      { zutatId: 'z_tomate',    menge: 500 },
      { zutatId: 'z_pasta',     menge: 320 },
      { zutatId: 'z_knoblauch', menge: 15  },
      { zutatId: 'z_olivenoel', menge: 40  },
    ],
    anleitung: '1. Feta-Block in die Mitte der Form, Kirschtomaten + Knoblauch drumherum, mit Öl + Salz mischen.\n2. Ofen 200°, 30 Min, bis Tomaten platzen.\n3. Pasta al dente kochen.\n4. Feta + Tomaten zu Soße verrühren, Pasta untermischen.\nDer virale Klassiker — kaum Aufwand.' }),

  createRezept({ id: 'r_suesskartoffel_bowl', name: 'Süßkartoffel-Hähnchen-Bowl', kategorien: ['Bowls', 'Fitness'],
    basisPortionen: 4, kochdauer: 30, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_suesskartoffel', menge: 600 },
      { zutatId: 'z_haehnchen',      menge: 600 },
      { zutatId: 'z_brokkoli',       menge: 300 },
      { zutatId: 'z_magerquark',     menge: 200 },
    ],
    anleitung: '1. Süßkartoffelwürfel mit Öl + Paprika 25 Min im Ofen rösten.\n2. Hähnchen scharf anbraten, salzen.\n3. Brokkoli dämpfen.\n4. Bowl schichten, Quark-Dip (Magerquark + Kräuter + Knoblauch) dazu.\nClean, proteinreich, meal-prep-tauglich.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KONFIGURIERBAR (Baukasten-Gerichte)
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_koreanbowl', name: 'Korean Beef Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 25, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_hack',       menge: 600 },
      { zutatId: 'z_reis',       menge: 320 },
      { zutatId: 'z_brokkoli',   menge: 600 },
      { zutatId: 'z_teriyaki',   menge: 120 },
    ],
    anleitung: '1. Reis kochen.\n2. Hack mit Teriyaki + Sesamöl scharf braten.\n3. Brokkoli dämpfen.\n4. Bowl schichten, Sesam + Frühlingszwiebeln oben.' }),

  createRezept({ id: 'r_bigmac_bowl', name: 'Big Mac Bowl', kategorien: ['Bowls', 'Salate'],
    basisPortionen: 4, kochdauer: 20, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_hack',      menge: 500 },
      { zutatId: 'z_salat',     menge: 320 },
      { zutatId: 'z_gurke',     menge: 200 },
      { zutatId: 'z_teriyaki',  menge: 80  },
    ],
    anleitung: '1. Hack in kleine Patties braten.\n2. Big-Mac-Soße: Mayo + Senf + gehackte Gurke + Essig + Paprika.\n3. Bowl: Salat, Hack, Gurke, Tomate, Gewürzgurke.\n4. Soße + Sesam oben.' }),

  createRezept({ id: 'r_chicken_soja_bowl', name: 'Chicken Soja-Limetten Bowl', kategorien: ['Bowls', 'Salate'],
    basisPortionen: 4, kochdauer: 25, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_haehnchen', menge: 600 },
      { zutatId: 'z_reis',      menge: 320 },
      { zutatId: 'z_salat',     menge: 200 },
      { zutatId: 'z_paprika',   menge: 200 },
      { zutatId: 'z_sojasauce', menge: 80  },
    ],
    anleitung: '1. Hähnchen in Soja + Limette + Sesamöl 30 Min marinieren.\n2. Scharf braten.\n3. Bowl: Reis, Hähnchen, Salat, Paprika, Edamame.\n4. Sesam + Frühlingszwiebeln oben.' }),

  createRezept({ id: 'r_falafel_bowl', name: 'Mediterrane Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 25, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_couscous', menge: 320 },
      { zutatId: 'z_tomate',   menge: 200 },
      { zutatId: 'z_gurke',    menge: 200 },
      { zutatId: 'z_feta',     menge: 120 },
    ],
    anleitung: '1. Couscous quellen lassen.\n2. Bowl: Couscous, Tomate, Gurke, Feta, Oliven, rote Zwiebeln.\n3. Mit Tahini- oder Zitronen-Dressing.\nFalafel optional.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KONFIGURIERBARE BURRITOS / WEITERE
  // ══════════════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_burrito', name: 'Burrito (Baukasten)', kategorien: ['Burritos'],
    basisPortionen: 6, kochdauer: 30, konfigurierbar: true, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [{ zutatId: 'z_wrap', menge: 384 }],
    komponenten: [
      { rezeptId: 'r_chili',        menge: 900 },
      { rezeptId: 'r_pulledchicken', menge: 500 },
    ],
    anleitung: '1. Chili + Pulled Chicken erwärmen.\n2. Auf Wrap: Chili, Chicken, Reis, Frischkäse.\n3. Fest rollen, Nahtseite nach unten kurz anbraten.\n4. Einzeln in Folie für TK.' }),

  createRezept({ id: 'r_breakfast_burrito', name: 'Breakfast Burrito', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_ei',      menge: 360 },
      { zutatId: 'z_cheddar', menge: 120 },
      { zutatId: 'z_paprika', menge: 150 },
    ],
    anleitung: '1. Rührei mit Paprika + Frühlingszwiebeln zubereiten.\n2. Wrap belegen: Rührei, Cheddar, Bohnen, Salsa.\n3. Rollen, anbraten.\nPerfekt zum Vorbereiten + Einfrieren.' }),

  createRezept({ id: 'r_veggie_burrito', name: 'Veggie-Bohnen-Burrito', kategorien: ['Burritos'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',          menge: 320 },
      { zutatId: 'z_reis',          menge: 240 },
      { zutatId: 'z_schwarzebohnen', menge: 400 },
      { zutatId: 'z_mais',          menge: 200 },
      { zutatId: 'z_cheddar',       menge: 120 },
    ],
    anleitung: '1. Bohnen mit Kreuzkümmel + Paprika anbraten, leicht zerdrücken.\n2. Wrap belegen: Reis, Bohnen, Mais, Cheddar, Salsa.\n3. Rollen, anbraten.\nTop für TK-Vorrat.' }),

  createRezept({ id: 'r_griechischer_salat', name: 'Griechischer Salat', kategorien: ['Salate'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_tomate',    menge: 400 },
      { zutatId: 'z_gurke',     menge: 300 },
      { zutatId: 'z_feta',      menge: 200 },
      { zutatId: 'z_olivenoel', menge: 40  },
    ],
    anleitung: '1. Tomate + Gurke grob würfeln.\n2. Rote Zwiebeln, Oliven, Feta-Block oben.\n3. Olivenöl + Oregano + Essig.\nFrisch am besten — nicht lange lagern.' }),
]
