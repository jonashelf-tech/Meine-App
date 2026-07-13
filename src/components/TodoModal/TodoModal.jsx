import { useState, useRef } from 'react'
import { useAppStore } from '../../store'
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset'
import { createBlock } from '../../features/todos/Block'
import { createNote, noteTitle, formatNoteTime } from '../../features/notes/Note'
import { parseTodoText } from '../../features/todos/parseTodoText'
import { resolveProject } from '../../features/projekte/projektModel'
import { TOOL_TAB } from '../../features/tools/toolTabs'
import { parseHHMM, minsToHHMM, minutesToSk, NEON } from '../../utils'
import { lv, sv, SK } from '../../storage'
import RepeatPicker from '../RepeatPicker/RepeatPicker'
import Overlay from '../Overlay/Overlay'
import s from './TodoModal.module.css'

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
)

const SubDragIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

const DUR_PRESETS = [
  { label: '5',  value: 5  },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '60', value: 60 },
  { label: '90', value: 90 },
  { label: '2h', value: 120 },
]

function formatSummaryDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  return `${days[date.getDay()]} ${d}.${String(m).padStart(2,'0')}`
}

export default function TodoModal({ onClose, existingTodo = null, prefill = null }) {
  const keyboardOffset = useKeyboardOffset()
  const { setTodos, setDays, setNotes, notes, projects, setProjects, accentColor, setCurrentTab, setNotizenOpenId } = useAppStore()

  const isEdit = existingTodo !== null

  const [text,     setText]     = useState(existingTodo?.text ?? prefill?.text ?? '')
  const [priority, setPriority] = useState(existingTodo?.priority ?? 3)
  const [duration, setDuration] = useState(existingTodo?.duration ?? null)
  // null = Standard: rendert als var(--primary) und wandert live mit der
  // Akzentfarbe mit — deshalb hier bewusst KEIN accentColor-Hex einbrennen.
  const [color,    setColor]    = useState(existingTodo?.color    ?? null)
  const [projectId, setProjectId] = useState(existingTodo?.projectId ?? null)
  const [date,     setDate]     = useState(existingTodo?.date ?? prefill?.date ?? '')
  const [time,     setTime]     = useState(existingTodo?.time ?? prefill?.time ?? '')
  const [repeat,   setRepeat]   = useState(existingTodo?.repeat   ?? null)
  const [subItems, setSubItems] = useState(() =>
    (existingTodo?.subItems ?? []).map(si => ({ ...si }))
  )
  const [subInput,    setSubInput]    = useState('')
  const [subDragOver, setSubDragOver] = useState(null)
  const subItemsWrapRef = useRef(null)
  const subDragRef = useRef({ from: null, over: null })
  const [blinkDate,   setBlinkDate]   = useState(false)
  const [blinkTime,   setBlinkTime]   = useState(false)
  const [projNewMode, setProjNewMode] = useState(false)
  const [projNewInput, setProjNewInput] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(() =>
    isEdit && !!(existingTodo.date || existingTodo.time || existingTodo.projectId)
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Notiz-Modus: nur beim reinen Erfassen (globaler „+"), nicht beim Bearbeiten
  // oder Slot-Anlegen (prefill mit Datum/Uhrzeit). Entwurf bleibt erhalten bis
  // „Speichern" — Schließen ohne Speichern lässt den Text stehen.
  const showModeToggle = !isEdit && !prefill?.date && !prefill?.time
  const [mode, setMode] = useState(() => showModeToggle ? lv(SK.addMode, 'aufgabe') : 'aufgabe')
  const switchMode = (m) => { setMode(m); sv(SK.addMode, m) }
  const [noteText, setNoteText] = useState(() => lv(SK.noteDraft, ''))
  const updateNote = (v) => { setNoteText(v); sv(SK.noteDraft, v) }
  const saveNote = () => {
    const t = noteText.trim()
    if (!t) return
    setNotes(prev => [createNote({ text: t, color: accentColor ?? '#8B5CF6' }), ...prev])
    sv(SK.noteDraft, '')
    onClose()
  }
  // Entwurf bleibt in SK.noteDraft erhalten — Sprung ins Tool verliert nichts.
  const recentNotes = [...notes]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 2)
  const openNotizen = () => { setCurrentTab(TOOL_TAB.notizen); onClose() }
  // Klick auf eine letzte Notiz: Tool öffnen UND diese Notiz direkt aufschlagen.
  const openNote = (id) => { setNotizenOpenId(id); setCurrentTab(TOOL_TAB.notizen); onClose() }

  // Auto-Parser als Toggle (persistiert): an = Live-Erkennung + Übernahme
  // beim Hinzufügen. Manuell gesetzte Felder gewinnen immer. Nur beim
  // Erstellen aktiv — beim Bearbeiten ist der Text schon „sauber".
  const [autoOn, setAutoOn] = useState(() => lv(SK.autoParse, false))
  const toggleAuto = () => setAutoOn(v => { sv(SK.autoParse, !v); return !v })

  const parsed = !isEdit && autoOn && text.trim() ? parseTodoText(text.trim()) : null

  const eff = {
    text:     parsed?.text || text.trim(),
    priority: priority === 3 && parsed && parsed.priority !== 3 ? parsed.priority : priority,
    duration: duration ?? parsed?.duration ?? null,
    date:     date || parsed?.date || '',
    time:     time || parsed?.time || '',
    tag:      parsed?.tag ?? null,
  }

  const autoChips = parsed ? [
    priority === 3 && parsed.priority === 1 && '! Wichtig',
    priority === 3 && parsed.priority === 2 && '· Sollte',
    duration == null && parsed.duration != null && `${parsed.duration} min`,
    !date && parsed.date && formatSummaryDate(parsed.date),
    !time && parsed.time && parsed.time,
    !projectId && parsed.tag && `#${parsed.tag}`,
  ].filter(Boolean) : []

  const addSubItem = () => {
    const txt = subInput.trim(); if (!txt) return
    setSubItems(prev => [...prev, { id: crypto.randomUUID(), text: txt, done: false }])
    setSubInput('')
  }
  const removeSubItem = (id) => setSubItems(prev => prev.filter(si => si.id !== id))

  // Schritte per Ziehen umsortieren — gleiche Mechanik wie TodoChip (Zeitplan/Pool)
  const startSubDrag = (fromIdx, e) => {
    e.stopPropagation(); e.preventDefault()
    subDragRef.current = { from: fromIdx, over: fromIdx }
    const mv = (me) => {
      const y = me.touches ? me.touches[0].clientY : me.clientY
      const wrap = subItemsWrapRef.current; if (!wrap) return
      const rows = wrap.querySelectorAll('[data-sub-row]')
      let closest = subDragRef.current.from, closestDist = Infinity
      rows.forEach((el, idx) => {
        const rc  = el.getBoundingClientRect()
        const mid = rc.top + rc.height / 2
        const dist = Math.abs(y - mid)
        if (dist < closestDist) { closestDist = dist; closest = idx }
      })
      if (closest !== subDragRef.current.over) {
        subDragRef.current.over = closest; setSubDragOver(closest)
      }
    }
    const up = () => {
      const { from, over } = subDragRef.current
      if (from !== null && over !== null && from !== over) {
        const ni = [...subItems]
        const [moved] = ni.splice(from, 1)
        ni.splice(over, 0, moved)
        setSubItems(ni)
      }
      subDragRef.current = { from: null, over: null }; setSubDragOver(null)
      document.removeEventListener('pointermove', mv)
      document.removeEventListener('pointerup', up)
    }
    document.addEventListener('pointermove', mv, { passive: false })
    document.addEventListener('pointerup', up)
  }

  const addProject = () => {
    const name = projNewInput.trim()
    if (!name) return
    const { projects: nextProjects, project } = resolveProject(projects, name)
    if (nextProjects !== projects) setProjects(nextProjects)
    setProjectId(project.id)
    setColor(project.color)
    setProjNewInput('')
    setProjNewMode(false)
  }

  const projekt = projects.find(p => p.id === projectId) ?? null
  const visibleProjects = projects.filter(p => !p.hidden)
  const pickProject = (p) => {
    setProjectId(prev => {
      const next = prev === p.id ? null : p.id
      if (next) setColor(p.color)
      return next
    })
  }

  const handleDurPreset = (val) => setDuration(prev => prev === val ? null : val)
  // Dauer immer > 0: eine negative/ungültige Eingabe (type=number lässt "-60" zu)
  // würde Slot-Überlappung und getDurationKeys kaputtmachen. Leer bleibt null.
  const handleDurFree   = (e)   => { const n = parseInt(e.target.value, 10); setDuration(e.target.value === '' ? null : (n > 0 ? n : 1)) }

  // Ende-Zeit ist reine Ableitung aus time+duration (kein eigener State) —
  // Eintippen schreibt direkt auf duration, damit Dauer-Presets & Ende-Feld
  // immer konsistent bleiben. Endzeit ≤ Start wird ignoriert (kein Downstream-Fix nötig).
  const endTime = time && duration != null ? minsToHHMM(parseHHMM(time) + duration) : ''
  const handleEndTime = (e) => {
    const val = e.target.value
    if (!val || !time) return
    const diff = parseHHMM(val) - parseHHMM(time)
    if (diff > 0) setDuration(diff)
  }

  const triggerBlink = (field) => {
    if (field === 'date') { setBlinkDate(true); setTimeout(() => setBlinkDate(false), 1200) }
    if (field === 'time') { setBlinkTime(true); setTimeout(() => setBlinkTime(false), 1200) }
  }

  const isTermin = !!(eff.date && eff.time)

  const handleSubmit = () => {
    if (!eff.text) return
    if (eff.time && !eff.date) { setDetailsOpen(true); triggerBlink('date'); return }

    let effProjectId = projectId
    let effColor = color
    if (!effProjectId && eff.tag) {
      const { projects: nextProjects, project } = resolveProject(projects, eff.tag)
      if (nextProjects !== projects) setProjects(nextProjects)
      effProjectId = project.id
      effColor = project.color
    }

    if (isEdit) {
      const wasTermin = !!(existingTodo.date && existingTodo.time)
      const nowTermin = isTermin

      const updated = {
        ...existingTodo,
        text:      eff.text,
        priority:  eff.priority,
        color:     effColor,
        duration:  eff.duration || null,
        projectId: effProjectId,
        repeat:    repeat || null,
        subItems,
        date:      eff.date || null,
        time:      eff.time || null,
      }

      setDays(prev => {
        const result = { ...prev }
        Object.keys(result).forEach(dk => {
          const newDay = { ...result[dk] }
          let changed = false
          Object.keys(newDay).forEach(slotK => {
            const slot = newDay[slotK]
            // Slot mit diesem Todo: Farbe/Text/Dauer mitziehen, damit der
            // Indikator (Stripe) überall der Farbwahl folgt (auch Wochenansicht).
            if (slot?.todoId === existingTodo.id &&
                (slot.duration !== updated.duration || slot.color !== updated.color || slot.text !== updated.text)) {
              newDay[slotK] = { ...slot, duration: updated.duration, color: updated.color, text: updated.text }
              changed = true
            }
          })
          if (changed) result[dk] = newDay
        })
        const oldSlotKey = wasTermin ? minutesToSk(parseHHMM(existingTodo.time)) : null
        const termDateChanged = existingTodo.date !== (eff.date || null)
        const termTimeChanged = existingTodo.time !== (eff.time || null)
        if (wasTermin && (termDateChanged || termTimeChanged || !nowTermin)) {
          if (result[existingTodo.date]?.[oldSlotKey]?.todoId === existingTodo.id) {
            result[existingTodo.date] = { ...result[existingTodo.date] }
            delete result[existingTodo.date][oldSlotKey]
          }
        }
        if (nowTermin && (!wasTermin || termDateChanged || termTimeChanged)) {
          const newSlotKey = minutesToSk(parseHHMM(eff.time))
          result[eff.date] = {
            ...(result[eff.date] ?? {}),
            [newSlotKey]: {
              text: updated.text, todoId: updated.id, color: updated.color,
              duration: updated.duration || 30, done: false, locked: true,
            },
          }
        }
        return result
      })

      setTodos(prev => prev.map(t => t.id === existingTodo.id ? updated : t))

    } else {
      if (isTermin) {
        const block = createBlock({
          text: eff.text, priority: eff.priority, color: effColor,
          duration: eff.duration || 30,
          date: eff.date, time: eff.time,
          projectId: effProjectId,
          repeat: repeat || null,
          subItems,
        })
        const mins    = parseHHMM(eff.time)
        const slotKey = minutesToSk(mins)
        setDays(prev => ({
          ...prev,
          [eff.date]: {
            ...(prev[eff.date] ?? {}),
            [slotKey]: {
              text: block.text, todoId: block.id, color: block.color,
              duration: block.duration, done: false, locked: true,
            },
          },
        }))
        setTodos(prev => [...prev, block])
      } else {
        setTodos(prev => [...prev, createBlock({
          text: eff.text, priority: eff.priority, color: effColor,
          duration: eff.duration || null,
          date: eff.date || null,
          projectId: effProjectId,
          repeat: repeat || null,
          subItems,
        })])
      }
    }

    onClose()
  }

  const handleDelete = () => {
    setTodos(prev => prev.filter(t => t.id !== existingTodo.id))
    // aus allen Tages-Slots entfernen, die dieses Todo referenzieren
    setDays(prev => {
      const next = {}
      for (const [dk, day] of Object.entries(prev)) {
        const nd = {}
        for (const [k, slot] of Object.entries(day)) {
          if (slot?.todoId !== existingTodo.id) nd[k] = slot
        }
        next[dk] = nd
      }
      return next
    })
    onClose()
  }

  return (
    <Overlay variant="center" onClose={onClose} closeOnBackdrop={false} style={keyboardOffset > 0 ? { alignItems: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset } : undefined}>
      <div className={s.modal}>

        {/* Header */}
        <div className={s.header}>
          <span className={s.title}>{isEdit ? 'Bearbeiten' : 'Hinzufügen'}</span>
          <div className={s.headerActions}>
            {isEdit && (
              <button
                className={[s.deleteBtn, confirmDelete ? s.deleteBtnConfirm : ''].join(' ')}
                onClick={confirmDelete ? handleDelete : () => setConfirmDelete(true)}
                onBlur={() => setConfirmDelete(false)}
                aria-label="Löschen"
              >
                <TrashIcon />
                {confirmDelete ? 'Wirklich löschen?' : 'Löschen'}
              </button>
            )}
            <button className={s.closeBtn} onClick={onClose} aria-label="Schließen">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {showModeToggle && (
          <div className={s.modeToggle}>
            <button
              className={[s.modeBtn, mode === 'aufgabe' ? s.modeBtnOn : ''].join(' ')}
              onClick={() => switchMode('aufgabe')}
            >Aufgabe</button>
            <button
              className={[s.modeBtn, mode === 'notiz' ? s.modeBtnOn : ''].join(' ')}
              onClick={() => switchMode('notiz')}
            >Notiz</button>
          </div>
        )}

        {mode === 'notiz' ? (
          <div className={s.noteWrap}>
            <textarea
              className={s.noteArea}
              autoFocus
              value={noteText}
              onChange={e => updateNote(e.target.value)}
              placeholder="Schreib alles rein, was raus muss…"
            />
            <div className={s.noteHint}>
              <span className={s.noteHintIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </span>
              Bleibt erhalten, bis du speicherst
            </div>
            <button
              className={s.submitBtn}
              style={{ '--tc': 'var(--primary)' }}
              onClick={saveNote}
              disabled={!noteText.trim()}
            >
              Als Notiz speichern
            </button>

            {recentNotes.length > 0 && (
              <div className={s.recentWrap}>
                <div className={s.recentHead}>
                  <span className={s.recentLabel}>Letzte Notizen</span>
                  <button className={s.recentAll} onClick={openNotizen}>Alle Notizen →</button>
                </div>
                <div className={s.recentList}>
                  {recentNotes.map(n => (
                    <button
                      key={n.id}
                      className={s.recentCard}
                      style={{ '--nc': n.color }}
                      onClick={() => openNote(n.id)}
                    >
                      <span className={s.recentDot} />
                      <span className={s.recentTitle}>{noteTitle(n)}</span>
                      <span className={s.recentTime}>{formatNoteTime(n.updatedAt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Text + Auto */}
        <div className={s.textRow}>
          <input
            className={s.textInput}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Was muss getan werden…"
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          {!isEdit && (
            <button
              className={[s.autoBtn, autoOn ? s.autoBtnOn : ''].join(' ')}
              onClick={toggleAuto}
              title={autoOn ? 'Auto-Erkennung aus' : 'Auto-Erkennung an'}
            >
              Auto
            </button>
          )}
        </div>

        {autoChips.length > 0 && (
          <div className={s.parseRow}>
            <span className={s.parseLabel}>erkannt:</span>
            {autoChips.map(chip => (
              <span key={chip} className={s.summaryChip}>{chip}</span>
            ))}
          </div>
        )}

        {/* Prio — immer */}
        <div className={s.row}>
          <span className={s.rowLabel}>Prio</span>
          <div className={s.segControl}>
            {[[1,'! Wichtig'],[2,'· Sollte'],[3,'Kann']].map(([v, l]) => (
              <button
                key={v}
                className={[s.segBtn, priority === v ? s.segBtnActive : ''].join(' ')}
                onClick={() => setPriority(v)}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Dauer */}
        <div className={s.row}>
          <span className={s.rowLabel}>Dauer</span>
          <div className={s.durBtnRow}>
            {DUR_PRESETS.map(({ label, value }) => (
              <button
                key={value}
                className={[s.durBtn, duration === value ? s.durBtnActive : ''].join(' ')}
                onClick={() => handleDurPreset(value)}
              >
                {label}
              </button>
            ))}
            <input
              type="number" className={s.durFreeInput} min={1} max={480}
              value={duration && !DUR_PRESETS.some(p => p.value === duration) ? duration : ''}
              placeholder="—"
              onChange={handleDurFree}
            />
            <span className={s.durUnit}>min</span>
          </div>
        </div>

        {/* Schritte */}
        <div className={s.row} style={{ alignItems: 'flex-start' }}>
          <span className={s.rowLabel} style={{ marginTop: 6 }}>Schritte</span>
          <div className={s.subSection} ref={subItemsWrapRef}>
            {subItems.map((si, idx) => (
              <div
                key={si.id}
                data-sub-row
                className={[s.subRow, subDragOver === idx ? s.subRowDragOver : ''].join(' ')}
              >
                <span className={s.subText}>{si.text}</span>
                <button className={s.subRm} onClick={() => removeSubItem(si.id)}>✕</button>
                <span
                  className={s.subDragHandle}
                  onPointerDown={e => startSubDrag(idx, e)}
                  aria-label="Ziehen"
                ><SubDragIcon /></span>
              </div>
            ))}
            <div className={s.subAddRow}>
              <input
                className={s.subInput}
                placeholder="Schritt hinzufügen…"
                value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubItem() } }}
              />
              <button className={s.subAddBtn} onClick={addSubItem}>+</button>
            </div>
          </div>
        </div>

        {/* Details Dropdown */}
        <button
          className={s.detailsToggle}
          onClick={() => setDetailsOpen(v => !v)}
        >
          <span className={s.detailsLabel}>Details</span>
          {!detailsOpen && (date || time || projekt) && (
            <span className={s.detailsSummary}>
              {date && <span className={s.summaryChip}>{formatSummaryDate(date)}</span>}
              {time && <span className={s.summaryChip}>{endTime ? `${time}–${endTime}` : time}</span>}
              {projekt && <span className={s.summaryChip}><span className={s.pjDot} style={{ background: projekt.color }} />{projekt.name}</span>}
            </span>
          )}
          {isTermin && !detailsOpen && (
            <span className={s.terminBadge}>Termin</span>
          )}
          <span className={[s.detailsChevron, detailsOpen ? s.chevronOpen : ''].join(' ')}>▾</span>
        </button>

        {detailsOpen && (
          <div className={s.detailsBody}>

            {/* Datum */}
            <div className={s.row}>
              <span className={s.rowLabel}>Datum</span>
              <input
                type="date"
                className={[s.fieldInputSm, blinkDate ? s.blinkField : ''].join(' ')}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            {/* Uhrzeit */}
            <div className={s.row}>
              <span className={s.rowLabel}>Uhrzeit</span>
              <div className={s.timeRangeRow}>
                <input
                  type="time"
                  className={[s.fieldInputSm, s.timeRangeInput, blinkTime ? s.blinkField : ''].join(' ')}
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
                <span className={s.timeRangeSep}>–</span>
                <input
                  type="time"
                  className={[s.fieldInputSm, s.timeRangeInput].join(' ')}
                  value={endTime}
                  onChange={handleEndTime}
                  placeholder="Ende"
                  aria-label="Ende"
                />
              </div>
              {isTermin && (
                <span style={{ fontSize: '0.68rem', color: 'rgba(251,113,133,0.8)' }}>→ Kalendereintrag</span>
              )}
            </div>

            {/* Farbe */}
            {projekt ? (
              <div className={s.row}>
                <span className={s.rowLabel}>Farbe</span>
                <span className={s.colorFromProject}>
                  <span className={s.pjDot} style={{ background: projekt.color }} />
                  Farbe kommt vom Projekt
                </span>
              </div>
            ) : (
              <div className={s.row}>
                <span className={s.rowLabel}>Farbe</span>
                <div className={s.colorRow}>
                  <button
                    className={[s.colorCircle, s.colorCircleAuto, !color ? s.colorCircleActive : ''].join(' ')}
                    onClick={() => setColor(null)}
                    title="Standard — folgt der Akzentfarbe"
                    aria-label="Standardfarbe (Akzent)"
                  />
                  {NEON.map(c => (
                    <button
                      key={c}
                      className={[s.colorCircle, color === c ? s.colorCircleActive : ''].join(' ')}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Projekt */}
            <div className={s.row} style={{ alignItems: 'flex-start' }}>
              <span className={s.rowLabel} style={{ marginTop: 6 }}>Projekt</span>
              <div className={s.catWrap}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  {!projNewMode && (
                    <div className={s.catChips}>
                      {visibleProjects.length === 0 && (
                        <span className={s.catEmpty}>Noch keine Projekte</span>
                      )}
                      {visibleProjects.map(p => (
                        <button
                          key={p.id}
                          className={[s.catChip, projectId === p.id ? s.pjChipActive : ''].join(' ')}
                          style={{ '--pj': p.color }}
                          onClick={() => pickProject(p)}
                        >
                          <span className={s.pjDot} style={{ background: p.color }} />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    className={[s.catEditBtn, projNewMode ? s.catEditBtnActive : ''].join(' ')}
                    onClick={() => { setProjNewMode(v => !v); setProjNewInput('') }}
                    aria-label={projNewMode ? 'Fertig' : 'Neues Projekt'}
                  ><EditIcon /></button>
                </div>
                {projNewMode && (
                  <div className={s.catManageRow}>
                    <input
                      className={s.catNewInput}
                      placeholder="Neues Projekt…"
                      value={projNewInput}
                      onChange={e => setProjNewInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProject() } }}
                    />
                    <button className={s.catAddBtn} onClick={addProject}>+</button>
                  </div>
                )}
              </div>
            </div>

            {/* Wiederholung */}
            <div className={s.row} style={{ alignItems: 'flex-start' }}>
              <span className={s.rowLabel} style={{ marginTop: 6 }}>Wiederholen</span>
              <div style={{ flex: 1 }}>
                <RepeatPicker value={repeat} onChange={setRepeat} />
              </div>
            </div>

          </div>
        )}

        <button
          className={s.submitBtn}
          style={{ '--tc': isTermin ? 'var(--teal)' : 'var(--primary)' }}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          {isEdit ? 'Speichern' : (isTermin ? 'Termin eintragen' : 'Hinzufügen')}
        </button>
        </>
        )}

      </div>
    </Overlay>
  )
}
