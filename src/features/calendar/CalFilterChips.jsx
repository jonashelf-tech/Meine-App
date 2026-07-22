import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'
import { lv, SK } from '../../storage'
import { getNotifications } from '../cal/notifications'
import DigestSheet from './DigestSheet'
import s from './CalFilterChips.module.css'

// Globale Kalender-Filter-Leiste (teilen-spec.md §8.1): dieselben Emoji-Chips
// steuern ALLE Ansichten (Woche/Monat/DayPanel/Tagesplaner) über EINEN
// calFilter-Zustand. Kennung ist das frei gewählte Emoji (keine Kalenderfarbe);
// „an" = normaler Chip, „aus" = gedimmt (ausgeblendet, nicht gelöscht).
// Rendert nur, wenn es mindestens einen Kalender gibt.
//
// Signal-Feld rechts (A10): öffnet den Neuigkeiten-Digest. calTombstones kommt
// bewusst per lv (nicht reaktiv) — ändert sich praktisch immer zusammen mit
// todos, ein eigener Store-Slice dafür wäre Overhead ohne Nutzen.
export default function CalFilterChips() {
  const calList      = useAppStore(st => st.calList)
  const calFilter    = useAppStore(st => st.calFilter)
  const setCalFilter = useAppStore(st => st.setCalFilter)
  const todos        = useAppStore(st => st.todos)
  const calCreds     = useAppStore(st => st.calCreds)
  const calSeen      = useAppStore(st => st.calSeen)
  const setCalSeen   = useAppStore(st => st.setCalSeen)
  const days         = useAppStore(st => st.days)

  const [digestEntries, setDigestEntries] = useState(null)

  const entries = useMemo(
    () => getNotifications({
      todos, calTombstones: lv(SK.calTombstones, {}), calList, calCreds, calFilter, calSeen, days,
    }),
    [todos, calList, calCreds, calFilter, calSeen, days]
  )

  const calIds = Object.keys(calList)
  if (calIds.length === 0) return null

  const privatOn = calFilter?.privat !== false
  const isOn = (id) => calFilter?.cals?.[id]?.show !== false
  // Verlassene, aber lokal noch sichtbare Kalender: in calList, aber ohne Creds
  // (leaveCal entfernt nur die Creds). Ihre Einträge bleiben read-only (§8.3) —
  // ein dezenter „Kopplung getrennt"-Hinweis erklärt, warum sie noch da sind.
  const orphanIds = calIds.filter(id => !calCreds[id])

  const togglePrivat = () =>
    setCalFilter(f => ({ ...f, privat: !(f?.privat !== false) }))
  const toggleCal = (id) =>
    setCalFilter(f => ({
      ...f,
      cals: { ...(f?.cals || {}), [id]: { ...(f?.cals?.[id]), show: !isOn(id) } },
    }))

  // Snapshot fürs offene Sheet (bleibt stabil, auch wenn calSeen sich sofort
  // ändert) + globales Quittieren in einem Tap — ein Blick quittiert alles.
  const openDigest = () => {
    setDigestEntries(entries)
    const ts = Date.now()
    setCalSeen(Object.fromEntries(calIds.map(id => [id, ts])))
  }

  return (
    <>
      <div className={s.row} role="group" aria-label="Kalender-Filter">
        <button
          type="button"
          className={[s.chip, privatOn ? '' : s.off].join(' ')}
          onClick={togglePrivat}
          aria-pressed={privatOn}
        >
          <span className={s.em}>🔒</span>Privat
        </button>
        {calIds.map(id => {
          const cal = calList[id] ?? {}
          const on  = isOn(id)
          return (
            <button
              key={id}
              type="button"
              className={[s.chip, on ? '' : s.off].join(' ')}
              onClick={() => toggleCal(id)}
              aria-pressed={on}
            >
              <span className={s.em}>{cal.emoji ?? '👥'}</span>
              {cal.name || 'Kalender'}
            </button>
          )
        })}
        <button
          type="button"
          className={[s.sig, entries.length > 0 ? s.sigNew : ''].join(' ')}
          onClick={openDigest}
          aria-label="Neuigkeiten"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M12 2.6 L14.1 9.9 L21.4 12 L14.1 14.1 L12 21.4 L9.9 14.1 L2.6 12 L9.9 9.9 Z" />
          </svg>
          {entries.length > 0 && <span className={s.sigCount}>{entries.length}</span>}
        </button>
      </div>
      {orphanIds.length > 0 && (
        <div className={s.orphan} role="note">
          {orphanIds.map(id => (
            <span key={id} className={s.orphanItem}>
              <span className={s.em}>{calList[id]?.emoji ?? '👥'}</span>
              {calList[id]?.name || 'Kalender'} · Kopplung getrennt — nur lesbar
            </span>
          ))}
        </div>
      )}
      {digestEntries && <DigestSheet entries={digestEntries} onClose={() => setDigestEntries(null)} />}
    </>
  )
}
