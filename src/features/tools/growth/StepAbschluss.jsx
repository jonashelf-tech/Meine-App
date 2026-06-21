// Belohnungsmoment: Haken-Pop + Ring-Puls, danach onDone (→ Übersicht).
// Timing über Timeout (reduced-motion-sicher: feuert unabhängig von Animationen).
import { useEffect, useRef } from 'react'
import s from './StepAbschluss.module.css'

export default function StepAbschluss({ onDone }) {
  const done = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => { if (!done.current) { done.current = true; onDone() } }, 1100)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={s.step}>
      <div className={s.badge}>
        <div className={s.ring} />
        <div className={s.check}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
      </div>
      <div className={s.text}>Du warst heute da.</div>
    </div>
  )
}
