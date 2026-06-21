// Schritt „Karte": die Tageskarte (oder eine Bonuskarte) als fokussierter Step.
// Logik aus dem alten TageskarteCard, Layout = Vollbild mit Stagger.
import { useState } from 'react'
import { karteById, KATEGORIEN } from './growthStore'
import { useAutosave } from './useAutosave'
import s from './StepKarte.module.css'

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
)
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
)

export default function StepKarte({ eintrag, date, editable, istTageskarte, skipMoeglich, onPatch, onAndereKarte, onSkip, onStartTimer, onWeiter }) {
  const karte = karteById(eintrag.kartenId)
  const [warumOffen, setWarumOffen] = useState(false)
  const [antwort, onAntwort] = useAutosave(eintrag.antwort ?? '', (t) => onPatch({ antwort: t }), [date, eintrag.kartenId])
  if (!karte) return null
  const kategorie = KATEGORIEN.find(k => k.id === karte.kategorie)
  // „Weiter" erst möglich, wenn etwas dasteht (Antwort) oder die Aufgabe erledigt ist.
  const canWeiter = antwort.trim().length > 0 || eintrag.erledigt

  return (
    <div className={s.step}>
      <div className={s.head}>
        <span className={s.eyebrow}>{kategorie?.name}{!istTageskarte && ' · Bonus'}</span>
        <div className={s.headActions}>
          {skipMoeglich && <button className={s.skip} onClick={onAndereKarte}>Andere Karte</button>}
          <button className={s.skip} onClick={onSkip}>Überspringen</button>
        </div>
      </div>
      <div className={s.text}>{karte.text}</div>
      {karte.warum && (
        <div className={s.warumWrap}>
          <button className={s.warumLink} onClick={() => setWarumOffen(v => !v)}>Warum diese Frage?</button>
          {warumOffen && <div className={s.warumText}>{karte.warum}</div>}
        </div>
      )}
      {karte.typ === 'timer-aufgabe' && editable && !eintrag.erledigt && (
        <button className={s.timerBtn} onClick={() => onStartTimer(karte)}><PlayIcon /> {karte.timer} min starten</button>
      )}
      {(karte.typ === 'aufgabe' || karte.typ === 'timer-aufgabe') && (
        <button
          className={[s.erledigtBtn, eintrag.erledigt ? s.erledigtOn : ''].join(' ')}
          onClick={() => editable && onPatch({ erledigt: !eintrag.erledigt })}
          disabled={!editable}
        >
          {eintrag.erledigt ? <><CheckIcon /> Erledigt</> : 'Erledigt'}
        </button>
      )}
      <textarea
        className={s.antwort}
        value={antwort}
        onChange={e => onAntwort(e.target.value)}
        placeholder="Ein Satz reicht."
        rows={3}
        disabled={!editable}
      />
      <button className={s.cta} onClick={onWeiter} disabled={!canWeiter}>Weiter</button>
    </div>
  )
}
