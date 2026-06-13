// First-Open: 4 Screens, Screen 4 = Pflicht-Kategorienauswahl (min. 1).
import { useState } from 'react'
import { KATEGORIEN } from './growthStore'
import s from './GrowthBriefing.module.css'

const SCREENS = [
  { titel: 'Jeden Tag eine Karte.', text: 'Beantworten, überspringen (1×) oder einfach ignorieren — dein Tempo.' },
  { titel: 'Dein freies Feld.', text: 'Darunter: dein freies Feld. Ein Satz reicht. Diktieren geht über die Mikrofon-Taste deiner Tastatur.' },
  { titel: '60 Sekunden ankommen.', text: 'Vorher 60 Sekunden ankommen — jederzeit überspringbar, in den Einstellungen abschaltbar.' },
]

export function KategorieKacheln({ aktiv, onToggle }) {
  return (
    <div className={s.kacheln}>
      {KATEGORIEN.map(k => {
        const on = aktiv.includes(k.id)
        return (
          <button
            key={k.id}
            className={[s.kachel, on ? s.kachelOn : ''].join(' ')}
            onClick={() => onToggle(k.id)}
            aria-pressed={on}
          >
            <span className={s.kachelName}>{on && <span className={s.check}>✓ </span>}{k.name}</span>
            <span className={s.kachelSub}>{k.untertitel}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function GrowthBriefing({ defaults, onComplete }) {
  const [screen, setScreen] = useState(0)
  const [aktiv, setAktiv] = useState(defaults)

  const toggle = (id) => setAktiv(cur => {
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    return next.length === 0 ? cur : next
  })

  return (
    <div className={s.page}>
      {screen < 3 ? (
        <>
          <div className={s.step}>{screen + 1} / 4</div>
          <div className={s.titel}>{SCREENS[screen].titel}</div>
          <div className={s.text}>{SCREENS[screen].text}</div>
          <button className={s.weiter} onClick={() => setScreen(screen + 1)}>Weiter</button>
        </>
      ) : (
        <>
          <div className={s.step}>4 / 4</div>
          <div className={s.titel}>Welche Themen willst du?</div>
          <KategorieKacheln aktiv={aktiv} onToggle={toggle} />
          <button className={s.weiter} onClick={() => onComplete(aktiv)}>Los geht's</button>
        </>
      )}
    </div>
  )
}
