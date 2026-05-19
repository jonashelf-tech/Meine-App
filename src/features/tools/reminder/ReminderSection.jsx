import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, minutesToSk, parseHHMM, ALL_SLOT_KEYS, sk } from '../../../utils'
import { createBlock } from '../../todos/Block'
import {
  isDueToday, mergeWithCurated,
  loadReminderItems, saveReminderItems,
  loadDismissed, saveDismissed,
} from './reminderData'
import s from './ReminderSection.module.css'

export default function ReminderSection() {
  const { todos, setTodos, days, setDays } = useAppStore()
  const today     = todayKey()
  const todaySlots = days[today] ?? {}

  const [items,     setItems]     = useState(() => mergeWithCurated(loadReminderItems()))
  const [dismissed, setDismissed] = useState(() => loadDismissed())
  const [open,      setOpen]      = useState(true)

  const todayDismissed = dismissed[today] ?? []
  const dueItems = items.filter(item => isDueToday(item) && !todayDismissed.includes(item.id))

  const dismiss = useCallback((id) => {
    const next = { ...dismissed, [today]: [...todayDismissed, id] }
    setDismissed(next)
    saveDismissed(next)
  }, [dismissed, today, todayDismissed])

  const handleAdd = useCallback((item) => {
    // Mark lastAdded
    const nextItems = items.map(i => i.id === item.id ? { ...i, lastAdded: today } : i)
    setItems(nextItems)
    saveReminderItems(nextItems)

    if (item.actionType === 'slot') {
      // Find target slot key
      let slotKey
      if (item.time) {
        const mins = parseHHMM(item.time)
        slotKey = minutesToSk(mins)
      } else {
        slotKey = ALL_SLOT_KEYS.find(k => !todaySlots[k]) ?? sk(9)
      }
      // If target is taken, find next free
      if (todaySlots[slotKey]) {
        const free = ALL_SLOT_KEYS.find(k => !todaySlots[k])
        if (free) slotKey = free
      }
      setDays(prev => ({
        ...prev,
        [today]: {
          ...(prev[today] ?? {}),
          [slotKey]: { text: item.text, color: item.color, duration: 30, locked: false, done: false },
        },
      }))
    } else {
      // Add as todo
      const block = createBlock({
        text:     item.text,
        priority: 2,
        color:    item.color,
        category: 'Selfcare',
      })
      setTodos(prev => [...prev, block])
    }

    dismiss(item.id)
  }, [items, today, todaySlots, setDays, setTodos, dismiss])

  if (dueItems.length === 0) return null

  return (
    <div className={s.section}>
      <button className={s.header} onClick={() => setOpen(v => !v)}>
        <span className={s.label}>Selfcare</span>
        <span className={[s.badge, dueItems.length > 0 ? s.badgeBlink : ''].join(' ')}>
          {dueItems.length}
        </span>
        <span className={s.chevron}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className={s.items}>
          {dueItems.map(item => (
            <div key={item.id} className={s.item}>
              <span className={s.itemIcon}>{item.icon || '🔔'}</span>
              <div className={s.itemBody}>
                <span className={s.itemText}>{item.text}</span>
                {item.time && <span className={s.itemTime}>{item.time}</span>}
              </div>
              <button
                className={s.addBtn}
                style={{ '--c': item.color }}
                onClick={() => handleAdd(item)}
              >
                {item.actionType === 'slot' ? '+ Zeitplan' : '+ Todo'}
              </button>
              <button className={s.dismissBtn} onClick={() => dismiss(item.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
