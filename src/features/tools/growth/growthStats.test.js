// Guard für die Overview-Kacheln: Serie + Wochen-Zählung sind rein und
// dürfen nicht vom echten Kalender/Storage abhängen (today wird immer übergeben).
import { describe, it, expect } from 'vitest'
import { growthStreak, doneThisWeek, emptyDay } from './growthStore'

const dayMitEintrag = () => ({ ...emptyDay(), freitext: 'x' })
const dataMit = (dates) => ({
  days: Object.fromEntries(dates.map(d => [d, dayMitEintrag()])),
  settings: { aktiveKategorien: [] },
})

describe('growthStreak', () => {
  it('zählt zusammenhängende Tage inklusive heute', () => {
    const data = dataMit(['2026-07-08', '2026-07-09', '2026-07-10'])
    expect(growthStreak(data, '2026-07-10')).toBe(3)
  })

  it('heute ohne Eintrag bricht die Serie nicht', () => {
    const data = dataMit(['2026-07-08', '2026-07-09'])
    expect(growthStreak(data, '2026-07-10')).toBe(2)
  })

  it('eine Lücke beendet die Serie', () => {
    const data = dataMit(['2026-07-06', '2026-07-08', '2026-07-09', '2026-07-10'])
    expect(growthStreak(data, '2026-07-10')).toBe(3)
  })

  it('ohne Einträge ist die Serie 0', () => {
    expect(growthStreak(dataMit([]), '2026-07-10')).toBe(0)
  })

  it('Tage ohne echten Eintrag zählen nicht', () => {
    const data = { days: { '2026-07-10': emptyDay() }, settings: { aktiveKategorien: [] } }
    expect(growthStreak(data, '2026-07-10')).toBe(0)
  })
})

describe('doneThisWeek', () => {
  // 2026-07-10 ist ein Freitag → Montag der Woche ist 2026-07-06
  it('zählt nur Eintrags-Tage von Montag bis heute', () => {
    const data = dataMit(['2026-07-05', '2026-07-06', '2026-07-09'])
    expect(doneThisWeek(data, '2026-07-10')).toBe(2)
  })

  it('Montag als heute zählt sich selbst', () => {
    const data = dataMit(['2026-07-05', '2026-07-06'])
    expect(doneThisWeek(data, '2026-07-06')).toBe(1)
  })

  it('leere Daten ergeben 0', () => {
    expect(doneThisWeek(dataMit([]), '2026-07-10')).toBe(0)
  })
})
