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
  generateCalCreds,
} from '../src/sync/crypto.js'
import { execSync } from 'node:child_process'

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

// ─── 9. Geteilte Kalender (Teilen Stufe A, teilen-spec.md §5) ───
console.log('\n■ Geteilte Kalender (/cal)')
const registerNew = async () => {
  const c = generateCreds()
  await req('/register', { method: 'POST', secret: SETUP_SECRET, body: JSON.stringify({ tokenHash: await sha256Hex(c.token) }) })
  return c
}
// Ersteller ist creds (user1); frische Nutzer als Beitretende.
const [J1, J2, J3, J4, J5, J6] = await Promise.all([
  registerNew(), registerNew(), registerNew(), registerNew(), registerNew(), registerNew(),
])
const cal = generateCalCreds()
const calCreate = (token, joinSecretHash) =>
  req('/cal', { method: 'POST', token, body: JSON.stringify({ calId: cal.calId, joinSecretHash }) })
const calJoin = (token, joinSecret) =>
  req('/cal/join', { method: 'POST', token, body: JSON.stringify({ calId: cal.calId, joinSecret }) })
// Frische Einladung setzen (Re-Invite) + beitreten — jeder Beitritt verbraucht das Secret.
const inviteAndJoin = async (joinerToken) => {
  const secret = generateCalCreds().joinSecret
  await calCreate(creds.token, await sha256Hex(secret))
  return calJoin(joinerToken, secret)
}

{
  const r = await calCreate(creds.token, await sha256Hex(cal.joinSecret))
  ok(r.status === 201, 'POST /cal (anlegen) → 201', `(war ${r.status})`)
}
{
  const r = await calJoin(J1.token, cal.joinSecret)
  ok(r.status === 200, 'POST /cal/join (gültiges Secret) → 200', `(war ${r.status})`)
}
{
  // Dasselbe Secret ein zweites Mal (nach dem Beitritt verbraucht) → 409
  const r = await calJoin(J2.token, cal.joinSecret)
  ok(r.status === 409, 'joinSecret zweimal → 409', `(war ${r.status})`)
}
{
  // Falscher Ersteller darf kein Re-Invite setzen
  const r = await calCreate(J1.token, await sha256Hex('egal'))
  ok(r.status === 403, 'Re-Invite durch Nicht-Ersteller → 403', `(war ${r.status})`)
}

// KV im Kalender-Namespace: Mitglied schreibt, anderes Mitglied liest
const kCal = await hmacKeyId(cal.calKey, 'todos')
const calEnv = await encryptPayload(cal.calKey, { value: [{ id: 'shared1', text: 'Zahnarzt', cal: cal.calId }], sub: {}, del: {}, changedAt: 111 })
{
  const r = await req(`/kv/${kCal}?ns=c:${cal.calId}`, { method: 'PUT', token: J1.token, body: JSON.stringify(calEnv), headers: { 'If-Match': '0' } })
  ok(r.status === 200, 'Mitglied schreibt in c:<calId> → 200', `(war ${r.status})`)
}
{
  const r = await req(`/kv?ns=c:${cal.calId}&since=0`, { token: creds.token })
  const { rows } = await r.json()
  const back = rows?.length ? await decryptPayload(cal.calKey, JSON.parse(rows[0].ciphertext)) : null
  ok(r.status === 200 && back?.value?.[0]?.id === 'shared1', 'anderes Mitglied liest denselben Slice', `(war ${r.status})`)
}
{
  // Der persönliche Store des Erstellers sieht die Kalender-Rows NICHT (getrennte ns)
  const r = await req('/kv?since=0', { token: J1.token })
  const { rows } = await r.json()
  ok(!rows.some(x => x.keyId === kCal), 'Kalender-Slice taucht nicht im persönlichen u:-Namespace auf')
}

// Isolation: J6 ist kein Mitglied → weder lesen noch schreiben
{
  const r = await req(`/kv/${kCal}?ns=c:${cal.calId}`, { method: 'PUT', token: J6.token, body: JSON.stringify(calEnv), headers: { 'If-Match': '0' } })
  ok(r.status === 403, 'Nicht-Mitglied schreibt c:<calId> → 403', `(war ${r.status})`)
}
{
  const r = await req(`/kv?ns=c:${cal.calId}&since=0`, { token: J6.token })
  ok(r.status === 403, 'Nicht-Mitglied liest c:<calId> → 403', `(war ${r.status})`)
}
{
  const r = await req('/kv?ns=x:kaputt&since=0', { token: creds.token })
  ok(r.status === 400, 'ns ungültig → 400', `(war ${r.status})`)
}

