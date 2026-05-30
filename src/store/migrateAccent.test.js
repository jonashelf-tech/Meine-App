import { describe, it, expect } from 'vitest'
import { migrateAccent } from './index'

const DEFAULT = '#8B5CF6'

describe('migrateAccent', () => {
  it('liefert die Default-Farbe bei null/leer (Neuinstallation)', () => {
    expect(migrateAccent(null)).toBe(DEFAULT)
    expect(migrateAccent('')).toBe(DEFAULT)
  })

  it('lässt bereits gespeicherte Hex-Werte unverändert', () => {
    expect(migrateAccent('#FF2D78')).toBe('#FF2D78')
  })

  it('mappt Legacy-Farbnamen auf Hex (echte Alt-Daten)', () => {
    expect(migrateAccent('cyan')).toBe('#00CFFF')
    expect(migrateAccent('pink')).toBe('#FF2D78')
    expect(migrateAccent('purple')).toBe('#BF00FF')
    expect(migrateAccent('green')).toBe('#00FF94')
  })

  it('fällt bei unbekanntem Namen auf Default zurück', () => {
    expect(migrateAccent('regenbogen')).toBe(DEFAULT)
  })
})
