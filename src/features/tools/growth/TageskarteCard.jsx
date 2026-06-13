// Eine Karte (Tageskarte oder Bonus): frage | aufgabe | timer-aufgabe.
// Antwort autosaved; „Warum?"-Aufklapper nur wenn die Karte ein warum-Feld hat.
import { useState } from 'react'
import { karteById, KATEGORIEN } from './growthStore'
import { useAutosave } from './useAutosave'
import s from './TageskarteCard.module.css'

export default function TageskarteCard({
  eintrag,          // { kartenId, antwort, erledigt }
  date,
  editable,
  istTageskarte,
  skipMoeglich,     // nur heute, nur 1×, nur Tageskarte
  autoOpen,         // Timer-Rückkehr: Antwortfeld direkt öffnen
  onPatch,          // (patch) => void  — { antwort } | { erledigt }
  onSkip,
  onStartTimer,     // (karte) => void
}) {
  const karte = karteById(eintrag.kartenId)
  const [warumOffen, setWarumOffen] = useState(false)
  const [antwortOffen, setAntwortOffen] = useState(
    autoOpen || Boolean((eintrag.antwort ?? '').trim()) || karte?.typ === 'frage'
  )

  const [antwort, onAntwort] = useAutosave(
    eintrag.antwort ?? '',
    (text) => onPatch({ antwort: text }),
    [date, eintrag.kartenId],
  )

  if (!karte) return null
  const kategorie = KATEGORIEN.find(k => k.id === karte.kategorie)

  return (
    <div className={s.card}>
      <div className={s.head}>
        <span className={s.kategorie}>{kategorie?.name}{!istTageskarte && ' · Bonus'}</span>
        {skipMoeglich && (
          <button className={s.skipBtn} onClick={onSkip}>Überspringen</button>
        )}
      </div>

      <div className={s.text}>{karte.text}</div>

      {karte.warum && (
        <div className={s.warumWrap}>
          <button className={s.warumLink} onClick={() => setWarumOffen(v => !v)}>
            Warum diese Frage? {warumOffen ? '▴' : '▾'}
          </button>
          {warumOffen && <div className={s.warumText}>{karte.warum}</div>}
        </div>
      )}

      {karte.typ === 'timer-aufgabe' && editable && !eintrag.erledigt && (
        <button className={s.timerBtn} onClick={() => onStartTimer(karte)}>
          ▶ {karte.timer} min starten
        </button>
      )}

      {(karte.typ === 'aufgabe' || karte.typ === 'timer-aufgabe') && (
        <button
          className={[s.erledigtBtn, eintrag.erledigt ? s.erledigtOn : ''].join(' ')}
          onClick={() => editable && onPatch({ erledigt: !eintrag.erledigt })}
          disabled={!editable}
        >
          {eintrag.erledigt ? '✓ Erledigt' : 'Erledigt'}
        </button>
      )}

      {editable ? (
        antwortOffen ? (
          <textarea
            className={s.antwort}
            value={antwort}
            onChange={e => onAntwort(e.target.value)}
            placeholder="Ein Satz reicht."
            rows={2}
            autoFocus={autoOpen}
          />
        ) : (
          <button className={s.antwortToggle} onClick={() => setAntwortOffen(true)}>
            + Notiz dazu
          </button>
        )
      ) : (
        (eintrag.antwort ?? '').trim() && <div className={s.antwortRead}>{eintrag.antwort}</div>
      )}
    </div>
  )
}
