import { useEffect, useState } from 'react'
import { MODULE_CONFIG } from '../moduleConfig'
import s from './ExerciseShell.module.css'

// Gemeinsame Chrome für alle Kognitiv-Übungen:
// immersive Bühne + dünne Fortschrittsleiste in Modulfarbe + dezenter Abbrechen-Button.
// progress/total → trial-basiert · durationMs → zeitbasiert (per JS, da CSS-Modules
// @keyframes scopen und ein Inline-Animationsname nicht greifen würde).
// hideProgress → kein Balken (z. B. Übungen ohne sinnvollen Fortschritt).
// onTap liegt auf der Bühne (Spiele, die "irgendwo tippen").
export default function ExerciseShell({ moduleId, progress = 0, total = 1, durationMs, hideProgress = false, onAbort, onTap, children }) {
  const accent = MODULE_CONFIG[moduleId]?.color ?? 'var(--primary)'
  const timeBased = durationMs != null
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!timeBased) return
    const start = Date.now()
    const id = setInterval(() => {
      const e = Date.now() - start
      setElapsed(e)
      if (e >= durationMs) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [timeBased, durationMs])

  const pct = timeBased
    ? Math.min(100, (elapsed / durationMs) * 100)
    : (total > 0 ? Math.min(100, Math.max(0, (progress / total) * 100)) : 0)

  return (
    <div className={s.root} style={{ '--accent': accent }} onClick={onTap}>
      <header className={s.bar}>
        {hideProgress
          ? <div className={s.spacer} />
          : (
            <div className={s.track}>
              <div className={s.fill} style={{ width: `${pct}%` }} />
            </div>
          )}
        <button className={s.abort} onClick={e => { e.stopPropagation(); onAbort() }} aria-label="Übung abbrechen">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className={s.body}>{children}</div>
    </div>
  )
}
