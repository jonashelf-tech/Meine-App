import { useState, useEffect } from 'react'
import { useAppStore } from './store'
import { hexToGlow } from './utils'
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
import TabGamification from './features/tools/gamification/TabGamification'
import TabRad          from './features/tools/rad/TabRad'
import TabReminder     from './features/tools/reminder/TabReminder'
import AddTodoModal    from './components/AddTodoModal/AddTodoModal'

const TABS = [
  { id: 0, label: 'Heute',    icon: '◈' },
  { id: 1, label: 'Kalender', icon: '⊞' },
  { id: 2, label: 'Tools',    icon: '⚙' },
  { id: 3, label: 'Einstellungen', icon: '≡' },
]

const TOOL_TABS = [4,5,6,7,8,9,10,11]

export default function App() {
  const { currentTab, setCurrentTab, accentColor } = useAppStore()
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', accentColor)
    document.documentElement.style.setProperty('--glow-primary', hexToGlow(accentColor))
  }, [accentColor])

  const goBack = () => setCurrentTab(2)

  return (
    <div className={styles.app}>
      <div className={styles.content}>
        {currentTab === 0  && <TabHeute />}
        {currentTab === 1  && <TabKalender />}
        {currentTab === 2  && <TabTools />}
        {currentTab === 3  && <TabSettings />}
        {currentTab === 4  && <TabGeburtstage />}
        {currentTab === 5  && <TabTimer        onBack={goBack} />}
        {currentTab === 6  && <TabRezepte      onBack={goBack} />}
        {currentTab === 7  && <TabPizza        onBack={goBack} />}
        {currentTab === 8  && <TabElvi         onBack={goBack} />}
        {currentTab === 9  && <TabGewicht      onBack={goBack} />}
        {currentTab === 10 && <TabGamification onBack={goBack} />}
        {currentTab === 11 && <TabRad          onBack={goBack} />}
        {currentTab === 12 && <TabReminder     onBack={goBack} />}
      </div>

      <button
        className={styles.fab}
        onClick={() => setAddOpen(true)}
        aria-label="Todo hinzufügen"
      >
        +
      </button>

      {addOpen && <AddTodoModal onClose={() => setAddOpen(false)} />}

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
