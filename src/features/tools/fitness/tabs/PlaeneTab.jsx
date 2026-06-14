import { useState } from 'react'
import { ensureSeeded, savePlan, deletePlan, setActivePlan } from '../fitnessStore'
import { createPlan, createPlanDay } from '../fitnessModel'
import s from './PlaeneTab.module.css'

// ─── SVG Icons ────────────────────────────────────────────
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

export default function PlaeneTab() {
  const init = ensureSeeded()
  const [plans, setPlans] = useState(init.plans)
  const [activeId, setActiveId] = useState(init.meta.activePlanId)
  const exercises = init.exercises
  const [selId, setSelId] = useState(null)

  const selected = plans.find(p => p.id === selId) ?? null

  const handleNew = () => {
    const plan = createPlan({})
    setPlans(savePlan(plan))
    setSelId(plan.id)
  }

  const handleSetActive = id => {
    const meta = setActivePlan(id)
    setActiveId(meta.activePlanId)
  }

  if (selected) {
    return (
      <DetailView
        plan={selected}
        exercises={exercises}
        onBack={() => setSelId(null)}
        onSave={plan => { setPlans(savePlan(plan)); setSelId(null) }}
        onDelete={id => {
          const { plans: nextPlans, meta } = deletePlan(id)
          setPlans(nextPlans)
          setActiveId(meta.activePlanId)
          setSelId(null)
        }}
      />
    )
  }

  return (
    <div className={s.page}>
      <button className={s.newBtn} onClick={handleNew}>
        <PlusIcon /> Neuer Plan
      </button>

      {plans.length === 0 ? (
        <div className={s.empty}>Noch keine Pläne angelegt.</div>
      ) : (
        <div className={s.list}>
          {plans.map(plan => (
            <div key={plan.id} className={s.row} onClick={() => setSelId(plan.id)}>
              <div className={s.rowMain}>
                <span className={s.rowName}>{plan.name}</span>
                <span className={s.rowSub}>{plan.days.length} Tage</span>
              </div>
              {plan.id === activeId ? (
                <span className={s.activeBadge}>Aktiv</span>
              ) : (
                <button
                  className={s.activateBtn}
                  onClick={e => { e.stopPropagation(); handleSetActive(plan.id) }}
                >
                  Aktiv setzen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Detail / Edit ──────────────────────────────────────────
function DetailView({ plan, exercises, onBack, onSave, onDelete }) {
  const [draft, setDraft] = useState(plan)
  const [confirmDel, setConfirmDel] = useState(false)
  const [pickerDayId, setPickerDayId] = useState(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [confirmDelDay, setConfirmDelDay] = useState(null)

  const update = patch => setDraft(d => ({ ...d, ...patch }))

  const updateDay = (dayId, patch) => {
    setDraft(d => ({
      ...d,
      days: d.days.map(day => day.id === dayId ? { ...day, ...patch } : day),
    }))
  }

  const removeDay = dayId => {
    if (confirmDelDay !== dayId) {
      setConfirmDelDay(dayId)
      setTimeout(() => setConfirmDelDay(c => c === dayId ? null : c), 2500)
      return
    }
    setDraft(d => ({ ...d, days: d.days.filter(day => day.id !== dayId) }))
    setConfirmDelDay(null)
  }

  const addDay = () => {
    setDraft(d => ({ ...d, days: [...d.days, createPlanDay({ name: 'Tag ' + (d.days.length + 1) })] }))
  }

  const updateExercise = (dayId, idx, patch) => {
    setDraft(d => ({
      ...d,
      days: d.days.map(day => day.id === dayId
        ? { ...day, exercises: day.exercises.map((ex, i) => i === idx ? { ...ex, ...patch } : ex) }
        : day),
    }))
  }

  const removeExercise = (dayId, idx) => {
    setDraft(d => ({
      ...d,
      days: d.days.map(day => day.id === dayId
        ? { ...day, exercises: day.exercises.filter((_, i) => i !== idx) }
        : day),
    }))
  }

  const addExercise = (dayId, exercise) => {
    setDraft(d => ({
      ...d,
      days: d.days.map(day => day.id === dayId
        ? { ...day, exercises: [...day.exercises, {
            exerciseId: exercise.id,
            zielSaetze: 3,
            zielWdh: [...exercise.defaultRepRange],
            zielGewicht: null,
            zielRir: null,
          }] }
        : day),
    }))
    setPickerDayId(null)
    setPickerSearch('')
  }

  const handleDelete = () => {
    if (confirmDel) { onDelete(draft.id); return }
    setConfirmDel(true)
    setTimeout(() => setConfirmDel(false), 2500)
  }

  const exerciseName = id => exercises.find(e => e.id === id)?.name ?? '—'

  const filteredPicker = exercises
    .filter(e => e.name.toLowerCase().includes(pickerSearch.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={onBack} aria-label="Zurück"><BackIcon /></button>
        <button className={s.saveBtn} onClick={() => onSave(draft)} disabled={draft.name.trim().length === 0}>Speichern</button>
      </div>

      <div className={s.field}>
        <span className={s.label}>Name</span>
        <input
          className={s.textInput}
          type="text"
          value={draft.name}
          onChange={e => update({ name: e.target.value })}
        />
      </div>

      <div className={s.modeChip}>Free Mode</div>

      <div className={s.daysList}>
        {draft.days.map(day => (
          <div key={day.id} className={s.dayCard}>
            <div className={s.dayHeader}>
              <input
                className={s.dayNameInput}
                type="text"
                value={day.name}
                onChange={e => updateDay(day.id, { name: e.target.value })}
              />
              <button
                className={[s.iconBtn, confirmDelDay === day.id ? s.iconBtnConfirm : ''].join(' ')}
                onClick={() => removeDay(day.id)}
                aria-label="Tag entfernen"
              >
                <TrashIcon />
              </button>
            </div>

            {day.exercises.length === 0 ? (
              <div className={s.dayEmpty}>Noch keine Übungen.</div>
            ) : (
              <div className={s.exList}>
                {day.exercises.map((ex, idx) => (
                  <div key={idx} className={s.exRow}>
                    <span className={s.exName}>{exerciseName(ex.exerciseId)}</span>
                    <div className={s.exInputs}>
                      <div className={s.exField}>
                        <span className={s.exFieldLabel}>Sätze</span>
                        <input
                          className={s.numInput}
                          type="number"
                          min="1"
                          value={ex.zielSaetze}
                          onChange={e => updateExercise(day.id, idx, { zielSaetze: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className={s.exField}>
                        <span className={s.exFieldLabel}>Wdh</span>
                        <div className={s.rangeRow}>
                          <input
                            className={s.numInput}
                            type="number"
                            min="1"
                            value={ex.zielWdh[0]}
                            onChange={e => updateExercise(day.id, idx, { zielWdh: [Number(e.target.value) || 0, ex.zielWdh[1]] })}
                          />
                          <span className={s.rangeSep}>–</span>
                          <input
                            className={s.numInput}
                            type="number"
                            min="1"
                            value={ex.zielWdh[1]}
                            onChange={e => updateExercise(day.id, idx, { zielWdh: [ex.zielWdh[0], Number(e.target.value) || 0] })}
                          />
                        </div>
                      </div>
                      <button className={s.iconBtn} onClick={() => removeExercise(day.id, idx)} aria-label="Übung entfernen">
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className={s.addExBtn} onClick={() => { setPickerDayId(day.id); setPickerSearch('') }}>
              <PlusIcon /> Übung
            </button>
          </div>
        ))}
      </div>

      <button className={s.newBtn} onClick={addDay}>
        <PlusIcon /> Tag
      </button>

      <button className={[s.deleteBtn, confirmDel ? s.deleteBtnConfirm : ''].join(' ')} onClick={handleDelete}>
        {confirmDel ? 'Wirklich löschen?' : 'Plan löschen'}
      </button>

      {pickerDayId && (
        <div className={s.pickerOverlay}>
          <div className={s.pickerHeader}>
            <span className={s.pickerTitle}>Übung wählen</span>
            <button className={s.back} onClick={() => setPickerDayId(null)} aria-label="Schließen">
              <BackIcon />
            </button>
          </div>
          <div className={s.searchRow}>
            <span className={s.searchIcon}><SearchIcon /></span>
            <input
              className={s.searchInput}
              type="text"
              placeholder="Übung suchen…"
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className={s.pickerList}>
            {filteredPicker.length === 0 ? (
              <div className={s.empty}>Keine Übungen gefunden.</div>
            ) : (
              filteredPicker.map(ex => (
                <button key={ex.id} className={s.pickerRow} onClick={() => addExercise(pickerDayId, ex)}>
                  {ex.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
