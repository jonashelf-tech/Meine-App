// Distinkte Linien-Icons je Kognitiv-Modul. currentColor folgt der Modulfarbe.
const PATHS = {
  // Reaktion — Blitz
  alertness: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  // Tempo — Raster 3x3
  zahlensuche: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  // Gedächtnis — verbundene Knoten (Sequenz)
  gedaechtnis: (
    <>
      <circle cx="5" cy="6" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M7 7.2 10.8 16M16.6 7.4 13 16" />
    </>
  ),
  // Impulskontrolle — Stopp-Achteck
  gonogo: (
    <>
      <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5Z" />
      <path d="M9 12h6" />
    </>
  ),
  // Arbeitsgedächtnis — gestapelte Ebenen
  nback: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  // Flexibilität — Wechsel-Pfeile
  taskswitching: (
    <>
      <path d="M4 7h11l-3-3M20 17H9l3 3" />
    </>
  ),
  // Daueraufmerksamkeit — Auge
  cpt: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  // Fokus — Trichter
  selektiv: <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />,
  // Multitasking — geteiltes Feld
  geteilt: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16" />
    </>
  ),
}

export default function ModuleIcon({ id, size = 20, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[id] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  )
}
