import { useState } from 'react'
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset'
import s from './EditModal.module.css'

const NEON = [
  '#00CFFF', '#FF2D78', '#A855F7', '#00FF88',
  '#FFB800', '#FF6B35', '#00E5FF', '#FF69B4',
  '#39FF14', '#BF5FFF',
]

const PRIORITIES = [
  { value: 1, label: '! Wichtig' },
  { value: 2, label: '· Sollte' },
  { value: 3, label: 'Kann' },
]

const DURATIONS = [15, 30, 45, 60, 90, 120]

export default function EditModal({ todo, onSave, onDelete, onClose }) {
  const keyboardOffset = useKeyboardOffset()
  const [text,     setText]     = useState(todo.text     ?? '')
  const [priority, setPriority] = useState(todo.priority ?? 3)
  const [color,    setColor]    = useState(todo.color    ?? '#00CFFF')
  const [duration, setDuration] = useState(todo.duration ?? 30)
  const [category, setCategory] = useState(todo.category ?? '')
  const [date,     setDate]     = useState(todo.date     ?? '')
  const [time,     setTime]     = useState(todo.time     ?? '')
  const [subItems, setSubItems] = useState(
    (todo.subItems ?? []).map(si => ({ ...si }))
  )

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleSave = () => {
    if (!text.trim()) return
    onSave({
      ...todo,
      text:     text.trim(),
      priority,
      color,
      duration,
      category: category.trim() || null,
      date:     date   || null,
      time:     time   || null,
      subItems: subItems.filter(si => si.text.trim()),
    })
  }

  const handleSubChange = (idx, val) => {
    setSubItems(prev => prev.map((si, i) => i === idx ? { ...si, text: val } : si))
  }

  const handleSubRemove = (idx) => {
    setSubItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubAdd = () => {
    setSubItems(prev => [...prev, { text: '', done: false }])
  }

  return (
    <div
      className={s.overlay}
      style={keyboardOffset > 0 ? { alignItems: 'flex-start', paddingTop: 16, paddingBottom: keyboardOffset } : {}}
      onClick={handleOverlayClick}
    >
      <div className={s.modal}>
        {/* Header */}
        <div className={s.header}>
          <span className={s.title}>Bearbeiten</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {/* Text */}
        <div className={s.field}>
          <span className={s.label}>Text</span>
          <textarea
            className={s.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Was ist zu tun?"
          />
        </div>

        {/* Priorität */}
        <div className={s.field}>
          <span className={s.label}>Priorität</span>
          <div className={s.segmentControl}>
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                className={[s.segBtn, priority === p.value ? s.segBtnActive : ''].join(' ')}
                onClick={() => setPriority(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Farbe */}
        <div className={s.field}>
          <span className={s.label}>Farbe</span>
          <div className={s.colorRow}>
            {NEON.map(c => (
              <button
                key={c}
                className={[s.colorCircle, color === c ? s.colorCircleActive : ''].join(' ')}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        {/* Dauer */}
        <div className={s.field}>
          <span className={s.label}>Dauer (Minuten)</span>
          <select
            className={s.select}
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map(d => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
        </div>

        {/* Kategorie */}
        <div className={s.field}>
          <span className={s.label}>Kategorie</span>
          <input
            className={s.input}
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="z.B. Arbeit, Privat …"
          />
        </div>

        {/* Fälligkeit */}
        <div className={s.field}>
          <span className={s.label}>Fälligkeit</span>
          <input
            className={s.input}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Uhrzeit */}
        <div className={s.field}>
          <span className={s.label}>Uhrzeit (→ Termin)</span>
          <input
            className={s.input}
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
        </div>

        {/* Sub-Items */}
        <div className={s.field}>
          <span className={s.label}>Unter-Aufgaben</span>
          <ul className={s.subList}>
            {subItems.map((si, idx) => (
              <li key={idx} className={s.subItem}>
                <input
                  className={s.subInput}
                  type="text"
                  value={si.text}
                  onChange={e => handleSubChange(idx, e.target.value)}
                  placeholder="Schritt …"
                />
                <button
                  className={s.subRemoveBtn}
                  onClick={() => handleSubRemove(idx)}
                  aria-label="Entfernen"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button className={s.addSubBtn} onClick={handleSubAdd}>
            + Schritt hinzufügen
          </button>
        </div>

        {/* Actions */}
        <div className={s.actions}>
          <button className={s.saveBtn} onClick={handleSave}>
            Speichern
          </button>
          <button className={s.deleteBtn} onClick={() => onDelete(todo.id)}>
            Löschen
          </button>
        </div>
      </div>
    </div>
  )
}
