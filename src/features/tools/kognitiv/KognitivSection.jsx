import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { getEinheitModules, loadConfig } from './configStore'
import { isDoneToday } from './sessionStore'
import s from './KognitivSection.module.css'

const PlayIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
)

export default function KognitivSection() {
  const { setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('kognitiv', toolColors)

  const cfg = loadConfig()
  if (!cfg.onboardingDone) return null

  const modules = getEinheitModules()
  const total = modules.length
  const done = modules.filter(isDoneToday).length
  if (total === 0 || done >= total) return null // alles erledigt → Sektion weg

  // Feste Tage: nur an Erinnerungstagen zeigen (sonst nicht nerven)
  if (cfg.reminders?.mode === 'fixed') {
    const isoToday = ((new Date().getDay() + 6) % 7) + 1 // 1=Mo … 7=So
    if (!(cfg.reminders.days ?? []).includes(isoToday)) return null
  }

  const open = () => setCurrentTab(TOOL_TAB.kognitiv)

  return (
    <ToolSection
      toolId="kognitiv"
      title="Kognitiv"
      badge={<span style={{ color: toolColor }}>{done}/{total}</span>}
      badgeBg={`color-mix(in srgb, ${toolColor} 15%, transparent)`}
      color={toolColor}
      onTitleClick={open}
    >
      <div className={s.body}>
        <button className={s.row} onClick={open} style={{ '--accent': toolColor }}>
          <span className={s.name}>Tägliche Einheit</span>
          <span className={s.meta}>{total - done} von {total} offen</span>
          <span className={s.start}><PlayIcon /></span>
        </button>
      </div>
    </ToolSection>
  )
}
