import { useState } from 'react'
import { createBlock } from '../../todos/Block'
import { dateKey } from '../../../utils'
import s from './QuickAdd.module.css'

const DAYS_DE = {
  heute: 0, morgen: 1,
  montag: 1, dienstag: 2, mittwoch: 3,
  donnerstag: 4, freitag: 5, samstag: 6, sonntag: 0,
}

function resolveDay(name) {
  const today = new Date()
  const lc = name.toLowerCase()
  if (lc === 'heute') return dateKey(today)
  if (lc === 'morgen') {
    const d = new Date(today); d.setDate(d.getDate() + 1)
    return dateKey(d)
  }
  const targetDay = DAYS_DE[lc]
  if (targetDay != null) {
    const d = new Date(today)
    const current = d.getDay() === 0 ? 7 : d.getDay()
    const target  = targetDay === 0 ? 7 : targetDay
    let diff = target - current
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    return dateKey(d)
  }
  return null
}

function fmtDateStr(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-').map(Number)
  const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  return `${d}. ${MONTHS[m - 1]}`
}

export function parseInput(raw) {
  let text     = raw.trim()
  let time     = null
  let date     = null
  let priority = 3
  let category = null

  // Priority: "!" or "!!" at start → prio 1
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

  // Time: leading "HH:MM" OR "um HH:MM" anywhere in text
  const timeStart = text.match(/^(\d{1,2}:\d{2})(?:\s|$)/)
  const timeUm    = text.match(/\bum\s+(\d{1,2}:\d{2})(?:\s|$)/)
  const timeMatch = timeStart || timeUm
  if (timeMatch) {
    const [hStr, mStr] = timeMatch[1].split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      text = text.replace(timeMatch[0], ' ').trim()
    }
  }

  // Date: "am DD.MM" or "am Wochentag/heute/morgen"
  const dateMatch = text.match(/am\s+([\d.]+|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|heute|morgen)/i)
  if (dateMatch) {
    const raw2 = dateMatch[1]
    const numMatch = raw2.match(/^(\d{1,2})\.(\d{1,2})\.?$/)
    if (numMatch) {
      const day   = parseInt(numMatch[1], 10)
      const month = parseInt(numMatch[2], 10) - 1
      const year  = new Date().getFullYear()
      const d = new Date(year, month, day)
      if (!isNaN(d.getTime())) date = dateKey(d)
    } else {
      date = resolveDay(raw2)
    }
    if (date) text = text.replace(dateMatch[0], '').trim()
  }

  return { text, time, date, priority, category }
}

export default function QuickAdd({
  onAdd,
  placeholder = 'Todo… (!wichtig, am Montag, #Kat, 09:30)',
  autoFocus = false,
}) {
  const [value, setValue] = useState('')

  const parsed     = value.trim() ? parseInput(value.trim()) : null
  const showPreview = parsed && (
    parsed.priority !== 3 || parsed.date || parsed.time || parsed.category
  )

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    const p = parseInput(trimmed)
    onAdd?.(createBlock({
      text:     p.text || trimmed,
      time:     p.time,
      date:     p.date,
      priority: p.priority,
      category: p.category,
    }))
    setValue('')
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.inputRow}>
        <input
          className={s.input}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e) }}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
        />
        <button
          type="submit"
          className={s.submitBtn}
          aria-label="Hinzufügen"
          disabled={!value.trim()}
        >
          Auto
        </button>
      </div>

      {showPreview && (
        <div className={s.preview}>
          {parsed.priority === 1 && <span className={s.tagPrio}>!</span>}
          <span className={s.previewText}>{parsed.text || '…'}</span>
          {parsed.date && <span className={s.tag}>{fmtDateStr(parsed.date)}</span>}
          {parsed.time && <span className={s.tag}>{parsed.time}</span>}
          {parsed.category && <span className={s.tag}>#{parsed.category}</span>}
        </div>
      )}
    </form>
  )
}
