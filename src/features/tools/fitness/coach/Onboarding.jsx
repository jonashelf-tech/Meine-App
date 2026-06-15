import { useState } from 'react'
import { REP_PREF, MUSCLE_LABELS, VOLUME_REF } from '../fitnessModel'
import { recommendedSplit } from './planGenerator'
import SplitPicker from './SplitPicker'
import RhythmPicker from './RhythmPicker'
import s from './Onboarding.module.css'

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)

const TRAINING_DAYS_OPTIONS = [2, 3, 4, 5, 6]

const AMBITION_OPTIONS = [
  { value: 'wenig', label: 'Wenig Zeit', hint: 'Grundvolumen — Minimum pro Muskel' },
  { value: 'normal', label: 'Normal', hint: 'Solides Optimum' },
  { value: 'ambitioniert', label: 'Ambitioniert', hint: 'Oberes Optimum' },
  { value: 'vollgas', label: 'Vollgas', hint: 'Maximum (MRV)' },
]

const REP_PREF_OPTIONS = [
  { value: 'schwer', label: 'Schwer', hint: `${REP_PREF.schwer[0]}–${REP_PREF.schwer[1]}` },
  { value: 'standard', label: 'Standard', hint: `${REP_PREF.standard[0]}–${REP_PREF.standard[1]}` },
  { value: 'leicht', label: 'Leicht', hint: `${REP_PREF.leicht[0]}–${REP_PREF.leicht[1]}` },
]

const PAIN_OPTIONS = [
  { value: 'schulter', label: 'Schulter' },
  { value: 'knie', label: 'Knie' },
  { value: 'untererRuecken', label: 'Unterer Rücken' },
  { value: 'ellbogen', label: 'Ellbogen' },
  { value: 'handgelenk', label: 'Handgelenk' },
]

const PRIORITY_LEVELS = [
  { value: 'low', label: 'niedrig' },
  { value: 'normal', label: 'normal' },
  { value: 'high', label: 'hoch' },
]

const TOTAL_STEPS = 7

export default function Onboarding({ onDone, onCancel }) {
  const [step, setStep] = useState(0)
  const [trainingDays, setTrainingDays] = useState(null)
  const [splitId, setSplitId] = useState(null)
  const [ambition, setAmbition] = useState(null)
  const [repPref, setRepPref] = useState(null)
  const [rhythm, setRhythm] = useState(null)
  const [pains, setPains] = useState([])
  const [priorities, setPriorities] = useState({})

  const pickDays = n => {
    setTrainingDays(n)
    setSplitId(recommendedSplit(n).id) // Empfohlene vorausgewählt
  }

  const togglePain = value => {
    setPains(p => p.includes(value) ? p.filter(v => v !== value) : [...p, value])
  }

  const setPriority = (muscle, level) => {
    setPriorities(p => {
      const next = { ...p }
      if (level === 'normal') delete next[muscle]
      else next[muscle] = level
      return next
    })
  }

  const canNext = [
    trainingDays != null, // 0 Tage
    splitId != null,      // 1 Split
    ambition != null,     // 2 Ambition
    true,                 // 3 Priorität (optional)
    repPref != null,      // 4 Wdh-Präferenz
    true,                 // 5 Rhythmus
    true,                 // 6 Schmerzen
  ][step]

  const handleBack = () => {
    if (step === 0) onCancel()
    else setStep(s => s - 1)
  }

  const handleNext = () => {
    if (step === TOTAL_STEPS - 1) {
      onDone({ trainingDays, splitId, ambition, repPref, rhythm, pains, priorities })
      return
    }
    setStep(s => s + 1)
  }

  return (
    <div className={s.page}>
      <div className={s.progress}>
        <button className={s.back} onClick={handleBack} aria-label="Zurück"><BackIcon /></button>
        <span className={s.progressLabel}>Schritt {step + 1} / {TOTAL_STEPS}</span>
        <div className={s.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} className={[s.dot, i === step ? s.dotActive : ''].join(' ')} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <>
          <div className={s.question}>Wie viele verschiedene Trainings willst du abwechseln?</div>
          <div className={s.hint}>Sie rotieren der Reihe nach — du trainierst in deinem Tempo, der Plan wartet auf dich.</div>
          <div className={s.optionsRow}>
            {TRAINING_DAYS_OPTIONS.map(n => (
              <button
                key={n}
                className={[s.option, trainingDays === n ? s.optionActive : ''].join(' ')}
                onClick={() => pickDays(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className={s.question}>Welcher Split?</div>
          <div className={s.hint}>Die empfohlene Variante ist vorausgewählt — du kannst frei wechseln.</div>
          <SplitPicker trainingDays={trainingDays} value={splitId} onChange={setSplitId} />
        </>
      )}

      {step === 2 && (
        <>
          <div className={s.question}>Wie viel Zeit/Ambition für Training?</div>
          <div className={s.options}>
            {AMBITION_OPTIONS.map(o => (
              <button
                key={o.value}
                className={[s.optionCard, ambition === o.value ? s.optionCardActive : ''].join(' ')}
                onClick={() => setAmbition(o.value)}
              >
                <span className={s.optionCardTitle}>{o.label}</span>
                <span className={s.optionCardSub}>{o.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className={s.question}>Wie schwer trainierst du am liebsten?</div>
          <div className={s.options}>
            {REP_PREF_OPTIONS.map(o => (
              <button
                key={o.value}
                className={[s.optionCard, repPref === o.value ? s.optionCardActive : ''].join(' ')}
                onClick={() => setRepPref(o.value)}
              >
                <span className={s.optionCardTitle}>{o.label} ({o.hint})</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <div className={s.question}>Trainings-Rhythmus?</div>
          <div className={s.hint}>Optional — nur ein Hinweis im Heute-Tab (z. B. „heute Pause"), blockt nie. „Aus" = kein fester Rhythmus.</div>
          <RhythmPicker value={rhythm} onChange={setRhythm} />
        </>
      )}

      {step === 6 && (
        <>
          <div className={s.question}>Schmerzen / Einschränkungen?</div>
          <div className={s.hint}>Optional — wähle alles aus, was aktuell Probleme macht. Nichts ausgewählt = keine Einschränkungen.</div>
          <div className={s.chips}>
            {PAIN_OPTIONS.map(o => (
              <button
                key={o.value}
                className={[s.chip, pains.includes(o.value) ? s.chipActive : ''].join(' ')}
                onClick={() => togglePain(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={s.question}>Prioritäten (optional)</div>
          <div className={s.hint}>Standardmäßig „normal" — passe nur an, wenn du Muskelgruppen besonders betonen oder reduzieren willst.</div>
          <div className={s.prioList}>
            {Object.keys(VOLUME_REF).map(m => {
              const current = priorities[m] ?? 'normal'
              return (
                <div key={m} className={s.prioRow}>
                  <span className={s.prioName}>{MUSCLE_LABELS[m]}</span>
                  <div className={s.segmented}>
                    {PRIORITY_LEVELS.map(level => (
                      <button
                        key={level.value}
                        className={[s.segment, current === level.value ? s.segmentActive : ''].join(' ')}
                        onClick={() => setPriority(m, level.value)}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className={s.footer}>
        <button className={[s.navBtn, s.navBtnSecondary].join(' ')} onClick={handleBack}>Zurück</button>
        <button className={[s.navBtn, s.navBtnPrimary].join(' ')} onClick={handleNext} disabled={!canNext}>
          {step === TOTAL_STEPS - 1 ? 'Plan erstellen' : 'Weiter'}
        </button>
      </div>
    </div>
  )
}
