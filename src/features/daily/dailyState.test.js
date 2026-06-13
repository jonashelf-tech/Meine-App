import { describe, it, expect, beforeEach } from 'vitest'
import { sv, lv, SK } from '../../storage'
import { seedFromCheckins, loadDailyStates, getDayState, setDayState } from './dailyState'

beforeEach(() => localStorage.clear())

describe('seedFromCheckins — Einmal-Migration aus Kognitiv', () => {
  it('übernimmt Schlaf/Energie, Stimmung bleibt leer', () => {
    const checkins = {
      '2026-06-01': { sleep: 4, energy: 2, medi: null, note: 'x' },
      '2026-06-02': { sleep: null, energy: null },
    }
    expect(seedFromCheckins(checkins)).toEqual({
      '2026-06-01': { sleep: 4, energy: 2, mood: null },
    })
  })
  it('leeres Archiv → leerer Store', () => {
    expect(seedFromCheckins({})).toEqual({})
    expect(seedFromCheckins(null)).toEqual({})
  })
})

describe('loadDailyStates — lazy Seed nur beim allerersten Laden', () => {
  it('seedet aus kognitivCheckin wenn Key fehlt, danach nie wieder', () => {
    sv(SK.kognitivCheckin, { '2026-06-01': { sleep: 3, energy: 5 } })
    expect(loadDailyStates()['2026-06-01']).toEqual({ sleep: 3, energy: 5, mood: null })
    // Key existiert jetzt — späterer Checkin-Eintrag wird NICHT erneut geseedet
    sv(SK.kognitivCheckin, { '2026-06-09': { sleep: 1, energy: 1 } })
    expect(loadDailyStates()['2026-06-09']).toBeUndefined()
  })
  it('leerer Seed schreibt trotzdem den Key (Marker)', () => {
    loadDailyStates()
    expect(lv(SK.dailyState, null)).toEqual({})
  })
})

describe('getDayState / setDayState', () => {
  it('setDayState merged Felder pro Tag', () => {
    setDayState('2026-06-12', { sleep: 4 })
    setDayState('2026-06-12', { mood: 2 })
    expect(getDayState('2026-06-12')).toEqual({ sleep: 4, energy: null, mood: 2 })
  })
  it('unbekannter Tag → null', () => {
    expect(getDayState('2099-01-01')).toBeNull()
  })
})
