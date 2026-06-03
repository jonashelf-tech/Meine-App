import { createZutat, createRezept } from './mealprepModel'

export const seedZutaten = () => [
  // ── PROTEIN ──────────────────────────────────────────────────────────────
  createZutat({ id: 'z_haehnchen',    name: 'Hähnchenbrust',        einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 200, garNotiz: 'scharf anbraten',             naehrwert: { kcal: 110, protein: 23, carbs: 0,  fat: 2  } }),
  createZutat({ id: 'z_hack',         name: 'Rinderhack',           einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 150, garNotiz: 'krümelig braten',             naehrwert: { kcal: 200, protein: 18, carbs: 0,  fat: 14 } }),
  createZutat({ id: 'z_tofu',         name: 'Tofu',                 einkaufKategorie: 'Milchprodukte',   bausteinTyp: 'protein', gProPortion: 150, garNotiz: 'pressen, scharf anbraten',    naehrwert: { kcal: 120, protein: 13, carbs: 2,  fat: 7  } }),
  createZutat({ id: 'z_lachs',        name: 'Lachsfilet',           einkaufKategorie: 'Fleisch & Fisch', bausteinTyp: 'protein', gProPortion: 180, garNotiz: 'Haut knusprig braten',        naehrwert: { kcal: 200, protein: 20, carbs: 0,  fat: 13 } }),
  createZutat({ id: 'z_ei',           name: 'Eier',                 einkaufKategorie: 'Milchprodukte',   bausteinTyp: 'protein', gProPortion: 120, garNotiz: 'über-easy braten',            naehrwert: { kcal: 155, protein: 13, carbs: 1,  fat: 11 } }),

  // ── KOHLENHYDRATE ────────────────────────────────────────────────────────
  createZutat({ id: 'z_reis',         name: 'Reis (trocken)',        einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 80,  garNotiz: '1:2 kochen',                  naehrwert: { kcal: 350, protein: 7,  carbs: 78, fat: 1  } }),
  createZutat({ id: 'z_pasta',        name: 'Pasta (trocken)',       einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 90,  garNotiz: 'al dente kochen',             naehrwert: { kcal: 360, protein: 12, carbs: 72, fat: 2  } }),
  createZutat({ id: 'z_wrap',         name: 'Wrap',                 einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 64,  garNotiz: 'kurz erwärmen',               naehrwert: { kcal: 300, protein: 8,  carbs: 50, fat: 7  } }),
  createZutat({ id: 'z_kartoffel',    name: 'Kartoffeln',           einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'kh',      gProPortion: 250, garNotiz: 'Ofen 200°, 35 Min',           naehrwert: { kcal: 77,  protein: 2,  carbs: 17, fat: 0  } }),
  createZutat({ id: 'z_couscous',     name: 'Couscous (trocken)',   einkaufKategorie: 'Brot & Getreide', bausteinTyp: 'kh',      gProPortion: 80,  garNotiz: '1:1 kochendes Wasser, 5 Min', naehrwert: { kcal: 376, protein: 13, carbs: 72, fat: 2  } }),

  // ── GEMÜSE ───────────────────────────────────────────────────────────────
  createZutat({ id: 'z_brokkoli',     name: 'Brokkoli',             einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 200, garNotiz: 'dämpfen, 6 Min',              naehrwert: { kcal: 34,  protein: 3,  carbs: 7,  fat: 0  } }),
  createZutat({ id: 'z_paprika',      name: 'Paprika',              einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Streifen, anbraten',          naehrwert: { kcal: 31,  protein: 1,  carbs: 6,  fat: 0  } }),
  createZutat({ id: 'z_zucchini',     name: 'Zucchini',             einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Würfel, scharf braten',       naehrwert: { kcal: 17,  protein: 1,  carbs: 3,  fat: 0  } }),
  createZutat({ id: 'z_spinat',       name: 'Blattspinat',          einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 100, garNotiz: 'zusammenfallen lassen',       naehrwert: { kcal: 23,  protein: 3,  carbs: 1,  fat: 0  } }),
  createZutat({ id: 'z_karotte',      name: 'Karotten',             einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'Scheiben, mitdünsten',        naehrwert: { kcal: 41,  protein: 1,  carbs: 10, fat: 0  } }),
  createZutat({ id: 'z_champignon',   name: 'Champignons',          einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 150, garNotiz: 'scharf anbraten (trocken!)',  naehrwert: { kcal: 22,  protein: 3,  carbs: 3,  fat: 0  } }),
  createZutat({ id: 'z_salat',        name: 'Salat (gemischt)',     einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 80,  garNotiz: 'frisch, nicht aufwärmen',     naehrwert: { kcal: 14,  protein: 1,  carbs: 2,  fat: 0  } }),
  createZutat({ id: 'z_gurke',        name: 'Gurke',                einkaufKategorie: 'Gemüse & Obst',   bausteinTyp: 'gemuese', gProPortion: 100, garNotiz: 'frisch',                      naehrwert: { kcal: 13,  protein: 1,  carbs: 2,  fat: 0  } }),

  // ── SAUCE / DRESSING ─────────────────────────────────────────────────────
  createZutat({ id: 'z_currysauce',   name: 'Kokos-Curry-Sauce',    einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 120, garNotiz: 'köcheln',            naehrwert: { kcal: 90,  protein: 1,  carbs: 4,  fat: 8  } }),
  createZutat({ id: 'z_teriyaki',     name: 'Teriyaki-Sauce',       einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 40,  garNotiz: 'einreduzieren',      naehrwert: { kcal: 130, protein: 3,  carbs: 28, fat: 0  } }),
  createZutat({ id: 'z_frischkaese',  name: 'Körniger Frischkäse',  einkaufKategorie: 'Milchprodukte',            bausteinTyp: 'sauce', gProPortion: 100, garNotiz: 'unterrühren',        naehrwert: { kcal: 100, protein: 12, carbs: 3,  fat: 5  } }),
  createZutat({ id: 'z_bbqsauce',     name: 'BBQ-Sauce',            einkaufKategorie: 'Konserven & Trockenwaren', bausteinTyp: 'sauce', gProPortion: 40,  garNotiz: 'direkt verwenden',   naehrwert: { kcal: 110, protein: 1,  carbs: 26, fat: 0  } }),
  createZutat({ id: 'z_joghurt',      name: 'Griechischer Joghurt', einkaufKategorie: 'Milchprodukte',            bausteinTyp: 'sauce', gProPortion: 100, garNotiz: 'kalt',               naehrwert: { kcal: 97,  protein: 9,  carbs: 4,  fat: 5  } }),

  // ── BASIS-ZUTATEN (kein bausteinTyp — nur in Basis-Rezepten) ─────────────
  createZutat({ id: 'z_dosentomaten', name: 'Dosentomaten',         einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 20,  protein: 1,  carbs: 4,  fat: 0  } }),
  createZutat({ id: 'z_tomatenmark',  name: 'Tomatenmark',          einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 82,  protein: 4,  carbs: 15, fat: 0  } }),
  createZutat({ id: 'z_zwiebel',      name: 'Zwiebeln',             einkaufKategorie: 'Gemüse & Obst',            naehrwert: { kcal: 40,  protein: 1,  carbs: 9,  fat: 0  } }),
  createZutat({ id: 'z_haehnchensch', name: 'Hähnchenschenkel',     einkaufKategorie: 'Fleisch & Fisch',          naehrwert: { kcal: 180, protein: 19, carbs: 0,  fat: 11 } }),
  createZutat({ id: 'z_kokosmilch',   name: 'Kokosmilch',           einkaufKategorie: 'Konserven & Trockenwaren', einheit: 'ml', naehrwert: { kcal: 230, protein: 2, carbs: 6, fat: 24 } }),
  createZutat({ id: 'z_currypaste',   name: 'Rote Currypaste',      einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 150, protein: 3,  carbs: 10, fat: 12 } }),
  createZutat({ id: 'z_kidneybohnen', name: 'Kidney-Bohnen (Dose)', einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 94,  protein: 7,  carbs: 16, fat: 0  } }),
  createZutat({ id: 'z_mais',         name: 'Mais (Dose)',          einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 86,  protein: 3,  carbs: 19, fat: 1  } }),
  createZutat({ id: 'z_mozzarella',   name: 'Mozzarella',           einkaufKategorie: 'Milchprodukte',            naehrwert: { kcal: 254, protein: 18, carbs: 2,  fat: 20 } }),
  createZutat({ id: 'z_sojasauce',    name: 'Soja-Sauce',           einkaufKategorie: 'Konserven & Trockenwaren', einheit: 'ml', naehrwert: { kcal: 53, protein: 8, carbs: 5, fat: 0 } }),
  createZutat({ id: 'z_gochujang',    name: 'Gochujang',            einkaufKategorie: 'Konserven & Trockenwaren', naehrwert: { kcal: 130, protein: 4,  carbs: 24, fat: 2  } }),
  createZutat({ id: 'z_salz',         name: 'Salz',                 einkaufKategorie: 'Gewürze',                  naehrwert: { kcal: 0,   protein: 0,  carbs: 0,  fat: 0  } }),
]

