// Schlaf / Energie / Stimmung — zentraler Daily-State, geteilt mit Kognitiv.
// Bereits erfasste Werte werden nur angezeigt (antippbar zum Korrigieren),
// fehlende per 1 Tap erfasst. Alles optional — kein Zwang, kein Gate.
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
  useEffect(() => { setState(getDayState(date)) }, [date])

  const setField = (key, val) => {
    if (!editable) return
    setState(setDayState(date, { [key]: val }))
    onTouched?.()
  }

  return (
    <div className={s.row}>
      {FELDER.map(({ key, label }) => (
        <div key={key} className={s.feld}>
          <span className={s.label}>{label}</span>
          <div className={s.dots}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                className={[s.dot, (state?.[key] ?? 0) >= n ? s.dotOn : ''].join(' ')}
                onClick={() => setField(key, n)}
                disabled={!editable}
                aria-label={`${label} ${n} von 5`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
