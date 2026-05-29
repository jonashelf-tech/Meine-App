import { useState, useCallback, useEffect, useRef } from 'react'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { useAppStore } from '../../../store'
import { ToolIcon } from '../toolRegistry'
import { MODULE_CONFIG } from './moduleConfig'
import { isDoneToday, saveSession, markPracticeUsed } from './sessionStore'
import { isCheckinDoneToday } from './checkinStore'
import CheckinModal     from './CheckinModal'
import KognitivSettings from './KognitivSettings'
import ModuleList from './ModuleList'
import Briefing   from './Briefing'
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
import CptExercise              from './exercises/CptExercise'
import SelektivExercise         from './exercises/SelektivExercise'
import GeteilteExercise         from './exercises/GeteilteExercise'
import s from './TabKognitiv.module.css'

// Nav screens: null = tabs visible
// 'briefing' | 'done-today' | 'exercise' | 'results' | 'module-detail' | 'session-detail'

export default function TabKognitiv({ onBack, onExercising }) {
  const [tab, setTab] = useState('modules')
  const [nav, setNav] = useState(null)
  const [countdown, setCountdown] = useState(null) // 3 | 2 | 1 | null
  const pendingExerciseRef = useRef(null)
  const { setDays, kognitivAutoStart, setKognitivAutoStart, setBackInterceptor } = useAppStore()

  const isTraining = nav?.screen === 'exercise' || countdown !== null
  useEffect(() => { onExercising?.(isTraining) }, [isTraining, onExercising])

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

  const handleSaveToCalendar = useCallback((session) => {
    const m       = MODULE_CONFIG[session.moduleId]
    const hour    = new Date(session.startedAt).getHours()
    const slotKey = String(hour)
    setDays(prev => ({
      ...prev,
      [session.date]: {
        ...(prev[session.date] ?? {}),
        [slotKey]: {
          text:     `Kognitiv: ${m.name} (${session.mainMetric}${m.mainMetricUnit})`,
          color:    '#8B5CF6',
          duration: Math.max(1, Math.ceil(session.duration / 60)),
          locked:   true,
          done:     true,
          toolId:   'kognitiv',
        },
      },
    }))
  }, [setDays])

  const handleSelectModule = useCallback((moduleId) => {
    if (isDoneToday(moduleId)) {
      setNav({ screen: 'done-today', moduleId })
    } else if (!isCheckinDoneToday()) {
      setNav({ screen: 'checkin', moduleId })
    } else {
      setNav({ screen: 'briefing', moduleId })
    }
  }, [])

  if (nav?.screen === 'checkin') {
    return (
      <CheckinModal
        onSave={() => setNav({ screen: 'briefing', moduleId: nav.moduleId })}
        onSkip={() => setNav({ screen: 'briefing', moduleId: nav.moduleId })}
      />
    )
  }

  if (countdown !== null) {
    return (
      <div className={s.countdown}>
        <div key={countdown} className={s.countdownNum}>{countdown}</div>
        <div className={s.countdownLabel}>gleich geht's los</div>
      </div>
    )
  }

  if (nav?.screen === 'briefing') {
    return <Briefing
      moduleId={nav.moduleId}
      onBack={goBack}
      onStart={(variant) => startWithCountdown({ screen: 'exercise', moduleId: nav.moduleId, variant })}
      onPractice={(variant) => {
        markPracticeUsed(nav.moduleId)
        startWithCountdown({ screen: 'exercise', moduleId: nav.moduleId, variant, practice: true })
      }}
    />
  }
  if (nav?.screen === 'done-today') {
    return <DoneToday
      moduleId={nav.moduleId}
      onBack={goBack}
      onViewResult={(session) => setNav({ screen: 'results', session, fromArchive: true })}
      onPractice={() => {
        const defaultVariant = MODULE_CONFIG[nav.moduleId].defaultVariant
        markPracticeUsed(nav.moduleId)
        startWithCountdown({ screen: 'exercise', moduleId: nav.moduleId, variant: defaultVariant, practice: true })
      }}
    />
  }
  if (nav?.screen === 'exercise') {
    const ExMap = {
      alertness:      AlertnessExercise,
      zahlensuche:    ZahlensucheExercise,
      gedaechtnis:    GedaechtnisExercise,
      gonogo:         GoNoGoExercise,
      nback:          NBackExercise,
      taskswitching:  TaskSwitchingExercise,
      cpt:            CptExercise,
      selektiv:       SelektivExercise,
      geteilt:        GeteilteExercise,
    }
    const Ex = ExMap[nav.moduleId]
    if (Ex) return <Ex
      variant={nav.variant}
      onDone={(session) => setNav({ screen: 'results', session, fromArchive: nav.practice ?? false })}
      onAbort={goBack}
    />
    return <div className={s.placeholder}>Exercise {nav.moduleId} — noch nicht implementiert</div>
  }
  if (nav?.screen === 'results') {
    if (!nav.fromArchive && !nav.saved) {
      saveSession(nav.session)
      setNav(prev => ({ ...prev, saved: true }))
    }
    return <Results
      session={nav.session}
      fromArchive={nav.fromArchive}
      onBack={goBack}
      onSaveToCalendar={handleSaveToCalendar}
    />
  }
  if (nav?.screen === 'module-detail') {
    return <ModuleDetail
      moduleId={nav.moduleId}
      onBack={goBack}
      onSelectSession={(session) => setNav({ screen: 'results', session, fromArchive: true })}
    />
  }
  if (nav?.screen === 'session-detail') {
    return <SessionDetail session={nav.session} onBack={goBack} />
  }

  return (
    <div className={s.root}>
      <ToolHeader onBack={onBack} icon={<ToolIcon id="kognitiv" size={20} />} eyebrow="Tool" title="Kognitiv" />
      <div className={s.tabBar}>
        <button className={[s.tabBtn, tab === 'modules'   ? s.tabOn : ''].join(' ')} onClick={() => setTab('modules')}>Module</button>
        <button className={[s.tabBtn, tab === 'dashboard' ? s.tabOn : ''].join(' ')} onClick={() => setTab('dashboard')}>Dashboard</button>
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
