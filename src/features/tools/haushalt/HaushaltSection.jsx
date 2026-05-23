import { useState, useCallback, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { createBlock } from '../../todos/Block'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import TodoChip from '../../../components/TodoChip/TodoChip'
import {
  loadHaushalt, saveHaushalt, buildSmartQueue,
  calcZustand, markTaskDone,
  ENERGIE_META, ZUSTAND_META,
} from './haushaltData'
import s from './HaushaltSection.module.css'

function chipColor(zustand, energie) {
  if (zustand === 'chaos') return '#fb7185'
  if (zustand === 'knapp') return '#f59e0b'
  return energie === 'viel' ? '#10B981' : '#8B5CF6'
}

function buildChips(config, zustand, energie) {
  const q = buildSmartQueue(config, energie, 60)
  const color = chipColor(zustand, energie)
  return q.map(({ task, room }) =>
    createBlock({
      text:     task.text,
      color,
      priority: 3,
      duration: task.duration,
      category: room.name,
      subItems: (task.subItems ?? []).map(si => ({ ...si })),
    })
  )
}

export default function HaushaltSection() {
  const { setTodos, setCurrentTab } = useAppStore()

  const [config,      setConfig]      = useState(() => loadHaushalt())
  const [energie,     setEnergie]     = useState(() => loadHaushalt().energie ?? 'normal')
  const [queueMeta,   setQueueMeta]   = useState(() => {
    const cfg = loadHaushalt()
    const en  = cfg.energie ?? 'normal'
    return buildSmartQueue(cfg, en, 60)
  })
  const [chipTodos,   setChipTodos]   = useState(() => {
    const cfg = loadHaushalt()
    const en  = cfg.energie ?? 'normal'
    const zs  = calcZustand(cfg.rooms)
    return buildChips(cfg, zs, en)
  })
  const [transferred, setTransferred] = useState(false)

  const zustand = useMemo(() => calcZustand(config.rooms), [config.rooms])
  const zm      = ZUSTAND_META[zustand]

  // Badge
  let badge   = zm.label
  let badgeBg = zm.bg
  if (transferred) { badge = '✓ übertragen'; badgeBg = 'rgba(16,185,129,0.15)' }

  const updateConfig = useCallback((next) => {
    setConfig(next)
    saveHaushalt(next)
  }, [])

  const regenQueue = useCallback((cfg, en) => {
    const zs = calcZustand(cfg.rooms)
    const q  = buildSmartQueue(cfg, en, 60)
    setQueueMeta(q)
    setChipTodos(buildChips(cfg, zs, en))
    setTransferred(false)
  }, [])

  const handleEnergieChange = useCallback((en) => {
    if (transferred) return
    setEnergie(en)
    const next = { ...config, energie: en }
    updateConfig(next)
    regenQueue(next, en)
  }, [config, transferred, updateConfig, regenQueue])

  const handleToggle = useCallback((id) => {
    const idx = chipTodos.findIndex(c => c.id === id)
    setChipTodos(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
    if (idx >= 0 && queueMeta[idx]) {
      const next = markTaskDone(config, queueMeta[idx].task.id)
      updateConfig(next)
    }
  }, [chipTodos, queueMeta, config, updateConfig])

  const handleRemove = useCallback((id) => {
    const idx = chipTodos.findIndex(c => c.id === id)
    setChipTodos(prev => prev.filter(c => c.id !== id))
    setQueueMeta(prev => prev.filter((_, i) => i !== idx))
  }, [chipTodos])

  const handleTransfer = useCallback(() => {
    if (chipTodos.length === 0 || transferred) return
    const toAdd = chipTodos.filter(c => !c.done)
    if (toAdd.length > 0) setTodos(prev => [...prev, ...toAdd])
    setTransferred(true)
    setChipTodos(prev => prev.map(c => ({ ...c, done: true })))
  }, [chipTodos, transferred, setTodos])

  return (
    <ToolSection
      toolId="haushalt"
      title="Haushalt"
      badge={badge}
      badgeBg={badgeBg}
      onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
    >
      {/* Energie-Selector — nur in Ordnung-Modus */}
      {zustand === 'ordnung' && !transferred && (
        <div className={s.energieRow}>
          {Object.entries(ENERGIE_META).map(([key, meta]) => (
            <button
              key={key}
              className={[s.energieChip, energie === key ? s.energieChipActive : ''].join(' ')}
              style={{ '--e-color': meta.color }}
              onClick={() => handleEnergieChange(key)}
            >
              {meta.label}
            </button>
          ))}
        </div>
      )}

      {/* Task chips */}
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

      {chipTodos.length === 0 && !transferred && (
        <div className={s.empty}>
          {zustand === 'ordnung' ? '✨ Alles im Griff' : '📋 Mehr Zeit wählen im Haushalt-Tool'}
        </div>
      )}

      {/* Transfer button */}
      {chipTodos.length > 0 && !transferred && (
        <button className={s.transferBtn} onClick={handleTransfer}>
          Zur Todoliste übertragen
        </button>
      )}
    </ToolSection>
  )
}
