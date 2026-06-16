import { MODULE_CONFIG } from './moduleConfig'
import { getDelta, getModuleSessions, bestMetric, barFraction } from './sessionStore'
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

export default function Results({ session, fromArchive = false, onBack }) {
  const m        = MODULE_CONFIG[session.moduleId]
  const hib      = m.higherIsBetter ?? false
  const delta    = getDelta(session.moduleId, session.mainMetric)
  const last7    = getModuleSessions(session.moduleId).slice(-7)
  const last7Best = last7.length > 0 ? bestMetric(last7.map(x => x.mainMetric), hib) : 0

  const checkin  = session.checkinId ? loadCheckin(session.date) : null

  const taps       = session.taps ?? []
  const hitTimes   = taps.filter(t => t.correct && t.time != null).map(t => t.time)
  const sessionAvg = avg(hitTimes)

  // Trefferbilanz für Genauigkeits-Spiele (ohne Reaktionszeit-Verlauf)
  const accuracy = (() => {
    const sc = session.score ?? {}
    if (session.moduleId === 'geteilt')
      return { hits: (sc.visualHits ?? 0) + (sc.audioHits ?? 0), misses: sc.misses ?? 0, fa: sc.errors ?? 0 }
    if (sc.hits != null)
      return { hits: sc.hits, misses: sc.misses ?? 0, fa: sc.errors ?? sc.falseAlarms ?? 0 }
    return null
  })()
  const showAccuracy = hitTimes.length <= 1 && accuracy && (accuracy.hits + accuracy.misses + accuracy.fa) > 0

  // SVG chart constants
  const VW = 300, VH = 80
  const pl = 27, pr = 46, pt = 8, pb = 20
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
                <span className={s.checkinIcon}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                </span>
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
                  style={{ height: `${Math.max(15, Math.min(100, barFraction(sess.mainMetric, last7Best, hib) * 100))}%` }}
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

          {session.moduleId === 'zahlensuche' ? (
            // ── Zahlensuche: Balken pro Zahl (Zeit) mit Y-Skala ──────────
            (() => {
              const bVW = 300, bVH = 84
              const bPl = 22, bPr = 4, bPt = 6, bPb = 16  // links Platz für Y-Achse
              const bIW = bVW - bPl - bPr, bIH = bVH - bPt - bPb
              const total = session.score?.total ?? hitTimes.length
              const slots = Array.from({ length: total }, (_, i) => {
                const correctTap = taps.find(t => t.correct && t.index === i)
                const hasErr     = taps.some(t => !t.correct && t.index === i)
                return { i, time: correctTap?.time ?? null, hasErr }
              })
              const maxTime = Math.max(...slots.map(sl => sl.time ?? 0), sessionAvg) || 1
              const bW    = (bIW / total) * 0.72
              const bGap  = (bIW / total) * 0.28
              const toX   = i => bPl + i * (bIW / total) + bGap / 2
              const toH   = t => Math.max(2, (t / maxTime) * bIH)
              const toY   = t => bPt + bIH - (t / maxTime) * bIH
              const avgY  = toY(sessionAvg)

              // Y-Achse: 3 saubere Ticks (0, Mitte, Max — aufgerundet)
              const tickMax  = Math.ceil(maxTime * 10) / 10
              const tickMid  = Math.round(tickMax / 2 * 10) / 10
              const yTicks   = [{ val: 0, y: bPt + bIH }, { val: tickMid, y: toY(tickMid) }, { val: tickMax, y: toY(tickMax) }]

              return (
                <svg className={s.chart} viewBox={`0 0 ${bVW} ${bVH}`}>
                  {/* Y-Achse Linie */}
                  <line x1={bPl} x2={bPl} y1={bPt} y2={bPt + bIH}
                    stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                  {/* Y-Achse Ticks + Labels */}
                  {yTicks.map(({ val, y }) => (
                    <g key={val}>
                      <line x1={bPl - 2} x2={bPl} y1={y} y2={y}
                        stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                      <text x={bPl - 4} y={y + 2} fontSize="5.5" fill="rgba(255,255,255,0.35)"
                        textAnchor="end" fontFamily="var(--font-num)">
                        {val === 0 ? '0' : `${val}s`}
                      </text>
                      {val > 0 && (
                        <line x1={bPl} x2={bPl + bIW} y1={y} y2={y}
                          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                      )}
                    </g>
                  ))}

                  {/* Ø-Linie */}
                  <line x1={bPl} x2={bPl + bIW} y1={avgY} y2={avgY}
                    stroke="var(--accent)" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.5" />
                  <text x={bPl + bIW + 2} y={avgY + 2} fontSize="5" fill="var(--accent)"
                    fontFamily="var(--font-num)" opacity="0.7">Ø</text>

                  {/* Balken */}
                  {slots.map(({ i, time, hasErr }) => {
                    const x = toX(i)
                    const h = time != null ? toH(time) : 0
                    const y = bPt + bIH - h
                    const fill = time == null ? 'rgba(255,255,255,0.08)'
                      : time <= sessionAvg ? 'var(--emerald)' : 'var(--accent)'
                    return (
                      <g key={i}>
                        <rect x={x} y={y} width={bW} height={Math.max(h, 2)}
                          fill={fill} opacity={time == null ? 0.3 : 0.85} rx="1" />
                        {hasErr && (
                          <circle cx={x + bW / 2} cy={bPt + bIH + 5} r="1.5"
                            fill="var(--rose)" opacity="0.9" />
                        )}
                      </g>
                    )
                  })}

                  {/* X-Achse: Zahl-Label alle 5 */}
                  {slots.filter(sl => sl.i % 5 === 0).map(({ i }) => (
                    <text key={i} x={toX(i) + bW / 2} y={bVH - 3}
                      fontSize="5" fill="rgba(255,255,255,0.25)"
                      textAnchor="middle" fontFamily="var(--font-num)">
                      {i + 1}
                    </text>
                  ))}

                  {/* X-Achse Label */}
                  <text x={bPl + bIW / 2} y={bVH} fontSize="4.5"
                    fill="rgba(255,255,255,0.18)" textAnchor="middle">
                    Zahl
                  </text>
                </svg>
              )
            })()
          ) : (
          // ── Reaktionszeit-Scatter mit Y-Skala (Sekunden) ───────────────
          (() => {
            const tickLo  = Math.min(...hitTimes)
            const tickHi  = Math.max(...hitTimes)
            const tickMid = (tickLo + tickHi) / 2
            const yTicks  = [tickLo, tickMid, tickHi].map(val => ({ val, y: cToY(val) }))

            return (
              <svg className={s.chart} viewBox={`0 0 ${VW} ${VH}`}>
                {/* Y-Achse + Skala */}
                <line x1={pl} x2={pl} y1={pt} y2={pt + iH}
                  stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                {yTicks.map(({ val, y }) => (
                  <g key={val}>
                    <line x1={pl} x2={VW - pr} y1={y} y2={y}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                    <line x1={pl - 2} x2={pl} y1={y} y2={y}
                      stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                    <text x={pl - 4} y={y + 2} fontSize="5.5" fill="rgba(255,255,255,0.4)"
                      textAnchor="end" fontFamily="var(--font-num)">
                      {val.toFixed(2)}s
                    </text>
                  </g>
                ))}

                {/* Ø-Linie */}
                <line x1={pl} x2={VW - pr} y1={cAvgY} y2={cAvgY}
                  stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3" opacity="0.45" />
                <text x={VW - pr + 4} y={cAvgY + 2.5} fontSize="6.5" fill="var(--accent)"
                  fontFamily="var(--font-num)" fontWeight="700" opacity="0.9">
                  {sessionAvg.toFixed(2)}s
                </text>
                <text x={VW - pr + 4} y={cAvgY + 10} fontSize="5" fill="var(--accent)" opacity="0.5">Ø</text>

                {cPoints && (
                  <polyline points={cPoints} fill="none"
                    stroke="var(--accent)" strokeWidth="1.3" opacity="0.25" strokeLinejoin="round" />
                )}
                {taps.map((tap, i) => {
                  if (!tap.correct || tap.time == null) {
                    return <circle key={i} cx={cToX(i)} cy={errY} r="2.8" fill="var(--rose)" opacity="0.85" />
                  }
                  return (
                    <circle key={i} cx={cToX(i)} cy={cToY(tap.time)} r="2.8"
                      fill={tap.time <= sessionAvg ? 'var(--emerald)' : 'var(--accent)'} opacity="0.9" />
                  )
                })}
                {taps.some(t => !t.correct) && (
                  <>
                    <line x1={pl} x2={VW - pr} y1={VH - pb + 2} y2={VH - pb + 2}
                      stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                    <text x={pl} y={VH - 1} fontSize="5" fill="var(--rose)" opacity="0.5">Fehler</text>
                  </>
                )}
              </svg>
            )
          })()
          )}

          <div className={s.auswFooter}>
            <div className={s.auswStat}>
              <div className={s.auswVal}>{sessionAvg.toFixed(2)}s</div>
              <div className={s.auswLbl}>Ø / Zahl</div>
            </div>
            <div className={s.auswStat}>
              <div className={s.auswVal}>{hitTimes.length > 0 ? Math.min(...hitTimes).toFixed(2) : '—'}s</div>
              <div className={s.auswLbl}>Schnellste</div>
            </div>
            <div className={s.auswLegend}>
              <span className={s.legendDot} style={{ background: 'var(--emerald)' }} />schnell
              <span className={s.legendDot} style={{ background: 'var(--accent)' }} />langsam
              {taps.some(t => !t.correct) && (
                <><span className={s.legendDot} style={{ background: 'var(--rose)' }} />Fehler</>
              )}
            </div>
          </div>
        </div>
      )}

      {showAccuracy && (
        <div className={s.auswertung}>
          <div className={s.auswLabel}>Trefferbilanz</div>
          <div className={s.accBar}>
            {accuracy.hits   > 0 && <div className={s.accSegHit}   style={{ flex: accuracy.hits }} />}
            {accuracy.misses > 0 && <div className={s.accSegMiss}  style={{ flex: accuracy.misses }} />}
            {accuracy.fa     > 0 && <div className={s.accSegFa}    style={{ flex: accuracy.fa }} />}
          </div>
          <div className={s.accLegend}>
            <span className={s.accItem}><span className={s.accDot} style={{ background: 'var(--emerald)' }} />Treffer {accuracy.hits}</span>
            <span className={s.accItem}><span className={s.accDot} style={{ background: 'var(--text-faint)' }} />Verpasst {accuracy.misses}</span>
            <span className={s.accItem}><span className={s.accDot} style={{ background: 'var(--rose)' }} />Fehltipp {accuracy.fa}</span>
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
