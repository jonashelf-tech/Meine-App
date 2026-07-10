// Ruhezustand des Tools: Hero (Tageszustand) + Kacheln + Tagesblöcke + frühere Tage.
// Ziel von „Fertig"/„Überspringen" und Re-Entry am selben Tag. Karten-Blöcke
// sind via TageskarteCard inline editierbar (≤3 Tage), kein erneuter Wizard.
import {
  dayHasEntry, isTageskarteOffen, drawBonusKarte, markStateTouched,
  setAntwort, setFreitext, MAX_KARTEN_PRO_TAG,
  getDoneDates, growthStreak, doneThisWeek,
} from './growthStore'
import { useAutosave } from './useAutosave'
import DailyStateRow from './DailyStateRow'
import TageskarteCard from './TageskarteCard'
import GrowthArchiv from './GrowthArchiv'
import s from './GrowthOverview.module.css'

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
)
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4" /></svg>
)
const BookIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
)
const BoltIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
)
const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
)

// ─── Hero: Tageszustand ───────────────────────────────────
function Hero({ dateLabel, istHeute, hatEintrag, showCta, onLosgehen }) {
  const title = hatEintrag
    ? (istHeute ? 'Du warst heute da.' : 'Rückblick')
    : (istHeute ? 'Noch nichts festgehalten' : 'Kein Eintrag')

  return (
    <div className={s.hero}>
      <div className={s.heroTop}>
        <div className={s.heroInfo}>
          <div className={s.heroKick}><span className={s.heroDot} /> {dateLabel}</div>
          <div className={s.heroTitle}>{title}</div>
          {!hatEintrag && istHeute && (
            <div className={s.heroMeta}>Karte, Check-in, ein Satz — mehr braucht es nicht.</div>
          )}
        </div>
        {hatEintrag && <div className={s.heroBurst}><CheckIcon /></div>}
      </div>
      {showCta && (
        <button className={s.cta} onClick={onLosgehen}><PlayIcon /> Loslegen</button>
      )}
    </div>
  )
}

// ─── 3 Kacheln ────────────────────────────────────────────
function StatTiles({ data, today }) {
  const total  = getDoneDates(data).length
  const streak = growthStreak(data, today)
  const week   = doneThisWeek(data, today)

  return (
    <div className={s.tiles}>
      <div className={s.tile}>
        <div className={s.tileIcon}><BookIcon /></div>
        <div className={s.tileNum}>{total}</div>
        <div className={s.tileLabel}>Tage insgesamt</div>
      </div>
      <div className={[s.tile, s.tileHighlight].join(' ')}>
        <div className={s.tileIcon}><BoltIcon /></div>
        <div className={s.tileNum}>{streak}</div>
        <div className={s.tileLabel}>Tage Serie</div>
      </div>
      <div className={s.tile}>
        <div className={s.tileIcon}><CalIcon /></div>
        <div className={s.tileNum}>{week}<small>/7</small></div>
        <div className={s.tileLabel}>Diese Woche</div>
      </div>
    </div>
  )
}

export default function GrowthOverview({ data, persist, date, today, editable, autoOpenKartenId, onLosgehen, onOpenDay, onStartTimer, children }) {
  const day = data.days[date] ?? {}
  const [freitext, onFreitext] = useAutosave(day.freitext ?? '', (t) => persist(setFreitext(data, date, t)), [date])
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
  const istLeer = !hatEintrag && karten.length === 0

  return (
    <div className={s.overview}>
      <Hero
        dateLabel={dateLabel}
        istHeute={istHeute}
        hatEintrag={hatEintrag}
        showCta={istLeer && editable && istHeute}
        onLosgehen={onLosgehen}
      />

      {istHeute && <StatTiles data={data} today={today} />}

      {!istLeer && (
        <>
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
              autoOpen={eintrag.kartenId === autoOpenKartenId}
              onPatch={(p) => persist(setAntwort(data, date, eintrag.kartenId, p))}
              onStartTimer={onStartTimer}
            />
          ))}

          {(editable || (day.freitext ?? '').trim()) && (
            <div className={s.block}>
              <div className={s.blockLabel}>Notiz</div>
              {editable
                ? <textarea className={s.freitext} value={freitext} onChange={e => onFreitext(e.target.value)} placeholder="Ein Satz reicht." rows={2} />
                : <div className={s.freitextRead}>{day.freitext}</div>}
            </div>
          )}

          {kannBonus && (
            <button className={s.bonusBtn} onClick={() => persist(drawBonusKarte(data, date))}>+ Noch eine Karte ziehen?</button>
          )}
        </>
      )}

      <GrowthArchiv data={data} today={today} onOpen={onOpenDay}>{children}</GrowthArchiv>
    </div>
  )
}
