// src/features/tools/geburtstage/BirthdaySheet.jsx
import { useState, useEffect, useRef } from 'react'
import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import { useToast } from '../../../components/Toast/Toast'
import { createBirthday, parseDateInput } from './birthdayUtils'
import s from './BirthdaySheet.module.css'

const WICHTIG_PRESETS  = [7, 14]
const GESCHENK_PRESETS = [7, 14]

const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const GiftIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
  </svg>
)
const BellIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

export default function BirthdaySheet({ birthday = null, onSave, onClose }) {
  const keyboardOffset = useKeyboardOffset()
  const { showToast }  = useToast()
  const nameRef        = useRef(null)
  const isEdit         = birthday !== null

  const [form, setForm] = useState(() => {
    if (birthday) {
      const [mm, dd] = birthday.date.split('-')
      return {
        name:         birthday.name,
        dateStr:      `${dd}.${mm}`,
        year:         birthday.year ? String(birthday.year) : '',
        kalender:     birthday.kalender,
        wichtig:      birthday.wichtig,
        wichtigDays:  birthday.wichtigDays,
        geschenk:     birthday.geschenk,
        geschenkDays: birthday.geschenkDays,
        notes:        birthday.notes ?? '',
      }
    }
    return {
      name: '', dateStr: '', year: '',
      kalender: false,
      wichtig: false, wichtigDays: 7,
      geschenk: false, geschenkDays: 14,
      notes: '',
    }
  })

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleDateInput = (e) => {
    let v = e.target.value.replace(/[^0-9.]/g, '')
    if (v.length === 2 && !v.includes('.') && form.dateStr.length < 2) v = v + '.'
    if (v.length > 5) return
    set('dateStr', v)
  }

  const handleSave = () => {
    const name = form.name.trim()
    if (!name) { showToast('Name ist ein Pflichtfeld', 'error'); return }
    const parsed = parseDateInput(form.dateStr)
    if (!parsed) { showToast('Datum ungültig — Format: TT.MM', 'error'); return }

    const yearNum = form.year ? parseInt(form.year, 10) : null
    const dateStr = `${String(parsed.month).padStart(2,'0')}-${String(parsed.day).padStart(2,'0')}`

    const result = createBirthday({
      ...(isEdit ? birthday : {}),
      name,
      date: dateStr,
      year: yearNum,
      kalender:     form.kalender,
      wichtig:      form.wichtig,
      wichtigDays:  form.wichtigDays,
      geschenk:     form.geschenk,
      geschenkDays: form.geschenkDays,
      notes:        form.notes,
    })

    onSave(result)
  }

  const overlayStyle = keyboardOffset > 0
    ? { justifyContent: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset }
    : {}

  return (
    <div className={s.overlay} style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <div className={s.label}>{isEdit ? 'Bearbeiten' : 'Neuer Geburtstag'}</div>

        <input
          ref={nameRef}
          className={s.nameInput}
          placeholder="Name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />

        <div className={s.dateRow}>
          <input
            className={s.dateInput}
            placeholder="TT.MM"
            value={form.dateStr}
            onChange={handleDateInput}
            inputMode="numeric"
            maxLength={5}
          />
          <input
            className={s.yearInput}
            placeholder="Jahr"
            value={form.year}
            onChange={e => set('year', e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            maxLength={4}
          />
          <div className={s.spacer} />
          <button
            className={[s.toggleBtn, s.toggleBtnKalender, form.kalender ? s.active : ''].join(' ')}
            onClick={() => set('kalender', !form.kalender)}
            title="Im Kalender anzeigen"
          ><CalIcon /></button>
          <button
            className={[s.toggleBtn, s.toggleBtnWichtig, form.wichtig ? s.active : ''].join(' ')}
            onClick={() => set('wichtig', !form.wichtig)}
            title="Wichtige Person — Erinnerungs-Chip"
          ><StarIcon /></button>
          <button
            className={[s.toggleBtn, s.toggleBtnGeschenk, form.geschenk ? s.active : ''].join(' ')}
            onClick={() => set('geschenk', !form.geschenk)}
            title="Geschenk-Erinnerung"
          ><GiftIcon /></button>
        </div>

        {form.wichtig && (
          <div className={s.presetRow}>
            <span className={s.presetIcon}><StarIcon /></span>
            <span className={s.presetLabel}>Erinnerung</span>
            <div className={s.presets}>
              {WICHTIG_PRESETS.map(d => (
                <button
                  key={d}
                  className={[s.presetPill, s.presetPillWichtig, form.wichtigDays === d ? s.selected : ''].join(' ')}
                  onClick={() => set('wichtigDays', d)}
                >{d}d</button>
              ))}
              <input
                className={[s.presetInput, s.presetInputWichtig, !WICHTIG_PRESETS.includes(form.wichtigDays) ? s.selected : ''].join(' ')}
                inputMode="numeric"
                maxLength={3}
                placeholder="…d"
                value={WICHTIG_PRESETS.includes(form.wichtigDays) ? '' : String(form.wichtigDays)}
                onChange={e => {
                  const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                  set('wichtigDays', Number.isNaN(n) ? 0 : n)
                }}
              />
            </div>
          </div>
        )}

        {form.geschenk && (
          <div className={s.presetRow}>
            <span className={s.presetIcon}><BellIcon /></span>
            <span className={s.presetLabel}>Erinnerung</span>
            <div className={s.presets}>
              {GESCHENK_PRESETS.map(d => (
                <button
                  key={d}
                  className={[s.presetPill, s.presetPillGeschenk, form.geschenkDays === d ? s.selected : ''].join(' ')}
                  onClick={() => set('geschenkDays', d)}
                >{d}d</button>
              ))}
              <input
                className={[s.presetInput, s.presetInputGeschenk, !GESCHENK_PRESETS.includes(form.geschenkDays) ? s.selected : ''].join(' ')}
                inputMode="numeric"
                maxLength={3}
                placeholder="…d"
                value={GESCHENK_PRESETS.includes(form.geschenkDays) ? '' : String(form.geschenkDays)}
                onChange={e => {
                  const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                  set('geschenkDays', Number.isNaN(n) ? 0 : n)
                }}
              />
            </div>
          </div>
        )}

        <div className={s.notesLabel}>Notizen</div>
        <textarea
          className={s.notesInput}
          placeholder="z.B. Verhältnis, Vorlieben…"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
        />

        <button className={s.submitBtn} onClick={handleSave}>
          {isEdit ? 'Speichern' : 'Hinzufügen'}
        </button>
      </div>
    </div>
  )
}
