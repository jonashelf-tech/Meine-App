import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import s from './ClockPopup.module.css'

export default function ClockPopup({ slotText, onDone, onSnooze, onShift, onDismiss, onToPool, isMissed }) {
  const keyboardOffset = useKeyboardOffset()
  return (
    <div
      className={s.overlay}
      style={keyboardOffset > 0 ? { alignItems: 'flex-start', paddingTop: 16, paddingBottom: keyboardOffset } : {}}
      onClick={onDismiss}
    >
      <div className={s.popup} onClick={e => e.stopPropagation()}>

        <div className={s.head}>
          <span className={s.icon}>{isMissed ? '📋' : '⏰'}</span>
          <p className={s.label}>{isMissed ? 'Nicht erledigt' : 'Zeit ist um'}</p>
        </div>

        <p className={s.task}>"{slotText}"</p>

        <div className={s.actions}>
          <button className={[s.btn, s.btnDone].join(' ')} onClick={onDone}>
            ✓ Erledigt
          </button>
          {isMissed ? (
            <button className={s.btn} onClick={onToPool}>
              ↩ In Pool übernehmen
            </button>
          ) : (
            <>
              <button className={s.btn} onClick={onSnooze}>
                ⏱ Noch 15 min
              </button>
              <button className={s.btn} onClick={onShift}>
                ⬇ Alles 30 min
              </button>
            </>
          )}
        </div>

        <button className={s.dismiss} onClick={onDismiss}>
          {isMissed ? 'Später' : 'Ignorieren'}
        </button>

      </div>
    </div>
  )
}
