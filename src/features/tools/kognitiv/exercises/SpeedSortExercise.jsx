import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import ModuleIcon from '../ModuleIcon'
import s from './SpeedSortExercise.module.css'

const DURATION_MS  = 90000
const SWITCH_EVERY = 10
const SYMBOLS = ['alertness', 'zahlensuche', 'gonogo', 'nback', 'taskswitching', 'gedaechtnis']

function pick(arr, not) {
  const pool = not ? arr.filter(x => x !== not) : arr
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function SpeedSortExercise({ onDone, onAbort }) {
  const [target, setTarget]       = useState(() => pick(SYMBOLS))
  const [remaining, setRemaining] = useState(SWITCH_EVERY)
  const [current, setCurrent]     = useState(null)
  const [flash, setFlash]         = useState(null) // 'ok' | 'no' | null

  const targetRef    = useRef(target)
  const currentRef   = useRef(null)
  const remainingRef = useRef(SWITCH_EVERY)
  const correctRef   = useRef(0)
  const totalRef     = useRef(0)
  const tapsRef      = useRef([])
  const startedAt    = useRef(new Date().toISOString())
  const finishedRef  = useRef(false)
  const endTimerRef  = useRef(null)
  const flashTimerRef = useRef(null)

  const nextSymbol = useCallback(() => {
    const isMatch = Math.random() < 0.5
    const sym = isMatch ? targetRef.current : pick(SYMBOLS, targetRef.current)
    currentRef.current = sym
    setCurrent(sym)
  }, [])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(endTimerRef.current)
    clearTimeout(flashTimerRef.current)
    const elapsedSec = Math.max(1, Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000))
    onDone(createSession({
      moduleId: 'speedsort',
      startedAt: startedAt.current,
      duration: elapsedSec,
      score: { correct: correctRef.current, errors: totalRef.current - correctRef.current, total: totalRef.current },
      mainMetric: Math.round((correctRef.current / elapsedSec) * 60),
      taps: tapsRef.current,
    }))
  }, [onDone])

  useEffect(() => {
    nextSymbol()
    endTimerRef.current = setTimeout(finish, DURATION_MS)
    return () => { clearTimeout(endTimerRef.current); clearTimeout(flashTimerRef.current) }
  }, [nextSymbol, finish])

  const judge = useCallback((saidMatch) => {
    if (finishedRef.current || currentRef.current == null) return
    const isMatch = currentRef.current === targetRef.current
    const correct = saidMatch === isMatch
    totalRef.current += 1
    if (correct) correctRef.current += 1
    tapsRef.current.push({ target: targetRef.current, symbol: currentRef.current, saidMatch, correct })

    setFlash(correct ? 'ok' : 'no')
    clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlash(null), 170)

    let rem = remainingRef.current - 1
    if (rem <= 0) {
      const nt = pick(SYMBOLS, targetRef.current)
      targetRef.current = nt
      setTarget(nt)
      rem = SWITCH_EVERY
    }
    remainingRef.current = rem
    setRemaining(rem)
    nextSymbol()
  }, [nextSymbol])

  return (
    <ExerciseShell moduleId="speedsort" durationMs={DURATION_MS} onAbort={onAbort}>
      <div className={s.arena}>
        <div className={s.targetWrap}>
          <div className={s.targetLabel}>Ziel</div>
          <div className={s.targetBadge}>
            <ModuleIcon id={target} size={34} />
            <span className={s.count}>{remaining}</span>
          </div>
        </div>

        <div className={[s.stage, flash === 'ok' ? s.ok : '', flash === 'no' ? s.no : ''].join(' ')}>
          {current && <div key={totalRef.current} className={s.symbol}><ModuleIcon id={current} size={104} /></div>}
        </div>

        <div className={s.pad}>
          <button className={[s.btn, s.no2].join(' ')} onClick={() => judge(false)} aria-label="Passt nicht">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <button className={[s.btn, s.yes].join(' ')} onClick={() => judge(true)} aria-label="Passt">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-11" /></svg>
          </button>
        </div>
      </div>
    </ExerciseShell>
  )
}
