import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './AlertnessExercise.module.css'

const TOTAL            = 20
const ISI_RANGE        = [2400, 6000]
const STIMULUS_VISIBLE = 800

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default function AlertnessExercise({ onDone, onAbort }) {
  const [visible, setVisible] = useState(false)
  const [shown, setShown]     = useState(0)
  const tapsRef        = useRef([])
  const stimulusCount  = useRef(0)
  const startedAt      = useRef(new Date().toISOString())
  const timerRef       = useRef(null)
  const appearedAtRef  = useRef(null)
  const finishedRef    = useRef(false)
  const finishRef      = useRef(null)

  const finishSession = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits        = tapsRef.current.filter(t => t.type === 'hit')
    const misses      = tapsRef.current.filter(t => t.type === 'miss')
    const falseAlarms = tapsRef.current.filter(t => t.type === 'false-alarm')
    const avgMs       = hits.length > 0 ? Math.round(hits.reduce((a, b) => a + b.time, 0) / hits.length) : 0
    const duration    = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    const session     = createSession({
      moduleId: 'alertness',
      startedAt: startedAt.current,
      duration,
      score: { hits: hits.length, misses: misses.length, falseAlarms: falseAlarms.length },
      mainMetric: avgMs,
      taps: tapsRef.current,
    })
    onDone(session)
  }, [onDone])

  const scheduleNext = useCallback(() => {
    timerRef.current = setTimeout(showStimulus, randBetween(...ISI_RANGE))
  }, [])

  // showStimulus needs scheduleNext so we use a ref to avoid circular dependency
  const scheduleNextRef = useRef(null)
  scheduleNextRef.current = scheduleNext
  finishRef.current = finishSession

  // Nächsten Trial planen oder beenden, wenn TOTAL erreicht
  const advance = () => {
    if (stimulusCount.current >= TOTAL) finishRef.current()
    else scheduleNextRef.current()
  }

  function showStimulus() {
    if (finishedRef.current) return
    stimulusCount.current += 1
    setShown(stimulusCount.current)
    appearedAtRef.current = Date.now()
    setVisible(true)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      appearedAtRef.current = null
      tapsRef.current.push({ index: stimulusCount.current - 1, correct: false, time: null, type: 'miss' })
      advance()
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
      advance()
    } else {
      tapsRef.current.push({ index: stimulusCount.current, correct: false, time: null, type: 'false-alarm' })
    }
  }, [visible])

  return (
    <ExerciseShell moduleId="alertness" progress={shown} total={TOTAL} onAbort={onAbort} onTap={handleTap}>
      <div className={s.arena}>
        {visible && <div className={s.stimulus} />}
      </div>
    </ExerciseShell>
  )
}