// Mitglieder-Cap: creator + J1 (=2) → J2..J5 auffüllen (=6), J6 wird abgewiesen
{
  const rs = []
  for (const j of [J2, J3, J4, J5]) rs.push((await inviteAndJoin(j.token)).status)
  ok(rs.every(s => s === 200), `J2–J5 treten bei → 6 Mitglieder (${rs.join(',')})`)
  const r = await inviteAndJoin(J6.token)
  ok(r.status === 403, '7. Mitglied (Cap 6) → 403', `(war ${r.status})`)
}

// Verlassen: eigene Mitgliedschaft entfernen → danach 403 im Namespace
{
  const r = await req(`/cal/${cal.calId}/me`, { method: 'DELETE', token: J1.token })
  ok(r.status === 200, 'DELETE /cal/:calId/me → 200', `(war ${r.status})`)
  const r2 = await req(`/kv?ns=c:${cal.calId}&since=0`, { token: J1.token })
  ok(r2.status === 403, 'nach Verlassen kein Zugriff mehr → 403', `(war ${r2.status})`)
}

// TTL: abgelaufene Einladung → 410 (Ablauf lokal in der D1 erzwingen)
{
  const ttl = generateCalCreds()
  await req('/cal', { method: 'POST', token: creds.token, body: JSON.stringify({ calId: ttl.calId, joinSecretHash: await sha256Hex(ttl.joinSecret) }) })
  let forced = false
  try {
    execSync(`npx wrangler d1 execute adhs-sync --local --command "UPDATE cals SET join_expires = 0 WHERE cal_id = '${ttl.calId}'"`, { stdio: 'pipe' })
    forced = true
  } catch (e) {
    console.log(`  ⚠ TTL-Check übersprungen — lokale D1 nicht direkt erreichbar (${String(e.message).split('\n')[0]})`)
  }
  if (forced) {
    const r = await req('/cal/join', { method: 'POST', token: J6.token, body: JSON.stringify({ calId: ttl.calId, joinSecret: ttl.joinSecret }) })
    ok(r.status === 410, 'abgelaufene Einladung → 410', `(war ${r.status})`)
  }
}

// ─── Buddy: /buddy-Route (Auth, Kill-Switch, Validierung) ───
// Ohne BUDDY_ENABLED=1 in .dev.vars prüft der Block den Auslieferzustand
// (503 hinter Auth); mit BUDDY_ENABLED=1 + Dummy-Key zusätzlich Validierung
// (400) und den Upstream-Pfad (502 bei Dummy-Key bzw. 200 bei echtem Key).
console.log('\n■ Buddy /buddy')
const buddyBody = (over = {}) => JSON.stringify({
  kind: 'frage', message: 'Feuerprobe?', context: { screen: 'test' },
  profile: { userName: 'F', buddyName: 'Probe', ton: 'herzlich' }, history: [],
  ...over,
})
{
  const r = await req('/buddy', { method: 'POST', body: buddyBody() })
  ok(r.status === 401, 'POST /buddy ohne Token → 401 (Auth vor Kill-Switch)', `(war ${r.status})`)
}
{
  const r = await req('/buddy', { method: 'POST', token: creds.token, body: buddyBody() })
  if (r.status === 503) {
    ok(true, 'Buddy deaktiviert (Default) → 503 — scharfe Checks übersprungen (BUDDY_ENABLED=1 + Key in .dev.vars zum Testen)')
  } else {
    ok([200, 502].includes(r.status), 'Buddy aktiv: gültiger Request → 200 (echter Key) bzw. 502 (Dummy-Key)', `(war ${r.status})`)
    const bad = await req('/buddy', { method: 'POST', token: creds.token, body: buddyBody({ kind: 'hack' }) })
    ok(bad.status === 400, 'Buddy aktiv: unbekanntes kind → 400', `(war ${bad.status})`)
    const kaputt = await req('/buddy', { method: 'POST', token: creds.token, body: '{{{' })
    ok(kaputt.status === 400, 'Buddy aktiv: kaputtes JSON → 400', `(war ${kaputt.status})`)
  }
}

// ─── Ergebnis ───
console.log(`\n${'─'.repeat(50)}\n${failed === 0 ? '✅' : '❌'} ${passed} bestanden, ${failed} fehlgeschlagen`)
process.exit(failed === 0 ? 0 : 1)
