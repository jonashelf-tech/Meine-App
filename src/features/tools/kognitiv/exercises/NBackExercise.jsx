import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import ShapeIcon, { SHAPE_KEYS as SHAPES, SHAPE_STROKE as STROKE, SHAPE_FILL as FILL } from './ShapeIcon'
import s from './NBackExercise.module.css'

const GREY = 'rgba(255,255,255,0.45)'
const TOTAL  = 44
const GAP_MS = 400

// n = Abstand (1 = vorheriges Symbol, 2 = vorvorheriges).
// Treffer entstehen mit ~33 % bei genau Abstand n; Nicht-Treffer sind
// garantiert != seq[i-n] (saubere Zielzählung).
function buildSeq(n) {
  const seq = []
  for (let i = 0; i < TOTAL; i++) {
    if (i >= n && Math.random() < 0.33) {
      seq.push(seq[i - n])
    } else {
      let cand
      do { cand = SHAPES[Math.floor(Math.random() * SHAPES.length)] }
      while (i >= n && cand === seq[i - n])
      seq.push(cand)
    }
  }
  return seq
}

export default function NBackExercise({ onDone, onAbort }) {
  const showMs  = 1200
  const n       = 1
  const [current, setCurrent] = useState(null)
  const [done, setDone]       = useState(0)

  const seqRef      = useRef(buildSeq(n))
  const idxRef      = useRef(0)
  const tapsRef     = useRef([])
  const startedAt   = useRef(new Date().toISOString())
  const timerRef    = useRef(null)
  const tappedRef   = useRef(false)
  const finishedRef = useRef(false)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const seq    = seqRef.current
    const total  = seq.filter((x, i) => i >= n && x === seq[i - n]).length
    const hits   = tapsRef.current.filter(t => t.type === 'hit').length
    const errors = tapsRef.current.filter(t => t.type === 'false-alarm').length
    const misses = tapsRef.current.filter(t => t.type === 'miss').length
    const dur    = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'nback', startedAt: startedAt.current, duration: dur,
      score: { hits, errors, misses, total },
      mainMetric: total > 0 ? Math.round((hits / total) * 100) : 0,
      taps: tapsRef.current,
    }))
  }, [onDone])

  function showNext() {
    if (finishedRef.current) return
    if (idxRef.current >= TOTAL) { finish(); return }
    const idx   = idxRef.current
    const shape = seqRef.current[idx]
    const prev  = idx >= n ? seqRef.current[idx - n] : null
    const isMatch = idx >= n && shape === prev
    idxRef.current++
    setDone(idxRef.current)
    tappedRef.current = false
    setCurrent(shape)
    timerRef.current = setTimeout(() => {
      if (isMatch && !tappedRef.current) {
        tapsRef.current.push({ index: idx, type: 'miss', correct: false, shape, prev })
      }
      setCurrent(null)
      timerRef.current = setTimeout(() => {
        if (idxRef.current >= TOTAL) finish()
        else showNext()
      }, GAP_MS)
    }, showMs)
  }

  useEffect(() => { showNext(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current || current === null || tappedRef.current) return
    tappedRef.current = true
    const idx     = idxRef.current - 1
    const prev    = idx >= n ? seqRef.current[idx - n] : null
    const isMatch = idx >= n && seqRef.current[idx] === prev
    tapsRef.current.push({ index: idx, type: isMatch ? 'hit' : 'false-alarm', correct: isMatch, shape: current, prev })
  }, [current])

  const color = current ? STROKE[current] : GREY
  const fill  = current ? FILL[current] : 'none'

  return (
    <ExerciseShell moduleId="nback" progress={done} total={TOTAL} onAbort={onAbort} onTap={handleTap}>
      <div className={s.arena}>
        <div className={s.rule}>Gleich wie <span className={s.ruleN}>{n} zurück</span> → tippen</div>
        {current && <ShapeIcon type={current} color={color} fill={fill} />}
      </div>
    </ExerciseShell>
  )
}
