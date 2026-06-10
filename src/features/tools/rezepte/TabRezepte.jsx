import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { sv, lv, SK } from '../../../storage'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { loadAll, saveZutaten, saveRezepte, saveSettings } from './mealprepStore'
import { createKorb } from './mealprepModel'
import Sammlung from './Sammlung'
import Grossrezepte from './Grossrezepte'
import Konfigurator from './Konfigurator.jsx'
import Zutaten from './Zutaten'
import Kochen from './Kochen'
import Editor from './Editor'
import { IconBook, IconLayers, IconSliders, IconCarrot, IconBasket } from './icons'
import s from './TabRezepte.module.css'

const TABS = [
  { id: 'rezepte', label: 'Rezepte', Icon: IconBook },
  { id: 'ketten',  label: 'Ketten',  Icon: IconLayers },
  { id: 'konfig',  label: 'Konfig',  Icon: IconSliders },
  { id: 'zutaten', label: 'Zutaten', Icon: IconCarrot },
  { id: 'kochen',  label: 'Kochen',  Icon: IconBasket },
]

export default function TabRezepte({ onBack }) {
  const { toolColors, setBackInterceptor } = useAppStore()
  const toolColor = getToolColor('rezepte', toolColors)

  const init = useMemo(() => loadAll(), [])
  const [zutaten, setZutatenS] = useState(init.zutaten)
  const [rezepte, setRezepteS] = useState(init.rezepte)
  const [settings, setSettingsS] = useState(init.settings)
  const [korb, setKorbS] = useState(() => lv(SK.rezepteKorbAktiv, null) ?? createKorb({ name: 'Aktueller Korb' }))
  const setKorb = useCallback((v) => {
    setKorbS(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      sv(SK.rezepteKorbAktiv, next)
      return next
    })
  }, [])

  const [tab, setTab] = useState('rezepte')
  const [editing, setEditing] = useState(null)
  const [konfigLoad, setKonfigLoad] = useState(null)

  const setZutaten = useCallback(v => { setZutatenS(v); saveZutaten(v) }, [])
  const setRezepte = useCallback(v => { setRezepteS(v); saveRezepte(v) }, [])
  const setSettings = useCallback(v => { setSettingsS(v); saveSettings(v) }, [])

  // Hardware-/Gesten-Zurück: Editor schließen → sonst zurück auf Rezepte-Tab → sonst Tool verlassen
  useEffect(() => {
    setBackInterceptor(
      editing !== null  ? () => setEditing(null)
      : tab !== 'rezepte' ? () => setTab('rezepte')
      : null
    )
    return () => setBackInterceptor(null)
  }, [editing, tab, setBackInterceptor])

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
    setTab('konfig')
  }, [])

  const sharedProps = {
    zutaten, rezepte, setZutaten, setRezepte,
    zById, rById, toolColor,
    onEdit: setEditing, addToKorb, removeFromKorb, updateKorbEintrag,
    korb,
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
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

      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="rezepte" size={20} />}
        eyebrow="Tool"
        title={<>Meal<em>prep</em></>}
      />

      <nav className={s.tabBar}>
        {TABS.map(({ id, label, Icon }) => {
          const on = tab === id
          const badge = id === 'kochen' && korb.eintraege.length > 0 ? korb.eintraege.length : null
          return (
            <button key={id}
              className={`${s.tab} ${on ? s.tabOn : ''}`}
              style={on ? { '--tool-color': toolColor } : {}}
              onClick={() => setTab(id)}>
              <span className={s.tabIcon}>
                <Icon size={19} />
                {badge != null && <span className={s.tabBadge}>{badge}</span>}
              </span>
              <span className={s.tabLabel}>{label}</span>
            </button>
          )
        })}
      </nav>

      <div className={s.content}>
        {tab === 'rezepte' && (
          <Sammlung {...sharedProps} ladeInKonfigurator={ladeInKonfigurator} />
        )}
        {tab === 'ketten' && <Grossrezepte {...sharedProps} />}
        {tab === 'konfig' && (
          <Konfigurator {...sharedProps} settings={settings}
            loadRezept={konfigLoad} onLoaded={() => setKonfigLoad(null)} />
        )}
        {tab === 'zutaten' && <Zutaten zutaten={zutaten} toolColor={toolColor} onEdit={setEditing} />}
        {tab === 'kochen' && (
          <Kochen korb={korb} setKorb={setKorb} zById={zById} rById={rById} rezepte={rezepte} toolColor={toolColor} />
        )}
      </div>
    </div>
  )
}
