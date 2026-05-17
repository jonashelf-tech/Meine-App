import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { todayKey, sk, skLabel, parseHHMM, minsToHHMM } from '../../../utils'
import { isTermin } from '../../todos/Block'
import QuickAdd     from '../QuickAdd/QuickAdd'
import Zeitplan     from '../Zeitplan/Zeitplan'
import Pool         from '../Pool/Pool'
import KiPlanSection from '../KiPlanSection/KiPlanSection'
import s from './TabHeute.module.css'

const MODI = [
  { id: 'manuell', label: 'Manuell' },
  { id: 'ki',      label: 'KI-Plan' },
  { id: 'rad',     label: 'Rad' },
]

export default function TabHeute() {
  const { todos, setTodos, days, setDays } = useAppStore()

  const [modus,    setModus]    = useState('manuell')
  const [visStart, setVisStart] = useState(8)
  const [visEnd]                = useState(20)

  const viewDate  = todayKey()
  const todaySlots = days[viewDate] ?? {}

  // ─── Helpers ─────────────────────────────────────────────
  const setTodaySlots = useCallback((updater) => {
    setDays(prev => {
      const current = prev[viewDate] ?? {}
      const next    = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [viewDate]: next }
    })
  }, [setDays, viewDate])

  // ─── handleAdd ───────────────────────────────────────────
  const handleAdd = useCallback((block) => {
    if (isTermin(block) && block.time) {
      // Parse time → slot key
      const mins   = parseHHMM(block.time)
      const hour   = Math.floor(mins / 60)
      const half   = mins % 60 >= 30
      const slotKey = sk(hour, half)

      setTodaySlots(prev => ({
        ...prev,
        [slotKey]: {
          text:     block.text,
          todoId:   block.id,
          color:    block.color,
          duration: block.duration || 30,
          done:     false,
          locked:   false,
        },
      }))
      // Also add to todos list
      setTodos(prev => [...prev, block])
    } else {
      setTodos(prev => [...prev, block])
    }
  }, [setTodaySlots, setTodos])

  // ─── Todo mutations ───────────────────────────────────────
  const handleToggleDone = useCallback((id) => {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null } : t)
    )
  }, [setTodos])

  const handleRemove = useCallback((id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [setTodos])

  // ─── Slot mutations ───────────────────────────────────────
  const handleToggleSlotDone = useCallback((slotKey) => {
    setTodaySlots(prev => {
      const slot = prev[slotKey]
      if (!slot) return prev
      return { ...prev, [slotKey]: { ...slot, done: !slot.done } }
    })
  }, [setTodaySlots])

  const handleRemoveSlot = useCallback((slotKey, mode) => {
    setTodaySlots(prev => {
      const next = { ...prev }
      delete next[slotKey]
      return next
    })
    if (mode === 'delete') {
      const slot = todaySlots[slotKey]
      if (slot?.todoId) {
        setTodos(prev => prev.filter(t => t.id !== slot.todoId))
      }
    }
  }, [setTodaySlots, todaySlots, setTodos])

  // ─── Drag & drop ─────────────────────────────────────────
  const handleDragStart = useCallback((text, color, dropCb) => {
    // Pool drag start — TabHeute stores pending drag context
    // The actual drop is handled by Zeitplan's slot click or future pointer logic
    // For now, we just register so Zeitplan can consume it
    window.__pendingDrag = { text, color, dropCb }
  }, [])

  const handleSetSlot = useCallback((slotKey, slotData) => {
    if (slotData === null) {
      setTodaySlots(prev => {
        const next = { ...prev }
        delete next[slotKey]
        return next
      })
    } else {
      setTodaySlots(prev => ({ ...prev, [slotKey]: slotData }))
    }
  }, [setTodaySlots])

  // ─── KI-Plan accept ───────────────────────────────────────
  const handleKiAccept = useCallback((plan) => {
    setTodaySlots(prev => ({ ...prev, ...plan }))
  }, [setTodaySlots])

  return (
    <div className={s.page}>
      <QuickAdd onAdd={handleAdd} />

      {/* Modus row */}
      <div className={s.modusRow}>
        {MODI.map(m => (
          <button
            key={m.id}
            className={[s.modusBtn, modus === m.id ? s.modusBtnActive : ''].join(' ')}
            onClick={() => setModus(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {modus === 'manuell' && (
        <>
          <Zeitplan
            slots={todaySlots}
            todos={todos}
            visibleStart={visStart}
            visibleEnd={visEnd}
            onSetSlot={handleSetSlot}
            onToggleSlotDone={handleToggleSlotDone}
            onEditTodo={() => {/* TODO: open edit modal */}}
            onRemoveSlot={handleRemoveSlot}
            onVisibleStartChange={setVisStart}
          />
          <Pool
            todos={todos}
            todaySlots={todaySlots}
            onToggleDone={handleToggleDone}
            onEdit={() => {/* TODO: open edit modal */}}
            onRemove={handleRemove}
            onDragStart={handleDragStart}
          />
        </>
      )}

      {modus === 'ki' && (
        <KiPlanSection
          todos={todos}
          slots={todaySlots}
          onAccept={handleKiAccept}
        />
      )}

      {modus === 'rad' && (
        <div className={s.radPlaceholder}>
          Zufallsrad — wird als Tool verfügbar
        </div>
      )}
    </div>
  )
}
