import { useState, useRef, useEffect, useMemo } from 'react'
import { IconChevron } from './icons'
import s from './AddPicker.module.css'

// Eigenes Dropdown statt <select> — native Option-Listen sind im Darkmode weiß
// und nicht stylebar. Trigger-Button + eigenes Popup mit Suche.
export default function AddPicker({ placeholder, options, onPick }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ('') } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return n ? options.filter(o => o.label.toLowerCase().includes(n)) : options
  }, [options, q])

  const pick = (id) => { onPick(id); setOpen(false); setQ('') }

  return (
    <div className={s.wrap} ref={ref}>
      <button type="button" className={s.trigger} onClick={() => setOpen(o => !o)}>
        <span className={s.triggerText}>{placeholder}</span>
        <span className={`${s.chev} ${open ? s.chevOpen : ''}`}><IconChevron size={14} /></span>
      </button>
      {open && (
        <div className={s.popup}>
          <input className={s.search} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Suchen…" autoFocus />
          <div className={s.list}>
            {filtered.length === 0 ? (
              <div className={s.empty}>Nichts gefunden.</div>
            ) : filtered.map(o => (
              <button type="button" key={o.id} className={s.option} onClick={() => pick(o.id)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
