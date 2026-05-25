import { useState } from 'react'
import { useAppStore } from '../../../store'
import { sv, lv, SK } from '../../../storage'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { createBlock } from '../../todos/Block'
import {
  loadHaushalt, saveHaushalt,
  markTaskDone, getDueRooms, calcRingScore,
} from './haushaltData'
import s from './HaushaltSection.module.css'

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

const ChevronIcon = ({ open }) => (
  <svg
    width={10} height={10} viewBox="0 0 10 10"
    fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}
  >
    <polyline points="2 3 5 7 8 3"/>
  </svg>
)

export default function HaushaltSection() {
  const { setCurrentTab, setTodos, toolColors } = useAppStore()
  const [config,   setConfig]   = useState(() => loadHaushalt())
  const [energie,  setEnergie]  = useState(() => lv(SK.haushaltEnergie, 'normal'))
  const [expanded, setExpanded] = useState({})

  const updateConfig = (next) => { setConfig(next); saveHaushalt(next) }

  const handleEnergieChange = (val) => {
    setEnergie(val)
    sv(SK.haushaltEnergie, val)
  }

  const dueRooms = getDueRooms(config, energie)
  const score    = calcRingScore(config.rooms)
  const badgeBg  = score >= 70
    ? 'rgba(16,185,129,0.12)'
    : score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(251,113,133,0.12)'

  const handleTaskDone = (taskId) => updateConfig(markTaskDone(config, taskId))

  const handleRoomDone = (roomId) => {
    const entry = dueRooms.find(e => e.room.id === roomId)
    if (!entry) return
    const next = entry.dueTasks.reduce(
      (cfg, t) => markTaskDone(cfg, t.id), config
    )
    updateConfig(next)
  }

  const handleAddAll = () => {
    const toolColor = toolColors?.['haushalt'] ?? '#10B981'
    const blocks = dueRooms.map(({ room, dueTasks }) =>
      createBlock({
        text:            `${room.icon} ${room.name}`,
        duration:        dueTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0),
        subItems:        dueTasks.map(t => ({ id: crypto.randomUUID(), text: t.text, done: false })),
        color:           toolColor,
        toolId:          'haushalt',
        haushaltTaskIds: dueTasks.map(t => t.id),
      })
    )
    setTodos(prev => [...prev, ...blocks])
  }

  const toggleExpand = (roomId) =>
    setExpanded(p => ({ ...p, [roomId]: !p[roomId] }))

  return (
    <ToolSection
      toolId="haushalt"
      title="Haushalt"
      badge={`${score}%`}
      badgeBg={badgeBg}
      onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
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

      {dueRooms.length === 0 ? (
        <div className={s.empty}>✨ Alles im Griff</div>
      ) : (
        <>
          <div className={s.rooms}>
            {dueRooms.map(({ room, dueTasks }) => {
              const totalMin = dueTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0)
              const isOpen   = !!expanded[room.id]
              return (
                <div key={room.id} className={s.roomChip}>
                  <div className={s.chipHeader} onClick={() => toggleExpand(room.id)}>
                    <span className={s.roomIcon}>{room.icon}</span>
                    <span className={s.roomName}>{room.name}</span>
                    {totalMin > 0 && (
                      <span className={s.duration}>{totalMin} min</span>
                    )}
                    <button
                      className={s.roomDoneBtn}
                      onClick={e => { e.stopPropagation(); handleRoomDone(room.id) }}
                      title="Alle erledigt"
                    >✓</button>
                    <span className={s.chevron}><ChevronIcon open={isOpen} /></span>
                  </div>

                  {isOpen && (
                    <div className={s.taskList}>
                      {dueTasks.map(task => (
                        <div key={task.id} className={s.taskRow}>
                          <span className={s.taskText}>{task.text}</span>
                          {task.duration > 0 && (
                            <span className={s.taskDuration}>{task.duration}min</span>
                          )}
                          <button
                            className={s.taskDoneBtn}
                            onClick={() => handleTaskDone(task.id)}
                            title="Erledigt"
                          >✓</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button className={s.addAllBtn} onClick={handleAddAll}>
            + Alle zur Todoliste
          </button>
        </>
      )}
    </ToolSection>
  )
}
