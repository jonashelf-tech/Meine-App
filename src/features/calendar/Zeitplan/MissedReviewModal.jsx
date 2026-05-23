import { useState, useCallback } from 'react'
import s from './MissedReviewModal.module.css'

// ─── Icon ──────────────────────────────────────────────────
const CalendarIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

// ─── Helpers ───────────────────────────────────────────────
function formatSlotLabel(dateKey, slotKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const dayName = weekdays[date.getDay()]
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  const h = Math.floor(parseFloat(slotKey))
  const min = parseFloat(slotKey) % 1 !== 0 ? '30' : '00'
  return `${dayName} ${dd}.${mm} · ${String(h).padStart(2, '0')}:${min}`
}

// ─── MissedReviewModal ────────────────────────────────────
export default function MissedReviewModal({ items, onDone, onIgnore, onMoveToPool }) {
  const [selected, setSelected] = useState(new Set())

  const toggle = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const selectAll  = useCallback(() => setSelected(new Set(items.map(i => i.id))), [items])
  const selectNone = useCallback(() => setSelected(new Set()), [])

  const handleDone = useCallback(() => {
    if (selected.size === 0) return
    onDone(selected)
    setSelected(new Set())
  }, [selected, onDone])

  const handleIgnore = useCallback(() => {
    if (selected.size === 0) return
    onIgnore(selected)
    setSelected(new Set())
  }, [selected, onIgnore])

  if (!items.length) return null

  return (
    <div className={s.overlay}>
      <div className={s.modal}>

        {/* Header */}
        <div className={s.head}>
          <span className={s.icon}>{CalendarIcon}</span>
          <div>
            <p className={s.title}>Vergangene Ereignisse</p>
            <p className={s.subtitle}>
              {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'} nicht erledigt
            </p>
          </div>
        </div>

        {/* Liste */}
        <div className={s.list}>
          {items.map(item => (
            <div
              key={item.id}
              className={[s.item, selected.has(item.id) ? s.itemSelected : ''].join(' ')}
              onClick={() => toggle(item.id)}
              role="checkbox"
              aria-checked={selected.has(item.id)}
            >
              <span className={s.colorBar} style={{ background: item.color }} />
              <span className={[s.checkbox, selected.has(item.id) ? s.checkboxChecked : ''].join(' ')}>
                {selected.has(item.id) && <span className={s.checkmark}>✓</span>}
              </span>
              <div className={s.itemContent}>
                <span className={s.itemText}>{item.text}</span>
                <span className={s.itemMeta}>{formatSlotLabel(item.dateKey, item.slotKey)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Auswahl-Zeile */}
        <div className={s.selectRow}>
          <button className={s.selectBtn} onClick={selectAll}>Alle</button>
          <button className={s.selectBtn} onClick={selectNone}>Keine</button>
        </div>

        {/* Aktionen */}
        <div className={s.actions}>
          <button
            className={[s.btn, s.btnDone].join(' ')}
            onClick={handleDone}
            disabled={selected.size === 0}
          >
            ✓ Erledigt
          </button>
          <button
            className={[s.btn, s.btnIgnore].join(' ')}
            onClick={handleIgnore}
            disabled={selected.size === 0}
          >
            ✕ Ignorieren
          </button>
        </div>

        {/* Footer */}
        <button className={s.poolBtn} onClick={onMoveToPool}>
          → In Pool verschieben
        </button>

      </div>
    </div>
  )
}
