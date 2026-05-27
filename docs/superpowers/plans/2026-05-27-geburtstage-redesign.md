# Geburtstage Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Geburtstags-Tool von einer trockenen Kontaktverwaltung zu einem sozialen Gedächtnis-Assistenten umbauen — Bottom Sheet UI, drei optionale Toggles (Kalender/Wichtig/Geschenk), Tagesplaner-Widget, Kalender-Integration.

**Architecture:** Neues `birthdayUtils.js` kapselt alle Logik (Migration, Chip-Berechnung, Hilfsfunktionen). `BirthdaySheet.jsx` ist das geteilte Formular für Neu + Edit. `BirthdaySection.jsx` folgt exakt dem ReminderSection/HaushaltSection-Pattern. Kalender-Integration arbeitet mit synthetischen (nicht gespeicherten) Einträgen aus `birthdays[]`.

**Tech Stack:** React 18, Zustand, CSS Modules, `useKeyboardOffset` Hook, `ToolSection`/`TodoChip` Komponenten, `createBlock` aus Block.js

---

## File Map

| Datei | Status | Verantwortung |
|-------|--------|---------------|
| `src/features/tools/geburtstage/birthdayUtils.js` | NEU | Migration, daysUntil, isDue, getChips, Hilfsfunktionen |
| `src/features/tools/geburtstage/BirthdaySheet.jsx` | NEU | Bottom-Sheet Formular (Neu + Edit) |
| `src/features/tools/geburtstage/BirthdaySheet.module.css` | NEU | Sheet-Styles |
| `src/features/tools/geburtstage/TabGeburtstage.jsx` | REWRITE | Listen-Ansicht, Sort, Swipe-Delete |
| `src/features/tools/geburtstage/TabGeburtstage.module.css` | REWRITE | Karten-Styles |
| `src/features/tools/geburtstage/BirthdaySection.jsx` | NEU | Tagesplaner-Widget (chips + drag) |
| `src/features/tools/geburtstage/BirthdaySection.module.css` | NEU | Section-Styles |
| `src/features/calendar/TabHeute/TabHeute.jsx` | MODIFY | BirthdaySection einbinden + startBirthdayDrag |
| `src/features/calendar/Zeitplan/Zeitplan.jsx` | MODIFY | PillStrip: birthdayPills-Prop |
| `src/features/calendar/TabKalender/TabKalender.jsx` | MODIFY | Synthetische Birthday-Einträge in Monat + DayPanel |

---

## Task 1: birthdayUtils.js — Datenmodell & Hilfsfunktionen

**Files:**
- Create: `src/features/tools/geburtstage/birthdayUtils.js`

- [ ] **Schritt 1: Datei anlegen**

```js
// src/features/tools/geburtstage/birthdayUtils.js

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/**
 * Stellt sicher dass ein Birthday-Objekt alle neuen Felder hat (Migration).
 * Bestehende Werte bleiben erhalten.
 */
export function migrateBirthday(b) {
  return {
    id:           b.id ?? genId(),
    name:         b.name ?? '',
    date:         b.date ?? '01-01',
    year:         b.year ?? null,
    kalender:     b.kalender ?? false,
    wichtig:      b.wichtig ?? false,
    wichtigDays:  b.wichtigDays ?? 7,
    geschenk:     b.geschenk ?? false,
    geschenkDays: b.geschenkDays ?? 14,
    notes:        b.notes ?? '',
    plannedYear:  b.plannedYear ?? null,
  }
}

/**
 * Leeres Birthday-Objekt für den Add-Flow.
 */
export function createBirthday(partial = {}) {
  return migrateBirthday({ id: genId(), ...partial })
}

/**
 * Tage bis zum nächsten Geburtstag (0 = heute).
 * date: "MM-DD"
 */
export function daysUntilBirthday(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [mm, dd] = date.split('-').map(Number)
  let next = new Date(today.getFullYear(), mm - 1, dd)
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
  return Math.round((next - today) / 86400000)
}

/**
 * Formatiert "MM-DD" → "15. März"
 */
const MONTH_NAMES = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
]
export function formatBirthdayDate(date) {
  const [mm, dd] = date.split('-').map(Number)
  return `${dd}. ${MONTH_NAMES[mm - 1]}`
}

/**
 * Berechnet Alter (wird am nächsten Geburtstag).
 * Gibt null zurück wenn kein Geburtsjahr gesetzt.
 */
export function calcAge(date, year) {
  if (!year) return null
  const today = new Date()
  const [mm, dd] = date.split('-').map(Number)
  let age = today.getFullYear() - year
  const bday = new Date(today.getFullYear(), mm - 1, dd)
  if (bday > today) age--
  return age
}

/**
 * Gibt die Initiale des ersten Wortes zurück.
 */
export function getInitial(name) {
  return (name?.trim()[0] ?? '?').toUpperCase()
}

/**
 * Parst "TT.MM" → { day, month } oder null bei Fehler.
 */
export function parseDateInput(str) {
  const parts = str.trim().split('.')
  if (parts.length < 2) return null
  const day   = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  if (isNaN(day) || isNaN(month)) return null
  if (day < 1 || day > 31)   return null
  if (month < 1 || month > 12) return null
  return { day, month }
}

/**
 * Prüft ob ein Geburtstags-Chip heute fällig ist.
 * fällig = heute liegt im Fenster [birthday - days, birthday] (inkl.)
 * und birthday ist noch nicht vergangen (birthday + 1 Tag)
 */
export function isBirthdayChipDue(birthday) {
  if (!birthday.wichtig) return false
  const days = daysUntilBirthday(birthday.date)
  return days <= birthday.wichtigDays && days >= 0
}

/**
 * Prüft ob ein Geschenk-Chip heute fällig ist.
 */
export function isGeschenkChipDue(birthday) {
  if (!birthday.geschenk) return false
  const days = daysUntilBirthday(birthday.date)
  return days <= birthday.geschenkDays && days >= 0
}

/**
 * Liefert Chips die heute im Tagesplaner-Widget angezeigt werden sollen.
 * Returns: Array von { type: 'birthday'|'geschenk', birthday, text, color }
 * color: toolColor (übergeben) für Geburtstag, '#14B8A6' für Geschenk
 */
export function getActiveChips(birthdays, toolColor) {
  const chips = []
  for (const b of birthdays) {
    if (isBirthdayChipDue(b)) {
      chips.push({ type: 'birthday', birthday: b, text: `${b.name} Geburtstag`, color: toolColor })
    }
    if (isGeschenkChipDue(b)) {
      chips.push({ type: 'geschenk', birthday: b, text: `Geschenk für ${b.name}`, color: '#14B8A6' })
    }
  }
  return chips
}

/**
 * Liefert Birthdays die am gegebenen dateKey (YYYY-MM-DD) Geburtstag haben
 * und kalender: true haben und nicht bereits für dieses Jahr geplant wurden.
 */
export function getBirthdaysForCalendarDate(birthdays, dateKey) {
  const [y, mm, dd] = dateKey.split('-')
  const year = parseInt(y, 10)
  return birthdays.filter(b => {
    if (!b.kalender) return false
    if (b.plannedYear === year) return false
    const [bMm, bDd] = b.date.split('-')
    return bMm === mm && bDd === dd
  })
}

/**
 * Sortiert birthdays nach der gewählten Sortierung.
 * sort: 'next' | 'wichtig' | 'alpha' | 'age'
 */
export function sortBirthdays(birthdays, sort) {
  const arr = [...birthdays]
  if (sort === 'next') {
    return arr.sort((a, b) => daysUntilBirthday(a.date) - daysUntilBirthday(b.date))
  }
  if (sort === 'wichtig') {
    return arr.sort((a, b) => {
      if (a.wichtig && !b.wichtig) return -1
      if (!a.wichtig && b.wichtig) return 1
      return daysUntilBirthday(a.date) - daysUntilBirthday(b.date)
    })
  }
  if (sort === 'alpha') {
    return arr.sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }
  if (sort === 'age') {
    return arr.sort((a, b) => {
      const ayear = a.year ?? 9999
      const byear = b.year ?? 9999
      return ayear - byear
    })
  }
  return arr
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/features/tools/geburtstage/birthdayUtils.js
git commit -m "feat(geburtstage): add birthdayUtils — migration, helpers, chip logic"
```

