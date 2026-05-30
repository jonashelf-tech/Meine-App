import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import s from './TabPizza.module.css'

const REF_TOTAL = 1986.5
const RATIOS = {
  vorteig:   { mehl: 225/REF_TOTAL, wasser: 225/REF_TOTAL, hefe: 4/REF_TOTAL,  honig: 7.5/REF_TOTAL },
  hauptteig: { mehl: 950/REF_TOTAL, wasser: 525/REF_TOTAL, oel:  20/REF_TOTAL, salz:  30/REF_TOTAL  },
}

const round5  = v => Math.round(v / 5) * 5
const fmtP    = v => v < 10 ? v.toFixed(1).replace('.', ',') : Math.round(v).toString()
const DEFAULT_TEIG = round5(REF_TOTAL / 6)
const pad2    = n => String(n).padStart(2, '0')

const minusMins = (hhmm, minutes) => {
  const [h, m] = hhmm.split(':').map(Number)
  let total = h * 60 + m - minutes
  while (total < 0) total += 24 * 60
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

export default function TabPizza({ onBack }) {
  const { toolColors } = useAppStore()
  const toolColor = getToolColor('pizza', toolColors)
  const [pizzenStr, setPizzenStr] = useState('6')
  const [teigStr,   setTeigStr]   = useState(String(DEFAULT_TEIG))
  const [essenszeit, setEssenszeit] = useState('18:00')
  const [checked,   setChecked]   = useState({})

  const pizzen        = Math.max(1, parseInt(pizzenStr)  || 6)
  const teigProPizza  = Math.max(50, parseInt(teigStr)   || DEFAULT_TEIG)
  const gesamtteig    = pizzen * teigProPizza

  const mengen = useMemo(() => {
    const v = RATIOS.vorteig
    const h = RATIOS.hauptteig
    return {
      vorteig: {
        mehl:   round5(gesamtteig * v.mehl),
        wasser: round5(gesamtteig * v.wasser),
        hefe:   fmtP(gesamtteig  * v.hefe),
        honig:  round5(gesamtteig * v.honig),
      },
      hauptteig: {
        mehl:   round5(gesamtteig * h.mehl),
        wasser: round5(gesamtteig * h.wasser),
        oel:    round5(gesamtteig * h.oel),
        salz:   fmtP(gesamtteig  * h.salz),
      },
    }
  }, [gesamtteig])

  const plan = useMemo(() => [
    { id: 'vorteig', time: 'Vortag',                   title: 'Vorteig ansetzen' },
    { id: 'mix',     time: minusMins(essenszeit, 210),  title: 'Teig mixen · 15 min ruhen' },
    { id: 'gross',   time: minusMins(essenszeit, 180),  title: 'Großer Ballen · 1 h ruhen' },
    { id: 'klein',   time: minusMins(essenszeit, 120),  title: `${pizzen} Ballen formen · min. 2 h ruhen` },
    { id: 'essen',   time: essenszeit,                  title: 'Essen 🍕', isEnd: true },
  ], [essenszeit, pizzen])

  const toggle = id => setChecked(c => ({ ...c, [id]: !c[id] }))
  const reset  = () => {
    setPizzenStr('6')
    setTeigStr(String(DEFAULT_TEIG))
    setEssenszeit('18:00')
    setChecked({})
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>

      <ToolHeader
        onBack={onBack}
        icon={<ToolIcon id="pizza" size={20} />}
        eyebrow="Impasto Napoletano"
        title={<>Pizza<em>rechner</em></>}
        actions={<button className={s.resetBtn} onClick={reset}>↺</button>}
      />

      {/* Inputs */}
      <div className={s.inputs}>
        <div className={s.inputBox}>
          <label className={s.inputLabel}>Pizzen</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={pizzenStr}
            onChange={e => setPizzenStr(e.target.value)}
          />
        </div>
        <div className={s.inputBox}>
          <label className={s.inputLabel}>Teig/Pizza (g)</label>
          <input
            type="number"
            inputMode="numeric"
            step="5"
            min="50"
            value={teigStr}
            onChange={e => setTeigStr(e.target.value)}
          />
        </div>
        <div className={s.inputBox}>
          <label className={s.inputLabel}>Essen um</label>
          <input
            type="time"
            value={essenszeit}
            onChange={e => setEssenszeit(e.target.value)}
          />
        </div>
      </div>

      {/* Total */}
      <div className={s.total}>
        Gesamt <span className={s.totalVal}>{gesamtteig} g</span>
      </div>

      {/* Zutaten */}
      <div className={s.secLabel}>Zutaten</div>
      <div className={s.zutaten}>

        {/* Vorteig */}
        <div className={s.col}>
          <div className={s.colHead}>
            <span>Vorteig</span>
            <span className={s.colSub}>16–24 h vorher</span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>Mehl</span>
            <span>
              <span className={s.rowVal}>{mengen.vorteig.mehl}</span>
              <span className={s.rowUnit}>g</span>
            </span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>Wasser</span>
            <span>
              <span className={s.rowVal}>{mengen.vorteig.wasser}</span>
              <span className={s.rowUnit}>g</span>
            </span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>Hefe</span>
            <span>
              <span className={s.rowVal}>{mengen.vorteig.hefe}</span>
              <span className={s.rowUnit}>g</span>
            </span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>Honig</span>
            <span>
              <span className={s.rowVal}>{mengen.vorteig.honig}</span>
              <span className={s.rowUnit}>g</span>
            </span>
          </div>
        </div>

        {/* Hauptteig */}
        <div className={s.col}>
          <div className={s.colHead}>
            <span>Hauptteig</span>
            <span className={s.colSub}>am Tag</span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>Mehl</span>
            <span>
              <span className={s.rowVal}>{mengen.hauptteig.mehl}</span>
              <span className={s.rowUnit}>g</span>
            </span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>Wasser</span>
            <span>
              <span className={s.rowVal}>{mengen.hauptteig.wasser}</span>
              <span className={s.rowUnit}>g</span>
            </span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>Olivenöl</span>
            <span>
              <span className={s.rowVal}>{mengen.hauptteig.oel}</span>
              <span className={s.rowUnit}>g</span>
            </span>
          </div>
          <div className={s.row}>
            <span className={s.rowLabel}>Salz</span>
            <span>
              <span className={s.rowVal}>{mengen.hauptteig.salz}</span>
              <span className={s.rowUnit}>g</span>
            </span>
          </div>
        </div>

      </div>

      {/* Zeitplan */}
      <div className={s.secLabel}>Zeitplan</div>
      <div className={s.plan}>
        {plan.map(step => (
          <div
            key={step.id}
            className={[
              s.step,
              step.isEnd  ? s.stepEnd  : '',
              checked[step.id] ? s.stepDone : '',
            ].filter(Boolean).join(' ')}
            onClick={() => !step.isEnd && toggle(step.id)}
          >
            <span className={s.stepTime}>{step.time}</span>
            <span className={s.stepTitle}>{step.title}</span>
            {!step.isEnd && (
              <span className={s.stepCheck}>{checked[step.id] ? '✓' : ''}</span>
            )}
          </div>
        ))}
      </div>

      <div className={s.hint}>Schritte antippen zum Abhaken</div>

    </div>
  )
}
