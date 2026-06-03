import { useState, useMemo } from 'react'
import { buildEinkauf } from './einkauf'
import s from './Einkauf.module.css'

const fmtMenge = (m) => Number.isInteger(m) ? m : m.toFixed(1)

export default function Einkauf({ korbGerichte, zById, rById }) {
  const liste = useMemo(() => buildEinkauf(korbGerichte, zById, rById), [korbGerichte])
  const [states, setStates] = useState({})  // zutatId → 'checked' | 'deleted' | undefined
  const [confirmLeeren, setConfirmLeeren] = useState(false)

  const tapItem = (zutatId) => {
    setStates(prev => {
      const cur = prev[zutatId]
      const next = { ...prev }
      if (!cur) next[zutatId] = 'checked'
      else if (cur === 'checked') next[zutatId] = 'deleted'
      else delete next[zutatId]
      return next
    })
  }

  const allItems = liste.flatMap(g => g.items)
  const openItems = allItems.filter(i => !states[i.zutatId])
  const checkedItems = allItems.filter(i => states[i.zutatId] === 'checked')
  const deletedItems = allItems.filter(i => states[i.zutatId] === 'deleted')

  const handleLeeren = () => {
    if (!confirmLeeren) { setConfirmLeeren(true); return }
    setStates({})
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
        {deletedItems.length > 0 && <span> · {deletedItems.length} entfernt</span>}
        {confirmLeeren ? (
          <div className={s.confirmRow}>
            <button className={s.leerenConfirm} onClick={handleLeeren}>Leeren</button>
            <button className={s.cancelBtn} onClick={() => setConfirmLeeren(false)}>Nein</button>
          </div>
        ) : (
          <button className={s.leerenBtn} onClick={handleLeeren}>Leeren</button>
        )}
      </div>
      <div className={s.hint}>1× = gekauft · 2× = entfernt · 3× = zurück</div>

      {liste.map(({ kategorie, items }) => {
        const visible = items.filter(i => !states[i.zutatId])
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
          <div className={s.gruppeTitle}>✓ Gekauft</div>
          {checkedItems.map(item => (
            <div key={item.zutatId} onClick={() => tapItem(item.zutatId)} className={`${s.item} ${s.itemChecked}`}>
              <span className={s.itemName}>{item.name}</span>
              <span className={s.itemMenge}>{fmtMenge(item.menge)} {item.einheit}</span>
            </div>
          ))}
        </div>
      )}

      {deletedItems.length > 0 && (
        <div className={s.gruppe}>
          <div className={s.gruppeTitle}>Entfernt</div>
          {deletedItems.map(item => (
            <div key={item.zutatId} onClick={() => tapItem(item.zutatId)} className={`${s.item} ${s.itemDeleted}`}>
              <span className={s.itemName}>{item.name}</span>
              <span className={s.itemMenge}>{fmtMenge(item.menge)} {item.einheit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
