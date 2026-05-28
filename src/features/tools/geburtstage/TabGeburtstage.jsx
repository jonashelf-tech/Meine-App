// src/features/tools/geburtstage/TabGeburtstage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { sv, lv } from '../../../storage'
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
  const [swipeX, setSwipeX] = useState(0)
  const [swiped, setSwiped] = useState(false)
  const startXRef           = useRef(null)
  const cardRef             = useRef(null)

  const days    = daysUntilBirthday(birthday.date)
  const isToday = days === 0
  const isSoon  = !isToday && days <= 7
  const age     = calcAge(birthday.date, birthday.year)

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
      {swipeX < 0 && (
        <div className={s.deleteReveal} onClick={() => onDelete(birthday.id)}>
          <span className={s.deleteRevealIcon}><TrashIcon /></span>
        </div>
      )}

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
        <div className={s.avatarWrap}>
          <div className={s.avatar} style={avatarStyle}>
            {getInitial(birthday.name)}
          </div>
          {birthday.wichtig && (
            <span className={s.crownIcon}><CrownIcon /></span>
          )}
        </div>

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
  const [sheet, setSheet]     = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    localStorage.removeItem('adhs_birthdays')
    localStorage.removeItem('adhs_bday_sort')
    window.location.reload()
  }

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
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
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

      {birthdays.length === 0 && (
        <p className={s.empty}>Noch keine Geburtstage.<br />Tippe + zum Hinzufügen.</p>
      )}

      {sheet !== null && (
        <BirthdaySheet
          birthday={sheet === 'new' ? null : sheet}
          onSave={handleSave}
          onClose={() => setSheet(null)}
        />
      )}

      <button
        className={[s.toolReset, confirmReset ? s.toolResetConfirm : ''].join(' ')}
        onClick={handleReset}
      >
        {confirmReset ? '⚠ Wirklich alle Geburtstage löschen?' : 'Geburtstage-Daten löschen'}
      </button>
    </div>
  )
}
