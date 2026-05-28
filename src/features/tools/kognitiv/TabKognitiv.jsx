import { useState } from 'react'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { TOOL_TAB } from '../toolTabs'
import { useAppStore } from '../../../store'
import { ToolIcon } from '../toolRegistry'
import s from './TabKognitiv.module.css'

// Nav screens: null = tabs visible
// 'briefing' | 'done-today' | 'exercise' | 'results' | 'module-detail' | 'session-detail'

export default function TabKognitiv({ onBack }) {
  const [tab, setTab] = useState('modules')   // 'modules' | 'dashboard'
  const [nav, setNav] = useState(null)

  const goBack = () => setNav(null)

  if (nav?.screen === 'briefing') {
    return <div className={s.placeholder}>Briefing — {nav.moduleId}</div>
  }
  if (nav?.screen === 'done-today') {
    return <div className={s.placeholder}>DoneToday — {nav.moduleId}</div>
  }
  if (nav?.screen === 'exercise') {
    return <div className={s.placeholder}>Exercise — {nav.moduleId}</div>
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
          ? <div className={s.placeholder}>ModuleList kommt in Task 3</div>
          : <div className={s.placeholder}>Dashboard kommt in Task 9</div>
        }
      </div>
    </div>
  )
}
