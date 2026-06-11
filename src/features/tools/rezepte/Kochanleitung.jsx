import { useMemo } from 'react'
import { buildKochanleitung } from './kochanleitung'
import { IconClock, IconSnow } from './icons'
import s from './Kochanleitung.module.css'

// Anleitungstext zeilenweise, jede Zeile abhakbar (Tippen = erledigt).
function Steps({ text, cardKey, done, onToggle }) {
  const lines = text.split('\n').filter(l => l.trim())
  return (
    <div className={s.steps}>
      {lines.map((line, i) => {
        const k = `${cardKey}:${i}`
        return (
          <div
            key={k}
            className={`${s.stepLine} ${done[k] ? s.stepDone : ''}`}
            onClick={() => onToggle(k)}
          >
            {line}
          </div>
        )
      })}
    </div>
  )
}

// checked/onToggle kommen aus dem persistenten Korb (Kochen.jsx) —
// "wo war ich?" übersteht Unterbrechungen und Reloads.
export default function Kochanleitung({ korbGerichte, zById, rById, checked, onToggle }) {
  const plan = useMemo(() => buildKochanleitung(korbGerichte, zById, rById), [korbGerichte])

  const miseDone   = checked
  const stepsDone  = checked
  const toggleMise = (id) => onToggle(`mise:${id}`)
  const toggleStep = (k)  => onToggle(k)

  if (!korbGerichte.length) {
    return <div className={s.empty}>Keine Gerichte im Korb.</div>
  }

  return (
    <div className={s.wrap}>
      <div className={s.hint}>Tippen = erledigt · nochmal tippen = zurück</div>

      {/* 1. Mise-en-Place */}
      {plan.miseEnPlace.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHead}>Mise-en-Place</div>
          {plan.miseEnPlace.map(item => (
            <div
              key={item.zutatId}
              className={`${s.miseRow} ${miseDone[`mise:${item.zutatId}`] ? s.miseRowDone : ''}`}
              onClick={() => toggleMise(item.zutatId)}
            >
              <span className={s.miseName}>{item.name}</span>
              <span className={s.miseMenge}>{item.menge} {item.einheit}</span>
            </div>
          ))}
        </div>
      )}

      {/* 2. Basen */}
      {plan.basen.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHead}>Basen kochen</div>
          {plan.basen.map(basis => (
            <div key={basis.id} className={s.basisCard}>
              <div className={s.basisHeader}>
                {basis.langlaeufer && <span className={s.langBadge}><IconClock size={12} /> Langläufer</span>}
                <span className={s.basisName}>{basis.name}</span>
                <span className={s.basisMenge}>{basis.menge} {basis.einheit}</span>
              </div>
              {basis.anleitung && (
                <Steps text={basis.anleitung} cardKey={basis.id} done={stepsDone} onToggle={toggleStep} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. Gerichte */}
      {plan.gerichte.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHead}>Gerichte</div>
          {plan.gerichte.map((g, idx) => (
            <div key={idx} className={s.gerichtCard}>
              <div className={s.gerichtHeader}>
                <span className={s.gerichtName}>{g.name}</span>
                <span className={s.gerichtPort}>{g.portionen} Port.</span>
              </div>
              {g.anleitung && (
                <Steps text={g.anleitung} cardKey={`g-${idx}-${g.name}`} done={stepsDone} onToggle={toggleStep} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. Einfrieren & Verpackung */}
      {plan.verpackung.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHead}>Einfrieren & Verpackung</div>
          {plan.verpackung.map((v, idx) => (
            <div key={idx} className={s.verpackungRow}>
              <span className={s.verpackungName}>{v.name}</span>
              <div className={s.verpackungTags}>
                {v.tk && <span className={s.tagTK}><IconSnow size={12} /> TK</span>}
                {v.behaelter.map(b => <span key={b} className={s.tagB}>{b}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
