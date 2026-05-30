import { useState, useEffect } from 'react'
import { useAppStore } from './store'
import { hexToGlow } from './utils'
import { TOOL_TAB } from './features/tools/toolTabs'
import { saveAutoBackup } from './storage'
import styles from './App.module.css'
import TabHeute        from './features/calendar/TabHeute/TabHeute'
import TabKalender     from './features/calendar/TabKalender/TabKalender'
import TabTools        from './features/tools/TabTools/TabTools'
import TabSettings     from './features/settings/TabSettings/TabSettings'
import TabGeburtstage  from './features/tools/geburtstage/TabGeburtstage'
import TabTimer        from './features/tools/timer/TabTimer'
import TabRezepte      from './features/tools/rezepte/TabRezepte'
import TabPizza        from './features/tools/pizza/TabPizza'
import TabElvi         from './features/tools/elvi/TabElvi'
import TabGewicht      from './features/tools/gewicht/TabGewicht'
import TabErfolge      from './features/tools/erfolge/TabErfolge'
import TabRad          from './features/tools/rad/TabRad'
import TabReminder     from './features/tools/reminder/TabReminder'
import TabHaushalt     from './features/tools/haushalt/TabHaushalt'
import TabWasJetzt     from './features/tools/wasjetzt/TabWasJetzt'
import TabKlaeren      from './features/tools/klaeren/TabKlaeren'
import TabKognitiv     from './features/tools/kognitiv/TabKognitiv'
import TabProjekte     from './features/tools/projekte/TabProjekte'
import TodoModal       from './components/TodoModal/TodoModal'
import ErrorBoundary   from './components/ErrorBoundary/ErrorBoundary'
import BackupNudge     from './components/BackupNudge/BackupNudge'

// ─── Tab bar SVG icons ────────────────────────────────────
const IconTagesplaner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2"/>
    <polyline points="9 11 11 13 15 9"/>
    <line x1="9" y1="17" x2="15" y2="17"/>
  </svg>
)

const IconKalender = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="8" y1="4" x2="8" y2="9"/>
    <line x1="16" y1="4" x2="16" y2="9"/>
    <rect x="7" y="13" width="2" height="2" rx="0.3" fill="currentColor" stroke="none"/>
    <rect x="11" y="13" width="2" height="2" rx="0.3" fill="currentColor" stroke="none"/>
    <rect x="15" y="13" width="2" height="2" rx="0.3" fill="currentColor" stroke="none"/>
    <rect x="7" y="17" width="2" height="2" rx="0.3" fill="currentColor" stroke="none"/>
    <rect x="11" y="17" width="2" height="2" rx="0.3" fill="currentColor" stroke="none"/>
  </svg>
)

const IconTools = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
)

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
    <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
    <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
  </svg>
)

const TABS = [
  { id: 0, label: 'Tagesplaner', Icon: IconTagesplaner },
  { id: 1, label: 'Kalender',    Icon: IconKalender    },
  { id: 2, label: 'Tools',       Icon: IconTools       },
  { id: 3, label: 'Einst.',      Icon: IconSettings    },
]

const TOOL_IDS = new Set(Object.values(TOOL_TAB))

export default function App() {
  const { currentTab, previousTab, setCurrentTab, accentColor, theme } = useAppStore()
  const [addOpen, setAddOpen] = useState(false)
  const [exercising, setExercising] = useState(false)

  useEffect(() => { saveAutoBackup() }, [])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') saveAutoBackup() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', accentColor)
    document.documentElement.style.setProperty('--glow-primary', hexToGlow(accentColor))
  }, [accentColor])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'dark')
  }, [theme])

  const goBack = () => setCurrentTab(previousTab ?? 2)
  const isToolTab = TOOL_IDS.has(currentTab)

  useEffect(() => {
    history.pushState(null, '')
    const handlePop = () => {
      history.pushState(null, '')
      const { previousTab: prev, backInterceptor } = useAppStore.getState()
      if (backInterceptor) {
        backInterceptor()
      } else {
        setCurrentTab(prev ?? 2)
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [setCurrentTab])

  return (
    <div className={styles.app}>
      <div className={styles.content}>
        {currentTab === 0 && <BackupNudge />}
        <ErrorBoundary key={currentTab}>
        {currentTab === 0  && <TabHeute />}
        {currentTab === 1  && <TabKalender />}
        {currentTab === 2  && <TabTools />}
        {currentTab === 3  && <TabSettings />}
        {currentTab === TOOL_TAB.geburtstage  && <TabGeburtstage  onBack={goBack} />}
        {currentTab === TOOL_TAB.timer        && <TabTimer        onBack={goBack} />}
        {currentTab === TOOL_TAB.rezepte      && <TabRezepte      onBack={goBack} />}
        {currentTab === TOOL_TAB.pizza        && <TabPizza        onBack={goBack} />}
        {currentTab === TOOL_TAB.elvi         && <TabElvi         onBack={goBack} />}
        {currentTab === TOOL_TAB.gewicht      && <TabGewicht      onBack={goBack} />}
        {currentTab === TOOL_TAB.erfolge      && <TabErfolge      onBack={goBack} />}
        {currentTab === TOOL_TAB.rad          && <TabRad          onBack={goBack} />}
        {currentTab === TOOL_TAB.reminder     && <TabReminder     onBack={goBack} />}
        {currentTab === TOOL_TAB.haushalt     && <TabHaushalt     onBack={goBack} />}
        {currentTab === TOOL_TAB.wasjetzt     && <TabWasJetzt     onBack={goBack} />}
        {currentTab === TOOL_TAB.klaeren      && <TabKlaeren      onBack={goBack} />}
        {currentTab === TOOL_TAB.kognitiv     && <TabKognitiv     onBack={goBack} onExercising={setExercising} />}
        {currentTab === TOOL_TAB.projekte     && <TabProjekte     onBack={goBack} />}
        </ErrorBoundary>
      </div>

      {!isToolTab && currentTab !== 3 && (
        <button
          className={styles.fab}
          onClick={() => setAddOpen(true)}
          aria-label="Todo hinzufügen"
        >
          +
        </button>
      )}

      {addOpen && <TodoModal onClose={() => setAddOpen(false)} />}

      {!exercising && <nav className={styles.tabBar}>
        {TABS.map(({ id, label, Icon }) => {
          const active = currentTab === id || (id === 2 && isToolTab)
          return (
            <button
              key={id}
              className={`${styles.tabBtn}${active ? ' ' + styles.active : ''}`}
              onClick={() => setCurrentTab(id)}
            >
              <span className={styles.tabIcon}><Icon /></span>
              <span className={styles.tabLabel}>{label}</span>
            </button>
          )
        })}
      </nav>}
    </div>
  )
}
