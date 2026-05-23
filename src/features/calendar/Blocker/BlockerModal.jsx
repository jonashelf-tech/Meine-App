import { useState } from 'react'
import { createBlocker, formatHour } from './blockerUtils'
import { NEON } from '../../../utils'
import s from './BlockerModal.module.css'

const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 0.5)

const BLOCKER_COLORS = [
  '#3b82f6', '#8B5CF6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  ...NEON.slice(0, 4),
]

const REPEAT_OPTS = [
  { key: null,       label: 'Nie' },
  { key: 'daily',    label: 'Täglich' },
  { key: 'workdays', label: 'Werktags' },
  { key: 'weekly',   label: 'Wöchentlich' },
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

export default function BlockerModal({ blocker = null, date, onSave, onDelete, onClose }) {
  const isNew = !blocker

  const [text,       setText]       = useState(blocker?.text      ?? '')
  const [startHour,  setStartHour]  = useState(blocker?.startHour ?? 9)
  const [endHour,    setEndHour]    = useState(blocker?.endHour   ?? 17)
  const [color,      setColor]      = useState(blocker?.color     ?? '#3b82f6')
  const [locked,     setLocked]     = useState(blocker?.locked    ?? false)
  const [repeatType, setRepeatType] = useState(blocker?.repeat?.type ?? null)
  const [repeatDays, setRepeatDays] = useState(blocker?.repeat?.days ?? [])

  const toggleDay = (dow) => {
    setRepeatDays(prev =>
      prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]
    )
  }

  const handleSave = () => {
    if (!text.trim()) return
    const repeat = repeatType
      ? { type: repeatType, days: repeatType === 'weekly' ? repeatDays : [] }
      : null
    const data = isNew
      ? createBlocker({ text: text.trim(), startHour, endHour, color, locked, date, repeat })
      : { ...blocker, text: text.trim(), startHour, endHour, color, locked, repeat }
    onSave(data)
    onClose()
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>

        {/* Titel + Farb-Dot */}
        <div className={s.titleRow}>
          <div className={s.colorDot} style={{ background: color }} />
          <input
            className={s.titleInput}
            type="text"
            placeholder="Name des Zeitfensters…"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
            maxLength={40}
          />
        </div>

        {/* Zeitraum */}
        <div className={s.row}>
          <span className={s.rowLabel}>Zeitraum</span>
          <div className={s.timeRow}>
            <select
              className={s.timeSelect}
              value={startHour}
              onChange={e => setStartHour(Number(e.target.value))}
            >
              {HOUR_OPTIONS.filter(h => h < endHour).map(h => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
            <span className={s.timeSep}>→</span>
            <select
              className={s.timeSelect}
              value={endHour}
              onChange={e => setEndHour(Number(e.target.value))}
            >
              {HOUR_OPTIONS.filter(h => h > startHour).map(h => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Modus */}
        <div className={s.row}>
          <span className={s.rowLabel}>Modus</span>
          <div className={s.modeRow}>
            <button
              className={[s.modeBtn, s.modeBtnOpen, !locked ? s.modeActive : ''].join(' ')}
              onClick={() => setLocked(false)}
            >
              Offen
            </button>
            <button
              className={[s.modeBtn, s.modeBtnLocked, locked ? s.modeActive : ''].join(' ')}
              onClick={() => setLocked(true)}
            >
              Geblockt
            </button>
          </div>
        </div>

        {/* Farbe */}
        <div className={s.row}>
          <span className={s.rowLabel}>Farbe</span>
          <div className={s.colorGrid}>
            {BLOCKER_COLORS.map(c => (
              <button
                key={c}
                className={[s.colorCircle, color === c ? s.colorCircleActive : ''].join(' ')}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Wiederholung */}
        <div className={s.row}>
          <span className={s.rowLabel}>Wiederholung</span>
          <div className={s.chips}>
            {REPEAT_OPTS.map(opt => (
              <button
                key={String(opt.key)}
                className={[s.chip, repeatType === opt.key ? s.chipActive : ''].join(' ')}
                onClick={() => setRepeatType(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {repeatType === 'weekly' && (
            <div className={s.weekdays}>
              {WEEKDAYS.map(wd => (
                <button
                  key={wd.dow}
                  className={[s.dayBtn, repeatDays.includes(wd.dow) ? s.dayBtnActive : ''].join(' ')}
                  onClick={() => toggleDay(wd.dow)}
                >
                  {wd.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aktionen */}
        <div className={s.actions}>
          <button className={s.saveBtn} onClick={handleSave} disabled={!text.trim()}>
            {isNew ? 'Zeitfenster erstellen' : 'Speichern'}
          </button>
          {!isNew && (
            <button className={s.deleteBtn} onClick={() => onDelete(blocker)}>
              Zeitfenster löschen
            </button>
          )}
          <button className={s.cancelBtn} onClick={onClose}>Abbrechen</button>
        </div>

      </div>
    </div>
  )
}