---

## Task 2: BirthdaySheet — Bottom Sheet Formular

**Files:**
- Create: `src/features/tools/geburtstage/BirthdaySheet.jsx`
- Create: `src/features/tools/geburtstage/BirthdaySheet.module.css`

- [ ] **Schritt 1: BirthdaySheet.module.css**

```css
/* BirthdaySheet.module.css */

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.sheet {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  padding: 12px 16px 32px;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideInBottom 0.22s ease both;
}

.handle {
  width: 32px;
  height: 3px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  margin: 0 auto 6px;
  flex-shrink: 0;
}

.label {
  font-family: 'Outfit', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin-bottom: 2px;
}

.nameInput {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  padding: 10px 12px;
  outline: none;
  width: 100%;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.nameInput:focus { border-color: var(--primary); }

/* ─── Datum-Zeile ──────────────────────────────────────── */
.dateRow {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dateInput {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: 'Orbitron', monospace;
  font-size: 13px;
  padding: 8px 12px;
  outline: none;
  width: 80px;
  flex-shrink: 0;
  transition: border-color 0.15s;
}
.dateInput:focus { border-color: var(--primary); }
.dateInput::placeholder { color: rgba(255,255,255,0.3); }

.yearInput {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--r-sm);
  color: rgba(255,255,255,0.45);
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  padding: 8px 10px;
  outline: none;
  width: 72px;
  flex-shrink: 0;
  transition: border-color 0.15s;
}
.yearInput:focus { border-color: var(--primary); color: var(--text); }
.yearInput::placeholder { color: rgba(255,255,255,0.25); }

.spacer { flex: 1; }

/* ─── Toggle-Buttons ───────────────────────────────────── */
.toggleBtn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--r-sm);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s;
}
.toggleBtn:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.55); }

.toggleBtnKalender.active {
  background: rgba(139,92,246,0.15);
  border-color: rgba(139,92,246,0.5);
  color: var(--primary);
  box-shadow: 0 0 8px rgba(139,92,246,0.2);
}
.toggleBtnWichtig.active {
  background: rgba(251,191,36,0.12);
  border-color: rgba(251,191,36,0.45);
  color: #FBBF24;
  box-shadow: 0 0 8px rgba(251,191,36,0.2);
}
.toggleBtnGeschenk.active {
  background: rgba(20,184,166,0.15);
  border-color: rgba(20,184,166,0.5);
  color: #14B8A6;
  box-shadow: 0 0 8px rgba(20,184,166,0.2);
}

/* ─── Preset-Zeilen ────────────────────────────────────── */
.presetRow {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.03);
  border-radius: var(--r-sm);
  padding: 8px 10px;
  animation: fadeInUp 0.15s ease both;
}

.presetIcon {
  flex-shrink: 0;
  color: rgba(255,255,255,0.4);
}

.presetLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  flex-shrink: 0;
}

.presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.presetPill {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  padding: 4px 8px;
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: all 0.12s;
}

.presetPillWichtig.selected {
  background: rgba(251,191,36,0.18);
  border-color: rgba(251,191,36,0.5);
  color: #FBBF24;
  font-weight: 700;
}
.presetPillGeschenk.selected {
  background: rgba(20,184,166,0.18);
  border-color: rgba(20,184,166,0.5);
  color: #14B8A6;
  font-weight: 700;
}

/* ─── Notizen ──────────────────────────────────────────── */
.notesLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  padding-left: 2px;
  margin-bottom: -4px;
}

.notesInput {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: var(--r-sm);
  color: var(--text);
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  padding: 9px 12px;
  outline: none;
  resize: none;
  min-height: 54px;
  width: 100%;
  box-sizing: border-box;
  line-height: 1.5;
  transition: border-color 0.15s;
}
.notesInput:focus { border-color: var(--primary); }
.notesInput::placeholder { color: rgba(255,255,255,0.22); }

/* ─── Submit ───────────────────────────────────────────── */
.submitBtn {
  background: var(--primary);
  border: none;
  border-radius: var(--r-sm);
  color: #fff;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 11px;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.15s;
  box-shadow: 0 0 14px rgba(139,92,246,0.4);
}
.submitBtn:hover { opacity: 0.88; }
```

