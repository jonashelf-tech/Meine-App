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

  createRezept({ id: 'r_tomatensauce', name: 'Tomatensoße (Basis)', kategorien: ['Saucen'],
    basisPortionen: 8, ergibtMenge: 2000, ergibtEinheit: 'ml', kochdauer: 40,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [
      { zutatId: 'z_dosentomaten', menge: 1600 },
      { zutatId: 'z_zwiebel',      menge: 300  },
      { zutatId: 'z_knoblauch',    menge: 20   },
      { zutatId: 'z_tomatenmark',  menge: 60   },
      { zutatId: 'z_salz',         menge: 10   },
    ],
    anleitung: 'Zwiebeln + Knoblauch glasig dünsten, Tomatenmark 2 Min rösten. Dosentomaten dazu, 30 Min köcheln, pürieren. Kräuter erst beim Ableiten zufügen — Basis bleibt neutral.' }),

  createRezept({ id: 'r_pulledchicken', name: 'Pulled Chicken (Basis)', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1250, ergibtEinheit: 'g', kochdauer: 180,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_haehnchensch', menge: 1500 },
      { zutatId: 'z_zwiebel',      menge: 200  },
      { zutatId: 'z_salz',         menge: 15   },
    ],
    anleitung: 'Schenkel mit Zwiebeln + Brühe 3 h bei 160° schmoren. Knochen raus, Fleisch mit zwei Gabeln zerzupfen. Als Block einfrieren.' }),

  createRezept({ id: 'r_pulledpork', name: 'Pulled Pork BBQ (Basis)', kategorien: ['Saucen'],
    basisPortionen: 8, ergibtMenge: 1500, ergibtEinheit: 'g', kochdauer: 480,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_schweinenacken', menge: 2200 },
      { zutatId: 'z_zwiebel',        menge: 200  },
      { zutatId: 'z_bbqsauce',       menge: 200  },
      { zutatId: 'z_salz',           menge: 20   },
    ],
    anleitung: 'Nacken mit Rub einreiben, 8 h bei 120° im Ofen (Kerntemp 92°). Zerzupfen, mit BBQ-Sauce + Bratensaft mischen. Portionsweise als Block einfrieren.' }),

  createRezept({ id: 'r_thaicurry', name: 'Thai-Curry Basis', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1500, ergibtEinheit: 'ml', kochdauer: 30,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_kokosmilch',  menge: 800 },
      { zutatId: 'z_currypaste',  menge: 60  },
      { zutatId: 'z_zwiebel',     menge: 200 },
      { zutatId: 'z_salz',        menge: 8   },
    ],
    anleitung: 'Zwiebeln anschwitzen, Currypaste 2 Min mitrösten bis es duftet. Kokosmilch aufgießen, 20 Min sanft köcheln. Als Block einfrieren, Gemüse + Protein immer frisch.' }),

  createRezept({ id: 'r_tacohack', name: 'Taco-Hack (Basis)', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1250, ergibtEinheit: 'g', kochdauer: 30,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_hack',         menge: 1000 },
      { zutatId: 'z_zwiebel',      menge: 200  },
      { zutatId: 'z_tomatenmark',  menge: 60   },
      { zutatId: 'z_schwarzebohnen', menge: 240 },
      { zutatId: 'z_salz',         menge: 12   },
    ],
    anleitung: 'Hack krümelig braten, Zwiebeln dazu. Tomatenmark + Taco-Gewürz (Kreuzkümmel, Paprika, Chili, Oregano) rösten. Bohnen + etwas Wasser, 10 Min einköcheln. Als Block einfrieren.' }),

  createRezept({ id: 'r_kaesesauce', name: 'Cheddar-Käsesauce (Basis)', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1000, ergibtEinheit: 'ml', kochdauer: 20,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [
      { zutatId: 'z_milch',   menge: 700 },
      { zutatId: 'z_cheddar', menge: 300 },
      { zutatId: 'z_butter',  menge: 50  },
      { zutatId: 'z_mehl',    menge: 50  },
      { zutatId: 'z_salz',    menge: 6   },
    ],
    anleitung: 'Mehlschwitze aus Butter + Mehl, mit Milch glattrühren. Aufkochen, Cheddar schmelzen, mit Muskat + Salz abschmecken. Auf Vorrat einfrieren — beim Auftauen mit Schuss Milch aufschlagen.' }),

  createRezept({ id: 'r_dal', name: 'Rote-Linsen-Dal (Basis)', kategorien: ['Saucen'],
    basisPortionen: 5, ergibtMenge: 1500, ergibtEinheit: 'g', kochdauer: 35,
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_linsen',     menge: 400 },
      { zutatId: 'z_kokosmilch', menge: 400 },
      { zutatId: 'z_zwiebel',    menge: 200 },
      { zutatId: 'z_tomatenmark', menge: 50 },
      { zutatId: 'z_salz',       menge: 10  },
    ],
    anleitung: 'Zwiebeln + Curry/Kurkuma anschwitzen, Tomatenmark rösten. Linsen + Kokosmilch + Wasser, 25 Min köcheln bis cremig. Als Block einfrieren.' }),

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
    anleitung: 'Alle Zutaten fein mixen. Im Kühlschrank 2 Wochen haltbar. Protein mind. 2 Std marinieren — über Nacht optimal.' }),

  createRezept({ id: 'r_joghurt_marinade', name: 'Joghurt-Knoblauch Marinade', kategorien: ['Marinaden'],
    basisPortionen: 4, ergibtMenge: 200, ergibtEinheit: 'ml', kochdauer: 10,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_joghurt',   menge: 160 },
      { zutatId: 'z_knoblauch', menge: 15  },
      { zutatId: 'z_salz',      menge: 5   },
    ],
    anleitung: 'Joghurt + gepresster Knoblauch + Zitronensaft + Salz + Oregano verrühren. Als Marinade (2 Std) oder Dip/Dressing direkt.' }),

  createRezept({ id: 'r_zitronen_marinade', name: 'Zitronen-Kräuter Marinade', kategorien: ['Marinaden'],
    basisPortionen: 6, ergibtMenge: 200, ergibtEinheit: 'ml', kochdauer: 10,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_olivenoel', menge: 100 },
      { zutatId: 'z_limette',   menge: 60  },
      { zutatId: 'z_knoblauch', menge: 15  },
      { zutatId: 'z_salz',      menge: 5   },
    ],
    anleitung: 'Olivenöl, Zitrone/Limette, Knoblauch, Oregano + Thymian verrühren. Ideal für Hähnchen, Fisch, Halloumi. Mind. 1 Std marinieren.' }),

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
    anleitung: 'Zwiebel fein anschwitzen, alles dazu + Paprikapulver, Senf, Rauchsalz. 20 Min köcheln bis sirupartig. Pürieren. In Gläser, hält Wochen — oder als Eiswürfel einfrieren.' }),

  createRezept({ id: 'r_erdnusssauce', name: 'Erdnuss-Satay-Sauce', kategorien: ['Saucen'],
    basisPortionen: 8, ergibtMenge: 500, ergibtEinheit: 'ml', kochdauer: 15,
    bausteinTyp: 'sauce', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [
      { zutatId: 'z_erdnussbutter', menge: 200 },
      { zutatId: 'z_kokosmilch',    menge: 200 },
      { zutatId: 'z_sojasauce',     menge: 40  },
      { zutatId: 'z_limette',       menge: 40  },
    ],
    anleitung: 'Erdnussbutter + Kokosmilch + Sojasauce + Limette + bisschen Currypaste glattrühren, kurz erwärmen. Für Bowls, Wraps, Gemüse-Dip. Einfrierbar in Würfeln.' }),

  createRezept({ id: 'r_pilzrahm', name: 'Pilzrahm-Sauce', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 800, ergibtEinheit: 'ml', kochdauer: 25,
    bausteinTyp: 'sauce', langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Box'] },
    zutaten: [
      { zutatId: 'z_champignon', menge: 400 },
      { zutatId: 'z_schmand',    menge: 300 },
      { zutatId: 'z_zwiebel',    menge: 100 },
      { zutatId: 'z_salz',       menge: 6   },
    ],
    anleitung: 'Champignons + Zwiebel scharf braten (Wasser muss weg!). Mit Brühe ablöschen, Schmand dazu, einköcheln. Petersilie. Zu Pasta, Schnitzel, Kartoffeln.' }),

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
    anleitung: 'Mayo, Parmesan, Senf, Knoblauch, Zitrone + Sardellenpaste verrühren. Mit Wasser auf Dressing-Konsistenz. Hält 1 Woche im Glas.' }),

  createRezept({ id: 'r_honig_senf', name: 'Honig-Senf-Dressing', kategorien: ['Dressings'],
    basisPortionen: 8, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 5,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_senf',      menge: 80 },
      { zutatId: 'z_honig',     menge: 60 },
      { zutatId: 'z_olivenoel', menge: 80 },
      { zutatId: 'z_essig',     menge: 30 },
    ],
    anleitung: 'Senf, Honig, Öl, Essig kräftig verrühren oder shaken. Süß-scharfe Balance abschmecken. Zu Blattsalat, Bowls, gebratenem Hähnchen.' }),

  createRezept({ id: 'r_tahini_dressing', name: 'Tahini-Zitronen-Dressing', kategorien: ['Dressings'],
    basisPortionen: 8, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 5,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_tahini',    menge: 120 },
      { zutatId: 'z_limette',   menge: 50  },
      { zutatId: 'z_knoblauch', menge: 10  },
    ],
    anleitung: 'Tahini + Zitrone/Limette + Knoblauch + Wasser löffelweise glattrühren (wird erst fest, dann cremig). Salzen. Zu Falafel, Bowls, geröstetem Gemüse.' }),

  createRezept({ id: 'r_avocado_dressing', name: 'Avocado-Limetten-Dressing', kategorien: ['Dressings'],
    basisPortionen: 6, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 10,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_avocado', menge: 150 },
      { zutatId: 'z_joghurt', menge: 100 },
      { zutatId: 'z_limette', menge: 40  },
    ],
    anleitung: 'Avocado, Joghurt, Limette, Koriander, Knoblauch cremig pürieren. Mit Wasser verdünnen. Frisch verwenden (max. 2 Tage). Zu Tacos, Bowls, Salaten.' }),

  createRezept({ id: 'r_balsamico_vinaigrette', name: 'Balsamico-Vinaigrette', kategorien: ['Dressings'],
    basisPortionen: 10, ergibtMenge: 250, ergibtEinheit: 'ml', kochdauer: 5,
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_olivenoel', menge: 150 },
      { zutatId: 'z_essig',     menge: 70  },
      { zutatId: 'z_senf',      menge: 20  },
      { zutatId: 'z_honig',     menge: 20  },
    ],
    anleitung: '3 Teile Öl, 1 Teil Balsamico, Löffel Senf + Honig als Emulgator. Kräftig shaken. Klassiker zu jedem Blattsalat. Hält 2 Wochen.' }),

  // ══════════════════════════════════════════════════════════════════════════
  // KETTE — Tomatensoße
  // ══════════════════════════════════════════════════════════════════════════

  // ── Zwischen-Basis: Bolognese (aus Tomatensoße) → Basis für Lasagne & Chili ──
  createRezept({ id: 'r_bolognese', name: 'Bolognese (Basis)', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 5, kochdauer: 30, ergibtMenge: 1500, ergibtEinheit: 'g',
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_hack',        menge: 600 },
      { zutatId: 'z_karotte',     menge: 150 },
      { zutatId: 'z_tomatenmark', menge: 40  },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 750 }],
    anleitung: 'Karotte + Zwiebel anschwitzen. Hack zugeben und krümelig braten. Tomatenmark rösten, mit Rotwein ablöschen. Tomatensoße dazu, 20 Min köcheln. Als Block einfrieren — wird zu Pasta, Lasagne oder Chili.' }),

  createRezept({ id: 'r_bolo_pasta', name: 'Pasta Bolognese', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',    menge: 270 },
      { zutatId: 'z_parmesan', menge: 60  },
    ],
    komponenten: [{ rezeptId: 'r_bolognese', menge: 750 }],
    anleitung: 'Bolognese-Basis erwärmen. Pasta al dente, mit etwas Nudelwasser unter die Soße schwenken. Parmesan + Basilikum.' }),

  createRezept({ id: 'r_chili', name: 'Chili con Carne', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_kidneybohnen', menge: 400 },
      { zutatId: 'z_mais',         menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_bolognese', menge: 1000 }],
    anleitung: 'Bolognese-Basis erhitzen, mit Kreuzkümmel, Chili + geräuchertem Paprika aufpeppen. Bohnen + Mais dazu, 15 Min köcheln. Geheimtipp: Bitterschokolade + Schuss Espresso für Tiefe.' }),

  createRezept({ id: 'r_shakshuka', name: 'Shakshuka', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 2, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_paprika', menge: 200 },
      { zutatId: 'z_ei',      menge: 240 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: 'Paprika + Zwiebel anbraten, etwas Harissa. Tomatensoße drauf, aufkochen. 4 Mulden formen, Eier rein. Deckel, 3–4 Min bei schwacher Hitze. Mit Joghurt + Petersilie.' }),

  createRezept({ id: 'r_fitness_lasagne', name: 'Fitness-Lasagne', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 6, kochdauer: 55, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',      menge: 280 },
      { zutatId: 'z_frischkaese', menge: 400 },
      { zutatId: 'z_mozzarella', menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_bolognese', menge: 1250 }],
    anleitung: 'Bolognese-Basis erwärmen. Schichten: Nudelplatten / Bolognese / Frischkäse (statt Béchamel). Oben Mozzarella. 180° 40 Min.' }),

  createRezept({ id: 'r_hackncheese', name: "Hack 'n' Cheese", kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 40, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_hack',       menge: 500 },
      { zutatId: 'z_reis',       menge: 300 },
      { zutatId: 'z_frischkaese', menge: 250 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: 'Hack krümelig braten, Reis kochen. Alles in Auflaufform, Frischkäse unterrühren, Tomatensoße drauf. 180° 25 Min. Optional überbacken.' }),

  createRezept({ id: 'r_arrabiata', name: 'Penne Arrabiata', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 20, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_pasta',     menge: 270 },
      { zutatId: 'z_knoblauch', menge: 20  },
      { zutatId: 'z_parmesan',  menge: 60  },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: 'Knoblauch + Chiliflocken in Öl, Tomatensoße dazu, einkochen. Penne al dente, mit etwas Nudelwasser schwenken. Parmesan + Petersilie.' }),

  createRezept({ id: 'r_tomatensuppe', name: 'Cremige Tomatensuppe', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Glas', 'Box'] },
    zutaten: [
      { zutatId: 'z_schmand', menge: 150 },
      { zutatId: 'z_paprika', menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 750 }],
    anleitung: 'Paprika mitrösten, Tomatensoße + Brühe aufkochen, fein pürieren. Schmand einrühren, mit Basilikum. Dazu geröstetes Brot.' }),

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
    anleitung: 'Reis kochen, Pulled Chicken erwärmen + BBQ-Sauce unterziehen. Bowl: Reis, Chicken, frischer Salat. Pickled Onions als Topping.' }),

  createRezept({ id: 'r_pulled_wrap', name: 'Pulled Chicken Wrap', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_joghurt', menge: 200 },
      { zutatId: 'z_salat',   menge: 160 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: 'Pulled Chicken erwärmen. Wrap mit Joghurt-Knoblauch bestreichen, Chicken + Salat + Gurke rein. Fest rollen, optional kurz anbraten.' }),

  createRezept({ id: 'r_pulled_burrito', name: 'Chicken Burrito', kategorien: ['Burritos'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',     menge: 320 },
      { zutatId: 'z_reis',     menge: 240 },
      { zutatId: 'z_mais',     menge: 150 },
      { zutatId: 'z_cheddar',  menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: 'Chicken erwärmen. Wrap belegen: Reis, Chicken, Mais, Cheddar, Salsa. Fest rollen, Naht nach unten anbraten. Einzeln in Folie für TK.' }),

  createRezept({ id: 'r_pulled_quesadilla', name: 'Chicken Quesadilla', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_cheddar', menge: 200 },
      { zutatId: 'z_paprika', menge: 150 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 250 }],
    anleitung: 'Wrap halb mit Chicken, Cheddar, Paprika belegen, zuklappen. In trockener Pfanne beidseitig goldbraun, bis Käse schmilzt. In Spalten schneiden.' }),

  createRezept({ id: 'r_pulled_salat', name: 'Pulled Chicken Salat-Bowl', kategorien: ['Salate'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_salat',   menge: 320 },
      { zutatId: 'z_mais',    menge: 150 },
      { zutatId: 'z_gurke',   menge: 200 },
      { zutatId: 'z_avocado', menge: 140 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 500 }],
    anleitung: 'Pulled Chicken kalt oder lauwarm. Großer Salat mit Mais, Gurke, Avocado, Kirschtomaten. Mit Honig-Senf- oder Avocado-Dressing.' }),

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
    anleitung: 'Reis kochen, Pork erwärmen. Bowl: Reis, Pork, Krautsalat (Rotkohl + bisschen Essig/Öl), Mais, Frühlingszwiebeln.' }),

  createRezept({ id: 'r_pork_burrito', name: 'Pulled Pork Burrito', kategorien: ['Burritos'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 320 },
      { zutatId: 'z_reis',    menge: 240 },
      { zutatId: 'z_schwarzebohnen', menge: 200 },
      { zutatId: 'z_cheddar', menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_pulledpork', menge: 500 }],
    anleitung: 'Pork erwärmen. Wrap belegen: Reis, Pork, schwarze Bohnen, Cheddar, Salsa. Fest rollen, anbraten. Einzeln in Folie für TK.' }),

  createRezept({ id: 'r_pork_burger', name: 'Pulled Pork Burger', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_burgerbun', menge: 360 },
      { zutatId: 'z_rotkohl',   menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_pulledpork', menge: 500 }],
    anleitung: 'Buns toasten. Pork mit extra BBQ erwärmen. Belegen: Pork, Coleslaw (Rotkohl), Gurke. Deckel drauf. Pommes dazu.' }),

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
    anleitung: 'Reis kochen, Taco-Hack erwärmen. Bowl: Reis, Hack, Mais, Salat, Cheddar, Salsa + Guacamole. Tortilla-Chips zum Dippen.' }),

  createRezept({ id: 'r_taco_burrito', name: 'Beef Burrito', kategorien: ['Burritos'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 320 },
      { zutatId: 'z_reis',    menge: 240 },
      { zutatId: 'z_cheddar', menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_tacohack', menge: 500 }],
    anleitung: 'Taco-Hack erwärmen. Wrap belegen: Reis, Hack, Cheddar, Salsa, etwas Salat. Fest rollen, Naht anbraten. Einzeln in Folie für TK.' }),

  createRezept({ id: 'r_quesadilla', name: 'Beef Quesadilla', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_cheddar', menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_tacohack', menge: 250 }],
    anleitung: 'Wrap halb mit Hack + Cheddar belegen, zuklappen. In trockener Pfanne beidseitig knusprig. In Spalten, mit Salsa + Guac.' }),

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
    anleitung: 'Tortilla-Chips auf Blech, Taco-Hack + Käsesauce + Cheddar drüber. 180° 10 Min überbacken. Mit Guacamole, Salsa, Jalapeños, Schmand toppen.' }),

  createRezept({ id: 'r_taco_salat', name: 'Taco-Salat', kategorien: ['Salate'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_salat',   menge: 320 },
      { zutatId: 'z_mais',    menge: 150 },
      { zutatId: 'z_tomate',  menge: 200 },
      { zutatId: 'z_avocado', menge: 140 },
    ],
    komponenten: [{ rezeptId: 'r_tacohack', menge: 500 }],
    anleitung: 'Taco-Hack lauwarm auf großem Salat mit Mais, Tomate, Avocado, Cheddar. Mit Salsa + Joghurt-Dressing. Tortilla-Chips als Crunch.' }),

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
    anleitung: 'Makkaroni al dente, mit Käsesauce mischen. In Auflaufform, extra Cheddar + Semmelbrösel drüber. 200° 15 Min goldbraun überbacken.' }),

  createRezept({ id: 'r_blumenkohl_gratin', name: 'Blumenkohl-Käse-Gratin', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, kochdauer: 35, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_blumenkohl', menge: 800 },
      { zutatId: 'z_cheddar',    menge: 100 },
    ],
    komponenten: [{ rezeptId: 'r_kaesesauce', menge: 500 }],
    anleitung: 'Blumenkohl 5 Min vorgaren, in Auflaufform. Käsesauce drüber, Cheddar oben. 200° 25 Min. Low-Carb-Sattmacher.' }),

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
    anleitung: 'Hähnchen scharf anbraten (nicht durchgaren). Thai-Curry Basis erhitzen, Hähnchen + Brokkoli rein, 8 Min köcheln. Mit Reis servieren.' }),

  createRezept({ id: 'r_thai_suppe', name: 'Thai-Kokos-Suppe', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_kokosmilch', menge: 300 },
      { zutatId: 'z_champignon', menge: 300 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 500 }],
    anleitung: 'Thai-Curry Basis + extra Kokosmilch, mit Gemüsebrühe verlängern. Champignons rein, aufkochen. Koriander + Limette oben.' }),

  createRezept({ id: 'r_curry_garnelen', name: 'Garnelen-Curry', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, kochdauer: 20, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_garnelen', menge: 450 },
      { zutatId: 'z_reis',     menge: 240 },
      { zutatId: 'z_paprika',  menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 500 }],
    anleitung: 'Curry-Basis mit Paprika erhitzen. Garnelen erst 3 Min vor Ende rein (sonst zäh!). Mit Reis + Limette. Nicht einfrieren.' }),

  createRezept({ id: 'r_curry_tofu_bowl', name: 'Curry-Tofu Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 25, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_tofu',     menge: 500 },
      { zutatId: 'z_reis',     menge: 320 },
      { zutatId: 'z_brokkoli', menge: 400 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 500 }],
    anleitung: 'Tofu pressen, würfeln, knusprig braten. Curry-Basis + Brokkoli erhitzen, Tofu erst zum Schluss. Bowl mit Reis. Erdnüsse als Topping.' }),

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
    anleitung: 'Dal erwärmen, Spinat unterrühren bis er zusammenfällt. Bowl: Reis, Dal, Klecks Joghurt, Koriander. Naan optional.' }),

  createRezept({ id: 'r_dal_wrap', name: 'Dal-Wrap', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_joghurt', menge: 160 },
      { zutatId: 'z_salat',   menge: 120 },
    ],
    komponenten: [{ rezeptId: 'r_dal', menge: 500 }],
    anleitung: 'Dal eindicken (darf nicht zu flüssig sein). Wrap mit Joghurt bestreichen, Dal + Salat + rote Zwiebeln. Rollen, anbraten.' }),

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
    anleitung: 'Reis kochen, Hack mit Teriyaki + Sesamöl scharf braten. Brokkoli dämpfen. Bowl schichten, Sesam + Frühlingszwiebeln oben.' }),

  createRezept({ id: 'r_bigmac_bowl', name: 'Big Mac Bowl', kategorien: ['Bowls', 'Salate'],
    basisPortionen: 4, kochdauer: 20, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_hack',      menge: 500 },
      { zutatId: 'z_salat',     menge: 320 },
      { zutatId: 'z_gurke',     menge: 200 },
      { zutatId: 'z_teriyaki',  menge: 80  },
    ],
    anleitung: 'Hack in kleine Patties braten. Bowl: Salat, Hack, Gurke, Tomate, Gewürzgurke. Big Mac Soße: Mayo + Senf + Gurke + Essig + Paprika. Sesam oben.' }),

  createRezept({ id: 'r_chicken_soja_bowl', name: 'Chicken Soja-Limetten Bowl', kategorien: ['Bowls', 'Salate'],
    basisPortionen: 4, kochdauer: 25, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_haehnchen', menge: 600 },
      { zutatId: 'z_reis',      menge: 320 },
      { zutatId: 'z_salat',     menge: 200 },
      { zutatId: 'z_paprika',   menge: 200 },
      { zutatId: 'z_sojasauce', menge: 80  },
    ],
    anleitung: 'Hähnchen in Soja+Limette+Sesamöl Marinade (30 Min), scharf braten. Bowl: Reis, Hähnchen, Salat, Paprika, Edamame. Sesam + Frühlingszwiebeln oben.' }),

  createRezept({ id: 'r_falafel_bowl', name: 'Mediterrane Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, kochdauer: 25, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_couscous', menge: 320 },
      { zutatId: 'z_tomate',   menge: 200 },
      { zutatId: 'z_gurke',    menge: 200 },
      { zutatId: 'z_feta',     menge: 120 },
    ],
    anleitung: 'Couscous quellen lassen. Bowl: Couscous, Tomate, Gurke, Feta, Oliven, rote Zwiebeln. Mit Tahini- oder Zitronen-Dressing. Falafel optional.' }),

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
    anleitung: 'Chili + Pulled Chicken + Reis + Frischkäse auf Wrap. Fest rollen, Nahtseite nach unten kurz anbraten. Einzeln in Folie für TK.' }),

  createRezept({ id: 'r_breakfast_burrito', name: 'Breakfast Burrito', kategorien: ['Burritos'],
    basisPortionen: 4, kochdauer: 20, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_ei',      menge: 360 },
      { zutatId: 'z_cheddar', menge: 120 },
      { zutatId: 'z_paprika', menge: 150 },
    ],
    anleitung: 'Rührei mit Paprika + Frühlingszwiebeln. Wrap belegen: Rührei, Cheddar, Bohnen, Salsa. Rollen, anbraten. Perfekt zum Vorbereiten + Einfrieren.' }),

  createRezept({ id: 'r_veggie_burrito', name: 'Veggie-Bohnen-Burrito', kategorien: ['Burritos'],
    basisPortionen: 5, kochdauer: 25, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',          menge: 320 },
      { zutatId: 'z_reis',          menge: 240 },
      { zutatId: 'z_schwarzebohnen', menge: 400 },
      { zutatId: 'z_mais',          menge: 200 },
      { zutatId: 'z_cheddar',       menge: 120 },
    ],
    anleitung: 'Bohnen mit Kreuzkümmel + Paprika anbraten, leicht zerdrücken. Wrap belegen: Reis, Bohnen, Mais, Cheddar, Salsa. Rollen, anbraten. Top für TK-Vorrat.' }),

  createRezept({ id: 'r_griechischer_salat', name: 'Griechischer Salat', kategorien: ['Salate'],
    basisPortionen: 4, kochdauer: 15, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_tomate',    menge: 400 },
      { zutatId: 'z_gurke',     menge: 300 },
      { zutatId: 'z_feta',      menge: 200 },
      { zutatId: 'z_olivenoel', menge: 40  },
    ],
    anleitung: 'Tomate + Gurke grob würfeln, rote Zwiebeln, Oliven, Feta-Block oben. Olivenöl + Oregano + Essig. Keine Aufbewahrung — frisch am besten.' }),
]
