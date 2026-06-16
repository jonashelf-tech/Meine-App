import { useState, useEffect, useMemo } from 'react'
import { SLOTS, SLOT_LABELS } from './mealprepModel'
import { verteilePortionen, rezeptAusKonfig, konfigAusRezept } from './konfigurator'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import { IconChevron, IconCheck, IconClose, IconPlus } from './icons'
import Overlay from '../../../components/Overlay/Overlay'
import s from './Konfigurator.module.css'

const DEFAULT_GPP = 100

export default function Konfigurator({
  zutaten, rezepte, setRezepte, zById, rById, toolColor, onEdit, addToKorb, settings,
  loadRezept, onLoaded,
}) {
  const [gesamt, setGesamt] = useState(settings?.standardPortionen ?? 4)
  // slots: { protein:[{id,istRezept,gProPortion,anteilPortionen}], ... } — Anwesenheit = aktiv
  const [slots, setSlots] = useState({ protein: [], kh: [], gemuese: [], sauce: [] })
  const [collapsed, setCollapsed] = useState({ protein: true })
  const [saveDialog, setSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveKats, setSaveKats] = useState([])
  const [saveKatInput, setSaveKatInput] = useState('')

  useEffect(() => {
    if (!loadRezept) return
    setSlots(konfigAusRezept(loadRezept, zById, rById))
    setGesamt(loadRezept.basisPortionen || gesamt)
    onLoaded()
  }, [loadRezept])

  const slotItems = useMemo(() => {
    const res = {}
    for (const slot of SLOTS) {
      const fromZutaten = zutaten
        .filter(z => z.bausteinTyp === slot)
        .map(z => ({ id: z.id, name: z.name, istRezept: false, defaultGPP: z.gProPortion ?? DEFAULT_GPP, einheit: z.einheit ?? 'g' }))
      const fromRezepte = rezepte
        .filter(r => r.bausteinTyp === slot)
        .map(r => ({ id: r.id, name: r.name, istRezept: true, defaultGPP: r.gProPortion ?? DEFAULT_GPP, einheit: r.ergibtEinheit ?? 'g' }))
      res[slot] = [...fromZutaten, ...fromRezepte]
    }
    return res
  }, [zutaten, rezepte])

  const activeItem = (slot, id) => (slots[slot] ?? []).find(i => i.id === id)

  // An/aus. Beim Umschalten den Slot gleichmäßig auf die aktiven Bausteine verteilen.
  const toggleItem = (slot, itemId, istRezept) => {
    setSlots(prev => {
      const list = prev[slot] ?? []
      let next = list.some(i => i.id === itemId)
        ? list.filter(i => i.id !== itemId)
        : [...list, { id: itemId, istRezept, gProPortion: slotItems[slot].find(i => i.id === itemId)?.defaultGPP ?? DEFAULT_GPP, anteilPortionen: 1 }]
      const dist = verteilePortionen(next.length, gesamt)
      next = next.map((i, idx) => ({ ...i, anteilPortionen: dist[idx] }))
      return { ...prev, [slot]: next }
    })
  }

  const setAnteil = (slot, itemId, val) => {
    setSlots(prev => ({
      ...prev,
      [slot]: (prev[slot] ?? []).map(i => i.id === itemId ? { ...i, anteilPortionen: Math.max(0, val) } : i),
    }))
  }

  const setGPP = (slot, itemId, val) => {
    setSlots(prev => ({
      ...prev,
      [slot]: (prev[slot] ?? []).map(i => i.id === itemId ? { ...i, gProPortion: parseFloat(val) || 0 } : i),
    }))
  }

  // Gesamt ändern → jeden Slot neu gleichmäßig verteilen.
  const handleGesamtChange = (newGesamt) => {
    setGesamt(newGesamt)
    setSlots(prev => {
      const next = {}
      for (const slot of SLOTS) {
        const list = prev[slot] ?? []
        const dist = verteilePortionen(list.length, newGesamt)
        next[slot] = list.map((i, idx) => ({ ...i, anteilPortionen: dist[idx] }))
      }
      return next
    })
  }

  const avgPortion = useMemo(() => {
    const r = rezeptAusKonfig(slots, gesamt, 'Konfigurator-Gericht', [])
    return rezeptProPortion(r, zById, rById)
  }, [slots, gesamt, zutaten, rezepte])

  const handleAddToKorb = () => {
    const nameParts = []
    for (const slot of SLOTS) for (const b of slots[slot] ?? []) {
      const meta = slotItems[slot]?.find(si => si.id === b.id)
      if (meta?.name) nameParts.push(meta.name)
    }
    const name = nameParts.length > 0 ? nameParts.slice(0, 3).join(' + ') : 'Konfigurator-Gericht'
    const r = rezeptAusKonfig(slots, gesamt, name, [])
    addToKorb({ name: r.name, kategorien: r.kategorien, basisPortionen: r.basisPortionen, zutaten: r.zutaten, komponenten: r.komponenten }, gesamt)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    const r = rezeptAusKonfig(slots, gesamt, saveName.trim(), saveKats)
    setRezepte(prev => [...prev, r])
    setSaveDialog(false); setSaveName(''); setSaveKats([])
  }

  const hasAnyActive = SLOTS.some(slot => (slots[slot] ?? []).length > 0)

  return (
    <div className={s.wrap}>
      <div className={s.intro}>Bausteine anklicken. Pro Baustein: Portionen-Anteil + Gramm/Portion. Tipp auf den Namen öffnet die Zutat.</div>

      <div className={s.gesamtRow}>
        <span className={s.gesamtLabel}>Portionen gesamt</span>
        <div className={s.stepper}>
          <button className={s.stepBtn} onClick={() => handleGesamtChange(Math.max(1, gesamt - 1))}>−</button>
          <span className={s.stepVal}>{gesamt}</span>
          <button className={s.stepBtn} onClick={() => handleGesamtChange(gesamt + 1)}>+</button>
        </div>
      </div>

      {SLOTS.map(slot => {
        const available = slotItems[slot] ?? []
        const slotActive = slots[slot] ?? []
        const totalDistributed = slotActive.reduce((acc, i) => acc + (i.anteilPortionen || 0), 0)
        const unequal = slotActive.length > 0 && totalDistributed !== gesamt
        const isCollapsed = !collapsed[slot]

        return (
          <div key={slot} className={s.slotCard}>
            <div className={s.slotHeader} onClick={() => setCollapsed(c => ({ ...c, [slot]: !c[slot] }))}>
              <span className={s.slotTitle}>{SLOT_LABELS[slot]}</span>
              <div className={s.slotHeaderRight}>
                {slotActive.length > 0 && (
                  <span className={`${s.dist} ${unequal ? s.distWarn : ''}`}>{totalDistributed}/{gesamt}</span>
                )}
                <button className={s.addSlotBtn} onClick={e => {
                  e.stopPropagation()
                  onEdit({ form: 'zutat', data: null })
                }}><IconPlus size={14} /></button>
                <span className={`${s.chevron} ${isCollapsed ? s.chevronClosed : ''}`}><IconChevron size={14} /></span>
              </div>
            </div>

            {!isCollapsed && (
              <div className={s.slotBody}>
                {available.length === 0 ? (
                  <div className={s.emptySlot}>Keine Bausteine. Tippe + um einen anzulegen.</div>
                ) : available.map(item => {
                  const act = activeItem(slot, item.id)
                  const on = !!act
                  return (
                    <div key={item.id} className={`${s.itemRow} ${on ? s.itemRowOn : ''}`}>
                      <button
                        className={`${s.itemToggle} ${on ? s.itemToggleOn : ''}`}
                        style={on ? { '--tool-color': toolColor } : {}}
                        onClick={() => toggleItem(slot, item.id, item.istRezept)}
                      >
                        {on && <IconCheck size={14} />}
                      </button>
                      <button className={s.itemName} onClick={() => {
                        if (item.istRezept) {
                          const r = rById(item.id)
                          if (r) onEdit({ form: 'rezept', data: r })
                        } else {
                          const z = zById(item.id)
                          if (z) onEdit({ form: 'zutat', data: z })
                        }
                      }}>
                        {item.name}
                      </button>
                      {on && (
                        <div className={s.itemControls}>
                          <div className={s.anteilStepper}>
                            <button className={s.stepBtnSm} onClick={() => setAnteil(slot, item.id, (act.anteilPortionen ?? 1) - 1)}>−</button>
                            <span className={s.stepValSm}>{act.anteilPortionen ?? 1}</span>
                            <button className={s.stepBtnSm} onClick={() => setAnteil(slot, item.id, (act.anteilPortionen ?? 1) + 1)}>+</button>
                            <span className={s.ctrlUnit}>P</span>
                          </div>
                          <div className={s.gppWrap}>
                            <input className={s.gppInput} type="number" inputMode="numeric"
                              value={act.gProPortion ?? ''}
                              onChange={e => setGPP(slot, item.id, e.target.value)} />
                            <span className={s.ctrlUnit}>{item.einheit}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {hasAnyActive && (
        <div className={s.sumRow}>
          <span className={s.sumLabel}>Ø / Portion</span>
          <Naehrwert n={avgPortion} />
        </div>
      )}

      {hasAnyActive && (
        <div className={s.actions}>
          <button className={s.kochBtn} style={{ '--tool-color': toolColor }} onClick={handleAddToKorb}>Zu Kochen</button>
          <button className={s.saveBtn} style={{ '--tool-color': toolColor }} onClick={() => setSaveDialog(true)}>Als Rezept speichern</button>
        </div>
      )}

      {saveDialog && (
        <Overlay variant="center" onClose={() => setSaveDialog(false)}>
          <div className={s.saveDialog}>
            <div className={s.saveDialogTitle}>Als Rezept speichern</div>
            <input className={s.saveInput} value={saveName} onChange={e => setSaveName(e.target.value)}
              placeholder="Name…" autoFocus />
            <div className={s.saveKats}>
              {saveKats.map(k => (
                <span key={k} className={s.chip}>{k}
                  <button className={s.chipRemove} onClick={() => setSaveKats(prev => prev.filter(x => x !== k))}><IconClose size={12} /></button>
                </span>
              ))}
              <div className={s.addKatRow}>
                <input className={s.saveInput} value={saveKatInput} onChange={e => setSaveKatInput(e.target.value)}
                  placeholder="Kategorie…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const k = saveKatInput.trim()
                      if (k && !saveKats.includes(k)) setSaveKats(prev => [...prev, k])
                      setSaveKatInput('')
                    }
                  }} />
              </div>
            </div>
            <div className={s.saveDialogActions}>
              <button className={s.saveConfirmBtn} style={{ '--tool-color': toolColor }} onClick={handleSave} disabled={!saveName.trim()}>Speichern</button>
              <button className={s.cancelBtn} onClick={() => setSaveDialog(false)}>Abbrechen</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}
