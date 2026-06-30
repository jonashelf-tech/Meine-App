import { istBasis } from './mealprepModel'
import { IconBook, IconLayers, IconCarrot, IconSliders, IconBasket, IconChevron, IconArrowRight } from './icons'
import s from './MealprepHome.module.css'

// Startseite des Mealprep-Tools (Home-first). Hero-CTA + Bibliothek-Liste + Mehr.
export default function MealprepHome({
  korb, rezepte, zutaten, toolColor,
  onStartDurchgang, onOpenRezepte, onOpenKetten, onOpenZutaten, onOpenKonfig,
}) {
  const korbCount   = korb?.eintraege?.length ?? 0
  const rezeptCount = rezepte?.length ?? 0
  const kettenCount = rezepte?.filter(istBasis).length ?? 0
  const zutatCount  = zutaten?.length ?? 0

  const biblio = [
    { key: 'rezepte', label: 'Rezepte', Icon: IconBook,   count: rezeptCount, onClick: onOpenRezepte },
    { key: 'ketten',  label: 'Ketten',  Icon: IconLayers, count: kettenCount, onClick: onOpenKetten },
    { key: 'zutaten', label: 'Zutaten', Icon: IconCarrot, count: zutatCount,  onClick: onOpenZutaten },
  ]

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
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
      <button className={[s.row, s.rowQuiet].join(' ')} onClick={onOpenKonfig}>
        <span className={s.rowLeft}>
          <span className={s.rowIcon}><IconSliders size={17} /></span>Konfigurator
        </span>
        <span className={s.chev}><IconChevron size={15} /></span>
      </button>
    </div>
  )
}
