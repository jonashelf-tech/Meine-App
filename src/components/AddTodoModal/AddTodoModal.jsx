import { useState } from 'react'
import { useAppStore } from '../../store'
import { createBlock } from '../../features/todos/Block'
import { parseHHMM, minutesToSk, NEON } from '../../utils'
import s from './AddTodoModal.module.css'

// ─── Parser (from v2.7) ───────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────
const DURATIONS = [5, 15, 30, 60, 90]
const WDAYS = ['So','Mo','Di','Mi','Do','Fr','Sa']
const ROUTINE_HOURS = Array.from({ length: 19 }, (_, i) => i + 5)

const TYPES = [
  { id: 'todo',    label: 'Todo',    color: '#00CFFF' },
  { id: 'routine', label: 'Routine', color: '#BF00FF' },
  { id: 'termin',  label: 'Termin',  color: '#FF2D78' },
  { id: 'vorlage', label: 'Vorlage', color: '#00FF94' },
]

// ─── DurRow helper (reused in multiple sections) ──────────
function DurRow({ duration, setDuration }) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>Dauer</span>
      <div className={s.durRow}>
        {DURATIONS.map(m => (
          <button
            key={m}
            className={[s.durBtn, duration === m ? s.durBtnActive : ''].join(' ')}
            onClick={() => setDuration(duration === m ? null : m)}
          >
            {m < 60 ? m + 'min' : (m/60) + 'h'}
          </button>
        ))}
      </div>
      <input
        type="number" className={s.durInput} min={1} max={480}
        value={duration ?? ''} placeholder="—"
        onChange={e => setDuration(e.target.value ? parseInt(e.target.value) : null)}
      />
    </div>
  )
}

// ─── ColorRow helper ──────────────────────────────────────
function ColorRow({ color, setColor }) {
  return (
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
  )
}

