// ~60 Sekunden ankommen, bevor die Karte kommt. Überspringen ist IMMER sichtbar.
// Variante "atmen": animierter Kreis (4s ein / 6s aus, 5 Zyklen, auto-fertig).
// Übrige Varianten: Anleitung + „Fertig"-Tap, kein Zwangstimer (minimale Friction).
import { useState, useEffect } from 'react'
import s from './GrowthOpener.module.css'

export default function GrowthOpener({ opener, onDone }) {
  const zyklen = opener.zyklen ?? 0
  const [zyklus, setZyklus] = useState(1)

  // Atmen: 10s pro Zyklus (4 ein + 6 aus), danach automatisch fertig
  useEffect(() => {
    if (opener.id !== 'atmen') return
    if (zyklus > zyklen) { onDone(); return }
    const t = setTimeout(() => setZyklus(z => z + 1), 10000)
    return () => clearTimeout(t)
  }, [opener.id, zyklus, zyklen, onDone])

  return (
    <div className={s.card}>
      <div className={s.head}>
        <span className={s.eyebrow}>Ankommen · {opener.titel}</span>
        <button className={s.skip} onClick={onDone}>Überspringen</button>
      </div>

      <div className={s.anleitung}>{opener.anleitung}</div>

      {opener.id === 'atmen' ? (
        <div className={s.atmenWrap}>
          <div key={zyklus} className={s.atmenKreis} />
          <span className={s.zyklus}>{Math.min(zyklus, zyklen)} / {zyklen}</span>
        </div>
      ) : (
        <button className={s.fertig} onClick={onDone}>Fertig</button>
      )}
    </div>
  )
}
