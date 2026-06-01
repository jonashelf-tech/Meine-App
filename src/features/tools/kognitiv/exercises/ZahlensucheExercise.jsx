import { useState, useRef, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
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

  const [nextIdx,  setNextIdx]  = useState(0)
  const [flashes,  setFlashes]  = useState({}) // { [num]: 'ok' | 'err' }
  const [feedback, setFeedback] = useState(null) // 'ok' | 'err' | null

  const flashCell = useCallback((num, type) => {
    setFlashes(prev => ({ ...prev, [num]: type }))
    setTimeout(() => setFlashes(prev => {
      const next = { ...prev }
      delete next[num]
      return next
    }), 350)
  }, [])

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
      setFeedback('ok')
      setTimeout(() => setFeedback(null), 350)
      flashCell(num, 'ok')
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
      setFeedback('err')
      setTimeout(() => setFeedback(null), 350)
      flashCell(num, 'err')
    }
  }, [nextIdx, sequence, total, variant, onDone, flashCell])

  const fmt = (n) => String(n).padStart(2, '0')
  const nextTarget = sequence[nextIdx]

  return (
    <ExerciseShell moduleId="zahlensuche" progress={nextIdx} total={total} onAbort={onAbort}>
      <div className={s.target}>
        <div className={s.targetHint}>Suche</div>
        <div className={s.targetNum}>{fmt(nextTarget)}</div>
        <div className={s.feedbackSlot}>
          {feedback === 'ok'  && <span key={`ok-${nextIdx}`}  className={[s.feedbackIcon, s.feedbackOk ].join(' ')}>✓</span>}
          {feedback === 'err' && <span key={`err-${nextIdx}`} className={[s.feedbackIcon, s.feedbackErr].join(' ')}>✗</span>}
        </div>
      </div>
      <div className={s.gridWrap}>
        <div className={s.grid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {cells.map(num => {
            const flash = flashes[num]
            return (
              <button
                key={num}
                className={[s.cell, flash === 'ok' ? s.flashOk : flash === 'err' ? s.flashErr : ''].join(' ')}
                onClick={() => handleTap(num)}
              >
                {fmt(num)}
              </button>
            )
          })}
        </div>
      </div>
    </ExerciseShell>
  )
}
