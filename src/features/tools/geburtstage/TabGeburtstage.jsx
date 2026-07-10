// src/features/tools/geburtstage/TabGeburtstage.jsx
import { useState, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { sv, lv, SK } from '../../../storage'
import { useToast } from '../../../components/Toast/Toast'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
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

const RING_C = 2 * Math.PI * 20

// ─── SVG Icons ────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
)
const StarFillIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
)
const CalMiniIcon = ({ size = 9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
)
const GiftMiniIcon = ({ size = 9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>
)
const UsersIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)
const BellIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
)

// ─── Hero: nächster / heutiger Geburtstag ─────────────────
function Hero({ birthday, sameDay, onEdit }) {
  const days    = daysUntilBirthday(birthday.date)
  const isToday = days === 0
  const age     = calcAge(birthday.date, birthday.year)

  return (
    <button className={[s.hero, isToday ? s.heroToday : ''].join(' ')} onClick={() => onEdit(birthday)}>
      <div className={s.heroInfo}>
        <div className={s.heroKick}>
          <span className={s.heroDot} />
          {isToday ? 'Heute' : 'Nächster Geburtstag'}
        </div>
        <div className={s.heroTitle}>{birthday.name}</div>
        <div className={s.heroMeta}>
          {formatBirthdayDate(birthday.date)}
          {age !== null && (isToday ? ` · wird heute ${age}` : ` · wird ${age + 1}`)}
        </div>
        {sameDay.length > 0 && (
          <div className={s.heroSame}>Am selben Tag: {sameDay.map(b => b.name).join(', ')}</div>
        )}
      </div>
      {isToday ? (
        <div className={s.heroBurst}><StarFillIcon size={20} /></div>
      ) : (
        <div className={s.ring}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke="var(--tool-color)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={RING_C} strokeDashoffset={RING_C * (days / 365)}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span className={s.ringTxt}>{days}d</span>
        </div>
      )}
    </button>
  )
}

// ─── BirthdayCard ─────────────────────────────────────────
function BirthdayCard({ birthday, onEdit }) {
  const days    = daysUntilBirthday(birthday.date)
  const isToday = days === 0
  const isSoon  = !isToday && days <= 7
  const age     = calcAge(birthday.date, birthday.year)

  return (
    <button
      className={[s.card, isToday ? s.cardToday : isSoon ? s.cardSoon : ''].join(' ')}
      onClick={() => onEdit(birthday)}
    >
      <div className={s.avatarWrap}>
        <div className={[s.avatar, birthday.wichtig ? s.avatarWichtig : ''].join(' ')}>
          {getInitial(birthday.name)}
        </div>
        {birthday.wichtig && <span className={s.crown}><StarFillIcon /></span>}
      </div>

      <div className={s.info}>
        <div className={s.name}>{birthday.name}</div>
        <div className={s.meta}>
          {formatBirthdayDate(birthday.date)}
          {age !== null && ` · ${isToday ? age : age + 1} Jahre`}
        </div>
        {(birthday.kalender || birthday.wichtig || birthday.geschenk) && (
          <div className={s.pills}>
            {birthday.kalender && (
              <span className={[s.pill, s.pillKalender].join(' ')}><CalMiniIcon /> Kalender</span>
            )}
            {birthday.wichtig && (
              <span className={[s.pill, s.pillWichtig].join(' ')}><StarFillIcon size={9} /> {birthday.wichtigDays}d</span>
            )}
            {birthday.geschenk && (
              <span className={[s.pill, s.pillGeschenk].join(' ')}><GiftMiniIcon /> {birthday.geschenkDays}d</span>
            )}
          </div>
        )}
      </div>

      <span className={[s.badge, isToday ? s.badgeToday : isSoon ? s.badgeSoon : s.badgeDefault].join(' ')}>
        {isToday ? 'Heute!' : `in ${days}d`}
      </span>
    </button>
  )
}

