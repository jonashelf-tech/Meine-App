import { useState, useRef, useCallback } from 'react'
import { createSession } from '../sessionStore'
import s from './ZahlensucheExercise.module.css'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ZahlensucheExercise({ variant, onDone, onAbort }) {
  const isReverse = variant === 'Rückwärts'
  const isHard    = variant === 'Schwer'
  const total     = isHard ? 30 : 25
  const cols      = isHard ? 6 : 5

  const numbers  = Array.from({ length: total }, (_, i) => i + 1)
  const sequence = isReverse ? [...numbers].reverse() : numbers
  const [cells]  = useState(() => shuffle(numbers))

  const [nextIdx,   setNextIdx]   = useState(0)
  const [doneSet,   setDoneSet]   = useState(new Set())
  const [errorCell, setErrorCell] = useState(null)

  const tapsRef     = useRef([])
  const startRef    = useRef(Date.now())
  const startedAt   = useRef(new Date().toISOString())
  const lastTapRef  = useRef(Date.now())

  const handleTap = useCallback((num) => {
    const now     = Date.now()
    const elapsed = (now - lastTapRef.current) / 1000
    lastTapRef.current = now
    const target  = sequence[nextIdx]
    const correct = num === target

    tapsRef.current.push({ index: nextIdx, target, got: num, correct, time: elapsed })

    if (correct) {
      setDoneSet(prev => new Set([...prev, num]))
      const newIdx = nextIdx + 1
      setNextIdx(newIdx)
      if (newIdx >= total) {
        const totalTime = Math.round((now - startRef.current) / 1000)
        const errors    = tapsRef.current.filter(t => !t.correct).length
        const session   = createSession({
          moduleId: 'zahlensuche',
          variant,
          startedAt: startedAt.current,
          duration: totalTime,
          score: { correct: total, errors, total },
          mainMetric: totalTime,
          taps: tapsRef.current,
        })
        onDone(session)
      }
    } else {
      setErrorCell(num)
      setTimeout(() => setErrorCell(null), 500)
    }
  }, [nextIdx, sequence, total, variant, onDone])

  const fmt = (n) => String(n).padStart(2, '0')
  const nextTarget = sequence[nextIdx]

  return (
    <div className={s.root}>
      <div className={s.topBar}>
        <button className={s.closeBtn} onClick={onAbort}>✕</button>
        <div className={s.targetWrap}>
          <div className={s.targetHint}>Suche</div>
          <div className={s.targetNum}>{fmt(nextTarget)}</div>
        </div>
        <div className={s.progress}>{nextIdx}/{total}</div>
      </div>
      <div className={s.gridWrap}>
        <div className={s.grid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {cells.map(num => {
            const isDone  = doneSet.has(num)
            const isNext  = num === nextTarget
            const isError = num === errorCell
            return (
              <button
                key={num}
                className={[s.cell, isDone ? s.done : '', isNext ? s.next : '', isError ? s.error : ''].join(' ')}
                onClick={() => !isDone && handleTap(num)}
                disabled={isDone}
              >
                {fmt(num)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
