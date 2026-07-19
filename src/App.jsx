import { useState, useEffect, Suspense } from 'react'
import { useAppStore } from './store'
import { hexToGlow } from './utils'
import { TOOL_TAB, TOOL_REGISTRY } from './features/tools/toolRegistry.jsx'
import { markToolUsed, seedToolUsage } from './features/tools/toolUsage'
import { PENDING_TAB_KEY } from './features/tools/toolReset'
import { saveAutoBackup } from './storage'
import { maybeAutoPush } from './sync/cloudBackup'
import { initSync, syncTick } from './sync/syncEngine'
import styles from './App.module.css'
import TabHeute        from './features/calendar/TabHeute/TabHeute'
import TabKalender     from './features/calendar/TabKalender/TabKalender'
import TabTools        from './features/tools/TabTools/TabTools'
import TabSettings     from './features/settings/TabSettings/TabSettings'
import TodoModal       from './components/TodoModal/TodoModal'
import ErrorBoundary   from './components/ErrorBoundary/ErrorBoundary'
import { useToast }    from './components/Toast/Toast'
import BackupNudge     from './components/BackupNudge/BackupNudge'
import BuddyFab        from './features/buddy/BuddyFab'
import UpdatePrompt     from './components/UpdatePrompt/UpdatePrompt'

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
  { id: 3, label: 'Einstellungen', Icon: IconSettings  },
]

const TOOL_IDS = new Set(Object.values(TOOL_TAB))

export default function App() {
  const { currentTab, previousTab, setCurrentTab, accentColor, theme } = useAppStore()
  const { showToast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [sharePrefill, setSharePrefill] = useState(null)
  const [exercising, setExercising] = useState(false)

  // Share-Target + Shortcut „Neues Todo": URL-Parameter einmalig konsumieren
  // (?neu=1 vom Shortcut, ?title/?text/?url vom Teilen aus anderen Apps)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('neu') && !params.has('text') && !params.has('title')) return
    const shared = [params.get('title'), params.get('text'), params.get('url')]
      .filter(Boolean).join(' ').trim()
    setSharePrefill(shared || null)
    setAddOpen(true)
    history.replaceState(null, '', window.location.pathname)
  }, [])

  useEffect(() => { saveAutoBackup(); maybeAutoPush(); initSync() }, [])

  // Storage-Schreibfehler (Quota voll, Private-Mode) sichtbar machen — sonst
  // arbeitet man im RAM weiter und verliert beim Reload alles. Max. 1 Toast/Minute.
  useEffect(() => {
    let lastToastAt = 0
    const onWriteFailed = () => {
      if (Date.now() - lastToastAt < 60_000) return
      lastToastAt = Date.now()
      showToast('Speichern fehlgeschlagen — Speicherplatz prüfen, Backup ziehen!', 'error')
    }
    window.addEventListener('adhs:storage-write-failed', onWriteFailed)
    return () => window.removeEventListener('adhs:storage-write-failed', onWriteFailed)
  }, [showToast])

  // Dachboden-Regel: letztes Öffnen pro Tool tracken
  useEffect(() => { seedToolUsage(useAppStore.getState().activeTools) }, [])
  useEffect(() => {
    const entry = TOOL_REGISTRY.find(t => t.tabId === currentTab)
    if (entry) markToolUsed(entry.id)
  }, [currentTab])

  // Tool-Reset: nach dem Reset-Reload zurück ins Tool statt auf den Tagesplaner
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_TAB_KEY)
    if (pending != null) {
      sessionStorage.removeItem(PENDING_TAB_KEY)
      setCurrentTab(Number(pending))
    }
  }, [setCurrentTab])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') { saveAutoBackup(); maybeAutoPush(); syncTick() } }
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
        <div key={currentTab} className={styles.tabEnter}>
        <ErrorBoundary key={currentTab}>
        {currentTab === 0  && <TabHeute />}
        {currentTab === 1  && <TabKalender />}
        {currentTab === 2  && <TabTools />}
        {currentTab === 3  && <TabSettings />}
        {TOOL_REGISTRY.map(entry => {
          if (currentTab !== entry.tabId) return null
          const Cmp = entry.component
          const extra = entry.id === 'kognitiv' ? { onExercising: setExercising } : {}
          return (
            <Suspense key={entry.id} fallback={null}>
              <Cmp onBack={goBack} {...extra} />
            </Suspense>
          )
        })}
        </ErrorBoundary>
        </div>
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

      {/* Buddy nur auf den Plan-Flächen (Tagesplaner + Kalender) — Konzept §7.2 */}
      {(currentTab === 0 || currentTab === 1) && <BuddyFab />}

      {addOpen && (
        <TodoModal
          prefill={sharePrefill ? { text: sharePrefill } : null}
          onClose={() => { setAddOpen(false); setSharePrefill(null) }}
        />
      )}

      <UpdatePrompt />

      {!exercising && <nav className={styles.tabBar}>
        {TABS.map(({ id, label, Icon }) => {
          const active = currentTab === id || (id === 2 && isToolTab)
          return (
            <button
              key={id}
              className={`${styles.tabBtn}${active ? ' ' + styles.active : ''}`}
              onClick={() => {
                // Tap auf den schon aktiven Reiter poppt eine offene Subview (Projekte,
                // Hilfe) — selber Weg wie Swipe-/Browser-Back. Sonst passiert nichts,
                // weil der Reiter „denkt", er sei bereits da.
                if (id === currentTab) {
                  const { backInterceptor } = useAppStore.getState()
                  if (backInterceptor) backInterceptor()
                } else {
                  setCurrentTab(id)
                }
              }}
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
