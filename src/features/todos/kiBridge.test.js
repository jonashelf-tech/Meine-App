import { describe, it, expect } from 'vitest'
import { buildZerlegenPrompt, parseZerlegenResult } from './kiBridge'

// ── parseZerlegenResult ───────────────────────────────────────────────────────

describe('parseZerlegenResult', () => {
  it('(a) SCHRITTE-Block', () => {
    const raw = `Hier ist deine Antwort:\n<<<SCHRITTE\n["Schritt 1", "Schritt 2"]\nSCHRITTE>>>`
    const { steps, error } = parseZerlegenResult(raw)
    expect(error).toBeNull()
    expect(steps).toEqual(['Schritt 1', 'Schritt 2'])
  })

  it('(b) ```json-Fence', () => {
    const raw = 'Hier:\n```json\n["A", "B", "C"]\n```'
    const { steps, error } = parseZerlegenResult(raw)
    expect(error).toBeNull()
    expect(steps).toEqual(['A', 'B', 'C'])
  })

  it('(c) nacktes Array mit umgebender Prosa', () => {
    const raw = 'Ich empfehle: ["Erster Schritt", "Zweiter Schritt"] — viel Erfolg!'
    const { steps, error } = parseZerlegenResult(raw)
    expect(error).toBeNull()
    expect(steps).toEqual(['Erster Schritt', 'Zweiter Schritt'])
  })

  it('(d) Array aus {text}-Objekten', () => {
    const raw = `<<<SCHRITTE\n[{"text":"Objekt A"},{"text":"Objekt B"}]\nSCHRITTE>>>`
    const { steps, error } = parseZerlegenResult(raw)
    expect(error).toBeNull()
    expect(steps).toEqual(['Objekt A', 'Objekt B'])
  })

  it('(e) Müll → error gesetzt, steps leer', () => {
    const { steps, error } = parseZerlegenResult('Das ist kein JSON.')
    expect(steps).toEqual([])
    expect(error).toBeTruthy()
    expect(typeof error).toBe('string')
  })

  it('(f) Limit 20 Schritte greift', () => {
    const arr = Array.from({ length: 25 }, (_, i) => `Schritt ${i + 1}`)
    const raw = `<<<SCHRITTE\n${JSON.stringify(arr)}\nSCHRITTE>>>`
    const { steps } = parseZerlegenResult(raw)
    expect(steps).toHaveLength(20)
  })

  it('(f) Limit 200 Zeichen pro Schritt greift', () => {
    const longStep = 'x'.repeat(300)
    const raw = `<<<SCHRITTE\n${JSON.stringify([longStep])}\nSCHRITTE>>>`
    const { steps } = parseZerlegenResult(raw)
    expect(steps[0]).toHaveLength(200)
  })
})

// ── buildZerlegenPrompt ───────────────────────────────────────────────────────

describe('buildZerlegenPrompt', () => {
  const todo = { text: 'Steuererklärung machen', category: 'Finanzen', duration: 60 }

  it('enthält todo.text, hindernis, wert, today und <<<SCHRITTE-Marker', () => {
    const result = buildZerlegenPrompt(todo, {
      hindernis: 'Zu viele Belege',
      wert: 'Mehr Geld zurück',
      today: '2026-06-19',
    })
    expect(result).toContain('Steuererklärung machen')
    expect(result).toContain('Zu viele Belege')
    expect(result).toContain('Mehr Geld zurück')
    expect(result).toContain('2026-06-19')
    expect(result).toContain('<<<SCHRITTE')
    expect(result).toContain('SCHRITTE>>>')
  })

  it('lässt leere Kontextzeilen weg (kein hindernis, kein wert)', () => {
    const result = buildZerlegenPrompt(todo, { hindernis: '', wert: '', today: '2026-06-19' })
    expect(result).not.toContain('Was mich blockiert')
    expect(result).not.toContain('Was besser wird')
  })

  it('lässt hindernis-Zeile weg wenn nur wert gesetzt', () => {
    const result = buildZerlegenPrompt(todo, { hindernis: '', wert: 'Weniger Stress', today: '2026-06-19' })
    expect(result).not.toContain('Was mich blockiert')
    expect(result).toContain('Was besser wird')
  })

  it('fügt vorhandene Schritte ein wenn subItems vorhanden', () => {
    const todoWithSteps = {
      ...todo,
      subItems: [
        { id: '1', text: 'Belege sammeln', done: false },
        { id: '2', text: 'Formular öffnen', done: false },
      ],
    }
    const result = buildZerlegenPrompt(todoWithSteps, { hindernis: '', wert: '', today: '2026-06-19' })
    expect(result).toContain('Bereits vorhandene Schritte')
    expect(result).toContain('Belege sammeln')
  })
})
