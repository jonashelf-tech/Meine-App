import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './CptExercise.module.css'

const STIM_MS     = 600
const ISI_MIN     = 1000
const ISI_MAX     = 2500
const DURATION_MS = 180_000  // 3 Minuten

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

export default function CptExercise({ variant, onDone, onAbort }) {
  const targetType = variant === 'Schwer' ? 'x' : 'circle'
  const [stim, setStim] = useState(null)  // 'circle' | 'x' | null

  const startTimeRef   = useRef(Date.now())
  const startedAt      = useRef(new Date().toISOString())
  const timerRef       = useRef(null)
  const appearedAt     = useRef(null)
  const currentTypeRef = useRef(null)
  const currentMinRef  = useRef(1)
  const tappedRef      = useRef(false)
  const tapsRef        = useRef([])
  const targetsPerMin  = useRef({ 1: 0, 2: 0, 3: 0 })
  const finishedRef    = useRef(false)
  const schedRef       = useRef(null)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits = tapsRef.current.filter(t => t.type === 'hit')
    const miss = tapsRef.current.filter(t => t.type === 'miss')
    const fa   = tapsRef.current.filter(t => t.type === 'false-alarm')
    const hitsPerMin = m => tapsRef.current.filter(t => t.type === 'hit' && t.minute === m).length
    const tpm = targetsPerMin.current
    const acc1 = tpm[1] > 0 ? hitsPerMin(1) / tpm[1] : 1
    const acc3 = tpm[3] > 0 ? hitsPerMin(3) / tpm[3] : acc1
    const decrement = Math.max(0, Math.round((acc1 - acc3) * 100))
    const dur  = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'cpt', variant, startedAt: startedAt.current, duration: dur,
      score: { hits: hits.length, misses: miss.length, falseAlarms: fa.length, total: hits.length + miss.length },
      mainMetric: decrement, taps: tapsRef.current,
    }))
  }, [variant, onDone])

  function showStim() {
    if (finishedRef.current) return
    if (Date.now() - startTimeRef.current >= DURATION_MS) { finish(); return }
    const elapsed = Date.now() - startTimeRef.current
    const minute  = Math.min(3, Math.floor(elapsed / 60000) + 1)
    const type    = Math.random() < 0.7 ? targetType : (targetType === 'circle' ? 'x' : 'circle')
    if (type === targetType) targetsPerMin.current[minute]++
    currentTypeRef.current = type
    currentMinRef.current  = minute
    tappedRef.current      = false
    appearedAt.current     = Date.now()
    setStim(type)
    timerRef.current = setTimeout(() => {
      if (!tappedRef.current && type === targetType) {
        tapsRef.current.push({ type: 'miss', stimType: type, correct: false, reactionMs: null, minute })
      }
      setStim(null)
      appearedAt.current = null
      timerRef.current = setTimeout(() => schedRef.current(), rand(ISI_MIN, ISI_MAX))
    }, STIM_MS)
  }

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(showStim, rand(ISI_MIN, ISI_MAX))
  }, [])
  schedRef.current = schedule

  useEffect(() => { schedRef.current(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current || stim === null || tappedRef.current) return
    tappedRef.current = true
    const rt      = Date.now() - appearedAt.current
    const correct = currentTypeRef.current === targetType
    tapsRef.current.push({ type: correct ? 'hit' : 'false-alarm', stimType: currentTypeRef.current, correct, reactionMs: rt, minute: currentMinRef.current })
  }, [stim, targetType])

  return (
    <ExerciseShell moduleId="cpt" durationMs={DURATION_MS} onAbort={onAbort} onTap={handleTap}>
      <div className={s.arena}>
        {stim === 'circle' && <div className={s.circle} />}
        {stim === 'x'      && <div className={s.xStim}>✕</div>}
      </div>
    </ExerciseShell>
  )
}
