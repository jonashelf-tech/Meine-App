// Guard G3 (sync-architektur.md §9): Rohes localStorage NUR im Storage-Layer.
// Alles andere geht durch sv/lv/rmKey/storageKeys — sonst kann die Sync-Schicht
// (Etappe 3) Schreib-/Löschvorgänge nicht sehen. Vorbild: styleguide.test.js.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const rel = (f) => f.slice(SRC.length + 1).replaceAll('\\', '/')

const ALLOWED = new Set([
  'storage/index.js',   // der Layer selbst
  'test/setup.js',      // localStorage-Mock der Tests
])

describe('Storage-Layer-Disziplin (G3)', () => {
  it('kein rohes localStorage außerhalb von storage/ (und Tests)', () => {
    const hits = []
    for (const file of walk(SRC)) {
      if (!/\.(js|jsx)$/.test(file)) continue
      const r = rel(file)
      if (ALLOWED.has(r) || r.endsWith('.test.js')) continue
      const text = readFileSync(file, 'utf8')
      // explizite API-Namen: trifft echte Zugriffe, keine Satzenden in Kommentaren
      if (/\blocalStorage\s*\.\s*(getItem|setItem|removeItem|clear|key|length)\b/.test(text)) hits.push(r)
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})
