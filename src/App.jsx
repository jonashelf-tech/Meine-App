import { useAppStore } from './store'
import styles from './App.module.css'
import TabHeute       from './features/calendar/TabHeute/TabHeute'
import TabKalender    from './features/calendar/TabKalender/TabKalender'
import TabTools       from './features/tools/TabTools/TabTools'
import TabSettings    from './features/settings/TabSettings/TabSettings'
import TabGeburtstage from './features/tools/geburtstage/TabGeburtstage'

const TABS = [
  { id: 0, label: 'Heute',    icon: '◈' },
  { id: 1, label: 'Kalender', icon: '⊞' },
  { id: 2, label: 'Tools',    icon: '⚙' },
  { id: 3, label: 'Einstellungen', icon: '≡' },
]

export default function App() {
  const { currentTab, setCurrentTab } = useAppStore()

  return (
    <div className={styles.app}>
      <div className={styles.content}>
        {currentTab === 0 && <TabHeute />}
        {currentTab === 1 && <TabKalender />}
        {currentTab === 2 && <TabTools />}
        {currentTab === 3 && <TabSettings />}
        {currentTab === 4 && <TabGeburtstage />}
      </div>
      <nav className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn}${currentTab === t.id ? ' ' + styles.active : ''}`}
            onClick={() => setCurrentTab(t.id)}
          >
            <span className={styles.tabIcon}>{t.icon}</span>
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
