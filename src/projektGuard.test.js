import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Anti-Drift: das Todo-Feld heißt projectId (UUID), nicht mehr category/catName.
// Nur projektMigration.js darf das Alt-Feld lesen (Boot-Migration). Falsch-Positive
// bewusst ausgeschlossen: kategorie (deutsch), categoryTag (CSS-Klasse), cats/BACKUP_CATS.
const SRC = dirname(fileURLToPath(import.meta.url))
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const files = walk(SRC).filter(f =>
  /\.jsx?$/.test(f) && !/\.test\.jsx?$/.test(f) && !f.endsWith('projektMigration.js')
)
const BANNED = [/\.category\b/, /\bcategory:/, /\bcatName\b/]

describe('Projekte — Anti-Drift', () => {
  it('kein Modul nutzt das tote Todo-Feld category/catName', () => {
    const hits = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const re of BANNED) {
        if (re.test(text)) hits.push(`${file.slice(SRC.length + 1)} → ${re}`)
      }
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})
