export const PHASES = ['Willkommen', 'Dein Tag', 'Deine Tools', 'Fertig']

export const STEPS = [
  // ── Phase 0 — Willkommen ──
  {
    id: 'welcome', phase: 0, tab: 0, kind: 'welcome',
    title: 'Schön, dass du hier bist',
    text: (<>Das ist dein Tag, deine Aufgaben, deine Helfer — alles offline auf deinem Gerät.
      In zwei Minuten richten wir zusammen ein, was du brauchst. Du kannst jederzeit überspringen.</>),
  },
  // ── Phase 1 — Hands-on-Kern (echter Tagesplaner) ──
  {
    id: 'add', phase: 1, tab: 0, target: 'add-fab', dock: 'top',
    title: 'Hast du etwas zu erledigen?',
    text: (<>Unten sammelst du im <strong>Pool</strong> alles, was ansteht. Tipp auf das <strong>+</strong>,
      um deine erste Aufgabe anzulegen.</>),
    advance: 'modalOpen',
  },
  {
    id: 'auto', phase: 1, tab: 0, target: 'todo-auto', dock: 'bottom',
    title: 'Einfach drauflosschreiben',
    text: (<>Schalte <strong>Auto</strong> ein und schreib z.B. „Einkaufen 30min wichtig" — Dauer und
      Priorität werden automatisch erkannt. Unterpunkte gehst du später über <strong>Schritte</strong> an.
      Sichern legt die Aufgabe in den Pool.</>),
    advance: 'poolTodo',
    fallbackExample: true, // Controller zeigt „Beispiel nehmen"-Button
  },
  {
    id: 'drag', phase: 1, tab: 0, target: 'pool', dock: 'top',
    title: 'Zieh es in deinen Tag',
    text: (<>Halte den <strong>Griff</strong> deiner Aufgabe und zieh sie nach oben auf eine Uhrzeit —
      schon ist sie verplant. Zurück in den Pool geht genauso, nichts geht verloren.</>),
    advance: 'slotToday',
    freeMove: true,        // Zieh-Geste Pool → Zeitplan: nur Highlight, keine Sperre
    fallbackTapHint: true, // nach ~10s: „Oder tipp auf eine freie Zeit"
  },
  {
    id: 'core-done', phase: 1, tab: 0,
    title: 'Das ist der Kern',
    text: (<>Sammeln, dann in den Tag ziehen. Mehr brauchst du erstmal nicht — der Rest hilft dir dabei.</>),
  },
  // ── Phase 2 — Tools ──
  {
    id: 'tools-intro', phase: 2, tab: 2, target: 'tools-list', dock: 'bottom', kind: 'toolQuestion',
    title: 'Deine Helfer',
    text: (<>Hier findest du Tools und kleine Helfer. <strong>Ausgeschaltet</strong> tauchen sie nirgends auf.
      <strong>Angeschaltet</strong> sind sie überall in die App integriert. Möchtest du selbst ausprobieren
      oder sollen wir dir die Großen kurz vorstellen?</>),
    // kind:'toolQuestion' → Controller zeigt zwei CTAs: „Selbst ausprobieren" / „Kurz vorstellen"
  },
  {
    id: 'tools-cards', phase: 2, tab: 2, kind: 'toolCards',
    title: 'Die großen Helfer',
    text: (<>Tippe an, was zu dir passt — ändern kannst du das jederzeit.</>),
    // kind:'toolCards' → Controller rendert Karten der featured Tools mit Aktivieren-Toggle
  },
  {
    id: 'tools-embed', phase: 2, tab: 0, target: 'tool-section', dock: 'top',
    title: 'So klinken sich Tools ein',
    text: (<>Aktive Tools zeigen sich als Karte hier im Tagesplaner, hinterlassen Spuren im Kalender —
      ein Tipp öffnet das ganze Tool. Die kleinen Helfer findest du jederzeit im Tab <strong>Tools</strong>.</>),
    // Controller: wenn kein widget-fähiges Tool aktiv → target weglassen, reiner Text
  },
  // ── Phase 3 — Abschluss ──
  {
    id: 'finish', phase: 3, tab: 0, kind: 'finish',
    title: 'Fertig eingerichtet!',
    text: (<>Drei Dinge noch: Deine Daten liegen nur hier — mach ab und zu ein <strong>Backup</strong>
      (Einstellungen → Speicher). Farbe & Theme stellst du in den <strong>Einstellungen</strong> ein.
      Und diese Einführung findest du dort jederzeit wieder.</>),
    // kind:'finish' → Controller zeigt „Feinheiten ansehen" (→ Kür) / „Loslegen" (→ Ende)
  },
]
