import { useState } from 'react'
import { createRezept, istBasis } from './mealprepModel'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import s from './Grossrezepte.module.css'

export default function Grossrezepte({ rezepte, zById, rById, toolColor, onEdit, addToKorb }) {
  const [collapsed, setCollapsed] = useState({})
  const [selected, setSelected] = useState(new Set())

  const basen = rezepte.filter(istBasis)

  const ableitungenFor = (basisId) =>
    rezepte.filter(r => (r.komponenten ?? []).some(k => k.rezeptId === basisId))

  const toggleCollapsed = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }))

  const toggleSelect = (rezeptId, portionen) => {
    if (selected.has(rezeptId)) {
      const next = new Set(selected); next.delete(rezeptId); setSelected(next)
    } else {
      setSelected(new Set([...selected, rezeptId]))
      addToKorb(rezeptId, portionen)
    }
  }

  if (basen.length === 0) {
    return (
      <div className={s.wrap}>
        <div className={s.empty}>
          Noch keine Basis-Rezepte. Lege ein Rezept mit &quot;Ergibt Menge&quot; an, damit es hier erscheint.
        </div>
        <button className={s.addBtn} onClick={() => onEdit({ form: 'rezept', data: createRezept({ ergibtMenge: 0, ergibtEinheit: 'ml' }) })}>
          + Basis anlegen
        </button>
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={s.topBar}>
        <button className={s.addBtn}
          onClick={() => onEdit({ form: 'rezept', data: createRezept({ ergibtMenge: 0, ergibtEinheit: 'ml' }) })}>
          + Basis
        </button>
      </div>

      {basen.map(basis => {
        const ableitungen = ableitungenFor(basis.id)
        const isOpen = !collapsed[basis.id]
        return (
          <div key={basis.id} className={s.card}>
            <div className={s.cardHeader} onClick={() => toggleCollapsed(basis.id)}>
              <div className={s.cardHeaderLeft}>
                {basis.langlaeufer && <span className={s.langBadge}>⏱</span>}
                <span className={s.cardTitle}>{basis.name}</span>
                {basis.ergibtMenge && (
                  <span className={s.dim}>{basis.ergibtMenge} {basis.ergibtEinheit}</span>
                )}
              </div>
              <div className={s.cardHeaderRight}>
                <span className={s.count}>{ableitungen.length}</span>
                <button className={s.editBtn} onClick={e => { e.stopPropagation(); onEdit({ form: 'rezept', data: basis }) }}>✎</button>
                <span className={s.chevron}>{isOpen ? '▾' : '▸'}</span>
              </div>
            </div>

            {isOpen && (
              <div className={s.cardBody}>
                {ableitungen.length === 0 ? (
                  <div className={s.emptyInner}>Keine Ableitungen. Erstelle ein Rezept mit dieser Basis als Komponente.</div>
                ) : ableitungen.map(r => {
                  const np = rezeptProPortion(r, zById, rById)
                  const isSel = selected.has(r.id)
                  return (
                    <div key={r.id} className={`${s.row} ${isSel ? s.rowSelected : ''}`}>
                      <button
                        className={`${s.selectBtn} ${isSel ? s.selectBtnOn : ''}`}
                        onClick={() => toggleSelect(r.id, r.basisPortionen)}
                        style={{ '--tool-color': toolColor }}
                      >
                        {isSel ? '✓' : '○'}
                      </button>
                      <div className={s.rowMain}>
                        <span className={s.rowName}>{r.name}</span>
                        <Naehrwert n={np} />
                        {r.aufbewahrung?.tk && <span className={s.tag}>❄</span>}
                      </div>
                      <button className={s.editBtn} onClick={() => onEdit({ form: 'rezept', data: r })}>✎</button>
                    </div>
                  )
                })}
                <button className={s.addAbleitungBtn}
                  onClick={() => onEdit({ form: 'rezept', data: createRezept({ komponenten: [{ rezeptId: basis.id, menge: basis.ergibtMenge ?? 500 }] }) })}>
                  + Ableitung
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
