import { useEffect, useRef } from 'react'
import { useAppStore } from '../../../store'
import { TOOL_REGISTRY, ToolIcon } from '../../tools/toolRegistry.jsx'
import s from './Hilfe.module.css'

// Handgeschriebene Kern-Karten. Neue Kern-Mechanik → hier eine Karte ergänzen
// (siehe CLAUDE.md-Regel). Die Tool-Liste unten pflegt sich selbst aus der Registry.
const CARDS = [
  {
    title: 'Der Kern',
    body: 'Aufgaben sammeln sich im Pool. Um eine in deinen Tag zu bringen: halt sie am Griff gedrückt und zieh sie auf eine Uhrzeit — oder tipp auf eine freie Zeit und wähl die Aufgabe aus. Beide Wege führen zum selben Ziel.',
  },
  {
    title: 'Raster oder Liste',
    body: 'Der Tagesplaner kann deinen Tag auf zwei Arten zeigen — der Umschalter sitzt unten in der Statuskarte. Im Raster hängt jede Aufgabe an einer Uhrzeit. In der Liste behalten nur deine Termine ihre Uhrzeit; alles andere ziehst du einfach dazwischen, ohne dich auf eine Zeit festzulegen. Es ist derselbe Tag — nur anders angesehen. Aufgaben, die du in der Liste ohne Uhrzeit einplanst, findest du im Raster oben im Pool wieder.',
  },
  {
    title: 'Wenn Zeit abläuft',
    body: 'Läuft die Zeit eines Eintrags ab, sammelt die App ihn in einer ruhigen Abfrage. Du entscheidest pro Eintrag: erledigt, später nochmal, oder zurück in den Pool. Nichts geht verloren.',
  },
  {
    title: 'Pause',
    body: 'Kommst du an einer Aufgabe gerade nicht weiter, kannst du sie pausieren — optional mit einem kurzen Grund. Sie rückt gedimmt ans Ende des Pools. Der ▶-Knopf am Eintrag holt sie zurück.',
  },
  {
    title: 'Kalender',
    body: 'In der Wochenansicht ziehst du Blöcke frei über Tage und Uhrzeiten. Die Monatsansicht gibt dir den ruhigen Überblick über den Monat.',
  },
  {
    title: 'Der +-Knopf',
    body: 'Über + legst du Aufgaben an. Schreib einfach drauflos — aus „Einkaufen 30min wichtig" erkennt die App Dauer und Priorität von selbst. Über den Umschalter oben wird aus dem + auch eine schnelle Notiz.',
  },
  {
    title: 'Projekte',
    body: 'Gehören mehrere Todos zusammen — Einkauf, Urlaub, Wohnung — bündelst du sie zu einem Projekt. Jedes Projekt hat eine eigene Farbe, die das Todo überall trägt: im Pool, im Zeitplan, im Kalender. Projekte verwaltest du über den Projekte-Knopf oben im Pool; dort siehst du auch den Fortschritt und kannst Todos „erst ab einem Datum" auftauchen lassen.',
  },
  {
    title: 'Buddy (optional)',
    body: 'Ein kleiner Begleiter mit KI, der beim Anfangen hilft: „Womit fange ich an?", Aufgaben in machbare Schritte zerlegen, einen Fokus-Block vorschlagen. Er meldet sich nie von selbst — du öffnest ihn über den Knopf links unten, und alles, was er vorschlägt, bestätigst du erst. Schaltest du „Vorschläge von selbst" ein, setzt er gelegentlich einen stillen Punkt als Hinweis auf einen bereitliegenden Gedanken — geöffnet wird er, wann du willst; ungefragt mit Text meldet er sich weiterhin nie. Einschalten (und festlegen, was er lesen darf) unter Einstellungen → Buddy; er braucht die Cloud-Sicherung als Zugang.',
  },
]

const TOOLS_INTRO =
  'Tools erweitern die App um Extra-Funktionen. Ausgeschaltet tauchen sie nirgends auf, angeschaltet sind sie in die App integriert. Ein- und ausschalten kannst du sie im Tools-Tab.'

const DATA_CARD = {
  title: 'Deine Daten',
  body: 'Alles bleibt offline auf deinem Gerät — kein Konto nötig. Ein Backup machst du unter Einstellungen → Speicher.',
}

export default function Hilfe({ onBack }) {
  const { setBackInterceptor } = useAppStore()

  // Swipe-/Zurück-Geste schließt zuerst die Hilfe, nicht den ganzen Tab.
  // onBack via Ref, damit der Effect nur bei Mount/Unmount läuft — sonst
  // Endlosschleife (onBack ist pro Render eine neue Funktion → setBackInterceptor
  // re-rendert TabSettings → neues onBack → Effect erneut …).
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack
  useEffect(() => {
    setBackInterceptor(() => onBackRef.current())
    return () => setBackInterceptor(null)
  }, [setBackInterceptor])

  return (
    <div className={s.page}>
      <button className={s.back} onClick={onBack}>‹ Zurück</button>
      <h2 className={s.heading}>Wie funktioniert die App?</h2>

      {CARDS.map(c => (
        <section key={c.title} className={s.card}>
          <h3 className={s.cardTitle}>{c.title}</h3>
          <p className={s.cardBody}>{c.body}</p>
        </section>
      ))}

      <section className={s.card}>
        <h3 className={s.cardTitle}>Tools</h3>
        <p className={s.cardBody}>{TOOLS_INTRO}</p>
        <div className={s.toolList}>
          {TOOL_REGISTRY.map(t => (
            <div key={t.id} className={s.toolRow}>
              <span className={s.toolIcon} style={{ color: t.color }}>
                <ToolIcon id={t.id} size={20} />
              </span>
              <div className={s.toolText}>
                <span className={s.toolName}>{t.name}</span>
                <span className={s.toolDesc}>{t.description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.card}>
        <h3 className={s.cardTitle}>{DATA_CARD.title}</h3>
        <p className={s.cardBody}>{DATA_CARD.body}</p>
      </section>
    </div>
  )
}
