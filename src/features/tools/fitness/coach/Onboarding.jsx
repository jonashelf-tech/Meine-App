import { useState, useMemo } from 'react'
import {
  MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, REP_PREF, SESSION_SET_BUDGET,
} from '../fitnessModel'
import { estSessionMin } from '../fitnessLogic'
import { recommendedSplit, splitVariants, generateCoachPlan } from './planGenerator'
import { ensureSeeded, loadSessions } from '../fitnessStore'
import SplitPicker from './SplitPicker'
import s from './Onboarding.module.css'

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
)
const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const DumbbellIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </svg>
)

const TRAINING_DAYS_OPTIONS = [2, 3, 4, 5, 6]

const AMBITION_OPTIONS = [
  { value: 'wenig', label: 'Wenig Zeit', hint: 'Minimum pro Muskel' },
  { value: 'normal', label: 'Normal', hint: 'Solides Optimum' },
  { value: 'ambitioniert', label: 'Ambitioniert', hint: 'Oberes Optimum' },
  { value: 'vollgas', label: 'Vollgas', hint: 'Maximum (MRV)' },
]

const REP_PREF_OPTIONS = [
  { value: 'schwer', label: 'Schwer', hint: `${REP_PREF.schwer[0]}–${REP_PREF.schwer[1]}` },
  { value: 'standard', label: 'Standard', hint: `${REP_PREF.standard[0]}–${REP_PREF.standard[1]}` },
  { value: 'leicht', label: 'Leicht', hint: `${REP_PREF.leicht[0]}–${REP_PREF.leicht[1]}` },
]

