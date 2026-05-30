import { describe, it, expect } from 'vitest'
import { migrateBirthday } from './birthdayUtils'

describe('migrateBirthday', () => {
  it('ergänzt alle Felder mit Defaults bei leerem Objekt', () => {
    const m = migrateBirthday({})
    expect(m).toMatchObject({
      name: '',
      date: '01-01',
      year: null,
      kalender: false,
      wichtig: false,
      wichtigDays: 7,
      geschenk: false,
      geschenkDays: 14,
      notes: '',
      plannedYear: null,
    })
    expect(m.id).toBeTruthy() // id wird generiert
  })

  it('behält bestehende Werte und überschreibt sie nicht', () => {
    const original = {
      id: 'abc', name: 'Anna', date: '03-15', year: 1990,
      kalender: true, wichtig: true, wichtigDays: 3,
      geschenk: true, geschenkDays: 21, notes: 'Blumen', plannedYear: 2026,
    }
    expect(migrateBirthday(original)).toEqual(original)
  })

  it('migriert echtes Alt-Objekt (nur name + date) ohne Datenverlust', () => {
    // So sahen die ersten gespeicherten Geburtstage aus.
    const alt = { id: 'x1', name: 'Opa', date: '12-24' }
    const m = migrateBirthday(alt)

    expect(m.id).toBe('x1')
    expect(m.name).toBe('Opa')
    expect(m.date).toBe('12-24')
    // neue Felder mit sinnvollen Defaults
    expect(m.wichtig).toBe(false)
    expect(m.geschenk).toBe(false)
    expect(m.wichtigDays).toBe(7)
    expect(m.geschenkDays).toBe(14)
  })

  it('ist idempotent — zweimal migrieren ändert nichts', () => {
    const once = migrateBirthday({ name: 'Lea', date: '06-01' })
    expect(migrateBirthday(once)).toEqual(once)
  })
})
