// ─── Muskelgruppen ────────────────────────────────────────
export const MUSCLES = [
  'brust', 'ruecken', 'schulterVorne', 'schulterSeitlich', 'schulterHinten',
  'trapez', 'bizeps', 'trizeps', 'unterarme', 'quadrizeps', 'hamstrings',
  'gluteus', 'waden', 'bauch', 'untererRuecken',
]

export const MUSCLE_LABELS = {
  brust: 'Brust', ruecken: 'Rücken/Lat', schulterVorne: 'Schulter vorne',
  schulterSeitlich: 'Schulter seitlich', schulterHinten: 'Schulter hinten',
  trapez: 'Trapez/Nacken', bizeps: 'Bizeps', trizeps: 'Trizeps', unterarme: 'Unterarme',
  quadrizeps: 'Quadrizeps', hamstrings: 'Hamstrings', gluteus: 'Gluteus',
  waden: 'Waden', bauch: 'Bauch', untererRuecken: 'Unterer Rücken',
}

// ─── Equipment + Inkremente (kg) ──────────────────────────
export const EQUIPMENT = ['maschine', 'langhantel', 'kurzhantel', 'kabel', 'koerpergewicht']

export const EQUIPMENT_LABELS = {
  maschine: 'Maschine', langhantel: 'Langhantel', kurzhantel: 'Kurzhantel',
  kabel: 'Kabel', koerpergewicht: 'Körpergewicht',
}

// ─── Bewegungsmuster (für Auswahl-Entdopplung & Ranking) ──
export const EXERCISE_PATTERNS = [
  'flachDruck', 'schraegDruck', 'brustFly', 'vertikalDruck', 'seitheben',
  'vertikalZug', 'horizontalZug', 'reverseFly', 'shrug',
  'bizepsCurl', 'hammerCurl', 'trizepsPushdown', 'trizepsUeberkopf', 'trizepsStirn',
  'kniebeuge', 'beinstrecker', 'hipHinge', 'beinbeuger', 'hipThrust', 'gluteKickback',
  'wade', 'bauchCrunch', 'huftBeugung',
]

export const PATTERN_LABELS = {
  flachDruck: 'Flachdruck', schraegDruck: 'Schrägdruck', brustFly: 'Brust-Fly',
  vertikalDruck: 'Überkopfdruck', seitheben: 'Seitheben', vertikalZug: 'Vertikalzug',
  horizontalZug: 'Horizontalzug', reverseFly: 'Reverse-Fly', shrug: 'Shrug',
  bizepsCurl: 'Bizeps-Curl', hammerCurl: 'Hammer-Curl', trizepsPushdown: 'Trizeps-Pushdown',
  trizepsUeberkopf: 'Trizeps Überkopf', trizepsStirn: 'Stirndrücken',
  kniebeuge: 'Kniebeuge', beinstrecker: 'Beinstrecker', hipHinge: 'Hüftbeuge',
  beinbeuger: 'Beinbeuger', hipThrust: 'Hip Thrust', gluteKickback: 'Glute Kickback',
  wade: 'Wade', bauchCrunch: 'Crunch', huftBeugung: 'Hüftbeugung',
}

// Bewertungs-Achsen (1–5) für das Übungs-Ranking
export const RATING_AXES = ['stabilitaet', 'dehnung', 'last']
export const RATING_LABELS = { stabilitaet: 'Stabilität', dehnung: 'Dehnung', last: 'Last' }

export const DEFAULT_INCREMENTS = {
  maschine: 2.5, langhantel: 2.5, kurzhantel: 1, kabel: 2.5, koerpergewicht: 0,
}

