import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createBlock } from './features/todos/Block'

// Anti-Drift: dayRank ist ein Sortier-Rang des Listenmodus — nie ein Zeitpunkt.
// Er darf sich nicht in Kalender, Zeitplan, Pool, Chip oder Tools ausbreiten;
// sonst fängt jemand an, ihn als Uhrzeit zu lesen.
const SRC = dirname(fileURLToPath(import.meta.url))

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const ALLOWED = [
  'features/todos/Block.js',
  'features/calendar/tagesListeLogic.js',
  'features/calendar/TabHeute/TabHeute.jsx',
  'features/calendar/TabHeute/useTagesplanerDrag.js',
  'features/calendar/TabHeute/useSlotMutations.js',
  'features/calendar/TabHeute/useTimeEvents.js',
  'components/TodoModal/TodoModal.jsx',
  'features/cal/calStamp.js',   // CAL_PERSONAL_FIELDS: dayRank wird beim Teilen bewusst NICHT gestempelt (§3.3)
  'features/buddy/BuddySheet.jsx', // schedule-Action platziert wie SlotSheet-Place: setzt Zeit → dayRank zurück auf null
  'sync/merge.js',              // mergeCalSlice: dayRank bleibt lokal, aus der Inhalts-Signatur gestrippt (§3.3)
  'sync/syncEngine.js',         // dayRank wird aus dem Kalender-Slice gestrippt — persönlich, reist nie mit (§3.3)
]

const files = walk(SRC).filter(f => /\.jsx?$/.test(f) && !/\.test\.jsx?$/.test(f))

describe('dayRank — Anti-Drift', () => {
  it('createBlock() legt dayRank als null an', () => {
    expect(createBlock().dayRank).toBe(null)
  })

  it('dayRank taucht nur in der Allowlist auf', () => {
    const hits = []
    for (const file of files) {
      const rel = file.slice(SRC.length + 1).replace(/\\/g, '/')
      if (ALLOWED.includes(rel)) continue
      if (/\bdayRank\b/.test(readFileSync(file, 'utf8'))) hits.push(rel)
    }
    expect(hits, `dayRank gehört nicht in:\n${hits.join('\n')}`).toEqual([])
  })
})
