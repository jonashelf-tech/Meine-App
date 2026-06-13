import { describe, it, expect, beforeEach } from 'vitest'
import { sv, SK } from '../../../storage'
import content from './growthContent.json'
import {
  loadGrowth, emptyDay, migrateWachstumJournal,
  collectLockedIds, ensureDayCard, skipKarte, drawBonusKarte,
  setAntwort, setFreitext, markStateTouched,
  dayHasEntry, getDoneDates, isTageskarteOffen, isEditable, nextDate,
  buildKiPrompt, karteById, MAX_KARTEN_PRO_TAG,
} from './growthStore'

beforeEach(() => localStorage.clear())

// Hilfen: deterministische RNG + Settings mit allen Kategorien
const rng0 = () => 0
const allCats = { aktiveKategorien: content.kategorien.map(k => k.id), openerAn: true, kiExportAn: false, briefingGesehen: true }
const base = () => ({ ...loadGrowth(), settings: { ...loadGrowth().settings, ...allCats } })

describe('Migration — altes Wachstum-Journal → Freitext', () => {
  it('übernimmt Journal-Texte in leere Tage, überschreibt nichts', () => {
    const data = {
      days: { '2026-06-01': { ...emptyDay(), freitext: 'schon da' } },
      queuedCard: null, openerShownFor: null,
      settings: allCats, wachstumJournalMigriert: false,
    }
    const legacy = { habits: [], checks: {}, journal: { '2026-06-01': 'alt1', '2026-06-02': 'alt2' } }
    const out = migrateWachstumJournal(data, legacy)
    expect(out.days['2026-06-01'].freitext).toBe('schon da')
    expect(out.days['2026-06-02'].freitext).toBe('alt2')
    expect(out.wachstumJournalMigriert).toBe(true)
  })
  it('loadGrowth migriert lazy genau einmal', () => {
    sv(SK.wachstum, { habits: [], checks: {}, journal: { '2026-05-30': 'hallo' } })
    expect(loadGrowth().days['2026-05-30'].freitext).toBe('hallo')
    // Marker gesetzt → Ändern des Legacy-Keys hat keine Wirkung mehr
    sv(SK.wachstum, { habits: [], checks: {}, journal: { '2026-05-31': 'neu' } })
    expect(loadGrowth().days['2026-05-31']).toBeUndefined()
  })
})

describe('Ziehlogik', () => {
  it('ensureDayCard zieht deterministisch: zweiter Aufruf ändert nichts', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const id1 = data.days['2026-06-12'].tageskarteId
    expect(id1).toBeTruthy()
    const again = ensureDayCard(data, '2026-06-12', () => 0.99)
    expect(again).toBe(data) // No-op: identische Referenz
  })
  it('60-Tage-Sperre: gezogene Karte ist im Fenster nicht erneut ziehbar', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const id = data.days['2026-06-12'].tageskarteId
    const locked = collectLockedIds(data.days, '2026-06-13', 60)
    expect(locked.has(id)).toBe(true)
    expect(collectLockedIds(data.days, '2026-09-20', 60).has(id)).toBe(false)
  })
  it('Sperre wirkt auch rückwärts (Nachtrag dupliziert nicht heute)', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const id = data.days['2026-06-12'].tageskarteId
    expect(collectLockedIds(data.days, '2026-06-10', 60).has(id)).toBe(true)
  })
  it('erschöpfter Pool: Sperrfrist halbiert sich statt Fehler', () => {
    // Nur Kategorie "geld" (35 Karten) aktiv; 35 Tage lang je 1 Karte ziehen
    let data = { ...base(), settings: { ...allCats, aktiveKategorien: ['geld'] } }
    for (let i = 0; i < 35; i++) {
      const d = new Date('2026-01-01T12:00:00'); d.setDate(d.getDate() + i)
      data = ensureDayCard(data, d.toISOString().slice(0, 10), rng0)
    }
    const drawn = new Set(Object.values(data.days).map(x => x.tageskarteId))
    expect(drawn.size).toBe(35) // keine Wiederholung solange Pool reicht
    // Tag 36: Pool leer bei 60 Tagen Sperre → Halbierung greift, es WIRD gezogen
    data = ensureDayCard(data, '2026-02-05', rng0)
    expect(data.days['2026-02-05'].tageskarteId).toBeTruthy()
  })
  it('Kategorien sind gleichgewichtet: erst Kategorie, dann Karte', () => {
    // rng liefert erst 0.99 (letzte Kategorie), dann 0 (erste Karte daraus)
    const seq = [0.99, 0]; let i = 0
    const rngSeq = () => seq[Math.min(i++, seq.length - 1)]
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rngSeq)
    const karte = karteById(data.days['2026-06-12'].tageskarteId)
    expect(karte.kategorie).toBe('menschen') // letzte der 6 Kategorien
  })
})

