import { describe, it, expect } from 'vitest'
import { rankOf, insertRank, buildDayEntries } from './tagesListeLogic'

describe('rankOf', () => {
  it('Slot: Rang ist die Dezimalstunde des Slot-Keys', () => {
    expect(rankOf({ kind: 'slot', slotKey: '9.5' })).toBe(9.5)
  })

  it('Blocker: Rang ist die Startstunde', () => {
    expect(rankOf({ kind: 'band', blocker: { startHour: 9, endHour: 17 } })).toBe(9)
  })

  it('Todo: Rang ist dayRank', () => {
    expect(rankOf({ kind: 'todo', todo: { dayRank: 12 } })).toBe(12)
  })

  it('Todo ohne dayRank landet am Tagesende (24), nicht bei 0', () => {
    expect(rankOf({ kind: 'todo', todo: { dayRank: null } })).toBe(24)
  })
})

describe('insertRank', () => {
  it('zwischen zwei Nachbarn: die Mitte', () => {
    expect(insertRank(10, 14)).toBe(12)
  })

  it('ganz oben (kein Vorgänger): vor den ersten', () => {
    expect(insertRank(null, 9)).toBe(8.5)
  })

  it('ganz unten (kein Nachfolger): hinter den letzten', () => {
    expect(insertRank(17, null)).toBe(17.5)
  })

  it('leere Liste: Tagesmitte', () => {
    expect(insertRank(null, null)).toBe(12)
  })

  it('darf über 24 hinaus — der Rang sortiert nur, er ist keine Uhrzeit', () => {
    expect(insertRank(24, null)).toBe(24.5)
  })
})

const T = (id, dayRank, extra = {}) => ({
  id, text: id, date: '2026-07-17', time: null, done: false,
  dayRank, createdAt: '2026-07-01T10:00:00.000Z', ...extra,
})

// Nur die Zeilen ohne Lücken — macht die Erwartungen lesbar.
const shape = (rows) => rows
  .filter(r => r.type !== 'gap')
  .map(r => r.type === 'band' ? { band: r.blocker.id, rows: shape(r.rows) } : r.key)

