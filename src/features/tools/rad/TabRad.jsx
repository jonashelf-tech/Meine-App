import { useState, useRef, useCallback } from 'react'
import s from './TabRad.module.css'

const FILTERS = [
  { id: 'all',   label: 'Alle' },
  { id: 'prio1', label: 'Prio 1' },
  { id: 'prio23', label: 'Prio 2+3' },
]

export default function TabRad({ todos = [] }) {
  const [filter,   setFilter]   = useState('all')
  const [chosenId, setChosenId] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const listRef = useRef(null)

  const openTodos = todos.filter(t => !t.done)

  const filtered = openTodos.filter(t => {
    if (filter === 'prio1')  return t.priority === 1
    if (filter === 'prio23') return t.priority === 2 || t.priority === 3
    return true
  })

  const handleSpin = useCallback(() => {
    if (filtered.length === 0 || spinning) return
    setSpinning(true)
    setChosenId(null)

    const steps = 8 + Math.floor(Math.random() * 8)
    let i = 0

    const tick = () => {
      const idx = Math.floor(Math.random() * filtered.length)
      setChosenId(filtered[idx].id)
      i++
      if (i < steps) {
        setTimeout(tick, 60 + i * 20)
      } else {
        const finalIdx = Math.floor(Math.random() * filtered.length)
        const finalId  = filtered[finalIdx].id
        setChosenId(finalId)
        setSpinning(false)

        setTimeout(() => {
          const el = listRef.current?.querySelector(`[data-id="${finalId}"]`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }

    setTimeout(tick, 60)
  }, [filtered, spinning])

  return (
    <div className={s.container}>
      {/* Filter */}
      <div className={s.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={[s.filterBtn, filter === f.id ? s.filterBtnActive : ''].join(' ')}
            onClick={() => { setFilter(f.id); setChosenId(null) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Spin */}
      <div className={s.spinWrap}>
        <button
          className={s.spinBtn}
          onClick={handleSpin}
          disabled={filtered.length === 0 || spinning}
        >
          ▶ SPIN
        </button>
      </div>

      {/* List */}
      <div className={s.list} ref={listRef}>
        {filtered.length === 0 ? (
          <p className={s.empty}>Keine offenen Todos</p>
        ) : (
          filtered.map(t => (
            <div
              key={t.id}
              data-id={t.id}
              className={[s.item, chosenId === t.id ? s.itemChosen : ''].join(' ')}
            >
              <span
                className={s.stripe}
                style={{ background: t.color || '#00CFFF' }}
              />
              <span className={s.itemText}>{t.text}</span>
              {t.priority && (
                <span className={s.prioBadge}>P{t.priority}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