describe('Skip', () => {
  it('zieht sofort Ersatz, merkt Karte für morgen vor, nur 1×/Tag', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const skipped = data.days['2026-06-12'].tageskarteId
    data = skipKarte(data, '2026-06-12', rng0)
    const day = data.days['2026-06-12']
    expect(day.skipVerwendet).toBe(true)
    expect(day.tageskarteId).not.toBe(skipped)
    expect(day.karten.some(k => k.kartenId === skipped)).toBe(false)
    expect(data.queuedCard).toEqual({ date: '2026-06-13', kartenId: skipped })
    // zweiter Skip wirkungslos
    expect(skipKarte(data, '2026-06-12', rng0)).toBe(data)
  })
  it('vorgemerkte Karte überschreibt die Zufallsziehung des Folgetags', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    const skipped = data.days['2026-06-12'].tageskarteId
    data = skipKarte(data, '2026-06-12', rng0)
    data = ensureDayCard(data, '2026-06-13', () => 0.5)
    expect(data.days['2026-06-13'].tageskarteId).toBe(skipped)
    expect(data.queuedCard).toBeNull()
  })
})

describe('Bonuskarten', () => {
  it('max 3 Karten/Tag gesamt', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    data = drawBonusKarte(data, '2026-06-12', rng0)
    data = drawBonusKarte(data, '2026-06-12', rng0)
    expect(data.days['2026-06-12'].karten).toHaveLength(MAX_KARTEN_PRO_TAG)
    const ids = data.days['2026-06-12'].karten.map(k => k.kartenId)
    expect(new Set(ids).size).toBe(3)
    expect(drawBonusKarte(data, '2026-06-12', rng0)).toBe(data)
  })
})

describe('Erfolgs-Schwelle (Dot) + Offen-Logik', () => {
  it('leerer Tag: kein Eintrag, Karte offen', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    expect(dayHasEntry(data.days['2026-06-12'])).toBe(false)
    expect(isTageskarteOffen(data, '2026-06-12')).toBe(true)
  })
  it('1 Zeichen Freitext reicht', () => {
    let data = setFreitext(base(), '2026-06-12', 'x')
    expect(dayHasEntry(data.days['2026-06-12'])).toBe(true)
  })
  it('State-Check im Tool reicht', () => {
    let data = markStateTouched(base(), '2026-06-12')
    expect(dayHasEntry(data.days['2026-06-12'])).toBe(true)
  })
  it('beantwortete Tageskarte schließt die Offen-Anzeige', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    data = setAntwort(data, '2026-06-12', data.days['2026-06-12'].tageskarteId, { antwort: 'ok' })
    expect(isTageskarteOffen(data, '2026-06-12')).toBe(false)
    expect(getDoneDates(data)).toEqual(['2026-06-12'])
  })
  it('beantwortete BONUS-Karte lässt Karte 1 offen', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-12', rng0)
    data = drawBonusKarte(data, '2026-06-12', rng0)
    const bonusId = data.days['2026-06-12'].karten[1].kartenId
    data = setAntwort(data, '2026-06-12', bonusId, { erledigt: true })
    expect(isTageskarteOffen(data, '2026-06-12')).toBe(true)
  })
})

describe('Nachtrag-Fenster', () => {
  it('heute und bis 3 Tage zurück editierbar, älter nicht, Zukunft nicht', () => {
    expect(isEditable('2026-06-12', '2026-06-12')).toBe(true)
    expect(isEditable('2026-06-09', '2026-06-12')).toBe(true)
    expect(isEditable('2026-06-08', '2026-06-12')).toBe(false)
    expect(isEditable('2026-06-13', '2026-06-12')).toBe(false)
  })
  it('nextDate über Monatsgrenze', () => {
    expect(nextDate('2026-06-30')).toBe('2026-07-01')
  })
})

describe('KI-Export', () => {
  it('baut Prompt nach Template, nur Tage mit Inhalt', () => {
    let data = base()
    data = ensureDayCard(data, '2026-06-11', rng0)
    data = setAntwort(data, '2026-06-11', data.days['2026-06-11'].tageskarteId, { antwort: 'meine Antwort' })
    data = setFreitext(data, '2026-06-11', 'freier Text')
    const states = { '2026-06-11': { sleep: 4, energy: 2, mood: 3 } }
    const prompt = buildKiPrompt(data, states, 7, '2026-06-12')
    expect(prompt).toContain('der letzten 7 Tage')
    expect(prompt).toContain('--- EINTRÄGE ---')
    expect(prompt).toContain('2026-06-11')
    expect(prompt).toContain('Schlaf: 4/5')
    expect(prompt).toContain('meine Antwort')
    expect(prompt).toContain('freier Text')
    expect(prompt).not.toContain('2026-06-10') // leerer Tag taucht nicht auf
  })
})
