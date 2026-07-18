// Guard G5 (sync-architektur.md §9): Eigenschaften der Merge-Engine.
// Kommutativität auf disjunkte Änderungen, Tombstone-Regeln, Idempotenz,
// „ohne Tombstone verschwindet nie etwas". Das ist der Test, der nachts
// ruhig schlafen lässt.
import { describe, it, expect } from 'vitest'
import { mergePayloads, mergeCalSlice } from './merge'

const NOW = 1_800_000_000_000
const DAY = 24 * 60 * 60 * 1000

// Kurzform: Payload für merge-Keys
const p = (value, sub = {}, del = {}) => ({ value, sub, del })

describe('mergePayloads — bySubkey', () => {
  it('disjunkte Änderungen beider Seiten: Union, nichts geht verloren — kommutativ', () => {
    const local  = p({ a: 1, b: 2 }, { b: 10 }, {})
    const remote = p({ a: 1, c: 3 }, { c: 12 }, {})
    const ab = mergePayloads('bySubkey', local, remote, NOW)
    const ba = mergePayloads('bySubkey', remote, local, NOW)
    expect(ab.payload.value).toEqual({ a: 1, b: 2, c: 3 })
    expect(ba.payload.value).toEqual(ab.payload.value)
  })

  it('gleicher Subkey beidseitig geändert: neuerer Zeitstempel gewinnt', () => {
    const local  = p({ a: 'alt' }, { a: 10 }, {})
    const remote = p({ a: 'neu' }, { a: 20 }, {})
    expect(mergePayloads('bySubkey', local, remote, NOW).payload.value).toEqual({ a: 'neu' })
    expect(mergePayloads('bySubkey', remote, local, NOW).payload.value).toEqual({ a: 'neu' })
  })

  it('Tombstone schlägt älteres Update', () => {
    const local  = p({ a: 'lebt' }, { a: NOW - 2 * DAY }, {})
    const remote = p({}, {}, { a: NOW - DAY })
    const { payload } = mergePayloads('bySubkey', local, remote, NOW)
    expect(payload.value).toEqual({})
    expect(payload.del.a).toBe(NOW - DAY)
  })

  it('neueres Update schlägt älteren Tombstone (Re-Create)', () => {
    const local  = p({ a: 'wieder da' }, { a: 30 }, {})
    const remote = p({}, {}, { a: 20 })
    const { payload } = mergePayloads('bySubkey', local, remote, NOW)
    expect(payload.value).toEqual({ a: 'wieder da' })
    expect(payload.del.a).toBeUndefined()
  })

  it('Eintrag ohne Tombstone verschwindet NIE (Gegenseite kennt ihn nur nicht)', () => {
    const local  = p({ a: 1, b: 2 }, {}, {})   // Alt-Daten, nie getrackt (ts 0)
    const remote = p({ a: 1 }, {}, {})          // b fehlt dort einfach — kein Tombstone
    const { payload } = mergePayloads('bySubkey', local, remote, NOW)
    expect(payload.value).toEqual({ a: 1, b: 2 })
  })

  it('Idempotenz: nochmal mit demselben Remote mergen ändert nichts mehr', () => {
    const local  = p({ a: 'x', b: 2 }, { a: 10 }, {})
    const remote = p({ a: 'y', c: 3 }, { a: 20, c: 5 }, { d: 7 })
    const once = mergePayloads('bySubkey', local, remote, NOW)
    const twice = mergePayloads('bySubkey', once.payload, remote, NOW)
    expect(twice.payload.value).toEqual(once.payload.value)
    expect(twice.changedVsLocal).toBe(false)
  })

  it('GC: Tombstones älter als 90 Tage werden ausgetragen', () => {
    const local  = p({}, {}, { alt: NOW - 100 * DAY, frisch: NOW - DAY })
    const remote = p({}, {}, {})
    const { payload } = mergePayloads('bySubkey', local, remote, NOW)
    expect(payload.del.alt).toBeUndefined()
    expect(payload.del.frisch).toBe(NOW - DAY)
  })

  it('changed-Flags: sagen, ob lokal angewendet bzw. gepusht werden muss', () => {
    const local  = p({ a: 1 }, { a: 10 }, {})
    const remote = p({ b: 2 }, { b: 20 }, {})
    const r = mergePayloads('bySubkey', local, remote, NOW)
    expect(r.changedVsLocal).toBe(true)    // b kommt lokal dazu
    expect(r.changedVsRemote).toBe(true)   // a muss zum Server
  })
})

