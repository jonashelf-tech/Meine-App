// Kleine monochrome Line-Icons fürs Mealprep-Tool (currentColor, stroke-basiert).
// Ersetzt Emojis gemäß Architektur-Regel „keine Emojis als Icons".
const Svg = ({ size = 16, children, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}>
    {children}
  </svg>
)

export const IconEdit = (p) => <Svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>
export const IconClose = (p) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>
export const IconChevron = (p) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>  // rotiert via CSS für „zu"
export const IconCheck = (p) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconMinus = (p) => <Svg {...p}><path d="M5 12h14" /></Svg>
export const IconArrowLeft = (p) => <Svg {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Svg>
export const IconArrowRight = (p) => <Svg {...p}><path d="M5 12h14M12 5l7 7-7 7" /></Svg>
export const IconCopy = (p) => <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>

export const IconSnow = (p) => <Svg {...p}>
  <path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17" />
</Svg>
export const IconClock = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const IconBasket = (p) => <Svg {...p}>
  <path d="M5 9h14l-1.3 10.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8L5 9Z" /><path d="m9 9 3-6 3 6" />
</Svg>
export const IconCart = (p) => <Svg {...p}>
  <circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" />
  <path d="M2 3h3l2.2 11a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
</Svg>
export const IconClipboard = (p) => <Svg {...p}>
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  <rect x="8" y="2" width="8" height="4" rx="1" />
</Svg>
export const IconCalendar = (p) => <Svg {...p}>
  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
</Svg>
export const IconSliders = (p) => <Svg {...p}>
  <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
  <path d="M1 14h6M9 8h6M17 16h6" />
</Svg>
export const IconLayers = (p) => <Svg {...p}>
  <path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" />
</Svg>
