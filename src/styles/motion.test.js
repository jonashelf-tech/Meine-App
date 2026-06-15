import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const vars = readFileSync(join(here, 'vars.css'), 'utf8')

describe('Motion-Tokens', () => {
  for (const t of ['--dur-fast', '--dur', '--dur-slow', '--ease-out', '--ease-in', '--ease', '--edge-hi', '--elev-1', '--elev-drag']) {
    it(`definiert ${t}`, () => {
      expect(vars).toMatch(new RegExp(`${t}\\s*:`))
    })
  }
  it('hat den toolEnter-Keyframe', () => {
    expect(vars).toMatch(/@keyframes\s+toolEnter/)
  })
})
