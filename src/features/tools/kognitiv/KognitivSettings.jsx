import { useState } from 'react'
import { loadConfig, saveConfig } from './configStore'
import EinheitPicker from './EinheitPicker'
import s from './KognitivSettings.module.css'

const WEEKDAYS = [
  { iso: 1, label: 'Mo' }, { iso: 2, label: 'Di' }, { iso: 3, label: 'Mi' }, { iso: 4, label: 'Do' },
  { iso: 5, label: 'Fr' }, { iso: 6, label: 'Sa' }, { iso: 7, label: 'So' },
]

export default function KognitivSettings() {
  const [cfg, setCfg] = useState(() => loadConfig())
  const patch = p => setCfg(saveConfig(p))

  const reminders = cfg.reminders ?? { mode: 'flex', days: [1, 2, 3, 4, 5], time: '09:00' }
  const setReminders = r => patch({ reminders: { ...reminders, ...r } })
  const toggleDay = iso => {
    const days = reminders.days ?? []
    setReminders({ days: days.includes(iso) ? days.filter(x => x !== iso) : [...days, iso].sort((a, b) => a - b) })
  }
  const checkinOn = cfg.checkinOn !== false

  return (
    <div className={s.root}>
      <EinheitPicker selected={cfg.modules ?? []} onChange={modules => patch({ modules })} />

      <div className={s.secLabel}>Erinnerungen</div>
      <div className={s.seg}>
        <button className={[s.segBtn, reminders.mode === 'flex' ? s.segOn : ''].join(' ')} onClick={() => setReminders({ mode: 'flex' })}>Flexibel</button>
        <button className={[s.segBtn, reminders.mode === 'fixed' ? s.segOn : ''].join(' ')} onClick={() => setReminders({ mode: 'fixed' })}>Feste Tage</button>
      </div>
      {reminders.mode === 'fixed' && (
        <>
          <div className={s.wdays}>
            {WEEKDAYS.map(w => (
              <button key={w.iso} className={[s.wday, (reminders.days ?? []).includes(w.iso) ? s.wdayOn : ''].join(' ')} onClick={() => toggleDay(w.iso)}>{w.label}</button>
            ))}
          </div>
          <div className={s.timeRow}>
            <span className={s.timeLbl}>Uhrzeit</span>
            <input type="time" className={s.timeInput} value={reminders.time ?? '09:00'} onChange={e => setReminders({ time: e.target.value })} />
          </div>
        </>
      )}

      <div className={s.secLabel}>Check-in</div>
      <button className={s.toggleRow} onClick={() => patch({ checkinOn: !checkinOn })}>
        <span className={s.toggleTxt}>Check-in vor der Einheit</span>
        <span className={[s.switch, checkinOn ? s.switchOn : ''].join(' ')}><span className={s.knob} /></span>
      </button>
    </div>
  )
}
