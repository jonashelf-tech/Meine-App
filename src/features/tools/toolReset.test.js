// Anti-Drift-Guard: Tool-Reset löscht Nutzdaten — jeder Reset-Key muss ein
// registrierter SK-Key sein. String-Literale würden bei einem SK-Rename still
// ins Leere löschen (bzw. den echten Key stehen lassen).
import { describe, it, expect } from 'vitest'
import { SK } from '../../storage'
import { TOOL_RESETS } from './toolReset'

describe('TOOL_RESETS — Registry-Disziplin', () => {
  const skValues = new Set(Object.values(SK))

  it('jeder Reset-Key ist ein registrierter SK-Key', () => {
    for (const [toolId, entry] of Object.entries(TOOL_RESETS)) {
      for (const key of entry.keys ?? []) {
        expect(skValues.has(key), `${toolId}: "${key}" ist kein SK-Key`).toBe(true)
      }
    }
  })

  it('kein Tool löscht Cloud-/Sync-Zugang oder Kalender-Kern', () => {
    const tabu = new Set([SK.cloudCreds, SK.syncMeta, SK.todos, SK.days, SK.blockers])
    for (const [toolId, entry] of Object.entries(TOOL_RESETS)) {
      for (const key of entry.keys ?? []) {
        expect(tabu.has(key), `${toolId} würde "${key}" löschen`).toBe(false)
      }
    }
  })
})
