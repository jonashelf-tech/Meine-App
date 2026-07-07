import { describe, it, expect } from 'vitest'
import {
  createBlocker, getBlockersForDate, getBlockerForHour,
  deleteBlockerInstance, deleteBlockerFuture,
} from './blockerUtils'

const activeOn = (blocker, dateStr) =>
  getBlockersForDate([blocker], dateStr).some(b => b._overnight !== 'end')

describe('isActiveOn — Wiederholungs-Typen', () => {
  it('einmalig: nur am Anker-Datum', () => {
    const b = createBlocker({ date: '2026-07-07' })
    expect(activeOn(b, '2026-07-07')).toBe(true)
    expect(activeOn(b, '2026-07-08')).toBe(false)
  })

  it('weekly: nur an gewählten Wochentagen', () => {
    const b = createBlocker({ date: '2026-07-06', repeat: { type: 'weekly', days: [1, 3] } }) // Mo+Mi
    expect(activeOn(b, '2026-07-06')).toBe(true)  // Mo
    expect(activeOn(b, '2026-07-07')).toBe(false) // Di
    expect(activeOn(b, '2026-07-08')).toBe(true)  // Mi
  })

  it('exceptions überspringen eine Instanz, endDate schneidet ab', () => {
    const b = createBlocker({ date: '2026-07-01', repeat: { type: 'daily' } })
    expect(activeOn(deleteBlockerInstance(b, '2026-07-07'), '2026-07-07')).toBe(false)
    expect(activeOn(deleteBlockerInstance(b, '2026-07-07'), '2026-07-08')).toBe(true)
    const cut = deleteBlockerFuture(b, '2026-07-07')
    expect(activeOn(cut, '2026-07-06')).toBe(true)
    expect(activeOn(cut, '2026-07-07')).toBe(false)
  })
})

describe('custom-Wiederholung über die Sommerzeit-Umstellung', () => {
  // Europe/Berlin: 2026-03-29 springt 02:00 → 03:00 (lokale Mitternachten
  // liegen 23h auseinander). In DST-freien Zonen (CI/UTC) sind floor und
  // round identisch — der Test schlägt dann nur bei echter Regression
  // auf einem DST-Rechner an; genau dort läuft er (Dev-Maschine Berlin).
  it('alle 2 Tage bleibt im Raster (Anker vor der Umstellung)', () => {
    const b = createBlocker({ date: '2026-03-25', repeat: { type: 'custom', every: 2, unit: 'days' } })
    // vor der Umstellung: 25. aktiv, 26. nicht, 27. aktiv …
    expect(activeOn(b, '2026-03-25')).toBe(true)
    expect(activeOn(b, '2026-03-26')).toBe(false)
    expect(activeOn(b, '2026-03-27')).toBe(true)
    // nach der Umstellung (29.03.): Raster läuft ungebrochen weiter
    expect(activeOn(b, '2026-03-29')).toBe(true)
    expect(activeOn(b, '2026-03-30')).toBe(false)
    expect(activeOn(b, '2026-03-31')).toBe(true)
    expect(activeOn(b, '2026-04-02')).toBe(true)
  })

  it('wöchentlich (unit weeks) bleibt auf demselben Wochentag', () => {
    const b = createBlocker({ date: '2026-03-23', repeat: { type: 'custom', every: 1, unit: 'weeks' } }) // Mo
    expect(activeOn(b, '2026-03-30')).toBe(true)  // Mo nach der Umstellung
    expect(activeOn(b, '2026-03-31')).toBe(false)
    expect(activeOn(b, '2026-04-06')).toBe(true)  // Mo
  })

  it('vor dem Anker nie aktiv', () => {
    const b = createBlocker({ date: '2026-07-07', repeat: { type: 'custom', every: 2, unit: 'days' } })
    expect(activeOn(b, '2026-07-06')).toBe(false)
    expect(activeOn(b, '2026-07-05')).toBe(false)
  })
})

describe('Overnight-Normalisierung', () => {
  it('startHour > endHour liefert zwei Hälften (Starttag + Folgetag)', () => {
    const b = createBlocker({ date: '2026-07-07', startHour: 22, endHour: 6 })
    const startDay = getBlockersForDate([b], '2026-07-07')
    expect(startDay).toHaveLength(1)
    expect(startDay[0]).toMatchObject({ _overnight: 'start', startHour: 22, endHour: 24, _origEnd: 6 })
    const nextDay = getBlockersForDate([b], '2026-07-08')
    expect(nextDay).toHaveLength(1)
    expect(nextDay[0]).toMatchObject({ _overnight: 'end', startHour: 0, endHour: 6, _origStart: 22 })
    expect(getBlockerForHour(23, startDay)).toBeTruthy()
    expect(getBlockerForHour(3, nextDay)).toBeTruthy()
    expect(getBlockerForHour(7, nextDay)).toBeNull()
  })
})
