import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './NBackExercise.module.css'

const SHAPES = ['circle', 'triangle', 'square', 'star']
const STROKE = { circle: '#8B5CF6', triangle: '#14B8A6', square: '#10B981', star: '#FB7185' }
const FILL   = { circle: 'rgba(139,92,246,0.15)', triangle: 'rgba(20,184,166,0.15)', square: 'rgba(16,185,129,0.15)', star: 'rgba(251,113,133,0.15)' }
const GREY   = 'rgba(255,255,255,0.45)'
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

function ShapeIcon({ type, color, fill }) {
  if (type === 'circle')
    return <svg width="110" height="110" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" stroke={color} strokeWidth="4" fill={fill} /></svg>
  if (type === 'triangle')
    return <svg width="110" height="110" viewBox="0 0 100 100"><polygon points="50,6 94,90 6,90" stroke={color} strokeWidth="4" fill={fill} /></svg>
  if (type === 'square')
    return <svg width="110" height="110" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="8" stroke={color} strokeWidth="4" fill={fill} /></svg>
  return <svg width="110" height="110" viewBox="0 0 100 100"><polygon points="50,6 61,36 94,36 68,58 78,90 50,70 22,90 32,58 6,36 39,36" stroke={color} strokeWidth="4" fill={fill} /></svg>
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
