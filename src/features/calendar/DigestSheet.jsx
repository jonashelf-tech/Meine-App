import { Fragment, useMemo } from 'react'
import { useAppStore } from '../../store'
import Overlay from '../../components/Overlay/Overlay'
import { DAY_SHORT } from './TabKalender/kalenderShared'
import s from './DigestSheet.module.css'

// „Do 23.7." — gleiches Format wie WocheView (DAY_SHORT ist Mo-basiert,
// getDay() ist So-basiert → +6 % 7 dreht auf Mo-Index).
const formatDateLabel = (dk) => {
  const [y, m, d] = dk.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAY_SHORT[(date.getDay() + 6) % 7]} ${date.getDate()}.${date.getMonth() + 1}.`
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

// „vor N Min" (< 60 Min) · „vor N Std" (< 24 Std) · „gestern" · sonst „d.M."
const formatAgo = (at, now) => {
  const minutes = Math.floor((now - at) / 60000)
  if (minutes < 60) return `vor ${Math.max(minutes, 0)} Min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std`
  const days = Math.floor((startOfDay(new Date(now)) - startOfDay(new Date(at))) / 86400000)
  if (days === 1) return 'gestern'
  const d = new Date(at)
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

// Verb je Typ (teilen-spec.md §7). deleted hat bewusst keinen Titel mehr —
// getNotifications liefert für Tombstones title: null.
function RowText({ entry }) {
  const { who, title } = entry
  if (entry.type === 'deleted') return <><b>{who}</b> hat einen Termin gelöscht</>
  if (entry.type === 'changed') return <><b>{who}</b> hat „{title}“ geändert</>
  if (entry.type === 'done')    return <><b>{who}</b> hat „{title}“ erledigt <span className={s.done}>✓</span></>
  return <><b>{who}</b> hat „{title}“ eingetragen</>   // added | clash
}

function Row({ entry, emoji, now }) {
  const whenParts = []
  if (entry.date) whenParts.push(formatDateLabel(entry.date))
  if (entry.time) whenParts.push(entry.time)
  const when = whenParts.join(' ')
  const isClash = entry.type === 'clash'

  return (
    <div className={[s.nRow, isClash ? s.clash : ''].join(' ')}>
      <span className={s.em}>{emoji}</span>
      <div>
        <div className={s.tx}><RowText entry={entry} /></div>
        <div className={s.meta}>
          {when && `${when} · `}
          {isClash && (
            <>
              <span className={s.clashText}>überschneidet sich mit deinem „{entry.clashWith}“</span>
              {' · '}
            </>
          )}
          {formatAgo(entry.at, now)}
        </div>
      </div>
    </div>
  )
}

// Digest-Sheet (A10): entries ist ein Snapshot aus CalFilterChips (bleibt
// stabil, während das Sheet offen ist — calSeen wurde beim Öffnen schon
// quittiert). Gruppierung nach Kalender in calList-Reihenfolge.
export default function DigestSheet({ entries, onClose }) {
  const calList = useAppStore(st => st.calList)
  const now = Date.now()

  const groups = useMemo(() => {
    const byCal = {}
    for (const e of entries) {
      if (!byCal[e.calId]) byCal[e.calId] = []
      byCal[e.calId].push(e)
    }
    return Object.keys(calList)
      .filter(id => byCal[id]?.length)
      .map(id => ({ calId: id, cal: calList[id], items: byCal[id] }))
  }, [entries, calList])

  return (
    <Overlay variant="sheet" onClose={onClose}>
      <div className={s.sheet}>
        <div className={s.grab} />
        <div className={s.shTitle}>Das ist passiert</div>
        <div className={s.shSub}>seit deinem letzten Blick</div>

        <div className={s.shList}>
          {entries.length === 0 ? (
            <p className={s.empty}>Nichts Neues — alles gesehen ✓</p>
          ) : groups.map(g => (
            <Fragment key={g.calId}>
              <div className={s.grpHead}>
                <span className={s.em}>{g.cal?.emoji ?? '👥'}</span>{g.cal?.name || 'Kalender'}
              </div>
              {/* type gehört in den Key: nach Verschieben-und-zurück können Record
                  UND Tombstone desselben todoId gleichzeitig im Feed stehen */}
              {g.items.map(e => (
                <Row key={`${e.type}_${e.calId}_${e.todoId}`} entry={e} emoji={g.cal?.emoji ?? '👥'} now={now} />
              ))}
            </Fragment>
          ))}
        </div>

        <div className={s.shFoot}>
          <div className={s.shHint}>Öffnen zählt als gesehen — das Glimmen ist danach aus.</div>
          <button className={s.shBtn} onClick={onClose}>Fertig ✓</button>
        </div>
      </div>
    </Overlay>
  )
}
