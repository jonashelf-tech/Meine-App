import { useState, useCallback, useMemo, useEffect } from 'react'
import { sv, lv, SK } from '../../../storage'
import { sk, getDurationKeys, ALL_SLOT_KEYS, todayKey } from '../../../utils'
import { getBirthdaysForCalendarDate } from '../../tools/geburtstage/birthdayUtils'
import s from './Zeitplan.module.css'
import SlotBlock from './SlotBlock'
import BlockerCard from '../Blocker/BlockerCard'
import { getBlockersForDate, getBlockerForHour } from '../Blocker/blockerUtils'

// ─── RemoveDialog ─────────────────────────────────────────
function RemoveDialog({ slotKey, slotText, onBack, onDelete, onClose }) {
  return (
    <div className={s.dialogOverlay} onClick={onClose}>
      <div className={s.dialog} onClick={e => e.stopPropagation()}>
        <p className={s.dialogTitle}>"{slotText}"</p>
        <button className={s.dialogBtn} onClick={onBack}>
          ↩ Zurück auf Liste
        </button>
        <button className={[s.dialogBtn, s.dialogBtnDelete].join(' ')} onClick={onDelete}>
          Löschen
        </button>
        <button className={s.dialogBtnCancel} onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}

// ─── SlotChipPreview ──────────────────────────────────────
function SlotChipPreview({ slotKey, slot, onTap }) {
  const h    = parseFloat(slotKey)
  const hour = String(Math.floor(h)).padStart(2, '0')
  const min  = h % 1 === 0 ? '00' : '30'
  const meta = `${hour}:${min}${slot.duration ? ` · ${slot.duration}min` : ''}`
  return (
    <div className={s.pillChip} onClick={() => onTap(h)}>
      <div className={s.pillChipStripe} style={{ background: slot.color || '#8B5CF6' }} />
      <div className={s.pillChipBody}>
        <span className={s.pillChipText}>{slot.text || '—'}</span>
        <span className={s.pillChipMeta}>{meta}</span>
      </div>
    </div>
  )
}

// ─── PillStrip ────────────────────────────────────────────
function PillStrip({ slots, visibleStart, visibleEnd, isTop, onExpand, onShrink, onExpandTo, birthdayPills = [] }) {
  const outSlots = Object.entries(slots)
    .filter(([k, v]) => {
      if (!v) return false
      const h = Math.floor(parseFloat(k))
      return isTop ? h < visibleStart : h > visibleEnd
    })
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))

  const showBirthdays = isTop && birthdayPills.length > 0

  return (
    <div className={s.pillStrip}>
      <button className={[s.pillBtn, s.pillBtnMinus].join(' ')} onClick={onShrink}>−</button>
      <div className={s.pillChips}>
        {showBirthdays && birthdayPills.map(b => (
          <div
            key={b.id}
            className={s.pillChip}
            style={{ borderLeft: `3px solid ${b._color || 'var(--primary)'}`, cursor: 'default', opacity: 0.85 }}
            title={`${b.name} hat heute Geburtstag`}
          >
            <div className={s.pillChipBody}>
              <span className={s.pillChipText}>{b.name}</span>
              <span className={s.pillChipMeta}>Geburtstag</span>
            </div>
          </div>
        ))}
        {outSlots.map(([k, slot]) => (
          <SlotChipPreview key={k} slotKey={k} slot={slot} onTap={onExpandTo} />
        ))}
      </div>
      <button className={[s.pillBtn, s.pillBtnPlus].join(' ')} onClick={onExpand}>+</button>
    </div>
  )
}

