import { useState, useCallback, useMemo } from 'react'
import { todayKey, ALL_SLOT_KEYS } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { setReminderLastAdded } from '../../tools/reminder/reminderData'

export function useSlotMutations({ viewDate, days, setDays, setTodos }) {
  const [visStart, setVisStart] = useState(() => lv(SK.visStart, 8))
  const [visEnd,   setVisEnd]   = useState(() => lv(SK.visEnd,   18))

  const todaySlots = useMemo(() => days[viewDate] ?? {}, [days, viewDate])

  const setTodaySlots = useCallback((updater) => {
    setDays(prev => {
      const current = prev[viewDate] ?? {}
      const next    = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [viewDate]: next }
    })
  }, [setDays, viewDate])

  const handleToggleSlotDone = useCallback((slotKey) => {
    setTodaySlots(prev => {
      const slot = prev[slotKey]
      if (!slot) return prev
      const nowDone = !slot.done
      if (nowDone && slot.reminderItemId) {
        setReminderLastAdded(slot.reminderItemId, todayKey())
      }
      return { ...prev, [slotKey]: { ...slot, done: nowDone } }
    })
  }, [setTodaySlots])

  const handleToggleLock = useCallback((slotKey) => {
    setTodaySlots(prev => {
      const slot = prev[slotKey]
      if (!slot) return prev
      return { ...prev, [slotKey]: { ...slot, locked: !slot.locked } }
    })
  }, [setTodaySlots])

  const handleRemoveSlot = useCallback((slotKey, mode) => {
    const slot = todaySlots[slotKey]
    setTodaySlots(prev => {
      const next = { ...prev }
      delete next[slotKey]
      return next
    })
    if (mode === 'delete') {
      if (slot?.todoId) {
        setTodos(prev => prev.filter(t => t.id !== slot.todoId))
      }
    } else if (mode === 'back') {
      if (slot?.todoId) {
        setTodos(prev => prev.map(t =>
          t.id === slot.todoId ? { ...t, date: null, time: null } : t
        ))
      }
    }
  }, [setTodaySlots, todaySlots, setTodos])

  const handleSetSlot = useCallback((slotKey, slotData) => {
    if (slotKey === 'pool') return  // 'pool' ist Drop-Zone, kein echter Slot-Key
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

  const saveVis = (start, end) => {
    sv(SK.visStart, start)
    sv(SK.visEnd,   end)
  }

  const handleBandExpand = useCallback((dir) => {
    if (dir === 'top')  setVisStart(v => { const n = Math.max(0, v - 1);  saveVis(n, visEnd); return n })
    else                setVisEnd(v   => { const n = Math.min(23, v + 1); saveVis(visStart, n); return n })
  }, [visStart, visEnd])

  // Verkleinern: trimmt nur leere Randzeit — belegte Stunden bleiben sichtbar
  // (computeBands erzwingt min/max der belegten Slots), daher keine Slot-Sperre nötig.
  const handleBandShrink = useCallback((dir) => {
    if (dir === 'top')  setVisStart(v => { const n = Math.min(visEnd - 1, v + 1);  saveVis(n, visEnd); return n })
    else                setVisEnd(v   => { const n = Math.max(visStart + 1, v - 1); saveVis(visStart, n); return n })
  }, [visStart, visEnd])

  const handleShiftAll = useCallback((dir) => {
    setTodaySlots(currentSlots => {
      const keys   = Object.keys(currentSlots).filter(k => !currentSlots[k]?.locked)
      const sorted = [...keys].sort((a, b) => dir * (parseFloat(b) - parseFloat(a)))
      const ns     = { ...currentSlots }
      sorted.forEach(k => {
        let ni = ALL_SLOT_KEYS.indexOf(k) + dir
        while (ni >= 0 && ni < ALL_SLOT_KEYS.length && ns[ALL_SLOT_KEYS[ni]]?.locked) ni += dir
        if (ni >= 0 && ni < ALL_SLOT_KEYS.length && !ns[ALL_SLOT_KEYS[ni]]) {
          ns[ALL_SLOT_KEYS[ni]] = ns[k]
          delete ns[k]
        }
      })
      return ns
    })
  }, [setTodaySlots])

  return {
    todaySlots, setTodaySlots,
    visStart, visEnd,
    handleToggleSlotDone, handleToggleLock, handleRemoveSlot, handleSetSlot,
    handleBandExpand, handleBandShrink, handleShiftAll,
  }
}