describe('buildDayEntries', () => {
  it('mischt Slots und Todos nach Rang', () => {
    const { rows } = buildDayEntries({
      slots:  { '10': { text: 'Zahnarzt' }, '14': { text: 'Meeting' } },
      todos:  [T('steuer', 12), T('waesche', 15)],
      blockers: [],
      viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual(['slot|10', 'todo|steuer', 'slot|14', 'todo|waesche'])
  })

  it('Todo ohne dayRank hängt hinten, hinter allem mit Rang', () => {
    const { rows } = buildDayEntries({
      slots: { '14': { text: 'Meeting' } },
      todos: [T('offen', null), T('steuer', 12)],
      blockers: [], viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual(['todo|steuer', 'slot|14', 'todo|offen'])
  })

  it('Gleichstand: der Anker gewinnt, das Todo rutscht dahinter', () => {
    const { rows } = buildDayEntries({
      slots: { '10': { text: 'Zahnarzt' } },
      todos: [T('steuer', 10)],
      blockers: [], viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual(['slot|10', 'todo|steuer'])
  })

  it('Gleichstand unter Todos: das ältere zuerst', () => {
    const { rows } = buildDayEntries({
      slots: {}, blockers: [], viewDate: '2026-07-17',
      todos: [
        T('neu',  12, { createdAt: '2026-07-05T00:00:00.000Z' }),
        T('alt',  12, { createdAt: '2026-07-01T00:00:00.000Z' }),
      ],
    })
    expect(shape(rows)).toEqual(['todo|alt', 'todo|neu'])
  })

  it('nimmt nur Todos dieses Tages, ohne Uhrzeit, offen', () => {
    const { rows } = buildDayEntries({
      slots: {}, blockers: [], viewDate: '2026-07-17',
      todos: [
        T('passt',   12),
        T('morgen',  12, { date: '2026-07-18' }),
        T('termin',  12, { time: '10:00' }),
        T('erledigt',12, { done: true }),
        T('poollos', 12, { date: null }),
      ],
    })
    expect(shape(rows)).toEqual(['todo|passt'])
  })

  it('steckt Einträge im Blocker-Bereich in dessen Band', () => {
    const { rows } = buildDayEntries({
      slots: { '10': { text: 'Standup' }, '19': { text: 'Sport' } },
      todos: [T('steuer', 12)],
      blockers: [{ id: 'b1', text: 'Arbeit', startHour: 9, endHour: 17, locked: false, date: '2026-07-17' }],
      viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual([
      { band: 'b1', rows: ['slot|10', 'todo|steuer'] },
      'slot|19',
    ])
  })

  it('leeres Band rendert trotzdem — es ist ein Drop-Ziel', () => {
    const { rows } = buildDayEntries({
      slots: {}, todos: [],
      blockers: [{ id: 'b1', text: 'Arbeit', startHour: 9, endHour: 17, locked: false, date: '2026-07-17' }],
      viewDate: '2026-07-17',
    })
    expect(shape(rows)).toEqual([{ band: 'b1', rows: [] }])
  })

  it('Lücke in einem leeren Band greift die Bandkanten, nicht null', () => {
    const { rows } = buildDayEntries({
      slots: {}, todos: [],
      blockers: [{ id: 'b1', text: 'Abend', startHour: 18, endHour: 22, locked: false, date: '2026-07-17' }],
      viewDate: '2026-07-17',
    })
    const band = rows.find(r => r.type === 'band')
    const gap  = band.rows.find(r => r.type === 'gap')
    expect([gap.prev, gap.next]).toEqual([18, 22])
    // Der Drop muss INNERHALB des Bandes landen, sonst springt der Eintrag
    // beim nächsten Rendern raus.
    const dropped = insertRank(gap.prev, gap.next)
    expect(dropped).toBeGreaterThanOrEqual(18)
    expect(dropped).toBeLessThan(22)
  })

  it('gesperrtes Band: seine Lücken sind keine Drop-Ziele', () => {
    const { rows } = buildDayEntries({
      slots: {}, todos: [],
      blockers: [{ id: 'b1', text: 'Schlaf', startHour: 22, endHour: 23, locked: true, date: '2026-07-17' }],
      viewDate: '2026-07-17',
    })
    const band = rows.find(r => r.type === 'band')
    expect(band.rows.every(r => r.type !== 'gap' || r.locked)).toBe(true)
  })

  // getBlockersForDate normalisiert Overnight-Blocker bereits in zwei Stücke und
  // gibt pro Tag nur das passende zurück — die Liste erbt das, ohne es zu wissen.
  const nacht = { id: 'b1', text: 'Nacht', startHour: 22, endHour: 6, locked: false, date: '2026-07-17' }

  it('tagesübergreifender Blocker: am Starttag das Stück bis Mitternacht', () => {
    const { rows } = buildDayEntries({ slots: {}, todos: [], blockers: [nacht], viewDate: '2026-07-17' })
    const bands = rows.filter(r => r.type === 'band')
    expect(bands.map(b => [b.blocker.startHour, b.blocker.endHour])).toEqual([[22, 24]])
  })

  it('tagesübergreifender Blocker: am Folgetag das Stück ab Mitternacht', () => {
    const { rows } = buildDayEntries({ slots: {}, todos: [], blockers: [nacht], viewDate: '2026-07-18' })
    const bands = rows.filter(r => r.type === 'band')
    expect(bands.map(b => [b.blocker.startHour, b.blocker.endHour])).toEqual([[0, 6]])
  })

  it('Lücken sitzen vor, zwischen und nach den Einträgen', () => {
    const { rows } = buildDayEntries({
      slots: { '10': { text: 'A' } }, todos: [], blockers: [], viewDate: '2026-07-17',
    })
    expect(rows.map(r => r.type)).toEqual(['gap', 'slot', 'gap'])
    expect([rows[0].prev, rows[0].next]).toEqual([null, 10])
    expect([rows[2].prev, rows[2].next]).toEqual([10, null])
  })

  // useDragDrop führt die Drop-Ziele in einer Map über den Key. Ein doppelter
  // Key überschreibt still das andere Ziel — die Lücke wäre tot, ohne dass man
  // etwas sieht. Zwei Fenster mit gleichen Stunden sind der Fall, der das
  // auslöst: aus den Nachbar-Rängen allein ist kein eindeutiger Key baubar.
  it('Lücken-Keys sind eindeutig, auch bei zwei Fenstern mit gleichen Stunden', () => {
    const { rows } = buildDayEntries({
      slots: { '10': { text: 'A' }, '12': { text: 'B' } },
      todos: [T('steuer', 11), T('offen', null)],
      blockers: [
        { id: 'b1', text: 'Arbeit',  startHour: 9, endHour: 17, locked: false, date: '2026-07-17' },
        { id: 'b2', text: 'Doppelt', startHour: 9, endHour: 17, locked: false, date: '2026-07-17' },
      ],
      viewDate: '2026-07-17',
    })
    const keys = []
    const collect = (list) => list.forEach(r => {
      keys.push(r.key)
      if (r.type === 'band') collect(r.rows)
    })
    collect(rows)
    expect(keys.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
