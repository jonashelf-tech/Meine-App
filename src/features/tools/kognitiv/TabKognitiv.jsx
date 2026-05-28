import { useState } from 'react'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { isDoneToday } from './sessionStore'
import ModuleList from './ModuleList'
import Briefing   from './Briefing'
import DoneToday  from './DoneToday'
import AlertnessExercise  from './exercises/AlertnessExercise'
import s from './TabKognitiv.module.css'

// Nav screens: null = tabs visible
// 'briefing' | 'done-today' | 'exercise' | 'results' | 'module-detail' | 'session-detail'

export default function TabKognitiv({ onBack }) {
  const [tab, setTab] = useState('modules')   // 'modules' | 'dashboard'
  const [nav, setNav] = useState(null)

  const goBack = () => setNav(null)

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
    const ExMap = { alertness: AlertnessExercise }
    const Ex = ExMap[nav.moduleId]
    if (Ex) return <Ex
      variant={nav.variant}
      onDone={(session) => setNav({ screen: 'results', session })}
      onAbort={goBack}
    />
    return <div className={s.placeholder}>Exercise {nav.moduleId} — noch nicht implementiert</div>
  }
  if (nav?.screen === 'results') {
    return <div className={s.placeholder}>Results</div>
  }
  if (nav?.screen === 'module-detail') {
    return <div className={s.placeholder}>ModuleDetail — {nav.moduleId}</div>
  }
  if (nav?.screen === 'session-detail') {
    return <div className={s.placeholder}>SessionDetail</div>
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
          : <div className={s.placeholder}>Dashboard kommt in Task 9</div>
        }
      </div>
    </div>
  )
}
