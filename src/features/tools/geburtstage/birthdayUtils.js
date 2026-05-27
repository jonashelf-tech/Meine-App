// src/features/tools/geburtstage/birthdayUtils.js

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export function migrateBirthday(b) {
  return {
    id:           b.id ?? genId(),
    name:         b.name ?? '',
    date:         b.date ?? '01-01',
    year:         b.year ?? null,
    kalender:     b.kalender ?? false,
    wichtig:      b.wichtig ?? false,
    wichtigDays:  b.wichtigDays ?? 7,
    geschenk:     b.geschenk ?? false,
    geschenkDays: b.geschenkDays ?? 14,
    notes:        b.notes ?? '',
    plannedYear:  b.plannedYear ?? null,
  }
}

export function createBirthday(partial = {}) {
  return migrateBirthday({ id: genId(), ...partial })
}

export function daysUntilBirthday(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [mm, dd] = date.split('-').map(Number)
  let next = new Date(today.getFullYear(), mm - 1, dd)
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
  return Math.round((next - today) / 86400000)
}

const MONTH_NAMES = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
]
export function formatBirthdayDate(date) {
  const [mm, dd] = date.split('-').map(Number)
  return `${dd}. ${MONTH_NAMES[mm - 1]}`
}

export function calcAge(date, year) {
  if (!year) return null
  const today = new Date()
  const [mm, dd] = date.split('-').map(Number)
  let age = today.getFullYear() - year
  const bday = new Date(today.getFullYear(), mm - 1, dd)
  if (bday > today) age--
  return age
}

export function getInitial(name) {
  return (name?.trim()[0] ?? '?').toUpperCase()
}

export function parseDateInput(str) {
  const parts = str.trim().split('.')
  if (parts.length < 2) return null
  const day   = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  if (isNaN(day) || isNaN(month)) return null
  if (day < 1 || day > 31)   return null
  if (month < 1 || month > 12) return null
  return { day, month }
}

export function isBirthdayChipDue(birthday) {
  if (!birthday.wichtig) return false
  const days = daysUntilBirthday(birthday.date)
  return days <= birthday.wichtigDays && days >= 0
}

export function isGeschenkChipDue(birthday) {
  if (!birthday.geschenk) return false
  const days = daysUntilBirthday(birthday.date)
  return days <= birthday.geschenkDays && days >= 0
}

export function getActiveChips(birthdays, toolColor) {
  const chips = []
  for (const b of birthdays) {
    if (isBirthdayChipDue(b)) {
      chips.push({ type: 'birthday', birthday: b, text: `${b.name} Geburtstag`, color: toolColor })
    }
    if (isGeschenkChipDue(b)) {
      chips.push({ type: 'geschenk', birthday: b, text: `Geschenk für ${b.name}`, color: '#14B8A6' })
    }
  }
  return chips
}

export function getBirthdaysForCalendarDate(birthdays, dateKey) {
  const [y, mm, dd] = dateKey.split('-')
  const year = parseInt(y, 10)
  return birthdays.filter(b => {
    if (!b.kalender) return false
    if (b.plannedYear === year) return false
    const [bMm, bDd] = b.date.split('-')
    return bMm === mm && bDd === dd
  })
}

export function sortBirthdays(birthdays, sort) {
  const arr = [...birthdays]
  if (sort === 'next') {
    return arr.sort((a, b) => daysUntilBirthday(a.date) - daysUntilBirthday(b.date))
  }
  if (sort === 'wichtig') {
    return arr.sort((a, b) => {
      if (a.wichtig && !b.wichtig) return -1
      if (!a.wichtig && b.wichtig) return 1
      return daysUntilBirthday(a.date) - daysUntilBirthday(b.date)
    })
  }
  if (sort === 'alpha') {
    return arr.sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }
  if (sort === 'age') {
    return arr.sort((a, b) => {
      const ayear = a.year ?? 9999
      const byear = b.year ?? 9999
      return ayear - byear
    })
  }
  return arr
}
