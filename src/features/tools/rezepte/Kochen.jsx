import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { buildKochTodoBlock } from './kochTodo'
import Einkauf from './Einkauf.jsx'
import Kochanleitung from './Kochanleitung.jsx'
import { IconCalendar, IconCheck, IconClose, IconBasket } from './icons'
import s from './Kochen.module.css'

export default function Kochen({ korb, setKorb, zById, rById, rezepte, toolColor }) {
  const [view, setView] = useState('auswahl')   // 'auswahl' | 'anleitung' | 'einkauf'
  const [confirmLeeren, setConfirmLeeren] = useState(false)
  const [geladen, setGeladen] = useState(false)
  const { setTodos } = useAppStore()

  const resolveRezept = (ref) => typeof ref === 'string' ? rById(ref) : ref

  const korbGerichte = useMemo(() =>
    korb.eintraege
      .map(e => ({ rezept: resolveRezept(e.ref), portionen: e.portionen }))
      .filter(g => g.rezept != null),
    [korb, rezepte]
  )

  const kochzeit = useMemo(
    () => korbGerichte.reduce((sum, g) => sum + (g.rezept.kochdauer || 0), 0),
    [korbGerichte]
  )

  const handleInTagesplaner = () => {
    const block = buildKochTodoBlock(korbGerichte, zById, rById, toolColor)
    setTodos(t => [...t, block])
    setGeladen(true)
    setTimeout(() => setGeladen(false), 1600)
  }

  const setPortion = (idx, val) => {
    setKorb(k => ({
      ...k,
      eintraege: k.eintraege.map((e, i) => i === idx ? { ...e, portionen: Math.max(1, val) } : e),
    }))
  }

  const removeItem = (idx) => setKorb(k => ({ ...k, eintraege: k.eintraege.filter((_, i) => i !== idx) }))

  const handleLeeren = () => {
    if (!confirmLeeren) { setConfirmLeeren(true); return }
    setKorb(k => ({ ...k, eintraege: [] }))
    setConfirmLeeren(false)
  }

  if (korb.eintraege.length === 0) {
    return (
      <div className={s.wrap}>
        <div className={s.emptyBig}>
          <span className={s.emptyIcon}><IconBasket size={30} /></span>
          <p className={s.emptyTitle}>Noch nichts ausgewählt</p>
          <p className={s.emptyHint}>Wähle Gerichte in <b>Rezepte</b>, <b>Ketten</b> oder dem <b>Konfigurator</b> — sie landen hier.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={s.tabs}>
        {[['auswahl', 'Auswahl'], ['anleitung', 'Kochanleitung'], ['einkauf', 'Einkauf']].map(([v, label]) => (
          <button key={v}
            className={`${s.tab} ${view === v ? s.tabOn : ''}`}
            style={view === v ? { '--tool-color': toolColor } : {}}
            onClick={() => setView(v)}>
            {label}
          </button>
        ))}
      </div>

      {view === 'auswahl' && (
        <div className={s.panel}>
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
              <button className={s.leerenBtn} onClick={handleLeeren}>Auswahl leeren</button>
            )}
          </div>
        </div>
      )}

      {view === 'anleitung' && (
        <div className={s.panel}><Kochanleitung korbGerichte={korbGerichte} zById={zById} rById={rById} /></div>
      )}

      {view === 'einkauf' && (
        <div className={s.panel}><Einkauf korbGerichte={korbGerichte} zById={zById} rById={rById} /></div>
      )}
    </div>
  )
}
