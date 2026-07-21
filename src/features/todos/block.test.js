import { describe, it, expect } from 'vitest'
import { createBlock, bumpPostpone } from './Block'

describe('bumpPostpone', () => {
  it('erhöht Count und setzt postponedAt', () => {
    const todo = createBlock({ postponeCount: 0, postponedAt: null })
    const now = new Date('2026-07-21T10:00:00')
    expect(bumpPostpone(todo, now)).toEqual({ postponeCount: 1, postponedAt: now.toISOString() })
  })

  it('zweiter Bump am selben Tag → kein weiterer Bump ({})', () => {
    const todo = createBlock({ postponeCount: 1, postponedAt: new Date('2026-07-21T08:00:00').toISOString() })
    const now = new Date('2026-07-21T18:00:00')
    expect(bumpPostpone(todo, now)).toEqual({})
  })

  it('Bump an Folgetag erhöht Count weiter', () => {
    const todo = createBlock({ postponeCount: 1, postponedAt: new Date('2026-07-21T08:00:00').toISOString() })
    const now = new Date('2026-07-22T09:00:00')
    expect(bumpPostpone(todo, now)).toEqual({ postponeCount: 2, postponedAt: now.toISOString() })
  })

  it('Legacy-Todo ohne die Felder crasht nicht, Count startet bei 1', () => {
    const legacy = { id: 't1', text: 'Alt', date: null, time: null }
    const now = new Date('2026-07-21T10:00:00')
    expect(bumpPostpone(legacy, now)).toEqual({ postponeCount: 1, postponedAt: now.toISOString() })
  })

  it('verändert das Eingabe-Objekt nicht (Purity)', () => {
    const todo = createBlock({ postponeCount: 0, postponedAt: null })
    const snapshot = { ...todo }
    bumpPostpone(todo, new Date('2026-07-21T10:00:00'))
    expect(todo).toEqual(snapshot)
  })
})
