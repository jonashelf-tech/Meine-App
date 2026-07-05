import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY } from './toolRegistry.jsx'

describe('Tool-Registry — Hilfe-Sheet-Liste', () => {
  it('jedes Tool hat eine description (>= 10 Zeichen)', () => {
    for (const t of TOOL_REGISTRY) {
      expect(typeof t.description, `${t.id}.description fehlt`).toBe('string')
      expect(t.description.trim().length, `${t.id}.description zu kurz`).toBeGreaterThanOrEqual(10)
    }
  })

  it('jede id ist eindeutig', () => {
    const ids = TOOL_REGISTRY.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
