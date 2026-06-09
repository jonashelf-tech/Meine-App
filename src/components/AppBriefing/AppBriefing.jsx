import { useState, useEffect, useRef } from 'react'
import { STEPS } from './briefingContent'
import s from './AppBriefing.module.css'

export default function AppBriefing({ onClose }) {
  const [step, setStep] = useState(0)
  const total = STEPS.length
  const cur = STEPS[step]
  const isLast = step === total - 1
  const Stage = cur.Stage
  const wrapRef = useRef(null)

  const next = () => (isLast ? onClose() : setStep(v => v + 1))
  const back = () => setStep(v => Math.max(0, v - 1))

  // Jeder Schritt startet oben — ein vorheriger Auto-Scroll (z.B. Pool-Sortierung)
  // darf nicht in den nächsten Schritt durchschlagen.
  useEffect(() => { if (wrapRef.current) wrapRef.current.scrollTop = 0 }, [step])

  return (
    <div className={s.overlay}>
      <div className={s.frame}>
        <div className={s.stageWrap} ref={wrapRef}>
          <Stage key={step} />
        </div>

        <div className={s.coach}>
          <div className={s.coachHead}>
            <span className={s.chapter}>{cur.chapter}</span>
            <span className={s.counter}>{step + 1} / {total}</span>
          </div>
          <div className={s.progress}>
            <div className={s.progressFill} style={{ width: `${((step + 1) / total) * 100}%` }} />
          </div>

          <h3 className={s.title}>{cur.title}</h3>
          <div className={s.text}>{cur.text}</div>

          <div className={s.footer}>
            <button className={s.skip} onClick={onClose}>Überspringen</button>
            <div className={s.navBtns}>
              {step > 0 && <button className={s.back} onClick={back}>Zurück</button>}
              <button className={s.next} onClick={next}>{isLast ? 'Fertig ✓' : 'Weiter →'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
