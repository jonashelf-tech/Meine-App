// Schlaf / Energie / Stimmung — zentraler Daily-State, geteilt mit Kognitiv.
// Pro Feld eine Segment-Leiste (1–5) über die volle Breite: große Tap-Ziele,
// kumulative Füllung wie ein Pegel. Nicht erfasst = alle Segmente leer.
// Alles optional — kein Zwang, kein Gate.
import { useState, useEffect } from 'react'
import { getDayState, setDayState } from '../../daily/dailyState'
import s from './DailyStateRow.module.css'

const FELDER = [
  { key: 'sleep',  label: 'Schlaf' },
  { key: 'energy', label: 'Energie' },
  { key: 'mood',   label: 'Stimmung' },
]

export default function DailyStateRow({ date, editable, onTouched }) {
  const [state, setState] = useState(() => getDayState(date))
  const [popped, setPopped] = useState(null) // `${key}-${n}` — kurzer Tipp-Pop
  useEffect(() => { setState(getDayState(date)) }, [date])

  const setField = (key, val) => {
    if (!editable) return
    setState(setDayState(date, { [key]: val }))
    onTouched?.()
    const id = `${key}-${val}`
    setPopped(id)
    setTimeout(() => setPopped(p => (p === id ? null : p)), 260)
  }

  return (
    <div className={s.wrap}>
      {FELDER.map(({ key, label }) => {
        const val = state?.[key] ?? 0
        return (
          <div key={key} className={s.feld}>
            <span className={s.label}>{label}</span>
            <div className={s.bar} role="group" aria-label={label}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={[s.seg, val >= n ? s.segOn : '', popped === `${key}-${n}` ? s.pop : ''].join(' ')}
                  onClick={() => setField(key, n)}
                  disabled={!editable}
                  aria-label={`${label} ${n} von 5`}
                  aria-pressed={val === n}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
