import { useState } from 'react'
import { ensureSeeded, saveExercise, deleteExercise } from '../fitnessStore'
import { MUSCLES, MUSCLE_LABELS, EQUIPMENT, EQUIPMENT_LABELS, createExercise } from '../fitnessModel'
import s from './UebungenTab.module.css'

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

// ─── Helpers ────────────────────────────────────────────────
function primaryMuscle(allocation) {
  const entries = Object.entries(allocation ?? {})
  if (!entries.length) return null
  return entries.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0]
}

function allocationSum(allocation) {
  return Object.values(allocation ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0)
}

export default function UebungenTab() {
  const [exercises, setExercises] = useState(() => ensureSeeded().exercises)
  const [selId, setSelId] = useState(null)
  const [search, setSearch] = useState('')

  const selected = exercises.find(e => e.id === selId) ?? null

  const handleNew = () => {
    const ex = createExercise({ name: 'Neue Übung', allocation: { brust: 100 } })
    setExercises(saveExercise(ex))
    setSelId(ex.id)
  }

  if (selected) {
    return (
      <DetailView
        exercise={selected}
        onBack={() => setSelId(null)}
        onSave={ex => { setExercises(saveExercise(ex)); setSelId(null) }}
        onDelete={id => { setExercises(deleteExercise(id)); setSelId(null) }}
      />
    )
  }

  const filtered = exercises
    .filter(e => e.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return (
    <div className={s.page}>
      <div className={s.searchRow}>
        <span className={s.searchIcon}><SearchIcon /></span>
        <input
          className={s.searchInput}
          type="text"
          placeholder="Übung suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <button className={s.newBtn} onClick={handleNew}>
        <PlusIcon /> Neue Übung
      </button>

      {filtered.length === 0 ? (
        <div className={s.empty}>Keine Übungen gefunden.</div>
      ) : (
        <div className={s.list}>
          {filtered.map(ex => {
            const pm = primaryMuscle(ex.allocation)
            return (
              <button key={ex.id} className={s.row} onClick={() => setSelId(ex.id)}>
                <span className={s.rowName}>{ex.name}</span>
                <span className={s.rowSub}>
                  {pm ? MUSCLE_LABELS[pm] : '—'} · {EQUIPMENT_LABELS[ex.equipment]}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Detail / Edit ──────────────────────────────────────────
function DetailView({ exercise, onBack, onSave, onDelete }) {
  const [draft, setDraft] = useState(exercise)
  const [confirmDel, setConfirmDel] = useState(false)

  const sum = allocationSum(draft.allocation)
  const sumOk = sum === 100
  const canSave = sumOk && draft.name.trim().length > 0

  const update = patch => setDraft(d => ({ ...d, ...patch }))

  const updateAllocation = (muscle, pct) => {
    setDraft(d => ({ ...d, allocation: { ...d.allocation, [muscle]: pct } }))
  }
  const removeAllocation = muscle => {
    setDraft(d => {
      const rest = { ...d.allocation }
      delete rest[muscle]
      return { ...d, allocation: rest }
    })
  }
  const addAllocation = muscle => {
    if (!muscle) return
    setDraft(d => ({ ...d, allocation: { ...d.allocation, [muscle]: 0 } }))
  }

  const availableMuscles = MUSCLES.filter(m => !(m in (draft.allocation ?? {})))

  const handleDelete = () => {
    if (confirmDel) { onDelete(draft.id); return }
    setConfirmDel(true)
    setTimeout(() => setConfirmDel(false), 2500)
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={onBack} aria-label="Zurück"><BackIcon /></button>
        <button className={s.saveBtn} onClick={() => onSave(draft)} disabled={!canSave}>Speichern</button>
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

      <div className={s.field}>
        <span className={s.label}>Kategorie</span>
        <div className={s.segmented}>
          {[['grund', 'Grundübung'], ['isolation', 'Isolationsübung']].map(([id, lb]) => (
            <button
              key={id}
              className={[s.segment, draft.kategorie === id ? s.segmentActive : ''].join(' ')}
              onClick={() => update({ kategorie: id })}
            >
              {lb}
            </button>
          ))}
        </div>
      </div>

      <div className={s.field}>
        <span className={s.label}>Equipment</span>
        <select
          className={s.select}
          value={draft.equipment}
          onChange={e => update({ equipment: e.target.value })}
        >
          {EQUIPMENT.map(eq => (
            <option key={eq} value={eq}>{EQUIPMENT_LABELS[eq]}</option>
          ))}
        </select>
      </div>

      <div className={s.field}>
        <span className={s.label}>Standard-Wdh-Bereich</span>
        <div className={s.rangeRow}>
          <input
            className={s.numInput}
            type="number"
            min="1"
            value={draft.defaultRepRange[0]}
            onChange={e => update({ defaultRepRange: [Number(e.target.value) || 0, draft.defaultRepRange[1]] })}
          />
          <span className={s.rangeSep}>–</span>
          <input
            className={s.numInput}
            type="number"
            min="1"
            value={draft.defaultRepRange[1]}
            onChange={e => update({ defaultRepRange: [draft.defaultRepRange[0], Number(e.target.value) || 0] })}
          />
        </div>
      </div>

      <div className={s.field}>
        <span className={s.label}>Pausenzeit (Sek., leer = automatisch)</span>
        <input
          className={s.numInput}
          type="number"
          min="0"
          step="10"
          placeholder="automatisch"
          value={draft.restSec ?? ''}
          onChange={e => update({ restSec: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>

      <div className={s.field}>
        <span className={s.label}>Notiz</span>
        <textarea
          className={s.textarea}
          value={draft.notiz}
          onChange={e => update({ notiz: e.target.value })}
        />
      </div>

      <div className={s.field}>
        <span className={s.label}>Allokation</span>
        <div className={s.allocList}>
          {Object.entries(draft.allocation ?? {}).map(([muscle, pct]) => (
            <div key={muscle} className={s.allocRow}>
              <span className={s.allocLabel}>{MUSCLE_LABELS[muscle]}</span>
              <input
                className={s.allocInput}
                type="number"
                min="0"
                max="100"
                value={pct}
                onChange={e => updateAllocation(muscle, Number(e.target.value) || 0)}
              />
              <span className={s.allocPct}>%</span>
              <button className={s.allocRemove} onClick={() => removeAllocation(muscle)} aria-label="Entfernen">
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        {availableMuscles.length > 0 && (
          <select
            className={s.select}
            value=""
            onChange={e => addAllocation(e.target.value)}
          >
            <option value="">+ Muskel hinzufügen…</option>
            {availableMuscles.map(m => (
              <option key={m} value={m}>{MUSCLE_LABELS[m]}</option>
            ))}
          </select>
        )}

        <div className={sumOk ? s.sumOk : s.sumWarn}>
          Summe: {sum} % {!sumOk && '(muss 100 sein)'}
        </div>
      </div>

      {draft.custom === true && (
        <button className={[s.deleteBtn, confirmDel ? s.deleteBtnConfirm : ''].join(' ')} onClick={handleDelete}>
          {confirmDel ? 'Wirklich löschen?' : 'Übung löschen'}
        </button>
      )}
    </div>
  )
}
