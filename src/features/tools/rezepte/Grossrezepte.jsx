import { useState, useMemo, useEffect } from 'react'
import { createRezept, istBasis } from './mealprepModel'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import { IconChevron, IconEdit, IconSnow, IconClock } from './icons'
import s from './Grossrezepte.module.css'

export default function Grossrezepte({ rezepte, zById, rById, toolColor, onEdit, onView, updateKorbEintrag, korb }) {
  const [collapsed, setCollapsed] = useState({})
  const [mengen, setMengen] = useState({})   // { [rezeptId]: anzahlBatches }

  const ableitungenFor = (basisId) =>
    rezepte.filter(r => (r.komponenten ?? []).some(k => k.rezeptId === basisId))

  // Ist r eine (Zwischen-)Basis mit eigenen Ableitungen → wird als Abzweig dargestellt
  const istAbzweig = (r) => istBasis(r) && ableitungenFor(r.id).length > 0

  // Alle Abzweig-Basen
  const basen = rezepte.filter(istAbzweig)
  // Top-Level = Basen, die nicht selbst aus einer anderen Basis abgeleitet sind
  const istSubBasis = (b) => (b.komponenten ?? []).some(k => istBasis(rById(k.rezeptId)))
  const topBasen = basen.filter(b => !istSubBasis(b))

  // Mengen aus dem Korb ableiten – Korb ist Single Source of Truth.
  useEffect(() => {
    const derived = {}
    for (const e of (korb?.eintraege ?? [])) {
      const r = rezepte.find(r2 => r2.id === e.ref)
      if (!r?.basisPortionen) continue
      const batches = Math.round(e.portionen / r.basisPortionen)
      if (batches > 0) derived[e.ref] = batches
    }
    setMengen(derived)
  }, [korb?.eintraege, rezepte])

  const setMenge = (rezeptId, basisPortionen, anzahl) => {
    const val = Math.max(0, anzahl)
    setMengen(m => ({ ...m, [rezeptId]: val }))
    updateKorbEintrag(rezeptId, val * basisPortionen)
  }

  // Gesamtbedarf jeder Basis – rekursiv über mehrstufige Ketten.
  const basisBedarf = useMemo(() => {
    const acc = {}
    const find = (id) => rezepte.find(r => r.id === id)
    const add = (rezept, faktor, seen) => {
      for (const k of rezept.komponenten ?? []) {
        if (!k.rezeptId) continue
        const basis = find(k.rezeptId)
        if (!basis) continue
        const mengeAbs = k.menge * faktor
        acc[k.rezeptId] = (acc[k.rezeptId] ?? 0) + mengeAbs
        if (basis.ergibtMenge && !seen.has(k.rezeptId)) {
          add(basis, mengeAbs / basis.ergibtMenge, new Set([...seen, k.rezeptId]))
        }
      }
    }
    for (const [rezeptId, anzahl] of Object.entries(mengen)) {
      if (!anzahl) continue
      const abl = find(rezeptId)
      if (abl) add(abl, anzahl, new Set())
    }
    return acc
  }, [mengen, rezepte])

  // ── Endgericht-Zeile mit Stepper ──────────────────────────────────────────
  const StepperRow = (r) => {
    const anzahl = mengen[r.id] ?? 0
    const np = rezeptProPortion(r, zById, rById)
    const isActive = anzahl > 0
    return (
      <div key={r.id} className={`${s.row} ${isActive ? s.rowActive : ''}`}>
        <div className={s.stepper}>
          <button className={s.stepBtn} onClick={() => setMenge(r.id, r.basisPortionen, anzahl - 1)}>−</button>
          <span className={`${s.stepVal} ${isActive ? s.stepValActive : ''}`}
            style={isActive ? { '--tool-color': toolColor } : {}}>{anzahl}</span>
          <button className={s.stepBtn} onClick={() => setMenge(r.id, r.basisPortionen, anzahl + 1)}>+</button>
        </div>
        <div className={s.rowMain} onClick={() => onView(r)}>
          <div className={s.rowTop}>
            <span className={s.rowName}>{r.name}</span>
            {isActive && <span className={s.portionenHint}>{anzahl * r.basisPortionen} P</span>}
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
    const bedarf = Math.round(basisBedarf[basis.id] ?? 0)
    const batches = (bedarf > 0 && basis.ergibtMenge > 0) ? Math.ceil(bedarf / basis.ergibtMenge) : 0
    const isTop = tiefe === 0

    // Abzweige (Zwischen-Basen, z.B. Bolognese) zuerst, dann Endgerichte
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
            {batches > 0 && (
              <span className={s.bedarfBadge} style={{ '--tool-color': toolColor }}>
                {batches}× kochen
              </span>
            )}
            <button className={s.editBtn} onClick={e => { e.stopPropagation(); onEdit({ form: 'rezept', data: basis }) }}><IconEdit size={15} /></button>
            <span className={`${s.chevron} ${isOpen ? '' : s.chevronClosed}`}><IconChevron size={14} /></span>
          </div>
        </div>

        {isOpen && (
          <div className={s.cardBody}>
            {abzweige.map(ab => BasisBlock(ab, tiefe + 1))}
            {endGerichte.map(StepperRow)}
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

  if (topBasen.length === 0) {
    return (
      <div className={s.wrap}>
        <div className={s.intro}>Eine Basis 1× kochen → viele Gerichte. Basis aufklappen, Ableitungen mit + ankreuzen.</div>
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
      <div className={s.intro}>Eine Basis 1× kochen → viele Gerichte. Basis aufklappen, Ableitungen mit + ankreuzen.</div>
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
