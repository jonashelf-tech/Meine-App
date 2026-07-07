// ─── Feuerprobe: echte Client-Krypto gegen echten lokalen Worker ───
// Importiert src/sync/crypto.js (die App-Implementierung, keine Kopie) und
// spielt die komplette Cloud-Kette durch: Registrierung, Backup, Restore,
// Recovery-Code, /kv-Sync mit If-Match/409, Isolation, Retention, CORS.
//
// Lauf (siehe README „Lokale Feuerprobe"):
//   1. .dev.vars mit SETUP_SECRET=feuerprobe-lokal-2026 anlegen (gitignored)
//   2. npx wrangler d1 execute adhs-sync --local --file schema.sql
//   3. npx wrangler dev --local --port 8787   (laufen lassen)
//   4. node feuerprobe.mjs
// Frische DB pro Lauf: .wrangler/state löschen (Retention-Check zählt sonst Alt-Backups).
import {
  generateCreds, buildRecoveryCode, parseRecoveryCode,
  encryptPayload, decryptPayload, hmacKeyId, sha256Hex,
} from '../src/sync/crypto.js'

const BASE = 'http://127.0.0.1:8787'
const SETUP_SECRET = process.env.SETUP_SECRET ?? 'feuerprobe-lokal-2026'

let passed = 0, failed = 0
const ok = (cond, name, extra = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ FEHLER: ${name} ${extra}`) }
}

const req = (path, { method = 'GET', token, secret, body, headers = {} } = {}) => {
  const h = { 'content-type': 'application/json', ...headers }
  if (token) h['Authorization'] = `Bearer ${token}`
  if (secret) h['x-setup-secret'] = secret
  return fetch(`${BASE}${path}`, { method, headers: h, body })
}

// ─── 1. Health + Auth-Oberfläche ───
console.log('\n■ Health + Auth')
{
  const r = await req('/health')
  ok(r.status === 200 && (await r.json()).ok === true, 'GET /health → 200 ok')
}
{
  const r = await req('/backups')
  ok(r.status === 401, 'GET /backups ohne Token → 401', `(war ${r.status})`)
}
{
  const r = await req('/register', { method: 'POST', secret: 'falsch', body: JSON.stringify({ tokenHash: 'a'.repeat(64) }) })
  ok(r.status === 401, 'POST /register falsches Secret → 401', `(war ${r.status})`)
}
{
  const r = await req('/register', { method: 'POST', secret: SETUP_SECRET, body: JSON.stringify({ tokenHash: 'kein-hex' }) })
  ok(r.status === 400, 'POST /register kaputter tokenHash → 400', `(war ${r.status})`)
}

// ─── 2. Registrierung wie der echte Client (activateCloud-Pfad) ───
console.log('\n■ Registrierung (echte generateCreds + sha256Hex)')
const creds = generateCreds()
{
  const r = await req('/register', { method: 'POST', secret: SETUP_SECRET, body: JSON.stringify({ tokenHash: await sha256Hex(creds.token) }) })
  ok(r.status === 201, 'Registrierung → 201', `(war ${r.status})`)
}
{
  // Doppelt registrieren (Retry nach Netzabbruch) darf nicht knallen
  const r = await req('/register', { method: 'POST', secret: SETUP_SECRET, body: JSON.stringify({ tokenHash: await sha256Hex(creds.token) }) })
  ok(r.status === 201, 'Registrierung idempotent (Retry) → 201', `(war ${r.status})`)
}

// ─── 3. Recovery-Code-Zeremonie (Gerät B) ───
console.log('\n■ Recovery-Code')
{
  const code = await buildRecoveryCode(creds)
  const parsed = await parseRecoveryCode(code)
  ok(parsed.token === creds.token && parsed.key === creds.key, `Code-Roundtrip (${code.length} Zeichen) → identische Creds`)
  // Tippfehler-Erkennung
  const broken = code.replace(/A/, 'B').replace(/2/, '3')
  let threw = false
  try { await parseRecoveryCode(broken === code ? code.slice(0, -1) + (code.at(-1) === 'A' ? 'B' : 'A') : broken) } catch { threw = true }
  ok(threw, 'Tippfehler im Code → Prüfsummen-Fehler')
}

// ─── 4. Backup-Kette: verschlüsseln → Push → Liste → Restore → entschlüsseln ───
console.log('\n■ Backup-Kette (E2E verschlüsselt)')
const fakeExport = {
  adhs_todos_list: [{ id: 'a1b2', text: 'Feuerprobe ✓ — Umlaute äöü, Emoji 🎉', priority: 1 }],
  adhs_calendar_days: { '2026-07-07': { 8: { text: 'Test', duration: 30 } } },
  adhs_app_settings: { lastBackup: null },
  _savedAt: Date.now(),
}
{
  const env = await encryptPayload(creds.key, fakeExport)
  ok(env.v === 1 && env.alg === 'A256GCM' && env.zip === 'gzip', 'Envelope-Format {v:1, A256GCM, gzip}')
  const r = await req('/backup', { method: 'PUT', token: creds.token, body: JSON.stringify(env) })
  const j = await r.json()
  ok(r.status === 200 && j.ok === true, 'PUT /backup → 200 ok', `(war ${r.status}: ${JSON.stringify(j)})`)
}
{
  const r = await req('/backups', { token: creds.token })
  const { backups } = await r.json()
  ok(Array.isArray(backups) && backups.length === 1 && backups[0].bytes > 0, 'GET /backups → 1 Eintrag mit bytes')
}
{
  const r = await req('/backup/latest', { token: creds.token })
  const envBack = await r.json()
  const data = await decryptPayload(creds.key, envBack)
  ok(JSON.stringify(data) === JSON.stringify(fakeExport), 'Restore: Server-Envelope entschlüsselt === Original (inkl. Umlaute/Emoji)')
}
{
  // Falscher Schlüssel darf NICHT entschlüsseln (GCM-Integrität)
  const r = await req('/backup/latest', { token: creds.token })
  const envBack = await r.json()
  let threw = false
  try { await decryptPayload(generateCreds().key, envBack) } catch { threw = true }
  ok(threw, 'Restore mit falschem Schlüssel → wirft (GCM)')
}
{
  const r = await req('/backup', { method: 'PUT', token: creds.token, body: JSON.stringify({ v: 1 }) })
  ok(r.status === 400, 'PUT /backup ohne ct → 400', `(war ${r.status})`)
}
{
  const big = JSON.stringify({ v: 1, ct: 'x'.repeat(3_000_001) })
  const r = await req('/backup', { method: 'PUT', token: creds.token, body: big })
  ok(r.status === 413, 'PUT /backup > 3 MB → 413', `(war ${r.status})`)
}

// ─── 5. /kv-Sync: If-Match, 409, Versionen, Cursor (echte hmacKeyId) ───
console.log('\n■ /kv-Sync (Etappe 3)')
const kTodos = await hmacKeyId(creds.key, 'adhs_todos_list')
const kDays = await hmacKeyId(creds.key, 'adhs_calendar_days')
ok(/^[A-Za-z0-9_-]{8,64}$/.test(kTodos) && kTodos.length === 22, `hmacKeyId passt zur Server-Regex (${kTodos})`)

const kvPut = async (keyId, payload, ifMatch) => {
  const env = await encryptPayload(creds.key, payload)
  const r = await req(`/kv/${keyId}`, {
    method: 'PUT', token: creds.token, body: JSON.stringify(env), headers: { 'If-Match': String(ifMatch) },
  })
  return { status: r.status, json: await r.json() }
}
{
  const { status, json } = await kvPut(kTodos, { value: [{ id: 't1' }], changedAt: 111 }, 0)
  ok(status === 200 && json.version === 1, 'PUT neu (If-Match 0) → version 1', `(${status}: ${JSON.stringify(json)})`)
}
{
  const { status, json } = await kvPut(kTodos, { value: [{ id: 'FREMD' }], changedAt: 222 }, 0)
  ok(status === 409 && json.version === 1, 'PUT mit veraltetem If-Match → 409 + aktuelle Version')
}
{
  const { status, json } = await kvPut(kTodos, { value: [{ id: 't1' }, { id: 't2' }], changedAt: 333 }, 1)
  ok(status === 200 && json.version === 2, 'PUT mit korrektem If-Match → version 2')
}
{
  const r = await req('/kv?since=0', { token: creds.token })
  const { rows, cursor } = await r.json()
  ok(rows.length === 1 && cursor === 2, 'GET /kv?since=0 → 1 Row (nur letzter Stand pro Key), cursor 2')
  const remote = await decryptPayload(creds.key, JSON.parse(rows[0].ciphertext))
  ok(remote.value.length === 2 && remote.changedAt === 333, 'Row entschlüsselt → letzter Stand (2 Todos, changedAt 333)')
}
{
  await kvPut(kDays, { value: { '2026-07-07': {} }, changedAt: 444 }, 0)
  const r = await req('/kv?since=2', { token: creds.token })
  const { rows, cursor } = await r.json()
  ok(rows.length === 1 && rows[0].keyId === kDays && cursor === 3, 'Cursor-Pull: since=2 → nur der neue Key, cursor 3')
}
{
  const r = await req('/kv?since=3', { token: creds.token })
  const { rows, cursor } = await r.json()
  ok(rows.length === 0 && cursor === 3, 'since=cursor → leer, Cursor bleibt')
}
{
  // R4-Szenario: zwei gleichzeitige PUTs auf verschiedene frische Keys → Versionen müssen distinkt sein
  const kA = await hmacKeyId(creds.key, 'adhs_notes_v1')
  const kB = await hmacKeyId(creds.key, 'adhs_blockers')
  const [a, b] = await Promise.all([
    kvPut(kA, { value: [1], changedAt: 1 }, 0),
    kvPut(kB, { value: [2], changedAt: 2 }, 0),
  ])
  ok(a.status === 200 && b.status === 200 && a.json.version !== b.json.version,
    `Parallel-PUTs → distinkte Versionen (${a.json.version} ≠ ${b.json.version}) [R4]`)
}

// ─── 6. Nutzer-Isolation ───
console.log('\n■ Nutzer-Isolation (2. Konto)')
const creds2 = generateCreds()
{
  await req('/register', { method: 'POST', secret: SETUP_SECRET, body: JSON.stringify({ tokenHash: await sha256Hex(creds2.token) }) })
  const r = await req('/kv?since=0', { token: creds2.token })
  const { rows } = await r.json()
  ok(rows.length === 0, 'User 2 sieht keine /kv-Rows von User 1')
  const rb = await req('/backup/latest', { token: creds2.token })
  ok(rb.status === 404, 'User 2 hat kein Backup von User 1 (404)')
}

// ─── 7. Retention: 12 schnelle Pushes → 10 bleiben ───
console.log('\n■ Retention')
{
  for (let i = 0; i < 12; i++) {
    const env = await encryptPayload(creds.key, { ...fakeExport, i })
    await req('/backup', { method: 'PUT', token: creds.token, body: JSON.stringify(env) })
  }
  const r = await req('/backups', { token: creds.token })
  const { backups } = await r.json()
  ok(backups.length === 10, `13 Pushes am selben Tag → 10 behalten (waren ${backups.length})`)
}

// ─── 8. CORS ───
console.log('\n■ CORS')
{
  const r = await fetch(`${BASE}/health`, { headers: { Origin: 'https://meine-app-pi.vercel.app' } })
  ok(r.headers.get('access-control-allow-origin') === 'https://meine-app-pi.vercel.app', 'Erlaubter Origin → ACAO-Header')
}
{
  const r = await fetch(`${BASE}/health`, { headers: { Origin: 'https://boese-seite.example' } })
  ok(r.headers.get('access-control-allow-origin') === null, 'Fremder Origin → kein ACAO-Header')
}
{
  const r = await fetch(`${BASE}/kv/${kTodos}`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,if-match' },
  })
  const allowHeaders = (r.headers.get('access-control-allow-headers') ?? '').toLowerCase()
  ok(r.status === 204, 'Preflight → 204')
  ok(allowHeaders.includes('if-match'), `Preflight erlaubt If-Match-Header (allow-headers: "${allowHeaders}")`)
}

// ─── Ergebnis ───
console.log(`\n${'─'.repeat(50)}\n${failed === 0 ? '✅' : '❌'} ${passed} bestanden, ${failed} fehlgeschlagen`)
process.exit(failed === 0 ? 0 : 1)