- [ ] **Schritt 2: BirthdaySheet.jsx**

```jsx
// src/features/tools/geburtstage/BirthdaySheet.jsx
import { useState, useEffect, useRef } from 'react'
import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import { useToast } from '../../../components/Toast/Toast'
import { createBirthday, parseDateInput } from './birthdayUtils'
import s from './BirthdaySheet.module.css'

const WICHTIG_PRESETS  = [7, 14, 21, 30]
const GESCHENK_PRESETS = [7, 14, 21, 30]

// ─── SVG Icons ────────────────────────────────────────────
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

/**
 * BirthdaySheet — Bottom Sheet für Neu + Edit.
 *
 * Props:
 *   birthday   — null = Neu-Modus, Objekt = Edit-Modus
 *   onSave     — fn(birthday) — gibt das fertige Objekt zurück
 *   onClose    — fn() — schließt das Sheet
 */
export default function BirthdaySheet({ birthday = null, onSave, onClose }) {
  const keyboardOffset = useKeyboardOffset()
  const { showToast }  = useToast()
  const nameRef        = useRef(null)

  const isEdit = birthday !== null

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

  // Auto-focus Name beim Öffnen
  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  // Auto-Punkt nach TT
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

        {/* Name */}
        <input
          ref={nameRef}
          className={s.nameInput}
          placeholder="Name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />

        {/* Datum-Zeile */}
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

          {/* Kalender Toggle */}
          <button
            className={[s.toggleBtn, s.toggleBtnKalender, form.kalender ? s.active : ''].join(' ')}
            onClick={() => set('kalender', !form.kalender)}
            title="Im Kalender anzeigen"
          >
            <CalIcon />
          </button>

          {/* Wichtig Toggle */}
          <button
            className={[s.toggleBtn, s.toggleBtnWichtig, form.wichtig ? s.active : ''].join(' ')}
            onClick={() => set('wichtig', !form.wichtig)}
            title="Wichtige Person — Erinnerungs-Chip"
          >
            <StarIcon />
          </button>

          {/* Geschenk Toggle */}
          <button
            className={[s.toggleBtn, s.toggleBtnGeschenk, form.geschenk ? s.active : ''].join(' ')}
            onClick={() => set('geschenk', !form.geschenk)}
            title="Geschenk-Erinnerung"
          >
            <GiftIcon />
          </button>
        </div>

        {/* Wichtig Preset-Pills */}
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
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Geschenk Preset-Pills */}
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
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notizen */}
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
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/tools/geburtstage/BirthdaySheet.jsx src/features/tools/geburtstage/BirthdaySheet.module.css
git commit -m "feat(geburtstage): add BirthdaySheet bottom sheet (add + edit)"
```

---

## Task 3: TabGeburtstage — Listen-Ansicht Rewrite

**Files:**
- Modify: `src/features/tools/geburtstage/TabGeburtstage.jsx` (vollständiger Rewrite)
- Modify: `src/features/tools/geburtstage/TabGeburtstage.module.css` (vollständiger Rewrite)

- [ ] **Schritt 1: TabGeburtstage.module.css ersetzen**

```css
/* TabGeburtstage.module.css */

.page { padding-bottom: 40px; }

/* ─── Sort Bar ─────────────────────────────────────────── */
.sortBar {
  display: flex;
  gap: 5px;
  margin: 0 0 16px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.sortBar::-webkit-scrollbar { display: none; }

.sortPill {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 5px 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.sortPillActive {
  background: rgba(139,92,246,0.15);
  border-color: rgba(139,92,246,0.4);
  color: var(--primary);
}

/* ─── Sektion ──────────────────────────────────────────── */
.sectionLabel {
  font-family: 'Outfit', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin: 12px 0 8px;
}

/* ─── Karte (Swipe-Wrapper) ────────────────────────────── */
.cardWrapper {
  position: relative;
  overflow: hidden;
  border-radius: var(--r-sm);
  margin-bottom: 6px;
}

.deleteReveal {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 72px;
  background: var(--rose);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
}

.deleteRevealIcon {
  color: #fff;
}

.card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 11px 14px;
  transition: transform 0.2s ease, border-color 0.15s;
  cursor: pointer;
  position: relative;
  touch-action: pan-y;
  user-select: none;
}

.cardSoon { border-color: rgba(20,184,166,0.35); }
.cardToday {
  border-color: rgba(139,92,246,0.5);
  box-shadow: 0 0 14px rgba(139,92,246,0.12);
  background: rgba(139,92,246,0.06);
}

/* ─── Avatar ───────────────────────────────────────────── */
.avatarWrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 700;
}

.crownIcon {
  position: absolute;
  top: -6px;
  right: -5px;
  color: #FBBF24;
  line-height: 1;
}

/* ─── Info ─────────────────────────────────────────────── */
.info { flex: 1; min-width: 0; }

.name {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 4px;
}

.statusPills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.statusPill {
  display: flex;
  align-items: center;
  gap: 3px;
  border-radius: 5px;
  padding: 2px 6px;
  font-family: 'Outfit', sans-serif;
  font-size: 10px;
  border: 1px solid;
}

/* ─── Badge ────────────────────────────────────────────── */
.badge {
  font-family: 'Orbitron', monospace;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  padding: 4px 8px;
  flex-shrink: 0;
}

/* ─── Empty ────────────────────────────────────────────── */
.empty {
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  color: var(--text-dim);
  text-align: center;
  padding: 48px 16px;
  line-height: 1.6;
}
```

