// ─── Sync-Krypto ──────────────────────────────────────────
// Reine WebCrypto-Helfer, keine App-Imports. E2E-Prinzip (sync-architektur.md §7):
// Der Schlüssel wird clientseitig erzeugt, als Recovery-Code gesichert und
// verlässt nie das Gerät — der Server sieht nur Ciphertext.

const subtle = globalThis.crypto.subtle

const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n))

// — Base64 (Envelope) + Base64url (Token/Key) —
const toB64 = (bytes) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromB64 = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))

const toB64url = (bytes) =>
  toB64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const fromB64url = (s) =>
  fromB64(s.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (s.length % 4)) % 4))

// — Base32 (RFC 4648, ohne Padding) — fürs Abtippen des Recovery-Codes —
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

const toB32 = (bytes) => {
  let bits = 0, value = 0, out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

const fromB32 = (str) => {
  let bits = 0, value = 0
  const out = []
  for (const ch of str) {
    const idx = B32.indexOf(ch)
    if (idx === -1) throw new Error('Ungültiges Zeichen im Code')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8 }
  }
  return new Uint8Array(out)
}

// ─── Zugangsdaten ─────────────────────────────────────────

export const generateCreds = () => ({
  token: toB64url(randomBytes(16)),   // Auth gegenüber dem Server (dort nur als Hash)
  key:   toB64url(randomBytes(32)),   // AES-256 — bleibt clientseitig
})

// Recovery-Code = token ‖ key ‖ 2 Prüfsummen-Bytes (SHA-256), Base32 in 5er-Gruppen.
const TOKEN_BYTES = 16
const KEY_BYTES = 32
const CODE_BYTES = TOKEN_BYTES + KEY_BYTES + 2

export const buildRecoveryCode = async ({ token, key }) => {
  const payload = new Uint8Array([...fromB64url(token), ...fromB64url(key)])
  const digest = new Uint8Array(await subtle.digest('SHA-256', payload))
  const full = new Uint8Array([...payload, digest[0], digest[1]])
  return toB32(full).match(/.{1,5}/g).join('-')
}

export const parseRecoveryCode = async (input) => {
  const clean = String(input).toUpperCase().replace(/[^A-Z2-7]/g, '')
  const bytes = fromB32(clean)
  if (bytes.length !== CODE_BYTES) throw new Error('Code unvollständig')
  const payload = bytes.subarray(0, TOKEN_BYTES + KEY_BYTES)
  const digest = new Uint8Array(await subtle.digest('SHA-256', payload))
  if (digest[0] !== bytes[CODE_BYTES - 2] || digest[1] !== bytes[CODE_BYTES - 1])
    throw new Error('Prüfsumme stimmt nicht — vermutlich ein Tippfehler')
  return {
    token: toB64url(payload.subarray(0, TOKEN_BYTES)),
    key:   toB64url(payload.subarray(TOKEN_BYTES)),
  }
}

// ─── Verschlüsselung (AES-GCM-256, gzip wenn verfügbar) ───

const importAesKey = (keyB64url, usages) =>
  subtle.importKey('raw', fromB64url(keyB64url), 'AES-GCM', false, usages)

const pipeBytes = async (bytes, transform) =>
  new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(transform)).arrayBuffer())

export const encryptPayload = async (keyB64url, data) => {
  const key = await importAesKey(keyB64url, ['encrypt'])
  let bytes = new TextEncoder().encode(JSON.stringify(data))
  let zip = null
  if (typeof CompressionStream !== 'undefined') {
    bytes = await pipeBytes(bytes, new CompressionStream('gzip'))
    zip = 'gzip'
  }
  const iv = randomBytes(12)
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes))
  return { v: 1, alg: 'A256GCM', zip, iv: toB64(iv), ct: toB64(ct) }
}

export const decryptPayload = async (keyB64url, env) => {
  if (env?.v !== 1 || env?.alg !== 'A256GCM') throw new Error('Unbekanntes Backup-Format')
  const key = await importAesKey(keyB64url, ['decrypt'])
  let bytes = new Uint8Array(
    await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv) }, key, fromB64(env.ct))
  )
  if (env.zip === 'gzip') bytes = await pipeBytes(bytes, new DecompressionStream('gzip'))
  return JSON.parse(new TextDecoder().decode(bytes))
}

// ─── Hash (Token-Registrierung: Server speichert nur den Hash) ───

export const sha256Hex = async (str) => {
  const digest = new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(str)))
  return [...digest].map(b => b.toString(16).padStart(2, '0')).join('')
}