// ─── Main Component ───────────────────────────────────────
export default function AddTodoModal({ onClose }) {
  const { todos, setTodos, routines, setRoutines, templates, setTemplates, days, setDays } = useAppStore()

  // Type
  const [type, setType] = useState('todo')

  // Common
  const [text,     setText]     = useState('')
  const [priority, setPriority] = useState(3)
  const [duration, setDuration] = useState(null)
  const [color,    setColor]    = useState(NEON[todos.length % NEON.length])
  const [category, setCategory] = useState('')
  const [showMore, setShowMore] = useState(false)

  // Todo / Termin date fields
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  // Routine fields
  const [freq,        setFreq]        = useState('daily')
  const [routineHour, setRoutineHour] = useState(8)
  const [weekday,     setWeekday]     = useState(1)
  const [monthday,    setMonthday]    = useState(1)

  // Blink state for Termin validation
  const [blinkDate, setBlinkDate] = useState(false)
  const [blinkTime, setBlinkTime] = useState(false)

  const triggerBlink = (field) => {
    if (field === 'date') { setBlinkDate(true); setTimeout(() => setBlinkDate(false), 1200) }
    if (field === 'time') { setBlinkTime(true); setTimeout(() => setBlinkTime(false), 1200) }
  }

  const handleTypeChange = (newType) => {
    setType(newType)
    // If switching to Termin and fields are empty → blink them immediately as hint
    if (newType === 'termin') {
      setTimeout(() => {
        if (!date) triggerBlink('date')
        if (!time) triggerBlink('time')
      }, 60)
    }
  }

  // ─── Auto parser ────────────────────────────────────────
  const handleAuto = () => {
    if (!text.trim()) return
    const p = parseTodoText(text.trim())
    if (p.text)           setText(p.text)
    if (p.priority !== 3) setPriority(p.priority)
    if (p.duration != null) setDuration(p.duration)
    if (p.date)           setDate(p.date)
    if (p.time)           setTime(p.time)
    // Auto-switch to Termin only if BOTH date and time extracted
    if (p.date && p.time && type === 'todo') setType('termin')
  }

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = () => {
    if (!text.trim()) return

    if (type === 'termin') {
      let ok = true
      if (!date) { triggerBlink('date'); ok = false }
      if (!time) { triggerBlink('time'); ok = false }
      if (!ok) return
    }

    if (type === 'todo') {
      const block = createBlock({
        text: text.trim(), priority, color,
        duration: duration || null,
        date: date || null, time: null,
        category: category.trim() || null,
      })
      setTodos(prev => [...prev, block])

    } else if (type === 'termin') {
      const block = createBlock({
        text: text.trim(), priority, color,
        duration: duration || 30,
        date, time,
        category: category.trim() || null,
      })
      // Add to tagesplan (locked — Termine sind nicht verschiebbar)
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
      const routine = {
        id:       Date.now(),
        text:     text.trim(),
        freq,
        hour:     routineHour,
        weekday,
        monthday,
        color,
        duration: duration || null,
        category: category.trim() || null,
      }
      setRoutines(prev => [...prev, routine])

    } else if (type === 'vorlage') {
      const template = createBlock({
        text:       text.trim(),
        color,
        duration:   duration || null,
        isTemplate: true,
      })
      setTemplates(prev => [...prev, template])
    }

    onClose()
  }

  const activeType = TYPES.find(t => t.id === type)
  const submitLabel = {
    todo:    'Todo hinzufügen',
    termin:  'Termin eintragen',
    routine: 'Routine erstellen',
    vorlage: 'Vorlage speichern',
  }[type]

  return (
    <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={s.modal}>

        {/* ── Header ─────────────────────────────────── */}
        <div className={s.header}>
          <span className={s.title}>Hinzufügen</span>
          <button className={s.closeBtn} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {/* ── Type buttons ────────────────────────────── */}
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

        {/* ── Text + Auto ─────────────────────────────── */}
        <div className={s.textRow}>
          <input
            className={s.textInput}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder={
              type === 'routine' ? 'z.B. Morgenroutine, Sport, Wäsche…' :
              type === 'vorlage' ? 'z.B. Deep Work Block, Meeting…' :
              type === 'termin'  ? 'z.B. Zahnarzt, Meeting um 14:00…' :
              'Was muss getan werden…'
            }
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          <button className={s.autoBtn} onClick={handleAuto} disabled={!text.trim()}>
            Auto
          </button>
        </div>

        {/* ════════════════════════════════════════════════
            TODO + TERMIN shared fields
        ════════════════════════════════════════════════ */}
        {(type === 'todo' || type === 'termin') && (
          <>
            {/* Prio */}
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
            <DurRow duration={duration} setDuration={setDuration} />

            {/* Termin: Datum + Uhrzeit prominent in main body */}
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

            {/* Mehr toggle */}
            <button className={s.moreToggle} onClick={() => setShowMore(v => !v)}>
              {showMore ? '▲ weniger' : '▼ Farbe, Kategorie' + (type === 'todo' ? ', Datum…' : '…')}
            </button>

            {showMore && (
              <div className={s.moreSection}>
                <ColorRow color={color} setColor={setColor} />
                <div className={s.row}>
                  <span className={s.rowLabel}>Kategorie</span>
                  <input
                    className={s.fieldInput} value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="z.B. Arbeit, Privat…"
                  />
                </div>
                {/* Todo: optional date in mehr section */}
                {type === 'todo' && (
                  <div className={s.row}>
                    <span className={s.rowLabel}>Datum</span>
                    <input
                      type="date" className={s.fieldInputSm}
                      value={date} onChange={e => setDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════
            ROUTINE fields
        ════════════════════════════════════════════════ */}
        {type === 'routine' && (
          <>
            {/* Häufigkeit */}
            <div className={s.row}>
              <span className={s.rowLabel}>Takt</span>
              <div className={s.segControl}>
                {[['daily','Täglich'],['weekly','Wöchentlich'],['monthly','Monatlich']].map(([v, l]) => (
                  <button
                    key={v}
                    className={[s.segBtn, freq === v ? s.segBtnActive : ''].join(' ')}
                    style={freq === v ? { '--tc': '#BF00FF' } : {}}
                    onClick={() => setFreq(v)}
                  >{l}</button>
                ))}
              </div>
            </div>

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

            {/* Uhrzeit */}
            <div className={s.row}>
              <span className={s.rowLabel}>Uhrzeit</span>
              <select
                className={s.fieldSelect} value={routineHour}
                onChange={e => setRoutineHour(Number(e.target.value))}
              >
                {ROUTINE_HOURS.map(h => (
                  <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                ))}
              </select>
            </div>

            {/* Dauer */}
            <DurRow duration={duration} setDuration={setDuration} />

            {/* Farbe + Kategorie */}
            <ColorRow color={color} setColor={setColor} />
            <div className={s.row}>
              <span className={s.rowLabel}>Kategorie</span>
              <input
                className={s.fieldInput} value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="z.B. Gesundheit, Arbeit…"
              />
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════
            VORLAGE fields
        ════════════════════════════════════════════════ */}
        {type === 'vorlage' && (
          <>
            <DurRow duration={duration} setDuration={setDuration} />
            <ColorRow color={color} setColor={setColor} />
          </>
        )}

        {/* ── Submit ──────────────────────────────────── */}
        <button
          className={s.submitBtn}
          style={{ '--tc': activeType?.color || '#00CFFF' }}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          {submitLabel}
        </button>

      </div>
    </div>
  )
}
