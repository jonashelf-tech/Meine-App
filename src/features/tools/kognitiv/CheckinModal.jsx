import { useState } from 'react'
import { getLastCheckin, saveCheckin } from './checkinStore'
import s from './CheckinModal.module.css'

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

export default function CheckinModal({ onSave, onSkip }) {
  const last = getLastCheckin()

  const [sleep,    setSleep]    = useState(last?.sleep           ?? 3)
  const [energy,   setEnergy]   = useState(last?.energy          ?? 3)
  const [mediName, setMediName] = useState(last?.medi?.name      ?? '')
  const [mediDos,  setMediDos]  = useState(last?.medi?.dosierung ?? '')
  const [mediTime, setMediTime] = useState('')   // intentionally never pre-filled
  const [note,     setNote]     = useState('')

  const handleSave = () => {
    const medi = mediName.trim()
      ? { name: mediName.trim(), dosierung: mediDos.trim(), uhrzeit: mediTime || null }
      : null
    const entry = saveCheckin({ sleep, energy, medi, note: note.trim() })
    onSave(entry)
  }

  return (
    <div className={s.backdrop}>
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
    </div>
  )
}
