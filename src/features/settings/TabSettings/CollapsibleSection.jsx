import { useState } from 'react'
import s from './TabSettings.module.css'

// Aufklappbare Einstellungs-Gruppe: Titel als Kopfzeile (tippen klappt auf/zu),
// Inhalt nur wenn offen. Hält die Einstellungen übersichtlich — man sieht erst
// die Gruppen-Köpfe und tippt rein, was man gerade braucht.
export default function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={s.card}>
      <button
        type="button"
        className={s.groupHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={s.cardTitle}>{title}</span>
        <svg
          className={[s.chevron, open ? s.chevronOpen : ''].join(' ')}
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className={s.groupBody}>{children}</div>}
    </section>
  )
}
