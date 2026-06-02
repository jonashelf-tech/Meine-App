import { useState } from 'react'
import { sv, lv, SK } from '../../../storage'
import { MODULE_CONFIG, MODULE_ORDER } from './moduleConfig'
import s from './KognitivSettings.module.css'

const DAY_LABELS   = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mo … Sa … So

export default function KognitivSettings() {
  const [schedule, setSchedule] = useState(() => lv(SK.kognitivSchedule, {}))

  const update = (moduleId, patch) => {
    const current = schedule[moduleId] ?? { mode: 'free' }
    const next    = { ...schedule, [moduleId]: { ...current, ...patch } }
    setSchedule(next)
    sv(SK.kognitivSchedule, next)
  }

  return (
    <div className={s.root}>
      {MODULE_ORDER.map(id => {
        const m   = MODULE_CONFIG[id]
        const cfg = schedule[id] ?? { mode: 'free' }

        return (
          <div key={id} className={s.card}>
            <div className={s.cardTop}>
              <span className={s.name}>{m.name}</span>
              <div className={s.modeToggle}>
                <button
                  className={[s.modeBtn, cfg.mode === 'free' ? s.modeBtnOn : ''].join(' ')}
                  onClick={() => update(id, { mode: 'free' })}
                >
                  Frei
                </button>
                <button
                  className={[s.modeBtn, cfg.mode === 'reminder' ? s.modeBtnOn : ''].join(' ')}
                  onClick={() => update(id, { mode: 'reminder' })}
                >
                  Erinnerung
                </button>
                <button
                  className={[s.modeBtn, cfg.mode === 'scheduled' ? s.modeBtnOn : ''].join(' ')}
                  onClick={() => update(id, {
                    mode: 'scheduled',
                    time: cfg.time ?? '09:00',
                    days: cfg.days ?? [1, 2, 3, 4, 5],
                  })}
                >
                  Termin
                </button>
              </div>
            </div>

            {cfg.mode === 'scheduled' && (
              <div className={s.scheduleConfig}>
                <div className={s.timeRow}>
                  <span className={s.timeLabel}>Uhrzeit</span>
                  <input
                    type="time"
                    className={s.timeInput}
                    value={cfg.time ?? '09:00'}
                    onChange={e => update(id, { time: e.target.value })}
                  />
                </div>
                <div className={s.dayChips}>
                  {DISPLAY_ORDER.map(idx => {
                    const days = cfg.days ?? []
                    const on   = days.includes(idx)
                    return (
                      <button
                        key={idx}
                        className={[s.dayChip, on ? s.dayChipOn : ''].join(' ')}
                        onClick={() => {
                          const next = on
                            ? days.filter(d => d !== idx)
                            : [...days, idx].sort((a, b) => a - b)
                          update(id, { days: next })
                        }}
                      >
                        {DAY_LABELS[idx]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
