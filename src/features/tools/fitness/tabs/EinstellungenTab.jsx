import { useState } from 'react'
import { loadFitness, saveSettings } from '../fitnessStore'
import { EQUIPMENT, EQUIPMENT_LABELS } from '../fitnessModel'
import s from './EinstellungenTab.module.css'

export default function EinstellungenTab() {
  const [settings, setSettings] = useState(() => loadFitness().settings)

  const update = (patch) => setSettings(saveSettings(patch))

  return (
    <div className={s.wrap}>
      <div className={s.title}>Einstellungen</div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Rest-Timer</div>
        <button
          type="button"
          className={`${s.toggleRow} ${settings.restTimerEnabled ? s.toggleOn : ''}`}
          onClick={() => update({ restTimerEnabled: !settings.restTimerEnabled })}
        >
          <span className={s.toggleTrack}>
            <span className={s.toggleThumb} />
          </span>
          <span className={s.toggleLabel}>Rest-Timer automatisch starten</span>
        </button>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Feedback-Modus</div>
        <div className={s.segmented}>
          <button
            type="button"
            className={`${s.segment} ${settings.feedbackMode === 'chips' ? s.segmentActive : ''}`}
            onClick={() => update({ feedbackMode: 'chips' })}
          >
            Chips
          </button>
          <button
            type="button"
            className={`${s.segment} ${settings.feedbackMode === 'rir' ? s.segmentActive : ''}`}
            onClick={() => update({ feedbackMode: 'rir' })}
          >
            RIR
          </button>
        </div>
        <div className={s.hint}>Wie du nach jedem Satz Rückmeldung gibst (Coach-Modus).</div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Gewichts-Inkremente</div>
        <div className={s.incList}>
          {EQUIPMENT.map(eq => (
            <div key={eq} className={s.incRow}>
              <span className={s.incLabel}>{EQUIPMENT_LABELS[eq]}</span>
              <input
                type="number"
                step="0.5"
                min="0"
                className={s.incInput}
                value={settings.increments[eq]}
                onChange={e => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value)
                  update({ increments: { ...settings.increments, [eq]: value } })
                }}
              />
              <span className={s.incUnit}>kg</span>
            </div>
          ))}
        </div>
        <div className={s.hint}>Kleinste Gewichtsschritte pro Gerätetyp (für Coach-Empfehlungen).</div>
      </div>
    </div>
  )
}
