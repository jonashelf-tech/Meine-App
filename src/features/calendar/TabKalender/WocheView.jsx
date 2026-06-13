import { useState, useRef, useEffect, useMemo } from 'react'
import { dateKey as toDateKey, getToolColor } from '../../../utils'
import { lv, sv, SK } from '../../../storage'
import { getBirthdaysForCalendarDate } from '../../tools/geburtstage/birthdayUtils'
import TodoModal from '../../../components/TodoModal/TodoModal'
import SlotSheet from '../Zeitplan/SlotSheet'
import {
  DAY_SHORT, SLOT_H, addDays, slotToTop, slotToHeight,
  blocksOverlap, rangeBlocked, getToolDots,
} from './kalenderShared'
import s from './TabKalender.module.css'

function WeekPillStrip({ days, weekDays, visibleStart, visibleEnd, isTop, onExpand, onShrink, onExpandTo }) {
  const outSlots = []
  for (const date of weekDays) {
    const dk    = toDateKey(date)
    const slots = days[dk] ?? {}
    for (const [key, slot] of Object.entries(slots)) {
      if (!slot) continue
      const h = Math.floor(parseFloat(key))
      if (isTop ? h < visibleStart : h >= visibleEnd) {
        const hh = String(Math.floor(parseFloat(key))).padStart(2, '0')
        const mm = parseFloat(key) % 1 ? '30' : '00'
        outSlots.push({ key: `${dk}-${key}`, time: `${hh}:${mm}`, text: slot.text, h })
      }
    }
  }
  outSlots.sort((a, b) => a.h - b.h)

  const emptyText = isTop
    ? `Keine Termine vor ${String(visibleStart).padStart(2, '0')}:00`
    : `Keine Termine nach ${String(visibleEnd).padStart(2, '0')}:00`

  return (
    <div className={[s.weekPillStrip, isTop ? '' : s.weekPillStripBot].join(' ')}>
      <button className={s.weekPillBtn} onClick={onShrink}>−</button>
      <div className={s.weekPillChips}>
        {outSlots.length === 0
          ? <span className={s.weekPillEmpty}>{emptyText}</span>
          : outSlots.map(slot => (
              <div key={slot.key} className={s.weekPillChip} onClick={() => onExpandTo(slot.h)}>
                {slot.time} {slot.text}
              </div>
            ))
        }
      </div>
      <button className={s.weekPillBtn} onClick={onExpand}>+</button>
    </div>
  )
}

const TERMIN_COLORS = [
  { value: '#8B5CF6', label: 'Lila'  },
  { value: '#FB7185', label: 'Rot'   },
  { value: '#F59E0B', label: 'Gelb'  },
  { value: '#10B981', label: 'Grün'  },
  { value: '#06B6D4', label: 'Cyan'  },
]

