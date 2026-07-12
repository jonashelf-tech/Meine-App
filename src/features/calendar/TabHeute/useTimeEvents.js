import { useEffect, useRef, useState, useCallback } from 'react'
import { todayKey } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { createBlock, isFaelligkeit } from '../../todos/Block'
import { loadHaushalt, saveHaushalt, markTaskDone as haushaltMarkDone } from '../../tools/haushalt/haushaltData'

/**
 * Zwei Varianten der Zeitereignis-Abfrage:
 *
 * 'same-day' — beim Öffnen des Tagesplaners, heute abgelaufene Slots
 *   Ignorieren → slot.ignored = true  (kommt bei 'new-day' wieder)
 *
 * 'new-day'  — erster Start eines neuen Tages, alle offenen vergangenen Slots
 *   inkl. bisher ignorierter Items.
 *   Ignorieren → slot.reviewed = true (endgültig weg)
 */
export function useTimeEvents({ days, setDays, setTodos, todos = [] }) {
  const [items,   setItems]   = useState([])
  const [isOpen,  setIsOpen]  = useState(false)
  const [variant, setVariant] = useState(null) // 'same-day' | 'new-day'
  const ranRef     = useRef(false)
  const variantRef = useRef(null)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const today   = todayKey()
    const now     = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()

    // ── Variante 2: neuer Tag ──────────────────────────────
    if (lv(SK.lastPoolReturn, null) !== today) {
      const collected = []
      Object.entries(days).forEach(([dk, dayData]) => {
        if (dk >= today || !dayData || typeof dayData !== 'object') return
        Object.entries(dayData).forEach(([slotKey, slot]) => {
          if (!slot || slot.done || slot.reviewed || !slot.text) return
          // ignored = true → kommen hier trotzdem dran
          collected.push({
            id:       `${dk}|${slotKey}`,
            dateKey:  dk,
            slotKey,
            text:     slot.text,
            color:    slot.color ?? null,
            type:     slot.todoId ? 'todo' : 'text',
            todoId:   slot.todoId || null,
            subItems: slot.subItems ?? [],   // Text-Slots: Unterpunkte überleben „In Pool"
          })
        })
      })

      // Überfällige Fälligkeiten (Todo mit Datum, ohne Uhrzeit) ergänzen.
      // Bereits als Slot verplante Todos nicht doppelt aufnehmen.
      const placedTodoIds = new Set(collected.map(c => c.todoId).filter(Boolean))
      todos.forEach(t => {
        if (t.done || !isFaelligkeit(t) || t.date >= today || placedTodoIds.has(t.id)) return
        collected.push({
          id:      `faellig|${t.id}`,
          dateKey: t.date,
          slotKey: null,
          text:    t.text,
          color:   t.color ?? null,
          type:    'faellig',
          todoId:  t.id,
        })
      })

      if (collected.length > 0) {
        setItems(collected)
        setVariant('new-day')
        variantRef.current = 'new-day'
        setIsOpen(true)
      } else {
        sv(SK.lastPoolReturn, today)
      }
      return
    }

    // ── Variante 1: selber Tag, abgelaufene Slots ──────────
    const dayData = days[today]
    if (!dayData) return

    const collected = []
    Object.entries(dayData).forEach(([slotKey, slot]) => {
      if (!slot || slot.done || slot.ignored || slot.reviewed || !slot.text) return
      const endMins = parseFloat(slotKey) * 60 + (slot.duration || 30)
      if (endMins > nowMins) return
      collected.push({
        id:       `${today}|${slotKey}`,
        dateKey:  today,
        slotKey,
        text:     slot.text,
        color:    slot.color ?? null,
        type:     slot.todoId ? 'todo' : 'text',
        todoId:   slot.todoId || null,
        subItems: slot.subItems ?? [],
      })
    })

    if (collected.length > 0) {
      setItems(collected)
      setVariant('same-day')
      variantRef.current = 'same-day'
      setIsOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Batch-Update für days-Store
  const applyDaysUpdates = useCallback((updates) => {
    setDays(prev => {
      const next = { ...prev }
      updates.forEach(({ dateKey, slotKey, patch }) => {
        const d = next[dateKey]
        if (!d?.[slotKey]) return
        next[dateKey] = { ...d, [slotKey]: { ...d[slotKey], ...patch } }
      })
      return next
    })
  }, [setDays])

  // Schließt Modal wenn Liste leer; speichert SK.lastPoolReturn bei new-day
  const finish = useCallback((remaining) => {
    setItems(remaining)
    if (remaining.length === 0) {
      if (variantRef.current === 'new-day') sv(SK.lastPoolReturn, todayKey())
      setIsOpen(false)
      setVariant(null)
      variantRef.current = null
    }
  }, [])

  // ── Erledigt ─────────────────────────────────────────────
  const handleDone = useCallback((selectedIds) => {
    const sel     = items.filter(i => selectedIds.has(i.id))
    const todoIds = new Set(sel.filter(i => i.type === 'todo' || i.type === 'faellig').map(i => i.todoId))

    if (todoIds.size > 0) {
      const haushaltIds = todos
        .filter(t => todoIds.has(t.id) && t.haushaltTaskIds?.length > 0)
        .flatMap(t => t.haushaltTaskIds)
      if (haushaltIds.length > 0) {
        const cfg     = loadHaushalt()
        const updated = haushaltIds.reduce((c, tid) => haushaltMarkDone(c, tid), cfg)
        saveHaushalt(updated)
      }

      setTodos(prev => prev.map(t =>
        todoIds.has(t.id)
          ? { ...t, done: true, doneAt: new Date().toISOString() }
          : t
      ))
    }
    applyDaysUpdates(sel.filter(i => i.slotKey != null).map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey,
      patch: { done: true, reviewed: true },
    })))
    finish(items.filter(i => !selectedIds.has(i.id)))
  }, [items, todos, setTodos, applyDaysUpdates, finish])

  // ── Ignorieren ───────────────────────────────────────────
  const handleIgnore = useCallback((selectedIds) => {
    // Ignorieren = nur für heute weg. Am neuen Tag wieder abgefragt.
    // same-day: ignored=true (verschwindet aus Variante 1, kommt bei new-day wieder).
    // new-day: nichts persistieren — der Eintrag bleibt offen und wird beim
    //          nächsten Tageswechsel erneut eingesammelt.
    if (variantRef.current === 'same-day') {
      const sel = items.filter(i => selectedIds.has(i.id) && i.slotKey != null)
      applyDaysUpdates(sel.map(i => ({
        dateKey: i.dateKey, slotKey: i.slotKey, patch: { ignored: true },
      })))
    }
    finish(items.filter(i => !selectedIds.has(i.id)))
  }, [items, applyDaysUpdates, finish])

  // ── Zurück in Pool ───────────────────────────────────────
  const handleMoveToPool = useCallback((selectedIds) => {
    const sel        = items.filter(i => selectedIds.has(i.id))
    const textItems  = sel.filter(i => i.type === 'text')
    const faelligIds = new Set(sel.filter(i => i.type === 'faellig').map(i => i.todoId))
    const todoIds    = new Set(sel.filter(i => i.type === 'todo').map(i => i.todoId).filter(Boolean))
    const newTodos   = textItems.map(i =>
      createBlock({ text: i.text, color: i.color, priority: 3, subItems: i.subItems ?? [] }))

    if (newTodos.length > 0) {
      setTodos(prev => [...prev, ...newTodos])
    }

    // Fälligkeiten + verplante Todos: Datum/Zeit entfernen → bleiben als normales Pool-Todo
    const clearIds = new Set([...faelligIds, ...todoIds])
    if (clearIds.size > 0) {
      setTodos(prev => prev.map(t =>
        clearIds.has(t.id) ? { ...t, date: null, time: null } : t
      ))
    }

    // Slots aus days entfernen
    setDays(prev => {
      const next = { ...prev }
      sel.forEach(({ dateKey, slotKey }) => {
        const d = next[dateKey]
        if (!d?.[slotKey]) return
        const newDay = { ...d }
        delete newDay[slotKey]
        next[dateKey] = newDay
      })
      return next
    })

    finish(items.filter(i => !selectedIds.has(i.id)))
  }, [items, setTodos, setDays, finish])

  return { isOpen, variant, items, handleDone, handleIgnore, handleMoveToPool }
}
