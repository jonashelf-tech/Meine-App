import { useState, useMemo } from 'react'
import { getToolColor } from '../../../utils'
import { getBirthdaysForCalendarDate, formatBirthdayDate } from '../../tools/geburtstage/birthdayUtils'
import { loadElviDay } from '../../tools/elvi/elviData'
import { loadSessions as loadKognitivSessions, getDelta } from '../../tools/kognitiv/sessionStore'
import { getDaySummary as getGrowthDay } from '../../tools/growth/growthStore'
import { loadSessions as loadFitnessSessions, getExerciseById, loadFitness as loadFitnessAll } from '../../tools/fitness/fitnessStore'
import { MODULE_CONFIG } from '../../tools/kognitiv/moduleConfig'
import { TOOL_TAB } from '../../tools/toolTabs'
import s from './TabKalender.module.css'

const WORKING_TYPES = ['normal', 'dropset', 'failure']

function formatDur(secs) {
  const m = Math.floor(secs / 60)
  const sec = secs % 60
  return m > 0 ? `${m}min ${sec}s` : `${sec}s`
}

function fmtScore(sess) {
  const sc = sess.score
  if (!sc) return null
  if (sc.correct      != null) return `${sc.correct} korrekt · ${sc.errors ?? 0} Fehler`
  if (sc.hits         != null) return `${sc.hits} korrekt · ${sc.errors ?? 0} Fehler`
  if (sc.correctRounds != null) return `${sc.correctRounds} Runden korrekt`
  return null
}

function fmtDelta(moduleId, delta) {
  if (delta === null) return null
  const cfg  = MODULE_CONFIG[moduleId]
  const unit = cfg?.mainMetricUnit ?? ''
  const lowerIsBetter = ['ms', 's'].includes(unit)
  const improved = lowerIsBetter ? delta > 0 : delta < 0
  return { text: `${improved ? '−' : '+'}${Math.abs(delta)}${unit} vs. vorher`, improved }
}

