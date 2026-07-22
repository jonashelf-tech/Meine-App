import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { lv, SK } from '../../storage'
import { computeImpuls, EMPTY_IMPULS } from './buddyImpuls'
import BuddyAvatar from './BuddyAvatar'
import BuddySheet from './BuddySheet'
import s from './BuddyFab.module.css'

// Der eine Einstieg (Konzept §7.2): kleiner Avatar-Button links unten,
// nur auf den Plan-Flächen (App.jsx mountet ihn auf Tab 0+1). Rein reaktiv —
// der Buddy klopft nie von selbst. Stufe 2 (Briefkasten-Prinzip): ein
// stiller Punkt zeigt, dass ein Gedanke bereitliegt — kein Text-Push.
export default function BuddyFab() {
  const enabled = useAppStore(st => st.buddySettings?.enabled)
  const buddyImpuls = useAppStore(st => st.buddyImpuls)
  const [open, setOpen] = useState(false)
  const ranRef = useRef(false)

  // Briefkasten-Berechnung: einmal pro Mount, alle Werte frisch über
  // getState() (kein Re-Render-Loop, buddyImpuls bewusst NICHT in den deps).
  // ranRef schützt vor dem StrictMode-Doppellauf im Dev-Modus.
  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const {
      buddySettings: bs, buddyImpuls: prevImpuls,
      todos, days, calList, klaerenSettings, setBuddyImpuls,
    } = useAppStore.getState()

    if (!bs?.enabled || bs?.gedanken !== true) {
      // Gedanken (gerade) aus — ein liegengebliebener Punkt verschwindet still.
      if (prevImpuls?.active) setBuddyImpuls(prev => ({ ...prev, active: null }))
      return
    }

    const next = computeImpuls(prevImpuls ?? EMPTY_IMPULS, {
      todos, days,
      calScopes: bs.calScopes,
      calList,
      klaerenThreshold: klaerenSettings?.threshold ?? 30,
      focusActive: lv(SK.timerRunning, false),
      now: new Date(),
    })
    setBuddyImpuls(next)
  }, [])

  if (!enabled) return null
  const active = buddyImpuls?.active ?? null

  return (
    <>
      <button
        className={s.fab}
        onClick={() => setOpen(true)}
        aria-label={active ? 'Buddy öffnen — ein Gedanke wartet' : 'Buddy öffnen'}
      >
        <span className={s.bob}><BuddyAvatar size={40} /></span>
        {active && <span className={s.dot} aria-hidden="true" />}
      </button>
      {open && <BuddySheet onClose={() => setOpen(false)} impuls={active} />}
    </>
  )
}
