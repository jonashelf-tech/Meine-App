import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { MODULE_CONFIG } from './moduleConfig'
import { loadSessions } from './sessionStore'
import { getTodayCheckin } from './checkinStore'
import s from './KognitivSection.module.css'

function DotDisplay({ value }) {
  if (value == null) return null
  return (
    <span className={s.dotDisp}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={[s.dotD, value >= n ? s.dotDOn : ''].join(' ')} />
      ))}
    </span>
  )
}

export default function KognitivSection() {
  const { setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('kognitiv', toolColors)
  const today     = new Date().toISOString().slice(0, 10)

  const checkin       = getTodayCheckin()
  const todaySessions = loadSessions().filter(sess => sess.date === today)
  const doneCount     = todaySessions.length

  const badgeText  = doneCount > 0 ? String(doneCount) : '○'
  const badgeBg    = doneCount > 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)'
  const badgeColor = doneCount > 0 ? 'var(--primary)' : 'var(--text-dim)'

  return (
    <ToolSection
      toolId="kognitiv"
      title="Kognitiv"
      badge={<span style={{ color: badgeColor }}>{badgeText}</span>}
      badgeBg={badgeBg}
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.kognitiv)}
    >
      <div className={s.body}>
        {checkin && (
          <div className={s.checkinRow}>
            {checkin.sleep != null && (
              <span className={s.checkinItem}>
                <span className={s.lbl}>Schlaf</span>
                <DotDisplay value={checkin.sleep} />
              </span>
            )}
            {checkin.energy != null && (
              <span className={s.checkinItem}>
                <span className={s.lbl}>Energie</span>
                <DotDisplay value={checkin.energy} />
              </span>
            )}
            {checkin.medi?.name && (
              <span className={s.checkinItem}>
                <span className={s.lbl}>💊</span>
                <span className={s.mediInfo}>
                  {checkin.medi.name}
                  {checkin.medi.dosierung ? ` ${checkin.medi.dosierung}` : ''}
                  {checkin.medi.uhrzeit   ? ` · ${checkin.medi.uhrzeit}` : ''}
                </span>
              </span>
            )}
            {checkin.note && <div className={s.note}>{checkin.note}</div>}
          </div>
        )}

        {todaySessions.length === 0 ? (
          <div className={s.empty}>Noch keine Session heute</div>
        ) : (
          <div className={s.sessions}>
            {todaySessions.map(sess => {
              const m    = MODULE_CONFIG[sess.moduleId]
              const time = new Date(sess.startedAt).toLocaleTimeString('de-DE', {
                hour: '2-digit', minute: '2-digit',
              })
              return (
                <div key={sess.id} className={s.sessRow}>
                  <span className={s.sessName}>{m?.name ?? sess.moduleId}</span>
                  <span className={s.sessVal}>{sess.mainMetric}{m?.mainMetricUnit}</span>
                  <span className={s.sessTime}>{time} Uhr</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ToolSection>
  )
}
