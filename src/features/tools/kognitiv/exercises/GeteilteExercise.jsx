import { useEffect, useRef, useState, useCallback } from 'react'
import { createSession } from '../sessionStore'
import ExerciseShell from './ExerciseShell'
import s from './GeteilteExercise.module.css'

const NUM_CIRCLES  = 5
const DURATION_MS  = 180_000
const TAP_WINDOW   = 600
const BEAT_NORMAL  = 1200
const FREQ_HIGH    = 880
const FREQ_LOW     = 330
const CLOSED_PROB  = 0.25

// 5 Ringe gleichmäßig auf einem Kreis (Pentagon), Start oben
const POSITIONS = Array.from({ length: NUM_CIRCLES }, (_, i) => {
  const angle = (i * (360 / NUM_CIRCLES) - 90) * (Math.PI / 180)
  return { left: `${50 + 36 * Math.cos(angle)}%`, top: `${50 + 36 * Math.sin(angle)}%` }
})

function playTone(ctx, freq) {
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') ctx.resume()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {}
}

export default function GeteilteExercise({ onDone, onAbort }) {
  const beatMs = BEAT_NORMAL

  const [closedIdx, setClosedIdx] = useState(-1)
  const [rotation,  setRotation]  = useState(0)
  const [toneLabel, setToneLabel] = useState(null)

  const startTimeRef  = useRef(Date.now())
  const startedAt     = useRef(new Date().toISOString())
  const beatTimerRef  = useRef(null)
  const tapWindowRef  = useRef(null)
  const audioCtxRef   = useRef(null)
  const lastToneRef   = useRef(null)
  const beatDataRef   = useRef(null)
  const tappedRef     = useRef(false)
  const tapsRef       = useRef([])
  const finishedRef   = useRef(false)

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)() } catch {}
    }
    return audioCtxRef.current
  }, [])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimeout(beatTimerRef.current)
    clearTimeout(tapWindowRef.current)
    const vHits   = tapsRef.current.filter(t => t.triggerVisual && t.correct).length
    const aHits   = tapsRef.current.filter(t => t.triggerAudio && t.correct).length
    const errors  = tapsRef.current.filter(t => !t.correct && t.type !== 'miss').length
    const misses  = tapsRef.current.filter(t => t.type === 'miss').length
    const total   = tapsRef.current.filter(t => t.type !== 'false-alarm').length
    const allHits = vHits + aHits
    const dur     = Math.round((Date.now() - new Date(startedAt.current).getTime()) / 1000)
    onDone(createSession({
      moduleId: 'geteilt', startedAt: startedAt.current, duration: dur,
      score: { visualHits: vHits, audioHits: aHits, errors, misses, total },
      mainMetric: total > 0 ? Math.round((allHits / total) * 100) : 0,
      taps: tapsRef.current,
    }))
  }, [onDone])

  const tick = useCallback(() => {
    if (finishedRef.current) return
    if (Date.now() - startTimeRef.current >= DURATION_MS) { finish(); return }

    // ~25 % der Beats: genau EIN geschlossener Ring (visuelles Ziel)
    const visualTarget = Math.random() < CLOSED_PROB
    const closed       = visualTarget ? Math.floor(Math.random() * NUM_CIRCLES) : -1

    const prev = lastToneRef.current
    let tone
    if (!prev) {
      tone = Math.random() < 0.5 ? 'high' : 'low'
    } else {
      tone = Math.random() < 0.25 ? prev : (prev === 'high' ? 'low' : 'high')
    }
    const audioTarget = tone === prev && prev !== null
    lastToneRef.current = tone

    beatDataRef.current = { visualTarget, audioTarget }
    tappedRef.current   = false
    setClosedIdx(closed)
    setRotation(r => r + 40 + Math.floor(Math.random() * 140))  // immer vorwärts weiterdrehen
    setToneLabel(tone === 'high' ? 'HOCH' : 'TIEF')
    playTone(getCtx(), tone === 'high' ? FREQ_HIGH : FREQ_LOW)

    if (visualTarget || audioTarget) {
      tapWindowRef.current = setTimeout(() => {
        if (!tappedRef.current) {
          tapsRef.current.push({ type: 'miss', correct: false, triggerVisual: visualTarget, triggerAudio: audioTarget, reactionMs: null })
        }
        setToneLabel(null)
      }, TAP_WINDOW)
    } else {
      setTimeout(() => setToneLabel(null), TAP_WINDOW)
    }

    beatTimerRef.current = setTimeout(tick, beatMs)
  }, [beatMs, getCtx, finish])

  useEffect(() => {
    beatTimerRef.current = setTimeout(tick, beatMs)
    return () => {
      clearTimeout(beatTimerRef.current)
      clearTimeout(tapWindowRef.current)
    }
  }, [tick, beatMs])

  const handleTap = useCallback(() => {
    if (finishedRef.current) return
    const ctx = getCtx()
    if (ctx?.state === 'suspended') ctx.resume()
    const bd = beatDataRef.current
    if (!bd) {
      tapsRef.current.push({ type: 'false-alarm', correct: false, triggerVisual: false, triggerAudio: false, reactionMs: null })
      return
    }
    if (tappedRef.current) return
    tappedRef.current = true
    const isTarget = bd.visualTarget || bd.audioTarget
    tapsRef.current.push({
      type: isTarget ? 'hit' : 'false-alarm',
      correct: isTarget,
      triggerVisual: bd.visualTarget,
      triggerAudio: bd.audioTarget,
      reactionMs: null,
    })
  }, [getCtx])

  return (
    <ExerciseShell moduleId="geteilt" durationMs={DURATION_MS} onAbort={onAbort} onTap={handleTap}>
      <div className={s.arena}>
        <div className={s.ring} style={{ transform: `rotate(${rotation}deg)` }}>
          {POSITIONS.map((pos, i) => (
            <div
              key={i}
              className={[s.circle, i === closedIdx ? s.circleClosed : ''].join(' ')}
              style={pos}
            />
          ))}
        </div>
        <div className={[s.toneLabel, toneLabel ? s.toneActive : ''].join(' ')}>
          {toneLabel ?? '· · ·'}
        </div>
      </div>
    </ExerciseShell>
  )
}
