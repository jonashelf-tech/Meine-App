import { useState, useCallback } from 'react'
import { sv, lv, SK } from '../../../storage'
import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import HaushaltBriefing from './HaushaltBriefing'
import {
  loadHaushalt, saveHaushalt,
  taskSegments, taskDueLabel, calcRingScore, roomStatus, STATUS_META, FREQ_LABELS,
  markTaskDone, resetTaskDone, getUrgentTasks, getDueRooms,
  addRoom, updateRoom, deleteRoom,
  addTask, updateTask, deleteTask,
} from './haushaltData'
import { Glyph, ROOM_GLYPHS } from '../_shared/glyphs'
import GlyphPicker from '../_shared/GlyphPicker'
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

const ResetIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const XIcon = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
  </svg>
)

const ListIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

// ─── Score Hero ───────────────────────────────────────────
function ScoreHero({ score, dueCount, energie, onEnergieChange }) {
  const r     = 30
  const circ  = 2 * Math.PI * r
  const dash  = (Math.min(score, 100) / 100) * circ
  const color = score >= 70 ? 'var(--emerald)' : score >= 40 ? 'var(--amber)' : 'var(--rose)'
  const label = score >= 70 ? 'Wohnung im Griff' : score >= 40 ? 'Einiges liegt an' : 'Viel offen, kein Stress'
  const sub   = dueCount === 0
    ? 'Gerade nichts fällig'
    : `${dueCount} ${dueCount === 1 ? 'Aufgabe' : 'Aufgaben'} fällig`

  return (
    <div className={s.hero}>
      <div className={s.heroMain}>
        <svg width={84} height={84} viewBox="0 0 84 84" className={s.ringsvg}>
          <circle cx={42} cy={42} r={r} fill="none" strokeWidth={6} style={{ stroke: 'var(--border)' }} />
          <circle
            cx={42} cy={42} r={r} fill="none"
            stroke={color} strokeWidth={6}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 42 42)"
            style={{ transition: 'stroke-dasharray 0.5s var(--ease-out)' }}
          />
          <text x={42} y={45} textAnchor="middle" fill={color} fontSize={19} fontWeight={800} style={{ fontFamily: 'var(--font-num)' }}>
            {score}
          </text>
          <text x={42} y={57} textAnchor="middle" fill="var(--text-faint)" fontSize={8} fontWeight={700} style={{ fontFamily: 'var(--font)', letterSpacing: '0.08em' }}>
            PROZENT
          </text>
        </svg>
        <div className={s.heroText}>
          <span className={s.heroLabel} style={{ color }}>{label}</span>
          <span className={s.heroSub}>{sub}</span>
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

// ─── Task Row ─────────────────────────────────────────────
const FREQ_OPTIONS = ['daily', 'biweekly', 'weekly', 'monthly', 'custom']

function TaskRow({ task, editing, dimmed, onToggleEdit, onDone, onReset, onUpdate, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const { color, overdue } = taskSegments(task)
  const since = taskDueLabel(task)

  return (
    <div className={[s.taskRow, dimmed ? s.taskRowDimmed : ''].join(' ')}>
      {/* Always-visible view — click toggles drawer */}
      <div
        className={[s.taskView, editing ? s.taskViewEditing : ''].join(' ')}
        onClick={onToggleEdit}
      >
        <div className={s.taskTop}>
          {editing ? (
            <input
              className={s.taskNameInput}
              value={task.text}
              onChange={e => onUpdate({ text: e.target.value })}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className={s.taskText}>
              {task.text}
              {task.lowEnergy && <span className={s.lowBadge}><BatteryLowIcon /></span>}
            </span>
          )}
          <span className={s.taskDue} style={{ color: overdue ? 'var(--rose)' : color }}>
            {since}
          </span>
          <span className={[s.editHintIcon, editing ? s.editHintIconOn : ''].join(' ')}>
            <PencilIcon />
          </span>
          {!dimmed && (
            <button className={s.doneBtn} onClick={e => { e.stopPropagation(); onDone() }} title="Erledigt">
              <CheckIcon />
            </button>
          )}
        </div>
        <SegmentBar task={task} />
      </div>

      {/* Expandable edit drawer */}
      <div className={[s.taskEditDrawer, editing ? s.taskEditDrawerOpen : ''].join(' ')}>
        <div className={s.taskEditInner} style={editing ? { padding: '10px 6px 10px' } : {}}>
          <div className={s.editDivider} />
          <span className={s.fieldLabel}>Wie oft?</span>
          <div className={s.freqChips}>
            {FREQ_OPTIONS.map(f => (
              <button
                key={f}
                className={[s.freqChip, task.freq === f ? s.freqChipOn : ''].join(' ')}
                onClick={() => onUpdate({ freq: f })}
              >
                {FREQ_LABELS[f]}
              </button>
            ))}
          </div>
          {task.freq === 'custom' && (
            <div className={s.customDaysRow}>
              <span className={s.fieldLabel}>Alle</span>
              <input
                type="number"
                className={s.customDaysInput}
                value={task.customDays ?? ''}
                min={1}
                onChange={e => onUpdate({ customDays: e.target.value === '' ? null : Number(e.target.value) })}
                onClick={e => e.stopPropagation()}
              />
              <span className={s.fieldLabel}>Tage</span>
            </div>
          )}
          <div className={s.customDaysRow}>
            <span className={s.fieldLabel}>Dauer</span>
            <input
              type="number"
              className={s.customDaysInput}
              value={task.duration ?? ''}
              min={1}
              onChange={e => onUpdate({ duration: e.target.value === '' ? null : Number(e.target.value) })}
              onClick={e => e.stopPropagation()}
            />
            <span className={s.fieldLabel}>min</span>
          </div>
          <span className={s.fieldLabel}>Aufwand</span>
          <div className={s.effortRow}>
            <button
              className={[s.effortBtn, !task.lowEnergy ? s.effortBtnOn : ''].join(' ')}
              onClick={() => onUpdate({ lowEnergy: false })}
            >
              <BoltIcon /> Normal
            </button>
            <button
              className={[s.effortBtn, task.lowEnergy ? s.effortBtnOn : ''].join(' ')}
              onClick={() => onUpdate({ lowEnergy: true })}
            >
              <BatteryLowIcon /> Low Energy
            </button>
          </div>
          <div className={s.editFoot}>
            <button className={s.linkBtn} onClick={onReset}><ResetIcon /> Zurücksetzen</button>
            <button
              className={[s.linkBtn, s.linkBtnDanger].join(' ')}
              style={confirmDel ? { color: 'var(--rose)' } : undefined}
              onClick={() => {
                if (confirmDel) { onDelete(); return }
                setConfirmDel(true)
                setTimeout(() => setConfirmDel(false), 2500)
              }}
            >
              <XIcon /> {confirmDel ? 'Wirklich?' : 'Löschen'}
            </button>
            <span style={{ flex: 1 }} />
            <button className={s.doneEditBtn} onClick={onToggleEdit}>Fertig</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Raum Karte ───────────────────────────────────────────
const PRIO_LABELS = { 1: 'P1', 2: 'P2', 3: 'P3' }

function RaumKarte({ room, energie, open, editing, onToggle, onToggleEdit, onTaskDone, onTaskReset, onUpdateTask, onAddTask, onDeleteTask, onUpdateRoom, onDeleteRoom }) {
  const [newTaskText, setNewTaskText] = useState('')
  const [editTaskId, setEditTaskId]   = useState(null)
  const [confirmRoomDel, setConfirmRoomDel] = useState(false)
  const status = roomStatus(room)
  const sm     = STATUS_META[status]

  const handleAddTask = () => {
    const text = newTaskText.trim()
    if (!text) return
    onAddTask({
      id: crypto.randomUUID(), text,
      duration: 15, freq: 'weekly', customDays: null,
      lowEnergy: false, lastDone: null, subItems: [],
    })
    setNewTaskText('')
  }

  const toggleTaskEdit = (taskId) => {
    setEditTaskId(prev => prev === taskId ? null : taskId)
  }

  const dueInRoom = room.tasks.filter(t => taskSegments(t).overdue).length

  return (
    <div className={[s.roomCard, open ? s.roomCardOpen : ''].join(' ')}>
      <div className={s.roomHeader} onClick={onToggle}>
        <span className={s.roomIcon}><Glyph name={room.icon} size={19} /></span>
        {editing ? (
          <input
            className={s.roomNameInput}
            value={room.name}
            onChange={e => onUpdateRoom({ name: e.target.value })}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={s.roomName}>{room.name}</span>
        )}
        {!open && !editing && dueInRoom > 0 && (
          <span className={s.roomDueDot} title={`${dueInRoom} fällig`} />
        )}
        <span className={s.statusBadge} style={{ color: sm.color, background: `color-mix(in srgb, ${sm.color} 14%, transparent)` }}>{sm.label}</span>
        <button
          className={[s.editBtn, editing ? s.editBtnOn : ''].join(' ')}
          onClick={e => { e.stopPropagation(); onToggleEdit() }}
          title={editing ? 'Fertig' : 'Bearbeiten'}
        >
          {editing ? <CheckIcon /> : <PencilIcon />}
        </button>
        <span className={s.chevron}><ChevronIcon open={open} /></span>
      </div>

      {editing && (
        <div className={s.roomSettingsPanel}>
          <div className={s.setRow}>
            <span className={s.setLabel}>Icon</span>
            <GlyphPicker
              glyphs={ROOM_GLYPHS}
              value={room.icon}
              onChange={name => onUpdateRoom({ icon: name })}
            />
          </div>
          <div className={s.setRow}>
            <span className={s.setLabel}>Priorität</span>
            <div className={s.prioBtnGroup}>
              {[1, 2, 3].map(p => (
                <button
                  key={p}
                  className={[s.prioBtn, (room.priority ?? 3) === p ? s.prioBtnActive : ''].join(' ')}
                  onClick={() => onUpdateRoom({ priority: p })}
                >
                  {PRIO_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <button
            className={s.deleteRoomBtn}
            onClick={() => {
              if (confirmRoomDel) { onDeleteRoom(); return }
              setConfirmRoomDel(true)
              setTimeout(() => setConfirmRoomDel(false), 2500)
            }}
          >
            {confirmRoomDel ? 'Wirklich löschen? Alle Tasks gehen mit.' : 'Raum löschen'}
          </button>
        </div>
      )}

      {open && (
        <div className={[s.roomBody, editing ? s.roomBodyAfterSettings : ''].join(' ')}>
          {room.tasks.length === 0 && !editing && (
            <div className={s.emptyRoom}>Keine Tasks — Stift zum Hinzufügen</div>
          )}

          {room.tasks.map(task => {
            const dimmed = energie === 'low' && !task.lowEnergy
            return (
              <TaskRow
                key={task.id}
                task={task}
                editing={editTaskId === task.id}
                dimmed={dimmed}
                onToggleEdit={() => toggleTaskEdit(task.id)}
                onDone={() => onTaskDone(task.id)}
                onReset={() => onTaskReset(task.id)}
                onUpdate={patch => onUpdateTask(task.id, patch)}
                onDelete={() => { onDeleteTask(task.id); if (editTaskId === task.id) setEditTaskId(null) }}
              />
            )
          })}

          {!editing && energie === 'low' && (() => {
            const hidden = room.tasks.filter(t => !t.lowEnergy).length
            return hidden > 0 ? (
              <div className={s.hiddenHint}>
                {hidden} {hidden === 1 ? 'Task' : 'Tasks'} ausgeblendet — Normal für alle
              </div>
            ) : null
          })()}

          {editing && (
            <div className={s.addTaskRow}>
              <input
                className={s.addTaskInput}
                placeholder="Neue Aufgabe…"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              />
              <button className={s.addTaskBtn} onClick={handleAddTask}>+</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── TabHaushalt ──────────────────────────────────────────
export default function TabHaushalt({ onBack }) {
  const { toolColors } = useAppStore()
  const [config,    setConfig]    = useState(() => loadHaushalt())
  const [energie,   setEnergie]   = useState(() => lv(SK.haushaltEnergie, 'normal'))
  const [openRooms, setOpenRooms] = useState({})
  const [editRooms, setEditRooms] = useState({})

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

  const toggleEdit = (id) => {
    const isCurrentlyOpen = editRooms[id]
    setEditRooms(p => ({ ...p, [id]: !p[id] }))
    // open room when entering edit mode so tasks + add row are visible
    if (!isCurrentlyOpen) setOpenRooms(p => ({ ...p, [id]: true }))
  }

  const handleAddRoom = () => {
    const room = { id: crypto.randomUUID(), name: 'Neuer Raum', icon: 'home', tasks: [], priority: 3 }
    updateConfig(prev => addRoom(prev, room))
    setOpenRooms(p => ({ ...p, [room.id]: true }))
    setEditRooms(p => ({ ...p, [room.id]: true }))
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
        <div className={s.urgentBlock}>
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
        </div>
      )}

      <div className={s.roomsBlock}>
        <div className={s.sectionLabel}>Räume</div>
        <div className={s.rooms}>
          {config.rooms.map(room => (
            <RaumKarte
              key={room.id}
              room={room}
              energie={energie}
              open={!!openRooms[room.id]}
              editing={!!editRooms[room.id]}
              onToggle={() => toggleRoom(room.id)}
              onToggleEdit={() => toggleEdit(room.id)}
              onTaskDone={taskId => updateConfig(prev => markTaskDone(prev, taskId))}
              onTaskReset={taskId => updateConfig(prev => resetTaskDone(prev, taskId))}
              onUpdateTask={(taskId, patch) => updateConfig(prev => updateTask(prev, room.id, taskId, patch))}
              onAddTask={task => updateConfig(prev => addTask(prev, room.id, task))}
              onDeleteTask={taskId => updateConfig(prev => deleteTask(prev, room.id, taskId))}
              onUpdateRoom={patch => updateConfig(prev => updateRoom(prev, room.id, patch))}
              onDeleteRoom={() => {
                updateConfig(prev => deleteRoom(prev, room.id))
                setOpenRooms(p => { const n = { ...p }; delete n[room.id]; return n })
                setEditRooms(p => { const n = { ...p }; delete n[room.id]; return n })
              }}
            />
          ))}

          <button className={s.addRoomBtn} onClick={handleAddRoom}>
            + Raum hinzufügen
          </button>
        </div>
      </div>

      <button
        className={s.setupLink}
        onClick={() => updateConfig({ ...config, briefingDone: false })}
      >
        Setup neu starten
      </button>
    </div>
  )
}
