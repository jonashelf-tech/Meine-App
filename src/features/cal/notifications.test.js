// Notifications-Feed (A10, notifications-feed-konzept.md): reine Ableitung aus
// todos/calTombstones/calList/calCreds/calFilter/calSeen/days — kein eigener
// State, kein Sync-Code. „Neu" = fremder Stempel nach meinem letzten Blick.
import { describe, it, expect } from 'vitest'
import { getNotifications } from './notifications'
import { createBlock } from '../todos/Block'

const CAL = 'CAL1'
const calList  = { [CAL]: { name: 'Familie', emoji: '👨‍👩‍👧', members: { m_me: 'Jonas', m_paula: 'Paula' } } }
const calCreds = { [CAL]: { memberId: 'm_me' } }

const input = (over = {}) => ({
  todos: [], calTombstones: {}, calList, calCreds,
  calFilter: {}, calSeen: {}, days: {}, ...over,
})

const fremd = (over = {}) =>
  createBlock({ cal: CAL, text: 'Zahnarzt', updatedAt: 5000, by: 'm_paula', ...over })

describe('getNotifications — Grundfenster (Spec §7)', () => {
  it('fremder frischer Record → ein Eintrag mit type/who/title/at', () => {
    const t = fremd()
    const out = getNotifications(input({ todos: [t] }))
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      type: 'added', calId: CAL, todoId: t.id, by: 'm_paula',
      who: 'Paula', title: 'Zahnarzt', at: 5000,
    })
  })

  it('eigene Änderungen (by = ich) erscheinen nie', () => {
    const out = getNotifications(input({ todos: [fremd({ by: 'm_me' })] }))
    expect(out).toEqual([])
  })

  it('updatedAt <= calSeen[cal] ist gesehen; danach zählt es wieder', () => {
    const t = fremd({ updatedAt: 5000 })
    expect(getNotifications(input({ todos: [t], calSeen: { [CAL]: 5000 } }))).toEqual([])
    expect(getNotifications(input({ todos: [t], calSeen: { [CAL]: 4999 } }))).toHaveLength(1)
  })

  it('private Records (cal null) und ungestempelte Geteilte zählen nie', () => {
    const privat = createBlock({ text: 'privat' })
    const ungestempelt = createBlock({ cal: CAL, text: 'meins, noch nicht gepusht' })
    expect(getNotifications(input({ todos: [privat, ungestempelt] }))).toEqual([])
  })

  it('unbekannter Bearbeiter → who-Fallback „Jemand"', () => {
    const out = getNotifications(input({ todos: [fremd({ by: 'm_weg' })] }))
    expect(out[0].who).toBe('Jemand')
  })
})

describe('getNotifications — Typen (Spec §7)', () => {
  const early = new Date(500).toISOString()   // vor dem letzten Blick erstellt
  const seen  = { [CAL]: 1000 }

  it('alt erstellt + frisch geändert → changed', () => {
    const t = fremd({ createdAt: early, updatedAt: 5000 })
    const out = getNotifications(input({ todos: [t], calSeen: seen }))
    expect(out[0].type).toBe('changed')
  })

  it('alt erstellt + frisch erledigt → done', () => {
    const t = fremd({ createdAt: early, updatedAt: 5000, done: true, doneAt: new Date(4000).toISOString() })
    const out = getNotifications(input({ todos: [t], calSeen: seen }))
    expect(out[0].type).toBe('done')
  })

  it('neu erstellt schlägt erledigt: beides nach dem Blick → added', () => {
    const t = fremd({ createdAt: new Date(3000).toISOString(), updatedAt: 5000, done: true, doneAt: new Date(4000).toISOString() })
    const out = getNotifications(input({ todos: [t], calSeen: seen }))
    expect(out[0].type).toBe('added')
  })

  it('fremder frischer Tombstone → deleted ohne Titel', () => {
    const tomb = { [CAL]: [{ id: 'weg1', updatedAt: 5000, by: 'm_paula' }] }
    const out = getNotifications(input({ calTombstones: tomb, calSeen: seen }))
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ type: 'deleted', calId: CAL, todoId: 'weg1', who: 'Paula', title: null, at: 5000 })
  })

  it('eigener oder alter Tombstone → nichts', () => {
    const tomb = { [CAL]: [
      { id: 'meiner', updatedAt: 5000, by: 'm_me' },
      { id: 'alt',    updatedAt: 900,  by: 'm_paula' },
    ] }
    expect(getNotifications(input({ calTombstones: tomb, calSeen: seen }))).toEqual([])
  })
})

describe('getNotifications — Schalter (A8-Toggle)', () => {
  it('activity=false stellt den Kalender stumm (Records + Tombstones)', () => {
    const calFilter = { cals: { [CAL]: { activity: false } } }
    const out = getNotifications(input({
      todos: [fremd()],
      calTombstones: { [CAL]: [{ id: 'weg1', updatedAt: 5000, by: 'm_paula' }] },
      calFilter,
    }))
    expect(out).toEqual([])
  })

  it('show=false (Sicht-Chip) ändert am Feed nichts — getrennte Schalter', () => {
    const calFilter = { cals: { [CAL]: { show: false } } }
    const out = getNotifications(input({ todos: [fremd()], calFilter }))
    expect(out).toHaveLength(1)
  })
})

describe('getNotifications — Kollision (Konzept §2.2) + Ordnung', () => {
  const dk = '2026-07-23'
  const eigenerSlot = { '9': { text: 'Fokus-Block', duration: 120 } }

  it('fremder frischer Termin überlappt eigenen Slot → clash mit clashWith', () => {
    const t = fremd({ date: dk, time: '10:00', duration: 30 })
    const out = getNotifications(input({ todos: [t], days: { [dk]: eigenerSlot } }))
    expect(out[0].type).toBe('clash')
    expect(out[0].clashWith).toBe('Fokus-Block')
  })

  it('als eigener Slot platziert (todoId zeigt auf ihn) → kein clash', () => {
    const t = fremd({ date: dk, time: '10:00', duration: 30 })
    const days = { [dk]: { '10': { text: 'Zahnarzt', todoId: t.id, duration: 30 } } }
    expect(getNotifications(input({ todos: [t], days }))[0].type).toBe('added')
  })

  it('erledigter Termin kollidiert nicht — done bleibt done', () => {
    const t = fremd({
      createdAt: new Date(500).toISOString(), updatedAt: 5000,
      done: true, doneAt: new Date(4000).toISOString(),
      date: dk, time: '10:00', duration: 30,
    })
    const out = getNotifications(input({ todos: [t], days: { [dk]: eigenerSlot }, calSeen: { [CAL]: 1000 } }))
    expect(out[0].type).toBe('done')
  })

  it('sortiert neuester zuerst (at absteigend)', () => {
    const a = fremd({ updatedAt: 5000, text: 'älter' })
    const b = fremd({ updatedAt: 7000, text: 'neuer' })
    const out = getNotifications(input({ todos: [a, b] }))
    expect(out.map(e => e.title)).toEqual(['neuer', 'älter'])
  })
})
