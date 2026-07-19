import { describe, it, expect } from 'vitest'
import {
  getToolDots, blocksOverlap, getCalItemsForDate, isCalShown, isPrivatShown,
  isEntryShown, calEmoji, getUnplacedCalItems, getCellBars,
} from './kalenderShared'
import { dateKey, getDurationKeys } from '../../../utils'

describe('getToolDots — fitness', () => {
  const todos = [], days = {}, toolColors = {}, active = ['fitness']
  it('Dot bei Gewichtseintrag', () => {
    const dots = getToolDots('2026-06-13', todos, active, [{ date: '2026-06-13', kg: 80 }], days, toolColors, null, [])
    expect(dots.some(d => d.id === 'fitness')).toBe(true)
  })
  it('Dot bei Session ohne Gewichtseintrag', () => {
    const dots = getToolDots('2026-06-13', todos, active, [], days, toolColors, null, [{ date: '2026-06-13' }])
    expect(dots.some(d => d.id === 'fitness')).toBe(true)
  })
  it('kein Dot wenn weder noch', () => {
    const dots = getToolDots('2026-06-13', todos, active, [], days, toolColors, null, [])
    expect(dots.some(d => d.id === 'fitness')).toBe(false)
  })
})

describe('getToolDots — haushalt-Punkt am lokalen Erstelltag', () => {
  it('setzt den Punkt am LOKALEN Tag, auch wenn createdAt (UTC) auf den Vortag fällt', () => {
    // In UTC+X fällt lokal 00:30 in der ISO-Form auf den Vortag; der Punkt muss
    // trotzdem am lokalen Tag erscheinen (Regression gegen createdAt.startsWith(dk)).
    const created = new Date(2026, 5, 13, 0, 30)
    const dk = dateKey(created)
    const todos = [{ toolId: 'haushalt', createdAt: created.toISOString() }]
    const dots = getToolDots(dk, todos, ['haushalt'], [], {}, {}, null, [])
    expect(dots.some(d => d.id === 'haushalt')).toBe(true)
  })
})

describe('blocksOverlap — Dauer-Klemmung', () => {
  it('erkennt echte Überlappung und lässt benachbarte Blöcke frei', () => {
    expect(blocksOverlap(14, 60, 14.5, 30)).toBe(true)   // 14:00–15:00 vs 14:30–15:00
    expect(blocksOverlap(14, 30, 14.5, 30)).toBe(false)  // 14:00–14:30 vs 14:30–15:00
  })
  it('negative Dauer invertiert die Prüfung nicht (auf ≥1 min geklemmt)', () => {
    // Ungeklemmt ergäbe end1 = 14 + (-60/60) = 13 → Kollision am selben Start unerkannt.
    expect(blocksOverlap(14, -60, 14, 30)).toBe(true)
  })
})

describe('getDurationKeys — Mindest-Slot', () => {
  it('30-min-Block belegt genau seinen Start-Slot', () => {
    expect(getDurationKeys('14', 30)).toEqual(['14'])
    expect(getDurationKeys('14', 60)).toEqual(['14', '14.5'])
  })
  it('0/negative Dauer belegt trotzdem den Start-Slot statt []', () => {
    expect(getDurationKeys('14', 0)).toEqual(['14'])
    expect(getDurationKeys('14', -60)).toEqual(['14'])
  })
})

describe('calFilter-Helfer — Default sichtbar', () => {
  it('isCalShown: sichtbar außer show===false', () => {
    expect(isCalShown({}, 'c1')).toBe(true)
    expect(isCalShown({ cals: { c1: { show: true } } }, 'c1')).toBe(true)
    expect(isCalShown({ cals: { c1: { show: false } } }, 'c1')).toBe(false)
    expect(isCalShown(undefined, 'c1')).toBe(true)
  })
  it('isPrivatShown: sichtbar außer privat===false', () => {
    expect(isPrivatShown({})).toBe(true)
    expect(isPrivatShown({ privat: false })).toBe(false)
    expect(isPrivatShown(undefined)).toBe(true)
  })
})

