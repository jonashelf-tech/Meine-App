// src/features/tools/haushalt/HaushaltSheet.jsx
// Bottom-Sheets für Raum + Aufgabe (Muster: BirthdaySheet) — Bearbeiten,
// Anlegen und Löschen wohnen hier, nicht mehr in Inline-Drawern.
import { useState, useEffect, useRef } from 'react'
import Overlay from '../../../components/Overlay/Overlay'
import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import { useToast } from '../../../components/Toast/Toast'
import { FREQ_LABELS } from './haushaltData'
import { ROOM_GLYPHS } from '../_shared/glyphs'
import GlyphPicker from '../_shared/GlyphPicker'
import s from './HaushaltSheet.module.css'

const FREQ_OPTIONS = ['daily', 'biweekly', 'weekly', 'monthly', 'custom']

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

// ─── Raum-Sheet ───────────────────────────────────────────
export function RoomSheet({ room = null, onSave, onDelete, onClose }) {
  const keyboardOffset = useKeyboardOffset()
  const { showToast }  = useToast()
  const nameRef        = useRef(null)
  const isEdit         = room !== null

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState(() => room
    ? { name: room.name, icon: room.icon, priority: room.priority ?? 3 }
    : { name: '', icon: 'home', priority: 3 })

  useEffect(() => {
    if (isEdit) return
    const t = setTimeout(() => nameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [isEdit])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleSave = () => {
    const name = form.name.trim()
    if (!name) { showToast('Name fehlt noch', 'error'); return }
    onSave({
      ...(isEdit ? room : { id: crypto.randomUUID(), tasks: [] }),
      name,
      icon:     form.icon,
      priority: form.priority,
    })
  }

  const overlayStyle = keyboardOffset > 0
    ? { justifyContent: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset }
    : {}

  return (
    <Overlay variant="sheet" onClose={onClose} style={overlayStyle}>
      <div className={s.sheet}>
        <div className={s.handle} />
        <div className={s.label}>{isEdit ? 'Raum bearbeiten' : 'Neuer Raum'}</div>

        <input
          ref={nameRef}
          className={s.nameInput}
          placeholder="Name (z.B. Küche)"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />

        <div className={s.fieldLabel}>Icon</div>
        <GlyphPicker
          glyphs={ROOM_GLYPHS}
          value={form.icon}
          onChange={name => set('icon', name)}
        />

        <div className={s.fieldLabel}>Priorität</div>
        <div className={s.segRow}>
          {[1, 2, 3].map(p => (
            <button
              key={p}
              className={[s.segBtn, form.priority === p ? s.segBtnOn : ''].join(' ')}
              onClick={() => set('priority', p)}
            >
              P{p}
            </button>
          ))}
        </div>

        <button className={s.submitBtn} onClick={handleSave}>
          {isEdit ? 'Speichern' : 'Hinzufügen'}
        </button>

        {isEdit && onDelete && (
          <button
            className={[s.deleteBtn, confirmDelete ? s.deleteBtnConfirm : ''].join(' ')}
            onClick={() => {
              if (!confirmDelete) { setConfirmDelete(true); return }
              onDelete(room.id)
              onClose()
            }}
          >
            {confirmDelete ? 'Wirklich löschen? Alle Aufgaben gehen mit.' : 'Raum löschen'}
          </button>
        )}
      </div>
    </Overlay>
  )
}

// ─── Aufgaben-Sheet ───────────────────────────────────────
export function TaskSheet({ task = null, onSave, onDelete, onReset, onClose }) {
  const keyboardOffset = useKeyboardOffset()
  const { showToast }  = useToast()
  const textRef        = useRef(null)
  const isEdit         = task !== null

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState(() => task
    ? { text: task.text, freq: task.freq, customDays: task.customDays, duration: task.duration, lowEnergy: task.lowEnergy }
    : { text: '', freq: 'weekly', customDays: null, duration: 15, lowEnergy: false })

  useEffect(() => {
    if (isEdit) return
    const t = setTimeout(() => textRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [isEdit])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleSave = () => {
    const text = form.text.trim()
    if (!text) { showToast('Aufgabe fehlt noch', 'error'); return }
    onSave({
      ...(isEdit ? task : { id: crypto.randomUUID(), lastDone: null, subItems: [] }),
      text,
      freq:       form.freq,
      customDays: form.customDays,
      duration:   form.duration,
      lowEnergy:  form.lowEnergy,
    })
  }

  const overlayStyle = keyboardOffset > 0
    ? { justifyContent: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset }
    : {}

  return (
    <Overlay variant="sheet" onClose={onClose} style={overlayStyle}>
      <div className={s.sheet}>
        <div className={s.handle} />
        <div className={s.label}>{isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</div>

        <input
          ref={textRef}
          className={s.nameInput}
          placeholder="Aufgabe (z.B. Abwasch)"
          value={form.text}
          onChange={e => set('text', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />

        <div className={s.fieldLabel}>Wie oft?</div>
        <div className={s.freqChips}>
          {FREQ_OPTIONS.map(f => (
            <button
              key={f}
              className={[s.freqChip, form.freq === f ? s.freqChipOn : ''].join(' ')}
              onClick={() => set('freq', f)}
            >
              {FREQ_LABELS[f]}
            </button>
          ))}
        </div>

        {form.freq === 'custom' && (
          <div className={s.numRow}>
            <span className={s.numLabel}>Alle</span>
            <input
              type="number"
              inputMode="numeric"
              className={s.numInput}
              value={form.customDays ?? ''}
              placeholder="7"
              min={1}
              onChange={e => set('customDays', e.target.value === '' ? null : Number(e.target.value))}
            />
            <span className={s.numLabel}>Tage</span>
          </div>
        )}

        <div className={s.numRow}>
          <span className={s.numLabel}>Dauer</span>
          <input
            type="number"
            inputMode="numeric"
            className={s.numInput}
            value={form.duration ?? ''}
            placeholder="15"
            min={1}
            onChange={e => set('duration', e.target.value === '' ? null : Number(e.target.value))}
          />
          <span className={s.numLabel}>min</span>
        </div>

        <div className={s.fieldLabel}>Aufwand</div>
        <div className={s.segRow}>
          <button
            className={[s.segBtn, !form.lowEnergy ? s.segBtnOn : ''].join(' ')}
            onClick={() => set('lowEnergy', false)}
          >
            <BoltIcon /> Normal
          </button>
          <button
            className={[s.segBtn, form.lowEnergy ? s.segBtnOn : ''].join(' ')}
            onClick={() => set('lowEnergy', true)}
          >
            <BatteryLowIcon /> Low Energy
          </button>
        </div>

        <button className={s.submitBtn} onClick={handleSave}>
          {isEdit ? 'Speichern' : 'Hinzufügen'}
        </button>

        {isEdit && task.lastDone && onReset && (
          <button className={s.resetLink} onClick={() => { onReset(task.id); onClose() }}>
            <ResetIcon /> Als „neu" zurücksetzen
          </button>
        )}

        {isEdit && onDelete && (
          <button
            className={[s.deleteBtn, confirmDelete ? s.deleteBtnConfirm : ''].join(' ')}
            onClick={() => {
              if (!confirmDelete) { setConfirmDelete(true); return }
              onDelete(task.id)
              onClose()
            }}
          >
            {confirmDelete ? 'Wirklich löschen?' : 'Aufgabe löschen'}
          </button>
        )}
      </div>
    </Overlay>
  )
}
