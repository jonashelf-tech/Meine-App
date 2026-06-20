import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import Overlay from '../Overlay/Overlay'
import { lv, sv, SK } from '../../storage'
import { todayKey } from '../../utils'
import s from './UpdatePrompt.module.css'

// Mindestabstand zwischen zwei Update-Checks (verhindert, dass jeder Tap
// einen Netzwerk-Request auslöst).
const CHECK_THROTTLE_MS = 30_000

export default function UpdatePrompt() {
  const regRef = useRef(null)
  const lastCheck = useRef(0)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      regRef.current = reg
    },
  })

  // Bei jeder Nutzer-Aktion (Tap/Klick) und beim Zurückkommen in die App
  // prüfen, ob eine neue Version live ist – gedrosselt auf CHECK_THROTTLE_MS.
  useEffect(() => {
    const check = () => {
      const reg = regRef.current
      if (!reg) return
      const now = Date.now()
      if (now - lastCheck.current < CHECK_THROTTLE_MS) return
      lastCheck.current = now
      reg.update()
    }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }

    document.addEventListener('pointerdown', check)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('pointerdown', check)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!needRefresh || lv(SK.updateSnoozed, null) === todayKey()) return null

  return (
    <Overlay variant="sheet">
      <div className={s.modal}>
        <div className={s.header}>
          <div className={s.title}>Neue Version verfügbar</div>
          <div className={s.sub}>Eine aktualisierte Version der App ist bereit.</div>
        </div>
        <div className={s.actions}>
          <button className={s.laterBtn} onClick={() => { sv(SK.updateSnoozed, todayKey()); setNeedRefresh(false) }}>
            Später
          </button>
          <button className={s.updateBtn} onClick={() => updateServiceWorker(true)}>
            Jetzt aktualisieren
          </button>
        </div>
      </div>
    </Overlay>
  )
}