describe('getCalItemsForDate — geteilte Termine eines Tages', () => {
  const calList = { fam: { emoji: '👥' }, tennis: { emoji: '🎾' } }
  const todos = [
    { id: 'a', cal: 'fam',    date: '2026-07-20', time: '14:00', text: 'Zahnarzt' },
    { id: 'b', cal: 'tennis', date: '2026-07-20', time: '18:30', text: 'Tennis' },
    { id: 'c', cal: 'fam',    date: '2026-07-20', time: null,    text: 'Urlaub' },
    { id: 'd', cal: null,     date: '2026-07-20', time: '09:00', text: 'Privat-Sport' },
    { id: 'e', cal: 'fam',    date: '2026-07-21', time: '10:00', text: 'Anderer Tag' },
  ]

  it('nur cal!=null am gefragten Tag, privat + andere Tage raus', () => {
    const ids = getCalItemsForDate(todos, calList, { privat: true, cals: {} }, '2026-07-20').map(x => x.id)
    expect(ids).toEqual(['c', 'a', 'b']) // allday (ohne Zeit) zuerst, dann nach time
  })

  it('löst das Kalender-Emoji auf (Default 👥 bei fehlendem Eintrag)', () => {
    const items = getCalItemsForDate(todos, {}, { cals: {} }, '2026-07-20')
    expect(items.find(x => x.id === 'b').emoji).toBe('👥') // calList leer → Default
    const withList = getCalItemsForDate(todos, calList, { cals: {} }, '2026-07-20')
    expect(withList.find(x => x.id === 'b').emoji).toBe('🎾')
  })

  it('respektiert show:false — ausgeblendeter Kalender fehlt', () => {
    const filter = { privat: true, cals: { tennis: { show: false } } }
    const ids = getCalItemsForDate(todos, calList, filter, '2026-07-20').map(x => x.id)
    expect(ids).toEqual(['c', 'a']) // Tennis ausgeblendet
  })
})

describe('isEntryShown / calEmoji', () => {
  it('privat (cal null) folgt dem Privat-Chip, geteilt dem Kalender-Chip', () => {
    expect(isEntryShown({ privat: false }, null)).toBe(false)
    expect(isEntryShown({ privat: false }, 'fam')).toBe(true)
    expect(isEntryShown({ privat: true, cals: { fam: { show: false } } }, 'fam')).toBe(false)
    expect(isEntryShown(undefined, null)).toBe(true)
  })
  it('calEmoji: null bei privat, Default 👥 bei unbekanntem Kalender', () => {
    expect(calEmoji({ fam: { emoji: '🎾' } }, null)).toBe(null)
    expect(calEmoji({ fam: { emoji: '🎾' } }, 'fam')).toBe('🎾')
    expect(calEmoji({}, 'fam')).toBe('👥')
  })
})

describe('getUnplacedCalItems — Dedup gegen eigene Slots', () => {
  const calList = { fam: { emoji: '👥' } }
  const todos = [
    { id: 'a', cal: 'fam', date: '2026-07-20', time: '14:00', text: 'Zahnarzt' },
    { id: 'b', cal: 'fam', date: '2026-07-20', time: '18:30', text: 'Tennis' },
    { id: 'c', cal: 'fam', date: '2026-07-20', time: '09:00', text: 'Erledigt', done: true },
  ]
  it('lässt schon platzierte (todoId im Tag) und erledigte Termine weg', () => {
    const daySlots = { 14: { text: 'Zahnarzt', todoId: 'a' } }
    const ids = getUnplacedCalItems(todos, calList, {}, '2026-07-20', daySlots).map(x => x.id)
    expect(ids).toEqual(['b'])
  })
  it('ohne eigene Slots kommt alles Offene zurück', () => {
    const ids = getUnplacedCalItems(todos, calList, {}, '2026-07-20', undefined).map(x => x.id)
    expect(ids).toEqual(['a', 'b'])
  })
})

describe('getCellBars — Kalender-Kontext', () => {
  const days = { '2026-07-20': {
    9:  { text: 'Privat',  color: null },
    14: { text: 'Zahnarzt', todoId: 'a' },
  } }
  const todos = [{ id: 'a', cal: 'fam', text: 'Zahnarzt' }]
  const calList = { fam: { emoji: '🏠' } }

  it('hängt das Kalender-Emoji an den Balken (privat: null)', () => {
    const bars = getCellBars('2026-07-20', days, todos, true, calList, {})
    expect(bars.map(b => b.emoji)).toEqual([null, '🏠'])
  })
  it('blendet nach globalem Filter aus — privat wie geteilt', () => {
    const ohnePrivat = getCellBars('2026-07-20', days, todos, true, calList, { privat: false })
    expect(ohnePrivat.map(b => b.text)).toEqual(['Zahnarzt'])
    const ohneFam = getCellBars('2026-07-20', days, todos, true, calList, { cals: { fam: { show: false } } })
    expect(ohneFam.map(b => b.text)).toEqual(['Privat'])
  })
  it('ohne Kalender-Kontext: alles sichtbar, Emoji fällt auf 👥 zurück', () => {
    const bars = getCellBars('2026-07-20', days, todos, true)
    expect(bars.map(b => b.text)).toEqual(['Privat', 'Zahnarzt'])
    expect(bars.map(b => b.emoji)).toEqual([null, '👥'])
  })
})
