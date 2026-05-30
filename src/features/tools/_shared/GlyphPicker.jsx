import { Glyph } from './glyphs'
import s from './GlyphPicker.module.css'

// Kompakte Icon-Auswahl. `glyphs` = Liste von Namen (z.B. ROOM_GLYPHS).
export default function GlyphPicker({ glyphs, value, onChange, size = 20 }) {
  return (
    <div className={s.grid}>
      {glyphs.map(name => (
        <button
          key={name}
          type="button"
          className={[s.cell, value === name ? s.active : ''].join(' ')}
          onClick={() => onChange(name)}
        >
          <Glyph name={name} size={size} />
        </button>
      ))}
    </div>
  )
}
