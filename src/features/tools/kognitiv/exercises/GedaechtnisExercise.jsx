import { useState, useRef, useEffect, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './GedaechtnisExercise.module.css'

// 12 circles as clock face: position 0 = 12 o'clock, going clockwise
const CIRCLE_POSITIONS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 - 90) * (Math.PI / 180)
  const r = 38  // % radius
  return { left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle)}%` }
})

const ROUNDS = [2, 2, 3, 3, 4, 4, 5, 5]
const SHOW_MS = 600
const GAP_MS  = 200

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
  const showMs = isHard ? 400 : SHOW_MS
  const gapMs  = isHard ? 100 : GAP_MS

  const [phase,      setPhase]      = useState('show')
  const [roundIdx,   setRoundIdx]   = useState(0)
  const [litCircle,  setLitCircle]  = useState(null)
  const [userInput,  setUserInput]  = useState([])
  const [highlight,  setHighlight]  = useState(null)

  const seqRef    = useRef(null)
  const tapsRef   = useRef([])
  const startedAt = useRef(new Date().toISOString())
  const timersRef = useRef([])

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
    const seq = randSeq(ROUNDS[roundIdx])
    seqRef.current = seq
    playSequence(seq)
    return clearTimers
  }, [roundIdx])

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

    if (newInput.length === ROUNDS[roundIdx]) {
      const nextRound = roundIdx + 1
      if (nextRound >= ROUNDS.length) {
        const duration      = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
        const roundResults  = ROUNDS.map((len, ri) => {
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
          score: { correctRounds, totalRounds: ROUNDS.length, correctTaps },
          mainMetric: correctRounds,
          taps: tapsRef.current,
        })
        onDone(session)
      } else {
        setTimeout(() => setRoundIdx(nextRound), 600)
      }
    }
  }, [phase, userInput, roundIdx, variant, onDone])

  return (
    <div className={s.root}>
      <button className={s.closeBtn} onClick={onAbort}>✕</button>
      <div className={s.roundInfo}>
        {phase === 'show'
          ? `Einprägen — ${ROUNDS[roundIdx]} Kreise`
          : `Reproduzieren — ${ROUNDS[roundIdx]} Kreise`}
      </div>
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
      <div className={s.progress}>Runde {roundIdx + 1} / {ROUNDS.length}</div>
    </div>
  )
}
