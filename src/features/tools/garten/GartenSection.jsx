// src/features/tools/garten/GartenSection.jsx
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import GartenSzene from './GartenSzene'
import {
  displayXP, todayXP, stageNum, reachedDekos,
  reachedMilestones, nextMilestone, unseenMilestones, isNight,
} from './gartenData'
import s from './GartenSection.module.css'

export default function GartenSection() {
  const { todos, toolColors, setCurrentTab } = useAppStore()
  const toolColor = getToolColor('garten', toolColors)

  const xp     = displayXP(todos)
  const plus   = todayXP(todos)
  const next   = nextMilestone(xp)
  const unseen = unseenMilestones(xp)

  const reached = reachedMilestones(xp)
  const prevXp  = reached[reached.length - 1]?.xp ?? 0
  const pct     = next ? Math.round(((xp - prevXp) / (next.xp - prevXp)) * 100) : 100

  return (
    <ToolSection
      toolId="garten"
      title="Garten"
      color={toolColor}
      defaultOpen
      badge={plus > 0 ? `+${plus} heute` : null}
      onTitleClick={() => setCurrentTab(TOOL_TAB.garten)}
    >
      <div className={s.wrap} style={{ '--tool-color': toolColor }}>
        <div className={s.szeneWrap}>
          <GartenSzene stage={stageNum(xp)} dekos={reachedDekos(xp)} night={isNight()} />
        </div>
        {next && (
          <div className={s.progressRow}>
            <div className={s.track}><div className={s.fill} style={{ width: `${pct}%` }} /></div>
            <span className={s.nextLabel}>
              {unseen > 0 ? 'Neues freigeschaltet — schau rein' : `${next.name} in ${next.xp - xp} XP`}
            </span>
          </div>
        )}
      </div>
    </ToolSection>
  )
}
