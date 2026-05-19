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

  const addItem = useCallback((item, currentSlots) => {
    if (item.actionType === 'slot') {
      let slotKey
      if (item.time) {
        const mins = parseHHMM(item.time)
        slotKey = minutesToSk(mins)
      } else {
        slotKey = ALL_SLOT_KEYS.find(k => !currentSlots[k]) ?? sk(9)
      }
      if (currentSlots[slotKey]) {
        const free = ALL_SLOT_KEYS.find(k => !currentSlots[k])
        if (free) slotKey = free
      }
      return { type: 'slot', slotKey, data: { text: item.text, color: item.color, duration: 30, locked: false, done: false } }
    } else {
      return { type: 'todo', block: createBlock({ text: item.text, priority: 2, color: item.color, category: 'Selfcare' }) }
    }
  }, [])

  const handleAddAll = useCallback(() => {
    // Mark all as lastAdded
    const nextItems = items.map(i =>
      dueItems.some(d => d.id === i.id) ? { ...i, lastAdded: today } : i
    )
    setItems(nextItems)
    saveReminderItems(nextItems)

    // Collect slot updates and todos
    let slotsAccum = { ...todaySlots }
    const newTodos = []

    dueItems.forEach(item => {
      const result = addItem(item, slotsAccum)
      if (result.type === 'slot') {
        slotsAccum = { ...slotsAccum, [result.slotKey]: result.data }
      } else {
        newTodos.push(result.block)
      }
    })

    if (Object.keys(slotsAccum).length > Object.keys(todaySlots).length) {
      setDays(prev => ({ ...prev, [today]: slotsAccum }))
    }
    if (newTodos.length > 0) {
      setTodos(prev => [...prev, ...newTodos])
    }

    // Dismiss all
    const next = { ...dismissed, [today]: [...todayDismissed, ...dueItems.map(i => i.id)] }
    setDismissed(next)
    saveDismissed(next)
  }, [items, dueItems, today, todaySlots, dismissed, todayDismissed, addItem, setDays, setTodos])

  if (dueItems.length === 0) return null

  return (
    <div className={s.section}>
      <button className={s.header} onClick={() => setOpen(v => !v)}>
        <span className={s.label}>Reminder</span>
        <span className={[s.badge, dueItems.length > 0 ? s.badgeBlink : ''].join(' ')}>
          {dueItems.length}
        </span>
        <span className={s.chevron}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className={s.items}>
          <button className={s.addAllBtn} onClick={handleAddAll}>
            + Alle hinzufügen
          </button>
          {dueItems.map(item => (
            <div key={item.id} className={s.item}>
              <span className={s.itemIcon}>{item.icon || '🔔'}</span>
              <div className={s.itemBody}>
                <span className={s.itemText}>{item.text}</span>
                {item.time && <span className={s.itemTime}>{item.time}</span>}
              </div>
              <button className={s.dismissBtn} onClick={() => dismiss(item.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
