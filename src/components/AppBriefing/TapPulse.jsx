import { useEffect, useRef } from 'react'
import s from './AppBriefing.module.css'

// nächster scrollbarer Vorfahr (z.B. .stageWrap)
function scrollParent(el) {
  let n = el.parentElement
  while (n) {
    const oy = getComputedStyle(n).overflowY
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n
    n = n.parentElement
  }
  return null
}

// Pulsierender Tap-Indikator über einem Ziel-Element innerhalb von stageRef.
// getTarget() liefert das DOM-Element; die Position wird periodisch nachgemessen,
// damit der Puls dem Element folgt (auch wenn sich Layout ändert).
export default function TapPulse({ stageRef, getTarget }) {
  const ref = useRef(null)
  useEffect(() => {
    let alive = true
    const tick = () => {
      if (!alive) return
      const stage = stageRef.current
      const el = getTarget?.()
      const pulse = ref.current
      if (stage && el && pulse) {
        // Ziel ins Sichtfeld holen (z.B. Pool-Sortierung unten) — nur wenn es
        // außerhalb des scrollbaren Bereichs liegt; obere Ziele bleiben unberührt
        const cont = scrollParent(el)
        if (cont) {
          const cr = cont.getBoundingClientRect()
          const er = el.getBoundingClientRect()
          if (er.top < cr.top || er.bottom > cr.bottom) {
            el.scrollIntoView({ block: 'center', behavior: 'auto' })
          }
        }
        const sb = stage.getBoundingClientRect()
        const tb = el.getBoundingClientRect()
        pulse.style.left = `${tb.left - sb.left + tb.width / 2}px`
        pulse.style.top = `${tb.top - sb.top + tb.height / 2}px`
        pulse.style.opacity = '1'
      } else if (pulse) {
        pulse.style.opacity = '0'
      }
    }
    tick()
    const id = setInterval(tick, 400)
    return () => { alive = false; clearInterval(id) }
  }, [stageRef, getTarget])

  return <span className={s.tapPulse} ref={ref} style={{ opacity: 0 }} />
}
