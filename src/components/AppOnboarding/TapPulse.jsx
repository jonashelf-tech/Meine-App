import s from './AppOnboarding.module.css'

// Pulsierender Tap-Indikator, mittig auf `rect` positioniert (top/left/width/height).
// Messen/Scrollen übernimmt CoachOverlay — TapPulse ist reines Rendering.
export default function TapPulse({ rect }) {
  if (!rect) return null
  const left = rect.left + rect.width / 2
  const top = rect.top + rect.height / 2
  return <span className={s.pulse} style={{ left, top, width: 18, height: 18, transform: 'translate(-50%, -50%)' }} />
}
