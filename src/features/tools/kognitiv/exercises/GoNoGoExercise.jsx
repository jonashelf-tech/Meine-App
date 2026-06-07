import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './GoNoGoExercise.module.css'

const TOTAL      = 30
const NOGO_COUNT = 10
const STIM_MS    = 800

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function buildSeq() {
  const seq = [...Array(TOTAL - NOGO_COUNT).fill('go'), ...Array(NOGO_COUNT).fill('nogo')]
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]]
  }
  return seq
}

export default function GoNoGoExercise({ variant, onDone, onAbort }) {
  const isiRange = variant === 'Schwer' ? [800, 2500] : [1500, 4000]
  const [stimType, setStimType] = useState(null)
  const [done, setDone]         = useState(0)

  const seqRef      = useRef(buildSeq())
  const idxRef      = useRef(0)
  const tapsRef     = useRef([])
  const startedAt   = useRef(new Date().toISOString())
  const timerRef    = useRef(null)
  const appearedAt  = useRef(null)
  const finishedRef = useRef(false)
  const schedRef    = useRef(null)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits   = tapsRef.current.filter(t => t.type === 'hit')
    const misses = tapsRef.current.filter(t => t.type === 'miss')
    const fa     = tapsRef.current.filter(t => t.type === 'false-alarm')
    const avgMs  = hits.length > 0 ? Math.round(hits.reduce((a, b) => a + b.reactionMs, 0) / hits.length) : 0
    const dur    = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'gonogo', variant, startedAt: startedAt.current, duration: dur,
      score: { correct: hits.length, errors: fa.length, misses: misses.length, total: TOTAL },
      mainMetric: avgMs, taps: tapsRef.current,
    }))
  }, [variant, onDone])

  function showStim() {
    if (finishedRef.current) return
    if (idxRef.current >= TOTAL) { finish(); return }
    const type = seqRef.current[idxRef.current++]
    setDone(idxRef.current)
    appearedAt.current = Date.now()
    setStimType(type)
    timerRef.current = setTimeout(() => {
      if (type === 'go') {
        tapsRef.current.push({ index: idxRef.current - 1, type: 'miss', correct: false, reactionMs: null })
      }
      appearedAt.current = null
      setStimType(null)
      if (idxRef.current >= TOTAL) finish()
      else schedRef.current()
    }, STIM_MS)
  }

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(showStim, rand(...isiRange))
  }, [isiRange])
  schedRef.current = schedule

  useEffect(() => { schedRef.current(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current) return
    if (stimType !== null && appearedAt.current !== null) {
      const rt = Date.now() - appearedAt.current
      clearTimeout(timerRef.current)
      const correct = stimType === 'go'
      tapsRef.current.push({ index: idxRef.current - 1, type: correct ? 'hit' : 'false-alarm', correct, reactionMs: rt })
      appearedAt.current = null
      setStimType(null)
      if (idxRef.current >= TOTAL) finish()
      else schedRef.current()
    } else {
      tapsRef.current.push({ index: idxRef.current, type: 'false-alarm', correct: false, reactionMs: null })
    }
  }, [stimType, finish])

  return (
    <ExerciseShell moduleId="gonogo" progress={done} total={TOTAL} onAbort={onAbort} onTap={handleTap}>
      <div className={s.arena}>
        {stimType === 'go'   && <div className={s.go} />}
        {stimType === 'nogo' && <div className={s.nogo} />}
      </div>
    </ExerciseShell>
  )
}
