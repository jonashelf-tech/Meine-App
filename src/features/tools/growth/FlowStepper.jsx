// „Tiefe"-Übergang zwischen Flow-Schritten: beim Wechsel von stepKey rendert er
// kurz den alten Inhalt (.leaving) und den neuen (.entering) gleichzeitig, dann
// committet er. reduced-motion-sicher: das Aufräumen hängt an einem Timeout,
// nicht an animationend (Dauer wird global ≈ 0).
import { useState, useRef, useEffect } from 'react'
import s from './FlowStepper.module.css'

const DUR = 420 // muss zur CSS-Dauer passen

export default function FlowStepper({ stepKey, direction = 'forward', children }) {
  const [shown, setShown] = useState({ key: stepKey, node: children })
  const [leaving, setLeaving] = useState(null) // { key, node, direction }
  const timer = useRef(null)

  useEffect(() => {
    if (stepKey === shown.key) { setShown({ key: stepKey, node: children }); return }
    setLeaving({ ...shown, direction })
    setShown({ key: stepKey, node: children })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLeaving(null), DUR)
    return () => clearTimeout(timer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, children])

  return (
    <div className={s.stage}>
      {leaving && (
        <div key={leaving.key} className={[s.layer, s.leaving, leaving.direction === 'back' ? s.back : ''].join(' ')}>
          {leaving.node}
        </div>
      )}
      <div key={shown.key} className={[s.layer, s.entering, direction === 'back' ? s.back : ''].join(' ')}>
        {shown.node}
      </div>
    </div>
  )
}
