import { useState, useEffect, useRef } from 'react'
import s from './BreathingCircle.module.css'

export default function BreathingCircle({ aktiv = true, dauerSek = 120, onFertig }) {
  const [progress, setProgress] = useState(0) // 0..1 über dauerSek
  const start = useRef(Date.now())
  const fertigRef = useRef(onFertig)
  fertigRef.current = onFertig

  useEffect(() => {
    if (!aktiv) return
    start.current = Date.now()
    let raf
    const tick = () => {
      const p = Math.min(1, (Date.now() - start.current) / (dauerSek * 1000))
      setProgress(p)
      if (p >= 1) { fertigRef.current?.(); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [aktiv, dauerSek])

  const R = 64, C = 2 * Math.PI * R
  const rest = Math.max(0, dauerSek - Math.round(progress * dauerSek))
  const mm = Math.floor(rest / 60), ss = String(rest % 60).padStart(2, '0')

  return (
    <div className={s.wrap}>
      <div className={s.ringWrap}>
        <svg className={s.ring} width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={R} className={s.ringBg} />
          <circle cx="70" cy="70" r={R} className={s.ringFg}
            style={{ strokeDasharray: C, strokeDashoffset: C * (1 - progress) }} />
        </svg>
        <div className={s.disc} />
        <div className={s.label}>
          <span className={s.labelIn}>Einatmen…</span>
          <span className={s.labelOut}>Ausatmen…</span>
        </div>
      </div>
      <div className={s.timer}>{mm}:{ss}</div>
    </div>
  )
}
