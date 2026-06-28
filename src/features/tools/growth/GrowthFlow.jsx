// Geführter Fluss: Ankommen → Karte → (Bonus?) → Freitext → Abschluss.
// Kleine State-Machine über dem FlowStepper (Tiefe-Übergang). Bonus wird zur
// Laufzeit eingeschoben. „Überspringen"/„Fertig" → Abschluss → onFinished.
import { useState, useEffect } from 'react'
import FlowStepper from './FlowStepper'
import StepAnkommen from './StepAnkommen'
import StepKarte from './StepKarte'
import StepBonusFrage from './StepBonusFrage'
import StepFreitext from './StepFreitext'
import StepAbschluss from './StepAbschluss'
import { flowSteps } from './growthFlowLogic'
import {
  ensureDayCard, openerForDate, setAntwort, setFreitext, markStateTouched,
  skipKarte, drawBonusKarte, isEditable, MAX_KARTEN_PRO_TAG,
} from './growthStore'
import s from './GrowthFlow.module.css'

export default function GrowthFlow({ data, persist, date, today, onFinished, onStartTimer }) {
  // Tageskarte einmalig sicherstellen
  useEffect(() => { persist(ensureDayCard(data, date))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const day = data.days[date] ?? {}
  const editable = isEditable(date, today)
  const base = flowSteps(data, date)            // z.B. ['ankommen','karte','freitext']
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState('forward')
  const [bonusOffen, setBonusOffen] = useState(false)     // Bonus-Frage statt Freitext zeigen
  const [bonusKartenId, setBonusKartenId] = useState(null) // aktuell gezogene Bonuskarte
  const [finishing, setFinishing] = useState(false)

  const go = (next) => { setDir(next >= idx ? 'forward' : 'back'); setIdx(next) }
  const finish = () => { setDir('forward'); setFinishing(true) }  // Fertig: Abschluss-Animation
  const skip = () => onFinished()                                  // Überspringen: direkt zur Übersicht

  if (finishing) {
    return <div className={s.flow}><StepAbschluss onDone={onFinished} /></div>
  }

  const stepName = base[idx]

  const renderStep = () => {
    if (bonusKartenId) {
      const eintrag = day.karten?.find(k => k.kartenId === bonusKartenId)
      if (!eintrag) return null
      return (
        <StepKarte key={'bonus-' + bonusKartenId} eintrag={eintrag} date={date} editable={editable}
          istTageskarte={false} skipMoeglich={false}
          onPatch={(p) => persist(setAntwort(data, date, bonusKartenId, p))}
          onStartTimer={onStartTimer}
          onSkip={skip}
          onWeiter={() => {
            setBonusKartenId(null)
            if ((day.karten?.length ?? 0) >= MAX_KARTEN_PRO_TAG) go(idx + 1) // 3 Karten → direkt letzter Screen
            else setBonusOffen(true)
          }} />
      )
    }
    if (bonusOffen) {
      const canDraw = (day.karten?.length ?? 0) < MAX_KARTEN_PRO_TAG
      return (
        <StepBonusFrage key="bonus-frage" canDraw={canDraw}
          onJa={() => {
            const next = drawBonusKarte(data, date); persist(next)
            const neu = next.days[date].karten.at(-1)?.kartenId
            setBonusOffen(false); setBonusKartenId(neu ?? null)
          }}
          onNein={() => { setBonusOffen(false); go(idx + 1) }} />
      )
    }
    if (stepName === 'ankommen') {
      return (
        <StepAnkommen key="ankommen" date={date} settings={data.settings} opener={openerForDate(date)}
          onStateTouched={() => persist(markStateTouched(data, date))}
          onWeiter={() => go(idx + 1)} />
      )
    }
    if (stepName === 'karte') {
      const eintrag = day.karten?.find(k => k.kartenId === day.tageskarteId)
      if (!eintrag) return null
      return (
        <StepKarte key="karte" eintrag={eintrag} date={date} editable={editable}
          istTageskarte
          skipMoeglich={editable && !day.skipVerwendet && !(eintrag.antwort ?? '').trim() && !eintrag.erledigt}
          onPatch={(p) => persist(setAntwort(data, date, day.tageskarteId, p))}
          onAndereKarte={() => persist(skipKarte(data, date))}
          onSkip={skip}
          onStartTimer={onStartTimer}
          onWeiter={() => setBonusOffen(true)} />
      )
    }
    if (stepName === 'freitext') {
      return (
        <StepFreitext key="freitext" date={date} initial={day.freitext} editable={editable}
          onSave={(t) => persist(setFreitext(data, date, t))}
          onFertig={finish} onSkip={skip} />
      )
    }
    return null
  }

  const dots = base.map((_, i) => i <= idx)
  const stepperKey = bonusKartenId ? 'bonus-' + bonusKartenId : bonusOffen ? 'bonus-frage' : stepName

  return (
    <div className={s.flow}>
      <div className={s.progress}>
        {dots.map((on, i) => <span key={i} className={[s.dot, on ? s.dotOn : ''].join(' ')} />)}
      </div>
      <FlowStepper stepKey={stepperKey} direction={dir}>
        {renderStep()}
      </FlowStepper>
    </div>
  )
}
