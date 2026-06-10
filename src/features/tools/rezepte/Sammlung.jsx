import { useState, useMemo } from 'react'
import { createRezept } from './mealprepModel'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import { IconChevron, IconCheck, IconSnow, IconSliders, IconClose, IconPlus } from './icons'
import s from './Sammlung.module.css'

export default function Sammlung({ rezepte, zById, rById, toolColor, onEdit, addToKorb, removeFromKorb, ladeInKonfigurator, korb }) {
  const [collapsed, setCollapsed] = useState({})
  const [extraKats, setExtraKats] = useState([])
  const [newKatInput, setNewKatInput] = useState('')
  const [showNewKatInput, setShowNewKatInput] = useState(false)
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  // Häkchen direkt aus dem Korb ableiten – kein separater State mehr
  const selectedIds = useMemo(() =>
    new Set((korb?.eintraege ?? []).map(e => e.ref)),
    [korb?.eintraege]
  )

  const allKats = useMemo(() => {
    const fromRezepte = rezepte.flatMap(r => r.kategorien ?? [])
    const unique = [...new Set([...fromRezepte, ...extraKats])]
    const ORDER = ['Fitness', 'Bowls', 'Burritos', 'Salate', 'Onepot/Auflauf', 'Saucen', 'Marinaden', 'Dressings']
    return [
      ...ORDER.filter(k => unique.includes(k)),
      ...unique.filter(k => !ORDER.includes(k)).sort(),
    ]
  }, [rezepte, extraKats])

  const hasUncategorized = rezepte.some(r => !r.kategorien?.length)

  const rezepteForKat = (kat) =>
    kat === 'Sonstiges'
      ? rezepte.filter(r => !r.kategorien?.length)
      : rezepte.filter(r => (r.kategorien ?? []).includes(kat))

  const toggleCollapsed = (kat) =>
    setCollapsed(c => ({ ...c, [kat]: !c[kat] }))

  const toggleSelect = (rezeptId, portionen) => {
    if (selectedIds.has(rezeptId)) {
      removeFromKorb(rezeptId)
    } else {
      addToKorb(rezeptId, portionen)
    }
  }

  const addNewKat = () => {
    const k = newKatInput.trim()
    if (k && !allKats.includes(k)) {
      setExtraKats(prev => [...prev, k])
    }
    setNewKatInput('')
    setShowNewKatInput(false)
  }

  const renderKat = (kat) => {
    const items = rezepteForKat(kat).filter(r => !query || r.name.toLowerCase().includes(query))
    if (query && items.length === 0) return null
    const isOpen = query ? true : !!collapsed[kat]
    return (
      <div key={kat} className={s.card}>
        <div className={s.cardHeader} onClick={() => toggleCollapsed(kat)}>
          <span className={s.cardTitle}>{kat}</span>
          <div className={s.cardHeaderRight}>
            <span className={s.count}>{items.length}</span>
            <button
              className={s.addInCardBtn}
              onClick={e => {
                e.stopPropagation()
                onEdit({ form: 'rezept', data: createRezept({ kategorien: [kat] }) })
              }}
            >
              <IconPlus size={15} />
            </button>
            <span className={`${s.chevron} ${isOpen ? '' : s.chevronClosed}`}><IconChevron size={14} /></span>
          </div>
        </div>
        {isOpen && (
          <div className={s.cardBody}>
            {items.length === 0 ? (
              <div className={s.empty}>Noch keine Rezepte in dieser Kategorie.</div>
            ) : items.map(r => {
              const np = rezeptProPortion(r, zById, rById)
              const isSel = selectedIds.has(r.id)
              return (
                <div key={r.id} className={`${s.row} ${isSel ? s.rowSelected : ''}`}>
                  <button
                    className={`${s.selectBtn} ${isSel ? s.selectBtnOn : ''}`}
                    onClick={() => toggleSelect(r.id, r.basisPortionen)}
                    style={isSel ? { '--tool-color': toolColor } : {}}
                  >
                    {isSel && <IconCheck size={14} />}
                  </button>
                  <div className={s.rowMain} onClick={() => onEdit({ form: 'rezept', data: r })}>
                    <div className={s.rowTop}>
                      <span className={s.rowName}>{r.name}</span>
                      {r.aufbewahrung?.tk && <span className={s.tag} title="TK-geeignet"><IconSnow size={12} /></span>}
                    </div>
                    <Naehrwert n={np} />
                  </div>
                  {r.konfigurierbar && (
                    <button
                      className={s.konfBtn}
                      title="Im Konfigurator öffnen"
                      onClick={() => ladeInKonfigurator(r)}
                    >
                      <IconSliders size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const displayKats = [...allKats, ...(hasUncategorized && !allKats.includes('Sonstiges') ? ['Sonstiges'] : [])]

  const anyMatch = !query || displayKats.some(kat => rezepteForKat(kat).some(r => r.name.toLowerCase().includes(query)))

  return (
    <div className={s.wrap}>
      <input
        className={s.search}
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Rezept suchen…"
      />

      <div className={s.topBar}>
        {showNewKatInput ? (
          <div className={s.newKatRow}>
            <input
              className={s.newKatInput}
              value={newKatInput}
              onChange={e => setNewKatInput(e.target.value)}
              placeholder="Kategorie-Name…"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') addNewKat() }}
            />
            <button className={s.newKatOk} onClick={addNewKat}>OK</button>
            <button className={s.newKatCancel} onClick={() => { setNewKatInput(''); setShowNewKatInput(false) }}><IconClose size={15} /></button>
          </div>
        ) : (
          <button className={s.newKatBtn} onClick={() => setShowNewKatInput(true)}>+ Neue Kategorie</button>
        )}
      </div>

      {displayKats.length === 0 && !query && (
        <div className={s.empty}>Noch keine Rezepte. Tippe "+ Neue Kategorie" oder lege ein Rezept an.</div>
      )}
      {query && !anyMatch && (
        <div className={s.empty}>Kein Rezept gefunden für „{q.trim()}".</div>
      )}

      {displayKats.map(kat => renderKat(kat))}
    </div>
  )
}
