import s from './ClockPopup.module.css'

export default function ClockPopup({ slotText, onDone, onSnooze, onShift, onDismiss }) {
  return (
    <div className={s.overlay} onClick={onDismiss}>
      <div className={s.popup} onClick={e => e.stopPropagation()}>

        <div className={s.head}>
          <span className={s.icon}>⏰</span>
          <p className={s.label}>Zeit ist um</p>
        </div>

        <p className={s.task}>"{slotText}"</p>

        <div className={s.actions}>
          <button className={[s.btn, s.btnDone].join(' ')} onClick={onDone}>
            ✓ Erledigt
          </button>
          <button className={s.btn} onClick={onSnooze}>
            ⏱ Noch 15 min
          </button>
          <button className={s.btn} onClick={onShift}>
            ⬇ Alles 30 min
          </button>
        </div>

        <button className={s.dismiss} onClick={onDismiss}>
          Ignorieren
        </button>

      </div>
    </div>
  )
}
