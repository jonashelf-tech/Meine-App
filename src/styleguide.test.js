import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Anti-Drift-Guard für die Font-Regeln aus kontext/architektur.md:
// - Font-Namen werden NUR in styles/vars.css definiert (--font / --font-num)
// - alle anderen Stylesheets nutzen var(--font) / var(--font-num) oder Orbitron (Zahlen)
// - verbotene Fonts tauchen nirgends auf
// Hintergrund: 31 tote `Outfit`-Referenzen fielen jahrelang still auf den
// System-Font zurück (2026-06-10 gefixt). Dieser Test macht so etwas unmöglich.
// Canvas-Code (ctx.font) ist ausgenommen — dort gehen keine CSS-Variablen.

const SRC = dirname(fileURLToPath(import.meta.url))

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const allFiles = walk(SRC)
const cssFiles = allFiles.filter(f => f.endsWith('.css') && !f.endsWith('vars.css'))

describe('Styleguide — Font-Drift', () => {
  it('kein Stylesheet außer vars.css definiert eigene Font-Namen', () => {
    const violations = []
    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf8')
      for (const m of css.matchAll(/font-family:\s*([^;}]+)/g)) {
        const value = m[1].trim()
        const ok = /^var\(--font(-num)?[,)]/.test(value)
          || /^['"]?Orbitron\b/.test(value)
          || value === 'inherit'
        if (!ok) violations.push(`${file.slice(SRC.length + 1)} → "${value}"`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('verbotene Fonts kommen in src/ nicht vor (Outfit, Inter, Space Grotesk)', () => {
    const banned = /\b(Outfit|Space Grotesk)\b|['"]Inter['"]/
    const hits = []
    const checkable = allFiles.filter(f =>
      /\.(css|jsx?|html)$/.test(f) && !f.endsWith('styleguide.test.js')
    )
    for (const file of checkable) {
      const text = readFileSync(file, 'utf8')
      if (banned.test(text)) hits.push(file.slice(SRC.length + 1))
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})
