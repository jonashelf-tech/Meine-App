import { useState } from 'react'
import { DEFAULT_ROOMS } from './haushaltData'
import s from './HaushaltBriefing.module.css'

const TOTAL_STEPS = 4

// ─── Step 1: Willkommen ───────────────────────────────────
function StepWillkommen() {
  return (
    <div className={s.stepContent}>
      <div className={s.welcomeIcon}>🏠</div>
      <h2 className={s.stepTitle}>Willkommen im Haushalt-Tool</h2>
      <p className={s.stepText}>
        Hier siehst du auf einen Blick, was in deiner Wohnung ansteht — ohne Druck.
        Jede Aufgabe hat einen Balken, der zeigt wie lange sie schon offen ist.
      </p>

      <div className={s.exampleCard}>
        <div className={s.exampleRow}>
          <span className={s.exampleLabel}>WC reinigen</span>
          <span className={s.exampleDue} style={{ color: 'var(--rose)' }}>überfällig</span>
        </div>
        <div className={s.exampleBar}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={s.exampleSeg} style={{ background: 'var(--rose)' }} />
          ))}
        </div>
        <div className={s.exampleRow} style={{ marginTop: 10 }}>
          <span className={s.exampleLabel}>Müll rausbringen <span className={s.lowBadge}>🪫</span></span>
          <span className={s.exampleDue} style={{ color: 'var(--emerald)' }}>in 2 Tagen</span>
        </div>
        <div className={s.exampleBar}>
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className={s.exampleSeg}
              style={{ background: i < 1 ? 'var(--emerald)' : 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </div>
      </div>

      <p className={s.stepHint}>
        🪫 <strong>Low-Energy-Modus</strong> — zeigt nur die leichteren Tasks wenn du wenig Kraft hast. Den Rest kannst du ausblenden, ohne ihn zu vergessen.
      </p>
    </div>
  )
}

// ─── Step 2: Räume einrichten ─────────────────────────────
function StepRaeume({ draftRooms, setDraftRooms }) {
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')

  const removeRoom = (id) => setDraftRooms(prev => prev.filter(r => r.id !== id))

  const addRoom = () => {
    const name = newName.trim()
    if (!name) return
    setDraftRooms(prev => [...prev, {
      id:    crypto.randomUUID(),
      name,
      icon:  newIcon.trim() || '🏠',
      tasks: [],
    }])
    setNewName('')
    setNewIcon('')
  }

  return (
    <div className={s.stepContent}>
      <h2 className={s.stepTitle}>Welche Räume hast du?</h2>
      <p className={s.stepText}>Entferne Räume die du nicht brauchst oder füge eigene hinzu.</p>

      <div className={s.roomList}>
        {draftRooms.map(room => (
          <div key={room.id} className={s.roomChip}>
            <span className={s.roomChipIcon}>{room.icon}</span>
            <span className={s.roomChipName}>{room.name}</span>
            <span className={s.roomChipCount}>{room.tasks.length} Tasks</span>
            <button className={s.removeBtn} onClick={() => removeRoom(room.id)}>✕</button>
          </div>
        ))}
      </div>

      <div className={s.addRoomRow}>
        <input
          className={s.addInput}
          placeholder="Raum-Name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addRoom()}
        />
        <input
          className={s.addIconInput}
          placeholder="🏠"
          value={newIcon}
          onChange={e => setNewIcon(e.target.value)}
          maxLength={2}
        />
        <button className={s.addBtn} onClick={addRoom}>+</button>
      </div>
    </div>
  )
}

