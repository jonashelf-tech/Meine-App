import Overlay from '../../../components/Overlay/Overlay'
import s from './RepeatDeleteSheet.module.css'

export default function RepeatDeleteSheet({ onDeleteThis, onDeleteFuture, onClose }) {
  return (
    <Overlay variant="sheet" onClose={onClose}>
      <div className={s.sheet}>
        <p className={s.title}>Zeitfenster löschen</p>
        <button className={s.btn} onClick={onDeleteThis}>
          Nur diesen löschen
        </button>
        <button className={[s.btn, s.btnDelete].join(' ')} onClick={onDeleteFuture}>
          Diesen und alle zukünftigen löschen
        </button>
        <button className={s.cancel} onClick={onClose}>Abbrechen</button>
      </div>
    </Overlay>
  )
}
