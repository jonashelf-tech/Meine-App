import { useState } from 'react'
import { useAppStore } from '../../store'
import BuddyAvatar from './BuddyAvatar'
import BuddySheet from './BuddySheet'
import s from './BuddyFab.module.css'

// Der eine Einstieg (Konzept §7.2): kleiner Avatar-Button links unten,
// nur auf den Plan-Flächen (App.jsx mountet ihn auf Tab 0+1). Rein reaktiv —
// der Buddy klopft nie von selbst.
export default function BuddyFab() {
  const enabled = useAppStore(st => st.buddySettings?.enabled)
  const [open, setOpen] = useState(false)

  if (!enabled) return null
  return (
    <>
      <button className={s.fab} onClick={() => setOpen(true)} aria-label="Buddy öffnen">
        <span className={s.bob}><BuddyAvatar size={40} /></span>
      </button>
      {open && <BuddySheet onClose={() => setOpen(false)} />}
    </>
  )
}