- [ ] **Schritt 2: TabGeburtstage.jsx ersetzen**

```jsx
// src/features/tools/geburtstage/TabGeburtstage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { useToast } from '../../../components/Toast/Toast'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import BirthdaySheet from './BirthdaySheet'
import {
  migrateBirthday, daysUntilBirthday, formatBirthdayDate,
  calcAge, getInitial, sortBirthdays,
} from './birthdayUtils'
import s from './TabGeburtstage.module.css'

const SORT_OPTIONS = [
  { key: 'next',    label: 'Nächster' },
  { key: 'wichtig', label: 'Wichtig' },
  { key: 'alpha',   label: 'A–Z' },
  { key: 'age',     label: 'Alter' },
]

// ─── SVG Icons ────────────────────────────────────────────
const CrownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const CalMiniIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
)
const StarMiniIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
)
const GiftMiniIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>
)
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

// ─── BirthdayCard ─────────────────────────────────────────
function BirthdayCard({ birthday, toolColor, onEdit, onDelete }) {
  const [swipeX, setSwipeX]       = useState(0)
  const [swiped, setSwiped]       = useState(false)
  const startXRef                 = useRef(null)
  const cardRef                   = useRef(null)

  const days    = daysUntilBirthday(birthday.date)
  const isToday = days === 0
  const isSoon  = !isToday && days <= 7
  const age     = calcAge(birthday.date, birthday.year)

  // Swipe-to-delete
  const handlePointerDown = useCallback((e) => {
    startXRef.current = e.clientX
    setSwiped(false)
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (startXRef.current === null) return
    const dx = e.clientX - startXRef.current
    if (dx < 0) setSwipeX(Math.max(dx, -72))
  }, [])

  const handlePointerUp = useCallback(() => {
    if (swipeX < -40) {
      setSwipeX(-72)
      setSwiped(true)
    } else {
      setSwipeX(0)
    }
    startXRef.current = null
  }, [swipeX])

  const closeSwipe = useCallback(() => { setSwipeX(0); setSwiped(false) }, [])

  // Klick auf Karte öffnet Edit, nur wenn nicht geswiped
  const handleCardClick = useCallback(() => {
    if (swiped) { closeSwipe(); return }
    onEdit(birthday)
  }, [swiped, closeSwipe, onEdit, birthday])

  const tintColor = birthday.wichtig
    ? 'rgba(251,191,36,0.12)'
    : `${toolColor}18`
  const borderTintColor = birthday.wichtig
    ? 'rgba(251,191,36,0.35)'
    : `${toolColor}50`

  const avatarStyle = {
    background: tintColor,
    border: `1.5px solid ${borderTintColor}`,
    color: birthday.wichtig ? '#FBBF24' : toolColor,
  }

  return (
    <div className={s.cardWrapper}>
      {/* Delete reveal */}
      <div className={s.deleteReveal} onClick={() => onDelete(birthday.id)}>
        <span className={s.deleteRevealIcon}><TrashIcon /></span>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className={[s.card, isToday ? s.cardToday : isSoon ? s.cardSoon : ''].join(' ')}
        style={{ transform: `translateX(${swipeX}px)` }}
        onClick={handleCardClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Avatar */}
        <div className={s.avatarWrap}>
          <div className={s.avatar} style={avatarStyle}>
            {getInitial(birthday.name)}
          </div>
          {birthday.wichtig && (
            <span className={s.crownIcon}><CrownIcon /></span>
          )}
        </div>

        {/* Info */}
        <div className={s.info}>
          <div className={s.name}>{birthday.name}</div>
          <div className={s.meta}>
            {formatBirthdayDate(birthday.date)}
            {age !== null && ` · ${isToday ? age : age + 1} Jahre`}
          </div>
          {(birthday.kalender || birthday.wichtig || birthday.geschenk) && (
            <div className={s.statusPills}>
              {birthday.kalender && (
                <span className={s.statusPill} style={{ color: toolColor, borderColor: `${toolColor}40`, background: `${toolColor}10` }}>
                  <CalMiniIcon /> Kalender
                </span>
              )}
              {birthday.wichtig && (
                <span className={s.statusPill} style={{ color: '#FBBF24', borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)' }}>
                  <StarMiniIcon /> {birthday.wichtigDays}d
                </span>
              )}
              {birthday.geschenk && (
                <span className={s.statusPill} style={{ color: '#14B8A6', borderColor: 'rgba(20,184,166,0.35)', background: 'rgba(20,184,166,0.08)' }}>
                  <GiftMiniIcon /> {birthday.geschenkDays}d
                </span>
              )}
            </div>
          )}
        </div>

        {/* Badge */}
        {isToday ? (
          <span className={s.badge} style={{ background: 'rgba(139,92,246,0.2)', border: '1.5px solid rgba(139,92,246,0.5)', color: toolColor }}>
            Heute!
          </span>
        ) : isSoon ? (
          <span className={s.badge} style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: '#14B8A6' }}>
            in {days}d
          </span>
        ) : (
          <span className={s.badge} style={{ background: `${toolColor}12`, border: `1px solid ${toolColor}30`, color: toolColor }}>
            in {days}d
          </span>
        )}
      </div>
    </div>
  )
}

// ─── TabGeburtstage ───────────────────────────────────────
export default function TabGeburtstage({ onBack }) {
  const { birthdays, setBirthdays, toolColors } = useAppStore()
  const toolColor = getToolColor('geburtstage', toolColors)
  const { showToast } = useToast()

  const [sort, setSort]       = useState(() => lv('adhs_bday_sort', 'next'))
  const [sheet, setSheet]     = useState(null) // null | 'new' | birthday-object

  // Migration bestehender Daten
  useEffect(() => {
    const migrated = birthdays.map(migrateBirthday)
    const changed  = migrated.some((m, i) => JSON.stringify(m) !== JSON.stringify(birthdays[i]))
    if (changed) setBirthdays(migrated)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveSort = (key) => {
    setSort(key)
    sv('adhs_bday_sort', key)
  }

  const handleSave = (birthday) => {
    setBirthdays(prev => {
      const exists = prev.some(b => b.id === birthday.id)
      return exists ? prev.map(b => b.id === birthday.id ? birthday : b) : [...prev, birthday]
    })
    setSheet(null)
    showToast(sheet === 'new' ? `${birthday.name} hinzugefügt` : 'Gespeichert', 'success')
  }

  const handleDelete = (id) => {
    const b = birthdays.find(b => b.id === id)
    setBirthdays(prev => prev.filter(b => b.id !== id))
    if (b) showToast(`${b.name} gelöscht`, 'success')
  }

  const sorted = sortBirthdays(birthdays, sort)
  const soon   = sorted.filter(b => daysUntilBirthday(b.date) <= 7)
  const rest   = sorted.filter(b => daysUntilBirthday(b.date) > 7)

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader
        onBack={onBack}
        icon={<CrownIcon />}
        eyebrow="Tool"
        title={<>Geburts<em>tage</em></>}
        actions={
          <button
            style={{ width: 36, height: 36, background: toolColor, border: 'none', borderRadius: '50%', color: '#fff', fontSize: '1.25rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${toolColor}55` }}
            onClick={() => setSheet('new')}
            aria-label="Geburtstag hinzufügen"
          >+</button>
        }
      />

      {/* Sort Bar */}
      <div className={s.sortBar}>
        {SORT_OPTIONS.map(o => (
          <button
            key={o.key}
            className={[s.sortPill, sort === o.key ? s.sortPillActive : ''].join(' ')}
            onClick={() => handleSaveSort(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Bald-Sektion */}
      {soon.length > 0 && (
        <section>
          <div className={s.sectionLabel}>Bald</div>
          {soon.map(b => (
            <BirthdayCard
              key={b.id}
              birthday={b}
              toolColor={toolColor}
              onEdit={b => setSheet(b)}
              onDelete={handleDelete}
            />
          ))}
        </section>
      )}

      {/* Alle */}
      {rest.length > 0 && (
        <section>
          {soon.length > 0 && <div className={s.sectionLabel}>Alle</div>}
          {rest.map(b => (
            <BirthdayCard
              key={b.id}
              birthday={b}
              toolColor={toolColor}
              onEdit={b => setSheet(b)}
              onDelete={handleDelete}
            />
          ))}
        </section>
      )}

      {/* Leerzustand */}
      {birthdays.length === 0 && (
        <p className={s.empty}>Noch keine Geburtstage.<br />Tippe + zum Hinzufügen.</p>
      )}

      {/* Sheet */}
      {sheet !== null && (
        <BirthdaySheet
          birthday={sheet === 'new' ? null : sheet}
          onSave={handleSave}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Schritt 3: App starten und prüfen**

```bash
npm run dev
```

Prüfen: Tool öffnet, Liste zeigt Karten, Sortierung wechselt, + öffnet Sheet, Sheet speichert, Swipe zeigt Delete, Tippen auf Karte öffnet Edit-Sheet.

- [ ] **Schritt 4: Commit**

```bash
git add src/features/tools/geburtstage/TabGeburtstage.jsx src/features/tools/geburtstage/TabGeburtstage.module.css
git commit -m "feat(geburtstage): rewrite TabGeburtstage — cards, sort, swipe-delete, edit sheet"
```

---

## Task 4: BirthdaySection — Tagesplaner-Widget

**Files:**
- Create: `src/features/tools/geburtstage/BirthdaySection.jsx`
- Create: `src/features/tools/geburtstage/BirthdaySection.module.css`

- [ ] **Schritt 1: BirthdaySection.module.css**

```css
/* BirthdaySection.module.css */
.items { display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; align-items: stretch; gap: 4px; }
.chipWrap { flex: 1; min-width: 0; }
.rowDeselected { opacity: 0.4; }

.selectBtn {
  width: 28px;
  min-width: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: none;
  color: rgba(255,255,255,0.2);
  font-size: 0.72rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.selectBtnOn { color: var(--emerald); border-color: rgba(16,185,129,0.3); }

.dragHandle {
  width: 30px;
  min-width: 30px;
  align-self: stretch;
  border-left: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: rgba(255,255,255,0.25);
  cursor: grab;
  touch-action: none;
  transition: color 0.15s;
}
.dragHandle:hover { color: rgba(255,255,255,0.55); }

.addAllBtn {
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.6);
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.addAllBtn:disabled { opacity: 0.35; cursor: default; }
```

- [ ] **Schritt 2: BirthdaySection.jsx**

```jsx
// src/features/tools/geburtstage/BirthdaySection.jsx
import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import TodoChip from '../../../components/TodoChip/TodoChip'
import { getActiveChips } from './birthdayUtils'
import s from './BirthdaySection.module.css'

const DragIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="15" cy="6"  r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="12" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9"  cy="18" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
  </svg>
)

/**
 * BirthdaySection — Tagesplaner-Widget.
 * Eingebunden in TabHeute via SECTIONS/SECTION_PROPS.
 * Props:
 *   onStartDrag — fn(chip, color, e) — startet Drag in TabHeute
 */
export default function BirthdaySection({ onStartDrag }) {
  const { birthdays, setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('geburtstage', toolColors)

  const chips      = getActiveChips(birthdays, toolColor)
  const [deselected, setDeselected] = useState(() => new Set())

  const toggleSelect = useCallback((id) => {
    setDeselected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  if (chips.length === 0) return null

  const selectedChips = chips.filter(c => !deselected.has(`${c.type}-${c.birthday.id}`))

  return (
    <ToolSection
      toolId="geburtstage"
      title="Geburtstage"
      badge={chips.length}
      color={toolColor}
      defaultOpen
      onTitleClick={() => setCurrentTab(TOOL_TAB.geburtstage)}
    >
      <div className={s.items}>
        {chips.map(chip => {
          const chipId     = `${chip.type}-${chip.birthday.id}`
          const isSelected = !deselected.has(chipId)
          const fakeTodo   = {
            id:       chipId,
            text:     chip.text,
            color:    chip.color,
            done:     false,
            priority: chip.type === 'birthday' ? 2 : 3,
            duration: null,
            subItems: [],
            category: null,
            date:     null,
            time:     null,
            toolId:   'geburtstage',
          }
          const dragHandle = (
            <span
              className={s.dragHandle}
              onPointerDown={e => { e.stopPropagation(); onStartDrag?.(chip, chip.color, e) }}
              aria-label="Ziehen"
            >
              <DragIcon />
            </span>
          )
          return (
            <div key={chipId} className={[s.row, !isSelected ? s.rowDeselected : ''].join(' ')}>
              <button
                className={[s.selectBtn, isSelected ? s.selectBtnOn : ''].join(' ')}
                onClick={() => toggleSelect(chipId)}
                title={isSelected ? 'Abwählen' : 'Auswählen'}
              >
                {isSelected ? '✓' : '○'}
              </button>
              <div className={s.chipWrap}>
                <TodoChip
                  todo={fakeTodo}
                  onRemove={() => toggleSelect(chipId)}
                  disableExpand
                  dragHandle={dragHandle}
                />
              </div>
            </div>
          )
        })}

        {(() => {
          const count = selectedChips.length
          return (
            <button
              className={s.addAllBtn}
              onClick={() => onStartDrag?.(null, null, null, selectedChips)}
              disabled={count === 0}
            >
              + {count === chips.length ? 'Alle hinzufügen' : `${count} hinzufügen`}
            </button>
          )
        })()}
      </div>
    </ToolSection>
  )
}
```

- [ ] **Schritt 3: Commit**

```bash
git add src/features/tools/geburtstage/BirthdaySection.jsx src/features/tools/geburtstage/BirthdaySection.module.css
git commit -m "feat(geburtstage): add BirthdaySection Tagesplaner widget"
```

---

## Task 5: TabHeute — BirthdaySection einbinden

**Files:**
- Modify: `src/features/calendar/TabHeute/TabHeute.jsx`

- [ ] **Schritt 1: Import hinzufügen**

Nach Zeile 11 (nach `import GewichtSection`):
```jsx
import BirthdaySection from '../../tools/geburtstage/BirthdaySection'
```

- [ ] **Schritt 2: `birthdays` und `setBirthdays` aus Store**

Zeile 26 — `useAppStore()` destrukturierung erweitern:
```js
const { todos, setTodos, days, setDays, activeTools, setCurrentTab, dayplanDate, setDayplanDate, setCalendarDate, blockers, setBlockers, birthdays, setBirthdays } = useAppStore()
```

- [ ] **Schritt 3: `startBirthdayDrag` Callback nach `startReminderDrag`**

```js
const startBirthdayDrag = useCallback((chip, chipColor, e, bulkChips) => {
  // Bulk-Add in Pool (Masse-Hinzufügen-Button)
  if (!chip && bulkChips) {
    const newTodos = bulkChips.map(c =>
      createBlock({ text: c.text, priority: c.type === 'birthday' ? 2 : 3, color: c.color, toolId: 'geburtstage' })
    )
    setTodos(prev => [...prev, ...newTodos])
    // Geburtstags-Chips: plannedYear setzen
    const currentYear = new Date().getFullYear()
    const bChips = bulkChips.filter(c => c.type === 'birthday')
    if (bChips.length > 0) {
      setBirthdays(prev => prev.map(b => {
        const hit = bChips.find(c => c.birthday.id === b.id)
        return hit ? { ...b, plannedYear: currentYear } : b
      }))
    }
    return
  }

  const duration = 30
  startDrag(chip.text, chipColor, (dropKey) => {
    const newTodo = createBlock({
      text: chip.text,
      priority: chip.type === 'birthday' ? 2 : 3,
      color: chipColor,
      toolId: 'geburtstage',
      duration,
    })
    setTodos(prev => [...prev, newTodo])
    if (dropKey !== 'pool') {
      handleSetSlot(dropKey, { text: chip.text, todoId: newTodo.id, color: chipColor, duration, locked: false, done: false })
      // Geburtstags-Chip in Zeitplan platziert → Kalender-Entry ausblenden
      if (chip.type === 'birthday') {
        const currentYear = new Date().getFullYear()
        setBirthdays(prev => prev.map(b =>
          b.id === chip.birthday.id ? { ...b, plannedYear: currentYear } : b
        ))
      }
    }
  }, e, null)
}, [startDrag, setTodos, handleSetSlot, setBirthdays])
```

- [ ] **Schritt 4: SECTIONS und SECTION_PROPS erweitern**

Zeile 400 — `SECTIONS` und `SECTION_PROPS` anpassen:
```js
const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, erfolge: ErfolgeSection, gewicht: GewichtSection, geburtstage: BirthdaySection }
const SECTION_PROPS = {
  haushalt:    { onStartDrag: startHaushaltDrag },
  reminder:    { onStartDrag: startReminderDrag },
  geburtstage: { onStartDrag: startBirthdayDrag },
}
```

- [ ] **Schritt 5: Zeitplan — birthdays + viewDate übergeben für PillStrip (kommt in Task 6)**

In der `<Zeitplan ... />` JSX (ca. Zeile 362) zwei neue Props ergänzen:
```jsx
birthdayPills={birthdays}
birthdayPillsDate={viewDate}
```

- [ ] **Schritt 6: App starten und prüfen**

```bash
npm run dev
```

Prüfen: BirthdaySection erscheint im Tagesplaner wenn aktive Geburtstage mit `wichtig: true` oder `geschenk: true` konfiguriert sind und im Fenster liegen. Drag auf Pool → Todo im Pool. Drag auf Slot → Todo + Slot. Geburtstags-Chip auf Slot → `plannedYear` gesetzt.

- [ ] **Schritt 7: Commit**

```bash
git add src/features/calendar/TabHeute/TabHeute.jsx
git commit -m "feat(geburtstage): integrate BirthdaySection in TabHeute + startBirthdayDrag"
```

---

## Task 6: Zeitplan — PillStrip Birthday-Badge

**Files:**
- Modify: `src/features/calendar/Zeitplan/Zeitplan.jsx`

- [ ] **Schritt 1: Import birthdayUtils**

Nach der letzten Import-Zeile:
```js
import { getBirthdaysForCalendarDate } from '../../tools/geburtstage/birthdayUtils'
```

- [ ] **Schritt 2: `PillStrip` — `birthdayPills` Prop ergänzen**

Die bestehende `PillStrip`-Funktion (Zeile 46) erweitern:
```js
function PillStrip({ slots, visibleStart, visibleEnd, isTop, onExpand, onShrink, onExpandTo, birthdayPills = [] }) {
  const outSlots = Object.entries(slots)
    .filter(([k, v]) => {
      if (!v) return false
      const h = Math.floor(parseFloat(k))
      return isTop ? h < visibleStart : h > visibleEnd
    })
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))

  // Birthday-Badges nur im oberen PillStrip
  const showBirthdays = isTop && birthdayPills.length > 0

  return (
    <div className={s.pillStrip}>
      <button className={[s.pillBtn, s.pillBtnMinus].join(' ')} onClick={onShrink}>−</button>
      <div className={s.pillChips}>
        {showBirthdays && birthdayPills.map(b => (
          <div
            key={b.id}
            className={s.pillChip}
            style={{ borderLeft: `3px solid ${b._color || 'var(--primary)'}`, cursor: 'default', opacity: 0.85 }}
            title={`${b.name} hat heute Geburtstag`}
          >
            <div className={s.pillChipBody}>
              <span className={s.pillChipText}>{b.name}</span>
              <span className={s.pillChipMeta}>Geburtstag</span>
            </div>
          </div>
        ))}
        {outSlots.map(([k, slot]) => (
          <SlotChipPreview key={k} slotKey={k} slot={slot} onTap={onExpandTo} />
        ))}
      </div>
      <button className={[s.pillBtn, s.pillBtnPlus].join(' ')} onClick={onExpand}>+</button>
    </div>
  )
}
```

- [ ] **Schritt 3: `Zeitplan`-Komponente — neue Props annehmen und Berechnung**

Props-Signatur der `Zeitplan`-Komponente (ca. Zeile 69) erweitern:
```js
export default function Zeitplan({
  slots = {},
  todos = [],
  setTodos,
  visibleStart = 8,
  visibleEnd = 18,
  dateLabel,
  onSetSlot,
  onToggleSlotDone,
  onEditTodo,
  onRemoveSlot,
  onShiftAll,
  // ... alle weiteren bestehenden props ...
  birthdayPills = [],       // ← neu
  birthdayPillsDate = null, // ← neu
```

Vor dem `return` in `Zeitplan` (nach den bestehenden `useMemo`s):
```js
// Birthday-Pills für PillStrip: nur Geburtstage die kalender:true + kein wichtig haben am heutigen Tag
const activeBirthdayPills = React.useMemo(() => {
  if (!birthdayPillsDate) return []
  return getBirthdaysForCalendarDate(birthdayPills, birthdayPillsDate)
    .filter(b => !b.wichtig)
    .map(b => ({ ...b, _color: 'var(--primary)' }))
}, [birthdayPills, birthdayPillsDate])
```

- [ ] **Schritt 4: `birthdayPills`-Prop an oberen PillStrip übergeben**

Im JSX des Zeitplans — oberer `<PillStrip>` (ca. Zeile 273):
```jsx
<PillStrip
  slots={slots}
  visibleStart={visibleStart}
  visibleEnd={visibleEnd}
  isTop={true}
  onExpand={() => onExpandUp?.()}
  onShrink={() => onRemoveHour?.(visibleStart)}
  onExpandTo={(h) => onExpandUpTo?.(h)}
  birthdayPills={activeBirthdayPills}
/>
```

- [ ] **Schritt 5: `React` importieren (für useMemo falls nicht vorhanden)**

Prüfen ob `React` importiert ist oder `useMemo` aus react destructured. Falls `useMemo` nicht im Import steht, ergänzen:
```js
import { useState, useCallback, useRef, useMemo } from 'react'
```
Dann `React.useMemo` durch `useMemo` ersetzen.

- [ ] **Schritt 6: Commit**

```bash
git add src/features/calendar/Zeitplan/Zeitplan.jsx
git commit -m "feat(geburtstage): add birthday badge to Zeitplan PillStrip"
```

---

## Task 7: TabKalender — Synthetische Birthday-Einträge

**Files:**
- Modify: `src/features/calendar/TabKalender/TabKalender.jsx`

- [ ] **Schritt 1: `getBirthdaysForCalendarDate` importieren**

Nach den bestehenden Imports:
```js
import { getBirthdaysForCalendarDate, formatBirthdayDate } from '../../tools/geburtstage/birthdayUtils'
```

- [ ] **Schritt 2: `DayPanel` — `birthdays` Prop entgegennehmen und anzeigen**

Die `DayPanel`-Funktion (Zeile 71) erhält ein neues Prop:
```js
function DayPanel({ dateKey, todayKey, days, todos, activeTools, toolColors, birthdays = [], setCurrentTab, setDayplanDate, setTodos, restoreTodo, setRestoreTodo, handleRestore }) {
```

Direkt nach `const [open, setOpen] = useState(...)` die Birthday-Berechnung einfügen:
```js
const birthdayEntries = getBirthdaysForCalendarDate(birthdays, dateKey)
const toolColor       = getToolColor('geburtstage', toolColors)
```

Dann im JSX, **vor** dem `{/* Zeitplan */}`-Block einfügen:
```jsx
{/* Geburtstage */}
{birthdayEntries.length > 0 && (
  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
    {birthdayEntries.map(b => (
      <div
        key={b.id}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 0',
          fontFamily: 'Outfit, sans-serif', fontSize: 12,
          color: toolColor,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2a2 2 0 0 1 2-2z"/><path d="M3 22V12a9 9 0 0 1 18 0v10"/><line x1="3" y1="22" x2="21" y2="22"/></svg>
        <span>{b.name} · {formatBirthdayDate(b.date)}</span>
      </div>
    ))}
  </div>
)}
```

- [ ] **Schritt 3: `DayPanel` im Render-Aufruf `birthdays` übergeben**

Im `<DayPanel ... />` JSX (ca. Zeile 508) `birthdays` ergänzen:
```jsx
<DayPanel
  dateKey={selectedDay}
  todayKey={todayKey}
  days={days}
  todos={todos}
  activeTools={activeTools}
  toolColors={toolColors}
  birthdays={birthdays}
  setCurrentTab={setCurrentTab}
  setDayplanDate={setDayplanDate}
  setTodos={setTodos}
  restoreTodo={restoreTodo}
  setRestoreTodo={setRestoreTodo}
  handleRestore={handleRestore}
/>
```

- [ ] **Schritt 4: Monatsansicht — Birthday-Chip als ersten Eintrag**

In der Monatsansicht, wo `monthCells.map` die Kacheln rendert (ca. Zeile 453), nach der `toolDots`-Berechnung die Birthday-Einträge berechnen:

```js
const bdays = showTools
  ? getBirthdaysForCalendarDate(birthdays, dk)
  : []
```

Dann im Kachel-JSX, **vor** den `{visible.map(...)}` Farbbalken einfügen:
```jsx
{bdays.map(b => (
  <div
    key={b.id}
    className={s.cellBar}
    style={{ background: getToolColor('geburtstage', toolColors), opacity: 0.85 }}
  >
    <span className={s.cellBarText}>{b.name}</span>
  </div>
))}
```

- [ ] **Schritt 5: `getToolColor` Import prüfen**

Prüfen ob `getToolColor` in TabKalender.jsx bereits importiert ist:
```js
import { getToolColor } from '../../../utils'
```
Falls nicht, ergänzen.

- [ ] **Schritt 6: App starten — Kalender prüfen**

```bash
npm run dev
```

Prüfen: Geburtstag mit `kalender: true` erscheint in Monatsansicht als erster Chip. DayPanel zeigt ihn über dem Zeitplan. PillStrip im Tagesplaner zeigt Badge wenn `kalender: true` + `wichtig: false`.

- [ ] **Schritt 7: Commit**

```bash
git add src/features/calendar/TabKalender/TabKalender.jsx
git commit -m "feat(geburtstage): birthday markers in Kalender month view + DayPanel"
```

---

## Abschluss

- [ ] **Finaler Test-Durchlauf**

1. Neuen Geburtstag anlegen (alle Felder testen)
2. Existierenden Geburtstag bearbeiten (Edit-Sheet vorausgefüllt)
3. Swipe-Delete testen
4. Sort-Optionen testen
5. Geburtstag mit `wichtig: true` → Widget im Tagesplaner sichtbar?
6. Geburtstag mit `geschenk: true` → Geschenk-Chip sichtbar?
7. Chip in Zeitplan ziehen → `plannedYear` gesetzt → Kalender-Entry weg?
8. `kalender: true` → Monatsansicht zeigt Chip an richtiger Stelle?
9. DayPanel zeigt Birthday-Entry über Zeitplan?

- [ ] **Final Commit**

```bash
git add -A
git commit -m "feat(geburtstage): complete redesign — social memory assistant UX"
```
