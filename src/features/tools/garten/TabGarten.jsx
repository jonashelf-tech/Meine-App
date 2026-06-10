// src/features/tools/garten/TabGarten.jsx
import { useEffect } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import GartenSzene from './GartenSzene'
import {
  MILESTONES, displayXP, stageNum, currentStage, reachedDekos,
  reachedMilestones, nextMilestone, xpBreakdown, markMilestonesSeen, isNight,
} from './gartenData'
import s from './TabGarten.module.css'

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function TabGarten({ onBack }) {
  const { todos, toolColors } = useAppStore()
  const toolColor = getToolColor('garten', toolColors)

  const xp        = displayXP(todos)
  const stage     = stageNum(xp)
  const next      = nextMilestone(xp)
  const breakdown = xpBreakdown(todos)

  const reached = reachedMilestones(xp)
  const prevXp  = reached[reached.length - 1]?.xp ?? 0
  const pct     = next ? Math.round(((xp - prevXp) / (next.xp - prevXp)) * 100) : 100

  useEffect(() => { markMilestonesSeen(xp) }, [xp])

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="garten" size={22} />}
        eyebrow="Begleiter"
        title="Garten"
      />

      <div className={s.szeneCard}>
        <GartenSzene stage={stage} dekos={reachedDekos(xp)} night={isNight()} />
      </div>

      <div className={s.xpCard}>
        <div className={s.xpNum}>{xp}<span className={s.xpUnit}> XP</span></div>
        <div className={s.xpStufe}>{currentStage(xp).name}</div>
        {next ? (
          <>
            <div className={s.track}><div className={s.fill} style={{ width: `${pct}%` }} /></div>
            <div className={s.nextLabel}>
              Nächste Freischaltung: <b>{next.name}</b> — noch {next.xp - xp} XP
            </div>
          </>
        ) : (
          <div className={s.nextLabel}>Dein Garten ist voll erblüht.</div>
        )}
      </div>

      <div className={s.section}>
        <div className={s.sectionLabel}>So wächst dein Garten</div>
        {breakdown.map(b => (
          <div key={b.id} className={s.srcRow}>
            <span className={s.srcLabel}>{b.label}</span>
            <span className={s.srcCount}>{b.count} × {b.each}</span>
            <span className={s.srcXP}>{b.xp} XP</span>
          </div>
        ))}
      </div>

      <div className={s.section}>
        <div className={s.sectionLabel}>Meilensteine</div>
        {MILESTONES.map(m => {
          const done = xp >= m.xp
          return (
            <div key={m.id} className={[s.msRow, done ? s.msDone : ''].join(' ')}>
              <span className={s.msDot}>{done && <CheckIcon />}</span>
              <span className={s.msName}>{m.name}{m.id === 'sternschnuppe' ? ' (nachts)' : ''}</span>
              <span className={s.msType}>{m.type === 'stage' ? 'Stufe' : 'Deko'}</span>
              <span className={s.msXP}>{m.xp} XP</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
