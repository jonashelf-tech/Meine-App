import { useState, useEffect, useMemo } from 'react'
import { todayKey, minsToHHMM } from '../../../utils'
import s from './CockpitBar.module.css'

const ChevronUp = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg>
)
const ChevronDown = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
)
const WindowIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/></svg>
)
const FokusIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/></svg>
)

function fmtMins(m) {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}

// ─── CockpitBar — Statuskarte über dem Zeitplan ────────────────
// Oben: Uhr (Orbitron) · Jetzt-/Nächster-Slot bzw. Tages-Zusammenfassung ·
// Bilanz. Unten angedockt: die Zeitplan-Funktionen (Shift ↑/↓, Fenster, Fokus).
export default function CockpitBar({ viewDate, slots = {}, onShiftAll, onCreateBlocker, onFokusMode }) {
  const isToday = viewDate === todayKey()

  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const now = new Date(nowTick)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const { total, done, status } = useMemo(() => {
    const entries = Object.entries(slots).map(([key, slot]) => {
      const start = Math.round(parseFloat(key) * 60)
      return { start, end: start + (slot.duration || 30), slot }
    })
    const total = entries.length
    const done = entries.filter(e => e.slot.done).length

    if (!isToday) {
      const plannedMin = entries.reduce((sum, e) => sum + (e.slot.duration || 30), 0)
      return {
        total, done,
        status: total > 0
          ? { label: 'Tagesplan', text: `${total} Slot${total === 1 ? '' : 's'} · ${fmtMins(plannedMin)} verplant` }
          : { label: 'Tagesplan', text: 'Noch nichts geplant' },
      }
    }

    const running = entries.find(e => !e.slot.done && e.start <= nowMin && nowMin < e.end)
    if (running) {
      return { total, done, status: {
        label: 'Jetzt läuft',
        text: running.slot.text || 'Ohne Titel',
        suffix: `noch ${fmtMins(running.end - nowMin)}`,
      } }
    }
    const next = entries
      .filter(e => !e.slot.done && e.start >= nowMin)
      .sort((a, b) => a.start - b.start)[0]
    if (next) {
      return { total, done, status: {
        label: 'Nächster Slot',
        text: next.slot.text || 'Ohne Titel',
        suffix: `${minsToHHMM(next.start)} · in ${fmtMins(next.start - nowMin)}`,
      } }
    }
    return { total, done, status: {
      label: 'Heute',
      text: total > 0 ? (done === total ? 'Alles erledigt' : 'Nichts mehr geplant') : 'Noch nichts geplant',
    } }
  }, [slots, isToday, nowMin])

  return (
    <div className={s.cockpit}>
      <div className={s.top}>
        <span className={s.clock}>{clock}</span>
        <div className={s.status}>
          <div className={s.statusLabel}>{status.label}</div>
          <div className={s.statusText}>
            {status.text}
            {status.suffix && <span className={s.statusSuffix}> · {status.suffix}</span>}
          </div>
        </div>
        <div className={s.balance}>
          <div className={s.balanceNum}>{total > 0 ? `${done}/${total}` : '–'}</div>
          <div className={s.balanceCap}>erledigt</div>
        </div>
      </div>
      <div className={s.fnRow}>
        <button
          className={s.fnBtn}
          onClick={() => onShiftAll?.(-1)}
          aria-label="Alle Slots 30 Minuten früher"
          title="Alle Slots 30 Minuten früher"
        >{ChevronUp}<span>30m</span></button>
        <button
          className={s.fnBtn}
          onClick={() => onShiftAll?.(1)}
          aria-label="Alle Slots 30 Minuten später"
          title="Alle Slots 30 Minuten später"
        >{ChevronDown}<span>30m</span></button>
        {onCreateBlocker && (
          <button className={[s.fnBtn, s.fnBtnBlue, s.fnBtnGrow].join(' ')} onClick={onCreateBlocker}>
            {WindowIcon}<span>Fenster</span>
          </button>
        )}
        {onFokusMode && (
          <button className={[s.fnBtn, s.fnBtnViolet, s.fnBtnGrow].join(' ')} onClick={() => onFokusMode()}>
            {FokusIcon}<span>Fokus</span>
          </button>
        )}
      </div>
    </div>
  )
}
