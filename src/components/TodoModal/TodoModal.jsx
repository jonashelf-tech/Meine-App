import { useState } from 'react'
import { useAppStore } from '../../store'
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset'
import { createBlock } from '../../features/todos/Block'
import { parseHHMM, minutesToSk, NEON } from '../../utils'
import s from './TodoModal.module.css'

const DUR_PRESETS = [
  { label: '5',  value: 5  },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '60', value: 60 },
  { label: '90', value: 90 },
  { label: '2h', value: 120 },
]

const WDAYS = ['So','Mo','Di','Mi','Do','Fr','Sa']
const ROUTINE_HOURS = Array.from({ length: 19 }, (_, i) => i + 5)

const TYPES = [
  { id: 'todo',    label: 'Todo',    color: '#00CFFF' },
  { id: 'termin',  label: 'Termin',  color: '#FF2D78' },
  { id: 'routine', label: 'Routine', color: '#BF00FF' },
  { id: 'vorlage', label: 'Vorlage', color: '#00FF94' },
]

function detectType(todo) {
  if (!todo) return 'todo'
  if (todo.isTemplate) return 'vorlage'
  if (todo.time)       return 'termin'
  return 'todo'
}

const _dk = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function parseTodoText(raw) {
  let text = raw.trim()
  let date = null, time = null, duration = null, priority = 3
  const today = new Date()

  if (/\b(dringend|wichtig|asap|sofort|urgent)\b/i.test(text)) priority = 1
  else if (/\b(sollte|bald|soon)\b/i.test(text)) priority = 2
  text = text.replace(/\b(dringend|wichtig|asap|sofort|urgent|sollte|bald|soon)\b/gi, '')

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

  const dm = text.match(/(\d{1,2})\.(\d{1,2})\.?/)
  if (dm) { const d = new Date(today.getFullYear(), parseInt(dm[2])-1, parseInt(dm[1])); date = _dk(d) }

  text = text.replace(/\b(morgen|übermorgen|heute|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
  text = text.replace(/\d{1,2}\.\d{1,2}\.?/g, '')

  const tm = text.match(/(\d{1,2})[:\.](\d{2})\s*(?:uhr)?/i) || text.match(/(\d{1,2})\s*uhr/i)
  if (tm) {
    const h = parseInt(tm[1]), m = tm[2] ? parseInt(tm[2]) : 0
    time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
    text = text.replace(tm[0], '')
  }

  const dr = text.match(/(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|min|minuten?)/i)
  if (dr) {
    const v = parseFloat(dr[1].replace(',','.')); const u = dr[2].toLowerCase()
    duration = u.startsWith('h') || u.startsWith('s') ? Math.round(v*60) : Math.round(v)
    text = text.replace(dr[0], '')
  }

  return { text: text.trim().replace(/\s+/g, ' '), date, time, duration, priority }
}

export default function TodoModal({ onClose, existingTodo = null }) {
  const keyboardOffset = useKeyboardOffset()
  const {
    todos, setTodos,
    routines, setRoutines,
    templates, setTemplates,
    days, setDays,
    cats, setCats,
    accentColor,
  } = useAppStore()

  const isEdit = existingTodo !== null

  const [type,     setType]     = useState(() => detectType(existingTodo))
  const [text,     setText]     = useState(existingTodo?.text     ?? '')
  const [priority, setPriority] = useState(existingTodo?.priority ?? 3)
  const [duration, setDuration] = useState(existingTodo?.duration ?? null)
  const [color,    setColor]    = useState(existingTodo?.color    ?? accentColor ?? '#8B5CF6')
  const [category, setCategory] = useState(existingTodo?.category ?? null)
  const [date,     setDate]     = useState(existingTodo?.date     ?? '')
  const [time,     setTime]     = useState(existingTodo?.time     ?? '')
  const [subItems, setSubItems] = useState(() =>
    (existingTodo?.subItems ?? []).map(si => ({ ...si }))
  )
  const [subInput, setSubInput] = useState('')

  const [freq,        setFreq]        = useState('daily')
  const [routineHour, setRoutineHour] = useState(8)
  const [weekday,     setWeekday]     = useState(1)
  const [monthday,    setMonthday]    = useState(1)
  const [customEvery, setCustomEvery] = useState(2)
  const [customUnit,  setCustomUnit]  = useState('days')

  const [blinkDate,   setBlinkDate]   = useState(false)
  const [blinkTime,   setBlinkTime]   = useState(false)
  const [catEditMode, setCatEditMode] = useState(false)
  const [catNewInput, setCatNewInput] = useState('')

  const handleTypeChange = (newType) => {
    setType(newType)
    if (newType === 'termin') {
      setTimeout(() => {
        if (!date) { setBlinkDate(true); setTimeout(() => setBlinkDate(false), 1200) }
        if (!time) { setBlinkTime(true); setTimeout(() => setBlinkTime(false), 1200) }
      }, 60)
    }
  }

  const handleAuto = () => {
    if (!text.trim()) return
    const p = parseTodoText(text.trim())
    if (p.text)             setText(p.text)
    if (p.priority !== 3)   setPriority(p.priority)
    if (p.duration != null) setDuration(p.duration)
    if (p.date)             setDate(p.date)
    if (p.time)             setTime(p.time)
    if (p.date && p.time && type === 'todo') setType('termin')
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

  const handleSubmit = () => {
    if (!text.trim()) return

    if (type === 'termin') {
      let ok = true
      if (!date) { triggerBlink('date'); ok = false }
      if (!time) { triggerBlink('time'); ok = false }
      if (!ok) return
    }

    if (isEdit) {
      const wasTemplate = existingTodo.isTemplate

      if (type === 'routine') {
        if (wasTemplate) setTemplates(prev => prev.filter(t => t.id !== existingTodo.id))
        else             setTodos(prev => prev.filter(t => t.id !== existingTodo.id))
        setRoutines(prev => [...prev, {
          id:          Date.now(),
          text:        text.trim(),
          freq,
          customEvery: freq === 'custom' ? customEvery : null,
          customUnit:  freq === 'custom' ? customUnit  : null,
          hour:        routineHour || null,
          weekday,
          monthday,
          color,
          duration:    duration || null,
          category:    category || null,
          subItems,
        }])
      } else {
        const updated = {
          ...existingTodo,
          text:       text.trim(),
          priority:   type === 'todo' ? priority : existingTodo.priority,
          color,
          duration:   duration || null,
          category:   category || null,
          subItems,
          date:       (type === 'todo' || type === 'termin') ? (date || null) : null,
          time:       type === 'termin' ? (time || null) : null,
          isTemplate: type === 'vorlage',
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
        if (wasTemplate && type !== 'vorlage') {
          setTemplates(prev => prev.filter(t => t.id !== existingTodo.id))
          setTodos(prev => [...prev, updated])
        } else if (!wasTemplate && type === 'vorlage') {
          setTodos(prev => prev.filter(t => t.id !== existingTodo.id))
          setTemplates(prev => [...prev, updated])
        } else if (wasTemplate) {
          setTemplates(prev => prev.map(t => t.id === existingTodo.id ? updated : t))
        } else {
          setTodos(prev => prev.map(t => t.id === existingTodo.id ? updated : t))
        }
      }
    } else {
      if (type === 'todo') {
        setTodos(prev => [...prev, createBlock({
          text: text.trim(), priority, color,
          duration: duration || null,
          date: date || null, time: null,
          category: category || null,
          subItems,
        })])

      } else if (type === 'termin') {
        const block = createBlock({
          text: text.trim(), priority, color,
          duration: duration || 30,
          date, time,
          category: category || null,
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

      } else if (type === 'routine') {
        setRoutines(prev => [...prev, {
          id:          Date.now(),
          text:        text.trim(),
          freq,
          customEvery: freq === 'custom' ? customEvery : null,
          customUnit:  freq === 'custom' ? customUnit  : null,
          hour:        routineHour || null,
          weekday,
          monthday,
          color,
          duration:    duration || null,
          category:    category || null,
          subItems,
        }])

      } else if (type === 'vorlage') {
        setTemplates(prev => [...prev, createBlock({
          text:       text.trim(),
          color,
          duration:   duration || null,
          isTemplate: true,
          subItems,
          category:   category || null,
        })])
      }
    }

    onClose()
  }

  const activeTypeColor = TYPES.find(t => t.id === type)?.color ?? '#00CFFF'
  const submitLabel = isEdit ? 'Speichern' : {
    todo:    'Todo hinzufügen',
    termin:  'Termin eintragen',
    routine: 'Routine erstellen',
    vorlage: 'Vorlage speichern',
  }[type]

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

        {/* Typ-Tabs */}
        <div className={s.typeRow}>
          {TYPES.map(({ id, label, color: tc }) => (
            <button
              key={id}
              className={[s.typeBtn, type === id ? s.typeBtnActive : ''].join(' ')}
              style={type === id ? { '--tc': tc } : {}}
              onClick={() => handleTypeChange(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Text + Auto */}
        <div className={s.textRow}>
          <input
            className={s.textInput}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder={
              type === 'routine' ? 'z.B. Morgenroutine, Sport…' :
              type === 'vorlage' ? 'z.B. Deep Work Block…' :
              type === 'termin'  ? 'z.B. Zahnarzt, Meeting…' :
              'Was muss getan werden…'
            }
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          <button className={s.autoBtn} onClick={handleAuto} disabled={!text.trim()}>Auto</button>
        </div>

        {/* Prio (nur Todo) */}
        {type === 'todo' && (
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
        )}

        {/* Termin: Datum + Uhrzeit */}
        {type === 'termin' && (
          <div className={s.terminBlock}>
            <div className={s.terminField}>
              <span className={s.rowLabel}>Datum</span>
              <input
                type="date"
                className={[s.fieldInputSm, blinkDate ? s.blinkField : ''].join(' ')}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className={s.terminField}>
              <span className={s.rowLabel}>Uhrzeit</span>
              <input
                type="time"
                className={[s.fieldInputSm, blinkTime ? s.blinkField : ''].join(' ')}
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Todo: optionale Fälligkeit */}
        {type === 'todo' && (
          <div className={s.row}>
            <span className={s.rowLabel}>Fälligkeit</span>
            <input
              type="date" className={s.fieldInputSm}
              value={date} onChange={e => setDate(e.target.value)}
            />
          </div>
        )}

        {/* Routine: Takt */}
        {type === 'routine' && (
          <>
            <div className={s.row}>
              <span className={s.rowLabel}>Takt</span>
              <div className={s.segControl}>
                {[['daily','Täglich'],['weekly','Wöchentlich'],['monthly','Monatlich'],['custom','Eigener']].map(([v, l]) => (
                  <button
                    key={v}
                    className={[s.segBtn, freq === v ? s.segBtnActive : ''].join(' ')}
                    style={freq === v ? { '--tc': '#BF00FF' } : {}}
                    onClick={() => setFreq(v)}
                  >{l}</button>
                ))}
              </div>
            </div>

            {freq === 'custom' && (
              <div className={s.row}>
                <span className={s.rowLabel}>Alle</span>
                <input
                  type="number" min={1} max={999} className={s.durInput}
                  value={customEvery}
                  onChange={e => setCustomEvery(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <select
                  className={s.fieldSelect} value={customUnit}
                  onChange={e => setCustomUnit(e.target.value)}
                >
                  <option value="days">Tage</option>
                  <option value="weeks">Wochen</option>
                  <option value="months">Monate</option>
                </select>
              </div>
            )}

            {freq === 'weekly' && (
              <div className={s.row}>
                <span className={s.rowLabel}>Tag</span>
                <div className={s.wdayRow}>
                  {WDAYS.map((d, i) => (
                    <button
                      key={i}
                      className={[s.wdayBtn, weekday === i ? s.wdayBtnActive : ''].join(' ')}
                      onClick={() => setWeekday(i)}
                    >{d}</button>
                  ))}
                </div>
              </div>
            )}

            {freq === 'monthly' && (
              <div className={s.row}>
                <span className={s.rowLabel}>Am Tag</span>
                <input
                  type="number" className={s.durInput} min={1} max={31}
                  value={monthday} onChange={e => setMonthday(Number(e.target.value))}
                />
                <span className={s.rowLabel}>des Monats</span>
              </div>
            )}

            <div className={s.row}>
              <span className={s.rowLabel}>Uhrzeit <span style={{opacity:0.4,fontWeight:400}}>(opt.)</span></span>
              <select className={s.fieldSelect} value={routineHour} onChange={e => setRoutineHour(Number(e.target.value))}>
                <option value="">—</option>
                {ROUTINE_HOURS.map(h => (
                  <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Dauer (alle Typen) */}
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
              >✏</button>
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

        {/* Schritte (alle Typen) */}
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

        {/* Submit */}
        <button
          className={s.submitBtn}
          style={{ '--tc': activeTypeColor }}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          {submitLabel}
        </button>

      </div>
    </div>
  )
}
