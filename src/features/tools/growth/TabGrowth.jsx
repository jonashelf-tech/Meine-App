import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import {
  loadGrowth, saveGrowth, ensureDayCard, setFreitext, isEditable,
  skipKarte, drawBonusKarte, setAntwort, markStateTouched, isTageskarteOffen,
} from './growthStore'
import { useAutosave } from './useAutosave'
import DailyStateRow from './DailyStateRow'
import TageskarteCard from './TageskarteCard'
import s from './TabGrowth.module.css'

export default function TabGrowth({ onBack }) {
  const { toolColors, setBackInterceptor, growthOpenDate, setGrowthOpenDate } = useAppStore()
  const toolColor = getToolColor('growth', toolColors)

  const [data, setData] = useState(() => loadGrowth())
  const [today, setToday] = useState(() => todayKey())
  const [viewDate, setViewDate] = useState(() => useAppStore.getState().growthOpenDate ?? todayKey())
  const [nav, setNav] = useState(null) // null | 'settings'

  const dataRef = useRef(data)
  dataRef.current = data
  const persist = (next) => { if (next !== dataRef.current) { setData(next); saveGrowth(next) } }

  // Intent aus dem Kalender-DayPanel einmalig konsumieren
  useEffect(() => { if (growthOpenDate) setGrowthOpenDate(null) }, [growthOpenDate, setGrowthOpenDate])

  // Tageswechsel bei offener App: beim Sichtbarwerden Datum prüfen (Spec §5)
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

  // Swipe-Back: Settings/Vergangenheit → eine Ebene zurück statt Tool schließen
  useEffect(() => {
    const handler = nav !== null ? () => setNav(null)
      : viewDate !== today ? () => setViewDate(today)
      : null
    setBackInterceptor(handler)
    return () => setBackInterceptor(null)
  }, [nav, viewDate, today, setBackInterceptor])

  const editable = isEditable(viewDate, today)

  // Tageskarte sicherstellen (nur für editierbare Tage; deterministisch via Persistenz)
  useEffect(() => {
    if (!data.settings.briefingGesehen || !editable) return
    persist(ensureDayCard(dataRef.current, viewDate))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate, today, data.settings.briefingGesehen])

  const day = data.days[viewDate]

  // Timer-Karten: Platzhalter, wird in Task 7 mit Leben gefüllt
  const [timerRueckkehr] = useState(null)
  const handleStartTimer = () => {}

  // Freitext mit Autosave (ab dem ersten Zeichen)
  const [freitext, onFreitext] = useAutosave(
    day?.freitext ?? '',
    (text) => persist(setFreitext(dataRef.current, viewDate, text)),
    [viewDate],
  )

  const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )

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

      {/* Daily State — geteilt mit Kognitiv, optional */}
      <DailyStateRow
        date={viewDate}
        editable={editable}
        onTouched={() => persist(markStateTouched(dataRef.current, viewDate))}
      />

      {/* Karten: Tageskarte zuerst, dann Bonus */}
      {(day?.karten ?? []).map(eintrag => (
        <TageskarteCard
          key={eintrag.kartenId}
          eintrag={eintrag}
          date={viewDate}
          editable={editable}
          istTageskarte={eintrag.kartenId === day.tageskarteId}
          skipMoeglich={
            viewDate === today && editable && !day.skipVerwendet &&
            eintrag.kartenId === day.tageskarteId &&
            !(eintrag.antwort ?? '').trim() && !eintrag.erledigt
          }
          autoOpen={timerRueckkehr === eintrag.kartenId}
          onPatch={(patch) => persist(setAntwort(dataRef.current, viewDate, eintrag.kartenId, patch))}
          onSkip={() => persist(skipKarte(dataRef.current, viewDate))}
          onStartTimer={(karte) => handleStartTimer(karte)}
        />
      ))}

      {/* Bonus: erst nach beantworteter Tageskarte, max 3 gesamt, nur heute */}
      {viewDate === today && day && !isTageskarteOffen(data, viewDate) && day.karten.length < 3 && (
        <button className={s.bonusBtn} onClick={() => persist(drawBonusKarte(dataRef.current, viewDate))}>
          Noch eine ziehen?
        </button>
      )}

      {/* Freitext — immer sichtbar, jeden Tag, unabhängig von der Karte */}
      <div className={s.section}>
        {editable ? (
          <textarea
            className={s.freitext}
            value={freitext}
            onChange={e => onFreitext(e.target.value)}
            placeholder="Ein Satz reicht."
            rows={3}
          />
        ) : (
          <div className={s.freitextRead}>{day?.freitext || '—'}</div>
        )}
      </div>
    </div>
  )
}