const PRIO_LEVELS = [
  { value: 'off', label: 'Aus' },
  { value: 'low', label: 'Weniger' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Mehr' },
]

const PAIN_OPTIONS = [
  { value: 'schulter', label: 'Schulter' },
  { value: 'knie', label: 'Knie' },
  { value: 'untererRuecken', label: 'Unterer Rücken' },
  { value: 'ellbogen', label: 'Ellbogen' },
  { value: 'handgelenk', label: 'Handgelenk' },
]

const WEEKDAYS = [
  { iso: 1, label: 'Mo' }, { iso: 2, label: 'Di' }, { iso: 3, label: 'Mi' }, { iso: 4, label: 'Do' },
  { iso: 5, label: 'Fr' }, { iso: 6, label: 'Sa' }, { iso: 7, label: 'So' },
]

const AMBITION_LABEL = Object.fromEntries(AMBITION_OPTIONS.map(o => [o.value, o.label]))

// Phasen: 0=Intro, 1..4=Schritte, 5=Finish
const LAST = 5

// Gruppen-Prioritäten → per-Muskel-Map (für den Generator).
function priosToMuscleMap(groupPrio) {
  const out = {}
  for (const [group, level] of Object.entries(groupPrio)) {
    if (level === 'normal') continue
    for (const muscle of MUSCLE_GROUPS[group]) out[muscle] = level
  }
  return out
}

export default function Onboarding({ onDone, onCancel }) {
  const [phase, setPhase] = useState(0)
  const [trainingDays, setTrainingDays] = useState(4)
  const [splitId, setSplitId] = useState(recommendedSplit(4).id)
  const [ambition, setAmbition] = useState('ambitioniert')
  const [repPref, setRepPref] = useState('standard')
  const [groupPrio, setGroupPrio] = useState(() =>
    Object.fromEntries(Object.keys(MUSCLE_GROUPS).map(g => [g, 'normal'])))
  const [pains, setPains] = useState([])
  const [mode, setMode] = useState('flex')
  const [days, setDays] = useState([1, 3, 5])
  const [openDayIdx, setOpenDayIdx] = useState(null)

  const pickDays = n => {
    setTrainingDays(n)
    setSplitId(recommendedSplit(n).id)
  }

  const togglePain = value => {
    setPains(p => p.includes(value) ? p.filter(v => v !== value) : [...p, value])
  }

  const toggleDay = iso => {
    setDays(d => d.includes(iso) ? d.filter(v => v !== iso) : [...d, iso])
  }

  const coach = useMemo(
    () => ({ trainingDays, splitId, ambition, repPref, priorities: priosToMuscleMap(groupPrio), pains }),
    [trainingDays, splitId, ambition, repPref, groupPrio, pains]
  )

  // Echter Plan fürs Finish — nur generieren, wenn die Finish-Phase erreicht ist.
  const exercises = useMemo(() => ensureSeeded().exercises, [])
  const plan = useMemo(() => {
    if (phase !== LAST) return null
    return generateCoachPlan(coach, exercises, loadSessions())
  }, [phase, coach, exercises])

  const estMin = estSessionMin(SESSION_SET_BUDGET[ambition] ?? SESSION_SET_BUDGET.normal)
  const estSets = SESSION_SET_BUDGET[ambition] ?? SESSION_SET_BUDGET.normal

  const scheduleLabel = mode === 'flex'
    ? 'flexibel'
    : ([...days].sort((a, b) => a - b).map(iso => WEEKDAYS.find(w => w.iso === iso)?.label).join('·') || 'feste Tage')

  const summaryChips = []
  if (phase >= 1) { summaryChips.push(`${trainingDays} Trainings`) }
  if (phase >= 2) { summaryChips.push(AMBITION_LABEL[ambition], `~${estMin} min`) }
  if (phase >= 4) { summaryChips.push(scheduleLabel) }

  const handleBack = () => {
    if (phase === 0) { onCancel(); return }
    setPhase(p => p - 1)
  }

  const handlePrimary = () => {
    if (phase === LAST) {
      onDone({
        trainingDays, splitId, ambition, repPref,
        priorities: priosToMuscleMap(groupPrio), pains,
        schedule: mode === 'flex' ? { mode: 'flex' } : { mode: 'fixed', days },
      })
      return
    }
    setPhase(p => p + 1)
  }

  const primaryLabel = phase === 0 ? "Los geht's" : phase === LAST ? 'Erstes Training starten' : 'Weiter'

  return (
    <div className={s.page}>
      <div className={s.topbar}>
        {phase > 0 && phase < LAST && (
          <button className={s.iconBtn} onClick={handleBack} aria-label="Zurück"><BackIcon /></button>
        )}
        {(phase === 0 || phase === LAST) && <span className={s.iconBtnGhost} />}
        <div className={s.progressTrack}>
          <div className={s.progressFill} style={{ width: `${(phase / LAST) * 100}%` }} />
        </div>
        <span className={s.counter}>{phase > 0 && phase < LAST ? `Schritt ${phase} / 4` : ''}</span>
      </div>

      <div className={[s.summary, phase === 0 || phase === LAST ? s.summaryHidden : ''].join(' ')}>
        {summaryChips.map((c, i) => <span key={i} className={s.summaryChip}>{c}</span>)}
      </div>

      <div className={s.wrap}>
        <div className={s.track} style={{ transform: `translateX(-${phase * 100}%)` }}>

          <section className={s.step}>
            <div className={s.intro}>
              <div className={s.introGlyph}><DumbbellIcon /></div>
              <h2 className={s.introTitle}>Lass uns deinen Plan bauen</h2>
              <p className={s.introText}>4 kurze Schritte, ungefähr eine Minute. Du kannst später alles ändern — nichts ist in Stein gemeißelt.</p>
              <div className={s.introSteps}>
                <span>Umfang</span><span>Intensität</span><span>Fokus</span><span>Tage</span>
              </div>
            </div>
          </section>

          <section className={s.step}>
            <div className={s.q}>Wie viele Trainings rotieren?</div>
            <div className={s.hint}>Sie wechseln der Reihe nach — du trainierst in deinem Tempo, der Plan wartet auf dich.</div>
            <div className={s.nums}>
              {TRAINING_DAYS_OPTIONS.map(n => (
                <button
                  key={n}
                  className={[s.num, trainingDays === n ? s.numActive : ''].join(' ')}
                  onClick={() => pickDays(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className={s.sub}><span>Welcher Split?</span></div>
            <SplitPicker trainingDays={trainingDays} value={splitId} onChange={setSplitId} />
          </section>

          <section className={s.step}>
            <div className={s.q}>Wie intensiv soll's sein?</div>
            <div className={s.hint}>Bestimmt das Volumen pro Muskel.</div>
            <div className={s.grid2}>
              {AMBITION_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={[s.gridCard, ambition === o.value ? s.gridCardActive : ''].join(' ')}
                  onClick={() => setAmbition(o.value)}
                >
                  <span className={s.gridCardTitle}>{o.label}</span>
                  <span className={s.gridCardSub}>{o.hint}</span>
                </button>
              ))}
            </div>
            <div className={s.est}>
              <div className={s.estNum}>~{estMin} min</div>
              <div className={s.estLabel}>pro Einheit · <b>~{estSets} Arbeitssätze</b><br />inkl. Aufwärmen</div>
            </div>
            <div className={s.sub}><span>Wie schwer am liebsten?</span></div>
            <div className={s.seg}>
              {REP_PREF_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={[s.segBtn, repPref === o.value ? s.segBtnActive : ''].join(' ')}
                  onClick={() => setRepPref(o.value)}
                >
                  {o.label} <span className={s.segBtnHint}>{o.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={s.step}>
            <div className={s.q}>Fokus &amp; Einschränkungen</div>
            <div className={s.hint}>Alles optional. Setz Schwerpunkte — oder nimm Gruppen ganz raus. Schmerzen blenden passende Übungen aus.</div>
            <div className={s.sub}><span>Schwerpunkte</span><span className={s.subOpt}>Standard: Normal</span></div>
            <div className={s.prioRows}>
              {Object.keys(MUSCLE_GROUPS).map(group => (
                <div key={group} className={s.prow}>
                  <span className={s.prowName}>{MUSCLE_GROUP_LABELS[group]}</span>
                  <div className={s.seg}>
                    {PRIO_LEVELS.map(lvl => (
                      <button
                        key={lvl.value}
                        className={[
                          s.segBtn, s.segBtnSmall,
                          groupPrio[group] === lvl.value ? s.segBtnActive : '',
                          lvl.value === 'off' && groupPrio[group] === 'off' ? s.segBtnOff : '',
                        ].join(' ')}
                        onClick={() => setGroupPrio(p => ({ ...p, [group]: lvl.value }))}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={s.sub}><span>Schmerzen / Einschränkungen</span></div>
            <div className={s.tags}>
              {PAIN_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={[s.tag, pains.includes(o.value) ? s.tagActive : ''].join(' ')}
                  onClick={() => togglePain(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          <section className={s.step}>
            <div className={s.q}>Wann trainierst du?</div>
            <div className={s.hint}>Beeinflusst nur Erinnerungen &amp; das Wochenvolumen — der Plan rotiert immer mit, egal wann du trainierst.</div>
            <div className={s.seg}>
              <button className={[s.segBtn, mode === 'flex' ? s.segBtnActive : ''].join(' ')} onClick={() => setMode('flex')}>Flexibel</button>
              <button className={[s.segBtn, mode === 'fixed' ? s.segBtnActive : ''].join(' ')} onClick={() => setMode('fixed')}>Feste Tage</button>
            </div>
            {mode === 'flex' ? (
              <div className={s.modehint}><b>Flexibel:</b> Trainier wann du willst. „Jetzt dran" zeigt immer das nächste Training. Verpasst gibt's nicht — der Plan rückt einfach nach.</div>
            ) : (
              <>
                <div className={s.wdays}>
                  {WEEKDAYS.map(w => (
                    <button
                      key={w.iso}
                      className={[s.wday, days.includes(w.iso) ? s.wdayActive : ''].join(' ')}
                      onClick={() => toggleDay(w.iso)}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
                <div className={s.modehint}><b>Feste Tage:</b> Wir erinnern dich an diesen Tagen. Verpasst? Kein Problem — am nächsten Trainingstag geht's mit dem nächsten Training weiter, nichts geht verloren.</div>
              </>
            )}
          </section>

          <section className={s.step}>
            <div className={s.fin}>
              <div className={s.finGlyph}><CheckIcon /></div>
              <h2 className={s.finTitle}>Dein Plan steht</h2>
              {plan && (
                <>
                  <div className={s.finSum}>{splitVariantName(trainingDays, splitId)} · {trainingDays} Trainings · {AMBITION_LABEL[ambition]}</div>
                  <div className={s.finTip}>Tipp auf einen Tag, um Übungen &amp; Dauer zu sehen</div>
                  <div className={s.finDays}>
                    {plan.days.map((day, i) => {
                      const sets = day.exercises.reduce((a, e) => a + (e.zielSaetze || 0), 0)
                      return (
                        <button key={day.id} className={s.finDay} onClick={() => setOpenDayIdx(i)}>
                          <span className={s.finDayLeft}>
                            <span className={s.finDayIdx}>{i + 1}</span>
                            <span>
                              <span className={s.finDayName}>{day.name}</span>
                              <span className={s.finDayMeta}>{day.exercises.length} Übungen · ~{estSessionMin(sets)} min</span>
                            </span>
                          </span>
                          <span className={s.finDayChev}><ChevronIcon /></span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </section>

        </div>
      </div>

      <div className={s.footer}>
        {phase > 0 && phase < LAST && (
          <button className={s.bGhost} onClick={handleBack}>Zurück</button>
        )}
        <button className={s.bPrimary} onClick={handlePrimary}>
          {phase === LAST && <PlayIcon />}
          {primaryLabel}
        </button>
      </div>

      {plan && openDayIdx != null && (
        <DayPreview
          day={plan.days[openDayIdx]}
          exercises={exercises}
          onBack={() => setOpenDayIdx(null)}
        />
      )}
    </div>
  )
}

// Split-Name für die Finish-Zusammenfassung (aus den Varianten der gewählten Trainingszahl).
function splitVariantName(trainingDays, splitId) {
  const variants = splitVariants(trainingDays)
  return (variants.find(v => v.id === splitId) ?? recommendedSplit(trainingDays)).name
}

// Read-only Tag-Vorschau (Slide-in). Voll editierbar erst im Plan-Editor (spätere Phase).
function DayPreview({ day, exercises, onBack }) {
  const byId = new Map(exercises.map(e => [e.id, e]))
  const totalSets = day.exercises.reduce((a, e) => a + (e.zielSaetze || 0), 0)
  return (
    <div className={s.daypanel}>
      <div className={s.dpHead}>
        <button className={s.iconBtn} onClick={onBack} aria-label="Zurück"><BackIcon /></button>
        <div className={s.dpTitle}>
          <div className={s.dpName}>{day.name}</div>
          <div className={s.dpMeta}>{day.exercises.length} Übungen · ~{estSessionMin(totalSets)} min</div>
        </div>
      </div>
      <div className={s.dpList}>
        {day.exercises.map((entry, i) => {
          const ex = byId.get(entry.exerciseId)
          return (
            <div key={i} className={s.exrow}>
              <div className={s.exrowInfo}>
                <div className={s.exrowName}>{ex?.name ?? '—'}</div>
                <div className={s.exrowSub}>Arbeitssätze</div>
              </div>
              <span className={s.exrowBadge}>{entry.zielSaetze} × {entry.zielWdh[0]}–{entry.zielWdh[1]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
