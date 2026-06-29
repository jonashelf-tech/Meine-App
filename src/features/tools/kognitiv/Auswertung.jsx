import { useState } from 'react'
import { loadSessions, getModuleSessions, getModuleStats, computeDelta, einheitenInRange, domainForm } from './sessionStore'
import { MODULE_CONFIG, MODULE_ORDER, PROFILE_DOMAINS, PROFILE_DOMAIN_ORDER } from './moduleConfig'
import { dateKey } from '../../../utils'
import ModuleIcon from './ModuleIcon'
import s from './Auswertung.module.css'

const TABS = [['ueberblick', 'Überblick'], ['module', 'Module'], ['profil', 'Profil']]
const weekAgoKey = () => dateKey(new Date(Date.now() - 7 * 864e5))

function Sparkline({ sessions, hib, color, onSelect }) {
  const vals = sessions.map(x => x.mainMetric)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = (max - min) || 1
  const W = 280, H = 54, pad = 8
  const n = sessions.length
  const xAt = i => (n <= 1 ? W / 2 : pad + (i / (n - 1)) * (W - 2 * pad))
  const yAt = v => { const norm = (v - min) / range; const up = hib ? norm : 1 - norm; return H - pad - up * (H - 2 * pad) }
  const pts = sessions.map((sx, i) => `${xAt(i).toFixed(1)},${yAt(sx.mainMetric).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.spark}>
      <polygon points={`${xAt(0)},${H} ${pts} ${xAt(n - 1)},${H}`} fill={color} fillOpacity="0.13" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {sessions.map((sx, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(sx.mainMetric)} r="13" fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onSelect(sx)} />
          <circle cx={xAt(i)} cy={yAt(sx.mainMetric)} r={i === n - 1 ? 4 : 2.6} fill={color} style={{ stroke: 'var(--bg)', strokeWidth: 1.5, pointerEvents: 'none' }} />
        </g>
      ))}
    </svg>
  )
}

function ProfileBars({ form }) {
  return (
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
  )
}

export default function Auswertung({ onSelectModule, onSelectSession }) {
  const [tab, setTab] = useState('ueberblick')
  const sessions = loadSessions()

  if (sessions.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.empty}>
          <div className={s.emptyTitle}>Noch keine Daten</div>
          <div className={s.emptyText}>Spiel eine Einheit oder ein einzelnes Modul — danach siehst du hier deinen Verlauf.</div>
        </div>
      </div>
    )
  }

  const trained = MODULE_ORDER.filter(id => getModuleStats(id))
  const form = domainForm(sessions)
  const wk = weekAgoKey()
  const einheitenWk = einheitenInRange(sessions, wk)

  const bestwerteWk = trained.filter(id => {
    const ss = getModuleSessions(id)
    const hib = MODULE_CONFIG[id].higherIsBetter
    const best = ss.reduce((b, x) => (hib ? Math.max(b, x.mainMetric) : Math.min(b, x.mainMetric)), hib ? -Infinity : Infinity)
    const bestSess = ss.find(x => x.mainMetric === best)
    return bestSess && bestSess.date >= wk
  }).length

  const groupDur = {}
  sessions.forEach(x => { if (x.sessionGroupId) groupDur[x.sessionGroupId] = (groupDur[x.sessionGroupId] || 0) + (x.duration || 0) })
  const compDurs = sessions.filter(x => x.einheitComplete).map(x => groupDur[x.sessionGroupId] || 0)
  const avgMin = compDurs.length ? Math.max(1, Math.round(compDurs.reduce((a, b) => a + b, 0) / compDurs.length / 60)) : null

  const doms = PROFILE_DOMAIN_ORDER.map(d => ({ d, v: form[d] }))
  const strongest = doms.filter(x => x.v != null).sort((a, b) => b.v - a.v)[0]
  const neglected = doms.find(x => x.v == null)
  const weakest = doms.filter(x => x.v != null).sort((a, b) => a.v - b.v)[0]

  return (
    <div className={s.root}>
      <div className={s.tabs}>
        {TABS.map(([id, label]) => (
          <button key={id} className={[s.tab, tab === id ? s.tabOn : ''].join(' ')} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'ueberblick' && (
        <>
          <div className={s.tiles}>
            <div className={s.tile}><div className={s.tNum}>{einheitenWk}</div><div className={s.tLbl}>Einheiten · Woche</div></div>
            <div className={[s.tile, s.tileHi].join(' ')}><div className={s.tNum}>{bestwerteWk}</div><div className={s.tLbl}>Bestwerte · Woche</div></div>
            <div className={s.tile}><div className={s.tNum}>{avgMin ?? '–'}{avgMin != null && <small>m</small>}</div><div className={s.tLbl}>Ø Dauer</div></div>
          </div>

          <div className={s.insight}>
            <div className={s.insightHead}>Wochen-Einblick</div>
            {strongest && (
              <div className={s.iRow}><span className={s.iDot} style={{ background: PROFILE_DOMAINS[strongest.d].color }} /><span className={s.iName}>Stärkste Domäne</span><span className={s.iVal} style={{ color: 'var(--emerald)' }}>{PROFILE_DOMAINS[strongest.d].label} · {strongest.v}</span></div>
            )}
            {neglected
              ? <div className={s.iRow}><span className={s.iDot} style={{ background: PROFILE_DOMAINS[neglected.d].color }} /><span className={s.iName}>{PROFILE_DOMAINS[neglected.d].label}</span><span className={s.iVal} style={{ color: 'var(--amber)' }}>noch nicht trainiert</span></div>
              : weakest && <div className={s.iRow}><span className={s.iDot} style={{ background: PROFILE_DOMAINS[weakest.d].color }} /><span className={s.iName}>Noch Luft nach oben</span><span className={s.iVal} style={{ color: 'var(--amber)' }}>{PROFILE_DOMAINS[weakest.d].label} · {weakest.v}</span></div>}
          </div>

          <div className={s.secLabel}>Kognitives Profil</div>
          <ProfileBars form={form} />
        </>
      )}

      {tab === 'module' && (
        <div className={s.modList}>
          {trained.map(id => {
            const m = MODULE_CONFIG[id]
            const ss = getModuleSessions(id).slice(-12)
            const stats = getModuleStats(id)
            const delta = ss.length > 1 ? computeDelta(ss[ss.length - 2].mainMetric, ss[ss.length - 1].mainMetric, m.higherIsBetter) : null
            return (
              <div key={id} className={s.modCard} style={{ '--accent': m.color }}>
                <button className={s.modHead} onClick={() => onSelectModule(id)}>
                  <span className={s.modIcon}><ModuleIcon id={id} size={17} /></span>
                  <span className={s.modNameWrap}><span className={s.modName}>{m.name}</span><span className={s.modDom}>{m.domain}</span></span>
                  <span className={s.modVal}>{stats.latest}{m.mainMetricUnit ? <span className={s.modUnit}> {m.mainMetricUnit}</span> : null}</span>
                  <span className={[s.modDelta, delta > 0 ? s.dGood : delta < 0 ? s.dBad : s.dFlat].join(' ')}>{delta > 0 ? `▲ ${Math.abs(delta)}` : delta < 0 ? `▼ ${Math.abs(delta)}` : '–'}</span>
                </button>
                {ss.length > 1
                  ? <Sparkline sessions={ss} hib={m.higherIsBetter} color={m.color} onSelect={onSelectSession} />
                  : <div className={s.oneShot}>Erst eine Session — ab der zweiten zeigt sich der Verlauf.</div>}
              </div>
            )
          })}
          <div className={s.tapHint}>Tipp auf einen Punkt → Session-Detail</div>
        </div>
      )}

      {tab === 'profil' && (
        <>
          <div className={s.secLabel}>Form pro Domäne</div>
          <ProfileBars form={form} />
          <div className={s.secLabel}>Trainiert</div>
          <div className={s.modList}>
            {trained.map(id => {
              const m = MODULE_CONFIG[id]
              const st = getModuleStats(id)
              return (
                <button key={id} className={s.modRow} style={{ '--accent': m.color }} onClick={() => onSelectModule(id)}>
                  <span className={s.modIcon}><ModuleIcon id={id} size={16} /></span>
                  <span className={s.modNameWrap}><span className={s.modName}>{m.name}</span><span className={s.modDom}>{m.domain}</span></span>
                  <span className={s.modRowVal}>{st.sessions}×</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
