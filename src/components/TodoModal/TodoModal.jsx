import { useState } from 'react'
import { useAppStore } from '../../store'
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset'
import { createBlock } from '../../features/todos/Block'
import { parseHHMM, minutesToSk, NEON } from '../../utils'
import RepeatPicker from '../RepeatPicker/RepeatPicker'
import s from './TodoModal.module.css'

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
)

const DUR_PRESETS = [
  { label: '5',  value: 5  },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '60', value: 60 },
  { label: '90', value: 90 },
  { label: '2h', value: 120 },
]

const _dk = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function parseTodoText(raw) {
  let text = raw.trim()
  let date = null, time = null, duration = null, priority = 3
  const today = new Date()

  if (/\b(dringend|wichtig|asap|sofort|urgent)\b/i.test(text)) priority = 1
  else if (/\b(sollte|bald|soon)\b/i.test(text)) priority = 2
  text = text.replace(/\b(dringend|wichtig|asap|sofort|urgent|sollte|bald|soon)\b/gi, '')

  const tr = text.match(/\b(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?(?:uhr)?(?=\s|$)/i)
  if (tr) {
    const h1 = parseInt(tr[1]), m1 = tr[2] ? parseInt(tr[2]) : 0
    const h2 = parseInt(tr[3]), m2 = tr[4] ? parseInt(tr[4]) : 0
    if (h1 >= 0 && h1 <= 23 && m1 >= 0 && m1 <= 59 &&
        h2 >= 0 && h2 <= 23 && m2 >= 0 && m2 <= 59 &&
        (h2 * 60 + m2) > (h1 * 60 + m1)) {
      time     = `${String(h1).padStart(2,'0')}:${String(m1).padStart(2,'0')}`
      duration = (h2 * 60 + m2) - (h1 * 60 + m1)
      text = text.replace(tr[0], '')
    }
  }

  if (/\bmorgen\b/i.test(text)) { const d = new Date(today); d.setDate(d.getDate()+1); date = _dk(d) }
  else if (/\bübermorgen\b/i.test(text)) { const d = new Date(today); d.setDate(d.getDate()+2); date = _dk(d) }
  else if (/\bheute\b/i.test(text)) { date = _dk(today) }

  const WD = ['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag']
  WD.forEach((w, i) => {
    if (new RegExp('\\b'+w+'\\b','i').test(text)) {
      const d = new Date(today); const diff = (i - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + diff); date = _dk(d)
    }
  })

  const dm = text.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/)
  if (dm) {
    let year = dm[3] ? parseInt(dm[3]) : today.getFullYear()
    if (year < 100) year += 2000
    const d = new Date(year, parseInt(dm[2])-1, parseInt(dm[1]))
    date = _dk(d)
  }

  text = text.replace(/\b(morgen|übermorgen|heute|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
  text = text.replace(/\d{1,2}\.\d{1,2}\.?(?:\d{2,4})?/g, '')

  if (!time) {
    const tm = text.match(/(\d{1,2})[:\.](\d{2})\s*(?:uhr)?/i) || text.match(/(\d{1,2})\s*uhr/i)
    if (tm) {
      const h = parseInt(tm[1]), m = tm[2] ? parseInt(tm[2]) : 0
      time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      text = text.replace(tm[0], '')
    }
  }

  if (!duration) {
    const dr = text.match(/(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|min|minuten?)/i)
    if (dr) {
      const v = parseFloat(dr[1].replace(',','.')); const u = dr[2].toLowerCase()
      duration = u.startsWith('h') || u.startsWith('s') ? Math.round(v*60) : Math.round(v)
      text = text.replace(dr[0], '')
    }
  }

  return { text: text.trim().replace(/\s+/g, ' '), date, time, duration, priority }
}

function formatSummaryDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  return `${days[date.getDay()]} ${d}.${String(m).padStart(2,'0')}`
}

export default function TodoModal({ onClose, existingTodo = null }) {
  const keyboardOffset = useKeyboardOffset()
  const { todos, setTodos, days, setDays, cats, setCats, accentColor } = useAppStore()

  const isEdit = existingTodo !== null

  const [text,     setText]     = useState(existingTodo?.text     ?? '')
  const [priority, setPriority] = useState(existingTodo?.priority ?? 3)
  const [duration, setDuration] = useState(existingTodo?.duration ?? null)
  const [color,    setColor]    = useState(existingTodo?.color    ?? accentColor ?? '#8B5CF6')
  const [category, setCategory] = useState(existingTodo?.category ?? null)
  const [date,     setDate]     = useState(existingTodo?.date     ?? '')
  const [time,     setTime]     = useState(existingTodo?.time     ?? '')
  const [repeat,   setRepeat]   = useState(existingTodo?.repeat   ?? null)
  const [subItems, setSubItems] = useState(() =>
    (existingTodo?.subItems ?? []).map(si => ({ ...si }))
  )
  const [subInput,    setSubInput]    = useState('')
  const [blinkDate,   setBlinkDate]   = useState(false)
  const [blinkTime,   setBlinkTime]   = useState(false)
  const [catEditMode, setCatEditMode] = useState(false)
  const [catNewInput, setCatNewInput] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(() =>
    isEdit && !!(existingTodo.date || existingTodo.time || existingTodo.category)
  )

  const handleAuto = () => {
    if (!text.trim()) return
    const p = parseTodoText(text.trim())
    if (p.text)           setText(p.text)
    if (p.priority !== 3) setPriority(p.priority)
    if (p.duration != null) setDuration(p.duration)
    if (p.date) { setDate(p.date); setDetailsOpen(true) }
    if (p.time) { setTime(p.time); setDetailsOpen(true) }
  }

  const addSubItem = () => {
    const txt = subInput.trim(); if (!txt) return
    setSubItems(prev => [...prev, { id: crypto.randomUUID(), text: txt, done: false }])
    setSubInput('')
  }
  const removeSubItem = (id) => setSubItems(prev => prev.filter(si => si.id !== id))

  const addCat = () => {
    const name = catNewInput.trim(); if (!name) return
    if (!cats.includes(name)) setCats([...cats, name])
    setCatNewInput('')
  }
  const removeCat = (name) => {
    setCats(cats.filter(c => c !== name))
    if (category === name) setCategory(null)
  }

  const handleDurPreset = (val) => setDuration(prev => prev === val ? null : val)
  const handleDurFree   = (e)   => setDuration(e.target.value ? parseInt(e.target.value) : null)

  const triggerBlink = (field) => {
    if (field === 'date') { setBlinkDate(true); setTimeout(() => setBlinkDate(false), 1200) }
    if (field === 'time') { setBlinkTime(true); setTimeout(() => setBlinkTime(false), 1200) }
  }

  const isTermin = !!(date && time)

  const handleSubmit = () => {
    if (!text.trim()) return
    if (time && !date) { setDetailsOpen(true); triggerBlink('date'); return }

    if (isEdit) {
      const wasTermin = !!(existingTodo.date && existingTodo.time)
      const nowTermin = isTermin

      const updated = {
        ...existingTodo,
        text:     text.trim(),
        priority,
        color,
        duration: duration || null,
        category: category || null,
        repeat:   repeat || null,
        subItems,
        date:     date || null,
        time:     time || null,
      }

      setDays(prev => {
        const result = { ...prev }
        Object.keys(result).forEach(dk => {
          const newDay = { ...result[dk] }
          let changed = false
          Object.keys(newDay).forEach(slotK => {
            const slot = newDay[slotK]
            if (slot?.todoId === existingTodo.id && slot.duration !== updated.duration) {
              newDay[slotK] = { ...slot, duration: updated.duration }
              changed = true
            }
          })
          if (changed) result[dk] = newDay
        })
        return result
      })

      if (nowTermin && !wasTermin) {
        const mins    = parseHHMM(time)
        const slotKey = minutesToSk(mins)
        setDays(prev => ({
          ...prev,
          [date]: {
            ...(prev[date] ?? {}),
            [slotKey]: {
              text: updated.text, todoId: updated.id, color: updated.color,
              duration: updated.duration || 30, done: false, locked: true,
            },
          },
        }))
      }

      setTodos(prev => prev.map(t => t.id === existingTodo.id ? updated : t))

    } else {
      if (isTermin) {
        const block = createBlock({
          text: text.trim(), priority, color,
          duration: duration || 30,
          date, time,
          category: category || null,
          repeat: repeat || null,
          subItems,
        })
        const mins    = parseHHMM(time)
        const slotKey = minutesToSk(mins)
        setDays(prev => ({
          ...prev,
          [date]: {
            ...(prev[date] ?? {}),
            [slotKey]: {
              text: block.text, todoId: block.id, color: block.color,
              duration: block.duration, done: false, locked: true,
            },
          },
        }))
        setTodos(prev => [...prev, block])
      } else {
        setTodos(prev => [...prev, createBlock({
          text: text.trim(), priority, color,
          duration: duration || null,
          date: date || null,
          category: category || null,
          repeat: repeat || null,
          subItems,
        })])
      }
    }

    onClose()
  }

  return (
    <div
      className={s.overlay}
      style={keyboardOffset > 0 ? { alignItems: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset } : {}}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={s.modal}>

        {/* Header */}
        <div className={s.header}>
          <span className={s.title}>{isEdit ? 'Bearbeiten' : 'Hinzufügen'}</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {/* Text + Auto */}
        <div className={s.textRow}>
          <input
            className={s.textInput}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Was muss getan werden…"
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          <button className={s.autoBtn} onClick={handleAuto} disabled={!text.trim()}>Auto</button>
        </div>

        {/* Prio — immer */}
        <div className={s.row}>
          <span className={s.rowLabel}>Prio</span>
          <div className={s.segControl}>
            {[[1,'! Wichtig'],[2,'· Sollte'],[3,'Kann']].map(([v, l]) => (
              <button
                key={v}
                className={[s.segBtn, priority === v ? s.segBtnActive : ''].join(' ')}
                onClick={() => setPriority(v)}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Dauer */}
        <div className={s.row}>
          <span className={s.rowLabel}>Dauer</span>
          <div className={s.durBtnRow}>
            {DUR_PRESETS.map(({ label, value }) => (
              <button
                key={value}
                className={[s.durBtn, duration === value ? s.durBtnActive : ''].join(' ')}
                onClick={() => handleDurPreset(value)}
              >
                {label}
              </button>
            ))}
            <input
              type="number" className={s.durFreeInput} min={1} max={480}
              value={duration && !DUR_PRESETS.some(p => p.value === duration) ? duration : ''}
              placeholder="—"
              onChange={handleDurFree}
            />
            <span className={s.durUnit}>min</span>
          </div>
        </div>

        {/* Schritte */}
        <div className={s.row} style={{ alignItems: 'flex-start' }}>
          <span className={s.rowLabel} style={{ marginTop: 6 }}>Schritte</span>
          <div className={s.subSection}>
            {subItems.map(si => (
              <div key={si.id} className={s.subRow}>
                <span className={s.subText}>{si.text}</span>
                <button className={s.subRm} onClick={() => removeSubItem(si.id)}>✕</button>
              </div>
            ))}
            <div className={s.subAddRow}>
              <input
                className={s.subInput}
                placeholder="Schritt hinzufügen…"
                value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubItem() } }}
              />
              <button className={s.subAddBtn} onClick={addSubItem}>+</button>
            </div>
          </div>
        </div>

        {/* Details Dropdown */}
        <button
          className={s.detailsToggle}
          onClick={() => setDetailsOpen(v => !v)}
        >
          <span className={s.detailsLabel}>Details</span>
          {!detailsOpen && (date || time || category) && (
            <span className={s.detailsSummary}>
              {date && <span className={s.summaryChip}>{formatSummaryDate(date)}</span>}
              {time && <span className={s.summaryChip}>{time}</span>}
              {category && <span className={s.summaryChip}>{category}</span>}
            </span>
          )}
          {isTermin && !detailsOpen && (
            <span className={s.terminBadge}>Termin</span>
          )}
          <span className={[s.detailsChevron, detailsOpen ? s.chevronOpen : ''].join(' ')}>▾</span>
        </button>

        {detailsOpen && (
          <div className={s.detailsBody}>

            {/* Datum */}
            <div className={s.row}>
              <span className={s.rowLabel}>Datum</span>
              <input
                type="date"
                className={[s.fieldInputSm, blinkDate ? s.blinkField : ''].join(' ')}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            {/* Uhrzeit */}
            <div className={s.row}>
              <span className={s.rowLabel}>Uhrzeit</span>
              <input
                type="time"
                className={[s.fieldInputSm, blinkTime ? s.blinkField : ''].join(' ')}
                value={time}
                onChange={e => setTime(e.target.value)}
              />
              {isTermin && (
                <span style={{ fontSize: '0.68rem', color: 'rgba(251,113,133,0.8)' }}>→ Kalendereintrag</span>
              )}
            </div>

            {/* Farbe */}
            <div className={s.row}>
              <span className={s.rowLabel}>Farbe</span>
              <div className={s.colorRow}>
                {NEON.map(c => (
                  <button
                    key={c}
                    className={[s.colorCircle, color === c ? s.colorCircleActive : ''].join(' ')}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Kategorie */}
            <div className={s.row} style={{ alignItems: 'flex-start' }}>
              <span className={s.rowLabel} style={{ marginTop: 6 }}>Kategorie</span>
              <div className={s.catWrap}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div className={s.catChips}>
                    {cats.length === 0 && !catEditMode && (
                      <span className={s.catEmpty}>Noch keine Kategorien</span>
                    )}
                    {catEditMode
                      ? cats.map(name => (
                          <span key={name} className={s.catChipDel}>
                            {name}
                            <button className={s.catChipRm} onClick={() => removeCat(name)}>✕</button>
                          </span>
                        ))
                      : cats.map(name => (
                          <button
                            key={name}
                            className={[s.catChip, category === name ? s.catChipActive : ''].join(' ')}
                            onClick={() => setCategory(prev => prev === name ? null : name)}
                          >{name}</button>
                        ))
                    }
                  </div>
                  <button
                    className={[s.catEditBtn, catEditMode ? s.catEditBtnActive : ''].join(' ')}
                    onClick={() => { setCatEditMode(v => !v); setCatNewInput('') }}
                    aria-label={catEditMode ? 'Fertig' : 'Kategorien bearbeiten'}
                  ><EditIcon /></button>
                </div>
                {catEditMode && (
                  <div className={s.catManageRow}>
                    <input
                      className={s.catNewInput}
                      placeholder={cats.length === 0 ? 'Erste Kategorie anlegen…' : 'Neue Kategorie…'}
                      value={catNewInput}
                      onChange={e => setCatNewInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCat() } }}
                    />
                    <button className={s.catAddBtn} onClick={addCat}>+</button>
                  </div>
                )}
              </div>
            </div>

            {/* Wiederholung */}
            <div className={s.row} style={{ alignItems: 'flex-start' }}>
              <span className={s.rowLabel} style={{ marginTop: 6 }}>Wiederholen</span>
              <div style={{ flex: 1 }}>
                <RepeatPicker value={repeat} onChange={setRepeat} />
              </div>
            </div>

          </div>
        )}

        <button
          className={s.submitBtn}
          style={{ '--tc': isTermin ? 'var(--teal)' : 'var(--primary)' }}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          {isEdit ? 'Speichern' : (isTermin ? 'Termin eintragen' : 'Hinzufügen')}
        </button>

      </div>
    </div>
  )
}