describe('mergePayloads — bySubkey2 (days: der SK.days-Kernfall)', () => {
  it('zwei Geräte editieren verschiedene Slots desselben Tages: beide bleiben', () => {
    const local  = p({ '2026-07-03': { 8: { text: 'Sport' } } }, { '2026-07-03/8': 10 }, {})
    const remote = p({ '2026-07-03': { 9.5: { text: 'Anruf' } } }, { '2026-07-03/9.5': 12 }, {})
    const { payload } = mergePayloads('bySubkey2', local, remote, NOW)
    expect(payload.value).toEqual({
      '2026-07-03': { 8: { text: 'Sport' }, 9.5: { text: 'Anruf' } },
    })
  })
})

describe('mergePayloads — byId (todos)', () => {
  it('Union per id; lokale Reihenfolge bleibt, Remote-Neues hinten', () => {
    const local  = p([{ id: 'a', t: 1 }, { id: 'b', t: 1 }], {}, {})
    const remote = p([{ id: 'c', t: 1 }], { c: 20 }, {})
    const { payload } = mergePayloads('byId', local, remote, NOW)
    expect(payload.value.map(r => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('byId:date sortiert das Ergebnis nach Datum', () => {
    const local  = p([{ date: '2026-07-03', kg: 79 }], { '2026-07-03': 10 }, {})
    const remote = p([{ date: '2026-07-01', kg: 80 }], { '2026-07-01': 12 }, {})
    const { payload } = mergePayloads('byId:date', local, remote, NOW)
    expect(payload.value.map(r => r.date)).toEqual(['2026-07-01', '2026-07-03'])
  })
})

describe('mergePayloads — lww', () => {
  it('neuere Änderung gewinnt den ganzen Key', () => {
    const local  = { value: { theme: 'dark' }, changedAt: 10 }
    const remote = { value: { theme: 'light' }, changedAt: 20 }
    expect(mergePayloads('lww', local, remote, NOW).payload.value).toEqual({ theme: 'light' })
    expect(mergePayloads('lww', remote, local, NOW).payload.value).toEqual({ theme: 'light' })
  })

  it('deterministischer Tie-Break bei exakt gleichem Zeitstempel', () => {
    const a = { value: 'aaa', changedAt: 10 }
    const b = { value: 'zzz', changedAt: 10 }
    expect(mergePayloads('lww', a, b, NOW).payload.value)
      .toEqual(mergePayloads('lww', b, a, NOW).payload.value)
  })
})

// ─── mergeCalSlice — geteilte Kalender (G5-Erweiterung, teilen-spec.md §3.6) ──
// Merge zweier Kalender-Slices zwischen PERSONEN: Records ∪ Tombstones, LWW über
// updatedAt, Tombstone schlägt Älteres, GC nach 90 Tagen, dayRank bleibt lokal.
describe('mergeCalSlice', () => {
  const rec = (id, updatedAt, extra = {}) => ({ id, cal: 'C', updatedAt, by: 'x', text: `t${id}`, ...extra })
  const tomb = (id, updatedAt, by = 'x') => ({ id, updatedAt, by })
  const S = (records = [], tombstones = []) => ({ records, tombstones })

  it('disjunkte Records beider Seiten: Union — kommutativ', () => {
    const local = S([rec('a', 10)]), remote = S([rec('b', 12)])
    const ab = mergeCalSlice(local, remote, NOW)
    const ba = mergeCalSlice(remote, local, NOW)
    expect(ab.records.map(r => r.id)).toEqual(['a', 'b'])
    expect(ba.records.map(r => r.id)).toEqual(['a', 'b'])
  })

  it('gleicher Record beidseitig geändert: höheres updatedAt gewinnt — kommutativ', () => {
    const local = S([rec('a', 10, { text: 'alt' })])
    const remote = S([rec('a', 20, { text: 'neu' })])
    expect(mergeCalSlice(local, remote, NOW).records[0].text).toBe('neu')
    expect(mergeCalSlice(remote, local, NOW).records[0].text).toBe('neu')
  })

  it('Tombstone schlägt älteren Record → Record raus, Tombstone bleibt', () => {
    const local = S([rec('a', NOW - 2 * DAY)])
    const remote = S([], [tomb('a', NOW - DAY)])
    const { records, tombstones } = mergeCalSlice(local, remote, NOW)
    expect(records).toEqual([])
    expect(tombstones).toEqual([{ id: 'a', updatedAt: NOW - DAY, by: 'x' }])
  })

  it('neuerer Record schlägt älteren Tombstone (Wiederbelebung, z.B. Umzug rückgängig)', () => {
    const local = S([rec('a', 30)])
    const remote = S([], [tomb('a', 20)])
    const { records, tombstones } = mergeCalSlice(local, remote, NOW)
    expect(records.map(r => r.id)).toEqual(['a'])
    expect(tombstones).toEqual([])
  })

  it('Record ohne Tombstone verschwindet NIE (Gegenseite kennt ihn nur nicht)', () => {
    const local = S([rec('a', 10), rec('b', 10)])
    const remote = S([rec('a', 10)])
    expect(mergeCalSlice(local, remote, NOW).records.map(r => r.id)).toEqual(['a', 'b'])
  })

  it('Idempotenz: nochmal mit demselben Remote mergen ändert nichts', () => {
    const local = S([rec('a', 10, { text: 'x' })])
    const remote = S([rec('a', 20, { text: 'y' }), rec('c', 5)], [tomb('d', NOW - DAY)])
    const once = mergeCalSlice(local, remote, NOW)
    const twice = mergeCalSlice(once, remote, NOW)
    expect(twice.records).toEqual(once.records)
    expect(twice.tombstones).toEqual(once.tombstones)
    expect(twice.changedVsLocal).toBe(false)
  })

  it('GC: Tombstones älter als 90 Tage fallen deterministisch weg', () => {
    const local = S([], [tomb('a', NOW - 91 * DAY), tomb('b', NOW - DAY)])
    const remote = S()
    const { tombstones } = mergeCalSlice(local, remote, NOW)
    expect(tombstones.map(t => t.id)).toEqual(['b'])
  })

  it('dayRank bleibt lokal — Remote gewinnt den Inhalt, mein dayRank überlebt', () => {
    const local = S([rec('a', 10, { dayRank: 5, text: 'meins' })])
    const remote = S([rec('a', 20, { dayRank: 99, text: 'remote' })])
    const { records } = mergeCalSlice(local, remote, NOW)
    expect(records[0].text).toBe('remote')   // Remote-Inhalt gewinnt (neuer)
    expect(records[0].dayRank).toBe(5)        // aber mein persönlicher dayRank bleibt
  })

  it('dayRank = null, wenn ich den Record noch gar nicht kenne', () => {
    const { records } = mergeCalSlice(S(), S([rec('a', 20, { dayRank: 99 })]), NOW)
    expect(records[0].dayRank).toBeNull()
  })

  it('changed-Flags: sagen, ob lokal angewendet bzw. gepusht werden muss', () => {
    const local = S([rec('a', 10)])
    const remote = S([rec('b', 20)])
    const r = mergeCalSlice(local, remote, NOW)
    expect(r.changedVsLocal).toBe(true)    // b kommt lokal dazu
    expect(r.changedVsRemote).toBe(true)   // a muss zum Server
  })

  it('changed-Flags: reine dayRank-Differenz zählt NICHT als Änderung', () => {
    const local = S([rec('a', 10, { dayRank: 3 })])
    const remote = S([rec('a', 10, { dayRank: 8 })])   // gleicher Inhalt, nur dayRank
    const r = mergeCalSlice(local, remote, NOW)
    expect(r.changedVsRemote).toBe(false)
    expect(r.changedVsLocal).toBe(false)
  })
})
