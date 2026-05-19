import { useState } from 'react'
import {
  CURATED, intervalLabel, mergeWithCurated,
  loadReminderItems, saveReminderItems,
} from './reminderData'
import s from './TabReminder.module.css'

// ─── IntervalPicker ───────────────────────────────────────
function IntervalPicker({ interval, onChange }) {
  const { every, unit } = interval
  const isPreset = every === 1 && (unit === 'days' || unit === 'weeks' || unit === 'months')
  const [custom, setCustom] = useState(!isPreset)

  const PRESETS = [
    { label: 'Täglich',       every: 1, unit: 'days'   },
    { label: 'Wöchentlich',   every: 1, unit: 'weeks'  },
    { label: 'Monatlich',     every: 1, unit: 'months' },
  ]

  return (
    <div className={s.intervalWrap}>
      <div className={s.presetRow}>
        {PRESETS.map(p => (
          <button
            key={p.label}
            className={[s.presetBtn, !custom && every === p.every && unit === p.unit ? s.presetBtnActive : ''].join(' ')}
            onClick={() => { setCustom(false); onChange({ every: p.every, unit: p.unit }) }}
          >{p.label}</button>
        ))}
        <button
          className={[s.presetBtn, custom ? s.presetBtnActive : ''].join(' ')}
          onClick={() => setCustom(true)}
        >Eigener</button>
      </div>
      {custom && (
        <div className={s.customRow}>
          <span className={s.customLabel}>Alle</span>
          <input
            type="number" min={1} max={999} className={s.customInput}
            value={every}
            onChange={e => onChange({ every: Math.max(1, parseInt(e.target.value) || 1), unit })}
          />
          <select
            className={s.customSelect} value={unit}
            onChange={e => onChange({ every, unit: e.target.value })}
          >
            <option value="days">Tage</option>
            <option value="weeks">Wochen</option>
            <option value="months">Monate</option>
          </select>
        </div>
      )}
    </div>
  )
}

// ─── ItemRow ──────────────────────────────────────────────
function ItemRow({ item, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={s.itemRow}>
      <div className={s.itemMain}>
        <div
          className={[s.toggle, item.active ? s.toggleOn : ''].join(' ')}
          onClick={() => onUpdate({ ...item, active: !item.active })}
        >
          <div className={s.toggleThumb} />
        </div>
        <button className={s.itemBtn} onClick={() => setOpen(v => !v)}>
          <span className={s.itemIcon}>{item.icon || '🔔'}</span>
          <div className={s.itemInfo}>
            <span className={s.itemText}>{item.text}</span>
            <span className={s.itemMeta}>
              {intervalLabel(item.interval)}
              {item.time ? ` · ${item.time}` : ''}
              {' · '}{item.actionType === 'slot' ? 'Zeitplan' : 'Todo'}
            </span>
          </div>
          <span className={s.chevron}>{open ? '▾' : '▸'}</span>
        </button>
      </div>

      {open && (
        <div className={s.itemEdit}>
          <span className={s.editLabel}>Intervall</span>
          <IntervalPicker
            interval={item.interval}
            onChange={interval => onUpdate({ ...item, interval })}
          />
          <span className={s.editLabel}>Uhrzeit <span className={s.optional}>(optional)</span></span>
          <input
            type="time" className={s.editInput}
            value={item.time || ''}
            onChange={e => onUpdate({ ...item, time: e.target.value || null })}
          />
          <span className={s.editLabel}>Hinzufügen als</span>
          <div className={s.presetRow}>
            {[['slot', '→ Zeitplan'], ['todo', '→ Todo']].map(([v, l]) => (
              <button
                key={v}
                className={[s.presetBtn, item.actionType === v ? s.presetBtnActive : ''].join(' ')}
                onClick={() => onUpdate({ ...item, actionType: v })}
              >{l}</button>
            ))}
          </div>
          {!item.curated && onDelete && (
            <button className={s.deleteBtn} onClick={onDelete}>Entfernen</button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── AddForm ──────────────────────────────────────────────
function AddForm({ onAdd, onCancel }) {
  const [text,       setText]       = useState('')
  const [icon,       setIcon]       = useState('🔔')
  const [interval,   setInterval]   = useState({ every: 1, unit: 'days' })
  const [time,       setTime]       = useState('')
  const [actionType, setActionType] = useState('slot')

  const handleAdd = () => {
    if (!text.trim()) return
    onAdd({
      id:         Date.now(),
      text:       text.trim(),
      icon:       icon || '🔔',
      interval,
      time:       time || null,
      actionType,
      color:      '#00CFFF',
      active:     true,
      curated:    false,
      lastAdded:  null,
    })
  }

  return (
    <div className={s.addForm}>
      <div className={s.addFormRow}>
        <input
          className={s.iconInput} value={icon} maxLength={2} placeholder="🔔"
          onChange={e => setIcon(e.target.value)}
        />
        <input
          className={s.addFormText} autoFocus value={text} placeholder="Beschreibung…"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
      </div>
      <IntervalPicker interval={interval} onChange={setInterval} />
      <div className={s.addFormRow}>
        <input
          type="time" className={s.editInput} value={time}
          onChange={e => setTime(e.target.value)}
        />
        {[['slot', 'Zeitplan'], ['todo', 'Todo']].map(([v, l]) => (
          <button
            key={v}
            className={[s.presetBtn, actionType === v ? s.presetBtnActive : ''].join(' ')}
            onClick={() => setActionType(v)}
          >{l}</button>
        ))}
      </div>
      <div className={s.addFormActions}>
        <button className={s.cancelBtn} onClick={onCancel}>Abbrechen</button>
        <button className={s.saveBtn} onClick={handleAdd} disabled={!text.trim()}>Speichern</button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────
export default function TabReminder({ onBack }) {
  const [items, setItemsState] = useState(() => mergeWithCurated(loadReminderItems()))
  const [showAdd, setShowAdd]  = useState(false)

  const save = (next) => { setItemsState(next); saveReminderItems(next) }

  const updateItem = (updated) => save(items.map(i => i.id === updated.id ? updated : i))
  const deleteItem = (id)      => save(items.filter(i => i.id !== id))
  const addItem    = (item)    => { save([...items, item]); setShowAdd(false) }

  const curated = items.filter(i => i.curated)
  const custom  = items.filter(i => !i.curated)

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={onBack}>← Tools</button>
        <div className={s.titleBlock}>
          <span className={s.eyebrow}>Tool</span>
          <span className={s.title}>Re<em>minder</em></span>
        </div>
      </div>

      <div className={s.section}>
        <span className={s.sectionLabel}>Vorschläge</span>
        {curated.map(item => (
          <ItemRow key={item.id} item={item} onUpdate={updateItem} />
        ))}
      </div>

      <div className={s.section}>
        <div className={s.sectionHeader}>
          <span className={s.sectionLabel}>Meine Erinnerungen</span>
          {!showAdd && (
            <button className={s.addBtn} onClick={() => setShowAdd(true)}>+ Neu</button>
          )}
        </div>
        {showAdd && <AddForm onAdd={addItem} onCancel={() => setShowAdd(false)} />}
        {custom.map(item => (
          <ItemRow key={item.id} item={item} onUpdate={updateItem} onDelete={() => deleteItem(item.id)} />
        ))}
        {custom.length === 0 && !showAdd && (
          <p className={s.empty}>Noch keine eigenen Erinnerungen</p>
        )}
      </div>
    </div>
  )
}
