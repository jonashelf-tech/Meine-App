import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { createBlock } from '../../todos/Block'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import TodoChip from '../../../components/TodoChip/TodoChip'
import {
  loadHaushalt, saveHaushalt, buildQueue,
  MODE_META,
} from './haushaltData'
import s from './HaushaltSection.module.css'

export default function HaushaltSection() {
  const { setTodos, setCurrentTab } = useAppStore()

  const [config, setConfig]           = useState(() => loadHaushalt())
  const [chipTodos, setChipTodos]     = useState([])
  const [transferred, setTransferred] = useState(false)

  const selectedMode    = config.selectedMode ?? 'maintain'
  const hasModeSelected = chipTodos.length > 0

  // Badge text + background
  let badge   = 'Modus wählen'
  let badgeBg = undefined
  if (transferred) {
    badge   = '✓ übertragen'
    badgeBg = 'rgba(16,185,129,0.15)'
  } else if (hasModeSelected) {
    badge   = `${MODE_META[selectedMode].label} · ${chipTodos.length}`
    badgeBg = MODE_META[selectedMode].bg
  }

  // Selecting a mode generates the task chips (60 min budget for card preview)
  const handleModeSelect = useCallback((modus) => {
    const nextConfig = { ...config, selectedMode: modus }
    setConfig(nextConfig)
    saveHaushalt(nextConfig)
    setTransferred(false)

    const q = buildQueue(nextConfig, modus, 60)
    setChipTodos(
      q.map(({ task, room }) =>
        createBlock({
          text:     task.text,
          color:    MODE_META[modus].color,
          priority: 3,
          duration: task.duration,
          category: room.name,
          subItems: (task.subItems ?? []).map(si => ({ ...si })),
        })
      )
    )
  }, [config])

  // Transfer writes all non-done chips to the global todo pool
  const handleTransfer = useCallback(() => {
    if (chipTodos.length === 0 || transferred) return
    const toAdd = chipTodos.filter(c => !c.done)
    if (toAdd.length > 0) {
      setTodos(prev => [...prev, ...toAdd])
    }
    setTransferred(true)
    setChipTodos(prev => prev.map(c => ({ ...c, done: true })))
  }, [chipTodos, transferred, setTodos])

  // Toggle a chip's done state locally
  const handleToggle = useCallback((id) => {
    setChipTodos(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
  }, [])

  // Remove a chip from the section
  const handleRemove = useCallback((id) => {
    setChipTodos(prev => prev.filter(c => c.id !== id))
  }, [])

  return (
    <ToolSection
      toolId="haushalt"
      title="Haushalt"
      badge={badge}
      badgeBg={badgeBg}
      onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
    >
      {/* Mode selector chips */}
      <div className={s.modeRow}>
        {Object.entries(MODE_META).map(([key, meta]) => (
          <button
            key={key}
            className={[
              s.modeChip,
              selectedMode === key && hasModeSelected && !transferred
                ? s.modeChipActive
                : '',
            ].join(' ')}
            style={{ '--mode-color': meta.color }}
            onClick={() => { if (!transferred) handleModeSelect(key) }}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Task list as proper TodoChips */}
      {chipTodos.length > 0 && (
        <div className={s.chips}>
          {chipTodos.map(todo => (
            <TodoChip
              key={todo.id}
              todo={todo}
              todos={chipTodos}
              saveTodos={setChipTodos}
              onToggleDone={() => handleToggle(todo.id)}
              onRemove={transferred ? undefined : () => handleRemove(todo.id)}
              disableExpand={!todo.subItems?.length}
            />
          ))}
        </div>
      )}

      {/* Transfer button — only before transfer */}
      {chipTodos.length > 0 && !transferred && (
        <button className={s.transferBtn} onClick={handleTransfer}>
          Zur Todoliste übertragen
        </button>
      )}
    </ToolSection>
  )
}
