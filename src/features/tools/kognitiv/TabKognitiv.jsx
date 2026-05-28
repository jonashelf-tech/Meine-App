import { useState, useCallback } from 'react'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { useAppStore } from '../../../store'
import { ToolIcon } from '../toolRegistry'
import { MODULE_CONFIG } from './moduleConfig'
import { isDoneToday, saveSession } from './sessionStore'
import ModuleList from './ModuleList'
import Briefing   from './Briefing'
import DoneToday  from './DoneToday'
import Results       from './Results'
import Dashboard     from './Dashboard'
import ModuleDetail  from './ModuleDetail'
import SessionDetail from './SessionDetail'
import AlertnessExercise   from './exercises/AlertnessExercise'
import ZahlensucheExercise from './exercises/ZahlensucheExercise'
import GedaechtnisExercise from './exercises/GedaechtnisExercise'
import s from './TabKognitiv.module.css'

// Nav screens: null = tabs visible
// 'briefing' | 'done-today' | 'exercise' | 'results' | 'module-detail' | 'session-detail'

export default function TabKognitiv({ onBack }) {
  const [tab, setTab] = useState('modules')
  const [nav, setNav] = useState(null)
  const { setDays } = useAppStore()

  const goBack = () => setNav(null)

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

  const handleSelectModule = (moduleId) => {
    if (isDoneToday(moduleId)) {
      setNav({ screen: 'done-today', moduleId })
    } else {
      setNav({ screen: 'briefing', moduleId })
    }
  }

  if (nav?.screen === 'briefing') {
    return <Briefing
      moduleId={nav.moduleId}
      onBack={goBack}
      onStart={(variant) => setNav({ screen: 'exercise', moduleId: nav.moduleId, variant })}
    />
  }
  if (nav?.screen === 'done-today') {
    return <DoneToday
      moduleId={nav.moduleId}
      onBack={goBack}
      onViewResult={(session) => setNav({ screen: 'results', session, fromArchive: true })}
    />
  }
  if (nav?.screen === 'exercise') {
    const ExMap = { alertness: AlertnessExercise, zahlensuche: ZahlensucheExercise, gedaechtnis: GedaechtnisExercise }
    const Ex = ExMap[nav.moduleId]
    if (Ex) return <Ex
      variant={nav.variant}
      onDone={(session) => setNav({ screen: 'results', session })}
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
      onSelectSession={(session) => setNav({ screen: 'session-detail', session })}
    />
  }
  if (nav?.screen === 'session-detail') {
    return <SessionDetail session={nav.session} onBack={goBack} />
  }

  return (
    <div className={s.root}>
      <ToolHeader onBack={onBack} icon={<ToolIcon id="kognitiv" size={20} />} eyebrow="Tool" title="Kognitiv" />
      <div className={s.tabBar}>
        <button className={[s.tabBtn, tab === 'modules' ? s.tabOn : ''].join(' ')} onClick={() => setTab('modules')}>Module</button>
        <button className={[s.tabBtn, tab === 'dashboard' ? s.tabOn : ''].join(' ')} onClick={() => setTab('dashboard')}>Dashboard</button>
      </div>
      <div className={s.content}>
        {tab === 'modules'
          ? <ModuleList onSelectModule={handleSelectModule} />
          : <Dashboard onSelectModule={(id) => setNav({ screen: 'module-detail', moduleId: id })} />
        }
      </div>
    </div>
  )
}
