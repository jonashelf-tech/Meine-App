import s from './StepBonusFrage.module.css'

export default function StepBonusFrage({ canDraw, onJa, onNein }) {
  return (
    <div className={s.step}>
      <div className={s.title}>Magst du noch eine Karte ziehen?</div>
      <div className={s.actions}>
        <button className={s.ja} onClick={onJa} disabled={!canDraw}>Ja, eine</button>
        <button className={s.nein} onClick={onNein}>Nein, weiter</button>
      </div>
      {!canDraw && <div className={s.hint}>Für heute genug Karten gezogen.</div>}
    </div>
  )
}
