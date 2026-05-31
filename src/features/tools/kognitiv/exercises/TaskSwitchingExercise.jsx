import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './TaskSwitchingExercise.module.css'

const SYMBOLS   = ['X', 'O']
const COLORS    = ['#8B5CF6', '#14B8A6', '#10B981', '#FB7185']
const PER_PHASE = 30
const STIM_MS   = 1500

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function getRule(p) { return p % 2 === 1 ? 'shape' : 'color' }

export default function TaskSwitchingExercise({ variant, onDone, onAbort }) {
  const numPhases = variant === 'Schwer' ? 3 : 2

  const [phase,       setPhase]       = useState(1)
  const [stim,        setStim]        = useState(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [countdown,   setCountdown]   = useState(null)
  const [done,        setDone]        = useState(0)

  const phaseRef      = useRef(1)
  const phaseCountRef = useRef(0)
  const prevStimRef   = useRef(null)
  const matchRef      = useRef(false)
  const tappedRef     = useRef(false)
  const appearedAt    = useRef(null)
  const tapsRef       = useRef([])
  const startedAt     = useRef(new Date().toISOString())
  const timerRef      = useRef(null)
  const finishedRef   = useRef(false)
  const schedRef      = useRef(null)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits1  = tapsRef.current.filter(t => t.phase === 1 && t.type === 'hit')
    const hits2  = tapsRef.current.filter(t => t.phase === 2 && t.type === 'hit')
    const avg    = arr => arr.length > 0 ? Math.round(arr.reduce((sum, t) => sum + t.reactionMs, 0) / arr.length) : 0
    const cost   = Math.max(0, avg(hits2) - avg(hits1))
    const correct = tapsRef.current.filter(t => t.type === 'hit').length
    const errors  = tapsRef.current.filter(t => t.type !== 'hit').length
    const dur     = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'taskswitching', variant, startedAt: startedAt.current, duration: dur,
      score: { correct, errors, switchErrors: tapsRef.current.filter(t => t.phase === 2 && t.type !== 'hit').length, total: PER_PHASE * numPhases },
      mainMetric: cost, taps: tapsRef.current,
    }))
  }, [variant, onDone, numPhases])

  function doSwitchCountdown(nextPhase, cb) {
    setIsSwitching(true)
    setCountdown(3)
    let n = 3
    const iv = setInterval(() => {
      n--
      if (n <= 0) {
        clearInterval(iv)
        phaseRef.current = nextPhase
        phaseCountRef.current = 0
        prevStimRef.current = null
        setPhase(nextPhase)
        setIsSwitching(false)
        setCountdown(null)
        cb()
      } else {
        setCountdown(n)
      }
    }, 1000)
  }

  function showStim() {
    if (finishedRef.current) return
    if (phaseCountRef.current >= PER_PHASE) {
      const next = phaseRef.current + 1
      if (next > numPhases) { finish(); return }
      doSwitchCountdown(next, () => schedRef.current())
      return
    }
    const sym     = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    const col     = COLORS[Math.floor(Math.random() * COLORS.length)]
    const newStim = { symbol: sym, color: col }
    const rule    = getRule(phaseRef.current)
    const prev    = prevStimRef.current
    const isMatch = prev ? (rule === 'shape' ? sym === prev.symbol : col === prev.color) : false
    phaseCountRef.current++
    setDone((phaseRef.current - 1) * PER_PHASE + phaseCountRef.current)
    matchRef.current   = isMatch
    tappedRef.current  = false
    appearedAt.current = Date.now()
    setStim(newStim)
    timerRef.current = setTimeout(() => {
      if (isMatch && !tappedRef.current) {
        tapsRef.current.push({ phase: phaseRef.current, type: 'miss', correct: false, reactionMs: null, symbol: sym, color: col })
      }
      prevStimRef.current = newStim
      setStim(null)
      appearedAt.current = null
      timerRef.current = setTimeout(() => schedRef.current(), 100)
    }, STIM_MS)
  }

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(showStim, rand(800, 2000))
  }, [])
  schedRef.current = schedule

  useEffect(() => { schedRef.current(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current || stim === null || tappedRef.current || isSwitching) return
    tappedRef.current = true
    const rt      = Date.now() - appearedAt.current
    const isMatch = matchRef.current
    tapsRef.current.push({
      phase: phaseRef.current, type: isMatch ? 'hit' : 'false-alarm',
      correct: isMatch, reactionMs: rt, symbol: stim.symbol, color: stim.color,
    })
  }, [stim, isSwitching])

  const ruleLabel = phase % 2 === 1 ? 'FORM' : 'FARBE'
  const ruleColor = phase % 2 === 1 ? '#8B5CF6' : '#14B8A6'
  const nextLabel = (phase + 1) % 2 === 1 ? 'FORM' : 'FARBE'

  if (isSwitching) {
    return (
      <div className={s.switchScreen}>
        <div className={s.switchLabel}>JETZT: {nextLabel}</div>
        {countdown !== null && <div key={countdown} className={s.switchCountdown}>{countdown}</div>}
      </div>
    )
  }

  return (
    <ExerciseShell moduleId="taskswitching" progress={done} total={PER_PHASE * numPhases} onAbort={onAbort} onTap={handleTap}>
      <div className={s.ruleHeader}>
        <div
          className={s.rulePill}
          style={{ color: ruleColor, borderColor: `${ruleColor}55`, background: `${ruleColor}18` }}
        >
          <div className={s.ruleDot} style={{ background: ruleColor }} />
          {ruleLabel}
        </div>
      </div>
      <div className={s.arena}>
        {stim && <div className={s.stimulus} style={{ color: stim.color }}>{stim.symbol}</div>}
      </div>
    </ExerciseShell>
  )
}
