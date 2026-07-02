import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { sv, lv, SK } from '../../../storage'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { loadAll, saveZutaten, saveRezepte, loadFroster, saveFroster } from './mealprepStore'
import { createKorb, portionenSplit } from './mealprepModel'
import MealprepHome from './MealprepHome'
import PortionenStep from './PortionenStep'
import Sammlung from './Sammlung'
import Grossrezepte from './Grossrezepte'
import Konfigurator from './Konfigurator.jsx'
import Zutaten from './Zutaten'
import Kochen from './Kochen'
import Editor from './Editor'
import RezeptView from './RezeptView'
import { IconArrowLeft, IconArrowRight, IconCheck } from './icons'
import s from './TabRezepte.module.css'

const DURCHGANG_SCREENS = ['d-gerichte', 'd-portionen', 'd-einkauf', 'd-kochen']
const STEP_LABELS = ['Gerichte', 'Portionen', 'Einkauf', 'Kochen']

const SCREEN_TITLES = {
  rezepte: 'Rezepte',
  ketten:  'Ketten',
  konfig:  'Konfigurator',
  zutaten: 'Zutaten',
}

export default function TabRezepte({ onBack }) {
  const { toolColors, setBackInterceptor } = useAppStore()
  const toolColor = getToolColor('rezepte', toolColors)

  const init = useMemo(() => loadAll(), [])
  const [zutaten, setZutatenS] = useState(init.zutaten)
  const [rezepte, setRezepteS] = useState(init.rezepte)
  const [settings] = useState(init.settings)
  const [korb, setKorbS] = useState(() => lv(SK.rezepteKorbAktiv, null) ?? createKorb({ name: 'Aktueller Korb' }))
  const setKorb = useCallback((v) => {
    setKorbS(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      sv(SK.rezepteKorbAktiv, next)
      return next
    })
  }, [])

  const [screen, setScreenS] = useState(() => {
    const saved = lv(SK.rezepteScreen, 'home')
    // Migriere alte Screen-Namen
    if (saved === 'portionen') return 'd-portionen'
    if (saved === 'kochen')    return 'd-einkauf'
    // Durchgang-Screens ohne Korb-Inhalt → home
    const savedKorb = lv(SK.rezepteKorbAktiv, null)
    const korbEmpty = !savedKorb?.eintraege?.length
    if (korbEmpty && ['d-portionen', 'd-einkauf', 'd-kochen'].includes(saved)) return 'home'
    return saved
  })
  const setScreen = useCallback(scr => { setScreenS(scr); sv(SK.rezepteScreen, scr) }, [])

  const [gerichteTab, setGerichteTab] = useState('rezepte')
  const [briefing, setBriefing] = useState(() => !lv(SK.rezepteIntroSeen, false))
  const closeBriefing = useCallback(() => { sv(SK.rezepteIntroSeen, true); setBriefing(false) }, [])
  const openBriefing  = useCallback(() => setBriefing(true), [])
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [konfigLoad, setKonfigLoad] = useState(null)

  const setZutaten = useCallback(v => { setZutatenS(v); saveZutaten(v) }, [])
  const setRezepte = useCallback(v => { setRezepteS(v); saveRezepte(v) }, [])

  const [froster, setFrosterS] = useState(() => loadFroster())
  const setFroster = useCallback((v) => {
    setFrosterS(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      saveFroster(next)
      return next
    })
  }, [])
  const adjustFroster = useCallback((rezeptId, delta) => {
    setFroster(f => {
      const n = Math.max(0, (f[rezeptId] ?? 0) + delta)
      const next = { ...f }
      if (n === 0) delete next[rezeptId]; else next[rezeptId] = n
      return next
    })
  }, [setFroster])
  const uebernehmenInFroster = useCallback((korbGerichte) => {
    setFroster(f => {
      const next = { ...f }
      for (const g of korbGerichte) {
        if (g.bloecke > 0) next[g.rezept.id] = (next[g.rezept.id] ?? 0) + g.bloecke
      }
      return next
    })
  }, [setFroster])

  // ── Durchgang-Wizard ──────────────────────────────────────
  const durchgangIdx = DURCHGANG_SCREENS.indexOf(screen)
  const isDurchgang  = durchgangIdx >= 0

  const totalPortionenForWeiter = useMemo(
    () => korb.eintraege.reduce((sum, e) => sum + portionenSplit(e).total, 0),
    [korb.eintraege]
  )

  const weiterEnabled = useMemo(() => {
    if (screen === 'd-gerichte')  return korb.eintraege.length > 0
    if (screen === 'd-portionen') return totalPortionenForWeiter > 0
    return true
  }, [screen, korb.eintraege.length, totalPortionenForWeiter])

  const startDurchgang = useCallback(() => {
    setScreen(korb.eintraege.length > 0 ? 'd-portionen' : 'd-gerichte')
  }, [korb.eintraege.length, setScreen])

  const handleDurchgangWeiter = useCallback(() => {
    const next = { 'd-gerichte': 'd-portionen', 'd-portionen': 'd-einkauf', 'd-einkauf': 'd-kochen' }
    if (next[screen]) setScreen(next[screen])
  }, [screen, setScreen])

  const handleDurchgangBack = useCallback(() => {
    const prev = { 'd-gerichte': 'home', 'd-portionen': 'd-gerichte', 'd-einkauf': 'd-portionen', 'd-kochen': 'd-einkauf' }
    setScreen(prev[screen] ?? 'home')
  }, [screen, setScreen])

  // Hardware-/Gesten-Zurück
  useEffect(() => {
    let backFn = null
    if (editing !== null)       backFn = () => setEditing(null)
    else if (viewing !== null)  backFn = () => setViewing(null)
    else if (screen !== 'home') backFn = isDurchgang ? handleDurchgangBack : () => setScreen('home')
    setBackInterceptor(backFn)
    return () => setBackInterceptor(null)
  }, [editing, viewing, screen, isDurchgang, handleDurchgangBack, setBackInterceptor, setScreen])

  const zById = useCallback(id => zutaten.find(z => z.id === id), [zutaten])
  const rById = useCallback(id => rezepte.find(r => r.id === id), [rezepte])

  const addToKorb = useCallback((ref, portionen) => {
    setKorb(k => ({ ...k, eintraege: [...k.eintraege, { ref, portionen }] }))
  }, [setKorb])

  const removeFromKorb = useCallback((rezeptId) => {
    setKorb(k => ({ ...k, eintraege: k.eintraege.filter(e => e.ref !== rezeptId) }))
  }, [setKorb])

  const ladeInKonfigurator = useCallback((rezept) => {
    setKonfigLoad(rezept)
    setScreen('konfig')
  }, [setScreen])

  const sharedProps = {
    zutaten, rezepte, setZutaten, setRezepte,
    zById, rById, toolColor,
    onEdit: setEditing, onView: setViewing,
    addToKorb, removeFromKorb,
    korb,
  }

  const istAuswahl = screen === 'rezepte' || screen === 'ketten'

  return (
    <div className={`${s.page} ${isDurchgang ? s.pageWizard : ''}`} style={{ '--tool-color': toolColor }}>
      {viewing && !editing && (
        <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) setViewing(null) }}>
          <RezeptView
            rezept={viewing}
            zById={zById} rById={rById}
            onEdit={r => { setEditing({ form: 'rezept', data: r }); setViewing(null) }}
            onOpenKonfigurator={r => { ladeInKonfigurator(r); setViewing(null) }}
            onClose={() => setViewing(null)}
          />
        </div>
      )}

      {editing && (
        <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <Editor {...editing} zutaten={zutaten} rezepte={rezepte}
            onSaveZutat={z => { setZutaten(prev => prev.some(x => x.id === z.id) ? prev.map(x => x.id === z.id ? z : x) : [...prev, z]); setEditing(null) }}
            onSaveRezept={r => { setRezepte(prev => prev.some(x => x.id === r.id) ? prev.map(x => x.id === r.id ? r : x) : [...prev, r]); setEditing(null) }}
            onDelete={(id, form) => { if (form === 'zutat') setZutaten(prev => prev.filter(x => x.id !== id)); else setRezepte(prev => prev.filter(x => x.id !== id)); setEditing(null) }}
            onOpenKonfigurator={r => { ladeInKonfigurator(r); setEditing(null) }}
            onClose={() => setEditing(null)} />
        </div>
      )}

      {screen === 'home' ? (
        <>
          <ToolHeader
            onBack={onBack}
            icon={<ToolIcon id="rezepte" size={20} />}
            eyebrow="Tool"
            title={<>Meal<em>prep</em></>}
          />
          <MealprepHome
            korb={korb} rezepte={rezepte} zutaten={zutaten} toolColor={toolColor}
            froster={froster} onAdjustFroster={adjustFroster}
            briefing={briefing} onCloseBriefing={closeBriefing} onOpenBriefing={openBriefing}
            onStartDurchgang={startDurchgang}
            onOpenRezepte={() => setScreen('rezepte')}
            onOpenKetten={() => setScreen('ketten')}
            onOpenZutaten={() => setScreen('zutaten')}
            onOpenKonfig={() => setScreen('konfig')}
          />
        </>
      ) : isDurchgang ? (
        <>
          {/* ── Sticky Wizard-Header ──────────────────────── */}
          <div className={s.wizHead}>
            <button className={s.wizBack} onClick={handleDurchgangBack} aria-label="Zurück">
              <IconArrowLeft size={18} />
            </button>
            <div className={s.wizSteps}>
              {STEP_LABELS.map((lbl, i) => (
                <div key={lbl} className={s.wizStep}>
                  <div className={`${s.wizBar} ${i === durchgangIdx ? s.wizBarOn : i < durchgangIdx ? s.wizBarDone : ''}`} />
                  <div className={`${s.wizLbl} ${i === durchgangIdx ? s.wizLblOn : ''}`}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Step-Inhalt ───────────────────────────────── */}
          {screen === 'd-gerichte' && (
            <>
              <div className={s.gerichteTabs}>
                {[['rezepte', 'Rezepte'], ['ketten', 'Ketten']].map(([tab, label]) => (
                  <button
                    key={tab}
                    className={`${s.gerichteTab} ${gerichteTab === tab ? s.gerichteTabOn : ''}`}
                    onClick={() => setGerichteTab(tab)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {gerichteTab === 'rezepte' && <Sammlung {...sharedProps} ladeInKonfigurator={ladeInKonfigurator} />}
              {gerichteTab === 'ketten'  && <Grossrezepte {...sharedProps} />}
            </>
          )}

          {screen === 'd-portionen' && (
            <PortionenStep
              korb={korb} setKorb={setKorb} zById={zById} rById={rById} toolColor={toolColor}
              hideChrome={true}
              onBack={handleDurchgangBack}
              onWeiter={handleDurchgangWeiter}
            />
          )}

          {(screen === 'd-einkauf' || screen === 'd-kochen') && (
            <Kochen
              korb={korb} setKorb={setKorb} zById={zById} rById={rById} rezepte={rezepte}
              toolColor={toolColor} onUebernehmen={uebernehmenInFroster}
              forcedView={screen === 'd-einkauf' ? 'einkauf' : 'anleitung'}
              hideTabBar={true}
              onLeeren={() => setScreen('home')}
            />
          )}

          {/* ── Fixed Wizard-Footer ───────────────────────── */}
          <div className={s.wizFooter}>
            {screen === 'd-kochen' ? (
              <button className={s.fertigBtn} onClick={() => setScreen('home')}>
                Fertig <IconCheck size={16} />
              </button>
            ) : (
              <button
                className={s.weiterWizBtn}
                onClick={handleDurchgangWeiter}
                disabled={!weiterEnabled}
              >
                Weiter <IconArrowRight size={16} />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className={s.subHead}>
            <button className={s.subBack} onClick={() => setScreen('home')} aria-label="Zurück">
              <IconArrowLeft size={18} /> Zurück
            </button>
            <span className={s.subTitle}>{SCREEN_TITLES[screen]}</span>
          </div>
          <div className={`${s.content} ${istAuswahl && korb.eintraege.length > 0 ? s.contentWithBar : ''}`}>
            {screen === 'rezepte' && <Sammlung {...sharedProps} ladeInKonfigurator={ladeInKonfigurator} />}
            {screen === 'ketten'  && <Grossrezepte {...sharedProps} />}
            {screen === 'konfig'  && (
              <Konfigurator {...sharedProps} settings={settings}
                loadRezept={konfigLoad} onLoaded={() => setKonfigLoad(null)} />
            )}
            {screen === 'zutaten' && <Zutaten zutaten={zutaten} toolColor={toolColor} onEdit={setEditing} />}
          </div>

          {istAuswahl && korb.eintraege.length > 0 && (
            <div className={s.weiterBar}>
              <button className={s.weiterBtn} onClick={() => setScreen('d-portionen')}>
                <span className={s.weiterLeft}>
                  <span className={s.weiterCount}>{korb.eintraege.length}</span>
                  {korb.eintraege.length === 1 ? 'Gericht gewählt' : 'Gerichte gewählt'}
                </span>
                <span className={s.weiterRight}>Weiter <IconArrowRight size={17} /></span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
