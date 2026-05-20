import { useState } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { useToast } from '../../../components/Toast/Toast'
import s from './TabGeburtstage.module.css'

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function daysUntilBirthday(mmdd) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [mm, dd] = mmdd.split('-').map(Number)
  let next = new Date(today.getFullYear(), mm - 1, dd)
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
  const diff = Math.round((next - today) / 86400000)
  return diff
}

function formatDate(mmdd) {
  const [mm, dd] = mmdd.split('-').map(Number)
  return `${dd}. ${MONTH_NAMES[mm - 1]}`
}

function calcAge(mmdd, year) {
  if (!year) return null
  const today = new Date()
  const [mm, dd] = mmdd.split('-').map(Number)
  let age = today.getFullYear() - year
  const bday = new Date(today.getFullYear(), mm - 1, dd)
  if (bday > today) age--
  return age
}

export default function TabGeburtstage() {
  const { birthdays, setBirthdays, toolColors } = useAppStore()
  const toolColor = getToolColor('geburtstage', toolColors)
  const { showToast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', day: '', month: '', year: '' })

  const sorted = [...birthdays].sort((a, b) => daysUntilBirthday(a.date) - daysUntilBirthday(b.date))
  const upcoming = sorted.filter(b => daysUntilBirthday(b.date) <= 7)
  const rest = sorted.filter(b => daysUntilBirthday(b.date) > 7)

  const handleAdd = () => {
    const name = form.name.trim()
    const day  = form.day.trim().padStart(2, '0')
    const mon  = form.month.trim().padStart(2, '0')
    if (!name || !day || !mon) {
      showToast('Name, Tag und Monat sind Pflichtfelder', 'error')
      return
    }
    const date = `${mon}-${day}`
    const year = form.year ? Number(form.year) : undefined
    const entry = { id: Date.now() + Math.random(), name, date, ...(year ? { year } : {}) }
    setBirthdays(prev => [...prev, entry])
    setForm({ name: '', day: '', month: '', year: '' })
    setShowForm(false)
    showToast(`${name} hinzugefügt`, 'success')
  }

  const handleRemove = (id) => {
    setBirthdays(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <div className={s.header}>
        <h2 className={s.title}>Geburtstage</h2>
        <button className={s.fab} onClick={() => setShowForm(p => !p)}>
          {showForm ? '✕' : '+'}
        </button>
      </div>

      {showForm && (
        <div className={s.form}>
          <input
            className={s.input}
            placeholder="Name"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
          <div className={s.dateRow}>
            <input
              className={s.inputSmall}
              placeholder="TT"
              maxLength={2}
              value={form.day}
              onChange={e => setForm(p => ({ ...p, day: e.target.value }))}
            />
            <span className={s.dateSep}>.</span>
            <input
              className={s.inputSmall}
              placeholder="MM"
              maxLength={2}
              value={form.month}
              onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
            />
            <input
              className={s.inputYear}
              placeholder="Jahr (opt.)"
              maxLength={4}
              value={form.year}
              onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
            />
          </div>
          <button className={s.addBtn} onClick={handleAdd}>Hinzufügen</button>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className={s.sectionLabel}>Bald</div>
          {upcoming.map(b => (
            <BirthdayRow key={b.id} birthday={b} onRemove={handleRemove} />
          ))}
        </section>
      )}

      {rest.length > 0 && (
        <section>
          {upcoming.length > 0 && <div className={s.sectionLabel}>Alle</div>}
          {rest.map(b => (
            <BirthdayRow key={b.id} birthday={b} onRemove={handleRemove} />
          ))}
        </section>
      )}

      {birthdays.length === 0 && !showForm && (
        <p className={s.empty}>Noch keine Geburtstage.<br />Tippe + zum Hinzufügen.</p>
      )}
    </div>
  )
}

function BirthdayRow({ birthday, onRemove }) {
  const days = daysUntilBirthday(birthday.date)
  const age  = calcAge(birthday.date, birthday.year)
  const isToday = days === 0

  return (
    <div className={[s.row, isToday ? s.rowToday : ''].join(' ')}>
      <div className={s.rowLeft}>
        <span className={s.rowName}>{birthday.name}</span>
        <span className={s.rowDate}>
          {formatDate(birthday.date)}
          {age !== null && ` · ${age + (isToday ? 0 : 1)} Jahre`}
        </span>
      </div>
      <div className={s.rowRight}>
        {isToday ? (
          <span className={s.todayBadge}>🎂 Heute!</span>
        ) : (
          <span className={s.daysBadge}>in {days}d</span>
        )}
        <button className={s.removeBtn} onClick={() => onRemove(birthday.id)}>✕</button>
      </div>
    </div>
  )
}
