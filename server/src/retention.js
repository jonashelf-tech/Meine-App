// Retention-Regel (sync-architektur.md §8, Etappe 2):
// 10 neueste + 1 pro Tag für 30 Tage + 1 pro Woche für 1 Jahr.
// rows: [{ id, created_at }] — neueste zuerst (wie die SQL-Query liefert).
// Getestet von src/sync/serverRetention.test.js (App-Vitest, eine Test-Infra für alles).
const DAY = 24 * 60 * 60 * 1000

export const keepBackupIds = (rows, now = Date.now()) => {
  const keep = new Set()
  rows.slice(0, 10).forEach(r => keep.add(r.id))
  const dayBuckets = new Set()
  const weekBuckets = new Set()
  for (const r of rows) {
    const age = now - r.created_at
    if (age <= 30 * DAY) {
      const bucket = Math.floor(r.created_at / DAY)
      if (!dayBuckets.has(bucket)) { dayBuckets.add(bucket); keep.add(r.id) }
    } else if (age <= 365 * DAY) {
      const bucket = Math.floor(r.created_at / (7 * DAY))
      if (!weekBuckets.has(bucket)) { weekBuckets.add(bucket); keep.add(r.id) }
    }
  }
  return keep
}
