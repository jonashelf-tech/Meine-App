import { MODULE_CONFIG, MODULE_ORDER } from './moduleConfig'
import ModuleIcon from './ModuleIcon'
import s from './EinheitPicker.module.css'

const ACTIVE = MODULE_ORDER.filter(id => !MODULE_CONFIG[id]?.archived)

const ChevUp   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg>)
const ChevDown = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>)
const XIcon    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>)
const PlusIcon = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>)

// Modul-Auswahl + Reihenfolge der täglichen Einheit. Geteiltes UI für Onboarding + Einstellungen.
export default function EinheitPicker({ selected, onChange }) {
  const sel       = selected.filter(id => ACTIVE.includes(id))
  const available = ACTIVE.filter(id => !sel.includes(id))

  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= sel.length) return
    const next = [...sel]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className={s.wrap}>
      <div className={s.secLabel}>Deine Einheit · {sel.length} {sel.length === 1 ? 'Modul' : 'Module'}</div>
      <div className={s.list}>
        {sel.map((id, i) => {
          const m = MODULE_CONFIG[id]
          return (
            <div key={id} className={s.row} style={{ '--accent': m.color }}>
              <span className={s.num}>{i + 1}</span>
              <span className={s.icon}><ModuleIcon id={id} size={18} /></span>
              <span className={s.name}>{m.name}</span>
              <div className={s.ord}>
                <button className={s.ordBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="nach oben"><ChevUp /></button>
                <button className={s.ordBtn} disabled={i === sel.length - 1} onClick={() => move(i, 1)} aria-label="nach unten"><ChevDown /></button>
              </div>
              <button className={s.rm} onClick={() => onChange(sel.filter(x => x !== id))} aria-label={`${m.name} entfernen`}><XIcon /></button>
            </div>
          )
        })}
        {sel.length === 0 && <div className={s.empty}>Wähle unten mindestens ein Modul.</div>}
      </div>

      {available.length > 0 && (
        <>
          <div className={s.secLabel}>Weitere Module</div>
          <div className={s.list}>
            {available.map(id => {
              const m = MODULE_CONFIG[id]
              return (
                <button key={id} className={[s.row, s.addRow].join(' ')} style={{ '--accent': m.color }} onClick={() => onChange([...sel, id])}>
                  <span className={s.icon}><ModuleIcon id={id} size={18} /></span>
                  <span className={s.name}>{m.name}</span>
                  <span className={s.dom}>{m.domain}</span>
                  <span className={s.add}><PlusIcon /></span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
