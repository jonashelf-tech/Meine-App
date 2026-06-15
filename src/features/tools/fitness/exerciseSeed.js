// ─── Standard-Übungsbibliothek (Seed-Daten) ──────────────────
// Ratings 1–5: stabilitaet (sicher hart belastbar), dehnung (Spannung in
// gedehnter Position), last (absolute Überladbarkeit). pattern = Bewegungs-
// muster-Familie für die Auswahl-Entdopplung im Coach-Generator.
const common = { notiz: '', restSec: null, painRegions: [], custom: false }

export const EXERCISE_SEED = [
  { id: 'seed-bankdruecken-lh', name: 'Bankdrücken (Langhantel)',
    allocation: { brust: 65, schulterVorne: 15, trizeps: 20 },
    kategorie: 'grund', equipment: 'langhantel', defaultRepRange: [5, 10],
    pattern: 'flachDruck', stabilitaet: 4, dehnung: 3, last: 5, ...common },

  { id: 'seed-schraegbank-kh', name: 'Schrägbankdrücken (Kurzhantel)',
    allocation: { brust: 60, schulterVorne: 20, trizeps: 20 },
    kategorie: 'grund', equipment: 'kurzhantel', defaultRepRange: [8, 12],
    pattern: 'schraegDruck', stabilitaet: 3, dehnung: 4, last: 4, ...common },

  { id: 'seed-brustpresse-maschine', name: 'Brustpresse (Maschine)',
    allocation: { brust: 70, schulterVorne: 15, trizeps: 15 },
    kategorie: 'grund', equipment: 'maschine', defaultRepRange: [8, 12],
    pattern: 'flachDruck', stabilitaet: 5, dehnung: 3, last: 4, ...common },

  { id: 'seed-kabel-fly', name: 'Kabel-Fly',
    allocation: { brust: 100 },
    kategorie: 'isolation', equipment: 'kabel', defaultRepRange: [10, 15],
    pattern: 'brustFly', stabilitaet: 2, dehnung: 5, last: 2, ...common },

  { id: 'seed-klimmzug', name: 'Klimmzug',
    allocation: { ruecken: 70, bizeps: 20, schulterHinten: 10 },
    kategorie: 'grund', equipment: 'koerpergewicht', defaultRepRange: [5, 10],
    pattern: 'vertikalZug', stabilitaet: 3, dehnung: 4, last: 4, ...common },

  { id: 'seed-latzug-maschine', name: 'Latzug (Maschine)',
    allocation: { ruecken: 65, bizeps: 20, schulterHinten: 15 },
    kategorie: 'grund', equipment: 'maschine', defaultRepRange: [8, 12],
    pattern: 'vertikalZug', stabilitaet: 5, dehnung: 4, last: 4, ...common },

  { id: 'seed-langhantelrudern', name: 'Langhantelrudern',
    allocation: { ruecken: 60, bizeps: 15, schulterHinten: 15, untererRuecken: 10 },
    kategorie: 'grund', equipment: 'langhantel', defaultRepRange: [6, 10],
    pattern: 'horizontalZug', stabilitaet: 3, dehnung: 3, last: 5, ...common },

  { id: 'seed-kabelrudern', name: 'Kabelrudern',
    allocation: { ruecken: 65, bizeps: 20, schulterHinten: 15 },
    kategorie: 'grund', equipment: 'kabel', defaultRepRange: [8, 12],
    pattern: 'horizontalZug', stabilitaet: 4, dehnung: 4, last: 4, ...common },

  { id: 'seed-schulterpresse-kh', name: 'Schulterpresse (Kurzhantel)',
    allocation: { schulterVorne: 60, schulterSeitlich: 20, trizeps: 20 },
    kategorie: 'grund', equipment: 'kurzhantel', defaultRepRange: [6, 10],
    pattern: 'vertikalDruck', stabilitaet: 3, dehnung: 3, last: 4, ...common },

  { id: 'seed-seitheben-kh', name: 'Seitheben (Kurzhantel)',
    allocation: { schulterSeitlich: 100 },
    kategorie: 'isolation', equipment: 'kurzhantel', defaultRepRange: [12, 20],
    pattern: 'seitheben', stabilitaet: 3, dehnung: 2, last: 2, ...common },

  { id: 'seed-seitheben-kabel', name: 'Seitheben (Kabel)',
    allocation: { schulterSeitlich: 100 },
    kategorie: 'isolation', equipment: 'kabel', defaultRepRange: [12, 20],
    pattern: 'seitheben', stabilitaet: 4, dehnung: 3, last: 2, ...common },

  { id: 'seed-face-pull', name: 'Face Pull',
    allocation: { schulterHinten: 70, trapez: 30 },
    kategorie: 'isolation', equipment: 'kabel', defaultRepRange: [12, 20],
    pattern: 'reverseFly', stabilitaet: 4, dehnung: 2, last: 2, ...common },

  { id: 'seed-shrugs-kh', name: 'Shrugs (Kurzhantel)',
    allocation: { trapez: 100 },
    kategorie: 'isolation', equipment: 'kurzhantel', defaultRepRange: [10, 15],
    pattern: 'shrug', stabilitaet: 4, dehnung: 2, last: 4, ...common },

  { id: 'seed-langhantel-curls', name: 'Langhantel-Curls',
    allocation: { bizeps: 100 },
    kategorie: 'isolation', equipment: 'langhantel', defaultRepRange: [8, 12],
    pattern: 'bizepsCurl', stabilitaet: 4, dehnung: 3, last: 4, ...common },

  { id: 'seed-kurzhantel-curls', name: 'Kurzhantel-Curls',
    allocation: { bizeps: 90, unterarme: 10 },
    kategorie: 'isolation', equipment: 'kurzhantel', defaultRepRange: [10, 15],
    pattern: 'bizepsCurl', stabilitaet: 3, dehnung: 3, last: 3, ...common },

  { id: 'seed-hammer-curls', name: 'Hammer-Curls',
    allocation: { bizeps: 70, unterarme: 30 },
    kategorie: 'isolation', equipment: 'kurzhantel', defaultRepRange: [10, 15],
    pattern: 'hammerCurl', stabilitaet: 3, dehnung: 3, last: 3, ...common },

  { id: 'seed-trizepsdruecken-kabel', name: 'Trizepsdrücken (Kabel)',
    allocation: { trizeps: 100 },
    kategorie: 'isolation', equipment: 'kabel', defaultRepRange: [10, 15],
    pattern: 'trizepsPushdown', stabilitaet: 4, dehnung: 2, last: 3, ...common },

  { id: 'seed-enges-bankdruecken', name: 'Enges Bankdrücken',
    allocation: { trizeps: 60, brust: 25, schulterVorne: 15 },
    kategorie: 'grund', equipment: 'langhantel', defaultRepRange: [6, 10],
    pattern: 'flachDruck', stabilitaet: 4, dehnung: 3, last: 4, ...common },

  { id: 'seed-overhead-trizeps', name: 'Overhead-Trizeps (Kabel)',
    allocation: { trizeps: 100 },
    kategorie: 'isolation', equipment: 'kabel', defaultRepRange: [10, 15],
    pattern: 'trizepsUeberkopf', stabilitaet: 4, dehnung: 5, last: 3, ...common },

  { id: 'seed-kniebeuge-lh', name: 'Kniebeuge (Langhantel)',
    allocation: { quadrizeps: 55, gluteus: 30, untererRuecken: 15 },
    kategorie: 'grund', equipment: 'langhantel', defaultRepRange: [5, 10],
    pattern: 'kniebeuge', stabilitaet: 3, dehnung: 4, last: 5, ...common },

  { id: 'seed-beinpresse', name: 'Beinpresse',
    allocation: { quadrizeps: 60, gluteus: 30, hamstrings: 10 },
    kategorie: 'grund', equipment: 'maschine', defaultRepRange: [8, 15],
    pattern: 'kniebeuge', stabilitaet: 5, dehnung: 4, last: 5, ...common },

  { id: 'seed-beinstrecker', name: 'Beinstrecker',
    allocation: { quadrizeps: 100 },
    kategorie: 'isolation', equipment: 'maschine', defaultRepRange: [10, 15],
    pattern: 'beinstrecker', stabilitaet: 5, dehnung: 2, last: 3, ...common },

  { id: 'seed-ausfallschritte-kh', name: 'Ausfallschritte (Kurzhantel)',
    allocation: { quadrizeps: 50, gluteus: 40, hamstrings: 10 },
    kategorie: 'grund', equipment: 'kurzhantel', defaultRepRange: [8, 12],
    pattern: 'kniebeuge', stabilitaet: 2, dehnung: 4, last: 3, ...common },

  { id: 'seed-rdl', name: 'Rumänisches Kreuzheben',
    allocation: { hamstrings: 55, gluteus: 30, untererRuecken: 15 },
    kategorie: 'grund', equipment: 'langhantel', defaultRepRange: [6, 12],
    pattern: 'hipHinge', stabilitaet: 3, dehnung: 5, last: 5, ...common },

  { id: 'seed-beinbeuger', name: 'Beinbeuger (Maschine)',
    allocation: { hamstrings: 100 },
    kategorie: 'isolation', equipment: 'maschine', defaultRepRange: [10, 15],
    pattern: 'beinbeuger', stabilitaet: 5, dehnung: 3, last: 3, ...common },

  { id: 'seed-hip-thrust', name: 'Hip Thrust',
    allocation: { gluteus: 70, hamstrings: 20, quadrizeps: 10 },
    kategorie: 'grund', equipment: 'langhantel', defaultRepRange: [8, 15],
    pattern: 'hipThrust', stabilitaet: 4, dehnung: 2, last: 5, ...common },

  { id: 'seed-glute-kickback', name: 'Glute Kickback (Kabel)',
    allocation: { gluteus: 100 },
    kategorie: 'isolation', equipment: 'kabel', defaultRepRange: [12, 20],
    pattern: 'gluteKickback', stabilitaet: 4, dehnung: 3, last: 2, ...common },

  { id: 'seed-wadenheben-stehend', name: 'Wadenheben stehend',
    allocation: { waden: 100 },
    kategorie: 'isolation', equipment: 'maschine', defaultRepRange: [10, 20],
    pattern: 'wade', stabilitaet: 4, dehnung: 4, last: 4, ...common },

  { id: 'seed-wadenheben-sitzend', name: 'Wadenheben sitzend',
    allocation: { waden: 100 },
    kategorie: 'isolation', equipment: 'maschine', defaultRepRange: [12, 20],
    pattern: 'wade', stabilitaet: 5, dehnung: 4, last: 3, ...common },

  { id: 'seed-crunch-kabel', name: 'Crunch (Kabel)',
    allocation: { bauch: 100 },
    kategorie: 'isolation', equipment: 'kabel', defaultRepRange: [12, 20],
    pattern: 'bauchCrunch', stabilitaet: 4, dehnung: 3, last: 3, ...common },

  { id: 'seed-beinheben-haengend', name: 'Beinheben hängend',
    allocation: { bauch: 90, unterarme: 10 },
    kategorie: 'isolation', equipment: 'koerpergewicht', defaultRepRange: [10, 20],
    pattern: 'huftBeugung', stabilitaet: 2, dehnung: 3, last: 2, ...common },

  { id: 'seed-kreuzheben-lh', name: 'Kreuzheben (Langhantel)',
    allocation: { untererRuecken: 35, gluteus: 25, hamstrings: 25, ruecken: 15 },
    kategorie: 'grund', equipment: 'langhantel', defaultRepRange: [3, 8],
    pattern: 'hipHinge', stabilitaet: 3, dehnung: 3, last: 5, ...common },

  // ─── Kuratierte Stretch-Picks (Konsens-Empfehlungen) ──────
  { id: 'seed-incline-curls-kh', name: 'Incline-Curls (Kurzhantel)',
    allocation: { bizeps: 100 },
    kategorie: 'isolation', equipment: 'kurzhantel', defaultRepRange: [10, 15],
    pattern: 'bizepsCurl', stabilitaet: 3, dehnung: 5, last: 2, ...common },

  { id: 'seed-preacher-curl', name: 'Preacher Curl',
    allocation: { bizeps: 100 },
    kategorie: 'isolation', equipment: 'maschine', defaultRepRange: [10, 15],
    pattern: 'bizepsCurl', stabilitaet: 4, dehnung: 4, last: 3, ...common },

  { id: 'seed-seated-leg-curl', name: 'Seated Leg Curl',
    allocation: { hamstrings: 100 },
    kategorie: 'isolation', equipment: 'maschine', defaultRepRange: [10, 15],
    pattern: 'beinbeuger', stabilitaet: 5, dehnung: 5, last: 3, ...common },

  { id: 'seed-hack-squat', name: 'Hack Squat',
    allocation: { quadrizeps: 65, gluteus: 25, hamstrings: 10 },
    kategorie: 'grund', equipment: 'maschine', defaultRepRange: [8, 15],
    pattern: 'kniebeuge', stabilitaet: 5, dehnung: 5, last: 5, ...common },

  { id: 'seed-bulgarian-split-squat', name: 'Bulgarian Split Squat (Kurzhantel)',
    allocation: { quadrizeps: 50, gluteus: 40, hamstrings: 10 },
    kategorie: 'grund', equipment: 'kurzhantel', defaultRepRange: [8, 12],
    pattern: 'kniebeuge', stabilitaet: 2, dehnung: 5, last: 3, ...common },

  { id: 'seed-pec-deck', name: 'Pec Deck',
    allocation: { brust: 100 },
    kategorie: 'isolation', equipment: 'maschine', defaultRepRange: [10, 15],
    pattern: 'brustFly', stabilitaet: 5, dehnung: 4, last: 3, ...common },

  { id: 'seed-skullcrusher', name: 'Skullcrusher (SZ-Hantel)',
    allocation: { trizeps: 100 },
    kategorie: 'isolation', equipment: 'langhantel', defaultRepRange: [8, 12],
    pattern: 'trizepsStirn', stabilitaet: 3, dehnung: 4, last: 3, ...common },

  { id: 'seed-reverse-pec-deck', name: 'Reverse Pec Deck',
    allocation: { schulterHinten: 80, trapez: 20 },
    kategorie: 'isolation', equipment: 'maschine', defaultRepRange: [12, 20],
    pattern: 'reverseFly', stabilitaet: 5, dehnung: 3, last: 2, ...common },
]
