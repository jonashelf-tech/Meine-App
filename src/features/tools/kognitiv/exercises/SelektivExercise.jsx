import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './SelektivExercise.module.css'

const SHAPES      = ['circle', 'triangle', 'square', 'star']
const COLORS      = ['#8B5CF6', '#14B8A6', '#10B981', '#FB7185']
const COLOR_NAME  = { '#8B5CF6': 'Lila', '#14B8A6': 'Teal', '#10B981': 'Grün', '#FB7185': 'Rose' }
const STIM_MS     = 600
const ISI_MIN     = 800
const ISI_MAX     = 2000
const DURATION_MS = 180_000
const HIDE_AFTER  = 30_000  // Schwer: Indicator nach 30s ausblenden

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function ShapeIcon({ type, color }) {
  const f = `${color}22`
  if (type === 'circle')
    return <svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" stroke={color} strokeWidth="4" fill={f} /></svg>
  if (type === 'triangle')
    return <svg width="100" height="100" viewBox="0 0 100 100"><polygon points="50,6 94,90 6,90" stroke={color} strokeWidth="4" fill={f} /></svg>
  if (type === 'square')
    return <svg width="100" height="100" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="8" stroke={color} strokeWidth="4" fill={f} /></svg>
  return <svg width="100" height="100" viewBox="0 0 100 100"><polygon points="50,6 61,36 94,36 68,58 78,90 50,70 22,90 32,58 6,36 39,36" stroke={color} strokeWidth="4" fill={f} /></svg>
}

export default function SelektivExercise({ variant, onDone, onAbort }) {
  const isHard         = variant === 'Schwer'
  const targetColor    = useRef(COLORS[Math.floor(Math.random() * COLORS.length)])
  const [stim,          setStim]          = useState(null)
  const [showIndicator, setShowIndicator] = useState(true)

  const startTimeRef = useRef(Date.now())
  const startedAt    = useRef(new Date().toISOString())
  const timerRef     = useRef(null)
  const appearedAt   = useRef(null)
  const currentRef   = useRef(null)
  const tappedRef    = useRef(false)
  const tapsRef      = useRef([])
  const targetsRef   = useRef(0)
  const finishedRef  = useRef(false)
  const schedRef     = useRef(null)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(timerRef.current)
    const hits   = tapsRef.current.filter(t => t.type === 'hit').length
    const misses = tapsRef.current.filter(t => t.type === 'miss').length
    const fa     = tapsRef.current.filter(t => t.type === 'false-alarm').length
    const dur    = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'selektiv', variant, startedAt: startedAt.current, duration: dur,
      score: { hits, misses, falseAlarms: fa, total: targetsRef.current },
      mainMetric: targetsRef.current > 0 ? Math.round((hits / targetsRef.current) * 100) : 0,
      taps: tapsRef.current,
    }))
  }, [variant, onDone])

  function showStim() {
    if (finishedRef.current) return
    if (Date.now() - startTimeRef.current >= DURATION_MS) { finish(); return }
    if (isHard && Date.now() - startTimeRef.current >= HIDE_AFTER) setShowIndicator(false)
    const shape    = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    const color    = COLORS[Math.floor(Math.random() * COLORS.length)]
    const isTarget = color === targetColor.current
    if (isTarget) targetsRef.current++
    currentRef.current = { shape, color, isTarget }
    tappedRef.current  = false
    appearedAt.current = Date.now()
    setStim({ shape, color })
    timerRef.current = setTimeout(() => {
      if (!tappedRef.current && isTarget) {
        tapsRef.current.push({ type: 'miss', color, shape, correct: false, reactionMs: null })
      }
      setStim(null)
      appearedAt.current = null
      timerRef.current = setTimeout(() => schedRef.current(), rand(ISI_MIN, ISI_MAX))
    }, STIM_MS)
  }

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(showStim, rand(ISI_MIN, ISI_MAX))
  }, [])
  schedRef.current = schedule

  useEffect(() => { schedRef.current(); return () => clearTimeout(timerRef.current) }, [])

  const handleTap = useCallback(() => {
    if (finishedRef.current || stim === null || tappedRef.current) return
    tappedRef.current = true
    const rt      = Date.now() - appearedAt.current
    const correct = currentRef.current.isTarget
    tapsRef.current.push({ type: correct ? 'hit' : 'false-alarm', color: stim.color, shape: stim.shape, correct, reactionMs: rt })
  }, [stim])

  const tc = targetColor.current

  return (
    <ExerciseShell moduleId="selektiv" durationMs={DURATION_MS} onAbort={onAbort} onTap={handleTap}>
      <div
        className={s.indicator}
        style={{ opacity: showIndicator ? 1 : 0, color: tc, borderColor: `${tc}55`, background: `${tc}18` }}
      >
        <div className={s.dot} style={{ background: tc }} />
        Ziel: {COLOR_NAME[tc]}
      </div>
      <div className={s.arena}>
        {stim && <ShapeIcon type={stim.shape} color={stim.color} />}
      </div>
    </ExerciseShell>
  )
}
