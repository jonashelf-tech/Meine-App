import { useState, useEffect, useRef } from 'react'
import { getLastCheckin, saveCheckin } from './checkinStore'
import { getDayState } from '../../daily/dailyState'
import { todayKey } from '../../../utils'
import Overlay from '../../../components/Overlay/Overlay'
import s from './CheckinModal.module.css'

const TIMER_SECS = 120

function DotSlider({ value, onChange }) {
  return (
    <div className={s.dots}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={[s.dot, value >= n ? s.dotOn : ''].join(' ')}
          onClick={() => onChange(n)}
          aria-label={`${n} von 5`}
        />
      ))}
    </div>
  )
}

function ArrivalTimer({ entry, onDone }) {
  const [remaining, setRemaining] = useState(TIMER_SECS)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (remaining === 0) onDone(entry)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')
  const pct  = (remaining / TIMER_SECS) * 100
  const R = 86
  const C = 2 * Math.PI * R

  return (
    <div className={s.timerWrap}>
      <div className={s.timerTitle}>Kurz ankommen</div>
      <div className={s.timerSub}>
        Nimm dir einen Moment, bevor du startest — damit deine Werte aussagekräftiger sind.
      </div>
      <div className={s.timerRing}>
        <svg viewBox="0 0 200 200" className={s.timerSvg}>
          <circle cx="100" cy="100" r={R} className={s.timerTrack} />
          <circle
            cx="100" cy="100" r={R}
            className={s.timerArc}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
          />
        </svg>
        <div className={s.timerCount}>{mins}:{secs}</div>
      </div>
      <button className={s.skipBtn} onClick={() => onDone(entry)}>
        Überspringen
      </button>
    </div>
  )
}

export default function CheckinModal({ onSave, onSkip }) {
  const last  = getLastCheckin()
  // Heute schon erfasst (z.B. in Growth) → Werte vorbelegen, keine Doppelerfassung
  const heute = getDayState(todayKey())

  const [sleep,    setSleep]    = useState(heute?.sleep  ?? last?.sleep           ?? 3)
  const [energy,   setEnergy]   = useState(heute?.energy ?? last?.energy          ?? 3)
  const [mediName, setMediName] = useState(last?.medi?.name      ?? '')
  const [mediDos,  setMediDos]  = useState(last?.medi?.dosierung ?? '')
  const [mediTime, setMediTime] = useState('')
  const [note,     setNote]     = useState('')

  const [timerEntry, setTimerEntry] = useState(null)

  const handleSave = () => {
    const medi = mediName.trim()
      ? { name: mediName.trim(), dosierung: mediDos.trim(), uhrzeit: mediTime || null }
      : null
    const entry = saveCheckin({ sleep, energy, medi, note: note.trim() })
    setTimerEntry(entry)
  }

  if (timerEntry) {
    return (
      <Overlay variant="sheet">
        <div className={s.modal}>
          <ArrivalTimer entry={timerEntry} onDone={onSave} />
        </div>
      </Overlay>
    )
  }

  return (
    <Overlay variant="sheet">
      <div className={s.modal}>
        <div className={s.header}>
          <div className={s.title}>Wie geht's dir heute?</div>
          <div className={s.sub}>Hilft dabei, die Ergebnisse einzuordnen</div>
        </div>

        <div className={s.body}>
          <div className={s.row}>
            <span className={s.label}>Schlaf</span>
            <DotSlider value={sleep} onChange={setSleep} />
          </div>
          <div className={s.row}>
            <span className={s.label}>Energie</span>
            <DotSlider value={energy} onChange={setEnergy} />
          </div>

          <div className={s.mediSection}>
            <div className={s.mediLabel}>Medikament</div>
            <input
              className={s.input}
              placeholder="Name (z.B. Ritalin)"
              value={mediName}
              onChange={e => setMediName(e.target.value)}
            />
            <div className={s.mediRow}>
              <input
                className={s.input}
                placeholder="Dosierung (z.B. 20mg)"
                value={mediDos}
                onChange={e => setMediDos(e.target.value)}
              />
              <input
                className={[s.input, s.timeInput].join(' ')}
                type="time"
                value={mediTime}
                onChange={e => setMediTime(e.target.value)}
              />
            </div>
          </div>

          <textarea
            className={s.textarea}
            placeholder="Notiz (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
          />
        </div>

        <div className={s.actions}>
          <button className={s.skipBtn} onClick={onSkip}>Überspringen</button>
          <button className={s.saveBtn} onClick={handleSave}>Fertig →</button>
        </div>
      </div>
    </Overlay>
  )
}
