import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import s from './TabTimer.module.css'

// ─── Presets ───────────────────────────────────────────────
const NORMAL_PRESETS = [5, 10, 15, 20, 30, 45, 60]
const POM_WORK       = [5, 10, 15, 30, 45, 60]
const POM_BREAK      = [5, 10, 15, 20]

// ─── localStorage keys ─────────────────────────────────────
const LS_START   = 'adhs_timer_startTs'
const LS_TOTAL   = 'adhs_timer_totalSecs'
const LS_RUNNING = 'adhs_timer_running'

// ─── Audio helpers ─────────────────────────────────────────
const playDone = () => {
  try { if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 300]) } catch {}
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[[0, 660], [300, 880], [600, 1100]].forEach(([delay, freq]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime + delay / 1000)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay / 1000 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.5)
      osc.start(ctx.currentTime + delay / 1000)
      osc.stop(ctx.currentTime + delay / 1000 + 0.5)
    })
  } catch {}
}

const playBreakStart = () => {
  try { if (navigator.vibrate) navigator.vibrate([80, 50, 80]) } catch {}
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 528; osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(); osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

// ─── Component ─────────────────────────────────────────────
export default function TabTimer({ onBack }) {
  const { todos, setTodos, toolColors, setTimerAutoStart, setDays, setCurrentTab } = useAppStore()
  const toolColor = getToolColor('timer', toolColors)

  // Config state
  const [timerMode,  setTimerMode]  = useState('normal')  // "normal" | "pomodoro"
  const [pomWork,    setPomWork]    = useState(15)
  const [pomBreak,   setPomBreak]   = useState(5)

  // Runtime state
  const [pomPhase,   setPomPhase]   = useState('work')    // "work" | "break"
  const [pomCycles,  setPomCycles]  = useState(0)
  const [remaining,  setRemaining]  = useState(0)
  const [selected,   setSelected]   = useState(null)      // minutes selected / timer set
  const [isRunning,  setIsRunning]  = useState(false)
  const [done,       setDone]       = useState(false)
  const [manualMin,  setManualMin]  = useState('')
  const [manualPomWork,  setManualPomWork]  = useState('')
  const [manualPomBreak, setManualPomBreak] = useState('')

  // Todo picker
  const [focusTodoId,    setFocusTodoId]    = useState(null)
  const [showTodoPicker, setShowTodoPicker] = useState(false)

  // Play am Slot (Übergabe aus dem Tagesplaner) + geplant/gebraucht
  const [autoTask,   setAutoTask]   = useState(null)  // { todoId, text, color, duration, date, slotKey }
  const [usedMin,    setUsedMin]    = useState(null)  // gesetzt bei „Fertig" vor Ablauf
  const [plannedMin, setPlannedMin] = useState(null)
  const sessionStartRef = useRef(null)

  // Confirm dialogs
  const [confirmStop, setConfirmStop] = useState(false)
  const [confirmDone, setConfirmDone] = useState(false)

  // Refs (stale-closure prevention)
  const rafRef        = useRef(null)
  const startTsRef    = useRef(null)
  const totalSecsRef  = useRef(0)
  const pomBreakRef   = useRef(5)
  const timerModeRef  = useRef('normal')
  const phaseRef      = useRef('work')
  const cyclesRef     = useRef(0)

  // Keep refs in sync with state
  useEffect(() => { pomBreakRef.current   = pomBreak   }, [pomBreak])
  useEffect(() => { timerModeRef.current  = timerMode  }, [timerMode])

  // ─── Derived ─────────────────────────────────────────────
  const idle       = !isRunning && !done && selected === null
  const mins       = Math.floor(remaining / 60)
  const secs       = remaining % 60
  const totalSecs  = totalSecsRef.current || (selected ? selected * 60 : 0)
  const pct        = totalSecs > 0 ? Math.max(0, Math.min(1, remaining / totalSecs)) : 1

  const openTodos  = todos.filter(t => !t.done)
  const focusTodo  = focusTodoId ? todos.find(t => t.id === focusTodoId) : null

  const ringColor  = done
    ? '#00FF94'
    : pomPhase === 'break'
      ? '#00FF94'
      : isRunning
        ? 'var(--cyan)'
        : 'rgba(255,255,255,0.1)'

  const ringGlow   = isRunning && !done
    ? pomPhase === 'break'
      ? '0 0 32px rgba(0,255,148,0.4)'
      : '0 0 32px rgba(0,207,255,0.3)'
    : 'none'

  // ─── Tick ────────────────────────────────────────────────
  const tick = useCallback(() => {
    const ts    = startTsRef.current
    const total = totalSecsRef.current
    if (!ts) return

    const elapsed = Math.floor((Date.now() - ts) / 1000)
    const rem     = Math.max(0, total - elapsed)
    setRemaining(rem)

    if (rem === 0) {
      setIsRunning(false)
      localStorage.removeItem(LS_RUNNING)
      localStorage.removeItem(LS_START)
      localStorage.removeItem(LS_TOTAL)

      if (timerModeRef.current === 'pomodoro') {
        const wasWork = phaseRef.current === 'work'
        if (wasWork) {
          playBreakStart()
          phaseRef.current = 'break'
          setPomPhase('break')
          const bSecs       = pomBreakRef.current * 60
          const now         = Date.now()
          startTsRef.current  = now
          totalSecsRef.current = bSecs
          localStorage.setItem(LS_START,   String(now))
          localStorage.setItem(LS_TOTAL,   String(bSecs))
          localStorage.setItem(LS_RUNNING, '1')
          setRemaining(bSecs)
          setDone(false)
          setIsRunning(true)
          rafRef.current = setTimeout(tick, 500)
        } else {
          playDone()
          const nc = cyclesRef.current + 1
          cyclesRef.current = nc
          setPomCycles(nc)
          phaseRef.current = 'work'
          setPomPhase('work')
          setDone(true)
        }
      } else {
        playDone()
        setDone(true)
      }
      return
    }

    rafRef.current = setTimeout(tick, 500)
  }, []) // no deps — reads refs only

  // ─── Restore from localStorage on mount ──────────────────
  useEffect(() => {
    const savedStart   = localStorage.getItem(LS_START)
    const savedTotal   = localStorage.getItem(LS_TOTAL)
    const savedRunning = localStorage.getItem(LS_RUNNING)

    if (savedStart && savedTotal && savedRunning === '1') {
      const start = parseInt(savedStart, 10)
      const total = parseInt(savedTotal, 10)
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const rem     = Math.max(0, total - elapsed)

      startTsRef.current   = start
      totalSecsRef.current = total
      setRemaining(rem)
      setSelected(Math.ceil(total / 60))

      if (rem > 0) {
        setIsRunning(true)
        rafRef.current = setTimeout(tick, 500)
      } else {
        // Finished while tab was gone
        setDone(true)
        playDone()
        localStorage.removeItem(LS_RUNNING)
        localStorage.removeItem(LS_START)
        localStorage.removeItem(LS_TOTAL)
      }
    }

    return () => {
      if (rafRef.current) clearTimeout(rafRef.current)
    }
  }, [tick])

  // ─── Actions ─────────────────────────────────────────────
  const startTimer = (secs) => {
    if (rafRef.current) clearTimeout(rafRef.current)
    const now            = Date.now()
    startTsRef.current   = now
    totalSecsRef.current = secs
    sessionStartRef.current = now
    setUsedMin(null)
    setRemaining(secs)
    setDone(false)
    setIsRunning(true)
    setShowTodoPicker(false)
    localStorage.setItem(LS_START,   String(now))
    localStorage.setItem(LS_TOTAL,   String(secs))
    localStorage.setItem(LS_RUNNING, '1')
    rafRef.current = setTimeout(tick, 500)
  }

  const handleNormalStart = (mins) => {
    setSelected(mins)
    phaseRef.current  = 'work'
    cyclesRef.current = 0
    setPlannedMin(mins)
    setPomPhase('work')
    setPomCycles(0)
    startTimer(mins * 60)
  }

  const handlePomStart = () => {
    setSelected(pomWork)
    phaseRef.current  = 'work'
    cyclesRef.current = 0
    setPomPhase('work')
    setPomCycles(0)
    startTimer(pomWork * 60)
  }

  // Play am Slot: übergebenen Task einmalig konsumieren und sofort starten.
  // Läuft nach dem Restore-Effect — ein frischer Play-Tap gewinnt gegen
  // einen evtl. wiederhergestellten alten Timer.
  useEffect(() => {
    const at = useAppStore.getState().timerAutoStart
    if (!at) return
    setTimerAutoStart(null)
    setAutoTask(at)
    if (at.todoId) setFocusTodoId(at.todoId)
    setTimerMode('normal')
    handleNormalStart(at.duration)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✓ Fertig vor Ablauf: Restzeit weg, gebrauchte Zeit festhalten
  const finishEarly = () => {
    if (rafRef.current) clearTimeout(rafRef.current)
    const started = sessionStartRef.current
    setUsedMin(started ? Math.max(1, Math.round((Date.now() - started) / 60000)) : null)
    setIsRunning(false)
    setDone(true)
    playDone()
    localStorage.removeItem(LS_RUNNING)
    localStorage.removeItem(LS_START)
    localStorage.removeItem(LS_TOTAL)
  }

  const stop = () => {
    setConfirmStop(true)
  }

  const doStop = () => {
    if (rafRef.current) clearTimeout(rafRef.current)
    startTsRef.current   = null
    totalSecsRef.current = 0
    sessionStartRef.current = null
    setPlannedMin(null)
    setAutoTask(null)
    setUsedMin(null)
    setIsRunning(false)
    setSelected(null)
    setRemaining(0)
    setDone(false)
    phaseRef.current  = 'work'
    cyclesRef.current = 0
    setPomPhase('work')
    setPomCycles(0)
    setConfirmStop(false)
    localStorage.removeItem(LS_RUNNING)
    localStorage.removeItem(LS_START)
    localStorage.removeItem(LS_TOTAL)
  }

  const resume = () => {
    if (!selected) return
    const secs = remaining > 0 ? remaining : selected * 60
    startTimer(secs)
  }

  const again = () => {
    if (!selected) return
    setDone(false)
    phaseRef.current  = 'work'
    cyclesRef.current = 0
    setPomPhase('work')
    setPomCycles(0)
    startTimer(selected * 60)
  }

  const reset = () => {
    if (rafRef.current) clearTimeout(rafRef.current)
    startTsRef.current   = null
    totalSecsRef.current = 0
    sessionStartRef.current = null
    setPlannedMin(null)
    setAutoTask(null)
    setUsedMin(null)
    setIsRunning(false)
    setSelected(null)
    setRemaining(0)
    setDone(false)
    phaseRef.current  = 'work'
    cyclesRef.current = 0
    setPomPhase('work')
    setPomCycles(0)
    localStorage.removeItem(LS_RUNNING)
    localStorage.removeItem(LS_START)
    localStorage.removeItem(LS_TOTAL)
  }

  // When timer finishes and a task is set, show mark-done dialog.
  // Kam der Start aus einem Tool (returnTab gesetzt) → dorthin zurück statt Dialog.
  useEffect(() => {
    if (!done || timerMode !== 'normal') return
    if (autoTask?.returnTab != null) {
      const rt = autoTask.returnTab
      reset()
      setCurrentTab(rt)
      return
    }
    if (focusTodoId || autoTask) setConfirmDone(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, focusTodoId, autoTask, timerMode])

  const markTodoDone = () => {
    if (focusTodoId) {
      setTodos(prev => prev.map(t => t.id === focusTodoId ? { ...t, done: true, doneAt: new Date().toISOString() } : t))
    }
    // Slot im Tagesplaner mit abhaken, wenn der Start vom Play-Button kam
    if (autoTask?.date && autoTask.slotKey != null) {
      setDays(prev => {
        const day = prev[autoTask.date]
        if (!day?.[autoTask.slotKey]) return prev
        return {
          ...prev,
          [autoTask.date]: { ...day, [autoTask.slotKey]: { ...day[autoTask.slotKey], done: true } },
        }
      })
    }
    setFocusTodoId(null)
    setAutoTask(null)
    setConfirmDone(false)
  }

  const dismissConfirmDone = () => {
    setConfirmDone(false)
  }

  // ─── Ring circumference ──────────────────────────────────
  const R   = 86
  const C   = 2 * Math.PI * R

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>

      <ToolHeader
        onBack={onBack}
        icon="⏱"
        eyebrow="Tool"
        title={<>Fokus-<em>Timer</em></>}
        actions={pomCycles > 0 && <span className={s.cycles}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{display:'inline',verticalAlign:'text-bottom'}}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>×{pomCycles}</span>}
      />

      {/* ── Confirm: Stop ──────────────────────────────────── */}
      {confirmStop && (
        <div className={s.overlay} onClick={() => setConfirmStop(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle}>Timer stoppen?</div>
            <div className={s.modalBody}>Der aktuelle Fortschritt geht verloren.</div>
            <div className={s.modalBtns}>
              <button className={s.discardBtn} onClick={() => setConfirmStop(false)}>Weiter</button>
              <button className={s.confirmBtn} onClick={doStop}>Stoppen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm: Mark task done ─────────────────────────── */}
      {confirmDone && (focusTodo || autoTask) && (
        <div className={s.overlay} onClick={dismissConfirmDone}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle}>Super gemacht!</div>
            <div className={s.modalBody}>
              <span className={s.todoConfirmText}>{focusTodo?.text ?? autoTask?.text}</span>
              {plannedMin != null && (
                <span className={s.statsLine}>
                  geplant {plannedMin} min · {usedMin != null ? `gebraucht ${usedMin} min` : 'Zeit voll genutzt'}
                </span>
              )}
              als erledigt markieren?
            </div>
            <div className={s.modalBtns}>
              <button className={s.discardBtn} onClick={dismissConfirmDone}>Nicht jetzt</button>
              <button className={s.confirmBtn} onClick={markTodoDone}>Erledigt ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Task Banner ──────────────────────────────── */}
      {isRunning && (focusTodo || autoTask) && (
        <div
          className={s.activeTodoBanner}
          style={{ '--ft-color': (focusTodo?.color ?? autoTask?.color) || 'var(--cyan)' }}
        >
          <div className={s.bannerStripe} />
          <span className={s.bannerText}>{focusTodo?.text ?? autoTask?.text}</span>
        </div>
      )}

      {/* ── Timer Ring ─────────────────────────────────────── */}
      <div className={s.ringOuter}>
        <div
          className={s.ringWrap}
          style={{ boxShadow: ringGlow }}
        >
          <svg className={s.ring} viewBox="0 0 200 200">
            <circle
              cx="100" cy="100" r={R}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="8"
            />
            <circle
              cx="100" cy="100" r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.4s linear' }}
            />
          </svg>
          <div className={s.ringCenter}>
            <span className={s.timeDisplay}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            {pomPhase === 'break' && (
              <span className={s.phaseLbl}>Pause</span>
            )}
            {pomPhase === 'work' && isRunning && (
              <span className={s.phaseLbl}>Fokus</span>
            )}
            {done && <span className={s.doneLbl}>✓</span>}
          </div>
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────── */}
      <div className={s.controls}>
        {isRunning ? (
          <>
            {(focusTodo || autoTask) && pomPhase === 'work' && (
              <button className={s.finishBtn} onClick={finishEarly}>✓ Fertig</button>
            )}
            <button className={s.stopBtn} onClick={stop}>■ Stop</button>
          </>
        ) : (
          <>
            {selected && !done && (
              <button className={s.startBtn} onClick={resume}>▶ Weiter</button>
            )}
            {done && (
              <button className={s.startBtn} onClick={again}>↺ Nochmal</button>
            )}
            {(selected !== null || done) && (
              <button className={s.resetBtn} onClick={reset}>✕</button>
            )}
          </>
        )}
      </div>

      {/* ── Config Card — idle only ─────────────────────────── */}
      {idle && (
        <div className={s.configCard}>

          {/* Mode toggle */}
          <div className={s.modeRow}>
            <button
              className={[s.modeBtn, timerMode === 'normal' ? s.modeBtnActive : ''].join(' ')}
              onClick={() => setTimerMode('normal')}
            >
              ⏱ Timer
            </button>
            <button
              className={[s.modeBtn, timerMode === 'pomodoro' ? s.modeBtnActive : ''].join(' ')}
              onClick={() => setTimerMode('pomodoro')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{display:'inline',verticalAlign:'text-bottom',marginRight:'5px'}}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>Pomodoro
            </button>
          </div>

          {/* ── Normal mode ── */}
          {timerMode === 'normal' && (
            <>
              <div className={s.pomRow}>
                <div className={s.pills} style={{ flex: 1 }}>
                  {NORMAL_PRESETS.map(m => (
                    <button
                      key={m}
                      className={[s.pill, parseInt(manualMin, 10) === m ? s.pillActive : ''].join(' ')}
                      style={{ flex: 1 }}
                      onClick={() => setManualMin(String(m))}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  className={s.manualInput}
                  type="number"
                  min="1"
                  max="180"
                  placeholder="min"
                  value={manualMin}
                  onChange={e => setManualMin(e.target.value)}
                />
              </div>

              <button
                className={s.launchBtn}
                disabled={!manualMin || parseInt(manualMin, 10) < 1}
                onClick={() => {
                  const m = parseInt(manualMin, 10)
                  if (m > 0) { handleNormalStart(m); setManualMin('') }
                }}
              >
                ▶ Starten
              </button>
            </>
          )}

          {/* ── Pomodoro mode ── */}
          {timerMode === 'pomodoro' && (
            <>
              <div className={s.pomRow}>
                <span className={s.cfgLabel}>Fokus</span>
                <div className={s.pills} style={{ flex: 1 }}>
                  {POM_WORK.map(m => (
                    <button
                      key={m}
                      className={[s.pill, pomWork === m ? s.pillActive : ''].join(' ')}
                      style={{ flex: 1 }}
                      onClick={() => { setPomWork(m); setManualPomWork('') }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  className={s.manualInput}
                  type="number"
                  min="1"
                  max="180"
                  placeholder="min"
                  value={manualPomWork}
                  onChange={e => {
                    const v = e.target.value
                    setManualPomWork(v)
                    const m = parseInt(v, 10)
                    if (m > 0) setPomWork(m)
                  }}
                />
              </div>

              <div className={s.pomRow}>
                <span className={s.cfgLabel}>Pause</span>
                <div className={s.pills} style={{ flex: 1 }}>
                  {POM_BREAK.map(m => (
                    <button
                      key={m}
                      className={[s.pill, pomBreak === m ? s.pillActive : ''].join(' ')}
                      style={{ flex: 1 }}
                      onClick={() => { setPomBreak(m); pomBreakRef.current = m; setManualPomBreak('') }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  className={s.manualInput}
                  type="number"
                  min="1"
                  max="60"
                  placeholder="min"
                  value={manualPomBreak}
                  onChange={e => {
                    const v = e.target.value
                    setManualPomBreak(v)
                    const m = parseInt(v, 10)
                    if (m > 0) { setPomBreak(m); pomBreakRef.current = m }
                  }}
                />
              </div>

              <button className={s.launchBtn} onClick={handlePomStart}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{display:'inline',verticalAlign:'text-bottom',marginRight:'5px'}}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>Pomodoro starten — {pomWork}/{pomBreak} min
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Todo Picker — idle only ─────────────────────────── */}
      {idle && (
        <div className={s.todoSection}>
          <button
            className={s.todoToggle}
            onClick={() => setShowTodoPicker(p => !p)}
          >
            <span>{focusTodo ? focusTodo.text : 'Fokus-Todo wählen (optional)'}</span>
            <span>{showTodoPicker ? '▴' : '▾'}</span>
          </button>

          {showTodoPicker && (
            <div className={s.todoList}>
              {/* "No todo" option */}
              <button
                className={s.todoItem}
                onClick={() => { setFocusTodoId(null); setShowTodoPicker(false) }}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className={s.todoStripe} style={{ background: 'var(--text-dim)' }} />
                <span className={s.todoText} style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  — Ohne Todo
                </span>
              </button>

              {openTodos.length === 0 ? (
                <div className={s.todoEmpty}>Keine offenen Todos</div>
              ) : (
                openTodos.map(t => (
                  <button
                    key={t.id}
                    className={[s.todoItem, focusTodoId === t.id ? s.todoItemActive : ''].join(' ')}
                    onClick={() => { setFocusTodoId(t.id); setShowTodoPicker(false) }}
                  >
                    <div
                      className={s.todoStripe}
                      style={{ '--ft-color': t.color || 'var(--cyan)' }}
                    />
                    <span className={s.todoText}>{t.text}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
