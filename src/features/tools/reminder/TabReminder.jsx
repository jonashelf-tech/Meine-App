import { useState } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import {
  CURATED, intervalLabel, mergeWithCurated,
  loadReminderItems, saveReminderItems,
  reminderSegments, reminderDueLabel,
} from './reminderData'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import RepeatPicker from '../../../components/RepeatPicker/RepeatPicker'
import { Glyph, GLYPH_NAMES, CARE_GLYPHS } from '../_shared/glyphs'
import GlyphPicker from '../_shared/GlyphPicker'
import s from './TabReminder.module.css'

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const iconName = (icon) => (GLYPH_NAMES.includes(icon) ? icon : 'bell')

// Konvertierung zwischen Reminder-Intervall und RepeatPicker-Format
function intervalToRepeat(interval) {
  if (!interval) return null
  const { every, unit } = interval
  if (every === 1 && unit === 'days')   return { type: 'daily' }
  if (every === 1 && unit === 'weeks')  return { type: 'weekly' }
  if (every === 1 && unit === 'months') return { type: 'monthly' }
  return { type: 'custom', every, unit }
}

function repeatToInterval(repeat) {
  if (!repeat) return null
  if (repeat.type === 'daily')   return { every: 1, unit: 'days' }
  if (repeat.type === 'weekly')  return { every: 1, unit: 'weeks' }
  if (repeat.type === 'monthly') return { every: 1, unit: 'months' }
  return { every: repeat.every ?? 2, unit: repeat.unit ?? 'weeks' }
}

// ─── FälligBar ────────────────────────────────────────────
function FälligBar({ item }) {
  const { filled, total, color, overdue } = reminderSegments(item)
  const count  = Math.min(total, 30)
  const fSegs  = Math.round((filled / total) * count)
  return (
    <div className={s.segBar}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={s.seg}
          style={{
            background: item.active && i < fSegs ? color : undefined,
            boxShadow: item.active && overdue && i < fSegs ? `0 0 3px ${color}` : undefined,
          }}
        />
      ))}
    </div>
  )
}

// ─── ItemRow ──────────────────────────────────────────────
function ItemRow({ item, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const { color, overdue } = reminderSegments(item)
  const dueLabel = reminderDueLabel(item)

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
          <span className={s.itemIcon}><Glyph name={iconName(item.icon)} size={19} /></span>
          <div className={s.itemInfo}>
            <span className={s.itemText}>{item.text}</span>
            <div className={s.itemMetaRow}>
              <span className={s.itemMeta}>
                {intervalLabel(item.interval)}
                {item.time ? ` · ${item.time}` : ''}
                {' · '}{item.actionType === 'slot' ? 'Zeitplan' : 'Todo'}
              </span>
              <span className={s.itemDue} style={{ color: item.active ? (overdue ? 'var(--rose)' : color) : undefined }}>
                {dueLabel}
              </span>
            </div>
            <FälligBar item={item} />
          </div>
          <span className={s.chevron}>{open ? '▾' : '▸'}</span>
        </button>
        <button
          className={s.doneBtn}
          onClick={() => onUpdate({ ...item, lastAdded: todayKey() })}
          title="Jetzt abhaken"
        >
          <CheckIcon />
        </button>
      </div>

      {open && (
        <div className={s.itemEdit}>
          <span className={s.editLabel}>Intervall</span>
          <RepeatPicker
            value={intervalToRepeat(item.interval)}
            onChange={r => onUpdate({ ...item, interval: repeatToInterval(r) })}
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
          <button className={s.resetBtn} onClick={() => onUpdate({ ...item, lastAdded: null })}>↺ Reset</button>
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
  const [icon,       setIcon]       = useState('bell')
  const [interval,   setInterval]   = useState({ every: 1, unit: 'days' })
  const [time,       setTime]       = useState('')
  const [actionType, setActionType] = useState('slot')

  const handleAdd = () => {
    if (!text.trim()) return
    onAdd({
      id:         Date.now(),
      text:       text.trim(),
      icon,
      interval,
      time:       time || null,
      actionType,
      color:      '#8B5CF6',
      active:     true,
      curated:    false,
      lastAdded:  null,
    })
  }

  return (
    <div className={s.addForm}>
      <input
        className={s.addFormText} autoFocus value={text} placeholder="Beschreibung…"
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
      />
      <span className={s.editLabel}>Icon</span>
      <GlyphPicker glyphs={CARE_GLYPHS} value={icon} onChange={setIcon} />
      <span className={s.editLabel}>Intervall</span>
      <RepeatPicker value={intervalToRepeat(interval)} onChange={r => setInterval(repeatToInterval(r) ?? { every: 1, unit: 'days' })} />
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
  const { toolColors } = useAppStore()
  const toolColor = getToolColor('reminder', toolColors)
  const [items, setItemsState] = useState(() => mergeWithCurated(loadReminderItems()))
  const [showAdd, setShowAdd]  = useState(false)

  const save = (next) => { setItemsState(next); saveReminderItems(next) }

  const updateItem = (updated) => save(items.map(i => i.id === updated.id ? updated : i))
  const deleteItem = (id)      => save(items.filter(i => i.id !== id))
  const addItem    = (item)    => { save([...items, item]); setShowAdd(false) }

  const curated = items.filter(i => i.curated)
  const custom  = items.filter(i => !i.curated)

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader onBack={onBack} icon={<Glyph name="bell" size={20} />} eyebrow="Tool" title={<>Re<em>minder</em></>} />

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
