import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, minutesToSk, parseHHMM, ALL_SLOT_KEYS, sk, getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { createBlock } from '../../todos/Block'
import {
  isDueToday, mergeWithCurated,
  loadReminderItems, saveReminderItems,
  loadDismissed, saveDismissed,
} from './reminderData'
import s from './ReminderSection.module.css'

const DragIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

export default function ReminderSection({ onStartDrag }) {
  const { todos, setTodos, days, setDays, setCurrentTab, toolColors } = useAppStore()
  const today      = todayKey()
  const todaySlots = days[today] ?? {}
  const toolColor  = getToolColor('reminder', toolColors)

  const [items,      setItems]      = useState(() => mergeWithCurated(loadReminderItems()))
  const [dismissed,  setDismissed]  = useState(() => loadDismissed())
  const [deselected, setDeselected] = useState(() => new Set())

  const toggleSelect = useCallback((id) => {
    setDeselected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const reminderDoneKey = todos
    .filter(t => t.reminderItemId)
    .map(t => `${t.id}:${t.done}`)
    .join(',')
  useEffect(() => { setItems(mergeWithCurated(loadReminderItems())) }, [reminderDoneKey])

  const todayDismissed = dismissed[today] ?? []

  const pendingReminderIds = new Set([
    ...todos.filter(t => t.reminderItemId && !t.done).map(t => t.reminderItemId),
    ...Object.values(todaySlots).filter(s => s?.reminderItemId).map(s => s.reminderItemId),
  ])

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
      block: createBlock({ text: item.text, priority: 2, color: item.color, category: 'Selfcare', reminderItemId: item.id, toolId: 'reminder' }),
    }
  }, [])

  const handleAddSingle = useCallback((item) => {
    const result = buildResult(item, todaySlots)
    if (result.type === 'slot') {
      setDays(prev => ({ ...prev, [today]: { ...(prev[today] ?? {}), [result.slotKey]: result.data } }))
    } else {
      setTodos(prev => [...prev, result.block])
    }
  }, [today, todaySlots, buildResult, setDays, setTodos])

  const handleAddSelected = useCallback(() => {
    const toAdd = dueItems.filter(i => !deselected.has(i.id))
    let slotsAccum = { ...todaySlots }
    const newTodos = []
    toAdd.forEach(item => {
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
  }, [dueItems, deselected, today, todaySlots, buildResult, setDays, setTodos])

  if (dueItems.length === 0) return null

  const selectedCount = dueItems.filter(i => !deselected.has(i.id)).length

  return (
    <ToolSection
      toolId="reminder"
      title="Reminder"
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.reminder)}
      actionLabel={`+ ${selectedCount} hinzufügen`}
      onAction={handleAddSelected}
      actionDisabled={selectedCount === 0}
    >
      <div className={s.items}>
        {dueItems.map(item => {
          const isSelected = !deselected.has(item.id)
          const fakeTodo = {
            id:       item.id,
            text:     item.text,
            color:    item.color ?? toolColor,
            done:     false,
            priority: 2,
            duration: null,
            subItems: [],
            category: item.time ?? null,
            date:     null,
            time:     null,
          }
          const dragHandle = (
            <span
              className={s.reminderDragHandle}
              onPointerDown={e => { e.stopPropagation(); onStartDrag?.(item, item.color ?? toolColor, e) }}
              aria-label="Ziehen"
            >
              <DragIcon />
            </span>
          )
          return (
            <div key={item.id} className={[s.reminderRow, !isSelected ? s.reminderRowDeselected : ''].join(' ')}>
              <button
                className={[s.selectBtn, isSelected ? s.selectBtnOn : ''].join(' ')}
                onClick={() => toggleSelect(item.id)}
                title={isSelected ? 'Abwählen' : 'Auswählen'}
              >
                {isSelected ? '✓' : '○'}
              </button>
              <div className={s.reminderChipWrap}>
                <TodoChip
                  todo={fakeTodo}
                  onRemove={() => dismiss(item.id)}
                  disableExpand
                  dragHandle={dragHandle}
                />
              </div>
            </div>
          )
        })}
      </div>
    </ToolSection>
  )
}
