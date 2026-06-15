import { useState } from 'react'
import s from './RhythmPicker.module.css'

const PRESETS = [
  { key: 'off', label: 'Aus', value: null },
  { key: '1/1', label: '1 / 1', value: { on: 1, off: 1 } },
  { key: '2/1', label: '2 / 1', value: { on: 2, off: 1 } },
  { key: '3/1', label: '3 / 1', value: { on: 3, off: 1 } },
]

const matchPreset = (v) => {
  if (!v) return 'off'
  const p = PRESETS.find(p => p.value && p.value.on === v.on && p.value.off === v.off)
  return p ? p.key : 'custom'
}

function Stepper({ label, value, onChange }) {
  return (
    <div className={s.stepper}>
      <span className={s.stepperLabel}>{label}</span>
      <div className={s.stepperCtrl}>
        <button type="button" className={s.stepBtn} onClick={() => onChange(Math.max(1, value - 1))} aria-label="weniger">−</button>
        <span className={s.stepVal}>{value}</span>
        <button type="button" className={s.stepBtn} onClick={() => onChange(value + 1)} aria-label="mehr">+</button>
      </div>
    </div>
  )
}

// Wiederverwendbare Rhythmus-Auswahl (Onboarding + Einstellungen).
// value: null (Aus) | { on, off }. onChange(null | { on, off }).
export default function RhythmPicker({ value, onChange }) {
  const [custom, setCustom] = useState(() => matchPreset(value) === 'custom')
  const selected = custom ? 'custom' : matchPreset(value)
  const cur = value ?? { on: 2, off: 1 }

  return (
    <div className={s.wrap}>
      <div className={s.segmented}>
        {PRESETS.map(p => (
          <button
            key={p.key}
            type="button"
            className={[s.segment, selected === p.key ? s.segmentActive : ''].join(' ')}
            onClick={() => { setCustom(false); onChange(p.value) }}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={[s.segment, selected === 'custom' ? s.segmentActive : ''].join(' ')}
          onClick={() => { setCustom(true); onChange({ on: cur.on, off: cur.off }) }}
        >
          Eigen
        </button>
      </div>
      {custom && (
        <div className={s.steppers}>
          <Stepper label="Training" value={cur.on} onChange={n => onChange({ on: n, off: cur.off })} />
          <Stepper label="Pause" value={cur.off} onChange={n => onChange({ on: cur.on, off: n })} />
        </div>
      )}
    </div>
  )
}
