import { istBasis } from './mealprepModel'
import { IconBook, IconLayers, IconCarrot, IconSliders, IconBasket, IconChevron, IconArrowRight, IconSnow, IconPlus, IconMinus, IconClose } from './icons'
import s from './MealprepHome.module.css'

// Startseite des Mealprep-Tools (Home-first). Erst-Briefing + Hero-CTA + Froster-Stand + Bibliothek + Mehr.
export default function MealprepHome({
  korb, rezepte, zutaten, toolColor, froster, onAdjustFroster,
  briefing, onCloseBriefing, onOpenBriefing,
  onStartDurchgang, onOpenRezepte, onOpenKetten, onOpenZutaten, onOpenKonfig,
}) {
  const korbCount   = korb?.eintraege?.length ?? 0
  const rezeptCount = rezepte?.length ?? 0
  const kettenCount = rezepte?.filter(istBasis).length ?? 0
  const zutatCount  = zutaten?.length ?? 0

  const frosterList = Object.entries(froster ?? {})
    .map(([id, count]) => ({ id, count, name: rezepte?.find(r => r.id === id)?.name ?? id }))
    .filter(x => x.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
  const frosterBloecke = frosterList.reduce((a, x) => a + x.count, 0)

  const biblio = [
    { key: 'rezepte', label: 'Rezepte', Icon: IconBook,   count: rezeptCount, onClick: onOpenRezepte },
    { key: 'ketten',  label: 'Ketten',  Icon: IconLayers, count: kettenCount, onClick: onOpenKetten },
    { key: 'zutaten', label: 'Zutaten', Icon: IconCarrot, count: zutatCount,  onClick: onOpenZutaten },
  ]

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      {briefing && (
        <div className={s.briefing}>
          <button className={s.briefClose} onClick={onCloseBriefing} aria-label="schließen"><IconClose size={15} /></button>
          <div className={s.briefKicker}><span className={s.kdot} /> So läuft ein Durchgang</div>
          <div className={s.briefTitle}>Einmal planen, wochenlang essen</div>
          <ul className={s.briefList}>
            <li><b>Portionen statt Rezepte:</b> sag pro Gericht, wie viele du frisch isst und wie viele als 250-g-Blöcke in den Froster wandern.</li>
            <li><b>Frisches bleibt frisch:</b> Beilagen wie Nudeln werden nur für die frischen Portionen gekocht — die TK-Blöcke kommen ohne.</li>
            <li><b>Geführt in 4 Schritten:</b> Auswählen → Portionen → Einkauf → Kochen &amp; Einblocken.</li>
          </ul>
          <button className={s.briefCta} onClick={onCloseBriefing}>Los geht’s <IconArrowRight size={16} /></button>
        </div>
      )}

      <div className={s.hero}>
        <div className={s.accent} />
        <div className={s.kicker}><span className={s.kdot} /> Mealprep-Durchgang</div>
        <div className={s.heroTitle}>Jetzt kochen</div>
        <div className={s.heroMeta}>Auswahl → Einkauf → Kochen</div>
        <button className={s.cta} onClick={onStartDurchgang}>
          {korbCount > 0 ? 'Durchgang fortsetzen' : 'Durchgang starten'}
          <IconArrowRight size={18} />
        </button>
        {korbCount > 0 && (
          <div className={s.korbHint}>
            <IconBasket size={13} /> {korbCount} {korbCount === 1 ? 'Gericht' : 'Gerichte'} im Korb
          </div>
        )}
      </div>

      {frosterList.length > 0 && (
        <>
          <div className={`${s.label} ${s.labelRow}`}>
            <span className={s.frostLbl}><IconSnow size={13} /> Im Froster</span>
            <span className={s.frostTotal}>{frosterBloecke} {frosterBloecke === 1 ? 'Block' : 'Blöcke'}</span>
          </div>
          <div className={s.list}>
            {frosterList.map(({ id, name, count }) => (
              <div key={id} className={s.frostRow}>
                <span className={s.frostName}>{name}</span>
                <span className={s.stepper}>
                  <button className={s.stepBtn} onClick={() => onAdjustFroster(id, -1)} aria-label="einen essen">
                    <IconMinus size={13} />
                  </button>
                  <span className={s.frostCount}>{count}</span>
                  <button className={s.stepBtn} onClick={() => onAdjustFroster(id, +1)} aria-label="einen dazu">
                    <IconPlus size={13} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={s.label}>Bibliothek</div>
      <div className={s.list}>
        {biblio.map(({ key, label, Icon, count, onClick }) => (
          <button key={key} className={s.row} onClick={onClick}>
            <span className={s.rowLeft}>
              <span className={s.rowIcon}><Icon size={18} /></span>{label}
            </span>
            <span className={s.rowRight}>
              <span className={s.count}>{count}</span>
              <span className={s.chev}><IconChevron size={15} /></span>
            </span>
          </button>
        ))}
      </div>

      <div className={s.label}>Mehr</div>
      <div className={s.list}>
        <button className={[s.row, s.rowQuiet].join(' ')} onClick={onOpenKonfig}>
          <span className={s.rowLeft}>
            <span className={s.rowIcon}><IconSliders size={17} /></span>Konfigurator
          </span>
          <span className={s.chev}><IconChevron size={15} /></span>
        </button>
        <button className={[s.row, s.rowQuiet].join(' ')} onClick={onOpenBriefing}>
          <span className={s.rowLeft}>
            <span className={s.rowIcon}><IconBook size={17} /></span>So funktioniert’s
          </span>
          <span className={s.chev}><IconChevron size={15} /></span>
        </button>
      </div>
    </div>
  )
}
