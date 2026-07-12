import { useState, useRef, useEffect } from 'react'
import { createBlocker, formatHour } from './blockerUtils'
import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import RepeatPicker from '../../../components/RepeatPicker/RepeatPicker'
import Overlay from '../../../components/Overlay/Overlay'
import s from './BlockerModal.module.css'

const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 0.5)

function TimeSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const active = listRef.current?.querySelector('[data-active]')
    active?.scrollIntoView({ block: 'nearest' })
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={wrapRef} className={s.dropdown}>
      <button
        type="button"
        className={s.dropTrigger}
        onClick={() => setOpen(o => !o)}
      >
        {formatHour(value)}
        <span className={s.dropArrow}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div ref={listRef} className={s.dropList}>
          {options.map(h => (
            <button
              key={h}
              type="button"
              className={[s.dropItem, h === value ? s.dropItemActive : ''].join(' ')}
              {...(h === value ? { 'data-active': '' } : {})}
              onClick={() => { onChange(h); setOpen(false) }}
            >
              {formatHour(h)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Ergänzt um die NEON-Farben, die oben noch nicht vorkommen (keine Dopplungen)
const BLOCKER_COLORS = [
  '#3b82f6', '#8B5CF6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  '#14B8A6', '#EAB308', '#D946EF', '#6366F1',
]

const initRepeat = (r) => {
  if (!r) return null
  if (r.type === 'workdays') return { type: 'daily' } // backwards compat
  if (r.type === 'weekly')   return { type: 'weekly', days: r.days ?? [] }
  if (r.type === 'custom')   return { type: 'custom', every: r.every ?? 2, unit: r.unit ?? 'weeks' }
  return { type: r.type }
}

export default function BlockerModal({ blocker = null, date, onSave, onDelete, onClose }) {
  const keyboardOffset = useKeyboardOffset()
  const isNew = !blocker

  const [text,       setText]      = useState(blocker?.text      ?? '')
  const [startHour,  setStartHour] = useState(blocker?.startHour ?? 9)
  const [endHour,    setEndHour]   = useState(blocker?.endHour   ?? 17)
  const [color,      setColor]     = useState(blocker?.color     ?? '#3b82f6')
  const [locked,     setLocked]    = useState(blocker?.locked    ?? false)
  const [repeat, setRepeat] = useState(() => initRepeat(blocker?.repeat))

  const handleSave = () => {
    if (!text.trim()) return
    const repeatOut = repeat ? { ...repeat } : null
    const data = isNew
      ? createBlocker({ text: text.trim(), startHour, endHour, color, locked, date, repeat: repeatOut })
      : { ...blocker, text: text.trim(), startHour, endHour, color, locked, repeat: repeatOut }
    onSave(data)
    onClose()
  }

  return (
    <Overlay
      variant="sheet"
      onClose={onClose}
      style={keyboardOffset > 0 ? { paddingBottom: keyboardOffset } : undefined}
    >
      <div className={s.modal}>

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
            <TimeSelect
              value={startHour}
              options={HOUR_OPTIONS}
              onChange={setStartHour}
            />
            <span className={s.timeSep}>→</span>
            <TimeSelect
              value={endHour}
              options={HOUR_OPTIONS}
              onChange={setEndHour}
            />
            {endHour <= startHour && (
              <span className={s.overnightBadge}>+1 Tag</span>
            )}
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
          <RepeatPicker value={repeat} onChange={setRepeat} />
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
    </Overlay>
  )
}
