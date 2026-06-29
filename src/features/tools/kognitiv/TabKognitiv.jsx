import { useState, useCallback, useEffect, useRef } from 'react'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { useAppStore } from '../../../store'
import { ToolIcon } from '../toolRegistry'
import { MODULE_CONFIG } from './moduleConfig'
import { isDoneToday, saveSession } from './sessionStore'
import { getEinheitModules, isOnboardingDone } from './configStore'
import { isCheckinHandledToday, markCheckinSkipped } from './checkinStore'
import { EXERCISES } from './exercises/exerciseMap'
import CheckinModal     from './CheckinModal'
import KognitivSettings from './KognitivSettings'
import HeuteHero       from './HeuteHero'
import ModuleList      from './ModuleList'
import Briefing        from './Briefing'
import Onboarding      from './Onboarding'
import DoneToday       from './DoneToday'
import Results         from './Results'
import Auswertung      from './Auswertung'
import ModuleDetail    from './ModuleDetail'
import SessionDetail   from './SessionDetail'
import EinheitRunner   from './EinheitRunner'
import s from './TabKognitiv.module.css'

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
)

// Nav-Screens: null = Heute-Startseite. Sonst immersiv (Vollbild, untere Nav aus).
export default function TabKognitiv({ onBack, onExercising }) {
  const [nav, setNav]         = useState(null)
  const [countdown, setCountdown] = useState(null) // 3 | 2 | 1 | null (Einzelspiel)
  const [onboarded, setOnboarded] = useState(() => isOnboardingDone())
  const pendingExerciseRef = useRef(null)
  const { kognitivAutoStart, setKognitivAutoStart, setBackInterceptor } = useAppStore()

  const isImmersive = nav !== null || countdown !== null || !onboarded
  useEffect(() => { onExercising?.(isImmersive) }, [isImmersive, onExercising])

  useEffect(() => {
    setBackInterceptor(nav !== null ? () => setNav(null) : null)
    return () => setBackInterceptor(null)
  }, [nav, setBackInterceptor])

  const handleSelectModule = useCallback((moduleId) => {
    if (isDoneToday(moduleId)) setNav({ screen: 'done-today', moduleId })
    else if (!isCheckinHandledToday()) setNav({ screen: 'checkin', next: { screen: 'briefing', moduleId } })
    else setNav({ screen: 'briefing', moduleId })
  }, [])

  // ─── Auto-start aus dem Tagesplaner ─────────────────────
  useEffect(() => {
    if (!kognitivAutoStart) return
    const id = kognitivAutoStart
    setKognitivAutoStart(null)
    handleSelectModule(id)
  }, [kognitivAutoStart, setKognitivAutoStart, handleSelectModule])

  const goBack = () => setNav(null)

  const startWithCountdown = useCallback((navTarget) => {
    pendingExerciseRef.current = navTarget
    setCountdown(3)
    let n = 3
    const tick = setInterval(() => {
      n -= 1
      if (n <= 0) {
        clearInterval(tick)
        setCountdown(null)
        setNav(pendingExerciseRef.current)
        pendingExerciseRef.current = null
      } else {
        setCountdown(n)
      }
    }, 1000)
  }, [])

  const startEinheit = useCallback(() => {
    if (!isCheckinHandledToday()) setNav({ screen: 'checkin', next: { screen: 'einheit' } })
    else setNav({ screen: 'einheit' })
  }, [])

  if (!onboarded) {
    return <Onboarding onComplete={(startNow) => { setOnboarded(true); if (startNow) startEinheit() }} />
  }

  if (nav?.screen === 'checkin') {
    return (
      <CheckinModal
        onSave={() => setNav(nav.next)}
        onSkip={() => { markCheckinSkipped(); setNav(nav.next) }}
      />
    )
  }

  if (countdown !== null) {
    const cdColor = MODULE_CONFIG[pendingExerciseRef.current?.moduleId]?.color ?? 'var(--primary)'
    return (
      <div className={s.countdown}>
        <div key={countdown} className={s.countdownNum} style={{ color: cdColor }}>{countdown}</div>
        <div className={s.countdownLabel}>gleich geht's los</div>
      </div>
    )
  }

  if (nav?.screen === 'einheit') {
    return <EinheitRunner moduleIds={getEinheitModules()} onExit={goBack} />
  }

  if (nav?.screen === 'briefing') {
    return <div className={s.overlay}><Briefing
      moduleId={nav.moduleId}
      onBack={goBack}
      onStart={() => startWithCountdown({ screen: 'exercise', moduleId: nav.moduleId })}
    /></div>
  }
  if (nav?.screen === 'done-today') {
    return <div className={s.overlay}><DoneToday
      moduleId={nav.moduleId}
      onBack={goBack}
      onViewResult={(session) => setNav({ screen: 'results', session, fromArchive: true })}
      onRepeat={() => startWithCountdown({ screen: 'exercise', moduleId: nav.moduleId })}
    /></div>
  }
  if (nav?.screen === 'exercise') {
    const Ex = EXERCISES[nav.moduleId]
    if (Ex) return <Ex
      onDone={(session) => setNav({ screen: 'results', session, fromArchive: false })}
      onAbort={goBack}
    />
    return <div className={s.placeholder}>Übung {nav.moduleId} — noch nicht implementiert</div>
  }
  if (nav?.screen === 'results') {
    if (!nav.fromArchive && !nav.saved) {
      saveSession(nav.session)
      setNav(prev => ({ ...prev, saved: true }))
    }
    return <div className={s.overlay}><Results
      session={nav.session}
      fromArchive={nav.fromArchive}
      onBack={goBack}
    /></div>
  }
  if (nav?.screen === 'allmodules') {
    return (
      <div className={s.overlay}>
        <div className={s.subHead}>
          <button className={s.subBack} onClick={goBack}>← Zurück</button>
          <span className={s.subTitle}>Alle Module</span>
        </div>
        <div className={s.subBody}><ModuleList onSelectModule={handleSelectModule} /></div>
      </div>
    )
  }
  if (nav?.screen === 'auswertung') {
    return (
      <div className={s.overlay}>
        <div className={s.subHead}>
          <button className={s.subBack} onClick={goBack}>← Zurück</button>
          <span className={s.subTitle}>Auswertung</span>
        </div>
        <div className={s.subBody}><Auswertung
          onSelectModule={(id) => setNav({ screen: 'module-detail', moduleId: id })}
          onSelectSession={(session) => setNav({ screen: 'session-detail', session })}
        /></div>
      </div>
    )
  }
  if (nav?.screen === 'settings') {
    return (
      <div className={s.overlay}>
        <div className={s.subHead}>
          <button className={s.subBack} onClick={goBack}>← Zurück</button>
          <span className={s.subTitle}>Einstellungen</span>
        </div>
        <div className={s.subBody}><KognitivSettings /></div>
      </div>
    )
  }
  if (nav?.screen === 'module-detail') {
    return <div className={s.overlay}><ModuleDetail
      moduleId={nav.moduleId}
      onBack={goBack}
      onSelectSession={(session) => setNav({ screen: 'results', session, fromArchive: true })}
    /></div>
  }
  if (nav?.screen === 'session-detail') {
    return <div className={s.overlay}><SessionDetail session={nav.session} onBack={goBack} /></div>
  }

  return (
    <div className={s.root} style={{ '--tool-color': 'var(--primary)' }}>
      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="kognitiv" size={20} />}
        eyebrow="Tool"
        title="Kognitiv"
        actions={<button className={s.gear} onClick={() => setNav({ screen: 'settings' })} aria-label="Einstellungen"><GearIcon /></button>}
      />
      <div className={s.content}>
        <HeuteHero
          onStartEinheit={startEinheit}
          onOpenAllModules={() => setNav({ screen: 'allmodules' })}
          onOpenAuswertung={() => setNav({ screen: 'auswertung' })}
        />
      </div>
    </div>
  )
}
