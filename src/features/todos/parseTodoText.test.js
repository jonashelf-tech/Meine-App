import { describe, it, expect } from 'vitest'
import { parseTodoText } from './parseTodoText'
import { dateKey } from '../../utils'

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return dateKey(d) }

describe('parseTodoText — konsolidierter Parser', () => {
  it('erkennt Zeitspanne als time + duration', () => {
    const p = parseTodoText('Zahnarzt morgen 14-15 wichtig')
    expect(p.time).toBe('14:00')
    expect(p.duration).toBe(60)
    expect(p.date).toBe(tomorrow())
    expect(p.priority).toBe(1)
    expect(p.text).toBe('Zahnarzt')
  })

  it('erkennt !-Präfix als Prio 1 (aus QuickAdd übernommen)', () => {
    const p = parseTodoText('!Steuer abgeben')
    expect(p.priority).toBe(1)
    expect(p.text).toBe('Steuer abgeben')
  })

  it('erkennt #Kategorie (aus QuickAdd übernommen)', () => {
    const p = parseTodoText('Rasen mähen #Garten')
    expect(p.category).toBe('Garten')
    expect(p.text).toBe('Rasen mähen')
  })

  it('erkennt Uhrzeit mit "uhr"', () => {
    const p = parseTodoText('Anruf 14 uhr')
    expect(p.time).toBe('14:00')
    expect(p.text).toBe('Anruf')
  })

  it('erkennt Dauer "30min" und "1,5h"', () => {
    expect(parseTodoText('Lesen 30min').duration).toBe(30)
    expect(parseTodoText('Putzen 1,5h').duration).toBe(90)
  })

  it('erkennt explizites Datum', () => {
    const year = new Date().getFullYear()
    const p = parseTodoText('Geschenk besorgen 24.12.')
    expect(p.date).toBe(`${year}-12-24`)
  })

  it('"sollte" → Prio 2', () => {
    expect(parseTodoText('sollte Keller aufräumen').priority).toBe(2)
  })

  it('ohne Marker bleibt alles leer', () => {
    const p = parseTodoText('Einfach nur Text')
    expect(p).toMatchObject({ text: 'Einfach nur Text', date: null, time: null, duration: null, priority: 3, category: null })
  })
})