// ─── Step 3: Was ist erledigt? ────────────────────────────
function StepErledigt({ draftRooms, checkedIds, setCheckedIds }) {
  const toggle = (id) => setCheckedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const allTasks = draftRooms.flatMap(r => r.tasks.map(t => ({ ...t, roomName: r.name, roomIcon: r.icon })))

  return (
    <div className={s.stepContent}>
      <h2 className={s.stepTitle}>Was hast du gerade erledigt?</h2>
      <p className={s.stepText}>
        Hak ab was du kürzlich gemacht hast. Der Rest startet als offen — so siehst du sofort was als erstes dran ist.
      </p>

      {draftRooms.map(room => (
        <div key={room.id} className={s.checkGroup}>
          <div className={s.checkGroupHeader}>
            <span>{room.icon}</span>
            <span>{room.name}</span>
          </div>
          {room.tasks.map(task => (
            <label key={task.id} className={s.checkRow}>
              <div className={[s.checkbox, checkedIds.has(task.id) ? s.checkboxChecked : ''].join(' ')}>
                {checkedIds.has(task.id) && (
                  <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className={s.checkLabel}>{task.text}</span>
              <span className={s.checkFreq}>{task.duration} min</span>
              <input
                type="checkbox"
                className={s.hiddenCheck}
                checked={checkedIds.has(task.id)}
                onChange={() => toggle(task.id)}
              />
            </label>
          ))}
          {room.tasks.length === 0 && (
            <div className={s.emptyRoom}>Keine Tasks — im Tool hinzufügen</div>
          )}
        </div>
      ))}

      {allTasks.length === 0 && (
        <div className={s.emptyState}>Keine Tasks vorhanden</div>
      )}
    </div>
  )
}

// ─── Step 4: Verteilung ───────────────────────────────────
function StepVerteilung({ distribution, setDistribution }) {
  return (
    <div className={s.stepContent}>
      <h2 className={s.stepTitle}>Wie planst du Putzen?</h2>
      <p className={s.stepText}>
        Das beeinflusst wie Tasks priorisiert und angezeigt werden.
      </p>

      <div className={s.distOptions}>
        <button
          className={[s.distBtn, distribution === 'spread' ? s.distBtnActive : ''].join(' ')}
          onClick={() => setDistribution('spread')}
        >
          <span className={s.distIcon}>🗓</span>
          <span className={s.distLabel}>Verteilt über die Woche</span>
          <span className={s.distSub}>Tasks kommen nach Fälligkeit, wann immer sie dran sind</span>
        </button>

        <button
          className={[s.distBtn, distribution === 'block' ? s.distBtnActive : ''].join(' ')}
          onClick={() => setDistribution('block')}
        >
          <span className={s.distIcon}>🧹</span>
          <span className={s.distLabel}>Großputztag</span>
          <span className={s.distSub}>Alles sammelt sich für einen fixen Putztag pro Woche</span>
        </button>
      </div>
    </div>
  )
}

// ─── HaushaltBriefing ─────────────────────────────────────
export default function HaushaltBriefing({ config, onComplete }) {
  const [step,         setStep]         = useState(1)
  const [draftRooms,   setDraftRooms]   = useState(config.rooms)
  const [checkedIds,   setCheckedIds]   = useState(new Set())
  const [distribution, setDistribution] = useState('spread')

  const canNext = step < TOTAL_STEPS
  const canBack = step > 1

  const handleNext = () => { if (canNext) setStep(s => s + 1) }
  const handleBack = () => { if (canBack) setStep(s => s - 1) }

  const handleFinish = () => {
    const today = new Date().toISOString().slice(0, 10)
    const finalRooms = draftRooms.map(r => ({
      ...r,
      tasks: r.tasks.map(t => ({
        ...t,
        lastDone: checkedIds.has(t.id) ? today : null,
      })),
    }))
    onComplete({
      ...config,
      rooms:        finalRooms,
      briefingDone: true,
      distribution,
    })
  }

  return (
    <div className={s.overlay}>
      <div className={s.card}>

        {/* Progress */}
        <div className={s.progress}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={[s.dot, i + 1 <= step ? s.dotActive : ''].join(' ')}
            />
          ))}
        </div>

        {/* Step content */}
        <div className={s.body}>
          {step === 1 && <StepWillkommen />}
          {step === 2 && <StepRaeume draftRooms={draftRooms} setDraftRooms={setDraftRooms} />}
          {step === 3 && <StepErledigt draftRooms={draftRooms} checkedIds={checkedIds} setCheckedIds={setCheckedIds} />}
          {step === 4 && <StepVerteilung distribution={distribution} setDistribution={setDistribution} />}
        </div>

        {/* Navigation */}
        <div className={s.nav}>
          {canBack
            ? <button className={s.backBtn} onClick={handleBack}>← Zurück</button>
            : <span />
          }
          {canNext
            ? <button className={s.nextBtn} onClick={handleNext}>Weiter →</button>
            : <button className={s.finishBtn} onClick={handleFinish}>Loslegen ✓</button>
          }
        </div>

      </div>
    </div>
  )
}
