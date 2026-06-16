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

const root = join(here, '..', '..')
const migrated = [
  'components/TodoModal/TodoModal.module.css',
  'features/tools/klaeren/KlaerenModal.module.css',
  'features/calendar/Zeitplan/MissedReviewModal.module.css',
  'features/calendar/Zeitplan/Zeitplan.module.css',
  'features/calendar/Zeitplan/SlotSheet.module.css',
  'features/tools/geburtstage/BirthdaySheet.module.css',
  'features/tools/kognitiv/CheckinModal.module.css',
  'features/calendar/Blocker/BlockerModal.module.css',
  'features/calendar/Blocker/RepeatDeleteSheet.module.css',
  'components/UpdatePrompt/UpdatePrompt.module.css',
  'features/tools/rezepte/Konfigurator.module.css',
]

describe('Overlay — Anti-Drift (migrierte Dialoge ohne eigenen Backdrop/Entrance)', () => {
  for (const rel of migrated) {
    const txt = readFileSync(join(root, rel), 'utf8')
    it(`${rel} definiert keinen eigenen Voll-Backdrop`, () => {
      // Kein "position:fixed; inset:0; … background: rgba(0,0,0,…)" mehr (= Dialog-Backdrop)
      const hasFixedFullBackdrop =
        /position:\s*fixed[\s\S]{0,80}inset:\s*0[\s\S]{0,140}background:\s*rgba\(0,\s*0,\s*0/.test(txt)
      expect(hasFixedFullBackdrop).toBe(false)
    })
    it(`${rel} definiert keinen scaleIn/slideUp-Keyframe mehr`, () => {
      expect(txt).not.toMatch(/@keyframes\s+(scaleIn|slideUp)/)
    })
  }
})
