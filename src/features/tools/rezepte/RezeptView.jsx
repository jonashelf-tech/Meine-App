import { istBasis } from './mealprepModel'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import { IconClose, IconEdit, IconSliders, IconClock, IconSnow } from './icons'
import s from './RezeptView.module.css'

// Read-Only-Ansicht eines Rezepts — zum Nachschauen und Kochen.
// Bearbeiten ist bewusst ein eigener Schritt (Stift), damit man beim
// Lesen nichts versehentlich verstellt.
export default function RezeptView({ rezept, zById, rById, onEdit, onOpenKonfigurator, onClose }) {
  const np    = rezeptProPortion(rezept, zById, rById)
  const basis = istBasis(rezept)

  return (
    <div className={s.modal}>
      <div className={s.header}>
        <span className={s.title}>Rezept</span>
        <div className={s.headerBtns}>
          <button className={s.iconBtn} title="Bearbeiten" onClick={() => onEdit(rezept)}>
            <IconEdit size={16} />
          </button>
          <button className={s.iconBtn} title="Schließen" onClick={onClose}>
            <IconClose size={17} />
          </button>
        </div>
      </div>

      <div className={s.body}>
        <h2 className={s.name}>{rezept.name}</h2>

        <div className={s.metaRow}>
          {!basis && <span className={s.metaChip}>{rezept.basisPortionen} Portionen</span>}
          {basis && <span className={s.metaChip}>ergibt {rezept.ergibtMenge} {rezept.ergibtEinheit}</span>}
          {rezept.kochdauer != null && (
            <span className={s.metaChip}><IconClock size={12} /> {rezept.kochdauer} min</span>
          )}
          {rezept.aufbewahrung?.tk && (
            <span className={s.metaChip}><IconSnow size={12} /> TK</span>
          )}
        </div>

        <div className={s.naehrwertBox}>
          <span className={s.boxLabel}>Nährwerte / Portion</span>
          <Naehrwert n={np} />
        </div>

        {(rezept.zutaten?.length > 0 || rezept.komponenten?.length > 0) && (
          <div className={s.section}>
            <span className={s.boxLabel}>Zutaten</span>
            {(rezept.komponenten ?? []).map(({ rezeptId, menge }) => {
              const b = rById(rezeptId)
              return (
                <div key={rezeptId} className={s.zutatRow}>
                  <span className={s.zutatName}>{b?.name ?? rezeptId}</span>
                  <span className={s.zutatMenge}>{menge} {b?.ergibtEinheit ?? 'g'}</span>
                </div>
              )
            })}
            {(rezept.zutaten ?? []).map(({ zutatId, menge }) => {
              const z = zById(zutatId)
              return (
                <div key={zutatId} className={s.zutatRow}>
                  <span className={s.zutatName}>{z?.name ?? zutatId}</span>
                  <span className={s.zutatMenge}>{menge} {z?.einheit ?? 'g'}</span>
                </div>
              )
            })}
          </div>
        )}

        {rezept.anleitung && (
          <div className={s.section}>
            <span className={s.boxLabel}>Zubereitung</span>
            <div className={s.anleitung}>{rezept.anleitung}</div>
          </div>
        )}

        {rezept.konfigurierbar && (
          <button className={s.konfBtn} onClick={() => onOpenKonfigurator(rezept)}>
            <IconSliders size={15} /> Im Konfigurator öffnen
          </button>
        )}
      </div>
    </div>
  )
}
