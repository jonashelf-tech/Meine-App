import { useAutosave } from './useAutosave'
import s from './StepFreitext.module.css'

export default function StepFreitext({ date, initial, editable = true, onSave, onFertig, onSkip }) {
  const [text, onText] = useAutosave(initial ?? '', onSave, [date])
  const canFertig = text.trim().length > 0
  return (
    <div className={s.step}>
      <button className={s.skip} onClick={onSkip}>Überspringen</button>
      <div className={s.title}>Sonst noch was im Kopf?</div>
      <textarea className={s.field} value={text} onChange={e => onText(e.target.value)}
        placeholder="Ein Satz reicht." rows={5} disabled={!editable} autoFocus />
      <button className={s.cta} onClick={onFertig} disabled={!canFertig}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        Fertig
      </button>
    </div>
  )
}
