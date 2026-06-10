import { useState, useMemo } from 'react'
import { buildEinkauf } from './einkauf'
import { IconCheck } from './icons'
import s from './Einkauf.module.css'

const fmtMenge = (m) => Number.isInteger(m) ? m : m.toFixed(1)

export default function Einkauf({ korbGerichte, zById, rById }) {
  const liste = useMemo(() => buildEinkauf(korbGerichte, zById, rById), [korbGerichte])
  const [checked, setChecked] = useState({})  // zutatId → true (gekauft)
  const [confirmLeeren, setConfirmLeeren] = useState(false)

  // 1× tippen = gekauft (rutscht runter, durchgestrichen) · nochmal = zurück
  const tapItem = (zutatId) => {
    setChecked(prev => {
      const next = { ...prev }
      if (next[zutatId]) delete next[zutatId]
      else next[zutatId] = true
      return next
    })
  }

  const allItems = liste.flatMap(g => g.items)
  const openItems = allItems.filter(i => !checked[i.zutatId])
  const checkedItems = allItems.filter(i => checked[i.zutatId])

  const handleLeeren = () => {
    if (!confirmLeeren) { setConfirmLeeren(true); return }
    setChecked({})
    setConfirmLeeren(false)
  }

  if (liste.length === 0) {
    return <div className={s.empty}>Keine Zutaten im Korb.</div>
  }

  return (
    <div className={s.wrap}>
      <div className={s.stats}>
        <span className={s.statOpen}>{openItems.length} offen</span>
        {checkedItems.length > 0 && <span> · {checkedItems.length} gekauft</span>}
        {confirmLeeren ? (
          <div className={s.confirmRow}>
            <button className={s.leerenConfirm} onClick={handleLeeren}>Leeren</button>
            <button className={s.cancelBtn} onClick={() => setConfirmLeeren(false)}>Nein</button>
          </div>
        ) : (
          <button className={s.leerenBtn} onClick={handleLeeren}>Leeren</button>
        )}
      </div>
      <div className={s.hint}>Tippen = gekauft · nochmal tippen = zurück</div>

      {liste.map(({ kategorie, items }) => {
        const visible = items.filter(i => !checked[i.zutatId])
        if (visible.length === 0) return null
        return (
          <div key={kategorie} className={s.gruppe}>
            <div className={s.gruppeTitle}>{kategorie}</div>
            {visible.map((item, idx) => (
              <div key={item.zutatId} onClick={() => tapItem(item.zutatId)}
                className={`${s.item} ${idx % 2 === 0 ? s.itemAlt : ''}`}>
                <span className={s.itemName}>{item.name}</span>
                <span className={s.itemMenge}>{fmtMenge(item.menge)} {item.einheit}</span>
              </div>
            ))}
          </div>
        )
      })}

      {checkedItems.length > 0 && (
        <div className={s.gruppe}>
          <div className={`${s.gruppeTitle} ${s.gruppeTitleIcon}`}><IconCheck size={13} /> Gekauft</div>
          {checkedItems.map(item => (
            <div key={item.zutatId} onClick={() => tapItem(item.zutatId)} className={`${s.item} ${s.itemChecked}`}>
              <span className={s.itemName}>{item.name}</span>
              <span className={s.itemMenge}>{fmtMenge(item.menge)} {item.einheit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
