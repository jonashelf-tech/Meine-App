import { useState, useMemo } from 'react'
import { EINKAUF_KATEGORIEN, SLOT_LABELS } from './mealprepModel'
import Naehrwert from './Naehrwert'
import { IconPlus, IconChevron } from './icons'
import s from './Zutaten.module.css'

export default function Zutaten({ zutaten, toolColor, onEdit }) {
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const query = q.trim().toLowerCase()

  const gefiltert = useMemo(() =>
    query ? zutaten.filter(z => z.name.toLowerCase().includes(query)) : zutaten,
    [zutaten, query]
  )

  // Gruppen in fester Einkauf-Reihenfolge, Unbekanntes ans Ende
  const gruppen = useMemo(() => {
    const order = [...EINKAUF_KATEGORIEN]
    const byKat = {}
    for (const z of gefiltert) {
      const k = order.includes(z.einkaufKategorie) ? z.einkaufKategorie : 'Sonstiges'
      ;(byKat[k] ??= []).push(z)
    }
    return order
      .filter(k => byKat[k]?.length)
      .map(k => [k, byKat[k].sort((a, b) => a.name.localeCompare(b.name))])
  }, [gefiltert])

  return (
    <div className={s.wrap}>
      <div className={s.topBar}>
        <input
          className={s.search}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Zutat suchen…"
        />
        <button className={s.addBtn} style={{ '--tool-color': toolColor }}
          onClick={() => onEdit({ form: 'zutat', data: null })}>
          <IconPlus size={16} /> Zutat
        </button>
      </div>

      {gruppen.length === 0 ? (
        <div className={s.empty}>{query ? 'Nichts gefunden.' : 'Noch keine Zutaten.'}</div>
      ) : gruppen.map(([kat, items]) => {
        const isOpen = query ? true : !!collapsed[kat]
        return (
          <div key={kat} className={s.card}>
            <div className={s.cardHeader} onClick={() => setCollapsed(c => ({ ...c, [kat]: !c[kat] }))}>
              <span className={s.cardTitle}>{kat}</span>
              <div className={s.cardHeaderRight}>
                <span className={s.count}>{items.length}</span>
                <span className={`${s.chevron} ${isOpen ? '' : s.chevronClosed}`}><IconChevron size={14} /></span>
              </div>
            </div>
            {isOpen && (
              <div className={s.cardBody}>
                {items.map(z => (
                  <div key={z.id} className={s.row} onClick={() => onEdit({ form: 'zutat', data: z })}>
                    <div className={s.rowMain}>
                      <div className={s.rowTop}>
                        <span className={s.rowName}>{z.name}</span>
                        {z.bausteinTyp && (
                          <span className={s.slotBadge} style={{ '--tool-color': toolColor }}>{SLOT_LABELS[z.bausteinTyp]}</span>
                        )}
                      </div>
                      <div className={s.rowSub}>
                        <Naehrwert n={z.naehrwert} />
                        <span className={s.per}>/ {z.per ?? 100} {z.einheit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
