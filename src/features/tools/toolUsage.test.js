import { describe, it, expect, beforeEach } from 'vitest'
import { lv, SK } from '../../storage'
import { markToolUsed, seedToolUsage, unusedDays, UNUSED_DAYS } from './toolUsage'

beforeEach(() => localStorage.clear())

describe('toolUsage — Dachboden-Regel', () => {
  it('markToolUsed schreibt das Datum, ohne andere Tools zu überschreiben', () => {
    markToolUsed('timer', '2026-06-01')
    markToolUsed('garten', '2026-06-05')
    expect(lv(SK.toolUsage, {})).toEqual({ timer: '2026-06-01', garten: '2026-06-05' })
  })

  it('seedToolUsage stempelt nur Tools ohne Eintrag', () => {
    markToolUsed('timer', '2026-01-01')
    seedToolUsage(['timer', 'garten'], '2026-06-11')
    expect(lv(SK.toolUsage, {})).toEqual({ timer: '2026-01-01', garten: '2026-06-11' })
  })

  it('unusedDays rechnet Tage seit letztem Öffnen', () => {
    markToolUsed('timer', '2026-06-01')
    const now = new Date(2026, 5, 11).getTime() // 11. Juni lokal
    expect(unusedDays('timer', now)).toBe(10)
  })

  it('ohne Eintrag gilt ein Tool als frisch (0 Tage) — kein falsches Badge', () => {
    expect(unusedDays('nie-geoeffnet')).toBe(0)
  })

  it('UNUSED_DAYS-Schwelle ist 60', () => {
    expect(UNUSED_DAYS).toBe(60)
  })
})
