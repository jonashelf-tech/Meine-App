// ─── Shared SVG glyph set (Lucide-style, viewBox 0 0 24 24, stroke-based) ──────
// Ersetzt Emoji-Icons in Tools (Haushalt-Räume, Reminder). Ein einziger Stil
// für die ganze App: stroke currentColor, round caps. Auswahl via <GlyphPicker>.

const PATHS = {
  // ── Räume / Haushalt ──────────────────────────────────────
  home:    <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  kitchen: <><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/></>,
  bath:    <><path d="M4 12V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0"/><path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M7 19l-1 2"/><path d="M17 19l1 2"/></>,
  sofa:    <><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11a2 2 0 0 1 2 2v3h16v-3a2 2 0 0 1 2-2 2 2 0 0 0-2 2v0H4v0a2 2 0 0 0-2-2Z"/><path d="M4 18v2"/><path d="M20 18v2"/></>,
  bed:     <><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></>,
  door:    <><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></>,
  desk:    <><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12"/><path d="M19 8v12"/><path d="M5 14h14"/></>,
  balcony: <><path d="M3 21h18"/><path d="M5 21v-8h14v8"/><path d="M5 17h14"/><path d="M9 13v8"/><path d="M15 13v8"/><path d="M12 3v6"/><path d="M9 6l3-3 3 3"/></>,
  car:     <><path d="M5 17h14l-1.5-5a2 2 0 0 0-1.9-1.4H8.4A2 2 0 0 0 6.5 12z"/><path d="M5 17H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1"/><path d="M19 17h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/></>,

  // ── Haushalts-Tätigkeiten ─────────────────────────────────
  broom:   <><path d="M21 3 14 10"/><path d="M14 10c-2-2-4-1.5-5.5 0L4 14.5 9.5 20l4.5-4.5c1.5-1.5 2-3.5 0-5.5Z"/><path d="m6 16 2 2"/></>,
  trash:   <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>,
  washer:  <><rect x="3" y="2" width="18" height="20" rx="2"/><path d="M6 6h.01"/><path d="M10 6h.01"/><circle cx="12" cy="13" r="5"/><path d="M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5"/></>,
  shirt:   <><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></>,
  window:  <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></>,
  spray:   <><path d="M3 3h.01"/><path d="M7 5h.01"/><path d="M11 7h.01"/><path d="M3 7h.01"/><path d="M7 9h.01"/><path d="M3 11h.01"/><rect x="13" y="9" width="6" height="12" rx="2"/><path d="M16 9V6a2 2 0 0 1 2-2h3"/></>,
  plant:   <><path d="M7 20h10"/><path d="M12 20c0-6 0-8 4-11"/><path d="M12 14c-3 0-5-2-5-5 3 0 5 2 5 5z"/><path d="M12 11c0-3 2-5 5-5 0 3-2 5-5 5z"/></>,
  dishes:  <><path d="M5 3v6c0 2 1 3 3 3s3-1 3-3V3"/><path d="M8 12v9"/><path d="M18 3v18"/><path d="M18 3a3 3 0 0 0-3 3v5a3 3 0 0 0 3 3"/></>,
  brush:   <><path d="M9.06 11.9 16.5 4.5a2.12 2.12 0 0 1 3 3l-7.4 7.44"/><path d="M7 14a3 3 0 0 0-3 3c0 1.5-1 2-1 2 1 1 3 1 4 0a3 3 0 0 0 0-5Z"/></>,

  // ── Selfcare / Reminder ───────────────────────────────────
  droplet: <><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></>,
  coffee:  <><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></>,
  utensils:<><path d="M3 2v7c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2V2"/><path d="M5 11v11"/><path d="M19 2v20"/><path d="M19 2a3 3 0 0 0-3 3v6c0 1.1.9 2 2 2h1"/></>,
  moon:    <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></>,
  leaf:    <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></>,
  sun:     <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>,
  tooth:   <><path d="M12 5.5C10.5 4 8 3.5 6.5 4.6 5 5.6 4.5 8 5 11c.4 2.3 1 4.5 1.8 6.3.4.9 1.6.9 2 0l1-2.3c.2-.4.6-.4.8 0l1 2.3c.4.9 1.6.9 2 0 .8-1.8 1.4-4 1.8-6.3.5-3 0-5.4-1.5-6.4C16.2 3.5 13.5 4 12 5.5z"/></>,
  health:  <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></>,
  eye:     <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
  pill:    <><path d="M10.5 20.5 20 11a4.95 4.95 0 1 0-7-7l-9.5 9.5a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></>,
  dumbbell:<><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></>,
  phone:   <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></>,
  calendar:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  heart:   <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>,
  book:    <><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></>,
  bell:    <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  sparkle: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.9 1.9.7-1.9.7L19 21l-.7-1.7-1.9-.7 1.9-.7z"/></>,
  battery: <><rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="12" x2="8" y2="12"/></>,
}

export const GLYPH_NAMES = Object.keys(PATHS)

// Icon-Sets für Picker — kuratierte Reihenfolge je Kontext.
export const ROOM_GLYPHS = ['home','kitchen','bath','sofa','bed','door','desk','balcony','car','window','washer','plant']
export const CARE_GLYPHS = ['droplet','coffee','utensils','moon','leaf','sun','tooth','health','eye','pill','dumbbell','phone','calendar','heart','book','bell']

export function Glyph({ name, size = 20, strokeWidth = 1.8 }) {
  const inner = PATHS[name]
  if (!inner) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
    >
      {inner}
    </svg>
  )
}

export default Glyph
