import { useState } from 'react'
import { createBlock } from '../../todos/Block'
import { dateKey } from '../../../utils'
import s from './QuickAdd.module.css'

const DAYS_DE = {
  heute:    0,
  morgen:   1,
  montag:   1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag:  5,
  samstag:  6,
  sonntag:  0,
}

function resolveDay(name) {
  const today = new Date()
  const lc = name.toLowerCase()

  if (lc === 'heute') return dateKey(today)
  if (lc === 'morgen') {
    const d = new Date(today); d.setDate(d.getDate() + 1)
    return dateKey(d)
  }

  // named weekday
  const targetDay = DAYS_DE[lc]
  if (targetDay != null) {
    const d = new Date(today)
    const current = d.getDay() === 0 ? 7 : d.getDay() // 1=Mon..7=Sun
    const target  = targetDay === 0 ? 7 : targetDay
    let diff = target - current
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    return dateKey(d)
  }

  return null
}

function parseInput(raw) {
  let text  = raw.trim()
  let time  = null
  let date  = null
  let priority = 3
  let category = null

  // Priority: "!" or "!!" at start
  if (/^!!?/.test(text)) {
    priority = 1
    text = text.replace(/^!!?/, '').trimStart()
  }

  // Category: #Word
  const catMatch = text.match(/(?:^|\s)#(\S+)/)
  if (catMatch) {
    category = catMatch[1]
    text = text.replace(catMatch[0], ' ').trim()
  }

  // Time: "um HH:MM" or leading "HH:MM"
  const timeMatch = text.match(/(?:^um\s+|^)(\d{1,2}:\d{2})\s*/)
  if (timeMatch) {
    const [hStr, mStr] = timeMatch[1].split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      text = text.replace(timeMatch[0], '').trim()
    }
  }

  // Date: "am DD.MM" or "am Wochentag/heute/morgen"
  const dateMatch = text.match(/am\s+([\d.]+|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|heute|morgen)/i)
  if (dateMatch) {
    const raw2 = dateMatch[1]
    // "DD.MM" or "DD.MM." format
    const numMatch = raw2.match(/^(\d{1,2})\.(\d{1,2})\.?$/)
    if (numMatch) {
      const day   = parseInt(numMatch[1], 10)
      const month = parseInt(numMatch[2], 10) - 1
      const year  = new Date().getFullYear()
      const d = new Date(year, month, day)
      if (!isNaN(d)) date = dateKey(d)
    } else {
      date = resolveDay(raw2)
    }
    if (date) text = text.replace(dateMatch[0], '').trim()
  }

  return { text, time, date, priority, category }
}

export default function QuickAdd({ onAdd, placeholder = 'Aufgabe hinzufügen… (!Prio, am Montag, #Kategorie, 09:30)' }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    const parsed = parseInput(trimmed)
    onAdd?.(createBlock({
      text:     parsed.text || trimmed,
      time:     parsed.time,
      date:     parsed.date,
      priority: parsed.priority,
      category: parsed.category,
    }))
    setValue('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit(e)
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <input
        className={s.input}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="submit"
        className={s.submitBtn}
        aria-label="Hinzufügen"
        disabled={!value.trim()}
      >
        +
      </button>
    </form>
  )
}
