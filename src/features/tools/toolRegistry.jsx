// ─── SVG icon paths (Lucide-style, viewBox 0 0 24 24, stroke-based) ───────────
const ICONS = {
  rad:          { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg> },
  timer:        { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  rezepte:      { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg> },
  pizza:        { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2L2 22l10-5 10 5L12 2z"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg> },
  elvi:         { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 3.5a5 5 0 0 1 7.07 7.07l-7.07 7.07a5 5 0 0 1-7.07-7.07l7.07-7.07z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg> },
  gewicht:      { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20L9 8l3 12 3-12 3 12"/><line x1="3" y1="8" x2="21" y2="8"/></svg> },
  geburtstage:  { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="20" height="12" rx="2"/><path d="M12 10V6"/><path d="M8 10V8"/><path d="M16 10V8"/><path d="M2 15h20"/></svg> },
  gamification: { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  reminder:     { el: (s) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
}

export function ToolIcon({ id, size = 20 }) {
  const icon = ICONS[id]
  if (!icon) return null
  return icon.el(size)
}

export const TOOL_REGISTRY = [
  {
    id: 'rad',
    name: 'Zufallsrad',
    icon: '🎡',
    color: '#BF00FF',
    description: 'Zufälliges Todo auswählen',
    standalone: true,
    integrated: false,
  },
  {
    id: 'timer',
    name: 'Fokus-Timer',
    icon: '⏱',
    color: '#00CFFF',
    description: 'Pomodoro & Fokus-Blöcke',
    standalone: true,
    integrated: false,
  },
  {
    id: 'rezepte',
    name: 'Rezepte',
    icon: '🍳',
    color: '#FF9F43',
    description: 'Rezepte, Einkauf, Vorräte',
    standalone: true,
    integrated: false,
  },
  {
    id: 'pizza',
    name: 'Pizza-Rechner',
    icon: '🍕',
    color: '#FF6B6B',
    description: 'Teig-Rechner & Zeitplan',
    standalone: true,
    integrated: false,
  },
  {
    id: 'elvi',
    name: 'Elvi',
    icon: '💊',
    color: '#00E5FF',
    description: 'Methylphenidat Dosisplanung',
    standalone: true,
    integrated: false,
  },
  {
    id: 'gewicht',
    name: 'Gewicht',
    icon: '⚖',
    color: '#00FF94',
    description: 'Gewichtstracking & Verlauf',
    standalone: true,
    integrated: true,
  },
  {
    id: 'geburtstage',
    name: 'Geburtstage',
    icon: '🎂',
    color: '#FF2D78',
    description: 'Geburtstage & Erinnerungen',
    standalone: true,
    integrated: true,
  },
  {
    id: 'gamification',
    name: 'XP & Level',
    icon: '⚡',
    color: '#FFD700',
    description: 'Punkte für Selbstregulation',
    standalone: false,
    integrated: true,
  },
  {
    id: 'reminder',
    name: 'Reminder',
    icon: '🔔',
    color: '#00FF94',
    description: 'Selfcare-Erinnerungen & Routinen',
    standalone: true,
    integrated: true,
  },
]
