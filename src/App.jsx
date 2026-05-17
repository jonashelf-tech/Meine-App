import { useState } from 'react'
import styles from './App.module.css'
import TabHeute from './features/calendar/TabHeute/TabHeute'

// Feature-Tabs (werden schrittweise gefüllt)
// import TabTodos from './features/todos/TabTodos'
// import TabKalender from './features/calendar/TabKalender'
// import TabTools from './features/tools/TabTools'
// import TabSettings from './features/settings/TabSettings'

const TABS = [
  { id: 0, label: 'Heute',      icon: '◈' },
  { id: 1, label: 'Todos',      icon: '✓' },
  { id: 2, label: 'Kalender',   icon: '⊞' },
  { id: 3, label: 'Tools',      icon: '⚙' },
  { id: 4, label: 'Einstellungen', icon: '≡' },
]

export default function App() {
  const [tab, setTab] = useState(0)

  return (
    <div className={styles.app}>
      <div className={styles.content}>
        {tab === 0 ? (
          <TabHeute />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.tabIcon}>{TABS[tab].icon}</span>
            <p>{TABS[tab].label}</p>
            <small>In Arbeit…</small>
          </div>
        )}
      </div>

      <nav className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn}${tab === t.id ? ' ' + styles.active : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className={styles.tabIcon}>{t.icon}</span>
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
