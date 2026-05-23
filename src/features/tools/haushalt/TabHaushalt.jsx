import { useState, useCallback, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { createBlock } from '../../todos/Block'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import TodoChip from '../../../components/TodoChip/TodoChip'
import {
  loadHaushalt, saveHaushalt, buildSmartQueue, markTaskDone,
  calcZustand, roomStatus,
  addRoom, updateRoom, deleteRoom,
  addTask, updateTask, deleteTask, resetToDefaults,
  ENERGIE_META, ZUSTAND_META, FREQ_LABELS,
} from './haushaltData'
import s from './TabHaushalt.module.css'

// ─── SVG Icon ────────────────────────────────────────────
const HausIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

// ─── Zeit-Budget-Optionen ─────────────────────────────────
const ZEIT_OPTIONS = [
  { label: '5 min',  mins: 5  },
  { label: '15 min', mins: 15 },
  { label: '30 min', mins: 30 },
  { label: '1h+',    mins: 90 },
]

// ─── Status badge colors ──────────────────────────────────
const STATUS_META = {
  now:  { label: 'jetzt dran', color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  soon: { label: 'bald dran',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  ok:   { label: 'ok',         color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
}

const FREQ_OPTIONS  = ['daily', 'biweekly', 'weekly', 'monthly', 'custom']
const MODE_OPTIONS  = ['survival', 'maintain', 'boost']
const MODE_LABELS   = { survival: 'Survival', maintain: 'Maintain', boost: 'Boost' }

// ─── Chip color ───────────────────────────────────────────
function chipColor(zustand, energie) {
  if (zustand === 'chaos')   return '#fb7185'
  if (zustand === 'knapp')   return '#f59e0b'
  return energie === 'viel' ? '#10B981' : '#8B5CF6'
}

// ─── Build chips from queue ───────────────────────────────
function queueToChips(queue, zustand, energie) {
  const color = chipColor(zustand, energie)
  return queue.map(({ task, room }) =>
    createBlock({
      text:     task.text,
      color,
      priority: 3,
      duration: task.duration,
      category: room.name,
      subItems: (task.subItems ?? []).map(si => ({ ...si })),
    })
  )
}

// ═══════════════════════════════════════════════════════════
// RäumeView
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

  const handleAddTask = (roomId) => {
    const text = (newTaskText[roomId] ?? '').trim()
    if (!text) return
    const task = {
      id: crypto.randomUUID(), text,
      duration: 15, freq: 'weekly', customDays: null,
      minMode: 'maintain', lastDone: null, subItems: [],
    }
    updateConfig(addTask(config, roomId, task))
    setNewTaskText(p => ({ ...p, [roomId]: '' }))
  }

  const handleAddRoom = () => {
    const name = newRoomName.trim()
    if (!name) return
    const room = { id: crypto.randomUUID(), name, icon: newRoomIcon || '🏠', tasks: [] }
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
            <div className={s.roomHeader} onClick={() => toggleRoom(room.id)}>
              <span className={s.roomIcon}>{room.icon}</span>

              {isEditing ? (
                <input
                  className={s.roomNameInput}
                  value={room.name}
                  onChange={e => updateConfig(updateRoom(config, room.id, { name: e.target.value }))}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className={s.roomName}>{room.name}</span>
              )}

              <span className={s.statusBadge} style={{ color: sm.color, background: sm.bg }}>
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

            {isOpen && (
              <div className={s.roomBody}>
                {room.tasks.map(task => (
                  <div key={task.id} className={s.taskRow}>
                    <div className={s.taskInfo}>
                      <span className={s.taskText}>{task.text}</span>
                      <span className={s.taskMeta}>
                        {FREQ_LABELS[task.freq] ?? task.freq}
                        {' · '}{task.duration}min
                        {' · '}{MODE_LABELS[task.minMode] ?? task.minMode}
                      </span>
                    </div>
                    {isEditing && (
                      <div className={s.taskEditRow}>
                        <select
                          className={s.taskSelect}
                          value={task.freq}
                          onChange={e => updateConfig(updateTask(config, room.id, task.id, { freq: e.target.value }))}
                        >
                          {FREQ_OPTIONS.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                        </select>
                        <select
                          className={s.taskSelect}
                          value={task.minMode}
                          onChange={e => updateConfig(updateTask(config, room.id, task.id, { minMode: e.target.value }))}
                        >
                          {MODE_OPTIONS.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
                        </select>
                        <button
                          className={s.deleteTaskBtn}
                          onClick={() => updateConfig(deleteTask(config, room.id, task.id))}
                        >✕</button>
                      </div>
                    )}
                  </div>
                ))}

                {isEditing && (
                  <div className={s.addTaskRow}>
                    <input
                      className={s.addTaskInput}
                      placeholder="Neue Aufgabe…"
                      value={newTaskText[room.id] ?? ''}
                      onChange={e => setNewTaskText(p => ({ ...p, [room.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAddTask(room.id)}
                    />
                    <button className={s.addTaskBtn} onClick={() => handleAddTask(room.id)}>+</button>
                  </div>
                )}

                {isEditing && (
                  <button
                    className={s.deleteRoomBtn}
                    onClick={() => updateConfig(deleteRoom(config, room.id))}
                  >
                    Raum löschen
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

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
          <button className={s.addRoomConfirmBtn} onClick={handleAddRoom}>Hinzufügen</button>
          <button className={s.cancelBtn} onClick={() => setShowAddRoom(false)}>Abbrechen</button>
        </div>
      ) : (
        <button className={s.addRoomBtn} onClick={() => setShowAddRoom(true)}>
          + Raum hinzufügen
        </button>
      )}

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
// TabHaushalt
// ═══════════════════════════════════════════════════════════
export default function TabHaushalt({ onBack }) {
  const { setTodos } = useAppStore()

  const [config,      setConfig]      = useState(() => loadHaushalt())
  const [view,        setView]        = useState('queue')
  const [energie,     setEnergie]     = useState(() => loadHaushalt().energie ?? 'normal')
  const [zeitBudget,  setZeitBudget]  = useState(30)
  const [queueMeta,   setQueueMeta]   = useState(() => {
    const cfg = loadHaushalt()
    return buildSmartQueue(cfg, cfg.energie ?? 'normal', 30)
  })
  const [chipTodos,   setChipTodos]   = useState(() => {
    const cfg = loadHaushalt()
    const en  = cfg.energie ?? 'normal'
    const q   = buildSmartQueue(cfg, en, 30)
    return queueToChips(q, calcZustand(cfg.rooms), en)
  })
  const [transferred, setTransferred] = useState(false)

  // Auto-detected Zustand — derived from current config
  const zustand = useMemo(() => calcZustand(config.rooms), [config.rooms])
  const zm      = ZUSTAND_META[zustand]

  const updateConfig = useCallback((next) => {
    setConfig(next)
    saveHaushalt(next)
  }, [])

  const regenQueue = useCallback((cfg, en, zeit) => {
    const q  = buildSmartQueue(cfg, en, zeit)
    const zs = calcZustand(cfg.rooms)
    setQueueMeta(q)
    setChipTodos(queueToChips(q, zs, en))
    setTransferred(false)
  }, [])

  const handleEnergieChange = useCallback((en) => {
    setEnergie(en)
    const next = { ...config, energie: en }
    updateConfig(next)
    regenQueue(next, en, zeitBudget)
  }, [config, zeitBudget, updateConfig, regenQueue])

  const handleZeitChange = useCallback((mins) => {
    setZeitBudget(mins)
    regenQueue(config, energie, mins)
  }, [config, energie, regenQueue])

  // Regen queue after config changes (e.g. task marked done)
  const handleConfigUpdate = useCallback((next) => {
    updateConfig(next)
    regenQueue(next, energie, zeitBudget)
  }, [energie, zeitBudget, updateConfig, regenQueue])

  const handleChipToggle = useCallback((id) => {
    const chipIdx = chipTodos.findIndex(c => c.id === id)
    setChipTodos(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
    if (chipIdx >= 0 && queueMeta[chipIdx]) {
      handleConfigUpdate(markTaskDone(config, queueMeta[chipIdx].task.id))
    }
  }, [chipTodos, queueMeta, config, handleConfigUpdate])

  const handleChipRemove = useCallback((id) => {
    const idx = chipTodos.findIndex(c => c.id === id)
    setChipTodos(prev => prev.filter(c => c.id !== id))
    setQueueMeta(prev => prev.filter((_, i) => i !== idx))
  }, [chipTodos])

  const handleTransfer = useCallback(() => {
    if (transferred) return
    const toAdd = chipTodos.filter(c => !c.done)
    if (toAdd.length > 0) setTodos(prev => [...prev, ...toAdd])
    setTransferred(true)
    setChipTodos(prev => prev.map(c => ({ ...c, done: true })))
  }, [chipTodos, transferred, setTodos])

  return (
    <div className={s.page}>
      <ToolHeader onBack={onBack} icon={<HausIcon />} eyebrow="Tool" title="Haushalt" />

      {/* View tab strip */}
      <div className={s.tabStrip}>
        <button
          className={[s.tabBtn, view === 'queue' ? s.tabBtnActive : ''].join(' ')}
          onClick={() => setView('queue')}
        >Queue</button>
        <button
          className={[s.tabBtn, view === 'rooms' ? s.tabBtnActive : ''].join(' ')}
          onClick={() => setView('rooms')}
        >Räume</button>
      </div>

      {/* ── Queue View ── */}
      {view === 'queue' && (
        <div className={s.queueView}>

          {/* Zustand-Banner (auto-detected) */}
          <div className={s.zustandBanner} style={{ background: zm.bg, borderColor: zm.color + '33' }}>
            <div className={s.zustandDot} style={{ background: zm.color }} />
            <div className={s.zustandText}>
              <span className={s.zustandLabel} style={{ color: zm.color }}>{zm.label}</span>
              <span className={s.zustandSub}>{zm.sub}</span>
            </div>
          </div>

          {/* Energie-Selector — nur bei Ordnung sichtbar */}
          {zustand === 'ordnung' && (
            <div className={s.energieSection}>
              <span className={s.energieLabel}>Energie heute…</span>
              <div className={s.energieStrip}>
                {Object.entries(ENERGIE_META).map(([key, meta]) => (
                  <button
                    key={key}
                    className={[s.energieBtn, energie === key ? s.energieBtnActive : ''].join(' ')}
                    style={{ '--e-color': meta.color }}
                    onClick={() => handleEnergieChange(key)}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                <span className={s.emptyEmoji}>{zustand === 'ordnung' ? '✨' : '🔍'}</span>
                <span className={s.emptyText}>
                  {zustand === 'ordnung'
                    ? 'Alles erledigt!'
                    : 'Keine Tasks im Zeitrahmen — mehr Zeit wählen'}
                </span>
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
