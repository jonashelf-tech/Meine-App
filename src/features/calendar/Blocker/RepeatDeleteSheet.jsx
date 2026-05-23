import s from './RepeatDeleteSheet.module.css'

export default function RepeatDeleteSheet({ onDeleteThis, onDeleteFuture, onClose }) {
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <p className={s.title}>Zeitfenster löschen</p>
        <button className={s.btn} onClick={onDeleteThis}>
          Nur diesen löschen
        </button>
        <button className={[s.btn, s.btnDelete].join(' ')} onClick={onDeleteFuture}>
          Diesen und alle zukünftigen löschen
        </button>
        <button className={s.cancel} onClick={onClose}>Abbrechen</button>
      </div>
    </div>
  )
}
