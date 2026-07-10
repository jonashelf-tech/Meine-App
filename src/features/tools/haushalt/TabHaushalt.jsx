import { useState, useCallback } from 'react'
import { sv, lv, SK } from '../../../storage'
import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { useToast } from '../../../components/Toast/Toast'
import HaushaltBriefing from './HaushaltBriefing'
import {
  loadHaushalt, saveHaushalt,
  taskSegments, taskDueLabel, calcRingScore, roomStatus, STATUS_META,
  markTaskDone, resetTaskDone, getUrgentTasks, getDueRooms,
  addRoom, updateRoom, deleteRoom,
  addTask, updateTask, deleteTask,
} from './haushaltData'
import { Glyph } from '../_shared/glyphs'
import { RoomSheet, TaskSheet } from './HaushaltSheet'
import s from './TabHaushalt.module.css'

// ─── Icons ────────────────────────────────────────────────
const HausIcon = () => <Glyph name="home" size={22} />

const PencilIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const CheckIcon = () => (
  <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const BoltIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const BatteryLowIcon = () => (
  <svg width={16} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="16" height="10" rx="2"/>
    <line x1="22" y1="11" x2="22" y2="13"/>
    <line x1="6" y1="12" x2="8" y2="12" strokeWidth={3}/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg
    width={10} height={10} viewBox="0 0 10 10"
    fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}
  >
    <polyline points="2 3 5 7 8 3"/>
  </svg>
)

const ClockIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
  </svg>
)

const ListIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

// ─── Score Hero ───────────────────────────────────────────
const RING_R = 24
const RING_C = 2 * Math.PI * RING_R

function ScoreHero({ score, dueCount, energie, onEnergieChange }) {
  const color = score >= 70 ? 'var(--emerald)' : score >= 40 ? 'var(--amber)' : 'var(--rose)'
  const label = score >= 70 ? 'Wohnung im Griff' : score >= 40 ? 'Einiges liegt an' : 'Viel offen, kein Stress'
  const sub   = dueCount === 0
    ? 'Gerade nichts fällig'
    : `${dueCount} ${dueCount === 1 ? 'Aufgabe' : 'Aufgaben'} fällig`

  return (
    <div className={s.hero}>
      <div className={s.heroTop}>
        <div className={s.heroInfo}>
          <div className={s.heroKick}><span className={s.heroDot} /> Wohnung im Blick</div>
          <h2 className={s.heroTitle}>{label}</h2>
          <div className={s.heroMeta}>{sub}</div>
        </div>
        <div className={s.ring}>
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r={RING_R} fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle
              cx="28" cy="28" r={RING_R} fill="none"
              stroke={color} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - Math.min(score, 100) / 100)}
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dashoffset 0.5s var(--ease-out)' }}
            />
          </svg>
          <span className={s.ringTxt} style={{ color }}>{score}<small>%</small></span>
        </div>
      </div>

      <div className={s.energieSeg}>
        <button
          className={[s.energieBtn, energie === 'normal' ? s.energieBtnActive : ''].join(' ')}
          onClick={() => onEnergieChange('normal')}
        >
          <BoltIcon /> Normal
        </button>
        <button
          className={[s.energieBtn, energie === 'low' ? s.energieBtnActive : ''].join(' ')}
          onClick={() => onEnergieChange('low')}
        >
          <BatteryLowIcon /> Low Energy
        </button>
      </div>
    </div>
  )
}

// ─── Stat-Kacheln ─────────────────────────────────────────
function StatTiles({ dueCount, dueMin, doneToday }) {
  return (
    <div className={s.tiles}>
      <div className={[s.tile, s.tileHighlight].join(' ')}>
        <div className={s.tileIcon}><ListIcon /></div>
        <div className={s.tileNum}>{dueCount}</div>
        <div className={s.tileLabel}>Jetzt fällig</div>
      </div>
      <div className={s.tile}>
        <div className={s.tileIcon}><CheckCircleIcon /></div>
        <div className={s.tileNum}>{doneToday}</div>
        <div className={s.tileLabel}>Heute geschafft</div>
      </div>
      <div className={s.tile}>
        <div className={s.tileIcon}><ClockIcon /></div>
        <div className={s.tileNum}>{dueMin}<small>min</small></div>
        <div className={s.tileLabel}>Offen jetzt</div>
      </div>
    </div>
  )
}

