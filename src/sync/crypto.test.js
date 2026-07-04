import { describe, it, expect, vi } from 'vitest'
import {
  generateCreds, buildRecoveryCode, parseRecoveryCode,
  encryptPayload, decryptPayload, sha256Hex, hmacKeyId,
} from './crypto'

describe('generateCreds', () => {
  it('liefert token (16 Byte) und key (32 Byte) als base64url', () => {
    const { token, key } = generateCreds()
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)   // 16 Byte → 22 Zeichen, ohne Padding
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/)     // 32 Byte → 43 Zeichen, ohne Padding
  })

  it('erzeugt bei jedem Aufruf andere Werte', () => {
    const a = generateCreds()
    const b = generateCreds()
    expect(a.token).not.toBe(b.token)
    expect(a.key).not.toBe(b.key)
  })
})

describe('Recovery-Code', () => {
  it('Round-trip: buildRecoveryCode → parseRecoveryCode ergibt dieselben Creds', async () => {
    const creds = generateCreds()
    const code = await buildRecoveryCode(creds)
    const parsed = await parseRecoveryCode(code)
    expect(parsed).toEqual({ token: creds.token, key: creds.key })
  })

  it('formatiert als 5er-Gruppen in Base32 (tippbar, keine Sonderzeichen)', async () => {
    const code = await buildRecoveryCode(generateCreds())
    expect(code).toMatch(/^([A-Z2-7]{5}-)+[A-Z2-7]{5}$/)
  })

  it('toleriert Kleinschreibung, Leerzeichen und fehlende Bindestriche', async () => {
    const creds = generateCreds()
    const code = await buildRecoveryCode(creds)
    const sloppy = code.toLowerCase().replaceAll('-', ' ')
    expect(await parseRecoveryCode(sloppy)).toEqual(creds)
  })

  it('wirft bei einem Tippfehler (Prüfsumme)', async () => {
    const code = await buildRecoveryCode(generateCreds())
    // ein Zeichen kippen (auf ein garantiert anderes aus dem Alphabet)
    const flipped = (code[0] === 'A' ? 'B' : 'A') + code.slice(1)
    await expect(parseRecoveryCode(flipped)).rejects.toThrow()
  })

  it('wirft bei zu kurzem Code', async () => {
    await expect(parseRecoveryCode('ABCDE-FGH23')).rejects.toThrow()
  })
})

describe('encryptPayload / decryptPayload', () => {
  it('Round-trip: Objekt rein, identisches Objekt raus', async () => {
    const { key } = generateCreds()
    const data = { adhs_todos_list: '[{"id":"x1","text":"Zahnarzt anrufen"}]', n: 42 }
    const env = await encryptPayload(key, data)
    expect(await decryptPayload(key, env)).toEqual(data)
  })

  it('Envelope enthält keinen Klartext (Guard G4)', async () => {
    const { key } = generateCreds()
    const env = await encryptPayload(key, { text: 'Zahnarzt anrufen wegen Weisheitszahn' })
    const raw = JSON.stringify(env)
    expect(raw).not.toContain('Zahnarzt')
    expect(raw).not.toContain('Weisheitszahn')
    expect(env.v).toBe(1)
    expect(env.alg).toBe('A256GCM')
  })

  it('falscher Schlüssel → wirft', async () => {
    const a = generateCreds()
    const b = generateCreds()
    const env = await encryptPayload(a.key, { secret: true })
    await expect(decryptPayload(b.key, env)).rejects.toThrow()
  })

  it('manipulierter Ciphertext → wirft (GCM-Integrität)', async () => {
    const { key } = generateCreds()
    const env = await encryptPayload(key, { secret: true })
    const bytes = Uint8Array.from(atob(env.ct), c => c.charCodeAt(0))
    bytes[0] ^= 0xff
    const tampered = { ...env, ct: btoa(String.fromCharCode(...bytes)) }
    await expect(decryptPayload(key, tampered)).rejects.toThrow()
  })

  it('funktioniert auch ohne CompressionStream (zip: null)', async () => {
    const orig = globalThis.CompressionStream
    vi.stubGlobal('CompressionStream', undefined)
    try {
      const { key } = generateCreds()
      const env = await encryptPayload(key, { a: 1 })
      expect(env.zip).toBeNull()
      expect(await decryptPayload(key, env)).toEqual({ a: 1 })
    } finally {
      vi.stubGlobal('CompressionStream', orig)
    }
  })

  it('komprimiert große Payloads (gzip greift wirklich)', async () => {
    const { key } = generateCreds()
    const big = { blob: 'Wiederholung '.repeat(5000) }   // ~65 KB, gut komprimierbar
    const env = await encryptPayload(key, big)
    expect(env.zip).toBe('gzip')
    expect(env.ct.length).toBeLessThan(20000)            // deutlich kleiner als das Original
    expect(await decryptPayload(key, env)).toEqual(big)
  })
})

describe('hmacKeyId', () => {
  it('pseudonymisiert Key-Namen: deterministisch, URL-safe, ohne Klartext', async () => {
    const { key } = generateCreds()
    const a = await hmacKeyId(key, 'adhs_todos_list')
    const b = await hmacKeyId(key, 'adhs_todos_list')
    const c = await hmacKeyId(key, 'adhs_elvi_v1')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(a).not.toContain('todos')
  })

  it('anderer Schlüssel → andere IDs (Provider kann Namen nicht erraten)', async () => {
    const a = await hmacKeyId(generateCreds().key, 'adhs_todos_list')
    const b = await hmacKeyId(generateCreds().key, 'adhs_todos_list')
    expect(a).not.toBe(b)
  })
})

describe('sha256Hex', () => {
  it('liefert den bekannten Testvektor für "abc"', async () => {
    expect(await sha256Hex('abc'))
      .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
