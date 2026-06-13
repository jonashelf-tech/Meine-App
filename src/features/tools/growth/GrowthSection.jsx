import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { loadGrowth, isTageskarteOffen } from './growthStore'
import s from './GrowthSection.module.css'

export default function GrowthSection() {
  const { setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('growth', toolColors)

  // Nur Karte 1 zählt — beantwortet/erledigt → Sektion verschwindet
  const offen = isTageskarteOffen(loadGrowth(), todayKey())
  if (!offen) return null

  return (
    <ToolSection
      toolId="growth"
      title="Growth"
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.growth)}
    >
      <div className={s.row}>
        <span className={s.text}>Heutige Karte offen</span>
        <button className={s.openBtn} onClick={() => setCurrentTab(TOOL_TAB.growth)} aria-label="Öffnen">▶</button>
      </div>
    </ToolSection>
  )
}
