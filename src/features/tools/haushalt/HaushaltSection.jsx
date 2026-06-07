import { useAppStore } from '../../../store'
import { sv, lv, SK } from '../../../storage'
import { TOOL_TAB } from '../toolTabs'
import { getToolColor } from '../../../utils'
import ToolSection from '../../../components/ToolSection/ToolSection'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { createBlock } from '../../todos/Block'
import {
  loadHaushalt, saveHaushalt,
  markTaskDone, getDueRooms, calcRingScore,
} from './haushaltData'
import { useState, useEffect, useCallback } from 'react'
import s from './HaushaltSection.module.css'

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

const BoltIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const BatteryLowIcon = () => (
  <svg width={14} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="16" height="10" rx="2"/>
    <line x1="22" y1="11" x2="22" y2="13"/>
    <line x1="6" y1="12" x2="8" y2="12" strokeWidth={3}/>
  </svg>
)

export default function HaushaltSection({ onStartDrag }) {
  const { todos, setTodos, setCurrentTab, toolColors } = useAppStore()
  const [config,  setConfig]  = useState(() => loadHaushalt())
  const [energie, setEnergie] = useState(() => lv(SK.haushaltEnergie, 'normal'))

  const toolColor = getToolColor('haushalt', toolColors)

  if (!config.briefingDone) {
    return (
      <ToolSection
        toolId="haushalt"
        title="Haushalt"
        color={toolColor}
        onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
      >
        <div style={{ padding: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font)', lineHeight: 1.4 }}>
            Richte Haushalt einmal kurz ein — dann siehst du hier was fällig ist.
          </span>
          <button
            onClick={() => setCurrentTab(TOOL_TAB.haushalt)}
            style={{
              alignSelf: 'flex-start',
              background: `${toolColor}22`,
              border: `1px solid ${toolColor}55`,
              borderRadius: 8,
              color: toolColor,
              fontFamily: 'var(--font)',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '7px 14px',
              cursor: 'pointer',
            }}
          >
            Haushalt einrichten →
          </button>
        </div>
      </ToolSection>
    )
  }

  // Re-sync wenn Haushalt-Pool-Todos ihren done-State ändern (TabHeute schreibt direkt in localStorage)
  const haushaltDoneKey = todos
    .filter(t => t.toolId === 'haushalt')
    .map(t => `${t.id}:${t.done}`)
    .join(',')
  useEffect(() => { setConfig(loadHaushalt()) }, [haushaltDoneKey])

  const [deselected, setDeselected] = useState(() => new Set())

  const toggleSelectRoom = useCallback((roomId) => {
    setDeselected(prev => {
      const next = new Set(prev)
      if (next.has(roomId)) next.delete(roomId); else next.add(roomId)
      return next
    })
  }, [])

  const updateConfig = (next) => {
    setConfig(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next
      saveHaushalt(resolved)
      return resolved
    })
  }

  const handleEnergieChange = (val) => {
    setEnergie(val)
    sv(SK.haushaltEnergie, val)
  }

  const dueRooms  = getDueRooms(config, energie)
  const score     = calcRingScore(config.rooms)
  const badgeBg   = score >= 70
    ? 'rgba(16,185,129,0.12)'
    : score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(251,113,133,0.12)'

  // Task-IDs die schon in nicht-done Haushalt-Pool-Todos stecken (inkl. Zeitplan)
  const poolTaskIds = new Set(
    todos
      .filter(t => t.toolId === 'haushalt' && !t.done)
      .flatMap(t => t.haushaltTaskIds ?? [])
  )

  // Nur Räume anzeigen die noch mindestens eine nicht-abgedeckte Task haben
  const visibleDueRooms = dueRooms.filter(({ dueTasks }) =>
    dueTasks.some(t => !poolTaskIds.has(t.id))
  )

  const handleTaskDone = (taskId) => updateConfig(prev => markTaskDone(prev, taskId))

  const handleRoomDragStart = useCallback((room, dueTasks, e) => {
    const covered   = new Set(todos.filter(t => t.toolId === 'haushalt' && !t.done).flatMap(t => t.haushaltTaskIds ?? []))
    const uncovered = dueTasks.filter(t => !covered.has(t.id))
    onStartDrag?.(room, uncovered, toolColor, e)
  }, [todos, toolColor, onStartDrag])

  const handleRoomDone = (roomId) => {
    const entry = dueRooms.find(e => e.room.id === roomId)
    if (!entry) return
    updateConfig(prev => entry.dueTasks.reduce((cfg, t) => markTaskDone(cfg, t.id), prev))
  }

  // saveItem-Handler für TodoChip: wenn ein subItem done → Haushalt-Task abhaken
  const makeSaveItem = (uncoveredTasks) => (updatedTodo) => {
    updatedTodo.subItems.forEach(si => {
      if (si.done) handleTaskDone(si.id)
    })
  }

  const handleAddSelected = () => {
    const roomsToAdd = visibleDueRooms.filter(({ room }) => !deselected.has(room.id))
    setTodos(prev => {
      const updated = [...prev]

      roomsToAdd.forEach(({ room, dueTasks }) => {
        const newTasks = dueTasks.filter(t => !poolTaskIds.has(t.id))
        if (newTasks.length === 0) return

        const existingIdx = updated.findIndex(t =>
          t.toolId === 'haushalt' && t.haushaltRoomId === room.id && !t.done
        )

        if (existingIdx >= 0) {
          const existing = updated[existingIdx]
          updated[existingIdx] = {
            ...existing,
            duration:        (existing.duration || 0) + newTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
            haushaltTaskIds: [...existing.haushaltTaskIds, ...newTasks.map(t => t.id)],
            subItems:        [...(existing.subItems || []), ...newTasks.map(t => ({ id: crypto.randomUUID(), text: t.text, done: false }))],
          }
        } else {
          updated.push(createBlock({
            text:            room.name,
            duration:        newTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
            subItems:        newTasks.map(t => ({ id: crypto.randomUUID(), text: t.text, done: false })),
            color:           toolColor,
            toolId:          'haushalt',
            haushaltRoomId:  room.id,
            haushaltTaskIds: newTasks.map(t => t.id),
            priority:        room.priority ?? 3,
          }))
        }
      })

      return updated
    })
  }

  const selectedCount = visibleDueRooms.filter(({ room }) => !deselected.has(room.id)).length

  return (
    <ToolSection
      toolId="haushalt"
      title="Haushalt"
      badge={`${score}%`}
      badgeBg={badgeBg}
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
      actionLabel={`+ ${selectedCount} hinzufügen`}
      onAction={handleAddSelected}
      actionDisabled={selectedCount === 0 || visibleDueRooms.length === 0}
    >
      <div className={s.energieStrip}>
        <button
          className={[s.energieBtn, energie === 'normal' ? s.energieBtnActive : ''].join(' ')}
          onClick={() => handleEnergieChange('normal')}
        >
          <BoltIcon /> Normal
        </button>
        <button
          className={[s.energieBtn, energie === 'low' ? s.energieBtnActive : ''].join(' ')}
          onClick={() => handleEnergieChange('low')}
        >
          <BatteryLowIcon /> Low Energy
        </button>
      </div>

      {visibleDueRooms.length === 0 ? (
        <div className={s.empty}>✨ Alles im Griff</div>
      ) : (
        <>
          <div className={s.rooms}>
            {visibleDueRooms.map(({ room, dueTasks }) => {
              const uncoveredTasks = dueTasks.filter(t => !poolTaskIds.has(t.id))
              const isSelected = !deselected.has(room.id)
              const fakeTodo = {
                id:       room.id,
                text:     room.name,
                color:    toolColor,
                done:     false,
                priority: room.priority ?? 3,
                duration: uncoveredTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
                subItems: uncoveredTasks.map(t => ({ id: t.id, text: t.text, done: false })),
                category: null,
                date:     null,
                time:     null,
              }
              const dragHandle = (
                <span
                  className={s.roomDragHandle}
                  onPointerDown={e => { e.stopPropagation(); handleRoomDragStart(room, dueTasks, e) }}
                  aria-label="Ziehen"
                >
                  <DragIcon />
                </span>
              )
              return (
                <div key={room.id} className={[s.roomRow, !isSelected ? s.roomRowDeselected : ''].join(' ')}>
                  <button
                    className={[s.roomSelectBtn, isSelected ? s.roomSelectBtnOn : ''].join(' ')}
                    onClick={() => toggleSelectRoom(room.id)}
                    title={isSelected ? 'Abwählen' : 'Auswählen'}
                  >
                    {isSelected ? '✓' : '○'}
                  </button>
                  <div className={s.roomChipWrap}>
                    <TodoChip
                      todo={fakeTodo}
                      saveItem={makeSaveItem(uncoveredTasks)}
                      onToggleDone={() => handleRoomDone(room.id)}
                      dragHandle={dragHandle}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </ToolSection>
  )
}
