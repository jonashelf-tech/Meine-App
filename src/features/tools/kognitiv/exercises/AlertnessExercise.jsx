import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './AlertnessExercise.module.css'

const TOTAL_STIMULI = 30
const ISI_NORMAL = [2400, 6000]
const ISI_SCHWER = [800, 2500]
const STIMULUS_VISIBLE = 800
const WARN_GAP = [500, 2000]

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default function AlertnessExercise({ variant, onDone, onAbort }) {
  const mitTon   = variant === 'Mit Warnton'
  const isiRange = variant === 'Schwer' ? ISI_SCHWER : ISI_NORMAL

  const [visible, setVisible] = useState(false)
  const [shown, setShown]     = useState(0)
  const tapsRef        = useRef([])
  const stimulusCount  = useRef(0)
  const startedAt      = useRef(new Date().toISOString())
  const timerRef       = useRef(null)
  const appearedAtRef  = useRef(null)
  const audioCtx       = useRef(null)
  const finishedRef    = useRef(false)

  const playBeep = useCallback(() => {
    if (!mitTon) return
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext()
      const ctx  = audioCtx.current
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } catch {}
  }, [mitTon])

  const finishSession = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits       = tapsRef.current.filter(t => t.type === 'hit')
    const misses     = tapsRef.current.filter(t => t.type === 'miss')
    const falseAlarms = tapsRef.current.filter(t => t.type === 'false-alarm')
    const avgMs      = hits.length > 0 ? Math.round(hits.reduce((a, b) => a + b.time, 0) / hits.length) : 0
    const duration   = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    const session    = createSession({
      moduleId: 'alertness',
      variant,
      startedAt: startedAt.current,
      duration,
      score: { hits: hits.length, misses: misses.length, falseAlarms: falseAlarms.length, total: TOTAL_STIMULI },
      mainMetric: avgMs,
      taps: tapsRef.current,
    })
    onDone(session)
  }, [variant, onDone])

  const scheduleNext = useCallback(() => {
    const isi = randBetween(...isiRange)
    if (mitTon) {
      const warnDelay = isi - randBetween(...WARN_GAP)
      setTimeout(playBeep, Math.max(0, warnDelay))
    }
    timerRef.current = setTimeout(showStimulus, isi)
  }, [isiRange, mitTon, playBeep])

  // showStimulus needs scheduleNext so we use a ref to avoid circular dependency
  const scheduleNextRef = useRef(null)
  scheduleNextRef.current = scheduleNext

  function showStimulus() {
    if (finishedRef.current) return
    if (stimulusCount.current >= TOTAL_STIMULI) {
      finishSession()
      return
    }
    stimulusCount.current += 1
    setShown(stimulusCount.current)
    appearedAtRef.current = Date.now()
    setVisible(true)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      appearedAtRef.current = null
      tapsRef.current.push({ index: stimulusCount.current - 1, correct: false, time: null, type: 'miss' })
      if (stimulusCount.current >= TOTAL_STIMULI) {
        finishSession()
      } else {
        scheduleNextRef.current()
      }
    }, STIMULUS_VISIBLE)
  }

  useEffect(() => {
    scheduleNextRef.current()
    return () => clearTimeout(timerRef.current)
  }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current) return
    if (visible && appearedAtRef.current !== null) {
      const rt = Date.now() - appearedAtRef.current
      clearTimeout(timerRef.current)
      tapsRef.current.push({ index: stimulusCount.current - 1, correct: true, time: rt, type: 'hit' })
      appearedAtRef.current = null
      setVisible(false)
      if (stimulusCount.current >= TOTAL_STIMULI) {
        finishSession()
      } else {
        scheduleNextRef.current()
      }
    } else {
      tapsRef.current.push({ index: stimulusCount.current, correct: false, time: null, type: 'false-alarm' })
    }
  }, [visible, finishSession])

  return (
    <ExerciseShell moduleId="alertness" progress={shown} total={TOTAL_STIMULI} onAbort={onAbort} onTap={handleTap}>
      <div className={s.arena}>
        {visible && <div className={s.stimulus} />}
      </div>
    </ExerciseShell>
  )
}
