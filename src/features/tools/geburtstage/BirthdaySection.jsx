// src/features/tools/geburtstage/BirthdaySection.jsx
import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { createBlock } from '../../todos/Block'
import { getActiveChips } from './birthdayUtils'
import s from './BirthdaySection.module.css'

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

/**
 * BirthdaySection — Tagesplaner-Widget.
 * Eingebunden in TabHeute via SECTIONS/SECTION_PROPS.
 * Props:
 *   onStartDrag — fn(chip, color, e, bulkChips?) — startet Drag in TabHeute
 */
export default function BirthdaySection({ onStartDrag }) {
  const { birthdays, setBirthdays, setCurrentTab, toolColors, todos, setTodos } = useAppStore()
  const toolColor = getToolColor('geburtstage', toolColors)

  const chips = getActiveChips(birthdays, toolColor).filter(chip => {
    const chipId = `${chip.type}-${chip.birthday.id}`
    // verstecken sobald für diesen Chip ein Todo existiert (im Pool/Planer ODER bereits abgehakt)
    return !todos.some(t => t.birthdayChipId === chipId)
  })

  const handleChipDone = useCallback((chip) => {
    const chipId = `${chip.type}-${chip.birthday.id}`
    setTodos(prev => [...prev, createBlock({
      text: chip.text,
      priority: chip.type === 'birthday' ? 2 : 3,
      color: chip.color,
      toolId: 'geburtstage',
      birthdayChipId: chipId,
      done: true,
      doneAt: new Date().toISOString(),
    })])
    if (chip.type === 'birthday') {
      const currentYear = new Date().getFullYear()
      setBirthdays(prev => prev.map(b => b.id === chip.birthday.id ? { ...b, plannedYear: currentYear } : b))
    }
  }, [setTodos, setBirthdays])
  const [deselected, setDeselected] = useState(() => new Set())

  const toggleSelect = useCallback((id) => {
    setDeselected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  if (chips.length === 0) return null

  const selectedChips = chips.filter(c => !deselected.has(`${c.type}-${c.birthday.id}`))
  const selectedCount = selectedChips.length

  return (
    <ToolSection
      toolId="geburtstage"
      title="Geburtstage"
      color={toolColor}
      defaultOpen
      onTitleClick={() => setCurrentTab(TOOL_TAB.geburtstage)}
      actionLabel={`+ ${selectedCount} hinzufügen`}
      onAction={() => onStartDrag?.(null, null, null, selectedChips)}
      actionDisabled={selectedCount === 0}
    >
      <div className={s.items}>
        {chips.map(chip => {
          const chipId     = `${chip.type}-${chip.birthday.id}`
          const isSelected = !deselected.has(chipId)
          const fakeTodo   = {
            id:       chipId,
            text:     chip.text,
            color:    chip.color,
            done:     false,
            priority: chip.type === 'birthday' ? 2 : 3,
            duration: null,
            subItems: [],
            category: null,
            date:     null,
            time:     null,
            toolId:   'geburtstage',
          }
          const dragHandle = (
            <span
              className={s.dragHandle}
              onPointerDown={e => { e.stopPropagation(); onStartDrag?.(chip, chip.color, e) }}
              aria-label="Ziehen"
            >
              <DragIcon />
            </span>
          )
          return (
            <div key={chipId} className={[s.row, !isSelected ? s.rowDeselected : ''].join(' ')}>
              <button
                className={[s.selectBtn, isSelected ? s.selectBtnOn : ''].join(' ')}
                onClick={() => toggleSelect(chipId)}
                title={isSelected ? 'Abwählen' : 'Auswählen'}
              >
                {isSelected ? '✓' : '○'}
              </button>
              <div className={s.chipWrap}>
                <TodoChip
                  todo={fakeTodo}
                  onToggleDone={() => handleChipDone(chip)}
                  onRemove={() => toggleSelect(chipId)}
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
