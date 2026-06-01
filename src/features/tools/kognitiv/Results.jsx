import { MODULE_CONFIG } from './moduleConfig'
import { getDelta, getModuleSessions } from './sessionStore'
import { loadCheckin } from './checkinStore'
import s from './Results.module.css'

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }

function DotRow({ value }) {
  if (value == null) return null
  return (
    <span className={s.dots}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={[s.dot, value >= n ? s.dotOn : ''].join(' ')} />
      ))}
    </span>
  )
}

export default function Results({ session, fromArchive = false, onBack, onSaveToCalendar }) {
  const m        = MODULE_CONFIG[session.moduleId]
  const delta    = getDelta(session.moduleId, session.mainMetric)
  const last7    = getModuleSessions(session.moduleId).slice(-7)

  const checkin  = session.checkinId ? loadCheckin(session.date) : null

  const taps        = session.taps ?? []
  const hitTimes    = taps.filter(t => t.correct && t.time != null).map(t => t.time)
  const maxTime     = Math.max(...hitTimes, 1)
  const sessionAvg  = avg(hitTimes)
  const allSessions = getModuleSessions(session.moduleId)
  const allHitTimes = allSessions.flatMap(s => (s.taps ?? []).filter(t => t.correct && t.time != null).map(t => t.time))
  const allTimeAvg  = avg(allHitTimes)
  const chartMax    = Math.max(maxTime, allTimeAvg) * 1.05
  const sessAvgPct  = chartMax > 0 ? (sessionAvg / chartMax) * 100 : 50
  const globAvgPct  = chartMax > 0 ? (allTimeAvg / chartMax) * 100 : 50

  const deltaLabel = delta !== null
    ? (delta > 0
        ? `▲ ${Math.abs(delta)}${m.mainMetricUnit} besser`
        : `▼ ${Math.abs(delta)}${m.mainMetricUnit} schlechter`)
    : null

  return (
    <div className={s.root} style={{ '--accent': m.color }}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack}>
          <span className={s.arrow}>←</span> {fromArchive ? 'Zurück' : 'Fertig'}
        </button>
      </div>
      <div className={s.scroll}>

      {checkin && (
        <div className={s.checkinBlock}>
          <div className={s.checkinTitle}>Checkin · {new Date(checkin.savedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</div>
          <div className={s.checkinRow}>
            {checkin.sleep != null && (
              <span className={s.checkinItem}>
                <span className={s.checkinLbl}>Schlaf</span>
                <DotRow value={checkin.sleep} />
              </span>
            )}
            {checkin.energy != null && (
              <span className={s.checkinItem}>
                <span className={s.checkinLbl}>Energie</span>
                <DotRow value={checkin.energy} />
              </span>
            )}
            {checkin.medi?.name && (
              <span className={s.checkinItem}>
                <span className={s.checkinLbl}>💊</span>
                <span className={s.checkinMedi}>
                  {checkin.medi.name}
                  {checkin.medi.dosierung ? ` ${checkin.medi.dosierung}` : ''}
                  {checkin.medi.uhrzeit   ? ` · ${checkin.medi.uhrzeit}` : ''}
                </span>
              </span>
            )}
          </div>
          {checkin.note ? <div className={s.checkinNote}>{checkin.note}</div> : null}
        </div>
      )}

      <div className={s.eyebrow}>{fromArchive ? 'Archiv' : 'Fertig'}</div>
      <div className={s.title}>{m.name}</div>

      <div className={s.hero}>
        <div className={s.heroLeft}>
          <div className={s.score}>{session.mainMetric}</div>
          <div className={s.scoreLabel}>{m.mainMetricLabel}{m.mainMetricUnit ? ` · ${m.mainMetricUnit}` : ''}</div>
          {deltaLabel && (
            <div className={[s.delta, delta > 0 ? s.deltaGood : s.deltaBad].join(' ')}>
              {deltaLabel}
            </div>
          )}
        </div>
        {last7.length > 1 && (
          <div className={s.heroRight}>
            <div className={s.trendLabel}>Verlauf</div>
            <div className={s.trendBars}>
              {last7.map((sess, i) => (
                <div
                  key={i}
                  className={[s.trendBar, i === last7.length - 1 ? s.trendBarLast : ''].join(' ')}
                  style={{ height: `${Math.max(15, (Math.min(...last7.map(x => x.mainMetric)) / sess.mainMetric) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={s.metrics}>
        <div className={s.metric}>
          <div className={s.mVal} style={{ color: 'var(--emerald)' }}>
            {session.score.correct ?? session.score.correctRounds ?? session.score.hits ?? '—'}
          </div>
          <div className={s.mLbl}>Korrekte</div>
        </div>
        <div className={s.metric}>
          <div className={s.mVal} style={{ color: 'var(--rose)' }}>
            {session.score.errors ?? session.score.mistakes ?? session.score.falseAlarms ?? '—'}
          </div>
          <div className={s.mLbl}>Fehler</div>
        </div>
        <div className={s.metric}>
          <div className={s.mVal}>{session.duration}s</div>
          <div className={s.mLbl}>Dauer</div>
        </div>
      </div>

      {hitTimes.length > 1 && (
        <div className={s.auswertung}>
          <div className={s.auswLabel}>Auswertung</div>
          <div className={s.chartArea}>
            <div className={s.refLine} style={{ bottom: `${sessAvgPct}%` }}>
              <span className={s.refTag} style={{ color: 'var(--accent)' }}>{sessionAvg.toFixed(2)}s</span>
            </div>
            {allHitTimes.length > hitTimes.length && (
              <div className={s.refLineGlob} style={{ bottom: `${globAvgPct}%` }}>
                <span className={s.refTag} style={{ color: 'var(--text-dim)' }}>{allTimeAvg.toFixed(2)}s</span>
              </div>
            )}
            <div className={s.chartBars}>
              {taps.map((tap, i) => {
                const t  = tap.time ?? 0
                const h  = tap.correct && t > 0 ? Math.max(5, (t / chartMax) * 100) : 5
                const bg = !tap.correct ? 'var(--rose)'
                  : t <= sessionAvg ? 'var(--emerald)'
                  : 'var(--accent)'
                return (
                  <div key={i} className={s.chartBar} style={{ height: `${h}%`, background: bg, opacity: !tap.correct ? 0.7 : 1 }} />
                )
              })}
            </div>
          </div>
          <div className={s.auswFooter}>
            <div className={s.auswStat}>
              <div className={s.auswVal}>{sessionAvg.toFixed(2)}s</div>
              <div className={s.auswLbl}>Ø Session</div>
            </div>
            {allHitTimes.length > hitTimes.length && (
              <div className={s.auswStat}>
                <div className={s.auswVal} style={{ color: 'var(--text-dim)' }}>{allTimeAvg.toFixed(2)}s</div>
                <div className={s.auswLbl}>Ø Gesamt</div>
              </div>
            )}
            <div className={s.auswLegend}>
              <span className={s.legendDot} style={{ background: 'var(--emerald)' }} />schnell
              <span className={s.legendDot} style={{ background: 'var(--accent)' }} />normal
              <span className={s.legendDot} style={{ background: 'var(--rose)' }} />Fehler
            </div>
          </div>
        </div>
      )}

      <button className={s.backBtn2} onClick={onBack}>
        {fromArchive ? 'Zurück' : 'Fertig'}
      </button>
      </div>
    </div>
  )
}
