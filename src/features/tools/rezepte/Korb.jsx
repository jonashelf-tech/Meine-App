import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { createBlock } from '../../todos/Block'
import { korbSpeichern, korbDuplizieren } from './mealprepStore'
import { buildEinkauf } from './einkauf'
import Einkauf from './Einkauf.jsx'
import Kochanleitung from './Kochanleitung.jsx'
import { IconClose, IconArrowLeft, IconCart, IconClipboard, IconCopy, IconCalendar, IconCheck } from './icons'
import s from './Korb.module.css'

export default function Korb({ korb, setKorb, koerbe, setKoerbe, settings, setSettings, zById, rById, rezepte, onClose }) {
  const [view, setView] = useState('korb')  // 'korb' | 'einkauf' | 'anleitung'
  const [confirmLeeren, setConfirmLeeren] = useState(false)
  const [menuName, setMenuName] = useState('')
  const [geladen, setGeladen] = useState(false)

  const { toolColors, setTodos } = useAppStore()
  const toolColor = getToolColor('rezepte', toolColors)

  // Resolve ref to Rezept object (or inline gericht)
  const resolveRezept = (ref) => typeof ref === 'string' ? rById(ref) : ref

  const korbGerichte = useMemo(() =>
    korb.eintraege
      .map(e => ({ rezept: resolveRezept(e.ref), portionen: e.portionen }))
      .filter(g => g.rezept != null),
    [korb, rezepte]
  )

  // Summe der Kochzeiten (einmal pro Gericht, skaliert nicht mit Portionen)
  const kochzeit = useMemo(
    () => korbGerichte.reduce((sum, g) => sum + (g.rezept.kochdauer || 0), 0),
    [korbGerichte]
  )

  // Erzeugt einen Koch-Todo im Tagesplaner: Kochzeit als Dauer, Zutaten als Subtodos.
  const handleInTagesplaner = () => {
    const liste = buildEinkauf(korbGerichte, zById, rById)
    const subItems = liste.flatMap(g => g.items).map(item => ({
      id: crypto.randomUUID?.() ?? `${item.zutatId}-${Math.random()}`,
      text: `${item.name} · ${item.menge} ${item.einheit}`,
      done: false,
    }))
    const gerichteNamen = korbGerichte.map(g => g.rezept.name)
    const block = createBlock({
      text: `Meal Prep: ${gerichteNamen.join(', ')}`,
      duration: kochzeit || null,
      subItems,
      toolId: 'rezepte',
      color: toolColor,
      notes: gerichteNamen.map(n => `• ${n}`).join('\n'),
    })
    setTodos(t => [...t, block])
    setGeladen(true)
    setTimeout(() => { setGeladen(false); onClose() }, 1100)
  }

  const setPortion = (idx, val) => {
    const newEintraege = korb.eintraege.map((e, i) =>
      i === idx ? { ...e, portionen: Math.max(1, parseInt(val) || 1) } : e
    )
    setKorb(k => ({ ...k, eintraege: newEintraege }))
  }

  const removeItem = (idx) => {
    setKorb(k => ({ ...k, eintraege: k.eintraege.filter((_, i) => i !== idx) }))
  }

  const handleLeeren = () => {
    if (!confirmLeeren) { setConfirmLeeren(true); return }
    setKorb(k => ({ ...k, eintraege: [] }))
    setConfirmLeeren(false)
    onClose()
  }

  if (view === 'einkauf') {
    return (
      <div className={s.modal}>
        <div className={s.header}>
          <button className={s.backBtn} onClick={() => setView('korb')}><IconArrowLeft size={15} /> Zurück</button>
          <span className={s.title}>Einkaufsliste</span>
          <button className={s.closeBtn} onClick={onClose}><IconClose size={16} /></button>
        </div>
        <Einkauf korbGerichte={korbGerichte} zById={zById} rById={rById} />
      </div>
    )
  }

  if (view === 'anleitung') {
    return (
      <div className={s.modal}>
        <div className={s.header}>
          <button className={s.backBtn} onClick={() => setView('korb')}><IconArrowLeft size={15} /> Zurück</button>
          <span className={s.title}>Kochanleitung</span>
          <button className={s.closeBtn} onClick={onClose}><IconClose size={16} /></button>
        </div>
        <Kochanleitung korbGerichte={korbGerichte} zById={zById} rById={rById} />
      </div>
    )
  }

  // Default: korb view
  return (
    <div className={s.modal}>
      <div className={s.header}>
        <span className={s.title}>Kochen-Korb</span>
        <button className={s.closeBtn} onClick={onClose}><IconClose size={16} /></button>
      </div>
      <div className={s.body}>
        {korb.eintraege.length === 0 ? (
          <div className={s.empty}>Der Korb ist leer. Wähle Gerichte aus den Modulen.</div>
        ) : (
          <>
            {korb.eintraege.map((eintrag, idx) => {
              const r = resolveRezept(eintrag.ref)
              const name = r?.name ?? (typeof eintrag.ref === 'string' ? eintrag.ref : 'Unbekannt')
              return (
                <div key={idx} className={s.eintragRow}>
                  <span className={s.eintragName}>{name}</span>
                  <div className={s.portionStepper}>
                    <button className={s.stepBtnSm} onClick={() => setPortion(idx, eintrag.portionen - 1)}>−</button>
                    <span className={s.portionVal}>{eintrag.portionen}</span>
                    <button className={s.stepBtnSm} onClick={() => setPortion(idx, eintrag.portionen + 1)}>+</button>
                  </div>
                  <button className={s.removeBtn} onClick={() => removeItem(idx)}><IconClose size={15} /></button>
                </div>
              )
            })}

            <div className={s.actions}>
              <button className={s.actionBtn} onClick={() => setView('einkauf')}><IconCart size={16} /> Einkaufsliste</button>
              <button className={s.actionBtn} onClick={() => setView('anleitung')}><IconClipboard size={16} /> Kochanleitung</button>
            </div>

            <button className={`${s.tagesplanerBtn} ${geladen ? s.tagesplanerOk : ''}`}
              style={{ '--tool-color': toolColor }}
              onClick={handleInTagesplaner} disabled={geladen}>
              {geladen
                ? <><IconCheck size={16} /> In Tagesplaner geladen</>
                : <><IconCalendar size={16} /> Als Koch-Todo in Tagesplaner{kochzeit > 0 ? ` · ${kochzeit} min` : ''}</>}
            </button>

            <div className={s.leerenRow}>
              {confirmLeeren ? (
                <>
                  <button className={s.leerenConfirm} onClick={handleLeeren}>Ja, leeren</button>
                  <button className={s.cancelBtn} onClick={() => setConfirmLeeren(false)}>Abbrechen</button>
                </>
              ) : (
                <button className={s.leerenBtn} onClick={handleLeeren}>Korb leeren</button>
              )}
            </div>
          </>
        )}

        {/* Settings: standardPortionen */}
        <div className={s.settingsRow}>
          <span className={s.settingsLabel}>Standard-Portionen</span>
          <div className={s.stepper}>
            <button className={s.stepBtnSm} onClick={() => setSettings(s2 => ({ ...s2, standardPortionen: Math.max(1, (s2.standardPortionen ?? 4) - 1) }))}>−</button>
            <span className={s.portionVal}>{settings?.standardPortionen ?? 4}</span>
            <button className={s.stepBtnSm} onClick={() => setSettings(s2 => ({ ...s2, standardPortionen: (s2.standardPortionen ?? 4) + 1 }))}>+</button>
          </div>
        </div>

        {/* Gespeicherte Menüs */}
        <div className={s.menuSection}>
          <div className={s.menuHead}>Gespeicherte Menüs</div>
          {koerbe.filter(k => k.gespeichert).length === 0 ? (
            <div className={s.menuEmpty}>Noch keine Menüs gespeichert.</div>
          ) : koerbe.filter(k => k.gespeichert).map(menu => (
            <div key={menu.id} className={s.menuRow}>
              <span className={s.menuName}>{menu.name}</span>
              <button className={s.menuLoadBtn} onClick={() => { setKorb({ ...menu, gespeichert: false }); onClose() }}>Laden</button>
              <button className={s.menuDupBtn} onClick={() => setKoerbe(korbDuplizieren(koerbe, menu.id))} title="Duplizieren"><IconCopy size={15} /></button>
            </div>
          ))}
          <div className={s.menuSaveRow}>
            <input className={s.menuNameInput} value={menuName} onChange={e => setMenuName(e.target.value)} placeholder="Menü-Name…"/>
            <button className={s.menuSaveBtn}
              disabled={!menuName.trim() || korb.eintraege.length === 0}
              onClick={() => {
                const saved = korbSpeichern(koerbe, { ...korb, name: menuName.trim() })
                setKoerbe(saved)
                setMenuName('')
              }}>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
