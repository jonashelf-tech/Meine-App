import { useState } from 'react'
import { useAppStore } from '../../store'
import { createBlock } from '../../features/todos/Block'
import { sk, parseHHMM } from '../../utils'
import s from './AddTodoModal.module.css'

const _dk = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function parseTodoText(raw) {
  let text = raw.trim()
  let date = null, time = null, duration = null, priority = 3
  const today = new Date()
  if (/\b(dringend|wichtig|asap|sofort|urgent)\b/i.test(text)) priority = 1
  else if (/\b(sollte|bald|soon)\b/i.test(text)) priority = 2
  text = text.replace(/\b(dringend|wichtig|asap|sofort|urgent|sollte|bald|soon)\b/gi, '')
  if (/\bmorgen\b/i.test(text)) { const d=new Date(today); d.setDate(d.getDate()+1); date=_dk(d) }
  else if (/\bübermorgen\b/i.test(text)) { const d=new Date(today); d.setDate(d.getDate()+2); date=_dk(d) }
  else if (/\bheute\b/i.test(text)) { date=_dk(today) }
  const WD=['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag']
  WD.forEach((w,i)=>{if(new RegExp('\\b'+w+'\\b','i').test(text)){const d=new Date(today);const diff=(i-d.getDay()+7)%7||7;d.setDate(d.getDate()+diff);date=_dk(d)}})
  const dm=text.match(/(\d{1,2})\.(\d{1,2})\.?/)
  if(dm){const d=new Date(today.getFullYear(),parseInt(dm[2])-1,parseInt(dm[1]));date=_dk(d)}
  text=text.replace(/\b(morgen|übermorgen|heute|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi,'')
  text=text.replace(/\d{1,2}\.\d{1,2}\.?/g,'')
  const tm=text.match(/(\d{1,2})[:\.](\d{2})\s*(?:uhr)?/i)||text.match(/(\d{1,2})\s*uhr/i)
  if(tm){const h=parseInt(tm[1]),m=tm[2]?parseInt(tm[2]):0;time=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;text=text.replace(tm[0],'')}
  const dr=text.match(/(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|min|minuten?)/i)
  if(dr){const v=parseFloat(dr[1].replace(',','.'));const u=dr[2].toLowerCase();duration=u.startsWith('h')||u.startsWith('s')?Math.round(v*60):Math.round(v);text=text.replace(dr[0],'')}
  return{text:text.trim().replace(/\s+/g,' '),date,time,duration,priority}
}

const NEON = [
  '#00CFFF', '#FF2D78', '#A855F7', '#00FF88',
  '#FFB800', '#FF6B35', '#00E5FF', '#FF69B4',
  '#39FF14', '#BF5FFF',
]
const DURATIONS = [5, 15, 30, 60, 90]

export default function AddTodoModal({ onClose }) {
  const { todos, setTodos, days, setDays } = useAppStore()

  const [text,     setText]     = useState('')
  const [priority, setPriority] = useState(3)
  const [duration, setDuration] = useState(30)
  const [color,    setColor]    = useState(NEON[todos.length % NEON.length])
  const [category, setCategory] = useState('')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('')
  const [showMore, setShowMore] = useState(false)

  const handleAuto = () => {
    if (!text.trim()) return
    const p = parseTodoText(text.trim())
    if (p.text)           setText(p.text)
    if (p.priority !== 3) setPriority(p.priority)
    if (p.duration)       setDuration(p.duration)
    if (p.date)           { setDate(p.date); setShowMore(true) }
    if (p.time)           { setTime(p.time); setShowMore(true) }
  }

  const handleSubmit = () => {
    if (!text.trim()) return
    const block = createBlock({
      text:     text.trim(),
      priority,
      color,
      duration,
      category: category.trim() || null,
      date:     date  || null,
      time:     time  || null,
    })

    // Termin → auch in den Tagesplan eintragen
    if (date && time) {
      const mins    = parseHHMM(time)
      const hour    = Math.floor(mins / 60)
      const half    = mins % 60 >= 30
      const slotKey = sk(hour, half)
      setDays(prev => ({
        ...prev,
        [date]: {
          ...(prev[date] ?? {}),
          [slotKey]: {
            text:     block.text,
            todoId:   block.id,
            color:    block.color,
            duration: block.duration || 30,
            done:     false,
            locked:   false,
          },
        },
      }))
    }

    setTodos(prev => [...prev, block])
    onClose()
  }

  return (
    <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={s.modal}>

        {/* Header */}
        <div className={s.header}>
          <span className={s.title}>Hinzufügen</span>
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
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className={s.autoBtn} onClick={handleAuto} disabled={!text.trim()}>
            Auto
          </button>
        </div>

        {/* Priorität */}
        <div className={s.row}>
          <span className={s.rowLabel}>Prio</span>
          <div className={s.segControl}>
            {[[1, '! Wichtig'], [2, '· Sollte'], [3, 'Kann']].map(([v, l]) => (
              <button
                key={v}
                className={[s.segBtn, priority === v ? s.segBtnActive : ''].join(' ')}
                onClick={() => setPriority(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Dauer */}
        <div className={s.row}>
          <span className={s.rowLabel}>Dauer</span>
          <div className={s.durRow}>
            {DURATIONS.map(m => (
              <button
                key={m}
                className={[s.durBtn, duration === m ? s.durBtnActive : ''].join(' ')}
                onClick={() => setDuration(m)}
              >
                {m < 60 ? m + 'min' : (m / 60) + 'h'}
              </button>
            ))}
          </div>
        </div>

        {/* Mehr-Toggle */}
        <button className={s.moreToggle} onClick={() => setShowMore(v => !v)}>
          {showMore ? '▲ weniger' : '▼ Farbe, Datum, Kategorie…'}
        </button>

        {showMore && (
          <div className={s.moreSection}>
            <div className={s.row}>
              <span className={s.rowLabel}>Farbe</span>
              <div className={s.colorRow}>
                {NEON.map(c => (
                  <button
                    key={c}
                    className={[s.colorCircle, color === c ? s.colorCircleActive : ''].join(' ')}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div className={s.row}>
              <span className={s.rowLabel}>Kategorie</span>
              <input
                className={s.fieldInput}
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="z.B. Arbeit, Privat…"
              />
            </div>
            <div className={s.row}>
              <span className={s.rowLabel}>Datum</span>
              <input
                className={s.fieldInputSm}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className={s.row}>
              <span className={s.rowLabel}>Uhrzeit</span>
              <input
                className={s.fieldInputSm}
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          className={s.submitBtn}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          Hinzufügen
        </button>

      </div>
    </div>
  )
}
