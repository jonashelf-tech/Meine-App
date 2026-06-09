import { useState, useEffect, useRef, useCallback } from 'react'
import { dateKey as toDateKey } from '../../utils'
import TodoModal from '../../components/TodoModal/TodoModal'
import TapPulse from './TapPulse'
import wk from '../../features/calendar/TabKalender/TabKalender.module.css'
import s from './AppBriefing.module.css'

// Briefing-eigenes Wochen-Grid — nutzt die ECHTEN TabKalender-Styles (pixelgleich),
// rendert read-only mit Demo-Daten. Keine Änderung am echten Kalender.
//   mode='drag'   → Ghost-Block gleitet über Tag + Uhrzeit
//   mode='create' → Tap-Puls auf leere Spalte, danach öffnet kurz ein TodoModal

const SLOT_H = 28
const VIS_START = 8
const VIS_END = 14
const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const slotTop = key => (parseFloat(key) - VIS_START) * 2 * SLOT_H
const slotHeight = dur => Math.max(10, Math.round(((dur ?? 30) / 30) * SLOT_H))
const sleep = ms => new Promise(r => setTimeout(r, ms))

function getMonday(d) {
  const x = new Date(d); const day = x.getDay()
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); x.setHours(0, 0, 0, 0)
  return x
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export default function WeekGridDemo({ mode = 'drag' }) {
  const stageRef = useRef(null)
  const ghostRef = useRef(null)
  const cols = useRef({})

  const [weekDays] = useState(() => {
    const mon = getMonday(new Date())
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
  })
  const todayKey = toDateKey(new Date())
  const colHeight = (VIS_END - VIS_START) * 2 * SLOT_H

  const [slots] = useState(() => {
    const dk = i => toDateKey(weekDays[i])
    return {
      [dk(1)]: { '9':  { text: 'Sport',  color: '#10B981', duration: 60 } },
      [dk(2)]: { '11': { text: 'Einkauf', color: '#14B8A6', duration: 30 } },
      [dk(4)]: { '13': { text: 'Putzen', color: '#FB7185', duration: 45 } },
    }
  })

  const [showModal, setShowModal] = useState(false)

  // ── Drag-Mode: Ghost gleitet Di 09:00 → Do 12:00 ──
  useEffect(() => {
    if (mode !== 'drag') return
    let alive = true
    const run = async () => {
      while (alive) {
        const stage = stageRef.current, ghost = ghostRef.current
        const cA = cols.current[toDateKey(weekDays[1])]
        const cB = cols.current[toDateKey(weekDays[3])]
        if (!stage || !ghost || !cA || !cB) { await sleep(150); continue }
        const sb = stage.getBoundingClientRect()
        const ra = cA.getBoundingClientRect()
        const rb = cB.getBoundingClientRect()
        const x0 = ra.left - sb.left + 2, y0 = ra.top - sb.top + slotTop('9')
        const x1 = rb.left - sb.left + 2, y1 = rb.top - sb.top + slotTop('12')
        ghost.style.width = `${ra.width - 4}px`
        ghost.style.transform = `translate(${x0}px, ${y0}px)`
        await sleep(1200); if (!alive) break
        ghost.style.opacity = '1'
        await sleep(520); if (!alive) break
        ghost.style.transform = `translate(${x1}px, ${y1}px)`
        await sleep(1050); if (!alive) break
        await sleep(800); if (!alive) break
        ghost.style.opacity = '0'
        await sleep(150)
      }
    }
    run()
    return () => { alive = false }
  }, [mode, weekDays])

  // ── Create-Mode: Puls auf leere Spalte → Modal öffnet kurz ──
  useEffect(() => {
    if (mode !== 'create') return
    let alive = true
    const run = async () => {
      while (alive) {
        setShowModal(false)
        await sleep(2000); if (!alive) break
        setShowModal(true)
        await sleep(2000); if (!alive) break
      }
    }
    run()
    return () => { alive = false }
  }, [mode])

  const createDk = toDateKey(weekDays[5]) // Samstag (leer)
  const getEmptyCol = useCallback(() => cols.current[createDk], [createDk])

  return (
    <div className={s.stageRel} ref={stageRef}>
      <div className={wk.weekWrapper}>
        <div className={wk.weekHeaderRow}>
          <div className={wk.weekTimeCorner} />
          {weekDays.map(d => {
            const dk = toDateKey(d)
            return (
              <div key={dk} className={[wk.weekDayHead, dk === todayKey ? wk.weekDayHeadToday : ''].join(' ')}>
                <span className={wk.weekDayHeadName}>{DAY_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                <span className={wk.weekDayHeadNum}>{d.getDate()}</span>
              </div>
            )
          })}
        </div>

        <div className={wk.weekScrollBody} style={{ height: 'auto', maxHeight: 'none', overflow: 'visible' }}>
          <div className={wk.weekTimeAxis}>
            {Array.from({ length: (VIS_END - VIS_START) * 2 }, (_, i) => {
              const h = VIS_START + i * 0.5
              const isHour = h === Math.floor(h)
              return <div key={i} className={wk.weekTimeLabel}>{isHour ? `${String(Math.floor(h)).padStart(2, '0')}:00` : ''}</div>
            })}
          </div>
          <div className={wk.weekColsBody}>
            {weekDays.map(d => {
              const dk = toDateKey(d)
              const daySlots = slots[dk] ?? {}
              return (
                <div
                  key={dk}
                  className={[wk.weekDayCol, dk === todayKey ? wk.weekDayColToday : ''].join(' ')}
                  style={{ height: colHeight }}
                  ref={el => { if (el) cols.current[dk] = el }}
                >
                  {Object.entries(daySlots).map(([key, slot]) => (
                    <div
                      key={key}
                      className={wk.weekSlotBlock}
                      style={{ top: slotTop(key), height: slotHeight(slot.duration), '--slot-color': slot.color }}
                    >
                      <span className={wk.weekSlotName}>{slot.text}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Drag-Mode: Ghost-Block */}
      {mode === 'drag' && (
        <div
          ref={ghostRef}
          className={[wk.weekSlotBlock, s.weekGhost].join(' ')}
          style={{ position: 'absolute', left: 0, top: 0, right: 'auto', height: slotHeight(45), '--slot-color': '#8B5CF6', opacity: 0 }}
        >
          <span className={wk.weekSlotName}>Termin</span>
        </div>
      )}

      {/* Create-Mode: Tap-Puls + kurz öffnendes Modal */}
      {mode === 'create' && !showModal && <TapPulse stageRef={stageRef} getTarget={getEmptyCol} />}
      {mode === 'create' && showModal && (
        <div className={s.modalOver}>
          <TodoModal prefill={{ date: createDk, time: '15:00' }} onClose={() => {}} />
        </div>
      )}
    </div>
  )
}
