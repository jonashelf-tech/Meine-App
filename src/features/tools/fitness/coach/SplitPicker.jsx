import { splitVariants } from './planGenerator'
import s from './SplitPicker.module.css'

// Wiederverwendbare Split-Auswahl (Onboarding + Einstellungen).
export default function SplitPicker({ trainingDays, value, onChange }) {
  const variants = splitVariants(trainingDays)
  return (
    <div className={s.list}>
      {variants.map(v => (
        <button
          key={v.id}
          type="button"
          className={[s.card, value === v.id ? s.cardActive : ''].join(' ')}
          onClick={() => onChange(v.id)}
        >
          <span className={s.head}>
            <span className={s.name}>{v.name}</span>
            {v.recommended && <span className={s.badge}>Empfohlen</span>}
          </span>
          <span className={s.days}>{v.days.map(d => d.name).join(' · ')}</span>
        </button>
      ))}
    </div>
  )
}
