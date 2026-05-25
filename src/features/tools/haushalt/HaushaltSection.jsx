import { useState } from 'react'
import { useAppStore } from '../../../store'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import {
  loadHaushalt, saveHaushalt, markTaskDone,
  calcRingScore, getUrgentTasks, taskSegments,
} from './haushaltData'
import s from './HaushaltSection.module.css'

function SegmentBar({ task }) {
  const { filled, total, color, overdue } = taskSegments(task)
  return (
    <div className={s.segBar}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={s.seg}
          style={{
            background: i < filled ? color : undefined,
            boxShadow: overdue && i < filled ? `0 0 3px ${color}` : undefined,
          }}
        />
      ))}
    </div>
  )
}

export default function HaushaltSection() {
  const { setCurrentTab } = useAppStore()
  const [config, setConfig] = useState(() => loadHaushalt())

  const updateConfig = (next) => {
    setConfig(next)
    saveHaushalt(next)
  }

  const score   = calcRingScore(config.rooms)
  const urgent  = getUrgentTasks(config, 4)
  const color   = score >= 70 ? 'var(--emerald)' : score >= 40 ? '#f59e0b' : 'var(--rose)'
  const label   = score >= 70 ? 'Im Griff' : score >= 40 ? 'Einiges offen' : 'Chaos'

  return (
    <ToolSection
      toolId="haushalt"
      title="Haushalt"
      badge={`${score}%`}
      badgeBg={score >= 70 ? 'rgba(16,185,129,0.12)' : score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(251,113,133,0.12)'}
      onTitleClick={() => setCurrentTab(TOOL_TAB.haushalt)}
    >
      {urgent.length === 0 ? (
        <div className={s.empty}>✨ Alles im Griff</div>
      ) : (
        <div className={s.list}>
          {urgent.map(({ task, room }) => (
            <div key={task.id} className={s.row}>
              <div className={s.rowTop}>
                <span className={s.roomIcon}>{room.icon}</span>
                <span className={s.taskText}>{task.text}</span>
                <button
                  className={s.doneBtn}
                  onClick={() => updateConfig(markTaskDone(config, task.id))}
                >✓</button>
              </div>
              <SegmentBar task={task} />
            </div>
          ))}
        </div>
      )}
    </ToolSection>
  )
}
