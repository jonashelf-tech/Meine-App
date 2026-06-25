import { useState, useEffect, useRef } from 'react'
import { createSession, createSet, WARMUP_SCHEME, MUSCLE_LABELS, EQUIPMENT_LABELS, ZIEL_RIR, DEFAULT_INCREMENTS } from '../fitnessModel'
import { loadFitness, loadSessions, lastSetsFor, addSession, advancePlanCursor, getActivePlan, getExerciseById, setSessionPain, lastSessionPain } from '../fitnessStore'
import { detectPRs, restSecForExercise, warmupSets, similarExercises, nextRecommendation, adjustRemaining, roundToIncrement } from '../fitnessLogic'
import SessionSummary from './SessionSummary'
import s from './SessionRunner.module.css'

// ─── SVG Icons ────────────────────────────────────────────
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const SmallCloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const SwapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
)

const FEEDBACK_OPTIONS = [
  { value: 'leicht', label: 'leicht' },
  { value: 'passt', label: 'passt' },
  { value: 'hart', label: 'hart' },
  { value: 'nichtGeschafft', label: 'nicht geschafft' },
]

const fmtDuration = sec => {
  const m = Math.floor(sec / 60)
  const ss = sec % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const lastSetsLabel = sets => {
  if (!sets.length) return '—'
  return sets.map(s => `${s.gewicht ?? '–'} kg × ${s.wdh ?? '–'}`).join(', ')
}

const primaryMuscle = allocation => {
  const entries = Object.entries(allocation ?? {})
  if (!entries.length) return null
  return entries.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0]
}

// ─── Reine Anzeige-Ableitungen (kein State, kein Logik-Change) ────
const isWork = set => set.satzTyp !== 'warmup'
const isExerciseDone = ex => {
  const work = ex.saetze.filter(isWork)
  return work.length > 0 && work.every(s => s.done)
}
const runnerProgress = exercises => exercises.reduce((acc, ex) => {
  ex.saetze.forEach(s => { if (isWork(s)) { acc.total++; if (s.done) acc.done++ } })
  return acc
}, { done: 0, total: 0 })

