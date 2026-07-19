// ─── ADHS-Sync-Worker (Cloudflare Workers + D1) ───────────
// Dummer, versionierter Blob-Store (sync-architektur.md §5): der Server sieht
// nur verschlüsselte Envelopes, Auth per Geheim-Token (gespeichert als Hash).
// Etappe 2: /register + /backup*. Die kv-Tabelle für Etappe 3 liegt schon im Schema.
import { keepBackupIds } from './retention.js'
import {
  validateBuddyRequest, buildSystemPrompt, buildMessages,
  pickModel, normalizeResponse, limitScope, dayKey, monthKey, BUDDY_TOOLS,
} from './buddy.js'

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
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,content-type,x-setup-secret,if-match',
    'Access-Control-Max-Age': '86400',
  }
}

const authUser = async (request, env) => {
  const auth = request.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const hash = await sha256Hex(auth.slice(7))
  return env.DB.prepare('SELECT id FROM users WHERE token_hash = ?').bind(hash).first()
}

const CAL_ID_RE = /^[A-Za-z0-9_-]{16}$/

// /kv-Namespace auflösen: ohne ?ns= der persönliche 'u:<id>'; mit ?ns=c:<calId>
// nur, wenn der Nutzer Mitglied dieses Kalenders ist (sonst 403). Trennt die
// geteilten Slices sauber vom persönlichen Store (teilen-spec.md §5).
const resolveKvNs = async (request, user, env, cors) => {
  const nsParam = new URL(request.url).searchParams.get('ns')
  if (!nsParam) return { ns: `u:${user.id}` }
  const m = nsParam.match(/^c:([A-Za-z0-9_-]{16})$/)
  if (!m) return { resp: json({ error: 'ns ungültig' }, 400, cors) }
  const member = await env.DB.prepare('SELECT 1 FROM cal_members WHERE cal_id = ? AND user_id = ?')
    .bind(m[1], user.id).first()
  if (!member) return { resp: json({ error: 'Kein Mitglied dieses Kalenders' }, 403, cors) }
  return { ns: nsParam }
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

      // ─── /buddy — KI-Begleiter (Konzept: Dateien/output/ki-buddy-konzept.md §10) ───
      // Einziger Endpoint, der Klartext sieht (das clientseitig gefilterte
      // Kontextpaket) — Kill-Switch, Tages-/Monats-Limits, Persona serverseitig.
      if (path === '/buddy' && request.method === 'POST') {
        if (env.BUDDY_ENABLED !== '1' || !env.ANTHROPIC_API_KEY)
          return json({ error: 'Buddy ist auf diesem Server nicht aktiviert' }, 503, cors)

        let body
        try { body = await request.json() } catch { body = null }
        const { ok, error } = validateBuddyRequest(body)
        if (error) return json({ error }, 400, cors)

        const now = Date.now()
        const dk = dayKey(now), mk = monthKey(now)
        const daily   = await env.DB.prepare('SELECT count FROM buddy_usage WHERE user_id = ? AND period = ?')
          .bind(user.id, dk).first()
        const monthly = await env.DB.prepare('SELECT count FROM buddy_usage WHERE user_id = 0 AND period = ?')
          .bind(mk).first()
        const scope = limitScope({
          dailyCount:   daily?.count ?? 0,
          monthlyCount: monthly?.count ?? 0,
          dailyLimit:   Number(env.BUDDY_DAILY_LIMIT ?? 50),
          monthlyCap:   Number(env.BUDDY_MONTHLY_CAP ?? 3000),
        })
        if (scope) return json({ error: 'Limit erreicht', scope }, 429, cors)

        // Zählen VOR dem Upstream-Call — parallele Bursts können das Limit
        // so nicht umgehen; ein verlorener Zähler bei Upstream-Fehlern ist egal.
        const bump = 'INSERT INTO buddy_usage (user_id, period, count) VALUES (?, ?, 1) ' +
                     'ON CONFLICT (user_id, period) DO UPDATE SET count = count + 1'
        await env.DB.prepare(bump).bind(user.id, dk).run()
        await env.DB.prepare(bump).bind(0, mk).run()

        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: pickModel(ok.kind, env),
            max_tokens: 1024,
            system: buildSystemPrompt(ok.profile),
            messages: buildMessages(ok),
            tools: BUDDY_TOOLS,
          }),
        })
        if (!upstream.ok) {
          console.warn('[buddy] Upstream', upstream.status, (await upstream.text()).slice(0, 300))
          return json({ error: 'KI-Dienst gerade nicht erreichbar' }, 502, cors)
        }
        const { text, actions } = normalizeResponse(await upstream.json())
        return json({ ok: true, text, actions }, 200, cors)
      }

      // ─── /cal — Teilen Stufe A: Kalender anlegen / beitreten / verlassen ───
      const CAL_INVITE_TTL_MS = 48 * 60 * 60 * 1000

      if (path === '/cal' && request.method === 'POST') {
        const { calId, joinSecretHash } = await request.json()
        if (!CAL_ID_RE.test(calId ?? '')) return json({ error: 'calId ungültig' }, 400, cors)
        if (!/^[0-9a-f]{64}$/.test(joinSecretHash ?? ''))
          return json({ error: 'joinSecretHash ungültig' }, 400, cors)
        const now = Date.now()
        const expires = now + CAL_INVITE_TTL_MS
        const existing = await env.DB.prepare('SELECT creator_user FROM cals WHERE cal_id = ?').bind(calId).first()
        if (existing) {
          // Re-Invite: nur der Ersteller darf ein neues joinSecret + frische TTL setzen.
          if (existing.creator_user !== user.id) return json({ error: 'Kein Zugriff' }, 403, cors)
          await env.DB.prepare('UPDATE cals SET join_secret_hash = ?, join_expires = ? WHERE cal_id = ?')
            .bind(joinSecretHash, expires, calId).run()
          return json({ ok: true, calId }, 200, cors)
        }
        const { c: total } = await env.DB.prepare('SELECT COUNT(*) AS c FROM cals').first()
        if (total >= 16) return json({ error: 'Kalender-Limit erreicht' }, 403, cors)
        const { c: mine } = await env.DB.prepare('SELECT COUNT(*) AS c FROM cals WHERE creator_user = ?').bind(user.id).first()
        if (mine >= 8) return json({ error: 'Kalender-Limit pro Ersteller erreicht' }, 403, cors)
        await env.DB.prepare('INSERT INTO cals (cal_id, creator_user, join_secret_hash, join_expires, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(calId, user.id, joinSecretHash, expires, now).run()
        await env.DB.prepare('INSERT OR IGNORE INTO cal_members (cal_id, user_id, joined_at) VALUES (?, ?, ?)')
          .bind(calId, user.id, now).run()
        return json({ ok: true, calId }, 201, cors)
      }

      if (path === '/cal/join' && request.method === 'POST') {
        const { calId, joinSecret } = await request.json()
        if (!CAL_ID_RE.test(calId ?? '')) return json({ error: 'calId ungültig' }, 400, cors)
        const cal = await env.DB.prepare('SELECT join_secret_hash, join_expires FROM cals WHERE cal_id = ?').bind(calId).first()
        if (!cal) return json({ error: 'Kalender nicht gefunden' }, 404, cors)
        if (!cal.join_secret_hash) return json({ error: 'Keine offene Einladung' }, 409, cors)
        if ((cal.join_expires ?? 0) < Date.now()) return json({ error: 'Einladung abgelaufen' }, 410, cors)
        if (await sha256Hex(String(joinSecret ?? '')) !== cal.join_secret_hash)
          return json({ error: 'Einladung ungültig' }, 403, cors)
        const already = await env.DB.prepare('SELECT 1 FROM cal_members WHERE cal_id = ? AND user_id = ?')
          .bind(calId, user.id).first()
        if (already) return json({ ok: true, calId }, 200, cors)
        const { c: members } = await env.DB.prepare('SELECT COUNT(*) AS c FROM cal_members WHERE cal_id = ?').bind(calId).first()
        if (members >= 6) return json({ error: 'Mitglieder-Limit erreicht' }, 403, cors)
        await env.DB.prepare('INSERT INTO cal_members (cal_id, user_id, joined_at) VALUES (?, ?, ?)')
          .bind(calId, user.id, Date.now()).run()
        // Einladung ist einmal gültig — nach dem Beitritt verbraucht.
        await env.DB.prepare('UPDATE cals SET join_secret_hash = NULL WHERE cal_id = ?').bind(calId).run()
        return json({ ok: true, calId }, 200, cors)
      }

      const calLeave = path.match(/^\/cal\/([A-Za-z0-9_-]{16})\/me$/)
      if (calLeave && request.method === 'DELETE') {
        // Mitgliedschaft entfernen = Server-Zugriff weg (keine Key-Rotation in v1).
        await env.DB.prepare('DELETE FROM cal_members WHERE cal_id = ? AND user_id = ?')
          .bind(calLeave[1], user.id).run()
        return json({ ok: true }, 200, cors)
      }

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
        const { ns, resp } = await resolveKvNs(request, user, env, cors)
        if (resp) return resp
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

        // Atomare Versionsvergabe (Review R4): ein einzelnes UPDATE…RETURNING
        // kann nie zwei gleiche Versionen vergeben — Cursor-Pulls bleiben lückenlos.
        await env.DB.prepare('INSERT OR IGNORE INTO ns_version (user_ns, n) VALUES (?, 0)')
          .bind(ns).run()
        const { n: next } = await env.DB.prepare(
          'UPDATE ns_version SET n = n + 1 WHERE user_ns = ? RETURNING n'
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
        const { ns, resp } = await resolveKvNs(request, user, env, cors)
        if (resp) return resp
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
