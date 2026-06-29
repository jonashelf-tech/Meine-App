import { useState, useCallback, useEffect, useRef } from 'react'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { useAppStore } from '../../../store'
import { sv, lv, SK } from '../../../storage'
import { ToolIcon } from '../toolRegistry'
import { MODULE_CONFIG } from './moduleConfig'
import { isDoneToday, saveSession } from './sessionStore'
import { isCheckinHandledToday, markCheckinSkipped } from './checkinStore'
import CheckinModal     from './CheckinModal'
import KognitivSettings from './KognitivSettings'
import ModuleList from './ModuleList'
import Briefing   from './Briefing'
import KognitivBriefing from './KognitivBriefing'
import DoneToday  from './DoneToday'
import Results       from './Results'
import Dashboard     from './Dashboard'
import ModuleDetail  from './ModuleDetail'
import SessionDetail from './SessionDetail'
import AlertnessExercise        from './exercises/AlertnessExercise'
import ZahlensucheExercise      from './exercises/ZahlensucheExercise'
import GedaechtnisExercise      from './exercises/GedaechtnisExercise'
import GoNoGoExercise           from './exercises/GoNoGoExercise'
import NBackExercise            from './exercises/NBackExercise'
import TaskSwitchingExercise    from './exercises/TaskSwitchingExercise'
import GeteilteExercise         from './exercises/GeteilteExercise'
import StroopExercise           from './exercises/StroopExercise'
import SpeedSortExercise        from './exercises/SpeedSortExercise'
import s from './TabKognitiv.module.css'

// Nav screens: null = tabs visible
// 'briefing' | 'done-today' | 'exercise' | 'results' | 'module-detail' | 'session-detail'

export default function TabKognitiv({ onBack, onExercising }) {
  const [tab, setTab] = useState('modules')
  const [nav, setNav] = useState(null)
  const [countdown, setCountdown] = useState(null) // 3 | 2 | 1 | null
  const [introSeen, setIntroSeen] = useState(() => lv(SK.kognitivIntroSeen, false))
  const pendingExerciseRef = useRef(null)
  const { kognitivAutoStart, setKognitivAutoStart, setBackInterceptor } = useAppStore()

  // Sub-Screens (Erst-Briefing, Briefing, Übung, Auswertung …) sind immersiv: Vollbild + untere Nav aus.
  const isImmersive = nav !== null || countdown !== null || !introSeen
  useEffect(() => { onExercising?.(isImmersive) }, [isImmersive, onExercising])

  useEffect(() => {
    setBackInterceptor(nav !== null ? () => setNav(null) : null)
    return () => setBackInterceptor(null)
  }, [nav, setBackInterceptor])

  // ─── Auto-start from Tagesplaner ─────────────────────
  useEffect(() => {
    if (!kognitivAutoStart) return
    const id = kognitivAutoStart
    setKognitivAutoStart(null)
    handleSelectModule(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kognitivAutoStart])

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

  const handleSelectModule = useCallback((moduleId) => {
    if (isDoneToday(moduleId)) {
      setNav({ screen: 'done-today', moduleId })
    } else if (!isCheckinHandledToday()) {
      setNav({ screen: 'checkin', moduleId })
    } else {
      setNav({ screen: 'briefing', moduleId })
    }
  }, [])

  if (!introSeen) {
    return (
      <div className={s.overlay}>
        <KognitivBriefing onComplete={() => { sv(SK.kognitivIntroSeen, true); setIntroSeen(true) }} />
      </div>
    )
  }

  if (nav?.screen === 'checkin') {
    return (
      <CheckinModal
        onSave={() => setNav({ screen: 'briefing', moduleId: nav.moduleId })}
        onSkip={() => { markCheckinSkipped(); setNav({ screen: 'briefing', moduleId: nav.moduleId }) }}
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
    const ExMap = {
      alertness:      AlertnessExercise,
      zahlensuche:    ZahlensucheExercise,
      gedaechtnis:    GedaechtnisExercise,
      gonogo:         GoNoGoExercise,
      nback:          NBackExercise,
      taskswitching:  TaskSwitchingExercise,
      geteilt:        GeteilteExercise,
      stroop:         StroopExercise,
      speedsort:      SpeedSortExercise,
    }
    const Ex = ExMap[nav.moduleId]
    if (Ex) return <Ex
      onDone={(session) => setNav({ screen: 'results', session, fromArchive: false })}
      onAbort={goBack}
    />
    return <div className={s.placeholder}>Exercise {nav.moduleId} — noch nicht implementiert</div>
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
      <ToolHeader onBack={onBack} icon={<ToolIcon id="kognitiv" size={20} />} eyebrow="Tool" title="Kognitiv" />
      <div className={s.tabBar}>
        <button className={[s.tabBtn, tab === 'modules'   ? s.tabOn : ''].join(' ')} onClick={() => setTab('modules')}>Module</button>
        <button className={[s.tabBtn, tab === 'dashboard' ? s.tabOn : ''].join(' ')} onClick={() => setTab('dashboard')}>Statistik</button>
        <button className={[s.tabBtn, tab === 'settings'  ? s.tabOn : ''].join(' ')} onClick={() => setTab('settings')}>Einstellungen</button>
      </div>
      <div className={s.content}>
        {tab === 'modules'
          ? <ModuleList onSelectModule={handleSelectModule} />
          : tab === 'dashboard'
          ? <Dashboard onSelectModule={(id) => setNav({ screen: 'module-detail', moduleId: id })} />
          : <KognitivSettings />
        }
      </div>
    </div>
  )
}
