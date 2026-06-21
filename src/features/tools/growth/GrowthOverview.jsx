// Ruhezustand des Tools: Tageszusammenfassung + frühere Tage.
// Ziel von „Fertig"/„Überspringen" und Re-Entry am selben Tag. Karten-Blöcke
// sind via TageskarteCard inline editierbar (≤3 Tage), kein erneuter Wizard.
import {
  dayHasEntry, isTageskarteOffen, drawBonusKarte, markStateTouched,
  setAntwort, MAX_KARTEN_PRO_TAG,
} from './growthStore'
import DailyStateRow from './DailyStateRow'
import TageskarteCard from './TageskarteCard'
import GrowthArchiv from './GrowthArchiv'
import s from './GrowthOverview.module.css'

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
)

export default function GrowthOverview({ data, persist, date, today, editable, onLosgehen, onOpenDay, onStartTimer, children }) {
  const day = data.days[date] ?? {}
  const hatEintrag = dayHasEntry(day)
  const istHeute = date === today
  const d = new Date(date + 'T00:00:00')
  const dateLabel = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  const karten = day.karten ?? []
  const tageskarte = karten.find(k => k.kartenId === day.tageskarteId)
  const bonus = karten.filter(k => k.kartenId !== day.tageskarteId)
  const sortierte = tageskarte ? [tageskarte, ...bonus] : bonus

  const kannBonus = editable && !isTageskarteOffen(data, date) && karten.length < MAX_KARTEN_PRO_TAG

  // Wirklich leer (kein Eintrag, keine Karte) → ruhiger Einstieg in den Fluss
  if (!hatEintrag && karten.length === 0) {
    return (
      <div className={s.overview}>
        <div className={s.header}><div className={s.date}>{dateLabel}</div></div>
        <div className={s.empty}>
          <p className={s.emptyText}>Heute noch nichts festgehalten.</p>
          {editable && istHeute && <button className={s.losBtn} onClick={onLosgehen}>Loslegen →</button>}
        </div>
        <GrowthArchiv data={data} today={today} onOpen={onOpenDay}>{children}</GrowthArchiv>
      </div>
    )
  }

  return (
    <div className={s.overview}>
      <div className={s.header}>
        <div>
          <div className={s.date}>{dateLabel}</div>
          {hatEintrag && <div className={s.affirm}>{istHeute ? 'Du warst heute da.' : 'Rückblick'}</div>}
        </div>
        {hatEintrag && <div className={s.check}><CheckIcon /></div>}
      </div>

      <div className={s.block}>
        <div className={s.blockLabel}>Check-in</div>
        <DailyStateRow date={date} editable={editable} onTouched={() => persist(markStateTouched(data, date))} />
      </div>

      {sortierte.map(eintrag => (
        <TageskarteCard
          key={eintrag.kartenId}
          eintrag={eintrag}
          date={date}
          editable={editable}
          istTageskarte={eintrag.kartenId === day.tageskarteId}
          skipMoeglich={false}
          onPatch={(p) => persist(setAntwort(data, date, eintrag.kartenId, p))}
          onStartTimer={onStartTimer}
        />
      ))}

      {kannBonus && (
        <button className={s.bonusBtn} onClick={() => persist(drawBonusKarte(data, date))}>+ Noch eine Karte ziehen?</button>
      )}

      <GrowthArchiv data={data} today={today} onOpen={onOpenDay}>{children}</GrowthArchiv>
    </div>
  )
}
