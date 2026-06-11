import { useState } from 'react'
import { offDeviceBackupAgeDays, downloadFullBackup } from '../../storage'
import s from './BackupNudge.module.css'

const STALE_DAYS = 7

// Dezenter Hinweis auf dem Tagesplaner, wenn die letzte echte (heruntergeladene)
// Sicherung zu lange her ist. Off-Device-Backup überlebt eine Browser-Löschung.
export default function BackupNudge() {
  const [dismissed, setDismissed] = useState(false)
  const [done, setDone] = useState(false)
  const age = offDeviceBackupAgeDays()

  if (dismissed || done || age < STALE_DAYS) return null

  const label = age === Infinity
    ? 'Noch nie gesichert'
    : `Sicherung vor ${Math.floor(age)} Tagen`

  const handleBackup = () => {
    downloadFullBackup()
    setDone(true)
  }

  return (
    <div className={s.bar}>
      <div className={s.left}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><polyline points="21 3 21 8 16 8"/>
        </svg>
        <span className={s.text}>{label}</span>
      </div>
      <div className={s.actions}>
        <button className={s.save} onClick={handleBackup}>Jetzt sichern</button>
        <button className={s.close} onClick={() => setDismissed(true)} aria-label="Ausblenden">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
