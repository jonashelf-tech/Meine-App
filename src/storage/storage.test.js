import { describe, it, expect, vi } from 'vitest'
import {
  sv, lv, SK, BACKUP_CATS,
  importData, exportData,
  exportDataByCategories, importDataByCategories,
} from './index'

describe('lv / sv — round-trip & Fallback', () => {
  it('speichert und liest denselben Wert zurück', () => {
    sv(SK.todos, [{ id: 1, text: 'Test' }])
    expect(lv(SK.todos, [])).toEqual([{ id: 1, text: 'Test' }])
  })

  it('liefert den Fallback bei fehlendem Key', () => {
    expect(lv(SK.todos, 'fallback')).toBe('fallback')
  })

  it('liefert den Fallback bei kaputtem JSON statt zu crashen', () => {
    localStorage.setItem(SK.todos, '{ kaputt ]')
    expect(lv(SK.todos, [])).toEqual([])
  })

  it('unterscheidet gespeichertes null von fehlendem Key', () => {
    sv(SK.theme, null)
    // null ist valides JSON → wird zurückgegeben, nicht der Fallback
    expect(lv(SK.theme, 'fallback')).toBeNull()
  })

  it('schluckt Schreibfehler (z.B. Quota) ohne zu werfen', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    expect(() => sv(SK.todos, [1, 2, 3])).not.toThrow()
    spy.mockRestore()
  })
})

describe('importData — schützt vor Fremd-Keys', () => {
  it('importiert nur adhs_-Keys, ignoriert den Rest', () => {
    importData({
      [SK.todos]: JSON.stringify([{ id: 1 }]),
      'fremder_key': JSON.stringify({ böse: true }),
    })
    expect(localStorage.getItem(SK.todos)).toBe(JSON.stringify([{ id: 1 }]))
    expect(localStorage.getItem('fremder_key')).toBeNull()
  })

  it('Round-trip: exportData → importData stellt Daten wieder her', () => {
    sv(SK.todos, [{ id: 7 }])
    sv(SK.birthdays, [{ name: 'Anna' }])
    const dump = exportData()

    localStorage.clear()
    importData(dump)

    expect(lv(SK.todos, [])).toEqual([{ id: 7 }])
    expect(lv(SK.birthdays, [])).toEqual([{ name: 'Anna' }])
  })
})

describe('Kategorie-Export/-Import — schreibt nur erlaubte Keys', () => {
  it('exportiert nur Keys der gewählten Kategorie', () => {
    sv(SK.todos, [{ id: 1 }])      // Kategorie kalender
    sv(SK.weight, [{ kg: 80 }])    // Kategorie tools

    const data = exportDataByCategories(['kalender'])

    expect(data[SK.todos]).toBeDefined()
    expect(data[SK.weight]).toBeUndefined()
  })

  it('importiert keine Keys außerhalb der gewählten Kategorie', () => {
    // data enthält absichtlich einen tools-Key, importiert wird aber nur kalender
    const data = {
      [SK.todos]:  JSON.stringify([{ id: 1 }]),
      [SK.weight]: JSON.stringify([{ kg: 99 }]),
    }
    importDataByCategories(data, ['kalender'])

    expect(lv(SK.todos, null)).toEqual([{ id: 1 }])
    expect(localStorage.getItem(SK.weight)).toBeNull()
  })
})

describe('Mealprep-Keys', () => {
  it('hat die 3 neuen Rezepte-Keys', () => {
    expect(SK.rezepteZutaten).toBe('adhs_recipes_ingredients')
    expect(SK.rezepteKoerbe).toBe('adhs_recipes_baskets')
    expect(SK.rezepteSettings).toBe('adhs_recipes_settings')
  })
  it('alle Mealprep-Nutzdaten-Keys sind in BACKUP_CATS.tools', () => {
    ;[SK.recipes, SK.rezepteZutaten, SK.rezepteKoerbe, SK.rezepteSettings,
      SK.selectedDishes].forEach(k => expect(BACKUP_CATS.tools).toContain(k))
  })
})

describe('Backup-Abdeckung — Anti-Drift', () => {
  // Bewusst NICHT gesichert: Backup-Metadaten + wöchentlich neu setzende States.
  const EPHEMERAL = new Set([
    SK.lastAutoBackup,
    SK.lastOffDeviceBackup,
    SK.kognitivPractice,
    SK.kognitivCheckinSkip,
    SK.updateSnoozed,
  ])
  const backedUp = new Set([
    ...BACKUP_CATS.kalender, ...BACKUP_CATS.tools, ...BACKUP_CATS.einstellungen,
  ])

  it('jeder SK-Key ist entweder gesichert oder explizit ephemer', () => {
    const unclassified = Object.entries(SK)
      .filter(([, val]) => !backedUp.has(val) && !EPHEMERAL.has(val))
      .map(([name]) => name)
    expect(unclassified).toEqual([])
  })

  it('Nutzdaten-Keys der neueren Tools sind im Backup', () => {
    ;[SK.reminder, SK.reminderDismissed, SK.elvi, SK.recipesVersion, SK.weightDash]
      .forEach(k => expect(BACKUP_CATS.tools).toContain(k))
  })

  it('Fitness-Keys sind in BACKUP_CATS.tools', () => {
    ;[SK.fitness, SK.fitnessSessions].forEach(k =>
      expect(BACKUP_CATS.tools).toContain(k))
  })
})
