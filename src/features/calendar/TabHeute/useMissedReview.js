import { useEffect, useRef, useState, useCallback } from 'react'
import { todayKey } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { createBlock } from '../../todos/Block'

/**
 * Einmal pro Tag beim Mount: sammelt alle unerledigten Items aus vergangenen
 * Tagen und öffnet das MissedReview-Modal. Setzt SK.lastPoolReturn sobald
 * der Dialog abgeschlossen ist.
 *
 * Item-Typen:
 *  - 'text'  → text-only Slot ohne todoId
 *  - 'todo'  → Slot mit todoId + todo.awaitingClockResponse === true
 */
export function useMissedReview({ days, setDays, todos, setTodos }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const today = todayKey()
    if (lv(SK.lastPoolReturn, null) === today) return

    const collected = []

    Object.entries(days).forEach(([dk, dayData]) => {
      if (dk >= today || !dayData || typeof dayData !== 'object') return
      Object.entries(dayData).forEach(([slotKey, slot]) => {
        if (!slot || slot.done || slot.reviewed || !slot.text) return
        if (!slot.todoId) {
          collected.push({
            id: `${dk}|${slotKey}`,
            dateKey: dk,
            slotKey,
            text: slot.text,
            color: slot.color || '#8B5CF6',
            type: 'text',
          })
        } else {
          const todo = todos.find(t => t.id === slot.todoId)
          if (todo && !todo.done && todo.awaitingClockResponse) {
            collected.push({
              id: `${dk}|${slotKey}`,
              dateKey: dk,
              slotKey,
              text: todo.text,
              color: todo.color || '#8B5CF6',
              type: 'todo',
              todoId: todo.id,
            })
          }
        }
      })
    })

    if (collected.length > 0) {
      setItems(collected)
      setIsOpen(true)
    } else {
      sv(SK.lastPoolReturn, today)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Batch-Update für den days-Store: mehrere Slots in einem setDays-Aufruf patchen
  const applyDaysUpdates = useCallback((updates) => {
    // updates: [{ dateKey: string, slotKey: string, patch: object }]
    setDays(prev => {
      const next = { ...prev }
      updates.forEach(({ dateKey, slotKey, patch }) => {
        const dayData = next[dateKey]
        if (!dayData?.[slotKey]) return
        next[dateKey] = { ...dayData, [slotKey]: { ...dayData[slotKey], ...patch } }
      })
      return next
    })
  }, [setDays])

  // ── Erledigt ─────────────────────────────────────────────
  const handleDone = useCallback((selectedIds) => {
    const sel = items.filter(i => selectedIds.has(i.id))
    const todoIds = new Set(sel.filter(i => i.type === 'todo').map(i => i.todoId))

    if (todoIds.size > 0) {
      setTodos(prev => prev.map(t =>
        todoIds.has(t.id)
          ? { ...t, done: true, doneAt: new Date().toISOString(), awaitingClockResponse: false }
          : t
      ))
    }

    applyDaysUpdates(sel.map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey, patch: { done: true, reviewed: true },
    })))

    const remaining = items.filter(i => !selectedIds.has(i.id))
    setItems(remaining)
    if (remaining.length === 0) {
      sv(SK.lastPoolReturn, todayKey())
      setIsOpen(false)
    }
  }, [items, setTodos, applyDaysUpdates])

  // ── Ignorieren ───────────────────────────────────────────
  const handleIgnore = useCallback((selectedIds) => {
    const sel = items.filter(i => selectedIds.has(i.id))
    const todoIds = new Set(sel.filter(i => i.type === 'todo').map(i => i.todoId))

    if (todoIds.size > 0) {
      setTodos(prev => prev.map(t =>
        todoIds.has(t.id) ? { ...t, awaitingClockResponse: false } : t
      ))
    }

    applyDaysUpdates(sel.map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey, patch: { reviewed: true },
    })))

    const remaining = items.filter(i => !selectedIds.has(i.id))
    setItems(remaining)
    if (remaining.length === 0) {
      sv(SK.lastPoolReturn, todayKey())
      setIsOpen(false)
    }
  }, [items, setTodos, applyDaysUpdates])

  // ── In Pool verschieben ──────────────────────────────────
  const handleMoveToPool = useCallback(() => {
    const today = todayKey()
    const newTodos = items
      .filter(i => i.type === 'text')
      .map(i => createBlock({ text: i.text, color: i.color, priority: 3 }))
    const todoIdsToUpdate = new Set(items.filter(i => i.type === 'todo').map(i => i.todoId))

    setTodos(prev => {
      const updated = prev.map(t =>
        todoIdsToUpdate.has(t.id) ? { ...t, awaitingClockResponse: false } : t
      )
      return newTodos.length > 0 ? [...updated, ...newTodos] : updated
    })

    applyDaysUpdates(items.map(i => ({
      dateKey: i.dateKey, slotKey: i.slotKey, patch: { reviewed: true },
    })))

    sv(SK.lastPoolReturn, today)
    setIsOpen(false)
    setItems([])
  }, [items, setTodos, applyDaysUpdates])

  return { isOpen, items, handleDone, handleIgnore, handleMoveToPool }
}
