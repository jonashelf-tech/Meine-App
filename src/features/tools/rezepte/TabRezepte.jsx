import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { loadAll, saveZutaten, saveRezepte, saveKoerbe, saveSettings } from './mealprepStore'
import { createKorb } from './mealprepModel'
import Sammlung from './Sammlung'
import Grossrezepte from './Grossrezepte'
import Konfigurator from './Konfigurator.jsx'
import Editor from './Editor'
import Korb from './Korb'
import s from './TabRezepte.module.css'

const MODULE = [['konfig', 'Konfigurator'], ['gross', 'Großrezepte'], ['sammlung', 'Sammlung']]

export default function TabRezepte({ onBack }) {
  const { toolColors, setBackInterceptor } = useAppStore()
  const toolColor = getToolColor('rezepte', toolColors)

  const init = useMemo(() => loadAll(), [])
  const [zutaten, setZutatenS] = useState(init.zutaten)
  const [rezepte, setRezepteS] = useState(init.rezepte)
  const [koerbe,  setKoerbeS]  = useState(init.koerbe)
  const [settings, setSettingsS] = useState(init.settings)
  const [korb, setKorb] = useState(() => createKorb({ name: 'Aktueller Korb' }))

  const [modul, setModul] = useState('konfig')
  const [editing, setEditing] = useState(null)
  const [korbOpen, setKorbOpen] = useState(false)
  const [konfigLoad, setKonfigLoad] = useState(null)

  const setZutaten = useCallback(v => { setZutatenS(v); saveZutaten(v) }, [])
  const setRezepte = useCallback(v => { setRezepteS(v); saveRezepte(v) }, [])
  const setKoerbe  = useCallback(v => { setKoerbeS(v);  saveKoerbe(v) }, [])
  const setSettings= useCallback(v => { setSettingsS(v); saveSettings(v) }, [])

  useEffect(() => {
    const hasOverlay = editing !== null || korbOpen
    setBackInterceptor(hasOverlay ? () => { setEditing(null); setKorbOpen(false) } : null)
    return () => setBackInterceptor(null)
  }, [editing, korbOpen, setBackInterceptor])

  const zById = useCallback(id => zutaten.find(z => z.id === id), [zutaten])
  const rById = useCallback(id => rezepte.find(r => r.id === id), [rezepte])

  const addToKorb = useCallback((ref, portionen) => {
    setKorb(k => ({ ...k, eintraege: [...k.eintraege, { ref, portionen }] }))
  }, [])

  const ladeInKonfigurator = useCallback((rezept) => {
    setKonfigLoad(rezept)
    setModul('konfig')
  }, [])

  const sharedProps = {
    zutaten, rezepte, setZutaten, setRezepte,
    zById, rById, toolColor,
    onEdit: setEditing, addToKorb,
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      {editing && (
        <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <Editor {...editing} zutaten={zutaten} rezepte={rezepte} koerbe={koerbe}
            onSaveZutat={z => { setZutaten(prev => prev.some(x => x.id === z.id) ? prev.map(x => x.id === z.id ? z : x) : [...prev, z]); setEditing(null) }}
            onSaveRezept={r => { setRezepte(prev => prev.some(x => x.id === r.id) ? prev.map(x => x.id === r.id ? r : x) : [...prev, r]); setEditing(null) }}
            onDelete={(id, form) => { if (form === 'zutat') setZutaten(prev => prev.filter(x => x.id !== id)); else setRezepte(prev => prev.filter(x => x.id !== id)); setEditing(null) }}
            onOpenKonfigurator={r => { ladeInKonfigurator(r); setEditing(null) }}
            onClose={() => setEditing(null)} />
        </div>
      )}
      {korbOpen && (
        <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) setKorbOpen(false) }}>
          <Korb korb={korb} setKorb={setKorb} koerbe={koerbe} setKoerbe={setKoerbe}
            settings={settings} setSettings={setSettings}
            zById={zById} rById={rById} rezepte={rezepte}
            onClose={() => setKorbOpen(false)} />
        </div>
      )}

      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="rezepte" size={20} />}
        eyebrow="Tool"
        title={<>Meal<em>prep</em></>}
      />

      <div className={s.subtabs}>
        {MODULE.map(([id, label]) => (
          <button key={id}
            className={`${s.subtab} ${modul === id ? s.subtabActive : ''}`}
            onClick={() => setModul(id)}>
            {label}
          </button>
        ))}
      </div>

      {modul === 'konfig' && (
        <Konfigurator {...sharedProps} settings={settings}
          loadRezept={konfigLoad} onLoaded={() => setKonfigLoad(null)} />
      )}
      {modul === 'gross' && <Grossrezepte {...sharedProps} />}
      {modul === 'sammlung' && (
        <Sammlung {...sharedProps} ladeInKonfigurator={ladeInKonfigurator} />
      )}

      {korb.eintraege.length > 0 && (
        <button className={s.korbPille} onClick={() => setKorbOpen(true)}>
          🧺 Korb · {korb.eintraege.length}
        </button>
      )}
    </div>
  )
}
