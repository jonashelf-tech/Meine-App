import { describe, it, expect } from 'vitest'
import { sv, SK } from '../../../storage'
import { loadHaushalt, normalizeRoomIcon, DEFAULT_ROOMS, freqToDays } from './haushaltData'

describe('freqToDays — Custom-Intervall robust gegen 0/negativ', () => {
  it('nutzt customDays wenn > 0', () => {
    expect(freqToDays({ freq: 'custom', customDays: 14 })).toBe(14)
  })
  it('fällt bei 0/negativ/null auf 7 zurück (verhindert Division durch 0)', () => {
    expect(freqToDays({ freq: 'custom', customDays: 0 })).toBe(7)
    expect(freqToDays({ freq: 'custom', customDays: -3 })).toBe(7)
    expect(freqToDays({ freq: 'custom', customDays: null })).toBe(7)
  })
  it('nicht-custom nutzt die Frequenz-Tabelle', () => {
    expect(freqToDays({ freq: 'weekly' })).toBe(7)
    expect(freqToDays({ freq: 'daily' })).toBe(1)
  })
})

describe('normalizeRoomIcon', () => {
  it('lässt gültige Glyph-Namen unverändert', () => {
    expect(normalizeRoomIcon('kitchen')).toBe('kitchen')
  })

  it('migriert alte Emoji-Icons auf Glyph-Namen', () => {
    expect(normalizeRoomIcon('🍳')).toBe('kitchen')
    expect(normalizeRoomIcon('🚿')).toBe('bath')
    expect(normalizeRoomIcon('🛏')).toBe('bed')
  })

  it('fällt bei unbekanntem Icon auf "home" zurück', () => {
    expect(normalizeRoomIcon('🦄')).toBe('home')
  })
})

describe('loadHaushalt — haushalt_v1 Migration', () => {
  it('liefert Defaults + briefingDone:false bei Neuinstallation', () => {
    const config = loadHaushalt()
    expect(config.rooms).toEqual(DEFAULT_ROOMS)
    expect(config.briefingDone).toBe(false)
    expect(config.distribution).toBe('spread')
  })

  it('inferiert briefingDone:true für Alt-User mit gespeicherten Räumen', () => {
    // Alt-Daten: Räume vorhanden, aber briefingDone-Feld existierte noch nicht.
    sv(SK.haushalt, {
      rooms: [{ id: 'r1', name: 'Küche', icon: 'kitchen', tasks: [] }],
    })
    expect(loadHaushalt().briefingDone).toBe(true)
  })

  it('respektiert ein explizit gesetztes briefingDone:false', () => {
    sv(SK.haushalt, {
      briefingDone: false,
      rooms: [{ id: 'r1', name: 'Küche', icon: 'kitchen', tasks: [] }],
    })
    expect(loadHaushalt().briefingDone).toBe(false)
  })

  it('migriert Emoji-Icons und ergänzt fehlende Task-/Raum-Felder', () => {
    // Echte Alt-Struktur: Emoji-Icon, kein priority, Task ohne lowEnergy.
    sv(SK.haushalt, {
      briefingDone: true,
      rooms: [{
        id: 'r1', name: 'Küche', icon: '🍳',
        tasks: [{ id: 't1', text: 'Abwasch', freq: 'daily', lastDone: null }],
      }],
    })

    const room = loadHaushalt().rooms[0]
    expect(room.icon).toBe('kitchen')      // Emoji → Glyph
    expect(room.priority).toBe(3)          // Default ergänzt
    expect(room.tasks[0].lowEnergy).toBe(false) // Default ergänzt
    expect(room.tasks[0].text).toBe('Abwasch')  // Bestand bleibt
  })

  it('lässt vollständige Daten unverändert (kein Schaden ohne Migration)', () => {
    sv(SK.haushalt, {
      briefingDone: true,
      distribution: 'focus',
      rooms: [{
        id: 'r1', name: 'Bad', icon: 'bath', priority: 1,
        tasks: [{ id: 't1', text: 'WC', freq: 'weekly', customDays: null, lowEnergy: true, lastDone: '2026-05-01', subItems: [] }],
      }],
    })

    const config = loadHaushalt()
    expect(config.distribution).toBe('focus')
    expect(config.rooms[0].priority).toBe(1)
    expect(config.rooms[0].tasks[0].lowEnergy).toBe(true)
    expect(config.rooms[0].tasks[0].lastDone).toBe('2026-05-01')
  })
})
