import { useState, useMemo } from 'react'
import { createRezept } from './mealprepModel'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import s from './Sammlung.module.css'

export default function Sammlung({ rezepte, zById, rById, toolColor, onEdit, addToKorb, ladeInKonfigurator }) {
  const [collapsed, setCollapsed] = useState({})
  const [extraKats, setExtraKats] = useState([])
  const [newKatInput, setNewKatInput] = useState('')
  const [showNewKatInput, setShowNewKatInput] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const allKats = useMemo(() => {
    const fromRezepte = rezepte.flatMap(r => r.kategorien ?? [])
    const unique = [...new Set([...fromRezepte, ...extraKats])]
    const ORDER = ['Bowls', 'Burritos', 'Salate', 'Onepot/Auflauf', 'Marinaden', 'Saucen']
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
    if (selected.has(rezeptId)) {
      const next = new Set(selected)
      next.delete(rezeptId)
      setSelected(next)
    } else {
      setSelected(new Set([...selected, rezeptId]))
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
    const items = rezepteForKat(kat)
    const isOpen = !collapsed[kat]
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
              +
            </button>
            <span className={s.chevron}>{isOpen ? '▾' : '▸'}</span>
          </div>
        </div>
        {isOpen && (
          <div className={s.cardBody}>
            {items.length === 0 ? (
              <div className={s.empty}>Noch keine Rezepte in dieser Kategorie.</div>
            ) : items.map(r => {
              const np = rezeptProPortion(r, zById, rById)
              const isSel = selected.has(r.id)
              return (
                <div key={r.id} className={`${s.row} ${isSel ? s.rowSelected : ''}`}>
                  <button
                    className={`${s.selectBtn} ${isSel ? s.selectBtnOn : ''}`}
                    onClick={() => toggleSelect(r.id, r.basisPortionen)}
                    style={isSel ? { '--tool-color': toolColor } : {}}
                  >
                    {isSel ? '✓' : '○'}
                  </button>
                  <div className={s.rowMain} onClick={() => onEdit({ form: 'rezept', data: r })}>
                    <span className={s.rowName}>{r.name}</span>
                    <Naehrwert n={np} />
                    {r.aufbewahrung?.tk && <span className={s.tag}>❄</span>}
                  </div>
                  {r.konfigurierbar && (
                    <button
                      className={s.konfBtn}
                      title="Im Konfigurator öffnen"
                      onClick={() => ladeInKonfigurator(r)}
                    >
                      ⚙
                    </button>
                  )}
                  <button className={s.editBtn} onClick={() => onEdit({ form: 'rezept', data: r })}>✎</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const displayKats = [...allKats, ...(hasUncategorized ? ['Sonstiges'] : [])]

  return (
    <div className={s.wrap}>
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
            <button className={s.newKatCancel} onClick={() => { setNewKatInput(''); setShowNewKatInput(false) }}>✕</button>
          </div>
        ) : (
          <button className={s.newKatBtn} onClick={() => setShowNewKatInput(true)}>+ Neue Kategorie</button>
        )}
      </div>

      {displayKats.length === 0 && (
        <div className={s.empty}>Noch keine Rezepte. Tippe "+ Neue Kategorie" oder lege ein Rezept an.</div>
      )}

      {displayKats.map(kat => renderKat(kat))}
    </div>
  )
}
