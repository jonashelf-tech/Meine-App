import { useState, useMemo } from 'react'
import { createRezept, istBasis } from './mealprepModel'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import s from './Grossrezepte.module.css'

export default function Grossrezepte({ rezepte, zById, rById, toolColor, onEdit, updateKorbEintrag }) {
  const [collapsed, setCollapsed] = useState({})
  const [mengen, setMengen] = useState({})   // { [rezeptId]: anzahlBatches }

  const basen = rezepte.filter(istBasis)

  const ableitungenFor = (basisId) =>
    rezepte.filter(r => (r.komponenten ?? []).some(k => k.rezeptId === basisId))

  const setMenge = (rezeptId, basisPortionen, anzahl) => {
    const val = Math.max(0, anzahl)
    setMengen(m => ({ ...m, [rezeptId]: val }))
    updateKorbEintrag(rezeptId, val * basisPortionen)
  }

  // Gesamtbedarf der Basis aus allen aktiven Ableitungen
  const basisBedarf = useMemo(() => {
    const acc = {}
    for (const [rezeptId, anzahl] of Object.entries(mengen)) {
      if (!anzahl) continue
      const abl = rezepte.find(r => r.id === rezeptId)
      if (!abl) continue
      for (const k of abl.komponenten ?? []) {
        if (!k.rezeptId) continue
        acc[k.rezeptId] = (acc[k.rezeptId] ?? 0) + k.menge * anzahl
      }
    }
    return acc
  }, [mengen, rezepte])

  if (basen.length === 0) {
    return (
      <div className={s.wrap}>
        <div className={s.empty}>Noch keine Basis-Rezepte. Lege ein Rezept mit „Ergibt Menge" an.</div>
        <button className={s.addBtn}
          onClick={() => onEdit({ form: 'rezept', data: createRezept({ ergibtMenge: 0, ergibtEinheit: 'ml' }) })}>
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
        const bedarf = basisBedarf[basis.id] ?? 0
        const batches = bedarf > 0 ? Math.ceil(bedarf / basis.ergibtMenge) : 0
        const hasSelected = ableitungen.some(r => (mengen[r.id] ?? 0) > 0)

        return (
          <div key={basis.id} className={s.card}>
            <div className={s.cardHeader} onClick={() => setCollapsed(c => ({ ...c, [basis.id]: !c[basis.id] }))}>
              <div className={s.cardHeaderLeft}>
                {basis.langlaeufer && <span className={s.langBadge}>⏱</span>}
                <span className={s.cardTitle}>{basis.name}</span>
                {basis.ergibtMenge && (
                  <span className={s.dim}>ergibt {basis.ergibtMenge} {basis.ergibtEinheit}</span>
                )}
              </div>
              <div className={s.cardHeaderRight}>
                {bedarf > 0 && (
                  <span className={s.bedarfBadge} style={{ '--tool-color': toolColor }}>
                    {bedarf} {basis.ergibtEinheit} · {batches}×
                  </span>
                )}
                <span className={s.ablCount}>{ableitungen.length}</span>
                <button className={s.editBtn} onClick={e => { e.stopPropagation(); onEdit({ form: 'rezept', data: basis }) }}>✎</button>
                <span className={s.chevron}>{isOpen ? '▾' : '▸'}</span>
              </div>
            </div>

            {isOpen && (
              <div className={s.cardBody}>
                {ableitungen.length === 0 ? (
                  <div className={s.emptyInner}>Keine Ableitungen. Erstelle ein Rezept mit dieser Basis als Komponente.</div>
                ) : ableitungen.map(r => {
                  const anzahl = mengen[r.id] ?? 0
                  const np = rezeptProPortion(r, zById, rById)
                  const isActive = anzahl > 0
                  return (
                    <div key={r.id} className={`${s.row} ${isActive ? s.rowActive : ''}`}>
                      <div className={s.stepper}>
                        <button className={s.stepBtn}
                          onClick={() => setMenge(r.id, r.basisPortionen, anzahl - 1)}>−</button>
                        <span className={`${s.stepVal} ${isActive ? s.stepValActive : ''}`}
                          style={isActive ? { '--tool-color': toolColor } : {}}>{anzahl}</span>
                        <button className={s.stepBtn}
                          onClick={() => setMenge(r.id, r.basisPortionen, anzahl + 1)}>+</button>
                      </div>
                      <div className={s.rowMain}>
                        <span className={s.rowName}>{r.name}</span>
                        {isActive && (
                          <span className={s.portionenHint}>{anzahl * r.basisPortionen} P</span>
                        )}
                        <Naehrwert n={np} />
                        {r.aufbewahrung?.tk && <span className={s.tag}>❄</span>}
                      </div>
                      <button className={s.editBtn} onClick={() => onEdit({ form: 'rezept', data: r })}>✎</button>
                    </div>
                  )
                })}

                <div className={s.cardFooter}>
                  <button className={s.addAbleitungBtn}
                    onClick={() => onEdit({ form: 'rezept', data: createRezept({ komponenten: [{ rezeptId: basis.id, menge: basis.ergibtMenge ?? 500 }] }) })}>
                    + Ableitung
                  </button>
                  {hasSelected && (
                    <div className={s.bedarfRow}>
                      <span className={s.bedarfText}>
                        Basis: {bedarf} {basis.ergibtEinheit} · {batches} {batches === 1 ? 'Batch' : 'Batches'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