// ─── Day Panel ────────────────────────────────────────────
export function DayPanel({ dateKey, todayKey, days, todos, toolColors, birthdays = [], weightEntry, activeTools = [], setCurrentTab, setDayplanDate, setGrowthOpenDate, restoreTodo, setRestoreTodo, handleRestore, initialOpen }) {
  const [open, setOpen] = useState(initialOpen ?? { zeitplan: true, done: false, kognitiv: false, gewicht: false, elvi: false, growth: false, fitness: false })

  const birthdayEntries = getBirthdaysForCalendarDate(birthdays, dateKey)

  const slots = days[dateKey] ?? {}
  const sortedSlots = Object.entries(slots)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))

  const doneTodos = todos.filter(t => t.doneAt?.startsWith(dateKey))
  const kognitivSessions = loadKognitivSessions().filter(sess => sess.date === dateKey)
  const kognitivColor = getToolColor('kognitiv', toolColors)
  const doneCount = doneTodos.length

  const elviDay = useMemo(() => loadElviDay(dateKey), [dateKey])
  const growthDay   = useMemo(
    () => activeTools.includes('growth') ? getGrowthDay(dateKey) : null,
    [dateKey, activeTools],
  )
  const growthColor = getToolColor('growth', toolColors)

  const fitnessSessions = useMemo(
    () => activeTools.includes('fitness') ? loadFitnessSessions().filter(sess => sess.date === dateKey) : [],
    [dateKey, activeTools]
  )
  const fitnessColor = getToolColor('fitness', toolColors)

  const [y, m, d] = dateKey.split('-')
  const dateObj  = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  const dayName  = dateObj.toLocaleDateString('de-DE', { weekday: 'long' })
  const label    = `${dayName}, ${d}.${m}.${y}`

  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  const totalZeitplan = sortedSlots.length + birthdayEntries.length

  return (
    <div className={s.dayPanel}>
      <div className={s.dayPanelHeader}>
        <span
          className={[s.dayPanelDate, s.dayPanelDateLink].join(' ')}
          onClick={() => { setDayplanDate(dateKey); setCurrentTab(0) }}
        >
          {label}
        </span>
        {dateKey === todayKey && <span className={s.todayBadge}>heute</span>}
      </div>

      {/* Zeitplan — Tool-Card */}
      <div className={s.toolCard} style={{ borderTop: '2px solid var(--primary)' }}>
        <div className={s.toolCardHead} onClick={() => toggle('zeitplan')}>
          <span className={s.toolCardTitle} style={{ color: 'var(--primary)' }}>Zeitplan</span>
          {totalZeitplan > 0 && (
            <span className={s.toolCardCount} style={{ color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
              {totalZeitplan}
            </span>
          )}
          <span className={s.toolCardArrow}>{open.zeitplan ? '▾' : '▸'}</span>
        </div>
        {open.zeitplan && (
          <div className={s.toolCardBody}>
            {birthdayEntries.map(b => (
              <div key={b.id} className={s.dayPanelAlldayEntry}>
                <span className={s.dayPanelAlldayStar}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#FF2D78" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/>
                  </svg>
                </span>
                <span className={s.dayPanelAlldayName}>{b.name} Geburtstag</span>
                <span className={s.dayPanelAlldayDate}>{formatBirthdayDate(b.date)}</span>
              </div>
            ))}
            {sortedSlots.length === 0 && birthdayEntries.length === 0 ? (
              <p className={s.dayPanelEmpty}>Keine Termine</p>
            ) : sortedSlots.map(([key, slot]) => {
              const hh     = String(Math.floor(parseFloat(key))).padStart(2, '0')
              const mm     = parseFloat(key) % 1 ? '30' : '00'
              const isTodo = Boolean(slot.todoId)
              const color  = slot.color || 'var(--primary)'
              return (
                <div
                  key={key}
                  className={[s.dayPanelEntry, isTodo ? s.dayPanelEntryTodo : ''].join(' ')}
                  style={{ borderLeftColor: color }}
                >
                  <span className={s.dayPanelEntryTime} style={{ color }}>{hh}:{mm}</span>
                  <span className={s.dayPanelEntryText}>{slot.text}</span>
                  {isTodo && <span className={s.dayPanelBadge}>Todo</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Erledigt — Tool-Card */}
      <div className={s.toolCard} style={{ borderTop: '2px solid var(--emerald)' }}>
        <div className={s.toolCardHead} onClick={() => toggle('done')}>
          <span className={s.toolCardTitle} style={{ color: 'var(--emerald)' }}>Erledigt</span>
          {doneCount > 0 && (
            <span className={s.toolCardCount} style={{ color: 'var(--emerald)', background: 'color-mix(in srgb, var(--emerald) 12%, transparent)' }}>
              {doneCount}
            </span>
          )}
          <span className={s.toolCardArrow}>{open.done ? '▾' : '▸'}</span>
        </div>
        {open.done && (
          <div className={s.toolCardBody}>
            {doneCount === 0 ? (
              <p className={s.dayPanelEmpty}>Keine erledigten Todos</p>
            ) : (
              doneTodos.map(t => (
                <div
                  key={t.id}
                  className={s.dayPanelTodoEntry}
                  style={{ borderLeftColor: t.color || 'var(--primary)' }}
                  onClick={() => setRestoreTodo(t)}
                >
                  <span className={s.dayPanelCheck}>✓</span>
                  <span className={s.dayPanelEntryText}>{t.text}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Kognitiv-Karte */}
      {kognitivSessions.length > 0 && (
        <div
          className={s.toolCard}
          style={{ borderTop: `2px solid ${kognitivColor}` }}
        >
          <div className={s.toolCardHead} onClick={() => toggle('kognitiv')}>
            <span className={s.toolCardTitle} style={{ color: kognitivColor }}>Kognitiv</span>
            <button
              className={s.toolCardOpenBtn}
              style={{ color: kognitivColor, background: `color-mix(in srgb, ${kognitivColor} 15%, transparent)` }}
              onClick={e => { e.stopPropagation(); setCurrentTab(TOOL_TAB.kognitiv) }}
            >
              → Öffnen
            </button>
            <span className={s.toolCardArrow}>{open.kognitiv ? '▾' : '▸'}</span>
          </div>
          {open.kognitiv && (
            <div className={s.toolCardBody}>
              {kognitivSessions.map(sess => {
                const cfg   = MODULE_CONFIG[sess.moduleId]
                const time  = new Date(sess.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                const score = fmtScore(sess)
                const delta = fmtDelta(sess.moduleId, getDelta(sess.moduleId, sess.mainMetric))
                return (
                  <div key={sess.id} className={s.cardEntry}>
                    <div className={s.cardEntryTop}>
                      <span className={s.cardEntryCheck} style={{ color: kognitivColor }}>✓</span>
                      <span className={s.cardEntryName}>{cfg?.name ?? sess.moduleId}</span>
                      <span className={s.cardEntryTime}>{time} · {formatDur(sess.duration)}</span>
                    </div>
                    <div className={s.cardTags}>
                      <span className={s.cardTag} style={{ background: `color-mix(in srgb, ${kognitivColor} 18%, transparent)`, color: kognitivColor }}>
                        {sess.mainMetric}{cfg?.mainMetricUnit ?? ''}
                      </span>
                      {score && <span className={s.cardTag}>{score}</span>}
                      {delta && (
                        <span className={[s.cardTag, delta.improved ? s.cardTagPos : s.cardTagNeg].join(' ')}>
                          {delta.text}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Gewicht-Karte */}
      {weightEntry && (
        <div
          className={s.toolCard}
          style={{ borderTop: `2px solid ${getToolColor('fitness', toolColors)}` }}
        >
          <div className={s.toolCardHead} onClick={() => toggle('gewicht')}>
            <span className={s.toolCardTitle} style={{ color: getToolColor('fitness', toolColors) }}>Gewicht</span>
            <button
              className={s.toolCardOpenBtn}
              style={{ color: getToolColor('fitness', toolColors), background: `color-mix(in srgb, ${getToolColor('fitness', toolColors)} 15%, transparent)` }}
              onClick={e => { e.stopPropagation(); setCurrentTab(TOOL_TAB.fitness) }}
            >
              → Öffnen
            </button>
            <span className={s.toolCardArrow}>{open.gewicht ? '▾' : '▸'}</span>
          </div>
          {open.gewicht && (
            <div className={s.toolCardBody}>
              <div className={s.gewCardRow}>
                <span className={s.gewVal} style={{ color: getToolColor('fitness', toolColors) }}>
                  {weightEntry.kg}
                </span>
                <span className={s.gewUnit}>kg</span>
                {weightEntry.kcal && (
                  <span className={s.gewKcal}>{weightEntry.kcal.toLocaleString('de-DE')} kcal</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Elvi-Karte */}
      {elviDay && (
        <div
          className={s.toolCard}
          style={{ borderTop: `2px solid ${getToolColor('elvi', toolColors)}` }}
        >
          <div className={s.toolCardHead} onClick={() => toggle('elvi')}>
            <span className={s.toolCardTitle} style={{ color: getToolColor('elvi', toolColors) }}>Elvi</span>
            <button
              className={s.toolCardOpenBtn}
              style={{ color: getToolColor('elvi', toolColors), background: `color-mix(in srgb, ${getToolColor('elvi', toolColors)} 15%, transparent)` }}
              onClick={e => { e.stopPropagation(); setCurrentTab(TOOL_TAB.elvi) }}
            >
              → Öffnen
            </button>
            <span className={s.toolCardArrow}>{open.elvi ? '▾' : '▸'}</span>
          </div>
          {open.elvi && (
            <div className={s.toolCardBody}>
              {elviDay.doses?.length > 0 && (
                <div className={s.elviDoses}>
                  {elviDay.doses.map((d, i) => (
                    <span
                      key={i}
                      className={s.elviDosePill}
                      style={{
                        color: getToolColor('elvi', toolColors),
                        background: `color-mix(in srgb, ${getToolColor('elvi', toolColors)} 18%, transparent)`,
                      }}
                    >
                      {d.mg}mg · {d.time}
                    </span>
                  ))}
                </div>
              )}
              {elviDay.ratings && (
                <div className={s.elviRatings}>
                  {[
                    { key: 'fokus',    label: 'Fokus'    },
                    { key: 'stimmung', label: 'Stimmung' },
                    { key: 'crash',    label: 'Crash'    },
                    { key: 'impulse',  label: 'Impuls'   },
                  ]
                    .filter(r => elviDay.ratings[r.key] != null)
                    .map(r => (
                      <span key={r.key} className={s.elviRatingTag}>
                        {r.label} {elviDay.ratings[r.key]}/10
                      </span>
                    ))
                  }
                </div>
              )}
              {elviDay.notes?.trim() && (
                <div className={s.elviNotes}>{elviDay.notes.trim()}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Growth-Karte */}
      {growthDay && (
        <div className={s.toolCard} style={{ borderTop: `2px solid ${growthColor}` }}>
          <div className={s.toolCardHead} onClick={() => toggle('growth')}>
            <span className={s.toolCardTitle} style={{ color: growthColor }}>Growth</span>
            <button
              className={s.toolCardOpenBtn}
              style={{ color: growthColor, background: `color-mix(in srgb, ${growthColor} 15%, transparent)` }}
              onClick={e => { e.stopPropagation(); setGrowthOpenDate?.(dateKey); setCurrentTab(TOOL_TAB.growth) }}
            >
              → Öffnen
            </button>
            <span className={s.toolCardArrow}>{open.growth ? '▾' : '▸'}</span>
          </div>
          {open.growth && (
            <div className={s.toolCardBody}>
              {growthDay.karten.map(k => (
                <div key={k.kartenId} className={s.elviNotes}>
                  <strong>{k.frage}</strong>
                  {(k.antwort ?? '').trim() ? ` — ${k.antwort}` : ' — ✓ erledigt'}
                </div>
              ))}
              {growthDay.freitext && <div className={s.elviNotes}>{growthDay.freitext}</div>}
            </div>
          )}
        </div>
      )}

      {/* Fitness-Karte */}
      {fitnessSessions.length > 0 && (
        <div className={s.toolCard} style={{ borderTop: `2px solid ${fitnessColor}` }}>
          <div className={s.toolCardHead} onClick={() => toggle('fitness')}>
            <span className={s.toolCardTitle} style={{ color: fitnessColor }}>Training</span>
            <button
              className={s.toolCardOpenBtn}
              style={{ color: fitnessColor, background: `color-mix(in srgb, ${fitnessColor} 15%, transparent)` }}
              onClick={e => { e.stopPropagation(); setCurrentTab(TOOL_TAB.fitness) }}
            >
              → Öffnen
            </button>
            <span className={s.toolCardArrow}>{open.fitness ? '▾' : '▸'}</span>
          </div>
          {open.fitness && (
            <div className={s.toolCardBody}>
              {fitnessSessions.map(sess => {
                const fitness = loadFitnessAll()
                const volume = sess.exercises?.reduce((sum, ex) => {
                  const working = (ex.saetze ?? []).filter(st => WORKING_TYPES.includes(st.satzTyp))
                  return sum + working.reduce((s2, st) => s2 + (st.gewicht ?? 0) * (st.wdh ?? 0), 0)
                }, 0) ?? 0
                const exCount = sess.exercises?.length ?? 0
                const minutes = Math.round((sess.durationSec ?? 0) / 60)
                return (
                  <div key={sess.id} className={s.elviNotes}>
                    {exCount} Übung{exCount === 1 ? '' : 'en'} · {volume.toLocaleString('de-DE')} kg Volumen · {minutes} min
                    {sess.prs?.length > 0 && ` · ${sess.prs.length} PR${sess.prs.length === 1 ? '' : 's'}`}
                    {sess.exercises?.length > 0 && (
                      <div className={s.elviDoses}>
                        {sess.exercises.map(ex => {
                          const exercise = getExerciseById(fitness, ex.exerciseId)
                          const workingCount = (ex.saetze ?? []).filter(st => WORKING_TYPES.includes(st.satzTyp)).length
                          return (
                            <span
                              key={ex.exerciseId}
                              className={s.elviDosePill}
                              style={{
                                color: fitnessColor,
                                background: `color-mix(in srgb, ${fitnessColor} 18%, transparent)`,
                              }}
                            >
                              {exercise?.name ?? ex.exerciseId} · {workingCount}×
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Restore-Modal */}
      {restoreTodo && (
        <div className={s.restoreOverlay} onClick={() => setRestoreTodo(null)}>
          <div className={s.restoreModal} onClick={e => e.stopPropagation()}>
            <p className={s.restoreTitle}>Wiederherstellen?</p>
            <p className={s.restoreText}>{restoreTodo.text}</p>
            <div className={s.restoreActions}>
              <button className={s.restoreBtnYes} onClick={() => handleRestore(restoreTodo)}>
                Ja
              </button>
              <button className={s.restoreBtnNo} onClick={() => setRestoreTodo(null)}>
                Nein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
