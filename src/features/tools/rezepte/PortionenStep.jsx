import { useMemo } from 'react'
import { portionenSplit, istFrisch } from './mealprepModel'
import { basenBatches } from './kochanleitung'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import { IconArrowLeft, IconArrowRight, IconPlus, IconMinus, IconSnow, IconClose } from './icons'
import s from './PortionenStep.module.css'

const BLOCK_G = 250
const STEPS = ['Gerichte', 'Portionen', 'Einkauf', 'Kochen']

function Stepper({ value, onDec, onInc }) {
  return (
    <span className={s.stepper}>
      <button className={s.stepBtn} onClick={onDec} aria-label="weniger"><IconMinus size={14} /></button>
      <span className={`${s.stepVal} ${value > 0 ? s.stepValOn : ''}`}>{value}</span>
      <button className={`${s.stepBtn} ${s.stepBtnPlus}`} onClick={onInc} aria-label="mehr"><IconPlus size={14} /></button>
    </span>
  )
}

// ② Portionen: pro Korb-Gericht frisch + TK-Blöcke (in Portionen). Schreibt {ref, frisch, bloecke}.
// hideChrome=true: überspringt eigene Kopfzeile + Fortschrittsbalken (Wizard-Chrome übernimmt).
export default function PortionenStep({ korb, setKorb, zById, rById, toolColor, onBack, onWeiter, hideChrome }) {
  const resolveRezept = (ref) => typeof ref === 'string' ? rById(ref) : ref

  const items = useMemo(() =>
    korb.eintraege
      .map((e, idx) => ({ idx, r: resolveRezept(e.ref), split: portionenSplit(e) }))
      .filter(it => it.r),
    [korb.eintraege, rById] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const totalPortionen = items.reduce((a, it) => a + it.split.total, 0)
  const totalBloecke   = items.reduce((a, it) => a + it.split.bloecke, 0)

  // Ketten-Basen: wie oft muss z. B. die Tomatensoße gekocht werden?
  const vorkochen = useMemo(
    () => basenBatches(items.map(it => ({ rezept: it.r, frisch: it.split.frisch, bloecke: it.split.bloecke })), zById, rById),
    [items] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const setSplit = (idx, frisch, bloecke) => {
    setKorb(k => ({
      ...k,
      eintraege: k.eintraege.map((e, i) => i === idx
        ? { ref: e.ref, frisch: Math.max(0, frisch), bloecke: Math.max(0, bloecke) }
        : e),
    }))
  }
  const removeItem = (idx) =>
    setKorb(k => ({ ...k, eintraege: k.eintraege.filter((_, i) => i !== idx) }))

  const freshNames = (r) => [
    ...(r.zutaten ?? []).filter(z => istFrisch(z, zById)).map(z => zById(z.zutatId)?.name),
    ...(r.komponenten ?? []).filter(c => istFrisch(c, zById)).map(c => rById(c.rezeptId)?.name),
  ].filter(Boolean)

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      {!hideChrome && (
        <div className={s.head}>
          <button className={s.back} onClick={onBack} aria-label="Zurück"><IconArrowLeft size={18} /></button>
          <span className={s.headTitle}>Durchgang</span>
          <span className={s.headStep}>2 / 4</span>
        </div>
      )}
      {!hideChrome && (
        <div className={s.steps}>
          {STEPS.map((lbl, i) => (
            <div key={lbl} className={s.step}>
              <div className={`${s.stepBar} ${i === 1 ? s.stepBarOn : i < 1 ? s.stepBarDone : ''}`} />
              <div className={`${s.stepLbl} ${i === 1 ? s.stepLblOn : ''}`}>{lbl}</div>
            </div>
          ))}
        </div>
      )}

      <div className={s.title}>Wie viel kochst du?</div>

      {items.length === 0 ? (
        <div className={s.empty}>
          Noch nichts gewählt. Geh zurück und such dir in <b>Rezepte</b> oder <b>Ketten</b> Gerichte aus.
        </div>
      ) : (
        <div className={s.list}>
          {items.map(({ idx, r, split }) => {
            const np = rezeptProPortion(r, zById, rById)
            const fresh = freshNames(r)
            return (
              <div key={idx} className={s.card}>
                <div className={s.cardTop}>
                  <span className={s.name}>{r.name}</span>
                  <button className={s.remove} onClick={() => removeItem(idx)} aria-label="entfernen"><IconClose size={14} /></button>
                </div>
                <Naehrwert n={np} className={s.nw} />

                <div className={s.stepperRow}>
                  <span className={s.lbl}><span className={s.dotFresh} /> Frisch</span>
                  <Stepper value={split.frisch}
                    onDec={() => setSplit(idx, split.frisch - 1, split.bloecke)}
                    onInc={() => setSplit(idx, split.frisch + 1, split.bloecke)} />
                </div>
                <div className={s.stepperRow}>
                  <span className={s.lbl}><span className={s.snow}><IconSnow size={13} /></span> TK-Blöcke</span>
                  <Stepper value={split.bloecke}
                    onDec={() => setSplit(idx, split.frisch, split.bloecke - 1)}
                    onInc={() => setSplit(idx, split.frisch, split.bloecke + 1)} />
                </div>

                {fresh.length > 0 && (
                  <div className={s.hint}>{fresh.join(', ')} frisch · Rest friert ein</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {vorkochen.length > 0 && (
        <div className={s.vorkochen}>
          <span className={s.vorkochenLbl}>Basen vorkochen</span>
          <div className={s.vorkochenChips}>
            {vorkochen.map(b => (
              <span key={b.id} className={s.vorkochenChip}>{b.name} <b>{b.batches}×</b></span>
            ))}
          </div>
        </div>
      )}

      <div className={s.summary}>
        <div className={s.sumLeft}>
          <div className={s.sumNum}>{totalPortionen} {totalPortionen === 1 ? 'Portion' : 'Portionen'}</div>
          <div className={s.sumSub}>{totalBloecke} × {BLOCK_G} g Block</div>
        </div>
        {!hideChrome && (
          <button className={s.weiter} onClick={onWeiter} disabled={totalPortionen === 0}>
            Weiter <IconArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
