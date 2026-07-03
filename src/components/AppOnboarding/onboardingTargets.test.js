import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STEPS } from './onboardingSteps.jsx'

// Anti-Drift: jedes in onboardingSteps referenzierte `target` muss als
// data-onboarding="…" irgendwo in src/ im Markup existieren. Vorbild: styleguide.test.js.
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const markup = walk(SRC)
  .filter(f => /\.jsx?$/.test(f))
  .map(f => readFileSync(f, 'utf8'))
  .join('\n')

describe('Onboarding-Targets — Anti-Drift', () => {
  const targets = [...new Set(STEPS.map(s => s.target).filter(Boolean))]
  it.each(targets)('data-onboarding="%s" existiert im Markup', (target) => {
    expect(markup.includes(`data-onboarding="${target}"`)).toBe(true)
  })
})
