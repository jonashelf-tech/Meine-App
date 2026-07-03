// Testet die Server-Retention-Logik (server/src/retention.js) mit der App-Test-Infra.
// Bewusst hier unter src/: eine Vitest-Konfiguration für alles, und die Logik ist
// datenverlust-nah genug, um einen echten Guard zu verdienen.
import { describe, it, expect } from 'vitest'
import { keepBackupIds } from '../../server/src/retention.js'

const DAY = 24 * 60 * 60 * 1000
const NOW = 1_800_000_000_000   // fixer Zeitpunkt — Buckets deterministisch

// Hilfsbauer: rows neueste-zuerst, wie die SQL-Query sie liefert
const rowsFromAges = (agesMs) =>
  agesMs
    .map((age, i) => ({ id: i + 1, created_at: NOW - age }))
    .sort((a, b) => b.created_at - a.created_at)

describe('keepBackupIds — Retention: 10 letzte + 1/Tag (30 T) + 1/Woche (1 J)', () => {
  it('behält alles, wenn es 10 oder weniger sind', () => {
    const rows = rowsFromAges([0, DAY, 2 * DAY, 400 * DAY])
    const keep = keepBackupIds(rows, NOW)
    expect(keep.size).toBe(4)
  })

  it('viele Pushes am selben Tag: nur die 10 neuesten überleben', () => {
    const rows = rowsFromAges(Array.from({ length: 25 }, (_, i) => i * 60_000)) // 25× im Minutentakt
    const keep = keepBackupIds(rows, NOW)
    expect(keep.size).toBe(10)
    // und zwar die neuesten 10
    rows.slice(0, 10).forEach(r => expect(keep.has(r.id)).toBe(true))
  })

  it('tägliche Backups: innerhalb 30 Tagen bleibt pro Tag eines', () => {
    // 60 Tage, je 1 Backup pro Tag
    const rows = rowsFromAges(Array.from({ length: 60 }, (_, i) => i * DAY + 1))
    const keep = keepBackupIds(rows, NOW)
    // alle aus den letzten 30 Tagen bleiben (Tages-Bucket) …
    rows.filter(r => NOW - r.created_at <= 30 * DAY)
      .forEach(r => expect(keep.has(r.id)).toBe(true))
    // … aus Tag 31–60 bleibt nur ~1 pro Woche → es wird deutlich ausgedünnt
    const older = rows.filter(r => NOW - r.created_at > 30 * DAY)
    const olderKept = older.filter(r => keep.has(r.id))
    expect(olderKept.length).toBeLessThan(older.length / 2)
    expect(olderKept.length).toBeGreaterThan(2)
  })

  it('älter als 1 Jahr fliegt raus (außer es gehört zu den 10 neuesten)', () => {
    const rows = rowsFromAges([0, DAY, 400 * DAY, 500 * DAY, ...Array.from({ length: 12 }, (_, i) => (2 + i) * DAY)])
    const keep = keepBackupIds(rows, NOW)
    const old400 = rows.find(r => NOW - r.created_at === 400 * DAY)
    const old500 = rows.find(r => NOW - r.created_at === 500 * DAY)
    expect(keep.has(old400.id)).toBe(false)
    expect(keep.has(old500.id)).toBe(false)
  })

  it('mehrere Backups in derselben alten Woche: nur das neueste der Woche bleibt', () => {
    // 10 frische Backups (füllen die "10 neueste"-Regel) + 3 an aufeinander-
    // folgenden Tagen ~40 Tage alt → dort dünnt der Wochen-Bucket aus
    const base = 40 * DAY
    const fresh = Array.from({ length: 10 }, (_, i) => i * 60_000)
    const rows = rowsFromAges([...fresh, base, base + DAY, base + 2 * DAY])
    const keep = keepBackupIds(rows, NOW)
    const oldOnes = rows.filter(r => NOW - r.created_at >= base)
    const keptOld = oldOnes.filter(r => keep.has(r.id))
    expect(keptOld.length).toBeGreaterThanOrEqual(1)
    expect(keptOld.length).toBeLessThan(3)
  })
})
