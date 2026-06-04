import { useState, useEffect, useMemo } from 'react'
import { SLOTS, SLOT_LABELS } from './mealprepModel'
import { verteilePortionen, rezeptAusKonfig, konfigAusRezept } from './konfigurator'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import { IconChevron, IconCheck, IconClose, IconPlus, IconArrowLeft } from './icons'
import s from './Konfigurator.module.css'

const DEFAULT_GPP = 100

export default function Konfigurator({
  zutaten, rezepte, setRezepte, zById, rById, toolColor, onEdit, addToKorb, settings,
  loadRezept, onLoaded, onBack,
}) {
  const [gesamt, setGesamt] = useState(settings?.standardPortionen ?? 4)
  const [slots, setSlots] = useState({ protein: [], kh: [], gemuese: [], sauce: [] })
  const [collapsed, setCollapsed] = useState({})
  const [saveDialog, setSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveKats, setSaveKats] = useState([])
  const [saveKatInput, setSaveKatInput] = useState('')

  useEffect(() => {
    if (!loadRezept) return
    const newSlots = konfigAusRezept(loadRezept, zById, rById)
    const marked = {}
    for (const [slot, items] of Object.entries(newSlots)) {
      marked[slot] = items.map(item => ({ ...item, an: true }))
    }
    setSlots(marked)
    setGesamt(loadRezept.basisPortionen || gesamt)
    onLoaded()
  }, [loadRezept])

  const slotItems = useMemo(() => {
    const res = {}
    for (const slot of SLOTS) {
      const fromZutaten = zutaten
        .filter(z => z.bausteinTyp === slot)
        .map(z => ({ id: z.id, name: z.name, istRezept: false, defaultGPP: z.gProPortion ?? DEFAULT_GPP }))
      const fromRezepte = rezepte
        .filter(r => r.bausteinTyp === slot)
        .map(r => ({ id: r.id, name: r.name, istRezept: true, defaultGPP: r.gProPortion ?? DEFAULT_GPP }))
      res[slot] = [...fromZutaten, ...fromRezepte]
    }
    return res
  }, [zutaten, rezepte])

  const activeItems = (slot) => (slots[slot] ?? []).filter(i => i.an)

  const toggleItem = (slot, itemId, istRezept) => {
    setSlots(prev => {
      const existing = (prev[slot] ?? []).find(i => i.id === itemId)
      let updated
      if (existing) {
        updated = prev[slot].map(i => i.id === itemId ? { ...i, an: !i.an } : i)
      } else {
        const meta = slotItems[slot].find(i => i.id === itemId)
        updated = [...(prev[slot] ?? []), { id: itemId, istRezept, gProPortion: meta?.defaultGPP ?? DEFAULT_GPP, anteilPortionen: 1, an: true }]
      }
      const active = updated.filter(i => i.an)
      const dist = verteilePortionen(active.length, gesamt)
      let ai = 0
      updated = updated.map(i => i.an ? { ...i, anteilPortionen: dist[ai++] } : i)
      return { ...prev, [slot]: updated }
    })
  }

  const setAnteil = (slot, itemId, val) => {
    setSlots(prev => ({
      ...prev,
      [slot]: (prev[slot] ?? []).map(i => i.id === itemId ? { ...i, anteilPortionen: Math.max(0, parseInt(val) || 0) } : i)
    }))
  }

  const setGPP = (slot, itemId, val) => {
    setSlots(prev => ({
      ...prev,
      [slot]: (prev[slot] ?? []).map(i => i.id === itemId ? { ...i, gProPortion: parseFloat(val) || DEFAULT_GPP } : i)
    }))
  }

  const handleGesamtChange = (newGesamt) => {
    setGesamt(newGesamt)
    setSlots(prev => {
      const next = {}
      for (const slot of SLOTS) {
        const active = (prev[slot] ?? []).filter(i => i.an)
        const dist = verteilePortionen(active.length, newGesamt)
        let ai = 0
        next[slot] = (prev[slot] ?? []).map(i => i.an ? { ...i, anteilPortionen: dist[ai++] } : i)
      }
      return next
    })
  }

  const buildInline = () => {
    const inline = {}
    const nameParts = []
    for (const slot of SLOTS) {
      inline[slot] = activeItems(slot)
      for (const item of inline[slot]) {
        const meta = slotItems[slot]?.find(si => si.id === item.id)
        if (meta?.name) nameParts.push(meta.name)
      }
    }
    const name = nameParts.length > 0 ? nameParts.slice(0, 3).join(' + ') : 'Konfigurator-Gericht'
    return rezeptAusKonfig(inline, gesamt, name, [])
  }

  const avgPortion = useMemo(() => {
    const inline = {}
    for (const slot of SLOTS) {
      inline[slot] = activeItems(slot)
    }
    const r = rezeptAusKonfig(inline, gesamt, 'Konfigurator-Gericht', [])
    return rezeptProPortion(r, zById, rById)
  }, [slots, gesamt, zutaten, rezepte])

  const handleAddToKorb = () => {
    const inline = buildInline()
    addToKorb({ name: inline.name, kategorien: inline.kategorien, basisPortionen: inline.basisPortionen, zutaten: inline.zutaten, komponenten: inline.komponenten }, gesamt)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    const inlineSlots = {}
    for (const slot of SLOTS) { inlineSlots[slot] = activeItems(slot) }
    const r = rezeptAusKonfig(inlineSlots, gesamt, saveName.trim(), saveKats)
    setRezepte(prev => [...prev, r])
    setSaveDialog(false); setSaveName(''); setSaveKats([])
  }

  const hasAnyActive = SLOTS.some(slot => activeItems(slot).length > 0)

  return (
    <div className={s.wrap}>
      <div className={s.hubBar}>
        <button className={s.backToHub} onClick={onBack}><IconArrowLeft size={15} /> Sammlung</button>
        <span className={s.hubTitle}>Gericht bauen</span>
      </div>

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
        const slotActive = activeItems(slot)
        const totalDistributed = slotActive.reduce((acc, i) => acc + (i.anteilPortionen || 0), 0)
        const unequal = slotActive.length > 0 && totalDistributed !== gesamt
        const isCollapsed = !collapsed[slot]

        return (
          <div key={slot} className={s.slotCard}>
            <div className={s.slotHeader} onClick={() => setCollapsed(c => ({ ...c, [slot]: !c[slot] }))}>
              <span className={s.slotTitle}>{SLOT_LABELS[slot]}</span>
              <div className={s.slotHeaderRight}>
                {slotActive.length > 0 && (
                  <span className={`${s.dist} ${unequal ? s.distWarn : ''}`}>
                    {totalDistributed}/{gesamt}
                  </span>
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
                  const slotItem = (slots[slot] ?? []).find(i => i.id === item.id)
                  const isOn = slotItem?.an ?? false
                  return (
                    <div key={item.id} className={`${s.itemRow} ${isOn ? s.itemRowOn : ''}`}>
                      <button
                        className={`${s.itemToggle} ${isOn ? s.itemToggleOn : ''}`}
                        style={isOn ? { '--tool-color': toolColor } : {}}
                        onClick={() => toggleItem(slot, item.id, item.istRezept)}
                      >
                        {isOn && <IconCheck size={14} />}
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
                      {isOn && (
                        <div className={s.itemControls}>
                          <div className={s.gppWrap}>
                            <input className={s.gppInput} type="number"
                              value={slotItem?.gProPortion ?? item.defaultGPP}
                              onChange={e => setGPP(slot, item.id, e.target.value)} />
                            <span className={s.gppUnit}>g/P</span>
                          </div>
                          <div className={s.anteilStepper}>
                            <button className={s.stepBtnSm} onClick={() => setAnteil(slot, item.id, (slotItem?.anteilPortionen ?? 1) - 1)}>−</button>
                            <span className={s.stepValSm}>{slotItem?.anteilPortionen ?? 1}</span>
                            <button className={s.stepBtnSm} onClick={() => setAnteil(slot, item.id, (slotItem?.anteilPortionen ?? 1) + 1)}>+</button>
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
          <button className={s.saveBtn} style={{ '--tool-color': toolColor }} onClick={() => setSaveDialog(true)}>Als Preset speichern</button>
        </div>
      )}

      {saveDialog && (
        <div className={s.saveDialogOverlay} onClick={e => { if (e.target === e.currentTarget) setSaveDialog(false) }}>
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
        </div>
      )}
    </div>
  )
}
