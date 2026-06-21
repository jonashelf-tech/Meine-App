// Schritt 1 des Flows: Ankommen + Check-in verschmolzen.
// Atemkreis nur wenn settings.openerAn (Toggle entfernt nur die Atem-Ebene,
// nicht den Check-in). Der 2-Min-Ring ist ambient — kein Auto-Weiter.
import BreathingCircle from './BreathingCircle'
import DailyStateRow from './DailyStateRow'
import s from './StepAnkommen.module.css'

export default function StepAnkommen({ date, settings, opener, onStateTouched, onWeiter, onSkip }) {
  return (
    <div className={s.step}>
      <button className={s.skip} onClick={onSkip}>Überspringen</button>
      <div className={s.top}>
        {settings.openerAn && <BreathingCircle aktiv dauerSek={120} />}
        <div className={s.eyebrow}>Ankommen</div>
        {settings.openerAn && opener?.anleitung && <div className={s.opener}>{opener.anleitung}</div>}
      </div>
      <div className={s.checkTitle}>Wie geht's dir gerade?</div>
      <DailyStateRow date={date} editable onTouched={onStateTouched} />
      <button className={s.cta} onClick={onWeiter}>Weiter</button>
    </div>
  )
}
