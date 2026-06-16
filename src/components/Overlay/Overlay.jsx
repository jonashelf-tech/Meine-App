import { useEffect } from 'react'
import s from './Overlay.module.css'

export default function Overlay({ variant = 'center', onClose, style, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const close = e => { if (e.target === e.currentTarget) onClose?.() }
  const isSheet = variant === 'sheet'

  return (
    <div
      className={`${s.backdrop} ${isSheet ? s.sheet : s.center}`}
      style={style}
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div className={`${s.panel} ${isSheet ? s.panelSheet : s.panelCenter}`} onClick={close}>
        {children}
      </div>
    </div>
  )
}
