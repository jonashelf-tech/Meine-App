import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { sv, lv, SK } from '../../../storage'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { loadAll, saveZutaten, saveRezepte } from './mealprepStore'
import { createKorb } from './mealprepModel'
import MealprepHome from './MealprepHome'
import PortionenStep from './PortionenStep'
import Sammlung from './Sammlung'
import Grossrezepte from './Grossrezepte'
import Konfigurator from './Konfigurator.jsx'
import Zutaten from './Zutaten'
import Kochen from './Kochen'
import Editor from './Editor'
import RezeptView from './RezeptView'
import { IconArrowLeft } from './icons'
import s from './TabRezepte.module.css'

const SCREEN_TITLES = {
  rezepte: 'Rezepte',
  ketten:  'Ketten',
  konfig:  'Konfigurator',
  zutaten: 'Zutaten',
  kochen:  'Kochen',
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

  const [screen, setScreen] = useState('home')   // home | rezepte | ketten | konfig | zutaten | kochen
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)   // Rezept in Read-Only-Ansicht
  const [konfigLoad, setKonfigLoad] = useState(null)

  const setZutaten = useCallback(v => { setZutatenS(v); saveZutaten(v) }, [])
  const setRezepte = useCallback(v => { setRezepteS(v); saveRezepte(v) }, [])

  // Hardware-/Gesten-Zurück: Editor → Rezeptansicht → Unterseite → Home → Tool verlassen
  useEffect(() => {
    setBackInterceptor(
      editing !== null  ? () => setEditing(null)
      : viewing !== null ? () => setViewing(null)
      : screen !== 'home' ? () => setScreen('home')
      : null
    )
    return () => setBackInterceptor(null)
  }, [editing, viewing, screen, setBackInterceptor])

  const zById = useCallback(id => zutaten.find(z => z.id === id), [zutaten])
  const rById = useCallback(id => rezepte.find(r => r.id === id), [rezepte])

  const addToKorb = useCallback((ref, portionen) => {
    setKorb(k => ({ ...k, eintraege: [...k.eintraege, { ref, portionen }] }))
  }, [setKorb])

  const removeFromKorb = useCallback((rezeptId) => {
    setKorb(k => ({ ...k, eintraege: k.eintraege.filter(e => e.ref !== rezeptId) }))
  }, [setKorb])

  // Für Ketten-Stepper: updated oder fügt ein, entfernt bei portionen=0
  const updateKorbEintrag = useCallback((rezeptId, portionen) => {
    setKorb(k => {
      if (portionen === 0) return { ...k, eintraege: k.eintraege.filter(e => e.ref !== rezeptId) }
      const exists = k.eintraege.some(e => e.ref === rezeptId)
      if (exists) return { ...k, eintraege: k.eintraege.map(e => e.ref === rezeptId ? { ...e, portionen } : e) }
      return { ...k, eintraege: [...k.eintraege, { ref: rezeptId, portionen }] }
    })
  }, [setKorb])

  const ladeInKonfigurator = useCallback((rezept) => {
    setKonfigLoad(rezept)
    setScreen('konfig')
  }, [])

  // Smart-CTA: leerer Korb → Rezept-Auswahl, sonst → Portionen-Schritt
  const startDurchgang = useCallback(() => {
    setScreen(korb.eintraege.length > 0 ? 'portionen' : 'rezepte')
  }, [korb.eintraege.length])

  const sharedProps = {
    zutaten, rezepte, setZutaten, setRezepte,
    zById, rById, toolColor,
    onEdit: setEditing, onView: setViewing,
    addToKorb, removeFromKorb, updateKorbEintrag,
    korb,
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
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
            onStartDurchgang={startDurchgang}
            onOpenRezepte={() => setScreen('rezepte')}
            onOpenKetten={() => setScreen('ketten')}
            onOpenZutaten={() => setScreen('zutaten')}
            onOpenKonfig={() => setScreen('konfig')}
          />
        </>
      ) : screen === 'portionen' ? (
        <PortionenStep
          korb={korb} setKorb={setKorb} zById={zById} rById={rById} toolColor={toolColor}
          onBack={() => setScreen('home')}
          onWeiter={() => setScreen('kochen')}
        />
      ) : (
        <>
          <div className={s.subHead}>
            <button className={s.subBack} onClick={() => setScreen('home')} aria-label="Zurück">
              <IconArrowLeft size={18} /> Zurück
            </button>
            <span className={s.subTitle}>{SCREEN_TITLES[screen]}</span>
          </div>
          <div className={s.content}>
            {screen === 'rezepte' && <Sammlung {...sharedProps} ladeInKonfigurator={ladeInKonfigurator} />}
            {screen === 'ketten'  && <Grossrezepte {...sharedProps} />}
            {screen === 'konfig'  && (
              <Konfigurator {...sharedProps} settings={settings}
                loadRezept={konfigLoad} onLoaded={() => setKonfigLoad(null)} />
            )}
            {screen === 'zutaten' && <Zutaten zutaten={zutaten} toolColor={toolColor} onEdit={setEditing} />}
            {screen === 'kochen'  && (
              <Kochen korb={korb} setKorb={setKorb} zById={zById} rById={rById} rezepte={rezepte} toolColor={toolColor} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
