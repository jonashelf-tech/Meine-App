// Diff-on-write (sync-architektur.md §4): Wenn sv() einen Key neu schreibt,
// schreibt die Sync-Schicht fort, WELCHE Unterschlüssel sich WANN geändert haben
// (sub) und welche gelöscht wurden (del/Tombstones). Reine Funktion, keine App-Imports.
import { describe, it, expect } from 'vitest'
import { updateChangeMap } from './diff'

const NOW = 1_800_000_000_000

describe('updateChangeMap — byId (todos & Co.)', () => {
  const t1 = { id: 'a', text: 'Zahnarzt' }
  const t2 = { id: 'b', text: 'Einkaufen' }

  it('geänderter Datensatz wird gestempelt, unveränderte nicht', () => {
    const { sub, del } = updateChangeMap('byId',
      [t1, t2], [t1, { ...t2, text: 'Einkaufen + Apotheke' }], {}, {}, NOW)
    expect(sub).toEqual({ b: NOW })
    expect(del).toEqual({})
  })

  it('gelöschter Datensatz bekommt Tombstone, sein sub-Eintrag verschwindet', () => {
    const { sub, del } = updateChangeMap('byId',
      [t1, t2], [t1], { b: 5 }, {}, NOW)
    expect(del).toEqual({ b: NOW })
    expect(sub).toEqual({})
  })

  it('neu angelegter Datensatz: sub=now, alter Tombstone wird entfernt (Re-Create)', () => {
    const { sub, del } = updateChangeMap('byId',
      [t1], [t1, t2], {}, { b: 5 }, NOW)
    expect(sub).toEqual({ b: NOW })
    expect(del).toEqual({})
  })

  it('Erstschreiben (oldValue null): alle Einträge gestempelt', () => {
    const { sub } = updateChangeMap('byId', null, [t1, t2], {}, {}, NOW)
    expect(sub).toEqual({ a: NOW, b: NOW })
  })

  it('Key komplett entfernt (toolReset): alles bekommt Tombstones', () => {
    const { sub, del } = updateChangeMap('byId',
      [t1, t2], null, { a: 5, b: 5 }, {}, NOW)
    expect(del).toEqual({ a: NOW, b: NOW })
    expect(sub).toEqual({})
  })

  it('Datensatz ohne id: Inhalts-Schlüssel — Ändern wirkt als Löschen+Anlegen', () => {
    const anon = { text: 'ohne id' }
    const first = updateChangeMap('byId', [], [anon], {}, {}, NOW)
    expect(Object.keys(first.sub)).toHaveLength(1)
    const edited = updateChangeMap('byId', [anon], [{ text: 'geändert' }], first.sub, {}, NOW + 1)
    expect(Object.keys(edited.sub)).toHaveLength(1)
    expect(Object.keys(edited.del)).toHaveLength(1)
  })
})

describe('updateChangeMap — byId:date (weight)', () => {
  it('nutzt date als Datensatz-Schlüssel', () => {
    const { sub } = updateChangeMap('byId:date',
      [{ date: '2026-07-01', kg: 80 }],
      [{ date: '2026-07-01', kg: 80 }, { date: '2026-07-03', kg: 79.5 }],
      {}, {}, NOW)
    expect(sub).toEqual({ '2026-07-03': NOW })
  })
})

describe('updateChangeMap — bySubkey (dailyState)', () => {
  it('stempelt nur betroffene Unterschlüssel', () => {
    const { sub } = updateChangeMap('bySubkey',
      { '2026-07-01': 3, '2026-07-02': 1 },
      { '2026-07-01': 3, '2026-07-02': 2 },
      {}, {}, NOW)
    expect(sub).toEqual({ '2026-07-02': NOW })
  })
})

describe('updateChangeMap — bySubkey2 (days: datum/slot)', () => {
  it('Slot-Änderung ergibt datum/slot-Granularität', () => {
    const { sub } = updateChangeMap('bySubkey2',
      { '2026-07-03': { 8: { text: 'Sport' } } },
      { '2026-07-03': { 8: { text: 'Sport' }, 9.5: { text: 'Anruf' } } },
      {}, {}, NOW)
    expect(sub).toEqual({ '2026-07-03/9.5': NOW })
  })

  it('gelöschter Slot: Tombstone auf Slot-Ebene, andere Slots des Tages unberührt', () => {
    const { sub, del } = updateChangeMap('bySubkey2',
      { '2026-07-03': { 8: { text: 'Sport' }, 9: { text: 'Anruf' } } },
      { '2026-07-03': { 8: { text: 'Sport' } } },
      { '2026-07-03/9': 5 }, {}, NOW)
    expect(del).toEqual({ '2026-07-03/9': NOW })
    expect(sub).toEqual({})
  })
})
