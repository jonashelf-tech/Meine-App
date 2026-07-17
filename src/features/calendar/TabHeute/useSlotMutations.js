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

  // Slot UND verknüpftes Todo togglen — sonst divergieren die Ansichten:
  // Missed-Review liest slot.done, DayPanel/Garten-XP lesen todo.done/doneAt.
  const handleToggleSlotDone = useCallback((slotKey) => {
    const slot = todaySlots[slotKey]
    if (!slot) return
    const nowDone = !slot.done
    if (nowDone && slot.reminderItemId) {
      setReminderLastAdded(slot.reminderItemId, todayKey())
    }
    setTodaySlots(prev => prev[slotKey]
      ? { ...prev, [slotKey]: { ...prev[slotKey], done: nowDone } }
      : prev)
    if (slot.todoId) {
      setTodos(prev => prev.map(t =>
        t.id === slot.todoId
          ? { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
          : t
      ))
    }
  }, [todaySlots, setTodaySlots, setTodos])

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
          t.id === slot.todoId ? { ...t, date: null, time: null, dayRank: null } : t
        ))
      }
    }
  }, [setTodaySlots, todaySlots, setTodos])

  const handleSetSlot = useCallback((slotKey, slotData) => {
    // Nur echte Slot-Keys schreiben. 'pool' und die Lücken-Keys der Tagesliste
    // (`gap|…`) sind Drop-Zonen, keine Slots — sonst landet Müll in days[].
    if (!ALL_SLOT_KEYS.includes(slotKey)) return
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
    const keys   = Object.keys(todaySlots).filter(k => !todaySlots[k]?.locked)
    const sorted = [...keys].sort((a, b) => dir * (parseFloat(b) - parseFloat(a)))
    const ns     = { ...todaySlots }
    const moved  = new Map()   // todoId → neuer Slot-Key
    sorted.forEach(k => {
      let ni = ALL_SLOT_KEYS.indexOf(k) + dir
      while (ni >= 0 && ni < ALL_SLOT_KEYS.length && ns[ALL_SLOT_KEYS[ni]]?.locked) ni += dir
      if (ni >= 0 && ni < ALL_SLOT_KEYS.length && !ns[ALL_SLOT_KEYS[ni]]) {
        const nk = ALL_SLOT_KEYS[ni]
        ns[nk] = ns[k]
        delete ns[k]
        if (ns[nk].todoId) moved.set(ns[nk].todoId, nk)
      }
    })
    setTodaySlots(ns)
    // Uhrzeit im verknüpften Todo nachziehen — wie startSlotDrag/Wochenansicht,
    // sonst zeigen TodoModal/Kalender nach dem Verschieben die alte Zeit.
    if (moved.size) {
      setTodos(prev => prev.map(t => {
        const nk = moved.get(t.id)
        if (!nk || !t.time) return t
        const h = parseFloat(nk)
        return { ...t, time: `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}` }
      }))
    }
  }, [todaySlots, setTodaySlots, setTodos])

  return {
    todaySlots, setTodaySlots,
    visStart, visEnd,
    handleToggleSlotDone, handleToggleLock, handleRemoveSlot, handleSetSlot,
    handleBandExpand, handleBandShrink, handleShiftAll,
  }
}
