import { useState, useRef, useEffect, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './GedaechtnisExercise.module.css'

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const TapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11V6a2 2 0 0 1 4 0v5" />
    <path d="M13 9a2 2 0 0 1 4 0v3" />
    <path d="M17 11a2 2 0 0 1 4 0v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.2-3l-2.3-4a2 2 0 0 1 3.4-2L9 13" />
  </svg>
)

const CIRCLE_POSITIONS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 - 90) * (Math.PI / 180)
  const r = 38
  return { left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle)}%` }
})

// Unendliche Progression: 2,2,3,3,4,4,5,5,6,6,… — wächst alle 2 Runden um 1
const lenForRound = (ri) => 2 + Math.floor(ri / 2)
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
  const roundIdxRef    = useRef(0)
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
    roundIdxRef.current = roundIdx
    const seq = randSeq(lenForRound(roundIdx))
    seqRef.current = seq
    playSequence(seq)
    return clearTimers
  }, [roundIdx])

  const finishSession = useCallback(() => {
    const duration     = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    const totalRounds  = roundIdxRef.current + 1
    const roundResults = Array.from({ length: totalRounds }, (_, ri) => {
      const rTaps = tapsRef.current.filter(t => t.round === ri)
      return { round: ri, seqLen: lenForRound(ri), errors: rTaps.filter(t => !t.correct).length }
    })
    const correctRounds = roundResults.filter(r => r.errors === 0).length
    const correctTaps   = tapsRef.current.filter(t => t.correct).length
    const session = createSession({
      moduleId: 'gedaechtnis',
      variant,
      startedAt: startedAt.current,
      duration,
      score: { correctRounds, totalRounds, correctTaps, mistakes: mistakesRef.current },
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
    tapsRef.current.push({ round: roundIdx, pos, expected, got: circIdx, correct })

    if (!correct) {
      mistakesRef.current++
      clearTimers()
      if (mistakesRef.current >= 2) {
        setTimeout(finishSession, 800)
      } else {
        setUserInput([])
        setTimeout(() => playSequence(seqRef.current), 1000)
      }
      return
    }

    const newInput = [...userInput, circIdx]
    setUserInput(newInput)

    if (newInput.length === seqRef.current.length) {
      // Unendlich: immer zur nächsten (längeren) Runde — Ende nur bei 2. Fehler
      setTimeout(() => setRoundIdx(roundIdx + 1), 800)
    }
  }, [phase, userInput, roundIdx, finishSession, playSequence])

  return (
    <ExerciseShell moduleId="gedaechtnis" hideProgress onAbort={onAbort}>
      <div className={[s.phaseBanner, phase === 'show' ? s.phaseShow : s.phaseInput].join(' ')}>
        {phase === 'show' ? <EyeIcon /> : <TapIcon />}
        <div className={s.phaseTextWrap}>
          <span className={s.phaseTitle}>{phase === 'show' ? 'Merken' : 'Antippen'}</span>
          <span className={s.phaseHint}>
            {phase === 'show' ? 'Reihenfolge einprägen' : `Jetzt du — ${userInput.length}/${seqRef.current?.length ?? 0}`}
          </span>
        </div>
      </div>
      <div className={[s.arena, phase === 'input' ? s.arenaInput : s.arenaShow].join(' ')}>
        {CIRCLE_POSITIONS.map((pos, i) => {
          const isLit   = litCircle === i
          const hlState = highlight?.idx === i ? (highlight.correct ? 'correct' : 'wrong') : null
          return (
            <button
              key={i}
              className={[s.circle, isLit ? s.lit : '', phase === 'input' ? s.circleReady : '', hlState ? s[hlState] : ''].join(' ')}
              style={pos}
              onClick={() => handleCircleTap(i)}
            />
          )
        })}
      </div>
    </ExerciseShell>
  )
}
