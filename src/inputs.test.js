import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Anti-Drift-Guard: Zahlenfelder müssen sich leeren lassen (kontext/architektur.md).
// Verbotenes Muster: ein onChange, das ein leeres Feld auf 0 zwingt
// (`Number(e.target.value) || 0`, `parseFloat(...) || 0`, `=== '' ? 0`).
// Folge: beim Löschen springt das Feld auf 0, man kann die Zahl nicht neu tippen.
// Richtig: value={x ?? ''} + onChange={e => e.target.value === '' ? null : Number(e.target.value)}.
// Hintergrund: trat über Fitness (Sätze/Wdh/Allokation) und Rezepte (Mengen) immer
// wieder auf. Dieser Test macht den Rückfall unmöglich.

const SRC = dirname(fileURLToPath(import.meta.url))

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const codeFiles = walk(SRC).filter(f => /\.jsx?$/.test(f) && !f.endsWith('inputs.test.js'))

describe('Eingabe-Drift — Zahlenfelder leerbar', () => {
  it('kein onChange zwingt ein geleertes Feld auf 0', () => {
    const banned = [
      /(?:Number|parseInt|parseFloat)\([^)]*\.value[^)]*\)\s*\|\|\s*0/, // Number(e.target.value) || 0
      /===\s*''\s*\?\s*0\b/,                                            // e.target.value === '' ? 0 : ...
    ]
    const violations = []
    for (const file of codeFiles) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (banned.some(re => re.test(line))) {
          violations.push(`${file.slice(SRC.length + 1)}:${i + 1} → ${line.trim()}`)
        }
      })
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
