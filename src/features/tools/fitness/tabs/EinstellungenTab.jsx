import { useState } from 'react'
import { loadFitness, saveSettings, savePlan, ensureSeeded, loadSessions, getActivePlan } from '../fitnessStore'
import { EQUIPMENT, EQUIPMENT_LABELS } from '../fitnessModel'
import { generateCoachPlan, splitVariants, recommendedSplit } from '../coach/planGenerator'
import SplitPicker from '../coach/SplitPicker'
import RhythmPicker from '../coach/RhythmPicker'
import s from './EinstellungenTab.module.css'

const DAY_OPTIONS = [2, 3, 4, 5, 6]

export default function EinstellungenTab() {
  const [settings, setSettings] = useState(() => loadFitness().settings)
  const [fitness, setFitness] = useState(() => ensureSeeded())

  const update = (patch) => setSettings(saveSettings(patch))

  const activePlan = getActivePlan(fitness)
  const coachPlan = activePlan && activePlan.modus === 'coach' ? activePlan : null

  // ─── Coach-Split ändern ───────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [draftDays, setDraftDays] = useState(3)
  const [draftSplitId, setDraftSplitId] = useState(null)
  const [confirm, setConfirm] = useState(false)

  const currentVariant = coachPlan
    ? (splitVariants(coachPlan.coach.trainingDays).find(v => v.id === coachPlan.coach.splitId) ?? recommendedSplit(coachPlan.coach.trainingDays))
    : null

  const openEdit = () => {
    const days = coachPlan.coach.trainingDays
    setDraftDays(days)
    setDraftSplitId(coachPlan.coach.splitId ?? recommendedSplit(days).id)
    setConfirm(false)
    setEditing(true)
  }

  const pickDraftDays = (n) => {
    setDraftDays(n)
    setDraftSplitId(recommendedSplit(n).id)
    setConfirm(false)
  }

  const applySplit = () => {
    if (!confirm) {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 3000)
      return
    }
    const newCoach = { ...coachPlan.coach, trainingDays: draftDays, splitId: draftSplitId }
    const regen = generateCoachPlan(newCoach, fitness.exercises, loadSessions())
    savePlan({ ...regen, id: coachPlan.id, name: coachPlan.name })
    setFitness(loadFitness())
    setEditing(false)
    setConfirm(false)
  }

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
        <div className={s.sectionTitle}>Trainings-Rhythmus</div>
        <RhythmPicker value={settings.rhythm} onChange={(r) => update({ rhythm: r })} />
        <div className={s.hint}>Steuert nur den Hinweis im Heute-Tab (z. B. „heute Pause"). Reiner Vorschlag — blockt nie.</div>
      </div>

      {coachPlan && (
        <div className={s.section}>
          <div className={s.sectionTitle}>Coach-Split</div>
          {!editing ? (
            <>
              <div className={s.splitCurrent}>
                <span className={s.splitName}>{currentVariant.name}</span>
                <span className={s.splitDays}>{coachPlan.coach.trainingDays} Trainings</span>
              </div>
              <button type="button" className={s.actionBtn} onClick={openEdit}>Split ändern</button>
            </>
          ) : (
            <>
              <div className={s.segmented}>
                {DAY_OPTIONS.map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`${s.segment} ${draftDays === n ? s.segmentActive : ''}`}
                    onClick={() => pickDraftDays(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <SplitPicker trainingDays={draftDays} value={draftSplitId} onChange={(id) => { setDraftSplitId(id); setConfirm(false) }} />
              <div className={s.editActions}>
                <button type="button" className={s.actionBtnGhost} onClick={() => setEditing(false)}>Abbrechen</button>
                <button type="button" className={`${s.actionBtn} ${confirm ? s.actionBtnConfirm : ''}`} onClick={applySplit}>
                  {confirm ? 'Wirklich? Tag-Änderungen gehen verloren' : 'Anwenden'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

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