// ─── Volumen-Referenz (Sätze/Woche). MAV als Range [lo, hi] ──
export const VOLUME_REF = {
  brust:            { mev: 8,  mav: [12, 20], mrv: 22 },
  ruecken:          { mev: 10, mav: [14, 22], mrv: 25 },
  schulterSeitlich: { mev: 8,  mav: [16, 22], mrv: 26 },
  schulterHinten:   { mev: 8,  mav: [16, 22], mrv: 26 },
  quadrizeps:       { mev: 6,  mav: [10, 16], mrv: 20 },
  hamstrings:       { mev: 4,  mav: [12, 18], mrv: 20 },
  gluteus:          { mev: 10, mav: [14, 20], mrv: 26 },
  bizeps:           { mev: 8,  mav: [12, 20], mrv: 26 },
  trizeps:          { mev: 6,  mav: [10, 14], mrv: 18 },
  waden:            { mev: 10, mav: [12, 16], mrv: 20 },
  bauch:            { mev: 8,  mav: [16, 20], mrv: 25 },
}
// Muskeln ohne Eintrag (schulterVorne, trapez, unterarme, untererRuecken):
// nur tracken, keine Zielvorgabe.

// ─── Rest-Timer-Defaults (Sekunden, nach Wdh-Bereich) ─────
export const REST_DEFAULTS = [
  { maxReps: 5,  sec: 240 },        // 1–5 Wdh
  { maxReps: 10, sec: 180 },        // 6–10 Wdh
  { maxReps: Infinity, sec: 120 },  // 10–20+ Wdh
]

// ─── Warmup-Schema (Anteil vom Arbeitsgewicht × Wdh) ──────
export const WARMUP_SCHEME = [
  { pct: 0.5, reps: 10 }, { pct: 0.75, reps: 4 }, { pct: 0.9, reps: 2 },
]

// ─── Coach-Defaults ───────────────────────────────────────
export const ZIEL_RIR = [1, 2]
export const AUTOREG_DOWN_PCT = 0.075
export const AMBITION_RANGES = {
  wenig: [8, 10], normal: [12, 16], ambitioniert: [16, 20], vollgas: [20, 25],
}
export const REP_PREF = {
  schwer: [5, 8], standard: [8, 12], leicht: [12, 20],
}

// ─── ID + Factories ───────────────────────────────────────
export const genId = () => crypto.randomUUID()

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const createExercise = (o = {}) => ({
  id: genId(),
  name: o.name ?? '',
  allocation: o.allocation ?? {},
  kategorie: o.kategorie ?? 'isolation',
  equipment: o.equipment ?? 'maschine',
  defaultRepRange: o.defaultRepRange ?? [8, 12],
  notiz: o.notiz ?? '',
  restSec: o.restSec ?? null,
  painRegions: o.painRegions ?? [],
  stabilitaet: o.stabilitaet ?? 3,
  dehnung: o.dehnung ?? 3,
  last: o.last ?? 3,
  pattern: o.pattern ?? null,
  custom: o.custom ?? true,
})

export const createPlanDay = (o = {}) => ({
  id: genId(), name: o.name ?? 'Tag', exercises: o.exercises ?? [],
})

export const createPlan = (o = {}) => ({
  id: genId(),
  name: o.name ?? 'Neuer Plan',
  modus: o.modus ?? 'free',
  days: o.days ?? [],
  coach: o.coach ?? null,
  createdAt: new Date().toISOString(),
})

export const createSet = (o = {}) => ({
  id: genId(),
  gewicht: o.gewicht ?? null,
  wdh: o.wdh ?? null,
  satzTyp: o.satzTyp ?? 'normal',
  rir: o.rir ?? null,
  feedback: o.feedback ?? null,
})

export const createSession = (o = {}) => ({
  id: genId(),
  date: o.date ?? todayIso(),
  startedAt: o.startedAt ?? new Date().toISOString(),
  durationSec: o.durationSec ?? 0,
  planId: o.planId ?? null,
  dayId: o.dayId ?? null,
  exercises: o.exercises ?? [],
  sessionNotiz: o.sessionNotiz ?? '',
  prs: o.prs ?? [],
  pain: o.pain ?? {},
})