function WeekTerminEditModal({ dk, slotKey, slot, onSave, onClose }) {
  const [text,     setText]     = useState(slot.text     ?? '')
  const [duration, setDuration] = useState(slot.duration ?? 30)
  const [color,    setColor]    = useState(slot.color    ?? '#8B5CF6')

  const handleSave = () => {
    if (!text.trim()) return
    onSave(dk, slotKey, { ...slot, text: text.trim(), duration, color })
  }

  return (
    <div className={s.terminOverlay} onClick={onClose}>
      <div className={s.terminCard} onClick={e => e.stopPropagation()}>
        <p className={s.terminTitle}>Termin bearbeiten</p>

        <input
          className={s.terminInput}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Bezeichnung"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
        />

        <div>
          <span className={s.terminLabel}>Dauer</span>
          <div className={s.terminDurRow}>
            {[15, 30, 60, 90].map(v => (
              <button
                key={v}
                className={[s.terminDurBtn, duration === v ? s.terminDurBtnActive : ''].join(' ')}
                onClick={() => setDuration(v)}
              >
                {v < 60 ? `${v}m` : `${v / 60}h`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={s.terminLabel}>Farbe</span>
          <div className={s.terminColorRow}>
            {TERMIN_COLORS.map(c => (
              <button
                key={c.value}
                className={[s.terminColorDot, color === c.value ? s.terminColorDotActive : ''].join(' ')}
                style={{ background: c.value }}
                onClick={() => setColor(c.value)}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        <div className={s.terminActions}>
          <button className={s.terminBtnSave} onClick={handleSave}>Speichern</button>
          <button className={s.terminBtnCancel} onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

// ─── Wochenansicht — Zeitgitter mit Drag über Tag + Uhrzeit ──────────
// draggingRef: Ref des Parents (deaktiviert Page-Swipe während eines Drags).
export default function WocheView({
  weekStart, todayKey,
  days, setDays, todos, setTodos,
  birthdays, activeTools, toolColors, weightEntries, kognitivSessions, fitnessSessions,
  showTermine, showTodos, showTools,
  draggingRef,
}) {
  const [visibleStart, setVisibleStart] = useState(() => lv(SK.weekVisStart, 7))
  const [visibleEnd,   setVisibleEnd]   = useState(() => lv(SK.weekVisEnd,   21))

  const [editingTodo,   setEditingTodo]   = useState(null)
  const [editingTermin, setEditingTermin] = useState(null)
  const [quickCreate,   setQuickCreate]   = useState(null)
  const [slotSheet,     setSlotSheet]     = useState(null)  // { date, time, slotKey } | null
  const [flashingSlotKey, setFlashingSlotKey] = useState(null)
  const [clickRipple,     setClickRipple]     = useState(null)
  const [dragging,        setDragging]        = useState(null)
  const [dragTarget,      setDragTarget]      = useState(null)
  const dragTargetRef = useRef(null)
  const clickTimers   = useRef({})
  const weekScrollRef = useRef(null)
  const colRefs       = useRef({})
  const dragJustEnded = useRef(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekDays.some(d => toDateKey(d) === todayKey)

  const nowTop = useMemo(() => {
    if (!isCurrentWeek) return null
    const n = new Date()
    const h = n.getHours()
    const m = n.getMinutes()
    if (h < visibleStart || h >= visibleEnd) return null
    return ((h - visibleStart) * 60 + m) / 30 * SLOT_H
  }, [isCurrentWeek, visibleStart, visibleEnd])

  // Beim Öffnen der Wochenansicht zur aktuellen Uhrzeit scrollen
  useEffect(() => {
    if (!weekScrollRef.current) return
    const scrollTo = Math.max(0, (new Date().getHours() - visibleStart) * 2 * SLOT_H - 80)
    weekScrollRef.current.scrollTop = scrollTo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timers = clickTimers.current
    return () => { Object.values(timers).forEach(clearTimeout) }
  }, [])

  const handleToggleSlotDone = (dk, key, slot, slotTodo) => {
    const compositeKey = `${dk}-${key}`
    if (slot.todoId && slotTodo) {
      const nowDone = !slotTodo.done
      if (nowDone) {
        setFlashingSlotKey(compositeKey)
        setTimeout(() => setFlashingSlotKey(k => k === compositeKey ? null : k), 650)
      }
      setTodos(prev => prev.map(t =>
        t.id === slotTodo.id
          ? { ...t, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null }
          : t
      ))
    } else {
      const nowDone = !slot.done
      if (nowDone) {
        setFlashingSlotKey(compositeKey)
        setTimeout(() => setFlashingSlotKey(k => k === compositeKey ? null : k), 650)
      }
      setDays(prev => ({
        ...prev,
        [dk]: { ...prev[dk], [key]: { ...slot, done: nowDone } },
      }))
    }
  }

  const handleSlotTap = (dk, key, slot, slotTodo) => {
    const ck = `${dk}-${key}`
    if (clickTimers.current[ck]) {
      clearTimeout(clickTimers.current[ck])
      delete clickTimers.current[ck]
      // Doppel-Tap → Edit
      if (slot.todoId) {
        const t = todos.find(td => td.id === slot.todoId)
        if (t) setEditingTodo(t)
      } else {
        setEditingTermin({ dk, slotKey: key, slot })
      }
    } else {
      clickTimers.current[ck] = setTimeout(() => {
        delete clickTimers.current[ck]
        // Einzel-Tap → Abhaken
        handleToggleSlotDone(dk, key, slot, slotTodo)
      }, 200)
    }
  }

  const updateDragTarget = (clientX, clientY) => {
    for (const [colDk, el] of Object.entries(colRefs.current)) {
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) {
        const relY   = clientY - rect.top
        const durH   = (draggingRef.current?.slot?.duration ?? 30) / 60
        const maxIdx = Math.max(0, Math.round((visibleEnd - visibleStart - durH) * 2))
        const idx    = Math.min(maxIdx, Math.max(0, Math.floor(relY / SLOT_H)))
        const h      = visibleStart + idx * 0.5
        const key    = String(h)
        const drag   = draggingRef.current
        const ignore = drag && drag.dk === colDk ? drag.key : null
        const blocked = rangeBlocked(days[colDk], key, drag?.slot?.duration, ignore)
        dragTargetRef.current = { dk: colDk, key, blocked }
        setDragTarget({ dk: colDk, key, blocked })
        return
      }
    }
    dragTargetRef.current = null
    setDragTarget(null)
  }

  const handleDrop = (oldDk, oldKey, slot, newDk, newKey) => {
    if (oldDk === newDk && oldKey === newKey) return
    // Ziel-Bereich (volle Dauer) belegt → Drop blockieren, kein Überlappen
    if (rangeBlocked(days[newDk], newKey, slot.duration, oldDk === newDk ? oldKey : null)) return
    setDays(prev => {
      const next = { ...prev }
      const oldDay = { ...(next[oldDk] ?? {}) }
      delete oldDay[oldKey]
      next[oldDk] = oldDay
      const base = oldDk === newDk ? oldDay : { ...(next[newDk] ?? {}) }
      next[newDk] = { ...base, [newKey]: { ...slot } }
      return next
    })
    if (slot.todoId) {
      const hh = String(Math.floor(parseFloat(newKey))).padStart(2, '0')
      const mm = parseFloat(newKey) % 1 ? '30' : '00'
      setTodos(prev => prev.map(t =>
        t.id === slot.todoId
          ? { ...t, date: newDk, time: `${hh}:${mm}` }
          : t
      ))
    }
  }

  const handleSaveTermin = (dk, slotKey, updatedSlot) => {
    setDays(prev => ({
      ...prev,
      [dk]: { ...prev[dk], [slotKey]: updatedSlot },
    }))
    setEditingTermin(null)
  }

  const expandStart = () => {
    const v = Math.max(0, visibleStart - 1)
    sv(SK.weekVisStart, v); setVisibleStart(v)
  }
  const shrinkStart = () => {
    const v = Math.min(visibleEnd - 1, visibleStart + 1)
    sv(SK.weekVisStart, v); setVisibleStart(v)
  }
  const expandEnd = () => {
    const v = Math.min(24, visibleEnd + 1)
    sv(SK.weekVisEnd, v); setVisibleEnd(v)
  }
  const shrinkEnd = () => {
    const v = Math.max(visibleStart + 1, visibleEnd - 1)
    sv(SK.weekVisEnd, v); setVisibleEnd(v)
  }
  const expandToStart = (h) => {
    const v = Math.min(visibleStart, h)
    sv(SK.weekVisStart, v); setVisibleStart(v)
  }
  const expandToEnd = (h) => {
    const v = Math.max(visibleEnd, h + 1)
    sv(SK.weekVisEnd, v); setVisibleEnd(v)
  }

  const colHeight = (visibleEnd - visibleStart) * 2 * SLOT_H

  return (
    <>
      <div className={s.weekWrapper}>
        {/* Spalten-Header */}
        <div className={s.weekHeaderRow}>
          <div className={s.weekTimeCorner} />
          {weekDays.map(date => {
            const dk       = toDateKey(date)
            const isToday  = dk === todayKey
            const toolDots = getToolDots(dk, todos, activeTools, weightEntries, days, toolColors, kognitivSessions, fitnessSessions)
            return (
              <div key={dk} className={[s.weekDayHead, isToday ? s.weekDayHeadToday : ''].join(' ')}>
                <span className={s.weekDayHeadName}>
                  {DAY_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                </span>
                <span className={s.weekDayHeadNum}>{date.getDate()}</span>
                {toolDots.length > 0 && (
                  <div className={s.weekDayToolDots}>
                    {toolDots.map(dot => (
                      <span
                        key={dot.id}
                        className={s.toolDot}
                        style={{ background: dot.color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* PillStrip oben */}
        <WeekPillStrip
          days={days}
          weekDays={weekDays}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          isTop={true}
          onExpand={expandStart}
          onShrink={shrinkStart}
          onExpandTo={expandToStart}
        />

        {/* Allday-Streifen — Geburtstage + Todos ohne Uhrzeit */}
        {(showTodos || showTermine) && (
          <div className={s.weekAlldayRow}>
            <div className={s.weekAlldayLabel}>Ganzt.</div>
            {weekDays.map(date => {
              const dk          = toDateKey(date)
              const bdays       = getBirthdaysForCalendarDate(birthdays, dk)
              const alldayTodos = showTodos ? todos.filter(t => t.date === dk && !t.time) : []
              return (
                <div key={dk} className={s.weekAlldayCol}>
                  {bdays.map(b => (
                    <div
                      key={b.id}
                      className={s.weekAlldayBar}
                      style={{ background: getToolColor('geburtstage', toolColors) }}
                    >
                      <span className={s.weekAlldayBarText}>{b.name}</span>
                    </div>
                  ))}
                  {alldayTodos.map(t => (
                    <div
                      key={t.id}
                      className={s.weekAlldayBar}
                      style={{ background: t.color || 'var(--primary)' }}
                    >
                      <span className={s.weekAlldayBarText}>{t.text}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Scrollbares Zeitgitter */}
        <div className={s.weekScrollBody} ref={weekScrollRef}>
          <div className={s.weekTimeAxis}>
            {Array.from({ length: (visibleEnd - visibleStart) * 2 }, (_, i) => {
              const h      = visibleStart + i * 0.5
              const isHour = h === Math.floor(h)
              if (!isHour) return <div key={i} className={s.weekTimeLabel} />
              return (
                <div key={i} className={s.weekTimeLabel}>
                  {String(Math.floor(h)).padStart(2, '0')}:00
                </div>
              )
            })}
          </div>
          <div className={s.weekColsBody}>
            {weekDays.map(date => {
              const dk    = toDateKey(date)
              const slots = days[dk] ?? {}
              const isColToday = dk === todayKey
              const entries = Object.entries(slots).filter(([key]) => {
                const h = parseFloat(key)
                return h >= visibleStart && h < visibleEnd
              })
              return (
                <div
                  key={dk}
                  className={[s.weekDayCol, isColToday ? s.weekDayColToday : ''].join(' ')}
                  style={{ height: colHeight }}
                  ref={el => { if (el) colRefs.current[dk] = el; else delete colRefs.current[dk] }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return
                    if (dragJustEnded.current) return
                    const slotIndex = Math.floor(e.nativeEvent.offsetY / SLOT_H)
                    const h  = visibleStart + slotIndex * 0.5
                    const hh = String(Math.floor(h)).padStart(2, '0')
                    const mm = h % 1 ? '30' : '00'
                    const rect = e.currentTarget.getBoundingClientRect()
                    const rx = e.clientX - rect.left
                    const ry = e.clientY - rect.top
                    const rid = Date.now()
                    setClickRipple({ dk, x: rx, y: ry, id: rid })
                    setTimeout(() => setClickRipple(r => r?.id === rid ? null : r), 420)
                    setSlotSheet({ date: dk, time: `${hh}:${mm}`, slotKey: String(h) })
                  }}
                >
                  {isColToday && nowTop !== null && (
                    <div className={s.weekNowLine} style={{ top: nowTop }}>
                      <div className={s.weekNowDot} />
                    </div>
                  )}
                  {clickRipple?.dk === dk && (
                    <div
                      className={s.weekClickRipple}
                      style={{ left: clickRipple.x, top: clickRipple.y }}
                    />
                  )}
                  {entries.map(([key, slot]) => {
                    const isTodo   = Boolean(slot.todoId)
                    if (!showTermine && !isTodo) return null
                    if (!showTodos   &&  isTodo) return null
                    const slotTodo = slot.todoId ? todos.find(t => t.id === slot.todoId) : null
                    if (!showTools && slotTodo?.toolId) return null
                    const isBlocking = dragging && dragTarget?.dk === dk
                      && !(dragging.dk === dk && dragging.key === key)
                      && blocksOverlap(parseFloat(dragTarget.key), dragging.slot.duration, parseFloat(key), slot.duration)
                    const top    = slotToTop(key, visibleStart)
                    const height = slotToHeight(slot.duration)
                    const hh     = String(Math.floor(parseFloat(key))).padStart(2, '0')
                    const mm     = parseFloat(key) % 1 ? '30' : '00'
                    return (
                      <div
                        key={key}
                        className={[
                          s.weekSlotBlock,
                          isTodo ? s.weekSlotTodo : '',
                          (slot.done || slotTodo?.done) ? s.weekSlotDone : '',
                          flashingSlotKey === `${dk}-${key}` ? s.weekSlotDoneFlash : '',
                          (dragging?.dk === dk && dragging?.key === key) ? s.weekSlotDragging : '',
                          isBlocking ? s.weekSlotBlocked : '',
                        ].join(' ')}
                        style={{ top, height, '--slot-color': slot.color || '#8B5CF6' }}
                        onPointerDown={(e) => {
                          e.stopPropagation()
                          if (e.button !== 0 && e.pointerType === 'mouse') return
                          const startX = e.clientX
                          const startY = e.clientY
                          let dragStarted = false

                          const onMove = (me) => {
                            if (dragStarted) {
                              updateDragTarget(me.clientX, me.clientY)
                              return
                            }
                            if (Math.hypot(me.clientX - startX, me.clientY - startY) > 4) {
                              dragStarted = true
                              const ck = `${dk}-${key}`
                              if (clickTimers.current[ck]) {
                                clearTimeout(clickTimers.current[ck])
                                delete clickTimers.current[ck]
                              }
                              draggingRef.current = { dk, key, slot }
                              setDragging({ dk, key, slot })
                            }
                          }

                          const finish = (commit) => {
                            document.removeEventListener('pointermove', onMove)
                            document.removeEventListener('pointerup', onUp)
                            document.removeEventListener('pointercancel', onCancel)
                            if (dragStarted) {
                              if (commit && dragTargetRef.current) {
                                handleDrop(
                                  draggingRef.current.dk,
                                  draggingRef.current.key,
                                  draggingRef.current.slot,
                                  dragTargetRef.current.dk,
                                  dragTargetRef.current.key,
                                )
                              }
                              draggingRef.current = null
                              dragTargetRef.current = null
                              setDragging(null)
                              setDragTarget(null)
                              dragJustEnded.current = true
                              setTimeout(() => { dragJustEnded.current = false }, 50)
                            } else if (commit) {
                              handleSlotTap(dk, key, slot, slotTodo)
                            }
                          }
                          const onUp     = () => finish(true)
                          const onCancel = () => finish(false)

                          document.addEventListener('pointermove', onMove)
                          document.addEventListener('pointerup', onUp)
                          document.addEventListener('pointercancel', onCancel)
                        }}
                      >
                        {height >= 14 && <span className={s.weekSlotName}>{slot.text}</span>}
                        {height >= 34 && <span className={s.weekSlotTime}>{hh}:{mm}</span>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* PillStrip unten */}
        <WeekPillStrip
          days={days}
          weekDays={weekDays}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          isTop={false}
          onExpand={expandEnd}
          onShrink={shrinkEnd}
          onExpandTo={expandToEnd}
        />
      </div>

      {editingTodo && (
        <TodoModal
          existingTodo={editingTodo}
          onClose={() => setEditingTodo(null)}
        />
      )}
      {editingTermin && (
        <WeekTerminEditModal
          dk={editingTermin.dk}
          slotKey={editingTermin.slotKey}
          slot={editingTermin.slot}
          onSave={handleSaveTermin}
          onClose={() => setEditingTermin(null)}
        />
      )}
      {quickCreate && (
        <TodoModal
          prefill={quickCreate}
          onClose={() => setQuickCreate(null)}
        />
      )}

      {slotSheet && (() => {
        const d = new Date(slotSheet.date + 'T00:00:00')
        const dateLabel = `${DAY_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()}.${d.getMonth() + 1}.`
        return (
          <SlotSheet
            slotKey={slotSheet.slotKey}
            dateLabel={dateLabel}
            todos={todos}
            todaySlots={days[slotSheet.date] ?? {}}
            onPlace={(todo) => {
              const { date: dk, time, slotKey } = slotSheet
              setDays(prev => ({
                ...prev,
                [dk]: {
                  ...(prev[dk] ?? {}),
                  [slotKey]: {
                    text:     todo.text,
                    todoId:   todo.id,
                    color:    todo.color || '#8B5CF6',
                    duration: todo.duration || 30,
                    locked:   false,
                    done:     false,
                  },
                },
              }))
              setTodos(prev => prev.map(t =>
                t.id === todo.id ? { ...t, date: dk, time } : t
              ))
              setSlotSheet(null)
            }}
            onCreateNew={() => {
              setQuickCreate({ date: slotSheet.date, time: slotSheet.time })
              setSlotSheet(null)
            }}
            onClose={() => setSlotSheet(null)}
          />
        )
      })()}

      {dragging && dragTarget && (function() {
        const colEl = colRefs.current[dragTarget.dk]
        if (!colEl) return null
        const colRect  = colEl.getBoundingClientRect()
        const chipH    = slotToHeight(dragging.slot.duration)
        const slotPx   = slotToTop(dragTarget.key, visibleStart)
        return (
          <div
            className={[s.weekDragChip, dragTarget.blocked ? s.weekDragChipBlocked : ''].join(' ')}
            style={{
              left:           colRect.left + 2,
              top:            colRect.top  + slotPx,
              width:          colRect.width - 4,
              height:         chipH,
              '--slot-color': dragging.slot.color || '#8B5CF6',
            }}
          >
            {chipH >= 14 && <span className={s.weekSlotName}>{dragging.slot.text}</span>}
          </div>
        )
      })()}
    </>
  )
}
