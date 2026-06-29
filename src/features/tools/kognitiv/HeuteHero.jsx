import { MODULE_CONFIG, PROFILE_DOMAINS, PROFILE_DOMAIN_ORDER } from './moduleConfig'
import { getEinheitModules } from './configStore'
import { loadSessions, isDoneToday, einheitStreak, einheitenInRange, domainForm } from './sessionStore'
import { todayKey, dateKey } from '../../../utils'
import s from './HeuteHero.module.css'

const PlayIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>)
const BoltIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>)
const CalIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>)
const ClockIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>)
const ChartIcon = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>)
const GridIcon = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>)

const C = 2 * Math.PI * 20

export default function HeuteHero({ onStartEinheit, onOpenAllModules, onOpenAuswertung }) {
  const moduleIds = getEinheitModules()
  const sessions  = loadSessions()
  const today     = todayKey()
  const total     = moduleIds.length
  const doneCount = moduleIds.filter(id => isDoneToday(id)).length
  const allDone   = total > 0 && doneCount >= total

  const streak    = einheitStreak(sessions, today)
  const weekAgo   = dateKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const weekCount = einheitenInRange(sessions, weekAgo)

  const groupDur = {}
  sessions.forEach(x => { if (x.sessionGroupId) groupDur[x.sessionGroupId] = (groupDur[x.sessionGroupId] || 0) + (x.duration || 0) })
  const compDurs = sessions.filter(x => x.einheitComplete).map(x => groupDur[x.sessionGroupId] || 0)
  const avgMin = compDurs.length
    ? Math.max(1, Math.round(compDurs.reduce((a, b) => a + b, 0) / compDurs.length / 60))
    : Math.max(1, Math.round(total * 2.5))

  const form = domainForm(sessions)
  const greeting = (() => { const h = new Date().getHours(); return h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend' })()

  const ringOffset = C * (1 - (total > 0 ? doneCount / total : 0))
  const chips = moduleIds.slice(0, 3).map(id => MODULE_CONFIG[id]).filter(Boolean)
  const more  = total - chips.length

  return (
    <div className={s.page}>
      <div className={s.greeting}>{greeting}, <b>Jonas</b> — {allDone ? 'heute erledigt.' : 'bereit für deine Einheit.'}</div>

      <div className={s.label}>Jetzt dran</div>
      <div className={s.hero}>
        <div className={s.accent} />
        <div className={s.heroTop}>
          <div className={s.heroInfo}>
            <div className={s.kicker}><span className={s.kdot} />Tägliche Einheit</div>
            <div className={s.heroTitle}>Dein Mix</div>
            <div className={s.heroMeta}>{total} Module · ~{avgMin} min</div>
          </div>
          <div className={s.ring}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={ringOffset} transform="rotate(-90 24 24)" />
            </svg>
            <span className={s.ringTxt}>{doneCount}/{total}</span>
          </div>
        </div>
        <div className={s.chips}>
          {chips.map(m => (<span key={m.id} className={s.chip}><span className={s.cdot} style={{ background: m.color }} />{m.name}</span>))}
          {more > 0 && <span className={[s.chip, s.chipMore].join(' ')}>+{more}</span>}
        </div>
        <button className={s.cta} onClick={onStartEinheit}><PlayIcon /> {allDone ? 'Nochmal starten' : 'Einheit starten'}</button>
      </div>

      <div className={s.tiles}>
        <div className={[s.tile, s.tileHi].join(' ')}><BoltIcon /><div className={s.tileNum}>{streak}</div><div className={s.tileLbl}>Tage Streak</div></div>
        <div className={s.tile}><CalIcon /><div className={s.tileNum}>{weekCount}</div><div className={s.tileLbl}>diese Woche</div></div>
        <div className={s.tile}><ClockIcon /><div className={s.tileNum}>{avgMin}<small>m</small></div><div className={s.tileLbl}>Ø Dauer</div></div>
      </div>

      <div className={s.label}>Kognitives Profil</div>
      <div className={s.profile}>
        {PROFILE_DOMAIN_ORDER.map(did => {
          const d = PROFILE_DOMAINS[did]
          const v = form[did]
          return (
            <div key={did} className={s.pRow}>
              <span className={s.pName}>{d.label}</span>
              <div className={s.pTrack}><div className={s.pFill} style={{ width: `${v ?? 0}%`, background: d.color }} /></div>
              <span className={s.pVal}>{v == null ? '–' : v}</span>
            </div>
          )
        })}
      </div>

      <div className={s.actions}>
        <button className={s.actBtn} onClick={onOpenAuswertung}><ChartIcon /> Auswertung</button>
        <button className={s.actBtn} onClick={onOpenAllModules}><GridIcon /> Alle Module</button>
      </div>
    </div>
  )
}
