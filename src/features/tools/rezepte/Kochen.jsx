import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { portionenSplit } from './mealprepModel'
import { buildKochTodoBlock, buildEinkaufTodoBlock } from './kochTodo'
import Einkauf from './Einkauf.jsx'
import Kochanleitung from './Kochanleitung.jsx'
import { IconCalendar, IconCheck, IconBasket, IconSnow } from './icons'
import s from './Kochen.module.css'

export default function Kochen({ korb, setKorb, zById, rById, rezepte, toolColor, onUebernehmen }) {
  const [view, setView] = useState('einkauf')   // 'einkauf' | 'anleitung'
  const [confirmLeeren, setConfirmLeeren] = useState(false)
  const [kochGeladen, setKochGeladen] = useState(false)
  const [uebernommen, setUebernommen] = useState(false)
  const { setTodos } = useAppStore()

  const resolveRezept = (ref) => typeof ref === 'string' ? rById(ref) : ref

  // Gericht-Form für Einkauf (Frisch/TK-Split) und Kochanleitung (Gesamtportionen).
  const korbGerichte = useMemo(() =>
    korb.eintraege
      .map(e => {
        const split = portionenSplit(e)
        return { rezept: resolveRezept(e.ref), portionen: split.total, frisch: split.frisch, bloecke: split.bloecke }
      })
      .filter(g => g.rezept != null),
    [korb, rezepte] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const kochzeit = useMemo(
    () => korbGerichte.reduce((sum, g) => sum + (g.rezept.kochdauer || 0), 0),
    [korbGerichte]
  )
  const totalBloecke = useMemo(
    () => korbGerichte.reduce((sum, g) => sum + (g.bloecke || 0), 0),
    [korbGerichte]
  )

  // TK-Blöcke dieses Durchgangs in den Froster buchen (1 Tipp, kein Doppel-Buchen)
  const handleUebernehmen = () => {
    if (uebernommen) return
    onUebernehmen?.(korbGerichte)
    setUebernommen(true)
  }

  const handleKochTodo = () => {
    const block = buildKochTodoBlock(korbGerichte, zById, rById, toolColor)
    setTodos(t => [...t, block])
    setKochGeladen(true)
    setTimeout(() => setKochGeladen(false), 1600)
  }

  const handleEinkaufTodo = () => {
    const block = buildEinkaufTodoBlock(korbGerichte, zById, rById, toolColor)
    setTodos(t => [...t, block])
  }

  const handleLeeren = () => {
    if (!confirmLeeren) { setConfirmLeeren(true); return }
    setKorb(k => ({ ...k, eintraege: [], einkaufChecked: {}, kochChecked: {} }))
    setConfirmLeeren(false)
  }

  // Abhak-Zustände leben im persistenten Korb — überleben Reload/App-Kill
  const toggleChecked = (field) => (key) => setKorb(k => {
    const c = { ...(k[field] ?? {}) }
    if (c[key]) delete c[key]; else c[key] = true
    return { ...k, [field]: c }
  })
  const toggleEinkauf = toggleChecked('einkaufChecked')
  const toggleKoch    = toggleChecked('kochChecked')
  const clearEinkauf  = () => setKorb(k => ({ ...k, einkaufChecked: {} }))

  if (korb.eintraege.length === 0) {
    return (
      <div className={s.wrap}>
        <div className={s.emptyBig}>
          <span className={s.emptyIcon}><IconBasket size={30} /></span>
          <p className={s.emptyTitle}>Noch nichts ausgewählt</p>
          <p className={s.emptyHint}>Wähle Gerichte in <b>Rezepte</b> oder <b>Ketten</b> — dann stell die Portionen ein.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={s.tabs}>
        {[['einkauf', 'Einkauf'], ['anleitung', 'Kochanleitung']].map(([v, label]) => (
          <button key={v}
            className={`${s.tab} ${view === v ? s.tabOn : ''}`}
            style={view === v ? { '--tool-color': toolColor } : {}}
            onClick={() => setView(v)}>
            {label}
          </button>
        ))}
      </div>

      {view === 'einkauf' && (
        <div className={s.panel}>
          <Einkauf korbGerichte={korbGerichte} zById={zById} rById={rById}
            checked={korb.einkaufChecked ?? {}} onToggle={toggleEinkauf} onClear={clearEinkauf}
            onExport={handleEinkaufTodo} />
        </div>
      )}

      {view === 'anleitung' && (
        <div className={s.panel}>
          <Kochanleitung korbGerichte={korbGerichte} zById={zById} rById={rById}
            checked={korb.kochChecked ?? {}} onToggle={toggleKoch} />
          <button className={`${s.tagesplanerBtn} ${kochGeladen ? s.tagesplanerOk : ''}`}
            style={{ '--tool-color': toolColor }}
            onClick={handleKochTodo} disabled={kochGeladen}>
            {kochGeladen
              ? <><IconCheck size={16} /> In Tagesplaner geladen</>
              : <><IconCalendar size={16} /> Kochen einplanen{kochzeit > 0 ? ` · ${kochzeit} min` : ''}</>}
          </button>
          {totalBloecke > 0 && (
            <button className={`${s.frosterBtn} ${uebernommen ? s.frosterOk : ''}`}
              onClick={handleUebernehmen} disabled={uebernommen}>
              {uebernommen
                ? <><IconCheck size={16} /> {totalBloecke} {totalBloecke === 1 ? 'Block' : 'Blöcke'} im Froster</>
                : <><IconSnow size={16} /> {totalBloecke} {totalBloecke === 1 ? 'Block' : 'Blöcke'} in Froster übernehmen</>}
            </button>
          )}
        </div>
      )}

      <div className={s.leerenRow}>
        {confirmLeeren ? (
          <>
            <button className={s.leerenConfirm} onClick={handleLeeren}>Ja, Durchgang leeren</button>
            <button className={s.cancelBtn} onClick={() => setConfirmLeeren(false)}>Abbrechen</button>
          </>
        ) : (
          <button className={s.leerenBtn} onClick={handleLeeren}>Durchgang leeren</button>
        )}
      </div>
    </div>
  )
}
