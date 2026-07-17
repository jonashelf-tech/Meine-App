import { useCallback } from 'react'
import { getDurationKeys } from '../../../utils'
import { createBlock } from '../../todos/Block'
import { rankFromGapKey } from '../tagesListeLogic'

export function useTagesplanerDrag({
  startDrag, todaySlots, setTodaySlots, handleSetSlot, handleRemoveSlot,
  todos, setTodos, viewDate, setBirthdays, heuteModus,
}) {
  const listMode = heuteModus === 'liste'
  const startPoolDrag = useCallback((todoId, text, color, duration, e) => {
    const dur    = duration || 30
    const curKey = Object.keys(todaySlots).find(k => todaySlots[k]?.todoId === todoId)
    const canDrop = dur > 30
      ? (key) => {
          const blocking = getDurationKeys(key, dur).slice(1).filter(k => k !== curKey && todaySlots[k])
          return blocking.length === 0 ? true : blocking
        }
      : null
    startDrag(text, color, (dropKey) => {
      // Drop zurück in den Pool: Slot lösen (falls verplant), Todo bleibt reines Pool-Todo
      if (dropKey === 'pool') {
        if (curKey) {
          setTodaySlots(prev => { const ns = { ...prev }; delete ns[curKey]; return ns })
          if (todoId) {
            setTodos(prev => prev.map(t =>
              t.id === todoId ? { ...t, date: null, time: null, dayRank: null } : t
            ))
          }
        }
        return
      }
      const hh = String(Math.floor(parseFloat(dropKey))).padStart(2, '0')
      const mm = parseFloat(dropKey) % 1 ? '30' : '00'
      if (curKey) {
        if (dropKey === curKey) return
        setTodaySlots(prev => {
          const ns    = { ...prev }
          const entry = ns[curKey]
          delete ns[curKey]
          ns[dropKey] = entry
          return ns
        })
        if (todoId) {
          setTodos(prev => prev.map(t =>
            t.id === todoId ? { ...t, date: viewDate, time: `${hh}:${mm}`, dayRank: null } : t
          ))
        }
      } else {
        handleSetSlot(dropKey, {
          text,
          todoId:   todoId || null,
          color,
          duration: duration || 30,
          locked:   false,
          done:     false,
        })
        if (todoId) {
          setTodos(prev => prev.map(t =>
            t.id === todoId ? { ...t, date: viewDate, time: `${hh}:${mm}`, dayRank: null } : t
          ))
        }
      }
    }, e, canDrop, dur)
  }, [startDrag, todaySlots, setTodaySlots, handleSetSlot, setTodos, viewDate])

  // Ziehen im Listenmodus — nur Todos, nie Termine (die sind Anker). Anders als
  // startPoolDrag gibt es hier kein Raster: Drop-Ziele sind die Lücken zwischen
  // den Zeilen (Key `gap|<scope>|<prev>|<next>`), und nichts kann kollidieren —
  // deshalb kein canDrop. Der Drop schreibt nur Datum und Rang, nie eine Uhrzeit.
  const startListDrag = useCallback((todoId, text, color, duration, e) => {
    if (!todoId) return
    startDrag(text, color ?? null, (dropKey) => {
      if (dropKey === 'pool') {
        setTodos(prev => prev.map(t =>
          t.id === todoId ? { ...t, date: null, time: null, dayRank: null } : t
        ))
        return
      }
      const rank = rankFromGapKey(dropKey)
      if (rank === null) return
      setTodos(prev => prev.map(t =>
        t.id === todoId ? { ...t, date: viewDate, time: null, dayRank: rank } : t
      ))
    }, e, null, duration || 30)
  }, [startDrag, setTodos, viewDate])

  const startHaushaltDrag = useCallback((room, uncoveredTasks, haushaltColor, e) => {
    const existing = todos.find(t => t.toolId === 'haushalt' && t.haushaltRoomId === room.id && !t.done)
    if (existing) {
      // Bestehendes Raum-Todo wiederverwenden — im passenden Modus platzieren.
      const reuse = listMode ? startListDrag : startPoolDrag
      reuse(existing.id, existing.text, existing.color, existing.duration, e)
      return
    }
    const text     = `${room.icon} ${room.name}`
    const duration = Math.max(uncoveredTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0), 30)
    // In der Liste gibt es keine Slot-Kollisionen — jede Lücke ist droppbar.
    const canDrop  = (!listMode && duration > 30)
      ? (key) => {
          if (key === 'pool') return true
          const blocking = getDurationKeys(key, duration).slice(1).filter(k => todaySlots[k])
          return blocking.length === 0 ? true : blocking
        }
      : null
    startDrag(text, haushaltColor, (dropKey) => {
      const rank = rankFromGapKey(dropKey)
      const newTodo = createBlock({
        text,
        duration,
        subItems:        uncoveredTasks.map(t => ({ id: crypto.randomUUID(), text: t.text, done: false })),
        color:           haushaltColor,
        toolId:          'haushalt',
        haushaltRoomId:  room.id,
        haushaltTaskIds: uncoveredTasks.map(t => t.id),
        priority:        room.priority ?? 3,
        ...(rank !== null ? { date: viewDate, time: null, dayRank: rank } : {}),
      })
      setTodos(prev => [...prev, newTodo])
      if (rank === null && dropKey !== 'pool') {
        handleSetSlot(dropKey, { text, todoId: newTodo.id, color: haushaltColor, duration, locked: false, done: false })
      }
    }, e, canDrop, duration)
  }, [todos, todaySlots, startDrag, startPoolDrag, startListDrag, setTodos, handleSetSlot, listMode, viewDate])

  const startReminderDrag = useCallback((item, reminderColor, e) => {
    const text     = item.text
    const duration = 30
    startDrag(text, reminderColor, (dropKey) => {
      const rank = rankFromGapKey(dropKey)
      const newTodo = createBlock({
        text, priority: 2, color: reminderColor, reminderItemId: item.id, toolId: 'reminder', duration,
        ...(rank !== null ? { date: viewDate, time: null, dayRank: rank } : {}),
      })
      setTodos(prev => [...prev, newTodo])
      if (rank === null && dropKey !== 'pool') {
        handleSetSlot(dropKey, { text, todoId: newTodo.id, color: reminderColor, duration, locked: false, done: false })
      }
    }, e, null, duration)
  }, [startDrag, setTodos, handleSetSlot, viewDate])

  const startBirthdayDrag = useCallback((chip, chipColor, e, bulkChips) => {
    // Bulk-Add in Pool (Masse-Hinzufügen-Button)
    if (!chip && bulkChips) {
      const newTodos = bulkChips.map(c =>
        createBlock({
          text:           c.text,
          priority:       c.type === 'birthday' ? 2 : 3,
          color:          c.color,
          toolId:         'geburtstage',
          birthdayChipId: `${c.type}-${c.birthday.id}`,
        })
      )
      setTodos(prev => [...prev, ...newTodos])
      // Geburtstags-Chips: plannedYear setzen
      const currentYear = new Date().getFullYear()
      const bChips = bulkChips.filter(c => c.type === 'birthday')
      if (bChips.length > 0) {
        setBirthdays(prev => prev.map(b => {
          const hit = bChips.find(c => c.birthday.id === b.id)
          return hit ? { ...b, plannedYear: currentYear } : b
        }))
      }
      return
    }

    startDrag(chip.text, chipColor, (dropKey) => {
      const rank = rankFromGapKey(dropKey)
      const newTodo = createBlock({
        text:           chip.text,
        priority:       chip.type === 'birthday' ? 2 : 3,
        color:          chipColor,
        toolId:         'geburtstage',
        birthdayChipId: `${chip.type}-${chip.birthday.id}`,
        ...(rank !== null ? { date: viewDate, time: null, dayRank: rank } : {}),
      })
      setTodos(prev => [...prev, newTodo])
      if (dropKey !== 'pool') {
        if (rank === null) {
          handleSetSlot(dropKey, { text: chip.text, todoId: newTodo.id, color: chipColor, locked: false, done: false })
        }
        // Auf einen Tag gelegt (Slot ODER Liste) → Kalender-Entry ausblenden
        if (chip.type === 'birthday') {
          const currentYear = new Date().getFullYear()
          setBirthdays(prev => prev.map(b =>
            b.id === chip.birthday.id ? { ...b, plannedYear: currentYear } : b
          ))
        }
      }
    }, e, null)
  }, [startDrag, setTodos, handleSetSlot, setBirthdays, viewDate])

  const startSlotDrag = useCallback((fromKey, e) => {
    const slot = todaySlots[fromKey]
    if (!slot || slot.locked) return
    const dur = slot.duration || 30
    const canDrop = dur > 30
      ? (toKey) => {
          if (toKey === 'pool') return true
          const blocking = getDurationKeys(toKey, dur).slice(1).filter(k => k !== fromKey && todaySlots[k])
          return blocking.length === 0 ? true : blocking
        }
      : null
    startDrag(slot.text, slot.color ?? null, (toKey) => {
      if (toKey === 'pool') {
        handleRemoveSlot(fromKey, 'back')
        return
      }
      if (toKey === fromKey) return
      setTodaySlots(prev => {
        const ns    = { ...prev }
        const entry = ns[fromKey]
        delete ns[fromKey]
        ns[toKey] = entry
        return ns
      })
      // Uhrzeit im Todo aktualisieren — wie in der Wochenansicht
      if (slot.todoId) {
        const todo = todos.find(t => t.id === slot.todoId)
        if (todo?.time) {
          const hh = String(Math.floor(parseFloat(toKey))).padStart(2, '0')
          const mm = parseFloat(toKey) % 1 ? '30' : '00'
          setTodos(prev => prev.map(t =>
            t.id === slot.todoId ? { ...t, time: `${hh}:${mm}` } : t
          ))
        }
      }
    }, e, canDrop, slot.duration || 30)
  }, [startDrag, todaySlots, setTodaySlots, handleRemoveSlot, todos, setTodos])

  return { startPoolDrag, startListDrag, startHaushaltDrag, startReminderDrag, startBirthdayDrag, startSlotDrag }
}
