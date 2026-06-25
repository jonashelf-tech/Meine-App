// Einmaliges Erst-Briefing beim ersten Öffnen des Tools (Muster wie GrowthBriefing).
// 4 Screens → onComplete setzt das SK.kognitivIntroSeen-Flag (in TabKognitiv).
import { useState } from 'react'
import s from './KognitivBriefing.module.css'

const Icons = {
  brain: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12" /><circle cx="12" cy="12" r="3" /><path d="M12 9V5M15 12h4" /></svg>
  ),
  demo: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><polygon points="10 8 15 11 10 14 10 8" fill="currentColor" stroke="none" /></svg>
  ),
  pulse: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>
  ),
  calm: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21c-4-2-7-5.5-7-10a7 7 0 0 1 14 0c0 4.5-3 8-7 10z" /><path d="M9 11l2 2 4-4" /></svg>
  ),
}

const SCREENS = [
  { icon: 'brain', title: 'Trainiere dein Gehirn', text: 'Kurze, spielerische Übungen für Reaktion, Aufmerksamkeit, Gedächtnis und Impulskontrolle — ein paar Minuten am Tag genügen.' },
  { icon: 'demo',  title: 'Erst die Demo, dann los', text: 'Jedes Modul zeigt dir vorab in einer kleinen Schleife, wie es läuft. Du weißt also immer, was dich erwartet — bevor du startest.' },
  { icon: 'pulse', title: 'Tagesform zählt', text: 'Vor dem Training fragt ein kurzer Check-in nach Schlaf und Energie. Das hilft, deine Ergebnisse fair einzuordnen — Ausreißer sind normal.' },
  { icon: 'calm',  title: 'Dranbleiben schlägt Übertreiben', text: 'Eine Runde pro Modul und Tag reicht. Dein Gehirn braucht Zeit zum Verarbeiten — Regelmäßigkeit bringt mehr als Marathon-Sessions.' },
]

export default function KognitivBriefing({ onComplete }) {
  const [i, setI] = useState(0)
  const sc   = SCREENS[i]
  const last = i === SCREENS.length - 1

  return (
    <div className={s.root}>
      <div className={s.top}>
        <button className={s.skip} onClick={onComplete}>Überspringen</button>
      </div>

      <div className={s.body}>
        <div key={i} className={s.iconWrap}>{Icons[sc.icon]}</div>
        <h1 key={`t${i}`} className={s.title}>{sc.title}</h1>
        <p key={`p${i}`} className={s.text}>{sc.text}</p>
      </div>

      <div className={s.footer}>
        <div className={s.dots}>
          {SCREENS.map((_, n) => (
            <span key={n} className={[s.pdot, n === i ? s.pdotOn : ''].join(' ')} />
          ))}
        </div>
        <button className={s.cta} onClick={() => (last ? onComplete() : setI(i + 1))}>
          {last ? "Los geht's" : 'Weiter'}
        </button>
      </div>
    </div>
  )
}
