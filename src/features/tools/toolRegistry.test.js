import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from './toolRegistry.jsx'

const FEATURED = ['geburtstage', 'fitness', 'kognitiv', 'growth', 'rezepte', 'haushalt', 'projekte', 'garten']

describe('Tool-Registry — Onboarding-Vorstellung', () => {
  it('genau die vorgesehenen 8 Tools sind featured', () => {
    const featured = TOOL_REGISTRY.filter(t => t.featured).map(t => t.id).sort()
    expect(featured).toEqual([...FEATURED].sort())
  })

  it('jedes featured Tool hat einen Vorstellungstext (intro, >= 20 Zeichen)', () => {
    for (const t of TOOL_REGISTRY.filter(t => t.featured)) {
      expect(typeof t.intro, `${t.id}.intro fehlt`).toBe('string')
      expect(t.intro.trim().length, `${t.id}.intro zu kurz`).toBeGreaterThanOrEqual(20)
    }
  })
})
