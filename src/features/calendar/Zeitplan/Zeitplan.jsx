import { useState, useMemo, useEffect } from 'react'
import { sk, getDurationKeys, ALL_SLOT_KEYS, todayKey } from '../../../utils'
import { getBirthdaysForCalendarDate } from '../../tools/geburtstage/birthdayUtils'
import { computeBands } from './bandLogic'
import { useAppStore } from '../../../store'
import { isCalShown, calEmoji } from '../TabKalender/kalenderShared'
import s from './Zeitplan.module.css'
import SlotBlock from './SlotBlock'
import BlockerCard from '../Blocker/BlockerCard'
import { getBlockersForDate, getBlockerForHour } from '../Blocker/blockerUtils'

// ─── FreeBand — "frei"-Band statt PillStrip-Pillen ─────────
function FreeBand({ band, dir, onTapExpand, onTapShrink, registerHalf }) {
  const label = dir === 'top'
    ? `bis ${String(band.to).padStart(2, '0')}:00 · frei`
    : `ab ${String(band.from).padStart(2, '0')}:00 · frei`
  // Drop-Ziel: erste Stunde des angrenzenden Randes
  const dropKey = dir === 'top' ? String(band.to - 1) : String(band.from)
  return (
    <div
      className={s.freeBand}
      ref={el => registerHalf?.(dropKey, el, 'empty')}
      onClick={() => onTapExpand?.(dir)}
    >
      <span className={s.freeBandLabel}>{label}</span>
      <span className={s.freeBandControls}>
        <button
          className={s.freeBandBtn}
          onClick={e => { e.stopPropagation(); onTapShrink?.(dir) }}
          aria-label="Zeitbereich verkleinern"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round"><path d="M5 12h14"/></svg>
        </button>
        <button
          className={s.freeBandBtn}
          onClick={e => { e.stopPropagation(); onTapExpand?.(dir) }}
          aria-label="Zeitbereich erweitern"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </span>
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
  onTapExpand,
  onTapShrink,
  onToggleLock,
  registerHalf,
  startSlotDrag,
  blockers = [],
  onEditBlocker,
  onToggleBlockerLocked,
  onPlaySlot,
  onToPool,
  onEmptyTap,
  birthdayPills = [],
  birthdayPillsDate = null,
}) {
  const calFilter = useAppStore(st => st.calFilter)
  const calList   = useAppStore(st => st.calList)

  const isNow = dateLabel === todayKey()

  // Minutengenaue "Jetzt"-Linie: tickt jede Minute, nur am heutigen Tag
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    if (!isNow) return
    const id = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [isNow])
  const now = new Date(nowTick)
  // Minuten seit Mitternacht — null an fremden Tagen (kein Dimmen/Restzeit)
  const nowMin = isNow ? now.getHours() * 60 + now.getMinutes() : null

  // blockersForDate muss vor hours berechnet werden
  const blockersForDate = useMemo(
    () => getBlockersForDate(blockers, dateLabel),
    [blockers, dateLabel]
  )

  // Birthday-Streifen: kalender:true + kein wichtig am Datumstag
  const activeBirthdayPills = useMemo(() => {
    if (!birthdayPillsDate) return []
    return getBirthdaysForCalendarDate(birthdayPills, birthdayPillsDate)
      .filter(b => !b.wichtig)
      .map(b => ({ ...b, _color: 'var(--primary)' }))
  }, [birthdayPills, birthdayPillsDate])

  const { hours, topBand, bottomBand } = useMemo(
    () => computeBands({ slots, visStart: visibleStart, visEnd: visibleEnd }),
    [slots, visibleStart, visibleEnd]
  )

  const consumedKeys = new Set()
  for (const key of ALL_SLOT_KEYS) {
    const slot = slots[key]
    if (!slot) continue
    const dur = slot.duration || 30
    if (dur <= 30) continue
    const spanned = getDurationKeys(key, dur)
    for (let i = 1; i < spanned.length; i++) consumedKeys.add(spanned[i])
  }

  // Pausen: zusammenhängende leere Halbstunden ZWISCHEN belegten Slots einer
  // normal-Section (Randzeiten vor dem ersten/nach dem letzten Slot sind keine
  // Pause — dafür gibt es die frei-Bänder). Bewusste Vereinfachung: Lücken
  // über Blocker-Grenzen hinweg zählen nicht.
  const computePauseRuns = (hourList) => {
    const cells = []
    hourList.forEach((h, hi) => {
      for (const half of [false, true]) {
        const key = sk(h, half)
        cells.push({
          key,
          row: hi * 2 + (half ? 2 : 1),
          occupied: !!slots[key] || consumedKeys.has(key),
        })
      }
    })
    const firstOcc = cells.findIndex(c => c.occupied)
    if (firstOcc === -1) return []
    const lastOcc = cells.map(c => c.occupied).lastIndexOf(true)
    const runs = []
    let run = null
    for (let i = firstOcc; i <= lastOcc; i++) {
      if (!cells[i].occupied) {
        if (!run) run = { startKey: cells[i].key, startRow: cells[i].row, len: 0 }
        run.len++
      } else if (run) {
        runs.push(run)
        run = null
      }
    }
    return runs
  }

  const fmtPause = (mins) => {
    if (mins % 60 === 0 && mins >= 60) return `${mins / 60} h`
    if (mins < 120) return `${mins} min`
    return `${Math.floor(mins / 60)} h ${mins % 60} min`
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
    const hourPast    = nowMin != null && (h + 1) * 60 <= nowMin
    const topPast     = nowMin != null && h * 60 + 30 <= nowMin
    const botPast     = nowMin != null && (h + 1) * 60 <= nowMin
    const topConsumed = consumedKeys.has(topKey)
    const botConsumed = consumedKeys.has(botKey)

    const topSpan = topSlot ? Math.ceil((topSlot.duration || 30) / 30) : 1
    const botSpan = botSlot ? Math.ceil((botSlot.duration || 30) / 30) : 1

    // Geteilte Termine folgen dem globalen Kalender-Chip (nicht dem
    // Privat-Chip — der Tagesplaner zeigt eigene Todos immer, unabhängig
    // vom Deko-Filter der Kalenderübersicht). rangeBlocked/computeBands/
    // consumedKeys bleiben unverändert auf den rohen slots — ausgeblendet
    // heißt nur "kein Inhalt sichtbar", nicht "Zeit ist frei".
    const topTodo   = topSlot ? (todos.find(t => t.id === topSlot.todoId) || null) : null
    const topCal    = topTodo?.cal ?? null
    const topHidden = topCal ? !isCalShown(calFilter, topCal) : false
    const topEmoji  = topCal ? calEmoji(calList, topCal) : null

    const botTodo   = botSlot ? (todos.find(t => t.id === botSlot.todoId) || null) : null
    const botCal    = botTodo?.cal ?? null
    const botHidden = botCal ? !isCalShown(calFilter, botCal) : false
    const botEmoji  = botCal ? calEmoji(calList, botCal) : null

    return [
      <div
        key={`lbl-${h}`}
        className={[s.sgLabel, isNowHour ? s.sgLabelNow : '', hourPast ? s.sgLabelPast : ''].join(' ')}
        style={{ gridRow: `${rowBase} / span 2` }}
      >
        {String(h).padStart(2, '0')}
      </div>,

      topConsumed
        ? <div key={`top-${h}`} className={s.sgConsumed} />
        : topSlot
          ? topHidden
            ? <div
                key={`top-${h}`}
                className={s.sgHidden}
                style={{ gridRow: topSpan > 1 ? `${rowBase} / span ${topSpan}` : String(rowBase) }}
                ref={el => registerHalf?.(topKey, el, topSlot.locked ? 'locked' : 'occupied')}
              >
                <span className={s.sgHiddenLabel}>ausgeblendet</span>
              </div>
            : <div
                key={`top-${h}`}
                className={s.sgHalf}
                style={{ gridRow: topSpan > 1 ? `${rowBase} / span ${topSpan}` : String(rowBase) }}
                ref={el => registerHalf?.(topKey, el, topSlot.locked ? 'locked' : 'occupied')}
              >
                {topEmoji && <span className={s.slotEmoji}>{topEmoji}</span>}
                <SlotBlock
                  slotKey={topKey}
                  slot={topSlot}
                  todo={topTodo}
                  todos={todos}
                  setTodos={setTodos}
                  onToggleDone={() => onToggleSlotDone?.(topKey)}
                  onEdit={() => topTodo ? onEditTodo?.(topTodo.id) : onEditTodo?.(topKey)}
                  onDragStart={startSlotDrag && !topSlot.locked
                    ? (e) => startSlotDrag(topKey, e)
                    : undefined
                  }
                  onToggleLock={() => onToggleLock?.(topKey)}
                  onSaveSlot={onSetSlot}
                  onPlay={onPlaySlot && !topSlot.done ? () => onPlaySlot(topKey, topSlot) : undefined}
                  onToPool={() => onToPool?.({ slotKey: topKey })}
                  nowMin={nowMin}
                />
              </div>
          : <div
              key={`top-${h}`}
              className={[s.sgHalf, s.sgEmpty, isNowHour ? s.sgNow : '', topPast ? s.sgPast : ''].join(' ')}
              style={{ gridRow: String(rowBase) }}
              ref={el => registerHalf?.(topKey, el, 'empty')}
              onClick={onEmptyTap ? () => onEmptyTap(topKey) : undefined}
            />,

      botConsumed
        ? <div key={`bot-${h}`} className={s.sgConsumed} />
        : botSlot
          ? botHidden
            ? <div
                key={`bot-${h}`}
                className={[s.sgHidden, s.sgHalfBot].join(' ')}
                style={{ gridRow: botSpan > 1 ? `${rowBase + 1} / span ${botSpan}` : String(rowBase + 1) }}
                ref={el => registerHalf?.(botKey, el, botSlot.locked ? 'locked' : 'occupied')}
              >
                <span className={s.sgHiddenLabel}>ausgeblendet</span>
              </div>
            : <div
                key={`bot-${h}`}
                className={[s.sgHalf, s.sgHalfBot].join(' ')}
                style={{ gridRow: botSpan > 1 ? `${rowBase + 1} / span ${botSpan}` : String(rowBase + 1) }}
                ref={el => registerHalf?.(botKey, el, botSlot.locked ? 'locked' : 'occupied')}
              >
                {botEmoji && <span className={s.slotEmoji}>{botEmoji}</span>}
                <SlotBlock
                  slotKey={botKey}
                  slot={botSlot}
                  todo={botTodo}
                  todos={todos}
                  setTodos={setTodos}
                  onToggleDone={() => onToggleSlotDone?.(botKey)}
                  onEdit={() => botTodo ? onEditTodo?.(botTodo.id) : onEditTodo?.(botKey)}
                  onDragStart={startSlotDrag && !botSlot.locked
                    ? (e) => startSlotDrag(botKey, e)
                    : undefined
                  }
                  onToggleLock={() => onToggleLock?.(botKey)}
                  onSaveSlot={onSetSlot}
                  onPlay={onPlaySlot && !botSlot.done ? () => onPlaySlot(botKey, botSlot) : undefined}
                  onToPool={() => onToPool?.({ slotKey: botKey })}
                  nowMin={nowMin}
                />
              </div>
          : <div
              key={`bot-${h}`}
              className={[s.sgHalf, s.sgHalfBot, s.sgEmpty, botPast ? s.sgPast : ''].join(' ')}
              style={{ gridRow: String(rowBase + 1) }}
              ref={el => registerHalf?.(botKey, el, 'empty')}
              onClick={onEmptyTap ? () => onEmptyTap(botKey) : undefined}
            />,
    ].filter(Boolean)
  })

  return (
    <div className={s.zeitplan}>

      {/* Sections: all-day-Streifen + normale Grids + Blocker-Cards */}
      <div className={s.slotsContainer}>
        {activeBirthdayPills.length > 0 && (
          <div className={s.alldayStrip}>
            {activeBirthdayPills.map(b => (
              <div key={b.id} className={s.alldayEntry} title={`${b.name} hat heute Geburtstag`}>
                <span className={s.alldayName}>{b.name}</span>
                <span className={s.alldayMeta}>Geburtstag</span>
              </div>
            ))}
          </div>
        )}
        {topBand && (
          <FreeBand band={topBand} dir="top" onTapExpand={onTapExpand} onTapShrink={onTapShrink} registerHalf={registerHalf} />
        )}
        {sections.map((sec, si) =>
          sec.type === 'normal'
            ? (
              <div key={`sec-${si}`} className={s.sgGrid}>
                {/* Minutengenaue Jetzt-Linie — erstes Grid-Kind (Position via gridRow),
                    damit die :last-child-Border-Regeln unberührt bleiben */}
                {isNow && sec.hours.includes(now.getHours()) && (() => {
                  const idx      = sec.hours.indexOf(now.getHours())
                  const nowMins  = now.getMinutes()
                  return (
                    <div
                      className={s.nowLine}
                      style={{
                        gridRow: String(idx * 2 + 1 + (nowMins < 30 ? 0 : 1)),
                        '--now-top': `${((nowMins % 30) / 30) * 100}%`,
                      }}
                    />
                  )
                })()}
                {/* Pausen-Labels über Lücken zwischen Slots (Zellen bleiben tappbar) */}
                {computePauseRuns(sec.hours).map(run => (
                  <div
                    key={`pause-${run.startKey}`}
                    className={s.pauseOverlay}
                    style={{ gridRow: `${run.startRow} / span ${run.len}` }}
                  >
                    <span className={s.pauseLabel}>
                      {run.len === 1 ? '30 min' : `Pause · ${fmtPause(run.len * 30)}`}
                    </span>
                    {run.len >= 2 && onEmptyTap && (
                      <button
                        className={s.pausePlus}
                        onClick={() => onEmptyTap(run.startKey)}
                        aria-label="In der Pause planen"
                      >+</button>
                    )}
                  </div>
                ))}
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
                nowMin={nowMin}
                onToggleSlotDone={onToggleSlotDone}
                onEditTodo={onEditTodo}
                onToggleLock={onToggleLock}
                onToggleLocked={() => onToggleBlockerLocked?.(sec.blocker.id)}
                onSetSlot={onSetSlot}
                onToPool={onToPool}
                registerHalf={registerHalf}
                startSlotDrag={startSlotDrag}
                onEdit={() => onEditBlocker?.(sec.blocker)}
              />
            )
        )}
        {bottomBand && (
          <FreeBand band={bottomBand} dir="bottom" onTapExpand={onTapExpand} onTapShrink={onTapShrink} registerHalf={registerHalf} />
        )}
      </div>
    </div>
  )
}
