import { useState } from 'react'
import { useAppStore } from '../../../store'
import { lv, sv, SK } from '../../../storage'
import { getToolColor, todayKey } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import {
  ACHIEVEMENTS,
  getErfolgeStats,
  getStatValue,
  getUnlocked,
  remainingClaimsToday,
  EMPTY_ERFOLGE,
} from './achievements'
import s from './TabErfolge.module.css'

const TrophyIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H3.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h2.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 22V18"/>
    <path d="M14 22V18"/>
    <path d="M6 4h12v8a6 6 0 0 1-12 0V4z"/>
  </svg>
)

export default function TabErfolge({ onBack }) {
  const { todos, toolColors } = useAppStore()
  const toolColor = getToolColor('erfolge', toolColors)

  const [erfolgeData, setErfolgeData] = useState(() =>
    lv(SK.erfolge, EMPTY_ERFOLGE)
  )
  const [toast, setToast]             = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    localStorage.removeItem(SK.erfolge)
    localStorage.removeItem(SK.erfolgeTracking)
    window.location.reload()
  }

  const tracking = lv(SK.erfolgeTracking, { tagesplanerDates: [] })
  const stats     = getErfolgeStats(todos, tracking)
  const unlocked  = getUnlocked(stats, erfolgeData.claimedIds)

  const today     = todayKey()
  const remaining = remainingClaimsToday(erfolgeData.claimedDates, today)

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

  // Geclaimte Achievements: neueste zuerst
  const claimed = [...erfolgeData.claimedIds]
    .reverse()
    .map(id => ACHIEVEMENTS.find(a => a.id === id))
    .filter(Boolean)

  // Noch nicht freigeschaltete Achievements — für Fortschritt
  const notUnlocked = ACHIEVEMENTS.filter(a =>
    !a.condition(stats) && !erfolgeData.claimedIds.includes(a.id)
  )
  const planerProgress = notUnlocked.filter(a => a.category === 'planer')
  const todoProgress   = notUnlocked.filter(a => a.category === 'todos')

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      {toast && <div className={s.toast}>{toast}</div>}

      <ToolHeader
        onBack={onBack}
        icon={<TrophyIcon />}
        eyebrow="Erfolge"
        title="Erfolge"
      />

      {/* Punkte-Karte */}
      <div className={s.pointsCard}>
        <div className={s.pointsNum}>
          {erfolgeData.totalPoints}<span className={s.pointsUnit}> P</span>
        </div>
        <div className={s.pointsSub}>
          {erfolgeData.claimedIds.length} / {ACHIEVEMENTS.length} Erfolge erreicht
        </div>
      </div>

      {/* Abholbereit */}
      {unlocked.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionLabel}>Abholbereit</div>
          {unlocked.map(a => (
            <div key={a.id} className={s.unlockRow}>
              <div className={s.unlockInfo}>
                <span className={s.unlockName}>{a.name}</span>
                <span className={s.unlockPts} style={{ color: toolColor }}>+{a.points} P</span>
              </div>
              <button
                className={s.claimBtn}
                style={{ '--btn-color': toolColor }}
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
              style={{ '--btn-color': toolColor }}
              onClick={claimAll}
              disabled={remaining <= 0}
            >
              {remaining <= 0
                ? 'Heute schon 5 abgeholt — morgen weiter'
                : `Alle abholen (${Math.min(unlocked.length, remaining)})`}
            </button>
          )}
          {remaining <= 0 && unlocked.length <= 1 && (
            <div className={s.limitNote}>Heute schon 5 abgeholt — morgen weiter</div>
          )}
        </div>
      )}

      {/* Bereits erreicht */}
      {claimed.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionLabel}>Bereits erreicht</div>
          {claimed.map(a => (
            <div key={a.id} className={s.claimedRow}>
              <span className={s.claimedName}>{a.name}</span>
              <span className={s.claimedPts}>{a.points} P</span>
            </div>
          ))}
        </div>
      )}

      {/* Fortschritt */}
      {(planerProgress.length > 0 || todoProgress.length > 0) && (
        <div className={s.section}>
          <div className={s.sectionLabel}>Fortschritt</div>

          {planerProgress.length > 0 && (
            <>
              <div className={s.catLabel}>Tagesplaner</div>
              {planerProgress.map(a => {
                const current = Math.min(getStatValue(a, stats), a.target)
                const pct     = (current / a.target) * 100
                return (
                  <div key={a.id} className={s.progressRow}>
                    <span className={s.progressName}>{a.name}</span>
                    <div className={s.progressTrack}>
                      <div className={s.progressFill} style={{ width: `${pct}%`, background: toolColor }} />
                    </div>
                    <span className={s.progressVal}>{current}/{a.target}</span>
                  </div>
                )
              })}
            </>
          )}

          {todoProgress.length > 0 && (
            <>
              <div className={s.catLabel}>Todos</div>
              {todoProgress.map(a => {
                const current = Math.min(getStatValue(a, stats), a.target)
                const pct     = (current / a.target) * 100
                return (
                  <div key={a.id} className={s.progressRow}>
                    <span className={s.progressName}>{a.name}</span>
                    <div className={s.progressTrack}>
                      <div className={s.progressFill} style={{ width: `${pct}%`, background: toolColor }} />
                    </div>
                    <span className={s.progressVal}>{current}/{a.target}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      <button
        className={[s.toolReset, confirmReset ? s.toolResetConfirm : ''].join(' ')}
        onClick={handleReset}
      >
        {confirmReset ? '⚠ Wirklich alle Erfolge zurücksetzen?' : 'Erfolge-Daten löschen'}
      </button>
    </div>
  )
}
