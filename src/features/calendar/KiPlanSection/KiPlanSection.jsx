import { useState } from 'react'
import { sk, skLabel, getDurationKeys, ALL_SLOT_KEYS } from '../../../utils'
import SettingsIcon from '../../../components/SettingsIcon'
import s from './KiPlanSection.module.css'

// ─── Algo plan builder ────────────────────────────────────
function buildAlgoPlan(todos, slots, startHour, maxCount) {
  const placedTexts = new Set(
    Object.values(slots).filter(Boolean).map(sl => sl.text).filter(Boolean)
  )
  const placedIds = new Set(
    Object.values(slots).filter(Boolean).map(sl => sl.todoId).filter(Boolean)
  )

  const open = todos.filter(t =>
    !t.done &&
    !placedTexts.has(t.text) &&
    !placedIds.has(t.id)
  )

  // Sort: priority asc (1 first), then duration desc
  const sorted = [...open].sort((a, b) => {
    const pa = a.priority ?? 3
    const pb = b.priority ?? 3
    if (pa !== pb) return pa - pb
    return (b.duration || 30) - (a.duration || 30)
  })

  const result = {}
  let currentIdx = ALL_SLOT_KEYS.indexOf(sk(startHour, false))
  if (currentIdx < 0) currentIdx = 0

  let placed = 0
  for (const todo of sorted) {
    if (placed >= maxCount) break
    if (currentIdx >= ALL_SLOT_KEYS.length) break

    const slotKey = ALL_SLOT_KEYS[currentIdx]
    const dur = todo.duration || 30
    const spanned = getDurationKeys(slotKey, dur)

    // Check if all spanned slots are free
    const allFree = spanned.every(k => !result[k] && !slots[k])
    if (!allFree) {
      currentIdx++
      continue
    }

    result[slotKey] = {
      text:    todo.text,
      todoId:  todo.id,
      color:   todo.color || '#8B5CF6',
      duration: dur,
      locked:  false,
    }

    const slotCount = Math.ceil(dur / 30)
    currentIdx += slotCount
    placed++
  }

  return result
}

// ─── KiPlanSection ───────────────────────────────────────
export default function KiPlanSection({ todos = [], slots = {}, onAccept }) {
  const [startHour, setStartHour] = useState(8)
  const [count, setCount]         = useState(5)
  const [proposal, setProposal]   = useState(null) // null | {}

  const openTodos = todos.filter(t => !t.done)

  const handleBuild = () => {
    const plan = buildAlgoPlan(todos, slots, startHour, count)
    setProposal(plan)
  }

  const handleAccept = () => {
    onAccept?.(proposal)
    setProposal(null)
  }

  const handleDiscard = () => setProposal(null)

  return (
    <div className={s.section}>
      {/* Info */}
      <p className={s.info}>
        <span className={s.infoNum}>{openTodos.length}</span>
        <span className={s.infoLabel}> offene Todos</span>
      </p>

      {/* Controls */}
      <div className={s.controls}>
        <label className={s.ctrlGroup}>
          <span className={s.ctrlLabel}>Ab</span>
          <select
            className={s.select}
            value={startHour}
            onChange={e => setStartHour(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 6).map(h => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>

        <div className={s.stepper}>
          <button
            className={s.stepBtn}
            onClick={() => setCount(c => Math.max(1, c - 1))}
            aria-label="Weniger"
          >−</button>
          <span className={s.stepNum}>{count}</span>
          <button
            className={s.stepBtn}
            onClick={() => setCount(c => Math.min(10, c + 1))}
            aria-label="Mehr"
          >+</button>
        </div>

        <button className={s.buildBtn} onClick={handleBuild}>
          <SettingsIcon size={14} />Plan erstellen
        </button>
      </div>

      {/* Proposal list */}
      {proposal && (
        <div className={s.proposal}>
          <div className={s.proposalList}>
            {Object.entries(proposal).length === 0 ? (
              <p className={s.noItems}>Keine Todos zum Einplanen</p>
            ) : (
              Object.entries(proposal).map(([key, slot]) => (
                <div key={key} className={s.proposalItem}>
                  <span
                    className={s.proposalStripe}
                    style={{ background: slot.color }}
                  />
                  <span className={s.proposalTime}>{skLabel(key)}</span>
                  <span className={s.proposalText}>{slot.text}</span>
                  <span className={s.proposalDur}>{slot.duration}min</span>
                </div>
              ))
            )}
          </div>

          <div className={s.proposalActions}>
            <button className={s.acceptBtn} onClick={handleAccept}>
              ✓ Übernehmen
            </button>
            <button className={s.discardBtn} onClick={handleDiscard}>
              Verwerfen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
