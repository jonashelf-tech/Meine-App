import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './StroopExercise.module.css'

const TOTAL  = 40
const GAP_MS = 350

const COLORS = [
  { key: 'rot',   label: 'Rot',  hex: '#EF4444' },
  { key: 'blau',  label: 'Blau', hex: '#3B82F6' },
  { key: 'gruen', label: 'Grün', hex: '#22C55E' },
  { key: 'gelb',  label: 'Gelb', hex: '#EAB308' },
]
const WORD = { rot: 'ROT', blau: 'BLAU', gruen: 'GRÜN', gelb: 'GELB' }
const HEX  = Object.fromEntries(COLORS.map(c => [c.key, c.hex]))

const pick = arr => arr[Math.floor(Math.random() * arr.length)]

function buildTrials() {
  const out = []
  for (let i = 0; i < TOTAL; i++) {
    const ink = pick(COLORS).key
    const congruent = Math.random() < 0.4
    const word = congruent ? ink : pick(COLORS.filter(c => c.key !== ink)).key
    out.push({ word, ink, congruent: word === ink })
  }
  return out
}

export default function StroopExercise({ onDone, onAbort }) {
  const [stim, setStim] = useState(null) // { word, ink, congruent } | null
  const [done, setDone] = useState(0)

  const trialsRef   = useRef(buildTrials())
  const idxRef      = useRef(0)
  const tapsRef     = useRef([])
  const appearedAt  = useRef(null)
  const startedAt   = useRef(new Date().toISOString())
  const timerRef    = useRef(null)
  const finishedRef = useRef(false)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const taps    = tapsRef.current
    const correct = taps.filter(t => t.correct).length
    const avg     = arr => (arr.length ? Math.round(arr.reduce((a, b) => a + b.reactionMs, 0) / arr.length) : 0)
    const cong    = taps.filter(t => t.congruent && t.correct)
    const incong  = taps.filter(t => !t.congruent && t.correct)
    const dur     = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'stroop',
      startedAt: startedAt.current,
      duration: dur,
      score: { correct, errors: TOTAL - correct, total: TOTAL, interferenceMs: avg(incong) - avg(cong) },
      mainMetric: Math.round((correct / TOTAL) * 100),
      taps,
    }))
  }, [onDone])

  const showNext = useCallback(() => {
    if (finishedRef.current) return
    if (idxRef.current >= TOTAL) { finish(); return }
    setStim(trialsRef.current[idxRef.current])
    setDone(idxRef.current)
    appearedAt.current = Date.now()
  }, [finish])

  useEffect(() => { showNext(); return () => clearTimeout(timerRef.current) }, [showNext])

  const choose = useCallback((colorKey) => {
    if (finishedRef.current || stim == null || appearedAt.current == null) return
    const rt      = Date.now() - appearedAt.current
    const correct = colorKey === stim.ink
    tapsRef.current.push({ index: idxRef.current, word: stim.word, ink: stim.ink, chosen: colorKey, correct, congruent: stim.congruent, reactionMs: rt })
    appearedAt.current = null
    idxRef.current += 1
    setStim(null)
    setDone(idxRef.current)
    timerRef.current = setTimeout(showNext, GAP_MS)
  }, [stim, showNext])

  return (
    <ExerciseShell moduleId="stroop" progress={done} total={TOTAL} onAbort={onAbort}>
      <div className={s.arena}>
        <div className={s.wordWrap}>
          {stim && <div className={s.word} style={{ color: HEX[stim.ink] }}>{WORD[stim.word]}</div>}
        </div>
        <div className={s.pad}>
          {COLORS.map(c => (
            <button key={c.key} className={s.swatch} onClick={() => choose(c.key)} aria-label={c.label}>
              <span className={s.swatchInner} style={{ background: c.hex, '--c': c.hex }} />
            </button>
          ))}
        </div>
      </div>
    </ExerciseShell>
  )
}
