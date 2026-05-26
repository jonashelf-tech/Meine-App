import { useState } from 'react'
import { useAppStore } from '../../../store'
import { lv, sv, SK } from '../../../storage'
import { getToolColor, todayKey } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import {
  ACHIEVEMENTS,
  getErfolgeStats,
  getUnlocked,
  remainingClaimsToday,
  EMPTY_ERFOLGE,
} from './achievements'
import s from './ErfolgeSection.module.css'

export default function ErfolgeSection() {
  const { todos, toolColors, setCurrentTab } = useAppStore()
  const toolColor = getToolColor('erfolge', toolColors)

  const [erfolgeData, setErfolgeData] = useState(() =>
    lv(SK.erfolge, EMPTY_ERFOLGE)
  )
  const [toast, setToast] = useState(null)

  const tracking = lv(SK.erfolgeTracking, { tagesplanerDates: [] })
  const stats     = getErfolgeStats(todos, tracking)
  const unlocked  = getUnlocked(stats, erfolgeData.claimedIds)

  const today     = todayKey()
  const remaining = remainingClaimsToday(erfolgeData.claimedDates, today)
  const top3      = unlocked.slice(0, 3)

  // Letzte 5 geclaimte — neueste zuerst
  const recentClaimed = [...erfolgeData.claimedIds]
    .reverse()
    .slice(0, 5)
    .map(id => ACHIEVEMENTS.find(a => a.id === id))
    .filter(Boolean)

  const saveAndSet = (updated) => {
    sv(SK.erfolge, updated)
    setErfolgeData(updated)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const claimOne = (achievement) => {
    if (remaining <= 0) return
    const todayClaimed = erfolgeData.claimedDates[today] || []
    saveAndSet({
      claimedIds:   [...erfolgeData.claimedIds, achievement.id],
      claimedDates: { ...erfolgeData.claimedDates, [today]: [...todayClaimed, achievement.id] },
      totalPoints:  erfolgeData.totalPoints + achievement.points,
    })
    showToast(`+${achievement.points} P — ${achievement.name}`)
  }

  const claimAll = () => {
    const toClaim = unlocked.slice(0, remaining)
    if (toClaim.length === 0) return
    let updated = { ...erfolgeData }
    toClaim.forEach(a => {
      updated = {
        claimedIds:   [...updated.claimedIds, a.id],
        claimedDates: { ...updated.claimedDates, [today]: [...(updated.claimedDates[today] || []), a.id] },
        totalPoints:  updated.totalPoints + a.points,
      }
    })
    saveAndSet(updated)
    const total = toClaim.reduce((sum, a) => sum + a.points, 0)
    showToast(`+${total} P — ${toClaim.length} Erfolge abgeholt!`)
  }

  const nothingAtAll = unlocked.length === 0 && recentClaimed.length === 0

  return (
    <>
      {toast && (
        <div className={s.toast} style={{ '--tool-color': toolColor }}>{toast}</div>
      )}
      <ToolSection
        toolId="erfolge"
        title="Erfolge"
        badge={unlocked.length > 0 ? unlocked.length : null}
        color={toolColor}
        onTitleClick={() => setCurrentTab(TOOL_TAB.erfolge)}
      >
        <div style={{ '--tool-color': toolColor }}>
          {nothingAtAll ? (
            <div className={s.empty}>Noch keine Erfolge — weiter so!</div>
          ) : (
            <>
              {/* Top 3 abholbare */}
              {top3.map(a => (
                <div key={a.id} className={s.claimRow}>
                  <div className={s.claimInfo}>
                    <span className={s.claimName}>{a.name}</span>
                    <span className={s.claimPts}>+{a.points} P</span>
                  </div>
                  <button
                    className={s.claimBtn}
                    onClick={() => claimOne(a)}
                    disabled={remaining <= 0}
                  >
                    Abholen
                  </button>
                </div>
              ))}

              {unlocked.length > 1 && (
                <button
                  className={s.claimAllBtn}
                  onClick={claimAll}
                  disabled={remaining <= 0}
                >
                  {remaining <= 0
                    ? 'Heute schon 5 abgeholt — morgen weiter'
                    : `Alle ${Math.min(unlocked.length, remaining)} abholen`}
                </button>
              )}

              {remaining <= 0 && unlocked.length > 0 && unlocked.length <= 1 && (
                <div className={s.limitNote}>Heute schon 5 abgeholt — morgen weiter</div>
              )}

              {recentClaimed.length > 0 && (
                <>
                  <div className={s.divider} />
                  <div className={s.chips}>
                    {recentClaimed.map(a => (
                      <span key={a.id} className={s.chip}>{a.name} · {a.points} P</span>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </ToolSection>
    </>
  )
}
