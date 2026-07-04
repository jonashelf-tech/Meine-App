// ─── ADHS-Sync-Worker (Cloudflare Workers + D1) ───────────
// Dummer, versionierter Blob-Store (sync-architektur.md §5): der Server sieht
// nur verschlüsselte Envelopes, Auth per Geheim-Token (gespeichert als Hash).
// Etappe 2: /register + /backup*. Die kv-Tabelle für Etappe 3 liegt schon im Schema.
import { keepBackupIds } from './retention.js'

const MAX_ENVELOPE_BYTES = 3_000_000   // weit über realer Backup-Größe, weit unter D1-Grenzen

const json = (data, status, cors) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  })

const sha256Hex = async (str) => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)))
  return [...digest].map(b => b.toString(16).padStart(2, '0')).join('')
}

const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin')
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!origin || !allowed.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,content-type,x-setup-secret',
    'Access-Control-Max-Age': '86400',
  }
}

const authUser = async (request, env) => {
  const auth = request.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const hash = await sha256Hex(auth.slice(7))
  return env.DB.prepare('SELECT id FROM users WHERE token_hash = ?').bind(hash).first()
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const path = new URL(request.url).pathname
    try {
      if (path === '/health') return json({ ok: true }, 200, cors)

      if (path === '/register' && request.method === 'POST') {
        if (!env.SETUP_SECRET || request.headers.get('x-setup-secret') !== env.SETUP_SECRET)
          return json({ error: 'Setup-Secret falsch' }, 401, cors)
        const { tokenHash } = await request.json()
        if (!/^[0-9a-f]{64}$/.test(tokenHash ?? ''))
          return json({ error: 'tokenHash fehlt oder ungültig' }, 400, cors)
        const { c } = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first()
        if (c >= 10) return json({ error: 'Nutzer-Limit erreicht' }, 403, cors)
        await env.DB.prepare('INSERT OR IGNORE INTO users (token_hash, created_at) VALUES (?, ?)')
          .bind(tokenHash, Date.now()).run()
        return json({ ok: true }, 201, cors)
      }

      // Ab hier: alles braucht Auth
      const user = await authUser(request, env)
      if (!user) return json({ error: 'Nicht autorisiert' }, 401, cors)

      if (path === '/backup' && request.method === 'PUT') {
        const envelope = await request.text()
        if (envelope.length > MAX_ENVELOPE_BYTES) return json({ error: 'Backup zu groß' }, 413, cors)
        let parsed
        try { parsed = JSON.parse(envelope) } catch { parsed = null }
        if (parsed?.v !== 1 || !parsed?.ct) return json({ error: 'Kein gültiges Envelope' }, 400, cors)

        await env.DB.prepare('INSERT INTO backups (user_id, created_at, bytes, envelope) VALUES (?, ?, ?, ?)')
          .bind(user.id, Date.now(), envelope.length, envelope).run()

        const { results } = await env.DB.prepare(
          'SELECT id, created_at FROM backups WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(user.id).all()
        const keep = keepBackupIds(results)
        const drop = results.filter(r => !keep.has(r.id)).map(r => r.id)
        if (drop.length)
          await env.DB.prepare(`DELETE FROM backups WHERE id IN (${drop.map(() => '?').join(',')})`)
            .bind(...drop).run()

        return json({ ok: true, kept: keep.size }, 200, cors)
      }

      // ─── /kv — Sync-Etappe 3: versionierter Blob-Store pro Key ───
      // Optimistische Nebenläufigkeit: PUT trägt If-Match (letzte bekannte
      // Version, 0 = neu). Bei Konflikt 409 + aktuelle Version → Client pullt,
      // merged, pusht erneut. Version ist monoton pro user_ns (MAX+1 reicht
      // für 2 Nutzer; Race käme höchstens als zusätzlicher 409-Umlauf raus).
      const kvPut = path.match(/^\/kv\/([A-Za-z0-9_-]{8,64})$/)
      if (kvPut && request.method === 'PUT') {
        const keyId = kvPut[1]
        const ns = `u:${user.id}`
        const ifMatch = Number(request.headers.get('If-Match') ?? '0')
        const envelope = await request.text()
        if (envelope.length > MAX_ENVELOPE_BYTES) return json({ error: 'Payload zu groß' }, 413, cors)
        let parsed
        try { parsed = JSON.parse(envelope) } catch { parsed = null }
        if (parsed?.v !== 1 || !parsed?.ct) return json({ error: 'Kein gültiges Envelope' }, 400, cors)

        const row = await env.DB.prepare('SELECT version FROM kv WHERE user_ns = ? AND key_id = ?')
          .bind(ns, keyId).first()
        const current = row?.version ?? 0
        if (current !== ifMatch) return json({ version: current }, 409, cors)

        const { next } = await env.DB.prepare(
          'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM kv WHERE user_ns = ?'
        ).bind(ns).first()
        await env.DB.prepare(`
          INSERT INTO kv (user_ns, key_id, version, ciphertext, client_changed_at, server_at)
          VALUES (?, ?, ?, ?, NULL, ?)
          ON CONFLICT (user_ns, key_id)
          DO UPDATE SET version = excluded.version, ciphertext = excluded.ciphertext, server_at = excluded.server_at
        `).bind(ns, keyId, next, envelope, Date.now()).run()
        return json({ version: next }, 200, cors)
      }

      if (path === '/kv' && request.method === 'GET') {
        const ns = `u:${user.id}`
        const since = Number(new URL(request.url).searchParams.get('since') ?? '0')
        const { results } = await env.DB.prepare(
          'SELECT key_id AS keyId, version, ciphertext FROM kv WHERE user_ns = ? AND version > ? ORDER BY version'
        ).bind(ns, since).all()
        const cursor = results.length ? results[results.length - 1].version : since
        return json({ rows: results, cursor }, 200, cors)
      }

      if (path === '/backups' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT id, created_at AS createdAt, bytes FROM backups WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
        ).bind(user.id).all()
        return json({ backups: results }, 200, cors)
      }

      const backupMatch = path.match(/^\/backup\/(latest|\d+)$/)
      if (backupMatch && request.method === 'GET') {
        const row = backupMatch[1] === 'latest'
          ? await env.DB.prepare('SELECT envelope FROM backups WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
              .bind(user.id).first()
          : await env.DB.prepare('SELECT envelope FROM backups WHERE user_id = ? AND id = ?')
              .bind(user.id, Number(backupMatch[1])).first()
        if (!row) return json({ error: 'Kein Backup vorhanden' }, 404, cors)
        return new Response(row.envelope, {
          status: 200,
          headers: { 'content-type': 'application/json', ...cors },
        })
      }

      return json({ error: 'Unbekannter Pfad' }, 404, cors)
    } catch (e) {
      return json({ error: String(e?.message ?? e) }, 500, cors)
    }
  },
}
