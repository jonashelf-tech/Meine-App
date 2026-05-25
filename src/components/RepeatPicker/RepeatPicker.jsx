import s from './RepeatPicker.module.css'

const OPTS = [
  { key: null,      label: 'Nie' },
  { key: 'daily',   label: 'Täglich' },
  { key: 'weekly',  label: 'Wöchentlich' },
  { key: 'monthly', label: 'Monatlich' },
  { key: 'custom',  label: 'Eigener' },
]

const UNITS = [
  { key: 'days',   label: 'Tage' },
  { key: 'weeks',  label: 'Wochen' },
  { key: 'months', label: 'Monate' },
]

const WEEKDAYS = [
  { dow: 1, label: 'Mo' },
  { dow: 2, label: 'Di' },
  { dow: 3, label: 'Mi' },
  { dow: 4, label: 'Do' },
  { dow: 5, label: 'Fr' },
  { dow: 6, label: 'Sa' },
  { dow: 0, label: 'So' },
]

export default function RepeatPicker({ value, onChange }) {
  const type  = value?.type ?? null
  const every = value?.every ?? 2
  const unit  = value?.unit  ?? 'weeks'
  const days  = value?.days  ?? []

  const handleType = (t) => {
    if (t === null)     { onChange(null); return }
    if (t === 'weekly') { onChange({ type: 'weekly', days }); return }
    if (t === 'custom') { onChange({ type: 'custom', every, unit }); return }
    onChange({ type: t })
  }

  const toggleDay = (dow) => {
    const next = days.includes(dow) ? days.filter(d => d !== dow) : [...days, dow]
    onChange({ type: 'weekly', days: next })
  }

  const handleEvery = (n) => onChange({ type: 'custom', every: Math.max(1, parseInt(n) || 1), unit })
  const handleUnit  = (u) => onChange({ type: 'custom', every, unit: u })

  return (
    <div className={s.wrap}>
      <div className={s.chips}>
        {OPTS.map(opt => (
          <button
            key={String(opt.key)}
            className={[s.chip, type === opt.key ? s.chipActive : ''].join(' ')}
            onClick={() => handleType(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {type === 'weekly' && (
        <div className={s.weekdays}>
          {WEEKDAYS.map(wd => (
            <button
              key={wd.dow}
              className={[s.dayBtn, days.includes(wd.dow) ? s.dayBtnActive : ''].join(' ')}
              onClick={() => toggleDay(wd.dow)}
            >
              {wd.label}
            </button>
          ))}
        </div>
      )}
      {type === 'custom' && (
        <div className={s.customRow}>
          <span className={s.customLabel}>Alle</span>
          <input
            type="number"
            min={1}
            max={999}
            className={s.customNum}
            value={every}
            onChange={e => handleEvery(e.target.value)}
          />
          <div className={s.unitChips}>
            {UNITS.map(u => (
              <button
                key={u.key}
                className={[s.chip, unit === u.key ? s.chipActive : ''].join(' ')}
                onClick={() => handleUnit(u.key)}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
