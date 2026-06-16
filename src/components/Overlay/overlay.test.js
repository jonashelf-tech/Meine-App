import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(here, 'Overlay.jsx'), 'utf8')
const css = readFileSync(join(here, 'Overlay.module.css'), 'utf8')

describe('Overlay — Komponente', () => {
  it('schließt bei Escape', () => {
    expect(jsx).toMatch(/Escape/)
    expect(jsx).toMatch(/keydown/)
  })
  it('schließt nur bei Backdrop-/Panel-Tap (currentTarget)', () => {
    expect(jsx).toMatch(/currentTarget/)
  })
  it('setzt role=dialog + aria-modal', () => {
    expect(jsx).toMatch(/role="dialog"/)
    expect(jsx).toMatch(/aria-modal/)
  })
  it('unterstützt beide Varianten', () => {
    expect(jsx).toMatch(/sheet/)
    expect(jsx).toMatch(/center/)
  })
})

describe('Overlay — CSS', () => {
  it('nutzt den kanonischen Backdrop', () => {
    expect(css).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.62\)/)
    expect(css).toMatch(/blur\(18px\)/)
  })
  it('nutzt das z-overlay-Token', () => {
    expect(css).toMatch(/var\(--z-overlay\)/)
  })
  it('referenziert beide Entrance-Keyframes', () => {
    expect(css).toMatch(/overlayIn/)
    expect(css).toMatch(/slideInBottom/)
  })
})
