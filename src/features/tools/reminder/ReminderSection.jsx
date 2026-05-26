import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, minutesToSk, parseHHMM, ALL_SLOT_KEYS, sk } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { createBlock } from '../../todos/Block'
import {
  isDueToday, mergeWithCurated,
  loadReminderItems, saveReminderItems,
  loadDismissed, saveDismissed,
} from './reminderData'
import s from './ReminderSection.module.css'

export default function ReminderSection() {
  const { todos, setTodos, days, setDays, setCurrentTab, toolColors } = useAppStore()
  const today      = todayKey()
  const todaySlots = days[today] ?? {}
  const toolColor  = toolColors?.['reminder'] ?? '#00FF94'

  const [items,     setItems]     = useState(() => mergeWithCurated(loadReminderItems()))
  const [dismissed, setDismissed] = useState(() => loadDismissed())

  // Re-sync items wenn ein Reminder-Todo abgehakt wird (TabHeute setzt lastAdded in localStorage)
  const reminderDoneKey = todos
    .filter(t => t.reminderItemId)
    .map(t => `${t.id}:${t.done}`)
    .join(',')
  useEffect(() => { setItems(mergeWithCurated(loadReminderItems())) }, [reminderDoneKey])

  const todayDismissed = dismissed[today] ?? []

  // Items verstecken die bereits ein offenes Todo/Slot haben — sichtbar erst wieder wenn done
  const pendingReminderIds = new Set(
    todos.filter(t => t.reminderItemId && !t.done).map(t => t.reminderItemId)
  )

  const dueItems = items.filter(item =>
    isDueToday(item) &&
    !todayDismissed.includes(item.id) &&
    !pendingReminderIds.has(item.id)
  )

  const dismiss = useCallback((id) => {
    const next = { ...dismissed, [today]: [...todayDismissed, id] }
    setDismissed(next)
    saveDismissed(next)
  }, [dismissed, today, todayDismissed])

  const buildResult = useCallback((item, currentSlots) => {
    if (item.actionType === 'slot') {
      let slotKey = item.time
        ? minutesToSk(parseHHMM(item.time))
        : ALL_SLOT_KEYS.find(k => !currentSlots[k]) ?? sk(9)
      if (currentSlots[slotKey]) {
        const free = ALL_SLOT_KEYS.find(k => !currentSlots[k])
        if (free) slotKey = free
      }
      return {
        type: 'slot',
        slotKey,
        data: { text: item.text, color: item.color, duration: 30, locked: false, done: false, reminderItemId: item.id },
      }
    }
    return {
      type: 'todo',
      block: createBlock({ text: item.text, priority: 2, color: item.color, category: 'Selfcare', reminderItemId: item.id }),
    }
  }, [])

  // Kein lastAdded-Update beim Hinzufügen — passiert erst wenn Todo/Slot abgehakt wird
  const handleAddSingle = useCallback((item) => {
    const result = buildResult(item, todaySlots)
    if (result.type === 'slot') {
      setDays(prev => ({ ...prev, [today]: { ...(prev[today] ?? {}), [result.slotKey]: result.data } }))
    } else {
      setTodos(prev => [...prev, result.block])
    }
    // pendingReminderIds versteckt das Item automatisch — kein dismiss nötig
  }, [today, todaySlots, buildResult, setDays, setTodos])

  const handleAddAll = useCallback(() => {
    let slotsAccum = { ...todaySlots }
    const newTodos = []
    dueItems.forEach(item => {
      const result = buildResult(item, slotsAccum)
      if (result.type === 'slot') {
        slotsAccum = { ...slotsAccum, [result.slotKey]: result.data }
      } else {
        newTodos.push(result.block)
      }
    })
    if (Object.keys(slotsAccum).length > Object.keys(todaySlots).length) {
      setDays(prev => ({ ...prev, [today]: slotsAccum }))
    }
    if (newTodos.length > 0) setTodos(prev => [...prev, ...newTodos])
  }, [dueItems, today, todaySlots, buildResult, setDays, setTodos])

  if (dueItems.length === 0) return null

  return (
    <ToolSection
      toolId="reminder"
      title="Reminder"
      badge={dueItems.length}
      onTitleClick={() => setCurrentTab(TOOL_TAB.reminder)}
    >
      <div className={s.items}>
        {dueItems.map(item => (
          <div key={item.id} className={s.chip} style={{ '--chip-color': item.color ?? '#00FF94' }}>
            <span className={s.stripe} />
            <span className={s.chipIcon}>{item.icon || '🔔'}</span>
            <div className={s.chipBody}>
              <span className={s.chipText}>{item.text}</span>
              {item.time && <span className={s.chipTime}>{item.time}</span>}
            </div>
            <button className={s.addBtn} onClick={() => handleAddSingle(item)} title="Hinzufügen">+</button>
            <button className={s.dismissBtn} onClick={() => dismiss(item.id)} title="Für heute ignorieren">✕</button>
          </div>
        ))}
        <button className={s.addAllBtn} onClick={handleAddAll}>+ Alle hinzufügen</button>
      </div>
    </ToolSection>
  )
}