export default function SessionRunner({ planId, dayId, dayExercises, onClose }) {
  const fitness = loadFitness()
  const exerciseMap = useRef(new Map(fitness.exercises.map(e => [e.id, e]))).current
  const restEnabled = useRef(loadFitness().settings.restTimerEnabled !== false).current
  const restSec = useRef(loadFitness().settings.restTimerSec ?? 120).current

  const plan = fitness.plans.find(p => p.id === planId)
  const coachMode = plan?.modus === 'coach'
  const rirMode = fitness.settings.feedbackMode !== 'chips' // Default & alles ≠ chips → RIR
  const incOf = (ex) => (fitness.settings.increments?.[ex?.equipment]) ?? DEFAULT_INCREMENTS[ex?.equipment] ?? 2.5

  const [recommendations, setRecommendations] = useState(() => {
    if (!coachMode) return {}
    const recs = {}
    dayExercises.forEach(de => {
      const exObj = exerciseMap.get(de.exerciseId)
      let rec = nextRecommendation(lastSetsFor(de.exerciseId), de.zielWdh || [8, 12], de.zielRir || ZIEL_RIR, incOf(exObj))
      if (rec && lastSessionPain(de.exerciseId)) {
        rec = { ...rec, gewicht: roundToIncrement(rec.gewicht * 0.85, incOf(exObj)) }
      }
      recs[de.exerciseId] = rec
    })
    return recs
  })

  const [draft, setDraft] = useState(() => createSession({
    planId,
    dayId,
    exercises: dayExercises.map(de => {
      const prev = lastSetsFor(de.exerciseId)
      const n = de.zielSaetze || prev.length || 3
      const exObj = exerciseMap.get(de.exerciseId)
      let rec = coachMode ? nextRecommendation(prev, de.zielWdh || [8, 12], de.zielRir || ZIEL_RIR, incOf(exObj)) : null
      if (rec && lastSessionPain(de.exerciseId)) {
        rec = { ...rec, gewicht: roundToIncrement(rec.gewicht * 0.85, incOf(exObj)) }
      }
      const saetze = Array.from({ length: n }, (_, i) => {
        if (rec) return createSet({ gewicht: rec.gewicht, wdh: rec.wdh, satzTyp: 'normal' })
        if (de.zielGewicht != null) return createSet({ gewicht: de.zielGewicht, wdh: de.zielWdh?.[0] ?? null, satzTyp: 'normal' })
        return createSet({
          gewicht: prev[i]?.gewicht ?? prev[prev.length - 1]?.gewicht ?? null,
          wdh: prev[i]?.wdh ?? de.zielWdh?.[0] ?? null,
          satzTyp: 'normal',
        })
      })
      return { exerciseId: de.exerciseId, saetze }
    }),
  }))

  const [openNotiz, setOpenNotiz] = useState(null)
  const [openWarmup, setOpenWarmup] = useState(() => new Set())
  const [swapPicker, setSwapPicker] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [summary, setSummary] = useState(null)
  const [rest, setRest] = useState(null)      // { endAt } | null — Zielzeitpunkt, friert im Hintergrund nicht ein
  const [restLeft, setRestLeft] = useState(0) // abgeleitete Restsekunden (nur Anzeige)

  useEffect(() => {
    const startedAt = new Date(draft.startedAt).getTime()
    const tick = () => setElapsedSec(Math.round((Date.now() - startedAt) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [draft.startedAt])

  // Pause aus dem Zielzeitpunkt ableiten: gedrosselte/pausierte Intervalle im
  // Hintergrund driften nicht, beim Zurückkommen stimmt die Restzeit (oder ist 0).
  useEffect(() => {
    if (rest === null) return
    const tick = () => {
      const left = Math.max(0, Math.round((rest.endAt - Date.now()) / 1000))
      setRestLeft(left)
      if (left <= 0) setRest(null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [rest])

  const updateSet = (exIdx, setIdx, patch) => {
    setDraft(d => ({
      ...d,
      exercises: d.exercises.map((ex, i) => i !== exIdx ? ex : {
        ...ex,
        saetze: ex.saetze.map((set, j) => j !== setIdx ? set : { ...set, ...patch }),
      }),
    }))
  }

  const addSet = exIdx => {
    setDraft(d => ({
      ...d,
      exercises: d.exercises.map((ex, i) => {
        if (i !== exIdx) return ex
        const last = ex.saetze[ex.saetze.length - 1]
        return { ...ex, saetze: [...ex.saetze, createSet({ gewicht: last?.gewicht ?? null, wdh: last?.wdh ?? null, satzTyp: 'normal' })] }
      }),
    }))
  }

  const toggleWarmup = exIdx => {
    setOpenWarmup(prev => {
      const next = new Set(prev)
      if (next.has(exIdx)) next.delete(exIdx)
      else next.add(exIdx)
      return next
    })
  }

  const addWarmupSets = exIdx => {
    setDraft(d => ({
      ...d,
      exercises: d.exercises.map((ex, i) => {
        if (i !== exIdx) return ex
        const workWeight = ex.saetze.map(set => parseFloat(set.gewicht)).find(g => g > 0)
        const warmups = warmupSets(workWeight).map(w => createSet(w))
        return { ...ex, saetze: [...warmups, ...ex.saetze] }
      }),
    }))
    setOpenWarmup(prev => {
      const next = new Set(prev)
      next.delete(exIdx)
      return next
    })
  }

  const swapExercise = (exIdx, alt) => {
    setDraft(d => ({
      ...d,
      exercises: d.exercises.map((ex, i) => {
        if (i !== exIdx) return ex
        const prev = lastSetsFor(alt.id)
        const n = Math.max(ex.saetze.length, prev.length, 3)
        const saetze = Array.from({ length: n }, (_, j) => createSet({
          gewicht: prev[j]?.gewicht ?? prev[prev.length - 1]?.gewicht ?? null,
          wdh: prev[j]?.wdh ?? alt.defaultRepRange?.[0] ?? null,
          satzTyp: 'normal',
        }))
        return { exerciseId: alt.id, saetze }
      }),
    }))
    setSwapPicker(null)
  }

  const toggleFeedback = (exIdx, setIdx, value) => {
    setDraft(d => ({
      ...d,
      exercises: d.exercises.map((ex, i) => i !== exIdx ? ex : {
        ...ex,
        saetze: ex.saetze.map((set, j) => j !== setIdx ? set : { ...set, feedback: set.feedback === value ? null : value }),
      }),
    }))
  }

  const moveExercise = (exIdx, dir) => {
    setDraft(d => {
      const target = exIdx + dir
      if (target < 0 || target >= d.exercises.length) return d
      const exercises = [...d.exercises]
      ;[exercises[exIdx], exercises[target]] = [exercises[target], exercises[exIdx]]
      return { ...d, exercises }
    })
  }

  const toggleDone = (exIdx, setIdx) => {
    // turnedOn aus dem aktuellen draft ableiten — NICHT im Updater setzen
    // (der läuft erst beim Re-Render, das if() unten liefe sonst auf dem alten Wert).
    const set = draft.exercises[exIdx].saetze[setIdx]
    const turnedOn = !set.done
    const exerciseId = draft.exercises[exIdx].exerciseId
    const de = dayExercises.find(dx => dx.exerciseId === exerciseId) // per ID, da Reihenfolge verschiebbar
    const exObj = exerciseMap.get(exerciseId)
    const currentRec = recommendations[exerciseId]

    setDraft(d => ({
      ...d,
      exercises: d.exercises.map((ex, i) => i !== exIdx ? ex : {
        ...ex,
        saetze: ex.saetze.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done }),
      }),
    }))

    if (turnedOn && coachMode && currentRec && de) {
      const zielWdh = de.zielWdh || [8, 12]
      const newRec = adjustRemaining(currentRec, { wdh: set.wdh != null ? parseFloat(set.wdh) : null, feedback: set.feedback, rir: set.rir }, zielWdh, incOf(exObj), de.zielRir || ZIEL_RIR)
      setRecommendations(r => ({ ...r, [exerciseId]: newRec }))
      setDraft(d => ({
        ...d,
        exercises: d.exercises.map((ex, i) => i !== exIdx ? ex : {
          ...ex,
          saetze: ex.saetze.map((s, j) => (j <= setIdx || s.done) ? s : { ...s, gewicht: newRec.gewicht, wdh: newRec.wdh }),
        }),
      }))
    }

    if (turnedOn && restEnabled) {
      setRest({ endAt: Date.now() + restSecForExercise(exObj, restSec) * 1000 })
    }
  }

  const handleCancel = () => {
    if (!confirmCancel) {
      setConfirmCancel(true)
      setTimeout(() => setConfirmCancel(false), 2500)
      return
    }
    onClose()
  }

  const handleFinish = () => {
    const exercises = draft.exercises
      .map(ex => ({
        exerciseId: ex.exerciseId,
        saetze: ex.saetze
          .filter(set => set.gewicht !== null && set.gewicht !== '' && set.wdh !== null && set.wdh !== '')
          .map(set => ({
            id: set.id,
            gewicht: typeof set.gewicht === 'string' ? parseFloat(set.gewicht.replace(',', '.')) : set.gewicht,
            wdh: typeof set.wdh === 'string' ? parseInt(set.wdh, 10) : set.wdh,
            satzTyp: set.satzTyp,
            rir: set.rir,
            feedback: set.feedback,
          })),
      }))
      .filter(ex => ex.saetze.length > 0)

    const finalSession = {
      ...draft,
      exercises,
      durationSec: Math.round((Date.now() - new Date(draft.startedAt).getTime()) / 1000),
    }

    const prior = loadSessions()
    const fit = loadFitness()
    const prs = []
    finalSession.exercises.forEach(ex => {
      const priorEx = prior.flatMap(sess => (sess.exercises || []).filter(e => e.exerciseId === ex.exerciseId))
      const name = getExerciseById(fit, ex.exerciseId)?.name ?? '—'
      detectPRs(ex, priorEx).forEach(p => prs.push({ exerciseName: name, ...p }))
    })

    const WORKING = ['normal', 'dropset', 'failure']
    const totalVolume = finalSession.exercises.reduce((sum, ex) =>
      sum + ex.saetze.filter(set => WORKING.includes(set.satzTyp)).reduce((a, set) => a + (set.gewicht || 0) * (set.wdh || 0), 0), 0)

    finalSession.prs = prs

    addSession(finalSession)
    const daysLength = getActivePlan(fit)?.days.length
    advancePlanCursor(planId, daysLength)
    const summaryExercises = finalSession.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      name: getExerciseById(fit, ex.exerciseId)?.name ?? '—',
    }))
    setSummary({ sessionId: finalSession.id, durationSec: finalSession.durationSec, totalVolume, prs, exercises: summaryExercises })
  }

  if (summary) {
    return (
      <SessionSummary
        {...summary}
        onPain={(ids) => setSessionPain(summary.sessionId, ids)}
        onClose={onClose}
      />
    )
  }

  const progress = runnerProgress(draft.exercises)
  const activeExIdx = draft.exercises.findIndex(ex => !isExerciseDone(ex))
  const progressPct = progress.total > 0 ? (progress.done / progress.total * 100) : 0

  return (
    <div className={s.overlay}>
      <div className={s.header}>
        <div className={s.timer}>{fmtDuration(elapsedSec)}</div>
        <button className={[s.cancelBtn, confirmCancel ? s.cancelBtnConfirm : ''].join(' ')} onClick={handleCancel} aria-label="Abbrechen">
          {confirmCancel ? 'Wirklich?' : <CloseIcon />}
        </button>
      </div>

      <div className={s.progressHeader}>
        <div className={s.progressTrack}>
          <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={s.progressLabel}><strong>{progress.done}</strong> / {progress.total} Sätze</div>
      </div>

      <div className={s.body}>
        {draft.exercises.map((ex, exIdx) => {
          const exercise = exerciseMap.get(ex.exerciseId)
          const prevSets = lastSetsFor(ex.exerciseId)
          const exDone = isExerciseDone(ex)
          const exActive = exIdx === activeExIdx
          const activeSetIdx = exActive ? ex.saetze.findIndex(set => isWork(set) && !set.done) : -1
          return (
            <div key={ex.exerciseId + exIdx} className={[s.card, exActive ? s.cardActive : '', exDone ? s.cardDone : ''].join(' ')}>
              <div className={s.cardHead}>
                <div className={s.reorder}>
                  <button className={s.reorderBtn} onClick={() => moveExercise(exIdx, -1)} disabled={exIdx === 0} aria-label="Übung nach oben"><ChevronIcon open /></button>
                  <button className={s.reorderBtn} onClick={() => moveExercise(exIdx, 1)} disabled={exIdx === draft.exercises.length - 1} aria-label="Übung nach unten"><ChevronIcon /></button>
                </div>
                <div className={s.exNameRow}>
                  <button className={s.exName} onClick={() => setOpenNotiz(o => o === exIdx ? null : exIdx)}>
                    {exercise?.name ?? '—'}
                  </button>
                  {exDone && <span className={s.doneMark}><CheckIcon /></span>}
                </div>
                <div className={s.exMetaRow}>
                  {exActive && <span className={s.activeBadge}>aktiv</span>}
                  <button
                    className={s.swapBtn}
                    onClick={() => setSwapPicker(p => p === exIdx ? null : exIdx)}
                    aria-label="Gerät besetzt — Alternative finden"
                  >
                    <SwapIcon /> Gerät besetzt
                  </button>
                </div>
              </div>
              {openNotiz === exIdx && exercise?.notiz && (
                <div className={s.notiz}>{exercise.notiz}</div>
              )}
              {coachMode && recommendations[ex.exerciseId] && (
                <div className={s.recoLine}>
                  Empfehlung: {recommendations[ex.exerciseId].gewicht} kg × {recommendations[ex.exerciseId].wdh}
                </div>
              )}
              {swapPicker === exIdx && (() => {
                const alternatives = exercise ? similarExercises(exercise, fitness.exercises, 5) : []
                return (
                  <div className={s.swapPanel}>
                    {alternatives.length === 0 ? (
                      <div className={s.swapHint}>Keine Alternative gefunden.</div>
                    ) : alternatives.map(alt => (
                      <button key={alt.id} className={s.swapOption} onClick={() => swapExercise(exIdx, alt)}>
                        <span className={s.swapName}>{alt.name}</span>
                        <span className={s.swapMeta}>
                          {MUSCLE_LABELS[primaryMuscle(alt.allocation)] ?? '—'} · {EQUIPMENT_LABELS[alt.equipment]}
                        </span>
                      </button>
                    ))}
                    <button className={s.swapCancel} onClick={() => setSwapPicker(null)}>Abbrechen</button>
                  </div>
                )
              })()}
              <div className={s.lastLine}>Zuletzt: {lastSetsLabel(prevSets)}</div>

              <div className={s.setsList}>
                {(() => {
                  let workingCount = 0
                  return ex.saetze.map((set, setIdx) => {
                    const isWarmup = set.satzTyp === 'warmup'
                    if (!isWarmup) workingCount += 1
                    return (
                  <div key={set.id} className={s.setBlock}>
                  <div className={[s.setRow, set.done ? s.setRowDone : '', setIdx === activeSetIdx ? s.setRowActive : ''].join(' ')}>
                    <span className={s.setIdx}>{isWarmup ? 'W' : workingCount}</span>
                    <input
                      className={s.setInput}
                      type="number"
                      step="0.5"
                      inputMode="decimal"
                      placeholder="kg"
                      value={set.gewicht ?? ''}
                      onChange={e => updateSet(exIdx, setIdx, { gewicht: e.target.value })}
                    />
                    <span className={s.setX}>×</span>
                    <input
                      className={s.setInput}
                      type="number"
                      step="1"
                      inputMode="numeric"
                      placeholder="Wdh"
                      value={set.wdh ?? ''}
                      onChange={e => updateSet(exIdx, setIdx, { wdh: e.target.value })}
                    />
                    {coachMode && rirMode && !isWarmup && (
                      <>
                        <span className={s.rirTag}>RIR</span>
                        <input
                          className={s.rirInput}
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          placeholder="0"
                          title="Reps in Reserve — leer/0 = bis Versagen"
                          value={set.rir ?? ''}
                          onChange={e => updateSet(exIdx, setIdx, { rir: e.target.value === '' ? null : Number(e.target.value) })}
                        />
                      </>
                    )}
                    <button
                      className={[s.doneBtn, set.done ? s.doneBtnActive : ''].join(' ')}
                      onClick={() => toggleDone(exIdx, setIdx)}
                      aria-label="Satz erledigt"
                    >
                      <CheckIcon />
                    </button>
                  </div>
                  {coachMode && !rirMode && !isWarmup && (
                    <div className={s.feedbackRow}>
                      {FEEDBACK_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          className={[s.feedbackChip, set.feedback === opt.value ? s.feedbackChipActive : ''].join(' ')}
                          onClick={() => toggleFeedback(exIdx, setIdx, opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                    )
                  })
                })()}
              </div>

              <button className={s.addSetBtn} onClick={() => addSet(exIdx)}>
                <PlusIcon /> Satz
              </button>

              <button className={s.warmupToggle} onClick={() => toggleWarmup(exIdx)}>
                Aufwärmen <ChevronIcon open={openWarmup.has(exIdx)} />
              </button>
              {openWarmup.has(exIdx) && (() => {
                const workWeight = ex.saetze.map(set => parseFloat(set.gewicht)).find(g => g > 0)
                if (!workWeight) {
                  return <div className={s.warmupHint}>Erst ein Arbeitsgewicht eintragen.</div>
                }
                const warmups = warmupSets(workWeight)
                return (
                  <div className={s.warmupPanel}>
                    {warmups.map((w, i) => (
                      <div key={i} className={s.warmupRow}>
                        {Math.round(WARMUP_SCHEME[i].pct * 100)} % · {w.gewicht} kg × {w.wdh}
                      </div>
                    ))}
                    <button className={s.warmupAddBtn} onClick={() => addWarmupSets(exIdx)}>
                      Aufwärmsätze hinzufügen
                    </button>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      {rest && (
        <div className={s.restBar}>
          <button className={s.restAdjustBtn} onClick={() => setRest(r => ({ endAt: Math.max(Date.now(), r.endAt - 15000) }))}>−15s</button>
          <span className={s.restTime}>{fmtDuration(restLeft)}</span>
          <button className={s.restAdjustBtn} onClick={() => setRest(r => ({ endAt: r.endAt + 15000 }))}>+15s</button>
          <button className={s.restSkipBtn} onClick={() => setRest(null)} aria-label="Pause überspringen">
            <SmallCloseIcon />
          </button>
        </div>
      )}

      <div className={s.footer}>
        <button className={s.finishBtn} onClick={handleFinish}>Training beenden</button>
      </div>
    </div>
  )
}