// ─── TabGeburtstage ───────────────────────────────────────
export default function TabGeburtstage({ onBack }) {
  const { birthdays, setBirthdays, toolColors } = useAppStore()
  const toolColor = getToolColor('geburtstage', toolColors)
  const { showToast } = useToast()

  const [sort, setSort]   = useState(() => lv(SK.birthdaySort, 'next'))
  const [sheet, setSheet] = useState(null)

  // Migration bestehender Daten
  useEffect(() => {
    const migrated = birthdays.map(migrateBirthday)
    const changed  = migrated.some((m, i) => JSON.stringify(m) !== JSON.stringify(birthdays[i]))
    if (changed) setBirthdays(migrated)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveSort = (key) => {
    setSort(key)
    sv(SK.birthdaySort, key)
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

  const sorted  = sortBirthdays(birthdays, sort)
  const soon    = sorted.filter(b => daysUntilBirthday(b.date) <= 7)
  const rest    = sorted.filter(b => daysUntilBirthday(b.date) > 7)

  const byNext  = sortBirthdays(birthdays, 'next')
  const hero    = byNext[0] ?? null
  const sameDay = hero ? byNext.filter(b => b.id !== hero.id && b.date === hero.date) : []

  const monthNow   = new Date().getMonth() + 1
  const monthLabel = new Date().toLocaleDateString('de-DE', { month: 'long' })
  const inMonth    = birthdays.filter(b => Number(b.date.split('-')[0]) === monthNow).length

  const openEdit = (b) => setSheet(b)

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="geburtstage" size={20} />}
        eyebrow="Menschen"
        title={<>Geburts<em>tage</em></>}
        actions={
          <button className={s.addBtn} onClick={() => setSheet('new')} aria-label="Geburtstag hinzufügen">
            <PlusIcon />
          </button>
        }
      />

      {birthdays.length === 0 ? (
        <div className={s.emptyCard}>
          <span className={s.emptyTitle}>Noch keine Geburtstage</span>
          <p className={s.emptyText}>Sammle hier die Geburtstage deiner Leute — mit Kalender-Eintrag, Erinnerung vorab und Geschenk-Vorlauf, damit nichts mehr durchrutscht.</p>
          <button className={s.emptyCta} onClick={() => setSheet('new')}>+ Erster Geburtstag</button>
        </div>
      ) : (
        <>
          <Hero birthday={hero} sameDay={sameDay} onEdit={openEdit} />

          <div className={s.tiles}>
            <div className={s.tile}>
              <div className={s.tileIcon}><UsersIcon /></div>
              <div className={s.tileNum}>{birthdays.length}</div>
              <div className={s.tileLabel}>Personen</div>
            </div>
            <div className={[s.tile, s.tileHighlight].join(' ')}>
              <div className={s.tileIcon}><CalMiniIcon size={13} /></div>
              <div className={s.tileNum}>{inMonth}</div>
              <div className={s.tileLabel}>Im {monthLabel}</div>
            </div>
            <div className={s.tile}>
              <div className={s.tileIcon}><BellIcon /></div>
              <div className={s.tileNum}>{soon.length}</div>
              <div className={s.tileLabel}>In 7 Tagen</div>
            </div>
          </div>

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
            <section className={s.section}>
              <div className={s.sectionLabel}>Bald</div>
              {soon.map(b => <BirthdayCard key={b.id} birthday={b} onEdit={openEdit} />)}
            </section>
          )}

          {rest.length > 0 && (
            <section className={s.section}>
              <div className={s.sectionLabel}>Alle</div>
              {rest.map(b => <BirthdayCard key={b.id} birthday={b} onEdit={openEdit} />)}
            </section>
          )}
        </>
      )}

      {sheet !== null && (
        <BirthdaySheet
          birthday={sheet === 'new' ? null : sheet}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSheet(null)}
        />
      )}

    </div>
  )
}
