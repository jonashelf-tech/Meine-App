import { useState, useRef, useEffect, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './GedaechtnisExercise.module.css'

const CIRCLE_POSITIONS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 - 90) * (Math.PI / 180)
  const r = 38
  return { left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle)}%` }
})

const BASE_ROUNDS = [2, 2, 3, 3, 4, 4, 5, 5]
const SHOW_MS = 750
const GAP_MS  = 400

function randSeq(len) {
  const pool = Array.from({ length: 12 }, (_, i) => i)
  const seq  = []
  while (seq.length < len) {
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (!seq.includes(pick)) seq.push(pick)
  }
  return seq
}

export default function GedaechtnisExercise({ variant, onDone, onAbort }) {
  const isHard = variant === 'Schwer'
  const showMs = isHard ? 550 : SHOW_MS
  const gapMs  = isHard ? 200 : GAP_MS

  const [phase,     setPhase]     = useState('show')
  const [roundIdx,  setRoundIdx]  = useState(0)
  const [litCircle, setLitCircle] = useState(null)
  const [userInput, setUserInput] = useState([])
  const [highlight, setHighlight] = useState(null)

  const seqRef         = useRef(null)
  const tapsRef        = useRef([])
  const roundsQueueRef = useRef([...BASE_ROUNDS])
  const mistakesRef    = useRef(0)
  const startedAt      = useRef(new Date().toISOString())
  const timersRef      = useRef([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const playSequence = useCallback((seq) => {
    setPhase('show')
    setUserInput([])
    clearTimers()
    seq.forEach((circIdx, i) => {
      const t1 = setTimeout(() => setLitCircle(circIdx), i * (showMs + gapMs))
      const t2 = setTimeout(() => setLitCircle(null),   i * (showMs + gapMs) + showMs)
      timersRef.current.push(t1, t2)
    })
    const tEnd = setTimeout(() => setPhase('input'), seq.length * (showMs + gapMs) + 200)
    timersRef.current.push(tEnd)
  }, [showMs, gapMs])

  useEffect(() => {
    const seq = randSeq(roundsQueueRef.current[roundIdx])
    seqRef.current = seq
    playSequence(seq)
    return clearTimers
  }, [roundIdx])

  const finishSession = useCallback(() => {
    const duration     = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    const queue        = roundsQueueRef.current
    const roundResults = queue.map((len, ri) => {
      const rTaps = tapsRef.current.filter(t => t.round === ri)
      return { round: ri, seqLen: len, errors: rTaps.filter(t => !t.correct).length }
    })
    const correctRounds = roundResults.filter(r => r.errors === 0).length
    const correctTaps   = tapsRef.current.filter(t => t.correct).length
    const session = createSession({
      moduleId: 'gedaechtnis',
      variant,
      startedAt: startedAt.current,
      duration,
      score: { correctRounds, totalRounds: queue.length, correctTaps, mistakes: mistakesRef.current },
      mainMetric: correctRounds,
      taps: tapsRef.current,
    })
    onDone(session)
  }, [variant, onDone])

  const handleCircleTap = useCallback((circIdx) => {
    if (phase !== 'input') return

    const pos      = userInput.length
    const expected = seqRef.current[pos]
    const correct  = circIdx === expected

    setHighlight({ idx: circIdx, correct })
    setTimeout(() => setHighlight(null), 300)

    const newInput = [...userInput, circIdx]
    setUserInput(newInput)
    tapsRef.current.push({ round: roundIdx, pos, expected, got: circIdx, correct })

    if (newInput.length === roundsQueueRef.current[roundIdx]) {
      const hasError  = newInput.some((tap, i) => tap !== seqRef.current[i])
      const nextRound = roundIdx + 1

      if (hasError) {
        mistakesRef.current++
        if (mistakesRef.current >= 2) {
          setTimeout(finishSession, 2000)
        } else {
          // append retry round and continue
          roundsQueueRef.current = [...roundsQueueRef.current, roundsQueueRef.current[roundIdx]]
          setTimeout(() => setRoundIdx(nextRound), 2000)
        }
      } else {
        if (nextRound >= roundsQueueRef.current.length) {
          setTimeout(finishSession, 2000)
        } else {
          setTimeout(() => setRoundIdx(nextRound), 2000)
        }
      }
    }
  }, [phase, userInput, roundIdx, finishSession])

  return (
    <div className={s.root}>
      <button className={s.closeBtn} onClick={onAbort}>✕</button>
      <div className={s.arena}>
        {CIRCLE_POSITIONS.map((pos, i) => {
          const isLit   = litCircle === i
          const hlState = highlight?.idx === i ? (highlight.correct ? 'correct' : 'wrong') : null
          return (
            <button
              key={i}
              className={[s.circle, isLit ? s.lit : '', hlState ? s[hlState] : ''].join(' ')}
              style={pos}
              onClick={() => handleCircleTap(i)}
            />
          )
        })}
      </div>
    </div>
  )
}
