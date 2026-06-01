import { useState, useCallback } from 'react'
import { sv, lv, SK } from '../../../storage'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import HaushaltBriefing from './HaushaltBriefing'
import {
  loadHaushalt, saveHaushalt,
  taskSegments, calcRingScore, roomStatus, STATUS_META, FREQ_LABELS,
  markTaskDone, resetTaskDone,
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

// ─── Ring Score SVG ───────────────────────────────────────
function RingScore({ score }) {
  const r     = 28
  const circ  = 2 * Math.PI * r
  const dash  = (Math.min(score, 100) / 100) * circ
  const color = score >= 70 ? 'var(--emerald)' : score >= 40 ? '#f59e0b' : 'var(--rose)'
  const label = score >= 70 ? 'Wohnung im Griff' : score >= 40 ? 'Einiges liegt noch' : 'Chaos-Modus'

  return (
    <div className={s.scoreRow}>
      <svg width={70} height={70} viewBox="0 0 70 70" className={s.ringsvg}>
        <circle cx={35} cy={35} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
        <circle
          cx={35} cy={35} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 35 35)"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
        <text x={35} y={40} textAnchor="middle" fill={color} fontSize={13} fontWeight={800} fontFamily="Geist, system-ui, sans-serif">
          {score}%
        </text>
      </svg>
      <div className={s.scoreText}>
        <span className={s.scoreLabel} style={{ color }}>{label}</span>
        <span className={s.scoreSub}>
          {score < 100
            ? `${Math.round((1 - score / 100) * 100)}% der Tasks fällig`
            : 'Alles erledigt ✨'}
        </span>
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
            boxShadow: overdue && i < filled ? `0 0 3px ${color}` : undefined,
          }}
        />
      ))}
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────
const FREQ_OPTIONS = ['daily', 'biweekly', 'weekly', 'monthly', 'custom']

function TaskRow({ task, editing, dimmed, onToggleEdit, onDone, onReset, onUpdate, onDelete }) {
  const { color, overdue } = taskSegments(task)
  const since = (() => {
    if (!task.lastDone) return 'noch nie erledigt'
    const days = Math.floor((Date.now() - new Date(task.lastDone + 'T00:00:00').getTime()) / 86_400_000)
    if (days === 0) return 'heute erledigt'
    if (days === 1) return 'gestern erledigt'
    const freq = task.freq === 'custom' ? (task.customDays ?? 7) : { daily: 1, biweekly: 3, weekly: 7, monthly: 30 }[task.freq] ?? 7
    const left = freq - days
    if (left <= 0) return `${Math.abs(left)} ${Math.abs(left) === 1 ? 'Tag' : 'Tage'} überfällig`
    if (left === 1) return 'morgen fällig'
    return `in ${left} Tagen`
  })()

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
                value={task.customDays ?? 7}
                min={1}
                onChange={e => onUpdate({ customDays: Number(e.target.value) })}
                onClick={e => e.stopPropagation()}
              />
              <span className={s.fieldLabel}>Tage</span>
            </div>
          )}
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
            <button className={s.linkBtn} onClick={onReset}>↺ Zurücksetzen</button>
            <button className={[s.linkBtn, s.linkBtnDanger].join(' ')} onClick={onDelete}>✕ Löschen</button>
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

  return (
    <div className={s.roomCard}>
      <div className={s.roomHeader} onClick={onToggle}>
        <span className={s.roomIcon}><Glyph name={room.icon} size={20} /></span>
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
        <span className={s.statusBadge} style={{ color: sm.color }}>{sm.label}</span>
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
          <button className={s.deleteRoomBtn} onClick={onDeleteRoom}>
            Raum löschen
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
  const [config,    setConfig]    = useState(() => loadHaushalt())
  const [energie,   setEnergie]   = useState(() => lv(SK.haushaltEnergie, 'normal'))
  const [openRooms, setOpenRooms] = useState({})
  const [editRooms, setEditRooms] = useState({})
  const [confirmReset, setConfirmReset] = useState(false)

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    localStorage.removeItem(SK.haushalt)
    localStorage.removeItem(SK.haushaltEnergie)
    window.location.reload()
  }

  const updateConfig = useCallback((next) => {
    setConfig(next)
    saveHaushalt(next)
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
    updateConfig(addRoom(config, room))
    setOpenRooms(p => ({ ...p, [room.id]: true }))
    setEditRooms(p => ({ ...p, [room.id]: true }))
  }

  if (!config.briefingDone) {
    return <HaushaltBriefing config={config} onComplete={updateConfig} onBack={onBack} />
  }

  const score = calcRingScore(config.rooms)

  return (
    <div className={s.page}>
      <ToolHeader onBack={onBack} icon={<HausIcon />} eyebrow="Tool" title="Haushalt" />

      <div className={s.energieStrip}>
        <button
          className={[s.energieBtn, energie === 'normal' ? s.energieBtnActive : ''].join(' ')}
          onClick={() => handleEnergieChange('normal')}
        >
          <BoltIcon /> Normal
        </button>
        <button
          className={[s.energieBtn, energie === 'low' ? s.energieBtnActive : ''].join(' ')}
          onClick={() => handleEnergieChange('low')}
        >
          <BatteryLowIcon /> Low Energy
        </button>
      </div>

      <RingScore score={score} />

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
            onTaskDone={taskId => updateConfig(markTaskDone(config, taskId))}
            onTaskReset={taskId => updateConfig(resetTaskDone(config, taskId))}
            onUpdateTask={(taskId, patch) => updateConfig(updateTask(config, room.id, taskId, patch))}
            onAddTask={task => updateConfig(addTask(config, room.id, task))}
            onDeleteTask={taskId => updateConfig(deleteTask(config, room.id, taskId))}
            onUpdateRoom={patch => updateConfig(updateRoom(config, room.id, patch))}
            onDeleteRoom={() => {
              updateConfig(deleteRoom(config, room.id))
              setOpenRooms(p => { const n = { ...p }; delete n[room.id]; return n })
              setEditRooms(p => { const n = { ...p }; delete n[room.id]; return n })
            }}
          />
        ))}

        <button className={s.addRoomBtn} onClick={handleAddRoom}>
          + Raum hinzufügen
        </button>
      </div>

      <button
        className={s.setupLink}
        onClick={() => updateConfig({ ...config, briefingDone: false })}
      >
        Setup neu starten
      </button>

      <button
        className={[s.toolReset, confirmReset ? s.toolResetConfirm : ''].join(' ')}
        onClick={handleReset}
      >
        {confirmReset ? '⚠ Wirklich alle Haushalt-Daten löschen?' : 'Haushalt-Daten löschen'}
      </button>
    </div>
  )
}
