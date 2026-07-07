// Anti-Drift-Guard: Jeder Header, den der Sync-Client schickt, muss in der
// CORS-Allowlist des Workers stehen — sonst blockt der Browser den Request
// cross-origin (App auf vercel.app, Worker auf workers.dev), und zwar erst
// im Echt-Einsatz, nie im Unit-Test. (Fund der Feuerprobe 2026-07-07:
// If-Match fehlte → jeder /kv-Push wäre am Preflight gescheitert.)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

const serverSrc = read('../../server/src/index.js')
const clientSrcs = [read('./cloudBackup.js'), read('./syncEngine.js')]

const allowedHeaders = () => {
  const m = serverSrc.match(/'Access-Control-Allow-Headers':\s*'([^']+)'/)
  expect(m, 'Access-Control-Allow-Headers im Worker gefunden').toBeTruthy()
  return m[1].split(',').map(h => h.trim().toLowerCase())
}

// Header, die der Client heute setzt (Objekt-Literale in request()-Helfern).
const BASELINE = ['authorization', 'content-type', 'x-setup-secret', 'if-match']

describe('Server-CORS deckt alle Client-Header ab', () => {
  it('Baseline-Header sind alle erlaubt', () => {
    const allowed = allowedHeaders()
    for (const h of BASELINE) expect(allowed, `Header "${h}" fehlt in Access-Control-Allow-Headers`).toContain(h)
  })

  it('dynamisch gesetzte Header (headers[...] = …) sind alle erlaubt', () => {
    const allowed = allowedHeaders()
    for (const src of clientSrcs) {
      for (const m of src.matchAll(/headers\[['"]([A-Za-z][A-Za-z0-9-]*)['"]\]/g)) {
        expect(allowed, `Client setzt "${m[1]}" — fehlt in Access-Control-Allow-Headers des Workers`)
          .toContain(m[1].toLowerCase())
      }
    }
  })
})
