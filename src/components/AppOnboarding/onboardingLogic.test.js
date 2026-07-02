import { describe, it, expect } from 'vitest'
import { hasPoolTodo, hasSlotToday } from './onboardingLogic'

const todo = (over = {}) => ({ id: 'x', text: 't', done: false, date: null, time: null, ...over })

describe('onboardingLogic — hasPoolTodo', () => {
  it('true bei offenem Pool-Todo (kein date/time)', () => {
    expect(hasPoolTodo({ todos: [todo()] })).toBe(true)
  })
  it('false bei leerem Pool', () => {
    expect(hasPoolTodo({ todos: [] })).toBe(false)
  })
  it('false wenn nur ein Termin existiert (date+time)', () => {
    expect(hasPoolTodo({ todos: [todo({ date: '2026-07-02', time: '14:00' })] })).toBe(false)
  })
  it('false wenn nur eine Fälligkeit existiert (nur date)', () => {
    expect(hasPoolTodo({ todos: [todo({ date: '2026-07-02' })] })).toBe(false)
  })
  it('ignoriert erledigte Todos', () => {
    expect(hasPoolTodo({ todos: [todo({ done: true })] })).toBe(false)
  })
})

describe('onboardingLogic — hasSlotToday', () => {
  it('true wenn heute mindestens ein Slot belegt ist', () => {
    expect(hasSlotToday({ days: { '2026-07-02': { '9': { text: 't' } } } }, '2026-07-02')).toBe(true)
  })
  it('false wenn heute keine Slots', () => {
    expect(hasSlotToday({ days: {} }, '2026-07-02')).toBe(false)
  })
  it('false wenn nur ein anderer Tag Slots hat', () => {
    expect(hasSlotToday({ days: { '2026-07-01': { '9': { text: 't' } } } }, '2026-07-02')).toBe(false)
  })
})