// ─── Segment Bar ──────────────────────────────────────────
function SegmentBar({ task }) {
  const { filled, total, color, overdue } = taskSegments(task)
  return (
    <div className={s.segBar}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={s.seg}
          style={{
            background: i < filled ? color : undefined,
            boxShadow: overdue && i < filled ? `0 0 4px ${color}` : undefined,
          }}
        />
      ))}
    </div>
  )
}

// ─── Task Row (Anzeige — Bearbeiten wohnt im Sheet) ───────
function TaskRow({ task, dimmed, onOpen, onDone }) {
  const { color, overdue } = taskSegments(task)

  return (
    <div className={[s.taskRow, dimmed ? s.taskRowDimmed : ''].join(' ')}>
      <button className={s.taskView} onClick={onOpen}>
        <div className={s.taskTop}>
          <span className={s.taskText}>
            {task.text}
            {task.lowEnergy && <span className={s.lowBadge}><BatteryLowIcon /></span>}
          </span>
          <span className={s.taskDue} style={{ color: overdue ? 'var(--rose)' : color }}>
            {taskDueLabel(task)}
          </span>
        </div>
        <SegmentBar task={task} />
      </button>
      {!dimmed && (
        <button className={s.doneBtn} onClick={onDone} title="Erledigt">
          <CheckIcon />
        </button>
      )}
    </div>
  )
}

// ─── Raum Karte ───────────────────────────────────────────
function RaumKarte({ room, energie, open, onToggle, onEditRoom, onOpenTask, onAddTask, onTaskDone }) {
  const status = roomStatus(room)
  const sm     = STATUS_META[status]
  const dueInRoom = room.tasks.filter(t => taskSegments(t).overdue).length

  return (
    <div className={[s.roomCard, open ? s.roomCardOpen : ''].join(' ')}>
      <div className={s.roomHeader} onClick={onToggle}>
        <span className={s.roomIcon}><Glyph name={room.icon} size={19} /></span>
        <span className={s.roomName}>{room.name}</span>
        {!open && dueInRoom > 0 && (
          <span className={s.roomDueDot} title={`${dueInRoom} fällig`} />
        )}
        <span className={s.statusBadge} style={{ color: sm.color, background: `color-mix(in srgb, ${sm.color} 14%, transparent)` }}>{sm.label}</span>
        <button
          className={s.editBtn}
          onClick={e => { e.stopPropagation(); onEditRoom() }}
          title="Raum bearbeiten"
        >
          <PencilIcon />
        </button>
        <span className={s.chevron}><ChevronIcon open={open} /></span>
      </div>

      {open && (
        <div className={s.roomBody}>
          {room.tasks.length === 0 && (
            <div className={s.emptyRoom}>Noch keine Aufgaben in diesem Raum.</div>
          )}

          {room.tasks.map(task => {
            const dimmed = energie === 'low' && !task.lowEnergy
            return (
              <TaskRow
                key={task.id}
                task={task}
                dimmed={dimmed}
                onOpen={() => onOpenTask(task)}
                onDone={() => onTaskDone(task.id)}
              />
            )
          })}

          {energie === 'low' && (() => {
            const hidden = room.tasks.filter(t => !t.lowEnergy).length
            return hidden > 0 ? (
              <div className={s.hiddenHint}>
                {hidden} {hidden === 1 ? 'Aufgabe' : 'Aufgaben'} ausgeblendet — Normal für alle
              </div>
            ) : null
          })()}

          <button className={s.addTaskBtn} onClick={onAddTask}>+ Aufgabe</button>
        </div>
      )}
    </div>
  )
}

