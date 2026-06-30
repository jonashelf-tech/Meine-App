import { useState } from 'react'
import { createRezept, istBasis } from './mealprepModel'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import { IconChevron, IconEdit, IconSnow, IconClock, IconCheck } from './icons'
import s from './Grossrezepte.module.css'

export default function Grossrezepte({ rezepte, zById, rById, toolColor, onEdit, onView, addToKorb, removeFromKorb, korb }) {
  const [collapsed, setCollapsed] = useState({})

  // Auswahl direkt aus dem Korb ableiten (wie Sammlung). Mengen kommen im Portionen-Schritt.
  const selectedIds = new Set((korb?.eintraege ?? []).map(e => e.ref))
  const toggleSelect = (rezeptId, portionen) => {
    if (selectedIds.has(rezeptId)) removeFromKorb(rezeptId)
    else addToKorb(rezeptId, portionen)
  }

  const ableitungenFor = (basisId) =>
    rezepte.filter(r => (r.komponenten ?? []).some(k => k.rezeptId === basisId))

  // Ist r eine (Zwischen-)Basis mit eigenen Ableitungen → wird als Abzweig dargestellt
  const istAbzweig = (r) => istBasis(r) && ableitungenFor(r.id).length > 0
  const basen = rezepte.filter(istAbzweig)
  // Top-Level = Basen, die nicht selbst aus einer anderen Basis abgeleitet sind
  const istSubBasis = (b) => (b.komponenten ?? []).some(k => istBasis(rById(k.rezeptId)))
  const topBasen = basen.filter(b => !istSubBasis(b))

  // ── Wählbare Zeile (Endgericht ODER die pure Basis) ───────────────────────
  const SelectRow = (r, isBasisRow = false) => {
    const np = rezeptProPortion(r, zById, rById)
    const isSel = selectedIds.has(r.id)
    return (
      <div key={r.id} className={`${s.row} ${isSel ? s.rowActive : ''}`}>
        <button
          className={`${s.selectBtn} ${isSel ? s.selectBtnOn : ''}`}
          onClick={() => toggleSelect(r.id, r.basisPortionen)}
          style={isSel ? { '--tool-color': toolColor } : {}}
          aria-label={isSel ? 'entfernen' : 'hinzufügen'}
        >
          {isSel && <IconCheck size={14} />}
        </button>
        <div className={s.rowMain} onClick={() => onView(r)}>
          <div className={s.rowTop}>
            <span className={s.rowName}>{isBasisRow ? `${r.name} pur` : r.name}</span>
            {isBasisRow && <span className={s.basisTag}>Basis</span>}
            {r.aufbewahrung?.tk && <span className={s.tag} title="TK-geeignet"><IconSnow size={12} /></span>}
          </div>
          <Naehrwert n={np} />
        </div>
      </div>
    )
  }

  // ── Basis-Block (rekursiv: Abzweige verschachteln sich) ───────────────────
  const BasisBlock = (basis, tiefe) => {
    const ableitungen = ableitungenFor(basis.id)
    const isOpen = !!collapsed[basis.id]
    const isTop = tiefe === 0
    const endGerichte = ableitungen.filter(r => !istAbzweig(r))
    const abzweige = ableitungen.filter(istAbzweig)

    return (
      <div key={basis.id} className={isTop ? s.card : s.branch}>
        <div className={isTop ? s.cardHeader : s.branchHeader}
          onClick={() => setCollapsed(c => ({ ...c, [basis.id]: !c[basis.id] }))}>
          <div className={s.cardHeaderLeft}>
            {basis.langlaeufer && <span className={s.langBadge} title="Langläufer"><IconClock size={13} /></span>}
            <span className={isTop ? s.cardTitle : s.branchTitle}>{basis.name}</span>
          </div>
          <div className={s.cardHeaderRight}>
            <button className={s.editBtn} onClick={e => { e.stopPropagation(); onEdit({ form: 'rezept', data: basis }) }}><IconEdit size={15} /></button>
            <span className={`${s.chevron} ${isOpen ? '' : s.chevronClosed}`}><IconChevron size={14} /></span>
          </div>
        </div>

        {isOpen && (
          <div className={s.cardBody}>
            {SelectRow(basis, true)}
            {abzweige.map(ab => BasisBlock(ab, tiefe + 1))}
            {endGerichte.map(r => SelectRow(r))}
            <div className={s.cardFooter}>
              <button className={s.addAbleitungBtn}
                onClick={() => onEdit({ form: 'rezept', data: createRezept({ komponenten: [{ rezeptId: basis.id, menge: basis.ergibtMenge ?? 500 }] }) })}>
                + Ableitung
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const introText = 'Eine Basis 1× kochen → viele Gerichte. Tippe Gerichte oder die Basis selbst an — die Mengen stellst du danach im Portionen-Schritt ein.'

  if (topBasen.length === 0) {
    return (
      <div className={s.wrap}>
        <div className={s.intro}>{introText}</div>
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
      <div className={s.intro}>{introText}</div>
      <div className={s.topBar}>
        <button className={s.addBtn}
          onClick={() => onEdit({ form: 'rezept', data: createRezept({ ergibtMenge: 0, ergibtEinheit: 'ml' }) })}>
          + Basis
        </button>
      </div>

      {topBasen.map(basis => BasisBlock(basis, 0))}
    </div>
  )
}
