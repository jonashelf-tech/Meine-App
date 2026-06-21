// src/features/tools/projekte/ProjektQuickAdd.jsx
import { useState } from 'react'
import { createBlock } from '../../todos/Block'
import { todayKey } from '../../../utils'
import s from './ProjektQuickAdd.module.css'

const PlusIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

export default function ProjektQuickAdd({ catName, onAdd }) {
  const [text,         setText]         = useState('')
  const [showDate,     setShowDate]     = useState(false)
  const [showFromDate, setShowFromDate] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(createBlock({
      text:         trimmed,
      category:     catName,
      showFromDate: showDate && showFromDate ? showFromDate : null,
    }))
    setText('')
    setShowFromDate('')
    setShowDate(false)
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.row}>
        <input
          className={s.input}
          placeholder="Todo hinzufügen…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button type="submit" className={s.addBtn} aria-label="Hinzufügen">
          <PlusIcon />
        </button>
      </div>

      <button
        type="button"
        className={[s.dateToggle, showDate ? s.dateToggleActive : ''].join(' ')}
        onClick={() => setShowDate(v => !v)}
      >
        {showDate ? 'Datum entfernen' : 'Erst ab Datum anzeigen'}
      </button>

      {showDate && (
        <input
          type="date"
          className={s.dateInput}
          value={showFromDate}
          min={todayKey()}
          onChange={e => setShowFromDate(e.target.value)}
        />
      )}
    </form>
  )
}
