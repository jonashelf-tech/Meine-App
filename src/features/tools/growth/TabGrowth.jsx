import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { TOOL_TAB } from '../toolTabs'
import {
  loadGrowth, saveGrowth, isEditable, setTimerKarte,
  setSettings, toggleKategorie, buildKiPrompt, markFlowAbgeschlossen,
} from './growthStore'
import { growthViewMode } from './growthFlowLogic'
import { loadDailyStates } from '../../daily/dailyState'
import GrowthFlow from './GrowthFlow'
import GrowthOverview from './GrowthOverview'
import GrowthBriefing from './GrowthBriefing'
import GrowthSettings from './GrowthSettings'
import s from './TabGrowth.module.css'

// Router des Growth-Tools: briefing | settings | flow | overview.
// Der geführte Fluss (GrowthFlow) und der Ruhezustand (GrowthOverview) kapseln
// die Tagesansicht; hier leben nur die geteilten Effekte (Tageswechsel,
// Timer-Rückkehr, Back-Interceptor, KI-Export, Kalender-Intent).
export default function TabGrowth({ onBack }) {
  const { toolColors, setBackInterceptor, growthOpenDate, setGrowthOpenDate, setTimerAutoStart, setCurrentTab } = useAppStore()
  const toolColor = getToolColor('growth', toolColors)

  const [data, setData] = useState(() => loadGrowth())
  const [today, setToday] = useState(() => todayKey())
  const [viewDate, setViewDate] = useState(() => useAppStore.getState().growthOpenDate ?? todayKey())
  const [nav, setNav] = useState(null)            // null | 'settings'
  const [mode, setMode] = useState(() => growthViewMode(data, viewDate, today)) // 'flow' | 'overview'

  const dataRef = useRef(data)
  dataRef.current = data
  // dataRef synchron mitziehen: Flow/Overview rufen persist über Renders hinweg;
  // ohne das läsen Folge-Callbacks stale State und überschrieben sich.
  const persist = (next) => {
    if (next === dataRef.current) return
    dataRef.current = next
    setData(next)
    saveGrowth(next)
  }

  // Intent aus dem Kalender-DayPanel einmalig konsumieren
  useEffect(() => { if (growthOpenDate) setGrowthOpenDate(null) }, [growthOpenDate, setGrowthOpenDate])

  // Tageswechsel bei offener App: beim Sichtbarwerden Datum prüfen
  useEffect(() => {
    const check = () => {
      const t = todayKey()
      if (t !== today) { setToday(t); setViewDate(v => (v === today ? t : v)) }
    }
    const onVis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', check)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', check) }
  }, [today])

  // View-Mode nur bei Datums-/Tageswechsel neu bestimmen — NICHT bei reinen
  // Dateneingaben, sonst kippt der Fluss in die Übersicht, sobald man den
  // Check-in tippt (stateTouched → dayHasEntry).
  useEffect(() => { setMode(growthViewMode(dataRef.current, viewDate, today)) }, [viewDate, today])

  // Swipe-/Hardware-Back: Settings → Fluss → Vergangenheit → Tool schließen
  useEffect(() => {
    const handler = nav !== null ? () => setNav(null)
      : mode === 'flow' ? () => setMode('overview')
      : viewDate !== today ? () => setViewDate(today)
      : null
    setBackInterceptor(handler)
    return () => setBackInterceptor(null)
  }, [nav, mode, viewDate, today, setBackInterceptor])

  const editable = isEditable(viewDate, today)

  // Timer-Karte starten (bestehender Fokustimer mit Kartendauer)
  const handleStartTimer = (karte) => {
    persist(setTimerKarte(dataRef.current, viewDate, karte.id))
    setTimerAutoStart({ text: karte.text, color: toolColor, duration: karte.timer, returnTab: TOOL_TAB.growth })
    setCurrentTab(TOOL_TAB.timer)
  }

  // Rückkehr vom Timer: vorgemerkte Karte einmalig konsumieren (öffnet ihr Feld)
  const [timerRueckkehr, setTimerRueckkehr] = useState(null)
  useEffect(() => {
    const id = dataRef.current.days[todayKey()]?.timerKarteId
    if (!id) return
    setTimerRueckkehr(id)
    persist(setTimerKarte(dataRef.current, todayKey(), null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // KI-Export: fertigen Prompt in die Zwischenablage (keine API)
  const [kiKopiert, setKiKopiert] = useState(false)
  const handleKiExport = async (nTage) => {
    const prompt = buildKiPrompt(dataRef.current, loadDailyStates(), nTage, today)
    try {
      await navigator.clipboard.writeText(prompt)
      setKiKopiert(true)
      setTimeout(() => setKiKopiert(false), 2500)
    } catch {
      // Clipboard verweigert (z.B. fehlender Focus) → kein Crash, kein Toast
    }
  }

  const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )

  // First-Open: Briefing mit Pflicht-Kategorienauswahl
  if (!data.settings.briefingGesehen) {
    return (
      <div className={s.page} style={{ '--tool-color': toolColor }}>
        <ToolHeader onBack={onBack} icon={<ToolIcon id="growth" size={20} />} eyebrow="Tool" title="Growth" />
        <GrowthBriefing
          defaults={data.settings.aktiveKategorien}
          onComplete={(kategorien) =>
            persist(setSettings(dataRef.current, { aktiveKategorien: kategorien, briefingGesehen: true }))}
        />
      </div>
    )
  }

  if (nav === 'settings') {
    return (
      <div className={s.page} style={{ '--tool-color': toolColor }}>
        <ToolHeader onBack={() => setNav(null)} icon={<ToolIcon id="growth" size={20} />} eyebrow="Tool" title="Growth" />
        <GrowthSettings
          settings={data.settings}
          onToggleKategorie={(id) => persist(toggleKategorie(dataRef.current, id))}
          onPatch={(patch) => { persist(setSettings(dataRef.current, patch)); if (patch.briefingGesehen === false) setNav(null) }}
        />
      </div>
    )
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="growth" size={20} />}
        eyebrow="Tool"
        title="Growth"
        actions={
          <button className={s.settingsBtn} onClick={() => setNav('settings')} aria-label="Einstellungen">
            <SettingsIcon />
          </button>
        }
      />

      {viewDate !== today && (
        <button className={s.backToToday} onClick={() => setViewDate(today)}>
          ← Zurück zu heute
        </button>
      )}
      {viewDate !== today && !editable && (
        <div className={s.readOnlyHint}>Nur lesen — älter als 3 Tage</div>
      )}

      {mode === 'flow' ? (
        <GrowthFlow
          data={data}
          persist={persist}
          date={viewDate}
          today={today}
          onStartTimer={handleStartTimer}
          onFinished={() => { persist(markFlowAbgeschlossen(dataRef.current, viewDate)); setMode('overview') }}
        />
      ) : (
        <GrowthOverview
          data={data}
          persist={persist}
          date={viewDate}
          today={today}
          editable={editable}
          autoOpenKartenId={timerRueckkehr}
          onStartTimer={handleStartTimer}
          onLosgehen={() => setMode('flow')}
          onOpenDay={(d) => setViewDate(d)}
        >
          {data.settings.kiExportAn && (
            <div className={s.kiRow}>
              <span className={s.kiLabel}>{kiKopiert ? '✓ In Zwischenablage kopiert' : 'Für KI exportieren:'}</span>
              {!kiKopiert && [7, 30, 90].map(n => (
                <button key={n} className={s.kiBtn} onClick={() => handleKiExport(n)}>{n} Tage</button>
              ))}
            </div>
          )}
        </GrowthOverview>
      )}
    </div>
  )
}