// ─── TabHaushalt ──────────────────────────────────────────
export default function TabHaushalt({ onBack }) {
  const { toolColors } = useAppStore()
  const { showToast }  = useToast()
  const [config,    setConfig]    = useState(() => loadHaushalt())
  const [energie,   setEnergie]   = useState(() => lv(SK.haushaltEnergie, 'normal'))
  const [openRooms, setOpenRooms] = useState({})
  // sheet: null | { type: 'room', room: Room|null } | { type: 'task', roomId, task: Task|null }
  const [sheet,     setSheet]     = useState(null)

  const toolColor = getToolColor('haushalt', toolColors)

  // next kann ein Wert ODER eine Updater-Funktion (prev => next) sein.
  // Funktionale Form verhindert Stale-Closure-Races bei schnell aufeinander
  // folgenden Aktionen (z.B. mehrere Tasks rasch abhaken).
  const updateConfig = useCallback((next) => {
    setConfig(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next
      saveHaushalt(resolved)
      return resolved
    })
  }, [])

  const handleEnergieChange = (val) => {
    setEnergie(val)
    sv(SK.haushaltEnergie, val)
  }

  const toggleRoom = (id) => setOpenRooms(p => ({ ...p, [id]: !p[id] }))

  const handleRoomSave = (room) => {
    const isNew = !sheet.room
    updateConfig(prev => isNew ? addRoom(prev, room) : updateRoom(prev, room.id, room))
    if (isNew) setOpenRooms(p => ({ ...p, [room.id]: true }))
    setSheet(null)
    showToast(isNew ? `${room.name} angelegt` : 'Gespeichert', 'success')
  }

  const handleRoomDelete = (roomId) => {
    updateConfig(prev => deleteRoom(prev, roomId))
    setOpenRooms(p => { const n = { ...p }; delete n[roomId]; return n })
    showToast('Raum gelöscht', 'success')
  }

  const handleTaskSave = (task) => {
    const { roomId } = sheet
    const isNew = !sheet.task
    updateConfig(prev => isNew ? addTask(prev, roomId, task) : updateTask(prev, roomId, task.id, task))
    setSheet(null)
    showToast(isNew ? 'Aufgabe angelegt' : 'Gespeichert', 'success')
  }

  const handleTaskDelete = (taskId) => {
    updateConfig(prev => deleteTask(prev, sheet.roomId, taskId))
    showToast('Aufgabe gelöscht', 'success')
  }

  const handleTaskReset = (taskId) => {
    updateConfig(prev => resetTaskDone(prev, taskId))
    showToast('Als neu markiert', 'success')
  }

  if (!config.briefingDone) {
    return <HaushaltBriefing config={config} onComplete={updateConfig} onBack={onBack} />
  }

  const score  = calcRingScore(config.rooms)
  const today  = todayKey()
  const dueTasks  = getDueRooms(config, energie).flatMap(e => e.dueTasks)
  const dueCount  = dueTasks.length
  const dueMin    = dueTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0)
  const doneToday = config.rooms.flatMap(r => r.tasks).filter(t => t.lastDone === today).length
  const urgent = getUrgentTasks(config, 99)
    .filter(({ task }) => energie !== 'low' || task.lowEnergy)
    .slice(0, 3)

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader onBack={onBack} icon={<HausIcon />} eyebrow="Tool" title="Haushalt" />

      <ScoreHero score={score} dueCount={dueCount} energie={energie} onEnergieChange={handleEnergieChange} />

      <StatTiles dueCount={dueCount} dueMin={dueMin} doneToday={doneToday} />

      {urgent.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionLabel}>Jetzt dran</div>
          <div className={s.urgentCard}>
            {urgent.map(({ task, room }) => (
              <div key={task.id} className={s.urgentRow}>
                <span className={s.urgentIcon}><Glyph name={room.icon} size={16} /></span>
                <div className={s.urgentMain}>
                  <span className={s.urgentText}>{task.text}</span>
                  <span className={s.urgentRoomName}>{room.name} · {taskDueLabel(task)}</span>
                </div>
                <button
                  className={s.doneBtn}
                  onClick={() => updateConfig(prev => markTaskDone(prev, task.id))}
                  title="Erledigt"
                >
                  <CheckIcon />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={s.section}>
        <div className={s.sectionLabel}>Räume</div>
        <div className={s.rooms}>
          {config.rooms.map(room => (
            <RaumKarte
              key={room.id}
              room={room}
              energie={energie}
              open={!!openRooms[room.id]}
              onToggle={() => toggleRoom(room.id)}
              onEditRoom={() => setSheet({ type: 'room', room })}
              onOpenTask={(task) => setSheet({ type: 'task', roomId: room.id, task })}
              onAddTask={() => setSheet({ type: 'task', roomId: room.id, task: null })}
              onTaskDone={taskId => updateConfig(prev => markTaskDone(prev, taskId))}
            />
          ))}

          <button className={s.addRoomBtn} onClick={() => setSheet({ type: 'room', room: null })}>
            + Raum hinzufügen
          </button>
        </div>
      </section>

      <button
        className={s.setupLink}
        onClick={() => updateConfig({ ...config, briefingDone: false })}
      >
        Setup neu starten
      </button>

      {sheet?.type === 'room' && (
        <RoomSheet
          room={sheet.room}
          onSave={handleRoomSave}
          onDelete={handleRoomDelete}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === 'task' && (
        <TaskSheet
          task={sheet.task}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          onReset={handleTaskReset}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
