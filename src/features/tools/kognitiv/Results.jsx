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

  const taps       = session.taps ?? []
  const hitTimes   = taps.filter(t => t.correct && t.time != null).map(t => t.time)
  const sessionAvg = avg(hitTimes)

  // SVG chart constants
  const VW = 300, VH = 80
  const pl = 5, pr = 46, pt = 8, pb = 20
  const iW = VW - pl - pr, iH = VH - pt - pb
  const errY = VH - 7
  const cMin = hitTimes.length > 0 ? Math.min(...hitTimes) * 0.85 : 0
  const cMax = hitTimes.length > 0 ? Math.max(...hitTimes) * 1.15 : 1
  const cRange = cMax - cMin || 1
  const cToX = i => pl + (i / Math.max(taps.length - 1, 1)) * iW
  const cToY = t => pt + iH - ((t - cMin) / cRange) * iH
  const cAvgY = cToY(sessionAvg)
  const cPoints = taps
    .map((tap, i) => tap.correct && tap.time != null
      ? `${cToX(i).toFixed(1)},${cToY(tap.time).toFixed(1)}` : null)
    .filter(Boolean).join(' ')

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
          <svg className={s.chart} viewBox={`0 0 ${VW} ${VH}`}>
            {/* avg dashed line */}
            <line x1={pl} x2={VW - pr} y1={cAvgY} y2={cAvgY}
              stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3" opacity="0.45" />
            <text x={VW - pr + 4} y={cAvgY + 2.5} fontSize="6.5" fill="var(--accent)"
              fontFamily="var(--font-num)" fontWeight="700" opacity="0.9">
              {sessionAvg.toFixed(2)}s
            </text>
            <text x={VW - pr + 4} y={cAvgY + 10} fontSize="5" fill="var(--accent)" opacity="0.5">Ø</text>

            {/* connecting line through correct taps */}
            {cPoints && (
              <polyline points={cPoints} fill="none"
                stroke="var(--accent)" strokeWidth="1.3" opacity="0.25" strokeLinejoin="round" />
            )}

            {/* dots */}
            {taps.map((tap, i) => {
              if (!tap.correct || tap.time == null) {
                return <circle key={i} cx={cToX(i)} cy={errY} r="2.8" fill="var(--rose)" opacity="0.85" />
              }
              return (
                <circle key={i} cx={cToX(i)} cy={cToY(tap.time)} r="2.8"
                  fill={tap.time <= sessionAvg ? 'var(--emerald)' : 'var(--accent)'} opacity="0.9" />
              )
            })}

            {/* error zone separator */}
            {taps.some(t => !t.correct) && (
              <>
                <line x1={pl} x2={VW - pr} y1={VH - pb + 2} y2={VH - pb + 2}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                <text x={pl} y={VH - 1} fontSize="5" fill="var(--rose)" opacity="0.5">Fehler</text>
              </>
            )}
          </svg>
          <div className={s.auswFooter}>
            <div className={s.auswStat}>
              <div className={s.auswVal}>{sessionAvg.toFixed(2)}s</div>
              <div className={s.auswLbl}>Ø Session</div>
            </div>
            <div className={s.auswStat}>
              <div className={s.auswVal}>{hitTimes.length > 0 ? Math.min(...hitTimes).toFixed(2) : '—'}s</div>
              <div className={s.auswLbl}>Beste</div>
            </div>
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
