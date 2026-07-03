import { useLayoutEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import TapPulse from './TapPulse'
import s from './AppOnboarding.module.css'

// Sperrt die ganze Seite bis auf ein „Loch" über dem Ziel-Element.
// Vier Blocker-Rechtecke (oben/unten/links/rechts) fangen Pointer-Events ab;
// das Loch über dem Ziel lässt Klicks/Drags durch. Ohne Ziel: Vollsperre.
// lock=true (Default): Rest der Seite gesperrt, nur das Ziel-Loch durchlässig.
// lock=false: keine Sperre — nur Highlight (Rahmen + Puls). Für Zieh-/Bewegungs-
// schritte, die über mehrere Bereiche gehen (z.B. Pool → Zeitplan).
export default function CoachOverlay({ targetSelector, allowInteraction = true, lock = true }) {
  const [rect, setRect] = useState(null)

  const measure = useCallback(() => {
    if (!targetSelector) { setRect(null); return }
    const el = document.querySelector(`[data-onboarding="${targetSelector}"]`)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    const pad = 6
    setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
  }, [targetSelector])

  useLayoutEffect(() => {
    measure()
    const id = setInterval(measure, 250) // folgt Layout-Verschiebungen (Modal öffnet, Scroll)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { clearInterval(id); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [measure])

  // Kein Ziel gefunden → Vollsperre (defensive Schiene; Controller zeigt dann „Weiter"-Button)
  const hole = allowInteraction ? rect : null

  const blockers = !lock
    ? []                                                                                                 // kein Sperren — nur Highlight
    : hole
      ? [
          { top: 0, left: 0, right: 0, height: Math.max(0, hole.top) },                                 // oben
          { top: hole.top + hole.height, left: 0, right: 0, bottom: 0 },                                // unten
          { top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height },               // links
          { top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height },               // rechts
        ]
      : [{ top: 0, left: 0, right: 0, bottom: 0 }]                                                      // Vollsperre

  return createPortal(
    <div className={s.overlayRoot} aria-hidden>
      {blockers.map((st, i) => <div key={i} className={s.blocker} style={st} />)}
      {hole && <div className={s.hole} style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }} />}
      {hole && <TapPulse rect={hole} />}
    </div>,
    document.body,
  )
}
