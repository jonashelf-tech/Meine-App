import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { createBlock } from '../../todos/Block'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import TodoChip from '../../../components/TodoChip/TodoChip'
import {
  loadHaushalt, saveHaushalt, buildQueue, markTaskDone,
  roomStatus, addRoom, updateRoom, deleteRoom,
  addTask, updateTask, deleteTask, resetToDefaults,
  MODE_META, FREQ_LABELS, DEFAULT_ROOMS,
} from './haushaltData'
import s from './TabHaushalt.module.css'

// ─── SVG Icon (house) ────────────────────────────────────
const HausIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

// ─── Zeit-Budget-Optionen ────────────────────────────────
const ZEIT_OPTIONS = [
  { label: '5 min',  mins: 5  },
  { label: '15 min', mins: 15 },
  { label: '30 min', mins: 30 },
  { label: '1h+',    mins: 90 },
]

// ─── Status badge colors ─────────────────────────────────
const STATUS_META = {
  now:  { label: 'jetzt dran', color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  soon: { label: 'bald dran',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  ok:   { label: 'ok',         color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
}

// ─── FREQ/MODE options for selects ──────────────────────
const FREQ_OPTIONS = ['daily', 'biweekly', 'weekly', 'monthly', 'custom']
const MODE_OPTIONS = ['survival', 'maintain', 'boost']

// ─── Helper: build chip todos from queue ─────────────────
function queueToChips(queue, modus) {
  return queue.map(({ task, room }) =>
    createBlock({
      text:     task.text,
      color:    MODE_META[modus].color,
      priority: 3,
      duration: task.duration,
      category: room.name,
      subItems: (task.subItems ?? []).map(si => ({ ...si })),
    })
  )
}

// ═══════════════════════════════════════════════════════════
// RäumeView — internal component for the Räume tab
// ═══════════════════════════════════════════════════════════
function RäumeView({ config, updateConfig }) {
  const [openRooms,   setOpenRooms]   = useState({})
  const [editRooms,   setEditRooms]   = useState({})
  const [newTaskText, setNewTaskText] = useState({})
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomIcon, setNewRoomIcon] = useState('🏠')
  const [confirmReset, setConfirmReset] = useState(false)

  const toggleRoom = (id) => setOpenRooms(p => ({ ...p, [id]: !p[id] }))
  const toggleEdit = (id) => setEditRooms(p => ({ ...p, [id]: !p[id] }))

  const handleUpdateRoomName = (roomId, name) => {
    updateConfig(updateRoom(config, roomId, { name }))
  }

  const handleDeleteRoom = (roomId) => {
    updateConfig(deleteRoom(config, roomId))
  }

  const handleAddTask = (roomId) => {
    const text = (newTaskText[roomId] ?? '').trim()
    if (!text) return
    const task = {
      id:         crypto.randomUUID(),
      text,
      duration:   15,
      freq:       'weekly',
      customDays: null,
      minMode:    'maintain',
      lastDone:   null,
      subItems:   [],
    }
    updateConfig(addTask(config, roomId, task))
    setNewTaskText(p => ({ ...p, [roomId]: '' }))
  }

  const handleDeleteTask = (roomId, taskId) => {
    updateConfig(deleteTask(config, roomId, taskId))
  }

  const handleTaskFreq = (roomId, taskId, freq) => {
    updateConfig(updateTask(config, roomId, taskId, { freq }))
  }

  const handleTaskMinMode = (roomId, taskId, minMode) => {
    updateConfig(updateTask(config, roomId, taskId, { minMode }))
  }

  const handleAddRoom = () => {
    const name = newRoomName.trim()
    if (!name) return
    const room = {
      id:    crypto.randomUUID(),
      name,
      icon:  newRoomIcon || '🏠',
      tasks: [],
    }
    updateConfig(addRoom(config, room))
    setNewRoomName('')
    setNewRoomIcon('🏠')
    setShowAddRoom(false)
  }

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    updateConfig(resetToDefaults(config))
    setConfirmReset(false)
  }

  return (
    <div className={s.roomsView}>
      {config.rooms.map(room => {
        const isOpen    = !!openRooms[room.id]
        const isEditing = !!editRooms[room.id]
        const status    = roomStatus(room)
        const sm        = STATUS_META[status]

        return (
          <div key={room.id} className={s.roomCard}>
            {/* Room header */}
            <div className={s.roomHeader} onClick={() => toggleRoom(room.id)}>
              <span className={s.roomIcon}>{room.icon}</span>

              {isEditing ? (
                <input
                  className={s.roomNameInput}
                  value={room.name}
                  onChange={e => handleUpdateRoomName(room.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className={s.roomName}>{room.name}</span>
              )}

              <span
                className={s.statusBadge}
                style={{ color: sm.color, background: sm.bg }}
              >
                {sm.label}
              </span>

              <button
                className={s.editRoomBtn}
                onClick={e => { e.stopPropagation(); toggleEdit(room.id) }}
              >
                {isEditing ? '✓' : '✎'}
              </button>

              <span className={s.roomChevron}>{isOpen ? '▾' : '▸'}</span>
            </div>

            {/* Room body */}
            {isOpen && (
              <div className={s.roomBody}>
                {room.tasks.map(task => (
                  <div key={task.id} className={s.taskRow}>
                    <div className={s.taskInfo}>
                      <span className={s.taskText}>{task.text}</span>
                      <span className={s.taskMeta}>
                        {FREQ_LABELS[task.freq] ?? task.freq}
                        {' · '}
                        {task.duration}min
                        {' · '}
                        {task.minMode}
                      </span>
                    </div>

                    {isEditing && (
                      <div className={s.taskEditRow}>
                        <select
                          className={s.taskSelect}
                          value={task.freq}
                          onChange={e => handleTaskFreq(room.id, task.id, e.target.value)}
                        >
                          {FREQ_OPTIONS.map(f => (
                            <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                          ))}
                        </select>
                        <select
                          className={s.taskSelect}
                          value={task.minMode}
                          onChange={e => handleTaskMinMode(room.id, task.id, e.target.value)}
                        >
                          {MODE_OPTIONS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <button
                          className={s.deleteTaskBtn}
                          onClick={() => handleDeleteTask(room.id, task.id)}
                        >✕</button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add task (edit mode only) */}
                {isEditing && (
                  <div className={s.addTaskRow}>
                    <input
                      className={s.addTaskInput}
                      placeholder="Neue Aufgabe…"
                      value={newTaskText[room.id] ?? ''}
                      onChange={e => setNewTaskText(p => ({ ...p, [room.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAddTask(room.id)}
                    />
                    <button className={s.addTaskBtn} onClick={() => handleAddTask(room.id)}>
                      +
                    </button>
                  </div>
                )}

                {/* Delete room (edit mode only) */}
                {isEditing && (
                  <button
                    className={s.deleteRoomBtn}
                    onClick={() => handleDeleteRoom(room.id)}
                  >
                    Raum löschen
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add room */}
      {showAddRoom ? (
        <div className={s.addRoomForm}>
          <div className={s.addRoomInputRow}>
            <input
              className={s.addRoomInput}
              placeholder="Raum-Name"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
            />
            <input
              className={s.addRoomIconInput}
              placeholder="🏠"
              value={newRoomIcon}
              onChange={e => setNewRoomIcon(e.target.value)}
              maxLength={2}
            />
          </div>
          <button className={s.addRoomConfirmBtn} onClick={handleAddRoom}>
            Hinzufügen
          </button>
          <button className={s.cancelBtn} onClick={() => setShowAddRoom(false)}>
            Abbrechen
          </button>
        </div>
      ) : (
        <button className={s.addRoomBtn} onClick={() => setShowAddRoom(true)}>
          + Raum hinzufügen
        </button>
      )}

      {/* Global reset */}
      <button
        className={[s.resetBtn, confirmReset ? s.resetBtnConfirm : ''].join(' ')}
        onClick={handleReset}
      >
        {confirmReset ? 'Wirklich zurücksetzen?' : 'Auf Standard zurücksetzen'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TabHaushalt — main component
// ═══════════════════════════════════════════════════════════
export default function TabHaushalt({ onBack }) {
  const { setTodos } = useAppStore()

  const [config, setConfig]           = useState(() => loadHaushalt())
  const [view,   setView]             = useState('queue')
  const [modus,  setModus]            = useState(() => {
    const cfg = loadHaushalt()
    return cfg.selectedMode ?? 'maintain'
  })
  const [zeitBudget,  setZeitBudget]  = useState(30)
  const [queueMeta,   setQueueMeta]   = useState(() => {
    const cfg = loadHaushalt()
    return buildQueue(cfg, cfg.selectedMode ?? 'maintain', 30)
  })
  const [chipTodos,   setChipTodos]   = useState(() => {
    const cfg = loadHaushalt()
    const mod = cfg.selectedMode ?? 'maintain'
    return queueToChips(buildQueue(cfg, mod, 30), mod)
  })
  const [transferred, setTransferred] = useState(false)

  // Persists config changes to storage
  const updateConfig = useCallback((next) => {
    setConfig(next)
    saveHaushalt(next)
  }, [])

  // Regenerates queue + chips from current config/mode/zeit
  const regenQueue = useCallback((cfg, mod, zeit) => {
    const q = buildQueue(cfg, mod, zeit)
    setQueueMeta(q)
    setChipTodos(queueToChips(q, mod))
    setTransferred(false)
  }, [])

  const handleModusChange = useCallback((mod) => {
    setModus(mod)
    const nextConfig = { ...config, selectedMode: mod }
    updateConfig(nextConfig)
    regenQueue(nextConfig, mod, zeitBudget)
  }, [config, zeitBudget, updateConfig, regenQueue])

  const handleZeitChange = useCallback((mins) => {
    setZeitBudget(mins)
    regenQueue(config, modus, mins)
  }, [config, modus, regenQueue])

  // Toggle a chip's done state + mark underlying task done in config
  const handleChipToggle = useCallback((id) => {
    const chipIdx = chipTodos.findIndex(c => c.id === id)
    setChipTodos(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
    if (chipIdx >= 0 && queueMeta[chipIdx]) {
      updateConfig(markTaskDone(config, queueMeta[chipIdx].task.id))
    }
  }, [chipTodos, queueMeta, config, updateConfig])

  const handleChipRemove = useCallback((id) => {
    const idx = chipTodos.findIndex(c => c.id === id)
    setChipTodos(prev => prev.filter(c => c.id !== id))
    setQueueMeta(prev => prev.filter((_, i) => i !== idx))
  }, [chipTodos])

  // Transfer all non-done chips to global todo pool
  const handleTransfer = useCallback(() => {
    if (transferred) return
    const toAdd = chipTodos.filter(c => !c.done)
    if (toAdd.length > 0) {
      setTodos(prev => [...prev, ...toAdd])
    }
    setTransferred(true)
    setChipTodos(prev => prev.map(c => ({ ...c, done: true })))
  }, [chipTodos, transferred, setTodos])

  return (
    <div className={s.page}>
      <ToolHeader
        onBack={onBack}
        icon={<HausIcon />}
        eyebrow="Tool"
        title="Haushalt"
      />

      {/* View tab strip */}
      <div className={s.tabStrip}>
        <button
          className={[s.tabBtn, view === 'queue' ? s.tabBtnActive : ''].join(' ')}
          onClick={() => setView('queue')}
        >
          Queue
        </button>
        <button
          className={[s.tabBtn, view === 'rooms' ? s.tabBtnActive : ''].join(' ')}
          onClick={() => setView('rooms')}
        >
          Räume
        </button>
      </div>

      {/* ── Queue View ── */}
      {view === 'queue' && (
        <div className={s.queueView}>

          {/* Mode strip */}
          <div className={s.modeStrip}>
            {Object.entries(MODE_META).map(([key, meta]) => (
              <button
                key={key}
                className={[s.modeBtn, modus === key ? s.modeBtnActive : ''].join(' ')}
                style={{ '--mode-color': meta.color }}
                onClick={() => handleModusChange(key)}
              >
                {meta.label}
              </button>
            ))}
          </div>

          {/* Zeit-Schnellwahl */}
          <div className={s.zeitSection}>
            <span className={s.zeitLabel}>Ich hab gerade…</span>
            <div className={s.zeitBtns}>
              {ZEIT_OPTIONS.map(opt => (
                <button
                  key={opt.mins}
                  className={[s.zeitBtn, zeitBudget === opt.mins ? s.zeitBtnActive : ''].join(' ')}
                  onClick={() => handleZeitChange(opt.mins)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Task chip list */}
          <div className={s.chipList}>
            {chipTodos.length === 0 ? (
              <div className={s.emptyState}>
                <span className={s.emptyEmoji}>✨</span>
                <span className={s.emptyText}>Alles erledigt!</span>
              </div>
            ) : (
              chipTodos.map(todo => (
                <TodoChip
                  key={todo.id}
                  todo={todo}
                  todos={chipTodos}
                  saveTodos={setChipTodos}
                  onToggleDone={() => handleChipToggle(todo.id)}
                  onRemove={() => handleChipRemove(todo.id)}
                  disableExpand={!todo.subItems?.length}
                />
              ))
            )}
          </div>

          {/* Transfer button */}
          {chipTodos.length > 0 && (
            <button
              className={[s.transferBtn, transferred ? s.transferBtnDone : ''].join(' ')}
              onClick={handleTransfer}
              disabled={transferred}
            >
              {transferred ? '✓ Zur Todoliste übertragen' : 'Zur Todoliste übertragen'}
            </button>
          )}
        </div>
      )}

      {/* ── Räume View ── */}
      {view === 'rooms' && (
        <RäumeView config={config} updateConfig={updateConfig} />
      )}
    </div>
  )
}
