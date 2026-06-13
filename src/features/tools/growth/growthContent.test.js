// Anti-Drift: Der Karten-Content ist eine exakte Übernahme der Spezifikation.
// Wer hier Karten ändert/löscht, soll es bewusst tun — der Test friert Zählung,
// IDs, Typen und Timer-Werte ein.
import { describe, it, expect } from 'vitest'
import content from './growthContent.json'

const EXPECTED_COUNTS = {
  'mein-tag': 40, 'mein-kopf': 50, 'dranbleiben': 45,
  'innere-ruhe': 45, 'geld': 35, 'menschen': 35,
}
const PREFIX_BY_KATEGORIE = {
  'mein-tag': 'MT', 'mein-kopf': 'MK', 'dranbleiben': 'DB',
  'innere-ruhe': 'IR', 'geld': 'GE', 'menschen': 'ME',
}
const EXPECTED_TIMER = {
  MT28: 5, MK06: 5, MK24: 10, MK44: 2, DB17: 10, DB33: 10, IR11: 2, IR30: 2, IR42: 10,
}

describe('growthContent — Struktur', () => {
  it('hat 6 Kategorien mit korrekten Defaults', () => {
    expect(content.kategorien).toHaveLength(6)
    const on = content.kategorien.filter(k => k.default).map(k => k.id).sort()
    expect(on).toEqual(['mein-kopf', 'mein-tag'])
  })
  it('hat 4 Opener', () => {
    expect(content.opener.map(o => o.id)).toEqual(['atmen', 'sinne', 'loslassen', 'atemzuege'])
  })
  it('hat exakt 250 Karten, korrekt pro Kategorie verteilt', () => {
    expect(content.karten).toHaveLength(250)
    Object.entries(EXPECTED_COUNTS).forEach(([kat, n]) =>
      expect(content.karten.filter(k => k.kategorie === kat)).toHaveLength(n))
  })
  it('IDs sind eindeutig und passen zum Kategorie-Präfix', () => {
    const ids = content.karten.map(k => k.id)
    expect(new Set(ids).size).toBe(250)
    content.karten.forEach(k =>
      expect(k.id.startsWith(PREFIX_BY_KATEGORIE[k.kategorie])).toBe(true))
  })
  it('Typen sind gültig; genau die 9 Timer-Karten tragen die richtigen Minuten', () => {
    content.karten.forEach(k =>
      expect(['frage', 'aufgabe', 'timer-aufgabe']).toContain(k.typ))
    const timerKarten = content.karten.filter(k => k.typ === 'timer-aufgabe')
    expect(Object.fromEntries(timerKarten.map(k => [k.id, k.timer]))).toEqual(EXPECTED_TIMER)
    content.karten.filter(k => k.typ !== 'timer-aufgabe').forEach(k =>
      expect(k.timer).toBeUndefined())
  })
  it('Stichprobe: Texte exakt wie in der Spezifikation', () => {
    const byId = Object.fromEntries(content.karten.map(k => [k.id, k]))
    expect(byId.MT01.text).toBe('Was war heute dein Win — egal wie klein?')
    expect(byId.MK44.text).toBe('2 Minuten: Räume nur die Fläche direkt vor dir frei. Nicht mehr.')
    expect(byId.MK44.warum).toBeUndefined()
    expect(byId.ME35.text).toBe('Schreibe 3 Dinge, die du an deiner liebsten Person liebst — und teile heute eines davon mit ihr.')
  })
})
