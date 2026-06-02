import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { MODULE_CONFIG } from './moduleConfig'
import { getScheduledToday } from './sessionStore'
import s from './KognitivSection.module.css'

export default function KognitivSection() {
  const { setCurrentTab, toolColors, setKognitivAutoStart } = useAppStore()
  const toolColor = getToolColor('kognitiv', toolColors)

  const pendingModules = getScheduledToday()

  // Nichts mehr offen → Sektion verschwindet aus dem Tagesplaner
  if (pendingModules.length === 0) return null

  const handleStart = (moduleId) => {
    setKognitivAutoStart(moduleId)
    setCurrentTab(TOOL_TAB.kognitiv)
  }

  return (
    <ToolSection
      toolId="kognitiv"
      title="Kognitiv"
      badge={<span style={{ color: toolColor }}>{pendingModules.length}</span>}
      badgeBg={`color-mix(in srgb, ${toolColor} 15%, transparent)`}
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.kognitiv)}
    >
      <div className={s.body}>
        <div className={s.pending}>
          {pendingModules.map(({ moduleId, time }) => {
            const m = MODULE_CONFIG[moduleId]
            return (
              <div key={moduleId} className={s.pendingRow}>
                <span className={s.pendingName}>{m?.name ?? moduleId}</span>
                {time && <span className={s.pendingTime}>{time}</span>}
                <button className={s.pendingStart} onClick={() => handleStart(moduleId)}>▶</button>
              </div>
            )
          })}
        </div>
      </div>
    </ToolSection>
  )
}