export const seedRezepte = () => [

  // ══ BASEN ══════════════════════════════════════════════════════════════════

  createRezept({ id: 'r_tomatensauce', name: 'Tomatensoße (Basis)', kategorien: ['Saucen'],
    basisPortionen: 8, ergibtMenge: 2000, ergibtEinheit: 'ml',
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Eiswürfel'] },
    zutaten: [
      { zutatId: 'z_dosentomaten', menge: 1600 },
      { zutatId: 'z_zwiebel',      menge: 300  },
      { zutatId: 'z_tomatenmark',  menge: 60   },
      { zutatId: 'z_salz',         menge: 10   },
    ],
    anleitung: 'Zwiebeln glasig dünsten, Tomatenmark 2 Min rösten. Dosentomaten dazu, 30 Min köcheln, pürieren. Kräuter erst beim Ableiten zufügen — Basis bleibt neutral.' }),

  createRezept({ id: 'r_pulledchicken', name: 'Pulled Chicken (Basis)', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1200, ergibtEinheit: 'g',
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Box', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_haehnchensch', menge: 1500 },
      { zutatId: 'z_zwiebel',      menge: 200  },
      { zutatId: 'z_salz',         menge: 15   },
    ],
    anleitung: 'Schenkel mit Zwiebeln + Brühe 3 h bei 160° schmoren. Knochen raus, Fleisch mit zwei Gabeln zerzupfen. Als Block einfrieren.' }),

  createRezept({ id: 'r_thaicurry', name: 'Thai-Curry Basis', kategorien: ['Saucen'],
    basisPortionen: 6, ergibtMenge: 1500, ergibtEinheit: 'ml',
    langlaeufer: true, aufbewahrung: { tk: true, behaelter: ['Glas', 'Blockform'] },
    zutaten: [
      { zutatId: 'z_kokosmilch',  menge: 800 },
      { zutatId: 'z_currypaste',  menge: 60  },
      { zutatId: 'z_zwiebel',     menge: 200 },
      { zutatId: 'z_salz',        menge: 8   },
    ],
    anleitung: 'Zwiebeln anschwitzen, Currypaste 2 Min mitrösten bis es duftet. Kokosmilch aufgießen, 20 Min sanft köcheln. Als Block einfrieren, Gemüse + Protein immer frisch.' }),

  // ── Marinaden (Basis mit bausteinTyp:'sauce') ─────────────────────────────

  createRezept({ id: 'r_korean_marinade', name: 'Korean Gochujang Marinade', kategorien: ['Marinaden'],
    basisPortionen: 6, ergibtMenge: 250, ergibtEinheit: 'ml',
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_gochujang',  menge: 60 },
      { zutatId: 'z_sojasauce',  menge: 80 },
      { zutatId: 'z_zwiebel',    menge: 80 },
      { zutatId: 'z_salz',       menge: 5  },
    ],
    anleitung: 'Alle Zutaten fein mixen. Im Kühlschrank 2 Wochen haltbar. Protein mind. 2 Std marinieren — über Nacht optimal.' }),

  createRezept({ id: 'r_joghurt_marinade', name: 'Joghurt-Knoblauch Marinade', kategorien: ['Marinaden'],
    basisPortionen: 4, ergibtMenge: 200, ergibtEinheit: 'ml',
    bausteinTyp: 'sauce', aufbewahrung: { tk: false, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_joghurt', menge: 160 },
      { zutatId: 'z_zwiebel', menge: 30  },
      { zutatId: 'z_salz',    menge: 5   },
    ],
    anleitung: 'Joghurt + gepresster Knoblauch + Zitronensaft + Salz + Oregano verrühren. Als Marinade (2 Std) oder Dip/Dressing direkt.' }),

  // ══ ABLEITUNGEN — Tomatensoße ══════════════════════════════════════════════

  createRezept({ id: 'r_bolognese', name: 'Bolognese', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_hack',        menge: 500 },
      { zutatId: 'z_karotte',     menge: 150 },
      { zutatId: 'z_tomatenmark', menge: 40  },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 800 }],
    anleitung: 'Karotte + Zwiebel anschwitzen. Hack zugeben und krümelig braten. Tomatenmark rösten, mit Rotwein ablöschen. Tomatensoße dazu, 20 Min köcheln. Mit Parmesan einkochen.' }),

  createRezept({ id: 'r_chili', name: 'Chili con Carne', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 5, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_hack',         menge: 400 },
      { zutatId: 'z_kidneybohnen', menge: 400 },
      { zutatId: 'z_mais',         menge: 200 },
      { zutatId: 'z_tomatenmark',  menge: 50  },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 600 }],
    anleitung: 'Hack scharf anbraten. Tomatenmark rösten. Bohnen + Mais + Tomatensoße dazu. Geheimtipp: Stück Bitterschokolade + Schuss Espresso für Tiefe. 20 Min köcheln.' }),

  createRezept({ id: 'r_shakshuka', name: 'Shakshuka', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 2, aufbewahrung: { tk: false, behaelter: ['frisch'] },
    zutaten: [
      { zutatId: 'z_paprika', menge: 200 },
      { zutatId: 'z_ei',      menge: 240 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 400 }],
    anleitung: 'Paprika + Zwiebel anbraten, etwas Harissa. Tomatensoße drauf, aufkochen. 4 Mulden formen, Eier rein. Deckel, 3–4 Min bei schwacher Hitze. Mit Joghurt + Petersilie.' }),

  createRezept({ id: 'r_fitness_lasagne', name: 'Fitness-Lasagne', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 6, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_hack',       menge: 600 },
      { zutatId: 'z_pasta',      menge: 280 },
      { zutatId: 'z_frischkaese', menge: 400 },
      { zutatId: 'z_mozzarella', menge: 200 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 1000 }],
    anleitung: 'Hack braten, mit Tomatensoße mischen. Schichten: Nudelplatten / Hack-Soße / Frischkäse (statt Béchamel). Oben Mozzarella. 180° 40 Min.' }),

  createRezept({ id: 'r_hackncheese', name: "Hack 'n' Cheese", kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_hack',       menge: 500 },
      { zutatId: 'z_reis',       menge: 300 },
      { zutatId: 'z_frischkaese', menge: 250 },
    ],
    komponenten: [{ rezeptId: 'r_tomatensauce', menge: 500 }],
    anleitung: 'Hack krümelig braten, Reis kochen. Alles in Auflaufform, Frischkäse unterrühren, Tomatensoße drauf. 180° 25 Min. Optional überbacken.' }),

  // ══ ABLEITUNGEN — Pulled Chicken ════════════════════════════════════════════

  createRezept({ id: 'r_pulled_bbq_bowl', name: 'Pulled Chicken BBQ Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_reis',     menge: 320 },
      { zutatId: 'z_bbqsauce', menge: 160 },
      { zutatId: 'z_salat',    menge: 240 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 600 }],
    anleitung: 'Reis kochen, Pulled Chicken erwärmen + BBQ-Sauce unterziehen. Bowl: Reis, Chicken, frischer Salat. Pickled Onions als Topping.' }),

  createRezept({ id: 'r_pulled_wrap', name: 'Pulled Chicken Wrap', kategorien: ['Burritos'],
    basisPortionen: 4, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [
      { zutatId: 'z_wrap',    menge: 256 },
      { zutatId: 'z_joghurt', menge: 200 },
      { zutatId: 'z_salat',   menge: 160 },
    ],
    komponenten: [{ rezeptId: 'r_pulledchicken', menge: 600 }],
    anleitung: 'Pulled Chicken erwärmen. Wrap mit Joghurt-Knoblauch bestreichen, Chicken + Salat + Gurke rein. Fest rollen, optional kurz anbraten.' }),

  // ══ ABLEITUNGEN — Thai-Curry ════════════════════════════════════════════════

  createRezept({ id: 'r_curry_haehnchen', name: 'Kokos-Curry Hähnchen', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 4, aufbewahrung: { tk: true, behaelter: ['Box', 'Glas'] },
    zutaten: [
      { zutatId: 'z_haehnchen', menge: 600 },
      { zutatId: 'z_reis',      menge: 320 },
      { zutatId: 'z_brokkoli',  menge: 400 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 800 }],
    anleitung: 'Hähnchen scharf anbraten (nicht durchgaren). Thai-Curry Basis erhitzen, Hähnchen + Brokkoli rein, 8 Min köcheln. Mit Reis servieren.' }),

  createRezept({ id: 'r_thai_suppe', name: 'Thai-Kokos-Suppe', kategorien: ['Onepot/Auflauf'],
    basisPortionen: 3, aufbewahrung: { tk: true, behaelter: ['Glas'] },
    zutaten: [
      { zutatId: 'z_kokosmilch', menge: 300 },
      { zutatId: 'z_champignon', menge: 300 },
    ],
    komponenten: [{ rezeptId: 'r_thaicurry', menge: 600 }],
    anleitung: 'Thai-Curry Basis + extra Kokosmilch, mit Gemüsebrühe verlängern. Champignons rein, aufkochen. Koriander + Limette oben.' }),

  // ══ KONFIGURIERBAR ════════════════════════════════════════════════════════

  createRezept({ id: 'r_koreanbowl', name: 'Korean Beef Bowl', kategorien: ['Bowls'],
    basisPortionen: 4, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_hack',       menge: 600 },
      { zutatId: 'z_reis',       menge: 320 },
      { zutatId: 'z_brokkoli',   menge: 600 },
      { zutatId: 'z_teriyaki',   menge: 120 },
    ],
    anleitung: 'Reis kochen, Hack mit Teriyaki + Sesamöl scharf braten. Brokkoli dämpfen. Bowl schichten, Sesam + Frühlingszwiebeln oben.' }),

  createRezept({ id: 'r_bigmac_bowl', name: 'Big Mac Bowl', kategorien: ['Bowls', 'Salate'],
    basisPortionen: 4, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_hack',      menge: 500 },
      { zutatId: 'z_salat',     menge: 320 },
      { zutatId: 'z_gurke',     menge: 200 },
      { zutatId: 'z_teriyaki',  menge: 80  },
    ],
    anleitung: 'Hack in kleine Patties braten. Bowl: Salat, Hack, Gurke, Tomate, Gewürzgurke. Big Mac Soße: Mayo + Senf + Gurke + Essig + Paprika. Sesam oben.' }),

  createRezept({ id: 'r_chicken_soja_bowl', name: 'Chicken Soja-Limetten Bowl', kategorien: ['Bowls', 'Salate'],
    basisPortionen: 4, konfigurierbar: true, aufbewahrung: { tk: false, behaelter: ['Box', 'frisch'] },
    zutaten: [
      { zutatId: 'z_haehnchen', menge: 600 },
      { zutatId: 'z_reis',      menge: 320 },
      { zutatId: 'z_salat',     menge: 200 },
      { zutatId: 'z_paprika',   menge: 200 },
      { zutatId: 'z_sojasauce', menge: 80  },
    ],
    anleitung: 'Hähnchen in Soja+Limette+Sesamöl Marinade (30 Min), scharf braten. Bowl: Reis, Hähnchen, Salat, Paprika, Edamame. Sesam + Frühlingszwiebeln oben.' }),

  createRezept({ id: 'r_burrito', name: 'Burrito', kategorien: ['Burritos'],
    basisPortionen: 6, konfigurierbar: true, aufbewahrung: { tk: true, behaelter: ['Box'] },
    zutaten: [{ zutatId: 'z_wrap', menge: 384 }],
    komponenten: [
      { rezeptId: 'r_chili',        menge: 900 },
      { rezeptId: 'r_pulledchicken', menge: 500 },
    ],
    anleitung: 'Chili + Pulled Chicken + Reis + Frischkäse auf Wrap. Fest rollen, nahtseite nach unten kurz anbraten. Einzeln in Folie für TK.' }),
]
