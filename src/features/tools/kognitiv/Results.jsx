import { useState } from 'react'
import { MODULE_CONFIG } from './moduleConfig'
import { getDelta, getModuleSessions } from './sessionStore'
import { loadCheckin } from './checkinStore'
import s from './Results.module.css'

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
  const [saved, setSaved] = useState(false)

  const m        = MODULE_CONFIG[session.moduleId]
  const delta    = getDelta(session.moduleId, session.mainMetric)
  const last7    = getModuleSessions(session.moduleId).slice(-7)

  const checkin  = session.checkinId ? loadCheckin(session.date) : null

  const taps     = session.taps ?? []
  const hitTimes = taps.filter(t => t.correct && t.time != null).map(t => t.time)
  const maxTime  = Math.max(...hitTimes, 1)

  const deltaLabel = delta !== null
    ? (delta > 0
        ? `▲ ${Math.abs(delta)}${m.mainMetricUnit} besser`
        : `▼ ${Math.abs(delta)}${m.mainMetricUnit} schlechter`)
    : null

  const handleSave = () => {
    setSaved(true)
    onSaveToCalendar(session)
  }

  return (
    <div className={s.root}>
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

      {hitTimes.length > 0 && (
        <div className={s.tapSection}>
          <div className={s.tapLabel}>Tipp-Zeiten</div>
          <div className={s.tapBars}>
            {taps.map((tap, i) => {
              const t     = tap.time ?? 0
              const h     = Math.max(10, Math.min(100, (t / maxTime) * 100))
              const color = !tap.correct ? 'var(--rose)'
                : t < maxTime * 0.4 ? 'var(--emerald)'
                : 'rgba(139,92,246,0.5)'
              return <div key={i} className={s.tapBar} style={{ height: `${h}%`, background: color }} />
            })}
          </div>
        </div>
      )}

      {taps.length > 0 && (
        <div className={s.tapDetail}>
          <div className={s.tapDetailLabel}>Jeder Tipp</div>
          {taps.map((tap, i) => (
            <div key={i} className={[s.tapRow, !tap.correct ? s.tapRowError : ''].join(' ')}>
              <div className={s.tapIdx}>{String(tap.target ?? i + 1).padStart(2, '0')}</div>
              <div className={s.tapBarWrap}>
                <div
                  className={s.tapBarInline}
                  style={{
                    width: `${Math.max(4, Math.min(100, ((tap.time ?? 0) / maxTime) * 100))}%`,
                    background: tap.correct ? 'var(--primary)' : 'var(--rose)',
                  }}
                />
              </div>
              <div className={s.tapTime} style={{ color: tap.correct ? 'var(--text-dim)' : 'var(--rose)' }}>
                {tap.time != null ? `${tap.time.toFixed(2)}s` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {!fromArchive && (
        <button
          className={[s.calBtn, saved ? s.calBtnSaved : ''].join(' ')}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? '✓ Gespeichert' : 'Einheit speichern'}
        </button>
      )}
      <button className={s.backBtn2} onClick={onBack}>
        {fromArchive ? 'Zurück' : 'Fertig'}
      </button>
      </div>
    </div>
  )
}