// ─── Zeitplan ─────────────────────────────────────────────
export default function Zeitplan({
  slots = {},
  todos = [],
  setTodos,
  visibleStart = 8,
  visibleEnd = 18,
  dateLabel,
  onSetSlot,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onShiftAll,
  onExpandUp,
  onExpandDown,
  onExpandUpTo,
  onExpandDownTo,
  onRemoveHour,
  onToggleLock,
  registerHalf,
  startSlotDrag,
  blockers = [],
  onCreateBlocker,
  onEditBlocker,
  onToggleBlockerLocked,
  onFokusMode,
  onPlaySlot,
  onEmptyTap,
  birthdayPills = [],
  birthdayPillsDate = null,
}) {
  // Alles/Minimal: Default Alles, letzter Stand bleibt gespeichert
  const [hideEmpty, setHideEmptyS]      = useState(() => lv(SK.zeitplanMinimal, false))
  const setHideEmpty = (v) => { setHideEmptyS(v); sv(SK.zeitplanMinimal, v) }
  const [removeDialog, setRemoveDialog] = useState(null)

  const openRemove  = useCallback((slotKey, slotText) => setRemoveDialog({ slotKey, slotText }), [])
  const closeRemove = useCallback(() => setRemoveDialog(null), [])

  const isNow = dateLabel === todayKey()

  // Minutengenaue "Jetzt"-Linie: tickt jede Minute, nur am heutigen Tag
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    if (!isNow) return
    const id = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [isNow])
  const now = new Date(nowTick)

  const fullHours  = Array.from({ length: 24 }, (_, i) => i)
  const rangeHours = Array.from({ length: visibleEnd - visibleStart + 1 }, (_, i) => i + visibleStart)

  // blockersForDate muss vor hours berechnet werden
  const blockersForDate = useMemo(
    () => getBlockersForDate(blockers, dateLabel),
    [blockers, dateLabel]
  )

  // Birthday-Pills für PillStrip: kalender:true + kein wichtig am Datumstag
  const activeBirthdayPills = useMemo(() => {
    if (!birthdayPillsDate) return []
    return getBirthdaysForCalendarDate(birthdayPills, birthdayPillsDate)
      .filter(b => !b.wichtig)
      .map(b => ({ ...b, _color: 'var(--primary)' }))
  }, [birthdayPills, birthdayPillsDate])

  const hours = hideEmpty
    ? fullHours.filter(h =>
        slots[sk(h, false)] || slots[sk(h, true)] || !!getBlockerForHour(h, blockersForDate)
      )
    : rangeHours

  const consumedKeys = new Set()
  for (const key of ALL_SLOT_KEYS) {
    const slot = slots[key]
    if (!slot) continue
    const dur = slot.duration || 30
    if (dur <= 30) continue
    const spanned = getDurationKeys(key, dur)
    for (let i = 1; i < spanned.length; i++) consumedKeys.add(spanned[i])
  }

  // Stunden in Sections aufteilen: normal | blocker
  const sections = useMemo(() => {
    const result  = []
    let normalBuf = []
    const handled = new Set()

    for (const h of hours) {
      const blocker = getBlockerForHour(h, blockersForDate)
      if (blocker) {
        if (!handled.has(blocker.id)) {
          if (normalBuf.length) {
            result.push({ type: 'normal', hours: normalBuf })
            normalBuf = []
          }
          const blockerHours = hours.filter(bh => bh >= blocker.startHour && bh < blocker.endHour)
          result.push({ type: 'blocker', blocker, hours: blockerHours })
          handled.add(blocker.id)
        }
      } else {
        normalBuf.push(h)
      }
    }
    if (normalBuf.length) result.push({ type: 'normal', hours: normalBuf })
    return result
  }, [hours, blockersForDate])

  // ─── Hour rows renderer (wiederverwendet in normal sections) ──
  const renderHourRows = (hourList) => hourList.map((h, hi) => {
    const rowBase = hi * 2 + 1
    const topKey  = sk(h, false)
    const botKey  = sk(h, true)
    const topSlot = slots[topKey]
    const botSlot = slots[botKey]
    const isNowHour   = isNow && now.getHours() === h
    const topConsumed = consumedKeys.has(topKey)
    const botConsumed = consumedKeys.has(botKey)

    const topSpan = topSlot ? Math.ceil((topSlot.duration || 30) / 30) : 1
    const botSpan = botSlot ? Math.ceil((botSlot.duration || 30) / 30) : 1

    return [
      <div
        key={`lbl-${h}`}
        className={[s.sgLabel, isNowHour ? s.sgLabelNow : ''].join(' ')}
        style={{ gridRow: `${rowBase} / span 2` }}
      >
        {String(h).padStart(2, '0')}
      </div>,

      topConsumed
        ? <div key={`top-${h}`} className={s.sgConsumed} />
        : topSlot
          ? <div
              key={`top-${h}`}
              className={s.sgHalf}
              style={{ gridRow: topSpan > 1 ? `${rowBase} / span ${topSpan}` : String(rowBase) }}
              ref={el => registerHalf?.(topKey, el, topSlot.locked ? 'locked' : 'occupied')}
            >
              <SlotBlock
                slotKey={topKey}
                slot={topSlot}
                todo={todos.find(t => t.id === topSlot.todoId) || null}
                todos={todos}
                setTodos={setTodos}
                onToggleDone={() => onToggleSlotDone?.(topKey)}
                onEdit={() => {
                  const lt = todos.find(t => t.id === topSlot.todoId)
                  lt ? onEditTodo?.(lt.id) : onEditTodo?.(topKey)
                }}
                onRemove={() => openRemove(topKey, topSlot.text)}
                onDragStart={startSlotDrag && !topSlot.locked
                  ? (e) => startSlotDrag(topKey, e)
                  : undefined
                }
                onToggleLock={() => onToggleLock?.(topKey)}
                onSaveSlot={onSetSlot}
                onPlay={onPlaySlot && !topSlot.done ? () => onPlaySlot(topKey, topSlot) : undefined}
              />
            </div>
          : <div
              key={`top-${h}`}
              className={[s.sgHalf, s.sgEmpty, isNowHour ? s.sgNow : ''].join(' ')}
              style={{ gridRow: String(rowBase) }}
              ref={el => registerHalf?.(topKey, el, 'empty')}
              onClick={onEmptyTap ? () => onEmptyTap(topKey) : undefined}
            >
              <span className={s.halfTime}>:00</span>
            </div>,

      botConsumed
        ? <div key={`bot-${h}`} className={s.sgConsumed} />
        : botSlot
          ? <div
              key={`bot-${h}`}
              className={[s.sgHalf, s.sgHalfBot].join(' ')}
              style={{ gridRow: botSpan > 1 ? `${rowBase + 1} / span ${botSpan}` : String(rowBase + 1) }}
              ref={el => registerHalf?.(botKey, el, botSlot.locked ? 'locked' : 'occupied')}
            >
              <SlotBlock
                slotKey={botKey}
                slot={botSlot}
                todo={todos.find(t => t.id === botSlot.todoId) || null}
                todos={todos}
                setTodos={setTodos}
                onToggleDone={() => onToggleSlotDone?.(botKey)}
                onEdit={() => {
                  const lt = todos.find(t => t.id === botSlot.todoId)
                  lt ? onEditTodo?.(lt.id) : onEditTodo?.(botKey)
                }}
                onRemove={() => openRemove(botKey, botSlot.text)}
                onDragStart={startSlotDrag && !botSlot.locked
                  ? (e) => startSlotDrag(botKey, e)
                  : undefined
                }
                onToggleLock={() => onToggleLock?.(botKey)}
                onSaveSlot={onSetSlot}
                onPlay={onPlaySlot && !botSlot.done ? () => onPlaySlot(botKey, botSlot) : undefined}
              />
            </div>
          : <div
              key={`bot-${h}`}
              className={[s.sgHalf, s.sgHalfBot, s.sgEmpty].join(' ')}
              style={{ gridRow: String(rowBase + 1) }}
              ref={el => registerHalf?.(botKey, el, 'empty')}
              onClick={onEmptyTap ? () => onEmptyTap(botKey) : undefined}
            >
              <span className={s.halfTime}>:30</span>
            </div>,
    ].filter(Boolean)
  })

  return (
    <div className={s.zeitplan}>

      {/* Shift controls */}
      <div className={s.controls}>
        <button
          className={s.shiftBtn}
          style={hideEmpty ? { visibility: 'hidden' } : undefined}
          onClick={() => onShiftAll?.(-1)}
          aria-label="Alle Slots 30 Minuten früher"
          title="Alle Slots 30 Minuten früher"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg>
        </button>
        <button
          className={s.shiftBtn}
          style={hideEmpty ? { visibility: 'hidden' } : undefined}
          onClick={() => onShiftAll?.(1)}
          aria-label="Alle Slots 30 Minuten später"
          title="Alle Slots 30 Minuten später"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        <div style={{ flex: 1 }} />
        {onCreateBlocker && (
          <button className={s.blockerBtn} onClick={onCreateBlocker}>+ Fenster</button>
        )}
        <div className={s.viewToggle}>
          <button className={[s.viewBtn, !hideEmpty ? s.viewBtnActive : ''].join(' ')} onClick={() => setHideEmpty(false)}>Alles</button>
          <button className={[s.viewBtn,  hideEmpty ? s.viewBtnActive : ''].join(' ')} onClick={() => setHideEmpty(true)}>Minimal</button>
          {onFokusMode && (
            <button className={s.viewBtn} onClick={() => onFokusMode()}>Fokus</button>
          )}
        </div>
      </div>

      {/* Top pill strip — nur in Alles-Modus */}
      {!hideEmpty && (
        <PillStrip
          slots={slots}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          isTop={true}
          onExpand={() => onExpandUp?.()}
          onShrink={() => onRemoveHour?.(visibleStart)}
          onExpandTo={(h) => onExpandUpTo?.(h)}
          birthdayPills={activeBirthdayPills}
        />
      )}

      {/* Sections: normal grids + blocker cards */}
      <div className={s.slotsContainer}>
        {sections.map((sec, si) =>
          sec.type === 'normal'
            ? (
              <div key={`sec-${si}`} className={s.sgGrid}>
                {/* Minutengenaue Jetzt-Linie — erstes Grid-Kind (Position via gridRow),
                    damit die :last-child-Border-Regeln unberührt bleiben */}
                {isNow && sec.hours.includes(now.getHours()) && (() => {
                  const idx     = sec.hours.indexOf(now.getHours())
                  const nowMin  = now.getMinutes()
                  return (
                    <div
                      className={s.nowLine}
                      style={{
                        gridRow: String(idx * 2 + 1 + (nowMin < 30 ? 0 : 1)),
                        '--now-top': `${((nowMin % 30) / 30) * 100}%`,
                      }}
                    />
                  )
                })()}
                {renderHourRows(sec.hours)}
              </div>
            )
            : (
              <BlockerCard
                key={sec.blocker.id}
                blocker={sec.blocker}
                hours={sec.hours}
                slots={slots}
                todos={todos}
                setTodos={setTodos}
                consumedKeys={consumedKeys}
                onToggleSlotDone={onToggleSlotDone}
                onEditTodo={onEditTodo}
                onRemoveSlot={(key, text) => openRemove(key, text)}
                onToggleLock={onToggleLock}
                onToggleLocked={() => onToggleBlockerLocked?.(sec.blocker.id)}
                onSetSlot={onSetSlot}
                registerHalf={registerHalf}
                startSlotDrag={startSlotDrag}
                onEdit={() => onEditBlocker?.(sec.blocker)}
              />
            )
        )}
      </div>

      {/* Bottom pill strip — nur in Alles-Modus */}
      {!hideEmpty && (
        <PillStrip
          slots={slots}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          isTop={false}
          onExpand={() => onExpandDown?.()}
          onShrink={() => onRemoveHour?.(visibleEnd)}
          onExpandTo={(h) => onExpandDownTo?.(h)}
        />
      )}

      {/* Remove dialog */}
      {removeDialog && (
        <RemoveDialog
          slotKey={removeDialog.slotKey}
          slotText={removeDialog.slotText}
          onBack={() => { onRemoveSlot?.(removeDialog.slotKey, 'back'); closeRemove() }}
          onDelete={() => { onRemoveSlot?.(removeDialog.slotKey, 'delete'); closeRemove() }}
          onClose={closeRemove}
        />
      )}
    </div>
  )
}
